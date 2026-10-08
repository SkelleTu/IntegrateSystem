import { AsyncLocalStorage } from "node:async_hooks";

export type AuraRequestContext = {
  traceId?: string | null;
  requestId?: string | null;
  userId?: number | null;
  source?: string | null;
};

const storage = new AsyncLocalStorage<AuraRequestContext>();

export function runWithAuraContext<T>(context: AuraRequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getAuraContext(): AuraRequestContext {
  return storage.getStore() ?? {};
}

export function updateAuraContext(patch: AuraRequestContext): void {
  const current = storage.getStore();
  if (!current) return;
  Object.assign(current, patch);
}
