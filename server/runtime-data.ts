import fs from "fs";
import os from "os";
import path from "path";

/**
 * Runtime data belongs to the application, not to the Git working tree.
 *
 * The previous implementation derived sqlite/backup paths from process.cwd().
 * Electron/Kilo/Vite can start the server with different working directories,
 * which can silently create a brand-new sqlite.db and make the application look
 * as if it had rolled back to a default checkpoint.
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
 * One-time migration from the historical cwd-based sqlite.db location.
 *
 * Only migrate when the new authoritative runtime file does not exist. Once
 * the runtime database exists, the repository working tree is never consulted
 * again for runtime state.
 */
export function migrateLegacySqliteIfNeeded(): string {
  const runtimeFile = getRuntimeSqliteFile();
  const legacyFile = path.join(process.cwd(), "sqlite.db");

  ensureRuntimeDataDir();

  if (!fs.existsSync(runtimeFile) && fs.existsSync(legacyFile)) {
    fs.copyFileSync(legacyFile, runtimeFile);
    console.log(`[DB] Banco local migrado para armazenamento persistente: ${runtimeFile}`);
  }

  return runtimeFile;
}
