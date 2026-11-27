import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { neonPool } from "./neon-db.js";
import { localSqlite, persistLocalSqlite } from "./db.js";

const execFileAsync = promisify(execFile);
const TZ = "America/Sao_Paulo";
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_DAYS = 30;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const driveConfig = {
  clientId: process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() || "",
  clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() || "",
  refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim() || "",
  folderId: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID?.trim() || "",
};

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastStatus: DatabaseBackupStatus | null = null;

export type DatabaseBackupStatus = {
  database: {
    primary: string;
    connected: boolean;
    latencyMs: number | null;
    tables: number;
    rows: number;
  };
  sqlite: {
    enabled: boolean;
    fileSizeBytes: number;
    lastSyncAt: number | null;
  };
  backup: {
    enabled: boolean;
    configured: boolean;
    lastAttemptAt: number | null;
    lastSuccessAt: number | null;
    lastFileName: string | null;
    lastDriveFileId: string | null;
    lastError: string | null;
    retentionDays: number;
    intervalMs: number;
    timezone: string;
  };
  drive: {
    configured: boolean;
    folderConfigured: boolean;
    lastFiles: Array<{ id: string; name: string; modifiedTime?: string; size?: string }>;
  };
};

let lastSqliteSyncAt: number | null = null;
let lastAttemptAt: number | null = null;
let lastSuccessAt: number | null = null;
let lastFileName: string | null = null;
let lastDriveFileId: string | null = null;
let lastError: string | null = null;

function dayParts(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
}

function backupFileName(date = new Date()) {
  const p = dayParts(date);
  return `sqlite-${p.day}-${p.month}-${p.year}.sql`;
}

function escapeSql(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (Buffer.isBuffer(value)) return `decode('${value.toString("hex")}', 'hex')`;
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

async function fallbackSqlDump(): Promise<string> {
  if (!neonPool) throw new Error("DATABASE_URL/Neon não configurado.");
  const tableRows = await neonPool.query(`
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname = 'public'
    ORDER BY c.relname
  `);
  const lines: string[] = [
    "-- Aura System PostgreSQL logical backup",
    `-- Generated at ${new Date().toISOString()}`,
    "SET statement_timeout = 0;",
    "SET lock_timeout = 0;",
    "SET client_encoding = 'UTF8';",
    "SET standard_conforming_strings = on;",
    "BEGIN;",
  ];

  for (const table of tableRows.rows as any[]) {
    const schema = String(table.schema_name);
    const name = String(table.table_name);
    const columns = await neonPool.query(`
      SELECT column_name, data_type, udt_schema, udt_name, is_nullable,
             column_default, character_maximum_length, numeric_precision,
             numeric_scale, datetime_precision
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, name]);

    const defs = (columns.rows as any[]).map((c) => {
      let type = String(c.data_type);
      if (type === "USER-DEFINED") type = `"${String(c.udt_name).replace(/"/g, '""')}"`;
      else if (type === "ARRAY") type = `${String(c.udt_name).replace(/^_/, "")}[]`;
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      if (c.numeric_precision) type += c.numeric_scale != null ? `(${c.numeric_precision},${c.numeric_scale})` : `(${c.numeric_precision})`;
      const nullable = c.is_nullable === "NO" ? " NOT NULL" : "";
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
      return `"${String(c.column_name).replace(/"/g, '""')}" ${type}${nullable}${def}`;
    });
    lines.push(`CREATE TABLE IF NOT EXISTS "${schema}"."${name}" (\n  ${defs.join(",\n  ")}\n);`);

    const result = await neonPool.query(`SELECT * FROM "${schema}"."${name}"`);
    if (result.rows.length) {
      const colNames = (columns.rows as any[]).map((c) => `"${String(c.column_name).replace(/"/g, '""')}"`).join(", ");
      for (let i = 0; i < result.rows.length; i += 500) {
        const chunk = result.rows.slice(i, i + 500);
        const values = chunk.map((row: any) => "(" + (columns.rows as any[]).map((c) => escapeSql(row[c.column_name])).join(", ") + ")").join(",\n");
        lines.push(`INSERT INTO "${schema}"."${name}" (${colNames}) VALUES\n${values};`);
      }
    }
  }

  lines.push("COMMIT;");
  return lines.join("\n") + "\n";
}

async function createSqlDump(): Promise<Buffer> {
  if (!neonPool) throw new Error("Neon PostgreSQL não está disponível.");
  try {
    const { stdout } = await execFileAsync("pg_dump", [
      process.env.DATABASE_URL!,
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--format=plain",
      "--encoding=UTF8",
    ], { maxBuffer: 1024 * 1024 * 256, timeout: 120_000 });
    const buffer = Buffer.from(stdout, "utf8");
    if (!buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).includes("PostgreSQL database dump")) {
      throw new Error("pg_dump retornou conteúdo inesperado.");
    }
    return buffer;
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
    return Buffer.from(await fallbackSqlDump(), "utf8");
  }
}

async function accessToken(): Promise<string> {
  if (!driveConfig.clientId || !driveConfig.clientSecret || !driveConfig.refreshToken) {
    throw new Error("Credenciais OAuth do Google Drive não configuradas no ambiente de produção.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: driveConfig.clientId,
      client_secret: driveConfig.clientSecret,
      refresh_token: driveConfig.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`OAuth Google Drive rejeitado (${response.status}).`);
  }
  return String(body.access_token);
}

async function driveRequest(path: string, init: RequestInit, token: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Drive HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return response;
}

async function listDriveFiles(token: string) {
  if (!driveConfig.folderId) throw new Error("GOOGLE_DRIVE_BACKUP_FOLDER_ID não configurado.");
  const q = `'${driveConfig.folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
  const url = `/files?q=${encodeURIComponent(q)}&pageSize=1000&fields=files(id,name,size,modifiedTime,mimeType,trashed)`;
  const response = await driveRequest(url, {}, token);
  const body: any = await response.json();
  return (body.files || []) as Array<{id: string; name: string; size?: string; modifiedTime?: string}>;
}

function parseBackupDate(name: string): Date | null {
  const match = /^sqlite-(\\d{2})-(\\d{2})-(\\d{4})\\.sql$/.exec(name);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateSql(buffer: Buffer) {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 8192));
  if (buffer.length < 100 || !/(CREATE TABLE|CREATE SEQUENCE|PostgreSQL database dump)/i.test(text)) {
    throw new Error("O dump SQL foi rejeitado na validação de integridade básica.");
  }
}

async function uploadOrReplace(buffer: Buffer, name: string, token: string, existing: Array<{id: string; name: string}>) {
  const matches = existing.filter((f) => f.name === name);
  let response: Response;
  if (matches[0]) {
    response = await driveRequest(`/upload/files/${encodeURIComponent(matches[0].id)}?uploadType=media&fields=id,name,size,modifiedTime`, {
      method: "PATCH",
      headers: { "Content-Type": "application/sql", "Content-Length": String(buffer.byteLength) },
      body: buffer,
    }, token);
    for (const duplicate of matches.slice(1)) {
      await driveRequest(`/files/${encodeURIComponent(duplicate.id)}`, { method: "DELETE" }, token);
    }
  } else {
    const metadata = JSON.stringify({ name, parents: [driveConfig.folderId], mimeType: "application/sql" });
    const boundary = `aura_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/sql\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([prefix, buffer, suffix]);
    response = await driveRequest("/upload/files?uploadType=multipart&fields=id,name,size,modifiedTime", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}`, "Content-Length": String(body.byteLength) },
      body,
    }, token);
  }
  return response.json() as Promise<{id: string; name: string; size?: string; modifiedTime?: string}>;
}

async function enforceRetention(token: string) {
  const files = await listDriveFiles(token);
  const backups = files
    .map((file) => ({ file, date: parseBackupDate(file.name) }))
    .filter((x): x is {file: typeof files[number]; date: Date} => !!x.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  for (const entry of backups.slice(RETENTION_DAYS)) {
    await driveRequest(`/files/${encodeURIComponent(entry.file.id)}`, { method: "DELETE" }, token);
  }
}

export async function backupNeonToGoogleDrive() {
  lastAttemptAt = Date.now();
  lastError = null;
  const token = await accessToken();
  const name = backupFileName();
  const dump = await createSqlDump();
  validateSql(dump);
  const files = await listDriveFiles(token);
  const uploaded = await uploadOrReplace(dump, name, token, files);
  if (!uploaded?.id || Number(uploaded.size || dump.byteLength) <= 0) throw new Error("Google Drive não confirmou o arquivo SQL.");
  await enforceRetention(token);
  lastSuccessAt = Date.now();
  lastFileName = name;
  lastDriveFileId = uploaded.id;
  lastError = null;
  return { name, id: uploaded.id, bytes: dump.byteLength };
}

export async function getDatabaseBackupStatus(): Promise<DatabaseBackupStatus> {
  let latencyMs: number | null = null;
  let connected = false;
  let tables = 0;
  let rows = 0;
  if (neonPool) {
    const started = Date.now();
    try {
      await neonPool.query("SELECT 1");
      connected = true;
      latencyMs = Date.now() - started;
      const result = await neonPool.query(`
        SELECT COUNT(*)::int AS tables,
               COALESCE(SUM(n_live_tup), 0)::bigint AS rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `);
      tables = Number(result.rows[0]?.tables || 0);
      rows = Number(result.rows[0]?.rows || 0);
    } catch (error: any) {
      lastError = error?.message || String(error);
    }
  }

  let driveFiles: Array<{id: string; name: string; modifiedTime?: string; size?: string}> = [];
  if (driveConfig.clientId && driveConfig.clientSecret && driveConfig.refreshToken && driveConfig.folderId) {
    try {
      driveFiles = await listDriveFiles(await accessToken());
    } catch (error: any) {
      lastError = error?.message || String(error);
    }
  }

  const status: DatabaseBackupStatus = {
    database: { primary: "neon-postgresql", connected, latencyMs, tables, rows },
    sqlite: { enabled: true, fileSizeBytes: localSqlite.export().byteLength, lastSyncAt: lastSqliteSyncAt },
    backup: {
      enabled: true,
      configured: !!(driveConfig.clientId && driveConfig.clientSecret && driveConfig.refreshToken && driveConfig.folderId),
      lastAttemptAt,
      lastSuccessAt,
      lastFileName,
      lastDriveFileId,
      lastError,
      retentionDays: RETENTION_DAYS,
      intervalMs: DEFAULT_INTERVAL_MS,
      timezone: TZ,
    },
    drive: {
      configured: !!(driveConfig.clientId && driveConfig.clientSecret && driveConfig.refreshToken && driveConfig.folderId),
      folderConfigured: !!driveConfig.folderId,
      lastFiles: driveFiles.filter((f) => /^sqlite-\\d{2}-\\d{2}-\\d{4}\\.sql$/.test(f.name)).sort((a,b) => String(b.modifiedTime).localeCompare(String(a.modifiedTime))).slice(0, 30),
    },
  };
  lastStatus = status;
  return status;
}

export async function triggerDatabaseBackup() {
  if (running) return { accepted: false, message: "Backup já está em execução." };
  running = true;
  try {
    const result = await backupNeonToGoogleDrive();
    return { accepted: true, result };
  } catch (error: any) {
    lastError = error?.message || String(error);
    return { accepted: false, message: lastError };
  } finally {
    running = false;
  }
}

export function startDatabaseBackupScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    if (running) return;
    const now = Date.now();
    if (!lastSuccessAt || now - lastSuccessAt >= DEFAULT_INTERVAL_MS) {
      void triggerDatabaseBackup();
    }
  }, 15_000);
  timer.unref?.();
}

export function getDatabaseBackupConfig() {
  return {
    timezone: TZ,
    retentionDays: RETENTION_DAYS,
    intervalMs: DEFAULT_INTERVAL_MS,
    filenamePattern: "sqlite-DD-MM-YYYY.sql",
    source: "Neon PostgreSQL",
    drive: {
      clientIdConfigured: !!driveConfig.clientId,
      clientSecretConfigured: !!driveConfig.clientSecret,
      refreshTokenConfigured: !!driveConfig.refreshToken,
      folderIdConfigured: !!driveConfig.folderId,
    },
  };
}

// Local SQLite mirror persistence is isolated from the authoritative PostgreSQL path.
// It is deliberately never allowed to make a production write fail.
export function markLocalMirrorPersisted() {
  try {
    persistLocalSqlite();
    lastSqliteSyncAt = Date.now();
  } catch (error) {
    console.warn("[DB MIRROR] SQLite local persistence failed:", error);
  }
}
