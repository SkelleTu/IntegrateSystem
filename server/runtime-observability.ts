import fs from "fs";
import path from "path";
import os from "os";
import { and, asc, eq, gt } from "drizzle-orm";
import { runtimeEvents } from "../shared/schema";
import { db } from "./db";

const enabled = !process.env.VERCEL && process.env.AURA_RUNTIME_DISABLED !== "1";
const runtimeDir = process.env.AURA_RUNTIME_DIR
  ? path.resolve(process.env.AURA_RUNTIME_DIR)
  : path.join(process.cwd(), "runtime");
const eventsFile = path.join(runtimeDir, "aura-runtime.jsonl");
const statusFile = path.join(runtimeDir, "aura-runtime.json");

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("authorization") ||
      lower === "token" ||
      lower.includes("access_token") ||
      lower.includes("refresh_token") ||
      lower.includes("client_secret") ||
      lower.includes("password") ||
      lower.includes("secret")
    ) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redact(raw);
    }
  }
  return out;
}

export type RuntimeObservationQuery = {
  limit?: number;
  sinceSequence?: number;
  event?: string;
  traceId?: string;
  requestId?: string;
};

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(statusFile, "utf8"));
  } catch {
    return { enabled, unavailable: true };
  }
}

function parseFileFallback(query: RuntimeObservationQuery) {
  const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 250) || 250));
  const sinceSequence = Math.max(0, Number(query.sinceSequence ?? 0) || 0);
  const eventFilter = query.event?.trim();
  const traceFilter = query.traceId?.trim();
  const requestFilter = query.requestId?.trim();

  let raw = "";
  try {
    raw = fs.readFileSync(eventsFile, "utf8");
  } catch {
    return { events: [], latestSequence: sinceSequence, hasMore: false };
  }

  const parsed: Array<Record<string, unknown>> = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line) as Record<string, unknown>;
      const sequence = Number(item.sequence ?? 0);
      const data = item.data && typeof item.data === "object" ? item.data as Record<string, unknown> : {};
      if (sequence <= sinceSequence) continue;
      if (eventFilter && String(item.event ?? "") !== eventFilter) continue;
      if (traceFilter && String(data.traceId ?? "") !== traceFilter) continue;
      if (requestFilter && String(data.requestId ?? "") !== requestFilter) continue;
      parsed.push(redact(item) as Record<string, unknown>);
    } catch {
      // Ignore a partial local line. Durable storage is the authoritative source.
    }
  }

  const events = parsed.slice(0, limit);
  const latestSequence = events.length
    ? Number(events[events.length - 1].sequence ?? sinceSequence)
    : sinceSequence;

  return {
    events,
    latestSequence,
    hasMore: parsed.length > events.length,
  };
}

export async function getRuntimeObservability(query: RuntimeObservationQuery = {}) {
  const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 250) || 250));
  const sinceSequence = Math.max(0, Number(query.sinceSequence ?? 0) || 0);
  const eventFilter = query.event?.trim();
  const traceFilter = query.traceId?.trim();
  const requestFilter = query.requestId?.trim();

  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      source: "aura-runtime",
      host: os.hostname(),
      status: readStatus(),
      events: [],
      returned: 0,
      hasMore: false,
      nextSequence: sinceSequence,
    };
  }

  try {
    const conditions = [gt(runtimeEvents.id, sinceSequence)];
    if (eventFilter) conditions.push(eq(runtimeEvents.event, eventFilter));
    if (traceFilter) conditions.push(eq(runtimeEvents.traceId, traceFilter));
    if (requestFilter) conditions.push(eq(runtimeEvents.requestId, requestFilter));

    const rows = await db
      .select()
      .from(runtimeEvents)
      .where(and(...conditions))
      .orderBy(asc(runtimeEvents.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const selected = rows.slice(0, limit);
    const events = selected.map((row) => ({
      id: row.id,
      sequence: row.id,
      sessionId: row.sessionId,
      timestamp: row.timestamp,
      process: row.process,
      pid: row.pid,
      event: row.event,
      message: row.message,
      data: (() => {
        try {
          return redact(row.data ? JSON.parse(row.data) : {});
        } catch {
          return { raw: "[INVALID_EVENT_DATA]" };
        }
      })(),
    }));

    const latestSequence = events.length
      ? Number(events[events.length - 1].sequence)
      : sinceSequence;

    return {
      ok: true,
      enabled: true,
      source: "aura-runtime-ledger",
      host: os.hostname(),
      status: redact(readStatus()),
      events,
      returned: events.length,
      hasMore,
      latestSequence,
      nextSequence: latestSequence,
      filters: {
        limit,
        sinceSequence,
        event: eventFilter || null,
        traceId: traceFilter || null,
        requestId: requestFilter || null,
      },
    };
  } catch {
    const fallback = parseFileFallback(query);
    return {
      ok: true,
      enabled: true,
      source: "aura-runtime-file-fallback",
      host: os.hostname(),
      status: redact(readStatus()),
      events: fallback.events,
      returned: fallback.events.length,
      hasMore: fallback.hasMore,
      latestSequence: fallback.latestSequence,
      nextSequence: fallback.latestSequence,
      degraded: true,
      filters: {
        limit,
        sinceSequence,
        event: eventFilter || null,
        traceId: traceFilter || null,
        requestId: requestFilter || null,
      },
    };
  }
}
