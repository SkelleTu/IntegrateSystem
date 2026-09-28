import crypto from "crypto";

export type AuroraDiagnosticEvent = {
  traceId?: string;
  sessionId?: string;
  event: string;
  source?: string;
  stage?: string;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
};

type StoredEvent = AuroraDiagnosticEvent & {
  id: string;
  timestamp: number;
};

type TraceState = {
  traceId: string;
  sessionId?: string;
  firstSeen: number;
  lastSeen: number;
  lastEvent: string;
  lastStage?: string;
  eventCount: number;
  errors: number;
  events: StoredEvent[];
  barrier?: {
    waitingFor: string;
    since: number;
    timeoutMs: number;
  };
};

const MAX_TRACES = 200;
const MAX_EVENTS_PER_TRACE = 80;
const traces = new Map<string, TraceState>();

const expectedNext: Record<string, string> = {
  LIVE_CONNECT: "LIVE_CONFIGURED",
  LIVE_CONFIGURED: "AUDIO_RECEIVED|SPEECH_STARTED",
  SPEECH_STARTED: "AUDIO_RECEIVED|SPEECH_STOPPED",
  AUDIO_RECEIVED: "SPEECH_STARTED|SPEECH_STOPPED|AUDIO_CHUNK",
  SPEECH_STOPPED: "TRANSCRIPT_DELTA|TRANSCRIPT_COMPLETED|AI_RESPONSE_STARTED",
  TRANSCRIPT_COMPLETED: "AI_RESPONSE_STARTED",
  AI_RESPONSE_STARTED: "AI_RESPONSE_DELTA|AI_RESPONSE_COMPLETED|TTS_STARTED",
  AI_RESPONSE_COMPLETED: "TTS_STARTED|TTS_COMPLETED|LIVE_COMPLETED",
  TTS_STARTED: "TTS_COMPLETED",
};

function now() {
  return Date.now();
}

function getTrace(traceId: string, sessionId?: string) {
  let trace = traces.get(traceId);
  if (!trace) {
    if (traces.size >= MAX_TRACES) {
      const oldest = [...traces.values()].sort((a, b) => a.lastSeen - b.lastSeen)[0];
      if (oldest) traces.delete(oldest.traceId);
    }
    trace = {
      traceId,
      sessionId,
      firstSeen: now(),
      lastSeen: now(),
      lastEvent: "TRACE_CREATED",
      eventCount: 0,
      errors: 0,
      events: [],
    };
    traces.set(traceId, trace);
  }
  return trace;
}

function logDiagnostic(level: "info" | "warn" | "error", payload: Record<string, unknown>) {
  const line = JSON.stringify({
    type: "AURORA_DIAGNOSTIC",
    timestamp: new Date().toISOString(),
    ...payload,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function recordAuroraEvent(input: AuroraDiagnosticEvent) {
  const traceId = input.traceId || crypto.randomUUID();
  const timestamp = input.timestamp || now();
  const trace = getTrace(traceId, input.sessionId);
  const event: StoredEvent = {
    ...input,
    traceId,
    timestamp,
    id: crypto.randomUUID(),
  };

  trace.lastSeen = timestamp;
  trace.lastEvent = input.event;
  trace.lastStage = input.stage;
  trace.eventCount += 1;
  if (input.ok === false || input.error || input.event.endsWith("ERROR")) trace.errors += 1;
  trace.events.push(event);
  if (trace.events.length > MAX_EVENTS_PER_TRACE) trace.events.shift();

  const expected = expectedNext[input.event];
  trace.barrier = expected
    ? { waitingFor: expected, since: timestamp, timeoutMs: 8000 }
    : undefined;

  logDiagnostic(input.ok === false || input.error ? "error" : "info", {
    action: "EVENT",
    traceId,
    sessionId: input.sessionId,
    event: input.event,
    stage: input.stage,
    durationMs: input.durationMs,
    ok: input.ok,
    error: input.error,
  });

  return { traceId, eventId: event.id, barrier: trace.barrier };
}

export function sweepAuroraDiagnostics() {
  const timestamp = now();
  const barriers: Array<Record<string, unknown>> = [];

  for (const trace of traces.values()) {
    if (!trace.barrier) continue;
    const age = timestamp - trace.barrier.since;
    if (age < trace.barrier.timeoutMs) continue;

    const timeoutEvent = {
      traceId: trace.traceId,
      sessionId: trace.sessionId,
      event: "BARRIER_TIMEOUT",
      stage: "diagnostics",
      ok: false,
      error: `Nenhum dos eventos esperados ocorreu em ${trace.barrier.timeoutMs}ms: ${trace.barrier.waitingFor}`,
      metadata: {
        afterEvent: trace.lastEvent,
        waitingFor: trace.barrier.waitingFor,
        elapsedMs: age,
      },
    };

    trace.errors += 1;
    trace.lastEvent = "BARRIER_TIMEOUT";
    trace.lastSeen = timestamp;
    trace.events.push({ ...timeoutEvent, id: crypto.randomUUID(), timestamp });
    if (trace.events.length > MAX_EVENTS_PER_TRACE) trace.events.shift();
    barriers.push(timeoutEvent);
    logDiagnostic("error", { action: "BARRIER_TIMEOUT", ...timeoutEvent });
    trace.barrier = undefined;
  }

  return barriers;
}

export function getAuroraDiagnostics(traceId?: string) {
  sweepAuroraDiagnostics();
  if (traceId) return traces.get(traceId) || null;

  return [...traces.values()]
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map(({ events, ...summary }) => ({ ...summary, recentEvents: events.slice(-10) }));
}

export function clearAuroraDiagnostics() {
  traces.clear();
}

setInterval(sweepAuroraDiagnostics, 1000).unref();
