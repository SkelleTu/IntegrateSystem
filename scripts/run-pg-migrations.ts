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
  await pool.query(sql);
  console.log("[DB MIGRATION] Tenant isolation migration 0004 applied/verified.");
} finally {
  await pool.end();
}
