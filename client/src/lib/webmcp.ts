/**
 * Aura System WebMCP bridge.
 *
 * Exposes authenticated, same-origin Aura operations to WebMCP-capable agents.
 * WebMCP never receives credentials: browser session cookies stay in the page.
 */

type WebMCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any, context?: { signal?: AbortSignal }) => Promise<unknown>;
};

type ModelContext = {
  registerTool?: (tool: WebMCPTool, options?: { exposedTo?: string[] }) => Promise<unknown> | unknown;
  unregisterTool?: (name: string) => Promise<unknown> | unknown;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

const API = {
  runtime: "/api/runtime/status",
  observability: "/api/runtime/observability",
  products: "/api/products",
  inventory: "/api/inventory",
};

async function auraFetch(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    signal,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message?: unknown }).message)
        : `Aura API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function assertPositiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return n;
}

function assertMoney(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return n;
}

function assertSafeQuery(value: unknown): string {
  const q = String(value ?? "").trim();
  if (q.length > 120) throw new Error("Query too long");
  return q;
}

export async function installAuraWebMCP(): Promise<boolean> {
  const modelContext = document.modelContext;
  if (!modelContext?.registerTool) return false;

  const tools: WebMCPTool[] = [
    {
      name: "aura_get_runtime_status",
      description:
        "Read the live Aura System runtime status. Read-only. Use this to verify that the connected Aura backend is online.",
      inputSchema: { type: "object", properties: {} },
      execute: (_input, { signal } = {}) => auraFetch(API.runtime, {}, signal),
    },
    {
      name: "aura_get_observability",
      description:
        "Read Aura's runtime observability stream, including correlated requests, MCP activity, operator events and errors. Credentials are redacted. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
          sinceSequence: { type: "integer", minimum: 0 },
          event: { type: "string" },
          traceId: { type: "string" },
          requestId: { type: "string" },
        },
      },
      execute: async (input = {}, { signal } = {}) => {
        const params = new URLSearchParams();
        if (input.limit != null) params.set("limit", String(Math.min(1000, Math.max(1, Number(input.limit)))));
        if (input.sinceSequence != null) params.set("sinceSequence", String(Math.max(0, Number(input.sinceSequence))));
        for (const key of ["event", "traceId", "requestId"] as const) {
          if (input[key]) params.set(key, String(input[key]));
        }
        return auraFetch(`${API.observability}?${params.toString()}`, {
          headers: { "X-MCP-Direct-Control": "true" },
        }, signal);
      },
    },
    {
      name: "aura_list_products",
      description:
        "List products from the authenticated Aura enterprise. Read-only. Optional q performs a product search.",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string", maxLength: 120 } },
      },
      execute: async (input = {}, { signal } = {}) => {
        const q = assertSafeQuery(input.q);
        const path = q ? `${API.products}?q=${encodeURIComponent(q)}` : API.products;
        return auraFetch(path, {}, signal);
      },
    },
    {
      name: "aura_list_inventory",
      description:
        "List the authenticated Aura enterprise inventory. Read-only.",
      inputSchema: { type: "object", properties: {} },
      execute: (_input, { signal } = {}) => auraFetch(API.inventory, {}, signal),
    },
    {
      name: "aura_get_product",
      description: "Read one Aura product by numeric ID.",
      inputSchema: {
        type: "object",
        properties: { productId: { type: "integer", minimum: 1 } },
        required: ["productId"],
      },
      execute: (input, { signal } = {}) =>
        auraFetch(`${API.products}/${assertPositiveInt(input.productId, "productId")}`, {}, signal),
    },
    {
      name: "aura_restock_inventory",
      description:
        "Perform an authenticated Aura inventory restock. This is a real write operation and changes stock. Use only when the user explicitly requests a stock entry.",
      inputSchema: {
        type: "object",
        properties: {
          inventoryId: { type: "integer", minimum: 1 },
          quantity: { type: "integer", minimum: 1 },
          unit: { type: "string" },
          itemsPerUnit: { type: "integer", minimum: 1 },
          costPrice: { type: "number", minimum: 0 },
          expiryDate: { type: "string" },
        },
        required: ["inventoryId", "quantity"],
      },
      execute: (input, { signal } = {}) => {
        const inventoryId = assertPositiveInt(input.inventoryId, "inventoryId");
        const quantity = assertPositiveInt(input.quantity, "quantity");
        const body: Record<string, unknown> = { quantity };
        if (input.unit != null) body.unit = String(input.unit);
        if (input.itemsPerUnit != null) body.itemsPerUnit = assertPositiveInt(input.itemsPerUnit, "itemsPerUnit");
        if (input.costPrice != null) body.costPrice = assertMoney(input.costPrice, "costPrice");
        if (input.expiryDate != null) body.expiryDate = String(input.expiryDate);
        return auraFetch(`${API.inventory}/${inventoryId}/restock`, {
          method: "POST",
          body: JSON.stringify(body),
        }, signal);
      },
    },
  ];

  for (const tool of tools) {
    await modelContext.registerTool(tool);
  }

  return true;
}
