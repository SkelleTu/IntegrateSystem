/**
 * Sistema de SAVE / LOAD — Aura System
 *
 * Exporta 100% dos dados de TODAS as tabelas em JSON.
 * Salva snapshots em attached_assets/backups/ (persistem no GitHub).
 * Restaura a partir de qualquer snapshot, em todos os bancos ativos.
 */

import { localSqlite, dbRemote, getAllDatabases } from "./db.js";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "attached_assets", "backups");
const AUTO_BACKUP_FILE = path.join(BACKUP_DIR, "auto-backup.json");

// Tabelas que serão exportadas/importadas (ordem importa por FK)
const TABLES = [
  "enterprises",
  "users",
  "user_sessions",
  "services",
  "tickets",
  "queue_state",
  "categories",
  "menu_items",
  "cash_register",
  "sales",
  "sale_items",
  "payments",
  "transactions",
  "time_clock",
  "inventory",
  "inventory_logs",
  "inventory_restocks",
  "settings",
  "fiscal_settings",
  "nfce",
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ─── Exportar todos os dados ─────────────────────────────────────────────────
export function exportAllDataSync(): Record<string, any[]> {
  const snapshot: Record<string, any[]> = {
    _meta: {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "Aura System Backup",
    } as any,
  };

  for (const table of TABLES) {
    try {
      const rows = localSqlite.prepare(`SELECT * FROM ${table}`).all();
      snapshot[table] = rows;
    } catch (e: any) {
      console.warn(`[BACKUP] Tabela '${table}' pulada: ${e.message}`);
      snapshot[table] = [];
    }
  }

  return snapshot;
}

// ─── Salvar snapshot em arquivo ──────────────────────────────────────────────
export function saveBackupToFile(name?: string): string {
  ensureBackupDir();

  const snapshot = exportAllDataSync();
  const totalRows = TABLES.reduce((sum, t) => sum + (snapshot[t]?.length ?? 0), 0);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const filename = name
    ? `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${timestamp}.json`
    : `backup_${timestamp}.json`;

  const filepath = path.join(BACKUP_DIR, filename);
  const content = JSON.stringify(snapshot, null, 2);

  fs.writeFileSync(filepath, content, "utf-8");

  // Atualiza auto-backup (sobrescreve sempre)
  fs.writeFileSync(AUTO_BACKUP_FILE, content, "utf-8");

  console.log(
    `[BACKUP] ✅ Salvo: ${filename} | Tabelas: ${TABLES.length} | Linhas: ${totalRows}`
  );

  return filepath;
}

// ─── Auto-backup silencioso (chamado após writes críticos) ───────────────────
let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoBackup(delayMs = 5000) {
  // Debounce: espera 5s após o último write antes de salvar
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    try {
      ensureBackupDir();
      const snapshot = exportAllDataSync();
      const content = JSON.stringify(snapshot);
      fs.writeFileSync(AUTO_BACKUP_FILE, content, "utf-8");
    } catch (e: any) {
      console.warn("[BACKUP] Auto-backup silencioso falhou:", e.message);
    }
  }, delayMs);
}

// ─── Listar backups salvos ───────────────────────────────────────────────────
export function listBackups(): Array<{
  filename: string;
  name: string;
  createdAt: string;
  sizeKb: number;
  totalRows: number;
}> {
  ensureBackupDir();

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".json") && f !== "auto-backup.json")
    .sort()
    .reverse(); // mais recente primeiro

  return files.map((filename) => {
    const filepath = path.join(BACKUP_DIR, filename);
    const stat = fs.statSync(filepath);
    let totalRows = 0;
    let createdAt = stat.mtime.toISOString();

    try {
      const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      if (data._meta?.exportedAt) createdAt = data._meta.exportedAt;
      totalRows = TABLES.reduce((sum, t) => sum + (data[t]?.length ?? 0), 0);
    } catch {}

    return {
      filename,
      name: filename.replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/, "").replace("backup_", "Backup"),
      createdAt,
      sizeKb: Math.round(stat.size / 1024),
      totalRows,
    };
  });
}

// ─── Restaurar dados de um snapshot ─────────────────────────────────────────
export async function importDataFromSnapshot(
  snapshot: Record<string, any[]>
): Promise<{ tablesRestored: number; rowsRestored: number; errors: string[] }> {
  const errors: string[] = [];
  let tablesRestored = 0;
  let rowsRestored = 0;

  // Restaura no SQLite local primeiro (síncrono, confiável)
  for (const table of TABLES) {
    const rows = snapshot[table];
    if (!rows || rows.length === 0) continue;

    try {
      // Obtém colunas da tabela
      const cols = localSqlite
        .prepare(`PRAGMA table_info(${table})`)
        .all() as Array<{ name: string }>;

      if (cols.length === 0) {
        errors.push(`Tabela '${table}' não existe no banco local`);
        continue;
      }

      const colNames = cols.map((c) => c.name);

      // Upsert via INSERT OR REPLACE (preserva IDs originais)
      const placeholders = colNames.map(() => "?").join(", ");
      const stmt = localSqlite.prepare(
        `INSERT OR REPLACE INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`
      );

      const restoreMany = localSqlite.transaction((tableRows: any[]) => {
        for (const row of tableRows) {
          const values = colNames.map((col) => {
            const val = row[col];
            // Converte Date para timestamp numérico
            if (val instanceof Date) return val.getTime();
            return val ?? null;
          });
          stmt.run(...values);
        }
      });

      restoreMany(rows);
      tablesRestored++;
      rowsRestored += rows.length;
    } catch (e: any) {
      errors.push(`Erro em '${table}': ${e.message}`);
    }
  }

  // Replica para Turso (remoto) se disponível
  if (dbRemote) {
    for (const table of TABLES) {
      const rows = snapshot[table];
      if (!rows || rows.length === 0) continue;

      try {
        const client = (dbRemote as any).$client ?? (dbRemote as any).client;
        if (!client || typeof client.execute !== "function") continue;

        // Obtém colunas via PRAGMA no remoto
        const pragmaResult = await client.execute(`PRAGMA table_info(${table})`);
        const colNames: string[] = (pragmaResult.rows ?? []).map((r: any) =>
          typeof r === "object" && !Array.isArray(r) ? r.name : r[1]
        );

        if (colNames.length === 0) continue;

        for (const row of rows) {
          const values = colNames.map((col) => {
            const val = row[col];
            if (val instanceof Date) return val.getTime();
            return val ?? null;
          });
          const placeholders = colNames.map(() => "?").join(", ");
          await client
            .execute({
              sql: `INSERT OR REPLACE INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders})`,
              args: values,
            })
            .catch(() => {}); // ignora erros individuais de linha
        }
      } catch (e: any) {
        // Não bloqueia — remoto é espelho
      }
    }
  }

  return { tablesRestored, rowsRestored, errors };
}

// ─── Carregar snapshot de arquivo e restaurar ───────────────────────────────
export async function restoreFromFile(filename: string) {
  const filepath = filename === "auto-backup"
    ? AUTO_BACKUP_FILE
    : path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Arquivo não encontrado: ${filename}`);
  }

  const snapshot = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  return importDataFromSnapshot(snapshot);
}

// ─── Info do auto-backup ─────────────────────────────────────────────────────
export function getAutoBackupInfo(): { exists: boolean; updatedAt?: string; sizeKb?: number; totalRows?: number } {
  if (!fs.existsSync(AUTO_BACKUP_FILE)) return { exists: false };

  const stat = fs.statSync(AUTO_BACKUP_FILE);
  let totalRows = 0;
  let updatedAt = stat.mtime.toISOString();

  try {
    const data = JSON.parse(fs.readFileSync(AUTO_BACKUP_FILE, "utf-8"));
    if (data._meta?.exportedAt) updatedAt = data._meta.exportedAt;
    totalRows = TABLES.reduce((sum, t) => sum + (data[t]?.length ?? 0), 0);
  } catch {}

  return { exists: true, updatedAt, sizeKb: Math.round(stat.size / 1024), totalRows };
}
