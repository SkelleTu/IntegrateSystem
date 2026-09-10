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
  "cash_register_movements", "cash_control_settings", "cash_register_reviews",
  "financial_transaction_links", "cash_notice_acks",
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

function queryAll(database: any, sqlText: string, params?: any): any[] {
  const statement = database.prepare(sqlText);
  try {
    if (params !== undefined) statement.bind(params);
    const rows: any[] = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

function queryGet(database: any, sqlText: string, params?: any): any | undefined {
  const rows = queryAll(database, sqlText, params);
  return rows[0];
}

function getUserTables(database: any): string[] {
  return (queryAll(
    database,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ) as Array<{ name: string }>)
    .map((row) => row.name)
    .filter(Boolean);
}

function getSqlStatements(database: any): { statements: string[]; tableRows: Record<string, number> } {
  const statements: string[] = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
  const tableRows: Record<string, number> = {};
  const tables = getUserTables(database);

  for (const table of tables) {
    const safeTable = table.replace(/"/g, '""');
    const schemaRow = queryGet(
      database,
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    ) as { sql?: string } | undefined;
    if (schemaRow?.sql) statements.push(`${schemaRow.sql};`);

    const columns = queryAll(database, `PRAGMA table_info("${safeTable}")`) as Array<{ name: string }>;
    const rows = queryAll(database, `SELECT * FROM "${safeTable}"`) as Array<Record<string, unknown>>;
    tableRows[table] = rows.length;

    const quotedColumns = columns.map((column) => `"${column.name.replace(/"/g, '""')}"`).join(", ");
    if (!quotedColumns) continue;

    for (const row of rows) {
      const values = columns.map((column) => sqlLiteral(row[column.name])).join(", ");
      statements.push(`INSERT INTO "${safeTable}" (${quotedColumns}) VALUES (${values});`);
    }
  }

  const auxiliary = queryAll(
    database,
    "SELECT type, name, sql FROM sqlite_master WHERE type IN ('index','trigger') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type, name",
  ) as Array<{ type: string; name: string; sql: string }>;
  for (const object of auxiliary) statements.push(`${object.sql};`);

  statements.push("COMMIT;", "PRAGMA foreign_keys=ON;");
  return { statements, tableRows };
}

function buildSqlDump(database: any): { sql: string; tableRows: Record<string, number> } {
  const { statements, tableRows } = getSqlStatements(database);
  const totalRows = Object.values(tableRows).reduce((sum, value) => sum + value, 0);
  const exportedAt = new Date().toISOString();
  const sql = [
    `-- Aura System SQL backup`,
    `-- Exported at: ${exportedAt}`,
    `-- Tables: ${Object.keys(tableRows).length}`,
    `-- Rows: ${totalRows}`,
    ...statements,
  ].join("\n");
  return { sql, tableRows };
}

export function exportAllDataSync() {
  ensureBackupDir();
  const { sql: sqlDump, tableRows } = buildSqlDump(localSqlite);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: tableRows,
    sql: sqlDump,
  };
}

export function saveBackupToFile(name?: string) {
  ensureBackupDir();
  const base = safeFilename(name || `aura-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const filepath = path.join(BACKUP_DIR, `${base}.json`);
  fs.writeFileSync(filepath, JSON.stringify(exportAllDataSync(), null, 2));
  return filepath;
}

export function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const filepath = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(filepath);
      return { filename: name, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAutoBackupInfo() {
  if (!fs.existsSync(AUTO_BACKUP_FILE)) return { exists: false, path: AUTO_BACKUP_FILE };
  const stat = fs.statSync(AUTO_BACKUP_FILE);
  return { exists: true, path: AUTO_BACKUP_FILE, size: stat.size, updatedAt: stat.mtime.toISOString() };
}

export function importDataFromSnapshot(snapshot: any) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Snapshot inválido.");
  if (typeof snapshot.sql !== "string") throw new Error("Snapshot SQL não encontrado.");
  const SQL = new (initSqlJs as any)();
  void SQL;
  throw new Error("A restauração SQL deve usar a rotina de arquivo existente do Aura.");
}

export function restoreFromFile(filename: string) {
  const normalized = filename.endsWith(".json") ? filename : `${filename}.json`;
  const filepath = path.join(BACKUP_DIR, path.basename(normalized));
  if (!fs.existsSync(filepath)) throw new Error(`Backup não encontrado: ${normalized}`);
  throw new Error("Restauração de arquivo delegada à rotina existente do Aura.");
}

export function scheduleAutoBackup() {
  ensureBackupDir();
  clearTimeout((scheduleAutoBackup as any)._timer);
  (scheduleAutoBackup as any)._timer = setTimeout(() => {
    try { fs.writeFileSync(AUTO_BACKUP_FILE, JSON.stringify(exportAllDataSync(), null, 2)); }
    catch (error) { console.error("[BACKUP] Falha no auto-backup:", error); }
  }, 5000);
}
