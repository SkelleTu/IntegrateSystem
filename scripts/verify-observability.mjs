import fs from "node:fs";

const required = [
  ["server/runtimeMonitor.ts", ["persistRuntimeEvent", "runtimeEvents", "getAuraContext"]],
  ["server/runtime-observability.ts", ["aura-runtime-ledger", "nextSequence", "limit + 1"]],
  ["server/aura-request-context.ts", ["AsyncLocalStorage", "traceId", "requestId"]],
  ["server/app.ts", ["runWithAuraContext", "await getRuntimeObservability"]],
  ["server/storage.ts", ["sale-created", "sale-items-created", "sale-payments-created", "sale-financial-transaction", "sale-completed", "cash-register-opened", "cash-register-closed"]],
  ["shared/schema.ts", ['runtimeEvents = pgTable("runtime_events"']],
  ["server/db.ts", ["CREATE TABLE IF NOT EXISTS runtime_events"]],
];

for (const [file, needles] of required) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`Observability contract missing: ${file} -> ${needle}`);
    }
  }
}

const monitor = fs.readFileSync("server/runtimeMonitor.ts", "utf8");
if (!monitor.includes('void persistRuntimeEvent(record)')) {
  throw new Error("Runtime events are not durably persisted.");
}

const obs = fs.readFileSync("server/runtime-observability.ts", "utf8");
if (!obs.includes(".orderBy(asc(runtimeEvents.id))") || !obs.includes(".limit(limit + 1)")) {
  throw new Error("Durable observability pagination contract is missing.");
}

console.log("AURA OBSERVABILITY CONTRACT: PASS");
