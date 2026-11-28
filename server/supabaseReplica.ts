import { localSqlite, persistLocalSqlite } from "./db.js";

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || "iporgioruideqodqzxjo";
const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const baseUrl = (process.env.SUPABASE_URL?.trim() || `https://${projectRef}.supabase.co`).replace(/\/$/, "");

async function supabaseRest(path: string, init: RequestInit = {}) {
  if (!apiKey) throw new Error("SUPABASE_PUBLISHABLE_KEY não configurada");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

export function supabaseReplicaConfigured() { return Boolean(apiKey); }

export async function verifySupabaseReplica() {
  if (!apiKey) return { ok: false, latencyMs: 0 };
  const started = Date.now();
  await supabaseRest("/rest/v1/integrate_system._health?select=id&limit=1");
  return { ok: true, latencyMs: Date.now() - started };
}

export async function publishSqliteSnapshot() {
  if (!apiKey) return { tables: 0, rows: 0 };
  const names = localSqlite.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  let tables = 0, rows = 0;
  for (const entry of (names[0]?.values || [])) {
    const table = String(entry[0]);
    const result = localSqlite.exec(`SELECT * FROM "${table.replace(/"/g, '""')}"`);
    if (!result[0]) continue;
    tables++;
    const columns = result[0].columns.map(String);
    for (const row of result[0].values) {
      const payload: Record<string, any> = {};
      columns.forEach((c, i) => { const v = row[i]; payload[c] = v instanceof Uint8Array ? Array.from(v) : v; });
      const id = payload.id ?? payload.sid ?? payload.slug;
      if (id == null) continue;
      await supabaseRest("/rest/v1/integrate_system.sqlite_replica_rows?on_conflict=table_name,row_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{ table_name: table, row_id: String(id), payload, updated_at: new Date().toISOString() }]),
      });
      rows++;
    }
  }
  return { tables, rows };
}

export async function hydrateSqliteFromSupabaseReplica() {
  if (!apiKey) return { tables: 0, rows: 0 };
  const data: any[] = await supabaseRest("/rest/v1/integrate_system.sqlite_replica_rows?select=table_name,row_id,payload&order=updated_at.asc&limit=10000");
  let rows = 0, tables = 0;
  const grouped = new Map<string, any[]>();
  for (const item of data) {
    if (!grouped.has(item.table_name)) grouped.set(item.table_name, []);
    grouped.get(item.table_name)!.push(item.payload || {});
  }
  for (const [table, payloads] of grouped) {
    const info = localSqlite.exec(`PRAGMA table_info("${table.replace(/"/g, '""')}")`);
    if (!info[0]?.values?.length) continue;
    tables++;
    const columns = info[0].values.map((r: any[]) => String(r[1]));
    localSqlite.exec(`DELETE FROM "${table.replace(/"/g, '""')}"`);
    const quoted = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(",");
    const stmt = localSqlite.prepare(`INSERT INTO "${table.replace(/"/g, '""')}" (${quoted}) VALUES (${columns.map(() => "?").join(",")})`);
    try { for (const payload of payloads) { stmt.run(columns.map(c => payload[c] ?? null)); rows++; } }
    finally { stmt.free(); }
  }
  persistLocalSqlite();
  return { tables, rows };
}