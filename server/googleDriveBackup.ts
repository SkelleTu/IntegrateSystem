import fs from "fs";
import path from "path";
import { localSqlite } from "./db";

const DEFAULT_BACKUP_DIR = "G:\\Meu Drive\\Aura System - Backups\\Banco de Dados\\sqlite";
const BACKUP_DIR = process.env.AURA_GOOGLE_DRIVE_BACKUP_DIR || DEFAULT_BACKUP_DIR;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

function cleanupOldBackups(maxFiles = 48) {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((file) => /^sqlite-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/.test(file))
    .map((file) => ({ file, mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of files.slice(maxFiles)) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, entry.file));
    } catch (error: any) {
      console.warn(`[GOOGLE DRIVE BACKUP] Falha ao remover backup antigo '${entry.file}':`, error?.message || error);
    }
  }
}

export function backupSqliteToGoogleDrive(): string | null {
  if (process.env.VERCEL) return null;
  if (!fs.existsSync(BACKUP_DIR)) ensureBackupDir();

  const filename = `sqlite-${timestamp()}.db`;
  const target = path.join(BACKUP_DIR, filename);
  const temporary = `${target}.tmp`;

  try {
    const exported = localSqlite.export();
    fs.writeFileSync(temporary, exported);
    fs.renameSync(temporary, target);
    cleanupOldBackups();
    console.log(`[GOOGLE DRIVE BACKUP] Backup criado: ${target}`);
    return target;
  } catch (error: any) {
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {}
    console.warn(`[GOOGLE DRIVE BACKUP] Falha ao criar backup:`, error?.message || error);
    return null;
  }
}

export function startGoogleDriveBackupScheduler() {
  if (process.env.VERCEL || timer) return;

  try {
    ensureBackupDir();
    backupSqliteToGoogleDrive();
  } catch (error: any) {
    console.warn(`[GOOGLE DRIVE BACKUP] Destino indisponível '${BACKUP_DIR}':`, error?.message || error);
  }

  timer = setInterval(() => {
    if (running) return;
    running = true;
    try {
      backupSqliteToGoogleDrive();
    } finally {
      running = false;
    }
  }, BACKUP_INTERVAL_MS);

  timer.unref?.();
}
