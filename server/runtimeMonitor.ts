import fs from "fs";
import path from "path";
import os from "os";
import { getAuraContext } from "./aura-request-context";

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
    ) out[key] = "[REDACTED]";
    else out[key] = redact(raw);
  }
  return out;
}

const enabled = !process.env.VERCEL && process.env.AURA_RUNTIME_DISABLED !== "1";
const runtimeDir = process.env.AURA_RUNTIME_DIR
  ? path.resolve(process.env.AURA_RUNTIME_DIR)
  : path.join(process.cwd(), "runtime");

const statusFile = path.join(runtimeDir, "aura-runtime.json");
const eventsFile = path.join(runtimeDir, "aura-runtime.jsonl");
const startedAt = Date.now();
const sessionId =
  process.env.AURA_RUNTIME_SESSION ||
  `${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 17)}-${Math.random().toString(16).slice(2, 10)}`;
const heartbeatMs = Math.max(
  100,
  Number.parseInt(process.env.AURA_RUNTIME_HEARTBEAT_MS || "250", 10) || 250,
);

let sequence = 0;
let heartbeatTimer: NodeJS.Timeout | undefined;
let lastPhase = "server";
let lastMessage = "Inicializando servidor";
let lastProgress = 0;

let consoleCaptureInstalled = false;
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

function serializeConsoleArgument(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized.length <= 8000
      ? JSON.parse(serialized)
      : String(value);
  } catch {
    return String(value);
  }
}

export function installConsoleCapture() {
  if (!enabled || consoleCaptureInstalled) return;
  consoleCaptureInstalled = true;

  const capture = (
    level: "log" | "info" | "warn" | "error" | "debug",
    original: (...args: any[]) => void,
  ) => (...args: any[]) => {
    original(...args);

    try {
      runtimeEvent("console", args.map(serializeConsoleArgument).join(" "), {
        phase: "console",
        level,
        arguments: args.map(serializeConsoleArgument),
      });
    } catch {
      // Diagnostic capture must never break application logging.
    }
  };

  console.log = capture("log", originalConsole.log) as typeof console.log;
  console.info = capture("info", originalConsole.info) as typeof console.info;
  console.warn = capture("warn", originalConsole.warn) as typeof console.warn;
  console.error = capture("error", originalConsole.error) as typeof console.error;
  console.debug = capture("debug", originalConsole.debug) as typeof console.debug;
}


function ensureRuntimeDir() {
  if (!enabled) return;
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function writeStatus(extra: Record<string, unknown> = {}) {
  if (!enabled) return;

  ensureRuntimeDir();

  const status = {
    sessionId,
    process: "server",
    pid: process.pid,
    hostname: os.hostname(),
    updatedAt: new Date().toISOString(),
    uptimeMs: Date.now() - startedAt,
    heartbeatMs,
    phase: lastPhase,
    message: lastMessage,
    progress: lastProgress,
    ...extra,
  };

  const tempFile = `${statusFile}.tmp-${process.pid}`;
  fs.writeFileSync(tempFile, JSON.stringify(status, null, 2), "utf8");
  try {
    fs.renameSync(tempFile, statusFile);
  } catch {
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), "utf8");
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

export function runtimeEvent(
  event: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  if (!enabled) return;

  ensureRuntimeDir();
  sequence += 1;
  lastPhase = String(data.phase || lastPhase);
  lastMessage = message;

  if (typeof data.progress === "number") {
    lastProgress = Math.max(0, Math.min(100, data.progress));
  }

  const context = getAuraContext();
  const enrichedData = {
    ...data,
    traceId: data.traceId ?? context.traceId ?? null,
    requestId: data.requestId ?? context.requestId ?? null,
    source: data.source ?? context.source ?? "server",
  };

  const record = {
    sequence,
    sessionId,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    process: "server",
    pid: process.pid,
    event,
    message,
    data: enrichedData,
  };

  fs.appendFileSync(eventsFile, JSON.stringify(record) + os.EOL, "utf8");
  queueRuntimeEventPersistence(record);
  writeStatus({
    lastEvent: event,
    lastEventAt: record.timestamp,
    lastData: data,
  });
}

let durablePersistenceReady = false;
const pendingDurableEvents: Array<Parameters<typeof persistRuntimeEvent>[0]> = [];

function queueRuntimeEventPersistence(record: Parameters<typeof persistRuntimeEvent>[0]) {
  if (!durablePersistenceReady) {
    // Prevent a circular import while db.ts is still initializing. Keep boot events for a later flush.
    if (pendingDurableEvents.length < 1000) pendingDurableEvents.push(record);
    return;
  }
  void persistRuntimeEvent(record);
}

export async function enableDurableRuntimePersistence() {
  durablePersistenceReady = true;
  const pending = pendingDurableEvents.splice(0, pendingDurableEvents.length);
  // Keep startup flush sequential to preserve event order and avoid SQLite write contention.
  for (const record of pending) {
    await persistRuntimeEvent(record);
  }
}

async function persistRuntimeEvent(record: {
  sequence: number;
  sessionId: string;
  timestamp: string;
  process: string;
  pid: number;
  event: string;
  message: string;
  data: Record<string, unknown>;
}) {
  try {
    const [{ localSqlite, tursoClient, persistLocalSqlite }] = await Promise.all([import("./db")]);
    const context = record.data;
    const redactedData = redact(context);
    const statement = `INSERT INTO runtime_events
      (sequence, session_id, timestamp, process, pid, event, message, trace_id, request_id, source, severity, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const args = [
      record.sequence,
      record.sessionId,
      Date.parse(record.timestamp),
      record.process,
      record.pid,
      record.event,
      record.message,
      typeof context.traceId === "string" ? context.traceId : null,
      typeof context.requestId === "string" ? context.requestId : null,
      typeof context.source === "string" ? context.source : "server",
      record.event === "error" ? "error" : record.event.includes("warn") ? "warn" : "info",
      JSON.stringify(redactedData),
    ];

    const localWrite = () => {
      const statementHandle = localSqlite.prepare(statement);
      try {
        statementHandle.run(args);
      } finally {
        statementHandle.free();
      }
      persistLocalSqlite();
    };
    const remoteWrite = () => tursoClient
      ? tursoClient.execute({ sql: statement, args })
      : Promise.resolve();

    const [localResult, remoteResult] = await Promise.allSettled([
      Promise.resolve().then(localWrite),
      Promise.resolve().then(remoteWrite),
    ]);

    if (localResult.status === "rejected" || remoteResult.status === "rejected") {
      // Best-effort compensation avoids leaving a one-sided event behind.
      if (localResult.status === "fulfilled" && remoteResult.status === "rejected") {
        const cleanup = localSqlite.prepare("DELETE FROM runtime_events WHERE session_id = ? AND sequence = ?");
        try { cleanup.run([record.sessionId, record.sequence]); } finally { cleanup.free(); }
        persistLocalSqlite();
      } else if (localResult.status === "rejected" && remoteResult.status === "fulfilled" && tursoClient) {
        await tursoClient.execute({
          sql: "DELETE FROM runtime_events WHERE session_id = ? AND sequence = ?",
          args: [record.sessionId, record.sequence],
        }).catch(() => undefined);
      }
      const localError = localResult.status === "rejected" ? String(localResult.reason) : "";
      const remoteError = remoteResult.status === "rejected" ? String(remoteResult.reason) : "";
      throw new Error(`Runtime event dual-write failed. SQLite: ${localError || "ok"}; Turso: ${remoteError || "ok"}`);
    }
  } catch (error) {
    try {
      originalConsole.error("[RUNTIME OBSERVABILITY] durable event persistence failed:", error);
    } catch {}
  }
}

export function runtimeError(
  error: unknown,
  message = "Erro não tratado",
  data: Record<string, unknown> = {},
) {
  const detail =
    error instanceof Error
      ? {
          name: error.name,
          error: error.message,
          stack: error.stack,
        }
      : {
          error: String(error),
        };

  runtimeEvent("error", message, {
    ...data,
    ...detail,
  });
}

export function startRuntimeMonitor() {
  if (!enabled || heartbeatTimer) return;

  runtimeEvent("server-monitor-start", "Monitor de runtime do servidor iniciado", {
    phase: "server",
    progress: 0,
    heartbeatMs,
  });

  heartbeatTimer = setInterval(() => {
    const memory = process.memoryUsage();

    writeStatus({
      lastEvent: "heartbeat",
      lastEventAt: new Date().toISOString(),
      runtime: {
        memoryRssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers,
      },
    });
  }, heartbeatMs);

  heartbeatTimer.unref();
}

export function stopRuntimeMonitor(reason = "Servidor encerrado") {
  if (!enabled) return;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }

  runtimeEvent("server-stop", reason, {
    phase: "shutdown",
    progress: 100,
  });
  writeStatus({
    stoppedAt: new Date().toISOString(),
    stopped: true,
  });
}

export function getRuntimeStatus() {
  if (!enabled) {
    return {
      enabled: false,
      process: "server",
    };
  }

  try {
    return JSON.parse(fs.readFileSync(statusFile, "utf8"));
  } catch {
    return {
      enabled: true,
      process: "server",
      sessionId,
      pid: process.pid,
      updatedAt: new Date().toISOString(),
      uptimeMs: Date.now() - startedAt,
      heartbeatMs,
      phase: lastPhase,
      message: lastMessage,
      progress: lastProgress,
    };
  }
}
