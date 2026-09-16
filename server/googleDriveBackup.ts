import fs from "fs";
import path from "path";
import { localSqlite } from "./db";

const DEFAULT_BACKUP_DIR = "G:\\Meu Drive\\Aura System - Backups\\Banco de Dados\\sqlite";
const BACKUP_DIR = process.env.AURA_GOOGLE_DRIVE_BACKUP_DIR || DEFAULT_BACKUP_DIR;
const BACKUP_FILENAME = "sqlite-backup.db";
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const AVAILABILITY_CHECK_MS = 2000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastSuccessfulBackupAt = 0;
let driveWasUnavailable = false;

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function backupSqliteToGoogleDrive(): string | null {
  if (process.env.VERCEL) return null;
  if (!fs.existsSync(BACKUP_DIR)) ensureBackupDir();

  const target = path.join(BACKUP_DIR, BACKUP_FILENAME);
  const temporary = `${target}.tmp`;

  try {
    const exported = localSqlite.export();
    fs.writeFileSync(temporary, exported);
    fs.renameSync(temporary, target);
    lastSuccessfulBackupAt = Date.now();
    driveWasUnavailable = false;
    console.log(`[GOOGLE DRIVE BACKUP] Backup atualizado: ${target}`);
    return target;
  } catch (error: any) {
    driveWasUnavailable = true;
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {}
    console.warn(`[GOOGLE DRIVE BACKUP] Falha ao atualizar backup:`, error?.message || error);
    return null;
  }
}

export function startGoogleDriveBackupScheduler() {
  if (process.env.VERCEL || timer) return;

  // Primeira tentativa imediatamente ao iniciar.
  try {
    ensureBackupDir();
    backupSqliteToGoogleDrive();
  } catch (error: any) {
    driveWasUnavailable = true;
    console.warn(`[GOOGLE DRIVE BACKUP] Destino indisponível '${BACKUP_DIR}':`, error?.message || error);
  }

  // Verifica a disponibilidade a cada 2 segundos. Se o Drive voltar,
  // o backup é atualizado na primeira verificação bem-sucedida, sem esperar 5 minutos.
  timer = setInterval(() => {
    if (running) return;

    const now = Date.now();
    const needsScheduledBackup = now - lastSuccessfulBackupAt >= BACKUP_INTERVAL_MS;
    const needsReconnectBackup = driveWasUnavailable;
    if (!needsScheduledBackup && !needsReconnectBackup) return;

    running = true;
    try {
      backupSqliteToGoogleDrive();
    } finally {
      running = false;
    }
  }, AVAILABILITY_CHECK_MS);

  timer.unref?.();
}
