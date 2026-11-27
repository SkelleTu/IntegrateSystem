import { neonPool } from "./neon-db.js";
import { localSqlite, persistLocalSqlite } from "./db.js";

let syncing = false;
let lastSyncAt: number | null = null;
let lastSyncError: string | null = null;

function sqliteType(pgType: string) {
  const t = pgType.toLowerCase();
  if (t.includes("int") || t.includes("numeric") || t.includes("decimal") || t.includes("real") || t.includes("double")) return "REAL";
  if (t.includes("bool")) return "INTEGER";
  return "TEXT";
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return "'" + value.toISOString().replace(/'/g, "''") + "'";
  if (Buffer.isBuffer(value)) return "X'" + value.toString("hex") + "'";
  if (typeof value === "object") return "'" + JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
  return "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
}

export async function syncSqliteMirrorFromNeon(): Promise<{ tables: number; rows: number }> {
  if (!neonPool || syncing) return { tables: 0, rows: 0 };
  syncing = true;
  try {
    const tableResult = await neonPool.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r','p') AND n.nspname = 'public'
      ORDER BY c.relname
    `);
    let rowsTotal = 0;
    let tables = 0;

    for (const table of tableResult.rows as any[]) {
      const name = String(table.table_name);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;

      const cols = await neonPool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position
      `, [name]);
      const columns = cols.rows as any[];
      if (!columns.length) continue;

      const existing = localSqlite.exec(`PRAGMA table_info("${name.replace(/"/g, '""')}")`);
      const existingNames = new Set<string>((existing[0]?.values || []).map((row: any[]) => String(row[1])));
      if (!existing?.length) {
        localSqlite.exec(`CREATE TABLE IF NOT EXISTS "${name}" (${columns.map(c => `"${c.column_name.replace(/"/g, '""')}" ${sqliteType(c.data_type)}`).join(", ")})`);
      } else {
        for (const c of columns) {
          if (!existingNames.has(String(c.column_name))) {
            localSqlite.exec(`ALTER TABLE "${name}" ADD COLUMN "${c.column_name.replace(/"/g, '""')}" ${sqliteType(c.data_type)}`);
          }
        }
      }

      const data = await neonPool.query(`SELECT * FROM public."${name}"`);
      localSqlite.exec(`DELETE FROM "${name}"`);
      const quotedColumns = columns.map(c => `"${c.column_name.replace(/"/g, '""')}"`).join(", ");
      for (let offset = 0; offset < data.rows.length; offset += 200) {
        const chunk = data.rows.slice(offset, offset + 200);
        const values = chunk.map((row: any) => "(" + columns.map(c => sqlValue(row[c.column_name])).join(",") + ")").join(",");
        localSqlite.exec(`INSERT INTO "${name}" (${quotedColumns}) VALUES ${values}`);
      }
      rowsTotal += data.rows.length;
      tables++;
    }

    persistLocalSqlite();
    lastSyncAt = Date.now();
    lastSyncError = null;
    return { tables, rows: rowsTotal };
  } catch (error: any) {
    lastSyncError = error?.message || String(error);
    console.warn("[DB MIRROR] sincronização SQLite falhou:", lastSyncError);
    return { tables: 0, rows: 0 };
  } finally {
    syncing = false;
  }
}

export function getSqliteMirrorStatus() {
  return { lastSyncAt, lastSyncError, syncing };
}

let periodicTimer: ReturnType<typeof setInterval> | null = null;
export function startSqliteMirrorScheduler() {
  if (periodicTimer) return;
  void syncSqliteMirrorFromNeon();
  periodicTimer = setInterval(() => { void syncSqliteMirrorFromNeon(); }, 60_000);
  periodicTimer.unref?.();
}
