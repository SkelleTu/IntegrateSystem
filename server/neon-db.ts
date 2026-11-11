import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/pg-schema.js";

const connectionString = process.env.DATABASE_URL?.trim();

const renderQaIdentity = {
  branch: process.env.RENDER_GIT_BRANCH || "",
  serviceId: process.env.RENDER_SERVICE_ID || "",
  serviceName: process.env.RENDER_SERVICE_NAME || "",
  externalUrl: process.env.RENDER_EXTERNAL_URL || "",
  qaFlag: process.env.AURA_QA_MODE || "",
};
const allowEphemeralQa = renderQaIdentity.branch === "fix/aura-system-hardening-qa"
  || renderQaIdentity.serviceId === "srv-dbqfjttg1s2s73e6moag"
  || renderQaIdentity.serviceName === "integrated-system-qa-aura"
  || renderQaIdentity.externalUrl === "https://integrated-system-qa-aura.onrender.com"
  || (renderQaIdentity.qaFlag === "true" && renderQaIdentity.serviceName === "integrated-system-qa-aura");

process.stdout.write("[AURA_QA_BOOT] " + JSON.stringify({
  branch: renderQaIdentity.branch,
  serviceId: renderQaIdentity.serviceId,
  serviceName: renderQaIdentity.serviceName,
  externalUrl: renderQaIdentity.externalUrl,
  qaFlag: renderQaIdentity.qaFlag,
  allowEphemeralQa,
  hasDatabaseUrl: Boolean(connectionString),
}) + "\\n");

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
