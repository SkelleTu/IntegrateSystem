import fs from "node:fs/promises";
import path from "node:path";
import { neonPool } from "./neon-db.js";

let completed = false;

export async function runTenantIsolationMigration(): Promise<void> {
  if (completed || !neonPool) return;
  const migrationPath = path.resolve(process.cwd(), "migrations/pg/0004_tenant_isolation.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  await neonPool.query(sql);
  completed = true;
  console.log("[DB MIGRATION] Tenant isolation migration 0004 applied.");
}
