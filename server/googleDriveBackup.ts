import fs from "fs";
import path from "path";
import { localSqlite } from "./db";

const DEFAULT_BACKUP_DIR = "G:\\Meu Drive\\Aura System - Backups\\Banco de Dados\\sqlite";
const BACKUP_DIR = process.env.AURA_GOOGLE_DRIVE_BACKUP_DIR || DEFAULT_BACKUP_DIR;
const BACKUP_FILENAME = "sqlite-backup.db";
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_UNAVAILABLE_MS = 15 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastSuccessfulBackupAt = 0;
let driveWasUnavailable = false;
let lastErrorMessage: string | null = null;

export type GoogleDriveBackupStatus = {
  available: boolean;
  lastSuccessfulBackupAt: number | null;
  lastErrorMessage: string | null;
};

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function getGoogleDriveBackupStatus(): GoogleDriveBackupStatus {
  return {
    available: !driveWasUnavailable && lastSuccessfulBackupAt > 0,
    lastSuccessfulBackupAt: lastSuccessfulBackupAt || null,
    lastErrorMessage,
  };
}

export function backupSqliteToGoogleDrive(): string | null {
  if (process.env.VERCEL) return null;

  const target = path.join(BACKUP_DIR, BACKUP_FILENAME);
  const temporary = `${target}.tmp`;

  try {
    ensureBackupDir();
    fs.accessSync(BACKUP_DIR, fs.constants.W_OK);

    const exported = localSqlite.export();
    fs.writeFileSync(temporary, exported);
    fs.renameSync(temporary, target);

    lastSuccessfulBackupAt = Date.now();
    driveWasUnavailable = false;
    lastErrorMessage = null;
    console.log(`[GOOGLE DRIVE BACKUP] Backup atualizado: ${target}`);
    return target;
  } catch (error: any) {
    driveWasUnavailable = true;
    lastErrorMessage = error?.message || String(error);

    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {}

    console.warn(`[GOOGLE DRIVE BACKUP] Falha ao atualizar backup:`, lastErrorMessage);
    return null;
  }
}

export function startGoogleDriveBackupScheduler() {
  if (process.env.VERCEL || timer) return;

  // Primeira tentativa imediatamente ao iniciar.
  backupSqliteToGoogleDrive();

  // Enquanto o Drive estiver indisponível, tenta a cada 15s.
  // Em condições normais, o backup continua sendo atualizado a cada 5 minutos.
  timer = setInterval(() => {
    if (running) return;

    const now = Date.now();
    const retryDelay = driveWasUnavailable ? RETRY_UNAVAILABLE_MS : BACKUP_INTERVAL_MS;
    const needsBackup = now - lastSuccessfulBackupAt >= retryDelay;
    if (!needsBackup) return;

    running = true;
    try {
      backupSqliteToGoogleDrive();
    } finally {
      running = false;
    }
  }, 1000);

  timer.unref?.();
}
