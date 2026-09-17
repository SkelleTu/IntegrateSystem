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
  let dir: string;
  if (process.env.VERCEL) {
    dir = "/tmp/aura-system";
  } else if (process.env.AURA_DATA_DIR) {
    dir = path.resolve(process.env.AURA_DATA_DIR);
  } else {
    const windowsDataRoot = process.env.LOCALAPPDATA || process.env.APPDATA;
    dir = windowsDataRoot
      ? path.join(windowsDataRoot, "AuraSystem", "data")
      : path.join(os.homedir(), ".aura-system", "data");
  }

  const repositoryRoot = path.resolve(process.cwd());
  const normalizedDir = path.resolve(dir);
  const relative = path.relative(repositoryRoot, normalizedDir);
  const insideRepository = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));

  if (insideRepository && !process.env.VERCEL) {
    throw new Error("AURA_DATA_DIR não pode apontar para dentro do repositório. Estado operacional não pode ser armazenado no Git working tree.");
  }

  return normalizedDir;
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
