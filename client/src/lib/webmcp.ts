
type WebMCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any, context?: { signal?: AbortSignal }) => Promise<unknown>;
};

type ModelContext = {
  registerTool?: (tool: WebMCPTool, options?: { exposedTo?: string[]; signal?: AbortSignal }) => Promise<unknown> | unknown;
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
  cashOpen: "/api/cash-register/open",
  cashClose: "/api/cash-register/close",
  sales: "/api/sales",
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

export async function installAuraWebMCP(): Promise<() => void> {
  const modelContext = document.modelContext;
  if (!modelContext?.registerTool) return () => {};

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
      name: "aura_get_open_cash_register",
      description: "Read the currently open Aura cash register for the authenticated operator. Read-only.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true, consequentialHint: false },
      execute: (_input, { signal } = {}) => auraFetch(API.cashOpen, {}, signal),
    },
    {
      name: "aura_open_cash_register",
      description: "Open the authenticated operator cash register with an opening amount in BRL. Real operation; only use when explicitly requested.",
      inputSchema: { type: "object", properties: { openingAmount: { type: "number", minimum: 0 } }, required: ["openingAmount"] },
      annotations: { readOnlyHint: false, consequentialHint: true },
      execute: (input, { signal } = {}) => auraFetch(API.cashOpen, { method: "POST", body: JSON.stringify({ openingAmount: assertMoney(input.openingAmount, "openingAmount") }) }, signal),
    },
    {
      name: "aura_create_cash_sale",
      description: "Create a real sale in the authenticated Aura cash register, updating stock and financial records. Only use after explicit confirmation of sale details.",
      inputSchema: { type: "object", properties: {
        totalAmount: { type: "integer", minimum: 1 }, customerTaxId: { type: "string" }, customerName: { type: "string" },
        items: { type: "array" }, payments: { type: "array" }
      }, required: ["totalAmount", "items", "payments"] },
      annotations: { readOnlyHint: false, consequentialHint: true },
      execute: (input, { signal } = {}) => {
        const totalAmount = assertPositiveInt(input.totalAmount, "totalAmount");
        if (!Array.isArray(input.items) || !input.items.length) throw new Error("items must contain at least one item");
        if (!Array.isArray(input.payments) || !input.payments.length) throw new Error("payments must contain at least one payment");
        const items = input.items.map((item: any) => ({ itemType: String(item.itemType), itemId: assertPositiveInt(item.itemId, "itemId"), quantity: assertPositiveInt(item.quantity, "quantity"), unitPrice: assertPositiveInt(item.unitPrice, "unitPrice"), totalPrice: assertPositiveInt(item.totalPrice, "totalPrice"), unitType: item.unitType ? String(item.unitType) : "unit" }));
        const payments = input.payments.map((p: any) => ({ method: String(p.method), amount: assertPositiveInt(p.amount, "payment.amount") }));
        if (payments.reduce((sum: number, p: any) => sum + p.amount, 0) !== totalAmount) throw new Error("Payment total must equal sale total");
        const sale: Record<string, unknown> = { totalAmount };
        if (input.customerTaxId) sale.customerTaxId = String(input.customerTaxId);
        if (input.customerName) sale.customerName = String(input.customerName);
        return auraFetch(API.sales, { method: "POST", body: JSON.stringify({ sale, items, payments }) }, signal);
      },
    },
    {
      name: "aura_close_cash_register",
      description: "Close the authenticated operator cash register using the counted closing amount in BRL. Real operation; only use when explicitly requested.",
      inputSchema: { type: "object", properties: { closingAmount: { type: "number", minimum: 0 } }, required: ["closingAmount"] },
      annotations: { readOnlyHint: false, consequentialHint: true },
      execute: (input, { signal } = {}) => auraFetch(API.cashClose, { method: "POST", body: JSON.stringify({ closingAmount: assertMoney(input.closingAmount, "closingAmount") }) }, signal),
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


  const managedTool = (
    name: string,
    description: string,
    actions: Record<string, { method: string; path: (input: any) => string; body?: (input: any) => unknown }>,
    consequential: boolean,
  ): WebMCPTool => ({
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: Object.keys(actions) },
        payload: { type: "object", additionalProperties: true },
      },
      required: ["action"],
    },
    annotations: { readOnlyHint: !consequential, consequentialHint: consequential },
    execute: async (input = {}, { signal } = {}) => {
      const action = String(input.action || "");
      const spec = actions[action];
      if (!spec) throw new Error("Unsupported action: " + action);
      const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
      const init: RequestInit = { method: spec.method };
      if (spec.body) init.body = JSON.stringify(spec.body(payload));
      return auraFetch(spec.path(payload), init, signal);
    },
  });

  const id = (input: any, field = "id") => assertPositiveInt(input[field], field);
  const q = (input: any) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input || {})) {
      if (value != null && value !== "") params.set(key, String(value));
    }
    return params.toString();
  };

  tools.push(
    managedTool("aura_get_system", "Read Aura system/database status and authenticated session state.", {
      database: { method: "GET", path: () => "/api/db/status" },
      session: { method: "GET", path: () => "/api/auth/me" },
    }, false),
    managedTool("aura_manage_auth", "Manage the current Aura browser session. Logout changes session state.", {
      me: { method: "GET", path: () => "/api/auth/me" },
      logout: { method: "POST", path: () => "/api/auth/logout" },
    }, true),
    managedTool("aura_read_enterprises", "Read establishments available to the current Aura owner or admin.", {
      mine: { method: "GET", path: () => "/api/my-enterprises" },
      admin_list: { method: "GET", path: () => "/api/admin/enterprises" },
    }, false),
    managedTool("aura_manage_enterprises", "Create, select, update, approve/reject, or delete Aura establishments.", {
      create_mine: { method: "POST", path: () => "/api/my-enterprises", body: p => p },
      select_mine: { method: "PUT", path: p => "/api/my-enterprises/" + id(p) + "/select", body: () => ({}) },
      admin_create: { method: "POST", path: () => "/api/admin/enterprises", body: p => p },
      admin_update: { method: "PUT", path: p => "/api/admin/enterprises/" + id(p), body: p => p },
      admin_status: { method: "PUT", path: p => "/api/admin/enterprises/" + id(p) + "/status", body: p => ({ status: p.status }) },
      admin_delete: { method: "DELETE", path: p => "/api/admin/enterprises/" + id(p) },
    }, true),
    managedTool("aura_manage_admin", "Manage administrative monitoring, users and employee accounts.", {
      monitoring: { method: "GET", path: () => "/api/admin/monitoring" },
      delete_user: { method: "DELETE", path: p => "/api/admin/users/" + id(p) },
      register_barber: { method: "POST", path: () => "/api/admin/register-barber", body: p => p },
    }, true),
    managedTool("aura_manage_settings", "Read or update Aura enterprise settings.", {
      get: { method: "GET", path: p => "/api/settings" + (q(p) ? "?" + q(p) : "") },
      update: { method: "POST", path: () => "/api/settings", body: p => p },
    }, true),
  );


  tools.push(
    managedTool("aura_read_fiscal", "Read fiscal settings, logs and fiscal history.", {
      settings: { method: "GET", path: () => "/api/fiscal/settings" },
      logs: { method: "GET", path: () => "/api/fiscal/logs" },
      history: { method: "GET", path: () => "/api/fiscal/history" },
    }, false),
    managedTool("aura_manage_fiscal", "Save fiscal configuration or emit a fiscal document for a sale.", {
      save_settings: { method: "POST", path: () => "/api/fiscal/settings", body: p => p },
      emitir: { method: "POST", path: p => "/api/fiscal/emitir/" + id(p, "saleId"), body: p => p },
    }, true),
    managedTool("aura_manage_categories", "List or create Aura product/menu categories.", {
      list: { method: "GET", path: () => "/api/categories" },
      create: { method: "POST", path: () => "/api/categories", body: p => p },
    }, true),
    managedTool("aura_read_inventory", "Read inventory, barcode/search results and restock history.", {
      list: { method: "GET", path: () => "/api/inventory" },
      search: { method: "GET", path: p => "/api/inventory/search" + (q(p) ? "?" + q(p) : "") },
      barcode: { method: "GET", path: p => "/api/inventory/barcode/" + encodeURIComponent(String(p.barcode || "")) },
      restocks: { method: "GET", path: () => "/api/inventory-restocks" },
      item_restocks: { method: "GET", path: p => "/api/inventory/" + id(p, "inventoryId") + "/restocks" },
    }, false),
    managedTool("aura_manage_inventory", "Create, delete, restock and log inventory movements.", {
      create: { method: "POST", path: () => "/api/inventory", body: p => p },
      delete: { method: "DELETE", path: p => "/api/inventory/" + id(p, "inventoryId") },
      restock: { method: "POST", path: p => "/api/inventory/" + id(p, "inventoryId") + "/restock", body: p => p },
      log: { method: "POST", path: () => "/api/inventory/log", body: p => p },
    }, true),
    managedTool("aura_read_products", "Read products, cashier catalog, barcode/SKU lookups, batches and stock logs.", {
      list: { method: "GET", path: p => "/api/products" + (q(p) ? "?" + q(p) : "") },
      cashier_items: { method: "GET", path: () => "/api/products/cashier-items" },
      barcode: { method: "GET", path: p => "/api/products/barcode/" + encodeURIComponent(String(p.barcode || "")) },
      sku: { method: "GET", path: p => "/api/products/sku/" + encodeURIComponent(String(p.sku || "")) },
      get: { method: "GET", path: p => "/api/products/" + id(p, "productId") },
      batches: { method: "GET", path: p => "/api/products/" + id(p, "productId") + "/batches" },
      logs: { method: "GET", path: p => "/api/products/" + id(p, "productId") + "/logs" },
      snapshot: { method: "GET", path: () => "/api/products/snapshot" },
    }, false),
    managedTool("aura_manage_products", "Create, update, delete and administer the Aura product catalog.", {
      create: { method: "POST", path: () => "/api/products", body: p => p },
      update: { method: "PUT", path: p => "/api/products/" + id(p, "productId"), body: p => p.data || p },
      delete: { method: "DELETE", path: p => "/api/products/" + id(p, "productId") },
      swap_codigo: { method: "POST", path: () => "/api/products/swap-codigo", body: p => p },
      check_duplicate: { method: "POST", path: () => "/api/products/check-duplicate", body: p => p },
      clear_all: { method: "DELETE", path: () => "/api/products", body: p => p },
      restore_snapshot: { method: "POST", path: () => "/api/products/restore", body: p => p },
      zero_quantities: { method: "POST", path: () => "/api/products/zero-quantities", body: p => p },
    }, true),
    managedTool("aura_manage_batches", "Create, update, delete lots and deduct product stock.", {
      create: { method: "POST", path: p => "/api/products/" + id(p, "productId") + "/batches", body: p => p.data || p },
      update: { method: "PUT", path: p => "/api/batches/" + id(p, "batchId"), body: p => p.data || p },
      delete: { method: "DELETE", path: p => "/api/batches/" + id(p, "batchId") },
      deduct: { method: "POST", path: p => "/api/products/" + id(p, "productId") + "/deduct", body: p => p },
    }, true),
  );

  const controller = new AbortController();
  const trustedAgentOrigins = [
    "https://chatgpt.com",
    "https://chat.openai.com",
  ];

  for (const tool of tools) {
    // Allow ChatGPT/OpenAI WebMCP clients to discover the Aura tools when the
    // browser uses cross-origin model-context discovery. The actual API call
    // still executes in this authenticated Aura page and never exposes tokens.
    await modelContext.registerTool(tool, { signal: controller.signal, exposedTo: trustedAgentOrigins });
  }

  return () => controller.abort();
}
