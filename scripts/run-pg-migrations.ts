import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = String(process.env.DATABASE_URL || "").trim();
if (!url) {
  console.log("[DB MIGRATION] DATABASE_URL not configured; skipping PostgreSQL migration.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 2 });
try {
  const migrationPath = path.resolve(process.cwd(), "migrations/pg/0004_tenant_isolation.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  const defaultEnterpriseId = String(process.env.AURA_DEFAULT_ENTERPRISE_ID || "").trim();
  const client = await pool.connect();
  try {
    if (defaultEnterpriseId) {
      if (!/^\\d+$/.test(defaultEnterpriseId) || Number(defaultEnterpriseId) <= 0) {
        throw new Error("AURA_DEFAULT_ENTERPRISE_ID must be a positive integer");
      }
      await client.query("SELECT set_config('app.default_enterprise_id', $1, false)", [defaultEnterpriseId]);
    }
    await client.query(sql);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
  console.log("[DB MIGRATION] Tenant isolation migration 0004 applied/verified.");
} finally {
  await pool.end();
}
