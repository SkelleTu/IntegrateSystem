import fs from "fs";
import path from "path";
import os from "os";

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

  const record = {
    sequence,
    sessionId,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    process: "server",
    pid: process.pid,
    event,
    message,
    data,
  };

  fs.appendFileSync(eventsFile, JSON.stringify(record) + os.EOL, "utf8");
  writeStatus({
    lastEvent: event,
    lastEventAt: record.timestamp,
    lastData: data,
  });
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
