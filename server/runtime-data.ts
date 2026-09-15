import fs from "fs";
import os from "os";
import path from "path";

/**
 * Runtime data belongs to the application, never to the Git working tree.
 *
 * Git contains code and schema. It is not an operational database and must not
 * be able to roll the platform back to an old data snapshot after pull/restart.
 */
export function getRuntimeDataDir(): string {
  if (process.env.VERCEL) return "/tmp/aura-system";

  if (process.env.AURA_DATA_DIR) {
    return path.resolve(process.env.AURA_DATA_DIR);
  }

  const windowsDataRoot = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (windowsDataRoot) {
    return path.join(windowsDataRoot, "AuraSystem", "data");
  }

  return path.join(os.homedir(), ".aura-system", "data");
}

export function getRuntimeSqliteFile(): string {
  return path.join(getRuntimeDataDir(), "sqlite.db");
}

export function getRuntimeBackupDir(): string {
  return path.join(getRuntimeDataDir(), "backups");
}

export function ensureRuntimeDataDir(): string {
  const dir = getRuntimeDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Historical migration is deliberately opt-in. A Git checkout must never
 * silently become the source of operational data.
 */
export function migrateLegacySqliteExplicitly(): string | null {
  if (process.env.AURA_MIGRATE_LEGACY_SQLITE !== "1") return null;

  const runtimeFile = getRuntimeSqliteFile();
  const legacyFile = path.join(process.cwd(), "sqlite.db");
  ensureRuntimeDataDir();

  if (!fs.existsSync(runtimeFile) && fs.existsSync(legacyFile)) {
    fs.copyFileSync(legacyFile, runtimeFile);
    console.log(`[DB] Migração explícita do banco legado concluída: ${runtimeFile}`);
  }

  return runtimeFile;
}
