/**
 * Sistema de SAVE / LOAD — Aura System
 *
 * Mantém o backup JSON existente e adiciona snapshots SQL completos.
 * SQL é usado para migração entre máquinas, histórico e restauração segura.
 */

import { localSqlite, dbRemote } from "./db.js";
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const SQLITE_FILE = process.env.VERCEL ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db");
const BACKUP_DIR = path.join(process.cwd(), "attached_assets", "backups");
const AUTO_BACKUP_FILE = path.join(BACKUP_DIR, "auto-backup.json");

const LEGACY_TABLES = [
  "enterprises", "users", "user_sessions", "services", "tickets", "queue_state",
  "categories", "menu_items", "cash_register", "sales", "sale_items", "payments",
  "transactions", "time_clock", "inventory", "inventory_logs", "inventory_restocks",
  "settings", "fiscal_settings", "nfce", "products", "batches", "batch_logs", "stock_snapshots",
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) {
    const hex = Array.from(value).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `X'${hex}'`;
  }
  if (value instanceof ArrayBuffer) {
    const bytes = new Uint8Array(value);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `X'${hex}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function getUserTables(database: any): string[] {
  return (database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>)
    .map((row) => row.name)
    .filter(Boolean);
}

function getSqlStatements(database: any): { statements: string[]; tableRows: Record<string, number> } {
  const statements: string[] = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
  const tableRows: Record<string, number> = {};
  const tables = getUserTables(database);

  for (const table of tables) {
    const schemaRow = database
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
      .get(table) as { sql?: string } | undefined;
    if (schemaRow?.sql) statements.push(`${schemaRow.sql};`);

    const columns = database
      .prepare(`PRAGMA table_info("${table.replace(/"/g, '""')}")`)
      .all() as Array<{ name: string }>;
    const rows = database.prepare(`SELECT * FROM "${table.replace(/"/g, '""')}"`).all() as Array<Record<string, unknown>>;
    tableRows[table] = rows.length;

    const quotedColumns = columns.map((column) => `"${column.name.replace(/"/g, '""')}"`).join(", ");
    if (!quotedColumns) continue;

    for (const row of rows) {
      const values = columns.map((column) => sqlLiteral(row[column.name])).join(", ");
      statements.push(`INSERT INTO "${table.replace(/"/g, '""')}" (${quotedColumns}) VALUES (${values});`);
    }
  }

  // Indexes/triggers that belong to user tables are restored after data.
  const auxiliary = database
    .prepare("SELECT type, name, sql FROM sqlite_master WHERE type IN ('index','trigger') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type, name")
    .all() as Array<{ type: string; name: string; sql: string }>;
  for (const object of auxiliary) statements.push(`${object.sql};`);

  statements.push("COMMIT;", "PRAGMA foreign_keys=ON;");
  return { statements, tableRows };
}

function buildSqlDump(database: any): { sql: string; tableRows: Record<string, number> } {
  const { statements, tableRows } = getSqlStatements(database);
  const totalRows = Object.values(tableRows).reduce((sum, value) => sum + value, 0);
  const exportedAt = new Date().toISOString();
  const header = [
    "-- Aura System SQL Backup",
    `-- ExportedAt: ${exportedAt}`,
    `-- Tables: ${Object.keys(tableRows).length}`,
    `-- Rows: ${totalRows}`,
    "-- Format: Aura-SQL-1",
    "",
  ].join("\n");
  return { sql: `${header}${statements.join("\n")}\n`, tableRows };
}

function persistLocalSqlite() {
  if (process.env.VERCEL) return;
  fs.writeFileSync(SQLITE_FILE, localSqlite.export());
}

async function databaseFromSql(sqlText: string) {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run(sqlText);
  const tables = getUserTables(database);
  if (!tables.length) throw new Error("O SQL não criou nenhuma tabela de dados.");
  return database;
}

function canonical(value: unknown): string {
  if (value instanceof Uint8Array) return `blob:${Array.from(value).join(",")}`;
  if (value instanceof ArrayBuffer) return `blob:${Array.from(new Uint8Array(value)).join(",")}`;
  if (value && typeof value === "object") return JSON.stringify(value);
  return `${typeof value}:${String(value)}`;
}

function compareDatabases(current: any, incoming: any) {
  const currentTables = new Set(getUserTables(current));
  const incomingTables = new Set(getUserTables(incoming));
  const tablesAdded = [...incomingTables].filter((name) => !currentTables.has(name));
  const tablesRemoved = [...currentTables].filter((name) => !incomingTables.has(name));
  const tablesChanged: string[] = [];
  let rowsAdded = 0;
  let rowsRemoved = 0;
  let rowsChanged = 0;

  for (const table of new Set([...currentTables, ...incomingTables])) {
    if (!currentTables.has(table) || !incomingTables.has(table)) continue;

    const safeTable = table.replace(/"/g, '""');
    const oldColumns = current.prepare(`PRAGMA table_info("${safeTable}")`).all() as Array<{ name: string; pk: number }>;
    const newColumns = incoming.prepare(`PRAGMA table_info("${safeTable}")`).all() as Array<{ name: string; pk: number }>;
    const oldSchema = JSON.stringify(oldColumns);
    const newSchema = JSON.stringify(newColumns);
    if (oldSchema !== newSchema) tablesChanged.push(table);

    const oldRows = current.prepare(`SELECT * FROM "${safeTable}"`).all() as Array<Record<string, unknown>>;
    const newRows = incoming.prepare(`SELECT * FROM "${safeTable}"`).all() as Array<Record<string, unknown>>;
    const commonColumns = oldColumns.map((column) => column.name).filter((name) => newColumns.some((column) => column.name === name));
    const primaryKey = newColumns.filter((column) => column.pk > 0).sort((a, b) => a.pk - b.pk).map((column) => column.name);

    if (primaryKey.length) {
      const oldMap = new Map(oldRows.map((row) => [primaryKey.map((key) => canonical(row[key])).join("|"), row]));
      const newMap = new Map(newRows.map((row) => [primaryKey.map((key) => canonical(row[key])).join("|"), row]));
      for (const [key, row] of oldMap) {
        if (!newMap.has(key)) rowsRemoved++;
        else if (commonColumns.some((column) => canonical(row[column]) !== canonical(newMap.get(key)?.[column]))) rowsChanged++;
      }
      for (const key of newMap.keys()) if (!oldMap.has(key)) rowsAdded++;
    } else {
      const oldCounts = new Map<string, number>();
      const newCounts = new Map<string, number>();
      oldRows.forEach((row) => oldCounts.set(commonColumns.map((column) => canonical(row[column])).join("|"), (oldCounts.get(commonColumns.map((column) => canonical(row[column])).join("|")) || 0) + 1));
      newRows.forEach((row) => newCounts.set(commonColumns.map((column) => canonical(row[column])).join("|"), (newCounts.get(commonColumns.map((column) => canonical(row[column])).join("|")) || 0) + 1));
      for (const [key, count] of oldCounts) rowsRemoved += Math.max(0, count - (newCounts.get(key) || 0));
      for (const [key, count] of newCounts) rowsAdded += Math.max(0, count - (oldCounts.get(key) || 0));
    }
  }

  return { tablesAdded, tablesRemoved, tablesChanged, rowsAdded, rowsRemoved, rowsChanged };
}

async function syncRemoteFromLocal(sql: string) {
  if (!dbRemote) return;
  const client = (dbRemote as any).$client ?? (dbRemote as any).client;
  if (!client || typeof client.execute !== "function") return;

  const remoteTablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const remoteTables = (remoteTablesResult.rows ?? []).map((row: any) => (Array.isArray(row) ? row[0] : row.name)).filter(Boolean) as string[];
  await client.execute("PRAGMA foreign_keys=OFF");
  for (const table of remoteTables) {
    await client.execute(`DROP TABLE IF EXISTS "${String(table).replace(/"/g, '""')}"`);
  }

  const statements = sql
    .split(/\n(?=(?:CREATE|INSERT|PRAGMA|BEGIN|COMMIT)\b)/i)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !statement.startsWith("--"));

  for (const statement of statements) {
    if (/^(BEGIN|COMMIT|PRAGMA foreign_keys)/i.test(statement)) continue;
    await client.execute(statement);
  }
  await client.execute("PRAGMA foreign_keys=ON");
}

async function restoreSqlDump(sqlText: string, sourceLabel = "import") {
  const incoming = await databaseFromSql(sqlText);
  const comparison = compareDatabases(localSqlite, incoming);

  ensureBackupDir();
  const before = buildSqlDump(localSqlite);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  fs.writeFileSync(path.join(BACKUP_DIR, `before-${safeFilename(sourceLabel)}-${timestamp}.sql`), before.sql, "utf-8");

  const incomingDump = buildSqlDump(incoming).sql;
  for (const table of getUserTables(localSqlite)) {
    localSqlite.prepare(`DROP TABLE IF EXISTS "${table.replace(/"/g, '""')}"`).run();
  }
  localSqlite.exec("PRAGMA foreign_keys=OFF;");
  localSqlite.run(incomingDump);
  localSqlite.exec("PRAGMA foreign_keys=ON;");
  persistLocalSqlite();

  let warning: string | undefined;
  try {
    await syncRemoteFromLocal(incomingDump);
  } catch (error: any) {
    warning = `SQLite local atualizado, mas o espelho remoto não pôde ser sincronizado: ${error?.message || "erro desconhecido"}`;
  }

  fs.writeFileSync(path.join(BACKUP_DIR, `imported-${safeFilename(sourceLabel)}-${timestamp}.sql`), incomingDump, "utf-8");
  incoming.close();
  return { tablesRestored: getUserTables(localSqlite).length, rowsRestored: Object.values(buildSqlDump(localSqlite).tableRows).reduce((sum, value) => sum + value, 0), errors: [], comparison, warning };
}

// ─── Exportar todos os dados em JSON (compatibilidade legada) ────────────────
export function exportAllDataSync(): Record<string, any[]> {
  const snapshot: Record<string, any[]> = {
    _meta: { version: "2.0", exportedAt: new Date().toISOString(), exportedBy: "Aura System Backup" } as any,
  };
  for (const table of LEGACY_TABLES) {
    try {
      snapshot[table] = localSqlite.prepare(`SELECT * FROM ${table}`).all();
    } catch (e: any) {
      console.warn(`[BACKUP] Tabela '${table}' pulada: ${e.message}`);
      snapshot[table] = [];
    }
  }
  return snapshot;
}

export function saveBackupToFile(name?: string): string {
  ensureBackupDir();
  const sourceName = name || "backup";
  const isSql = sourceName.startsWith("__SQL__");
  const cleanName = safeFilename(isSql ? sourceName.slice("__SQL__".length) : sourceName || "backup");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

  if (isSql) {
    const { sql } = buildSqlDump(localSqlite);
    const filename = `${cleanName || "aura-database"}_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, sql, "utf-8");
    return filepath;
  }

  const snapshot = exportAllDataSync();
  const filename = `${cleanName || "backup"}_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  const content = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(filepath, content, "utf-8");
  fs.writeFileSync(AUTO_BACKUP_FILE, content, "utf-8");
  return filepath;
}

let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleAutoBackup(delayMs = 5000) {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    try {
      ensureBackupDir();
      fs.writeFileSync(AUTO_BACKUP_FILE, JSON.stringify(exportAllDataSync()), "utf-8");
    } catch (e: any) {
      console.warn("[BACKUP] Auto-backup silencioso falhou:", e.message);
    }
  }, delayMs);
}

export function listBackups(): Array<{ filename: string; name: string; createdAt: string; sizeKb: number; totalRows: number; format: "json" | "sql" }> {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((file) => (file.endsWith(".json") && file !== "auto-backup.json") || file.endsWith(".sql"))
    .sort()
    .reverse();

  return files.map((filename) => {
    const filepath = path.join(BACKUP_DIR, filename);
    const stat = fs.statSync(filepath);
    const format = filename.endsWith(".sql") ? "sql" : "json" as "json" | "sql";
    let createdAt = stat.mtime.toISOString();
    let totalRows = 0;
    let name = filename.replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(?:json|sql)$/, "");

    try {
      const raw = fs.readFileSync(filepath, "utf-8");
      if (format === "json") {
        const data = JSON.parse(raw);
        if (data._meta?.exportedAt) createdAt = data._meta.exportedAt;
        totalRows = LEGACY_TABLES.reduce((sum, table) => sum + (data[table]?.length ?? 0), 0);
      } else {
        const exported = raw.match(/^-- ExportedAt:\s*(.+)$/m)?.[1];
        const rows = raw.match(/^-- Rows:\s*(\d+)$/m)?.[1];
        if (exported) createdAt = exported.trim();
        if (rows) totalRows = Number(rows);
      }
    } catch {}

    name = name.replace(/^backup_/, "Backup ").replace(/^aura-database-/, "Aura SQL ");
    return { filename, name, createdAt, sizeKb: Math.round(stat.size / 1024), totalRows, format };
  });
}

export async function importDataFromSnapshot(snapshot: Record<string, any[]> & { _sql?: string }): Promise<any> {
  if (typeof snapshot?._sql === "string") return restoreSqlDump(snapshot._sql, "loaded");

  const errors: string[] = [];
  let tablesRestored = 0;
  let rowsRestored = 0;

  for (const table of LEGACY_TABLES) {
    const rows = snapshot[table];
    if (!rows || rows.length === 0) continue;
    try {
      const cols = localSqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (!cols.length) {
        errors.push(`Tabela '${table}' não existe no banco local`);
        continue;
      }
      const colNames = cols.map((column) => column.name);
      const placeholders = colNames.map(() => "?").join(", ");
      const stmt = localSqlite.prepare(`INSERT OR REPLACE INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`);
      const restoreMany = localSqlite.transaction((tableRows: any[]) => tableRows.forEach((row) => stmt.run(...colNames.map((column) => row[column] ?? null))));
      restoreMany(rows);
      tablesRestored++;
      rowsRestored += rows.length;
    } catch (e: any) {
      errors.push(`Erro em '${table}': ${e.message}`);
    }
  }

  persistLocalSqlite();
  return { tablesRestored, rowsRestored, errors };
}

export async function restoreFromFile(filename: string) {
  const filepath = filename === "auto-backup" ? AUTO_BACKUP_FILE : path.join(BACKUP_DIR, filename);
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) throw new Error("Nome de arquivo inválido");
  if (!fs.existsSync(filepath)) throw new Error(`Arquivo não encontrado: ${filename}`);

  if (filepath.endsWith(".sql")) {
    return restoreSqlDump(fs.readFileSync(filepath, "utf-8"), filename.replace(/\.sql$/i, "restore"));
  }
  const snapshot = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  return importDataFromSnapshot(snapshot);
}

export function getAutoBackupInfo(): { exists: boolean; updatedAt?: string; sizeKb?: number; totalRows?: number } {
  if (!fs.existsSync(AUTO_BACKUP_FILE)) return { exists: false };
  const stat = fs.statSync(AUTO_BACKUP_FILE);
  let totalRows = 0;
  let updatedAt = stat.mtime.toISOString();
  try {
    const data = JSON.parse(fs.readFileSync(AUTO_BACKUP_FILE, "utf-8"));
    if (data._meta?.exportedAt) updatedAt = data._meta.exportedAt;
    totalRows = LEGACY_TABLES.reduce((sum, table) => sum + (data[table]?.length ?? 0), 0);
  } catch {}
  return { exists: true, updatedAt, sizeKb: Math.round(stat.size / 1024), totalRows };
}
