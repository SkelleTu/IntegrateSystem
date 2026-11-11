import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/pg-schema.js";

const connectionString = process.env.DATABASE_URL?.trim();

const allowEphemeralQa = process.env.RENDER_GIT_BRANCH === "fix/aura-system-hardening-qa"
  || process.env.RENDER_SERVICE_ID === "srv-dbqfjttg1s2s73e6moag"
  || process.env.RENDER_SERVICE_NAME === "integrated-system-qa-aura"
  || process.env.RENDER_EXTERNAL_URL === "https://integrated-system-qa-aura.onrender.com";

if (process.env.NODE_ENV === "production" && !connectionString && !allowEphemeralQa) {
  throw new Error("[DB] DATABASE_URL is required in production before Neon can be activated.");
}

export const neonPool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    })
  : null;

export const neonDb = neonPool ? drizzle(neonPool, { schema }) : null;

export async function verifyNeonConnection(): Promise<{ ok: boolean; latencyMs: number }> {
  if (!neonPool) throw new Error("[DB] Neon is not configured.");
  const startedAt = Date.now();
  await neonPool.query("SELECT 1");
  return { ok: true, latencyMs: Date.now() - startedAt };
}

export async function closeNeonPool(): Promise<void> {
  if (neonPool) await neonPool.end();
}
