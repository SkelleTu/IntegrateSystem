import fs from "fs";
import path from "path";
import os from "os";

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

export function getRuntimeObservability(query: RuntimeObservationQuery = {}) {
  const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 250) || 250));
  const sinceSequence = Math.max(0, Number(query.sinceSequence ?? 0) || 0);
  const eventFilter = query.event?.trim();
  const traceFilter = query.traceId?.trim();
  const requestFilter = query.requestId?.trim();

  let status: unknown = null;
  try {
    status = JSON.parse(fs.readFileSync(statusFile, "utf8"));
  } catch {
    status = { enabled, unavailable: true };
  }

  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      source: "aura-runtime",
      host: os.hostname(),
      status,
      events: [],
      returned: 0,
      hasMore: false,
    };
  }

  let raw = "";
  try {
    raw = fs.readFileSync(eventsFile, "utf8");
  } catch {
    return {
      ok: true,
      enabled: true,
      source: "aura-runtime",
      host: os.hostname(),
      status,
      events: [],
      returned: 0,
      hasMore: false,
    };
  }

  const parsed: Array<Record<string, unknown>> = [];
  for (const line of raw.split(/\\r?\\n/)) {
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
      // Ignore a partially written/corrupt line without breaking observability.
    }
  }

  const events = parsed.slice(-limit);
  const latestSequence = events.length ? Number(events[events.length - 1].sequence ?? sinceSequence) : sinceSequence;

  return {
    ok: true,
    enabled: true,
    source: "aura-runtime",
    host: os.hostname(),
    status: redact(status),
    events,
    returned: events.length,
    hasMore: parsed.length > events.length,
    latestSequence,
    filters: {
      limit,
      sinceSequence,
      event: eventFilter || null,
      traceId: traceFilter || null,
      requestId: requestFilter || null,
    },
  };
}
