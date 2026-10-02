import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { verifyMcpAccessToken } from "./mcp-oauth";

const RESOURCE_URL = String(
  process.env.AURA_MCP_RESOURCE_URL ??
    process.env.MCP_RESOURCE_URL ??
    "https://integrated-system-gzyu.onrender.com",
).replace(/\/$/, "");

const OAUTH_ISSUER = String(
  process.env.MCP_OAUTH_ISSUER ?? "https://integrated-system-gzyu.onrender.com",
).replace(/\/$/, "");

type McpSession = {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  token: string;
  publicConduct: boolean;
};

const sessions = new Map<string, McpSession>();

function bearer(req: Request) {
  return String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
}

function challenge(res: Response, scope: string) {
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource/mcp", scope="${scope}"`,
  );
}

function requireToken(req: Request, res: Response, scope: "aura.read" | "aura.execute") {
  const raw = bearer(req);
  const claims =
    verifyMcpAccessToken(raw, scope, RESOURCE_URL) ||
    verifyMcpAccessToken(raw, scope, `${RESOURCE_URL}/mcp`) ||
    (scope === "aura.read"
      ? verifyMcpAccessToken(raw, "aura.execute", RESOURCE_URL) ||
        verifyMcpAccessToken(raw, "aura.execute", `${RESOURCE_URL}/mcp`)
      : null);

  if (!claims) {
    challenge(res, scope);
    res.status(401).json({
      error: "unauthorized",
      error_description: "A valid OAuth access token is required.",
    });
    return null;
  }

  return claims;
}

async function local(path: string, options: RequestInit = {}) {
  const response = await fetch(
    `http://127.0.0.1:${process.env.PORT || "10000"}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        "X-MCP-Direct-Control": "true",
        ...(options.headers ?? {}),
      },
      signal: options.signal ?? AbortSignal.timeout(30000),
    },
  );

  const text = await response.text();
  let result: unknown = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = { raw: text };
  }

  return { ok: response.ok, status: response.status, result };
}

function result(value: unknown) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

const READ_SECURITY = [{ type: "oauth2" as const, scopes: ["aura.read"] }];
const EXECUTE_SECURITY = [{ type: "oauth2" as const, scopes: ["aura.execute"] }];

function createServer(token: string) {
  const server = new McpServer(
    { name: "aura-system-direct", version: "1.1.0" },
    {
      instructions:
        "Direct ChatGPT control surface for Aura System. Read before mutation. Mutating operations require aura.execute.",
    },
  );

  server.registerTool(
    "get_conduct_status",
    {
      title: "Get Aura Conduct status",
      description: "Return a deterministic public status for MCP Conduct Register verification.",
      inputSchema: {},
      outputSchema: { status: z.literal("aura-system"), version: z.literal("conduct-v1") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => result({ status: "aura-system", version: "conduct-v1" }),
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get Aura profile",
      description: "Return the authenticated Aura profile represented by this OAuth connection.",
      inputSchema: {},
      outputSchema: {
        id: z.string().min(1),
        name: z.string().optional(),
        nickname: z.string().optional(),
      },
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY, "openai/profile": true },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const claims =
        verifyMcpAccessToken(token, "aura.read", RESOURCE_URL) ||
        verifyMcpAccessToken(token, "aura.read", `${RESOURCE_URL}/mcp`) ||
        verifyMcpAccessToken(token, "aura.execute", RESOURCE_URL) ||
        verifyMcpAccessToken(token, "aura.execute", `${RESOURCE_URL}/mcp`);
      if (!claims) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Authentication required." }],
          _meta: {
            "mcp/www_authenticate": [
              `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource/mcp", error="invalid_token", error_description="A valid Aura OAuth token is required."`,
            ],
          },
        };
      }
      const profile = {
        id: String(claims.sub),
        ...(claims.username ? { name: String(claims.username), nickname: String(claims.username) } : {}),
      };
      return {
        structuredContent: profile,
        content: [{ type: "text" as const, text: JSON.stringify(profile) }],
      };
    },
  );

  server.registerTool(
    "get_runtime_status",
    {
      title: "Get Aura runtime status",
      description: "Read runtime health, telemetry and current server state.",
      inputSchema: {},
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => result(await local("/api/runtime/status")),
  );

  server.registerTool(
    "get_database_status",
    {
      title: "Get Aura database status",
      description: "Read the active database backend and last recorded action.",
      inputSchema: {},
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => result(await local("/api/db/status")),
  );

  server.registerTool(
    "get_universal_status",
    {
      title: "Get Universal Server status",
      description: "Read Aura's direct connectivity status to Universal Server.",
      inputSchema: {},
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => result(await local("/api/universal/status")),
  );

  server.registerTool(
    "get_google_drive_status",
    {
      title: "Get Google Drive status",
      description: "Read the configured Google Drive backup status.",
      inputSchema: {},
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => result(await local("/api/google-drive/status")),
  );

  server.registerTool(
    "read_api",
    {
      title: "Read Aura API",
      description: "Directly read any Aura /api GET endpoint.",
      inputSchema: { path: z.string().regex(/^\/api(?:\/|$)/) },
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ path }) =>
      result(
        await local(path, {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
  );

  server.registerTool(
    "execute_api",
    {
      title: "Execute Aura API",
      description:
        "Directly invoke any Aura /api endpoint with an HTTP method and JSON body. Mutating operations require aura.execute.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().regex(/^\/api(?:\/|$)/),
        body: z.record(z.unknown()).optional().default({}),
      },
      securitySchemes: EXECUTE_SECURITY,
      _meta: { securitySchemes: EXECUTE_SECURITY },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ method, path, body }) => {
      const claims =
        verifyMcpAccessToken(token, "aura.execute", RESOURCE_URL) ||
        verifyMcpAccessToken(token, "aura.execute", `${RESOURCE_URL}/mcp`);

      if (!claims) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "aura.execute scope is required." }],
          _meta: {
            "mcp/www_authenticate": [
              `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource/mcp", error="insufficient_scope", error_description="The aura.execute scope is required."`,
            ],
          },
        };
      }

      return result(
        await local(path, {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body:
            method === "GET" || method === "DELETE"
              ? undefined
              : JSON.stringify(body ?? {}),
        }),
      );
    },
  );

  server.registerTool(
    "get_aura_capabilities",
    {
      title: "Get Aura complete capabilities",
      description: "Return the production API capability inventory. Use read_api or execute_api for the listed operations.",
      inputSchema: {},
      securitySchemes: READ_SECURITY,
      _meta: { securitySchemes: READ_SECURITY },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => result({
      service: "Aura System",
      production: true,
      controlSurface: "MCP",
      scopes: ["aura.read", "aura.execute"],
      tools: ["get_conduct_status", "get_profile", "get_runtime_status", "get_database_status", "get_universal_status", "get_google_drive_status", "get_aura_capabilities", "read_api", "execute_api"],
      apiEndpoints: ["POST /api/labels/print","GET /api/labels/status","GET /api/db/status","GET /api/inventory/search","GET /api/menu/search","GET /api/admin/monitoring","DELETE /api/admin/users/:id","POST /api/admin/register-barber","GET /api/my-enterprises","POST /api/my-enterprises","PUT /api/my-enterprises/:id/select","GET /api/admin/enterprises","POST /api/admin/enterprises","PUT /api/admin/enterprises/:id","PUT /api/admin/enterprises/:id/status","DELETE /api/admin/enterprises/:id","GET /api/settings","POST /api/settings","POST /api/public/upload","POST /api/admin/upload","GET /api/download/app","GET /api/windows/stream","GET /api/fiscal/settings","POST /api/fiscal/settings","GET /api/fiscal/logs","POST /api/fiscal/emitir/:saleId","GET /api/fiscal/history","GET /api/categories","POST /api/inventory","GET /api/inventory","GET /api/inventory/barcode/:barcode","DELETE /api/inventory/:id","POST /api/inventory/:id/restock","GET /api/inventory/:id/restocks","GET /api/inventory-restocks","GET /api/products","GET /api/products/cashier-items","GET /api/products/barcode/:barcode","GET /api/products/sku/:sku","GET /api/products/:id","POST /api/products/swap-codigo","POST /api/products/check-duplicate","POST /api/products","PUT /api/products/:id","DELETE /api/products","GET /api/products/snapshot","POST /api/products/restore","POST /api/products/zero-quantities","DELETE /api/products/:id","GET /api/products/:id/batches","POST /api/products/:id/batches","PUT /api/batches/:id","DELETE /api/batches/:id","POST /api/products/:id/deduct","GET /api/products/:id/logs","GET /api/menu-items","PATCH /api/menu-items/:id/adjust","GET /api/cash-register/open","POST /api/cash-register/open","POST /api/cash-register/adjust","POST /api/cash-register/close","POST /api/sales","GET /api/cash-registers/history","GET /api/sales","POST /api/sales/:id/cancel","POST /api/sales/:id/emit-fiscal","GET /api/transactions","POST /api/transactions","DELETE /api/transactions/:id","POST /api/inventory/log","POST /api/tickets/:id/items","GET /api/time-clock/history","GET /api/admin/time-clock/history/:userId","GET /api/time-clock/status","POST /api/time-clock/register","POST /api/auth/register-fingerprint","GET /api/tickets/:number","GET /api/backup/status","GET /api/backup/export","POST /api/backup/save","GET /api/backup/list","GET /api/backup/download/:filename","POST /api/backup/import","POST /api/backup/restore/:filename","POST /api/backup/restore-auto"],
      totalApiOperations: 85,
      note: "execute_api is the universal authenticated execution surface for Aura /api endpoints; aura.execute is required for mutations.",
    }),
  );

  return server;
}

function isInitializeRequest(req: Request) {
  const body = req.body;
  return Boolean(
    body &&
      !Array.isArray(body) &&
      typeof body === "object" &&
      body.method === "initialize",
  );
}

function closeSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  void session.transport.close().catch(() => {});
  void session.server.close().catch(() => {});
}

export function registerAuraDirectMcp(app: Express) {
  app.get("/.well-known/agent-card.json", (_req, res) => {
    res.json({
      name: "Aura System",
      description: "Universal integration and automation MCP server for Aura System.",
      url: RESOURCE_URL,
      capabilities: {
        extensions: [{
          uri: "https://w3id.org/horizonshield/conduct/v1",
          params: {
            compensation: {
              paid_by: "public",
              referral_fee: false,
              listing_fee: false,
              success_fee_pct: 0,
              disclosure_url: `${RESOURCE_URL}/conduct`,
            },
          },
        }],
      },
      compensation: {
        paid_by: "public",
        referral_fee: false,
        listing_fee: false,
        success_fee_pct: 0,
        disclosure_url: `${RESOURCE_URL}/conduct`,
      },
    });
  });

  app.get("/.well-known/mcp-conduct.json", (_req, res) => {
    res.json({
      allow_tool_call: true,
      endpoints: [`${RESOURCE_URL}/mcp`],
      identity: RESOURCE_URL,
    });
  });

  app.get("/conduct", (_req, res) => {
    res.json({
      service: "Aura System",
      compensation: { paid_by: "public", referral_fee: false, listing_fee: false, success_fee_pct: 0 },
      note: "Public disclosure for MCP Conduct Register.",
    });
  });

  app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
    res.json({
      resource: `${RESOURCE_URL}/mcp`,
      authorization_servers: [OAUTH_ISSUER],
      scopes_supported: ["aura.read", "aura.execute"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${RESOURCE_URL}/mcp`,
    });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);

    const rawToken = bearer(req);
    const sessionId = String(req.headers["mcp-session-id"] ?? "").trim();
    const isPublicInitialize = req.method === "POST" && !sessionId && isInitializeRequest(req) && !rawToken;
    const conductMethod = Array.isArray(req.body) ? req.body[0]?.method : req.body?.method;
    const conductId = Array.isArray(req.body) ? req.body[0]?.id : req.body?.id;
    const isPublicConductRequest = req.method === "POST" && !rawToken && (conductMethod === "tools/list" || conductMethod === "tools/call");
    if (!isPublicConductRequest && !isPublicInitialize && !sessionId.startsWith("conduct-")) {
      const claims = requireToken(req, res, "aura.read");
      if (!claims) return;
    }

    if (req.method === "POST" && !sessionId && isInitializeRequest(req) && !rawToken) {
      const publicSessionId = `conduct-${crypto.randomUUID()}`;
      res.setHeader("MCP-Session-Id", publicSessionId);
      return res.status(200).json({
        jsonrpc: "2.0",
        id: conductId ?? null,
        result: {
          protocolVersion: String(req.body?.params?.protocolVersion ?? "2025-06-18"),
          capabilities: { tools: {} },
          serverInfo: { name: "Aura System", version: "1.1.0" },
          instructions: "Public conformance surface for MCP Conduct Register.",
        },
      });
    }

    if (req.method === "POST" && !sessionId && isInitializeRequest(req)) {
      const token = bearer(req);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true,
      });
      const server = createServer(token);
      const session: McpSession = { transport, server, token, publicConduct: !token };

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id) sessions.delete(id);
        void server.close().catch(() => {});
      };

      transport.onerror = (error) => {
        console.error("[MCP] transport error", error);
      };

      transport.onsessioninitialized = (id) => {
        sessions.set(id, session);
      };

      await server.connect(transport);

      try {
        await transport.handleRequest(req, res, req.body);
        const initializedSessionId = transport.sessionId;
        if (initializedSessionId) {
          sessions.set(initializedSessionId, session);
        }
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            error: "mcp_request_failed",
            message: error instanceof Error ? error.message : "MCP request failed",
            requestId: crypto.randomUUID(),
          });
        }
      }
      return;
    }

    // MCP Conduct Register may probe a read-only public conformance surface
    // statelessly after initialize. Keep this surface independent of OAuth
    // session state so tools/list and the deterministic status tool remain
    // publicly inspectable as documented.
    if (isPublicConductRequest && !sessionId) {
      if (req.method === "POST" && conductMethod === "tools/list") {
        return res.status(200).json({
          jsonrpc: "2.0",
          id: conductId ?? null,
          result: {
            tools: [{
              name: "get_conduct_status",
              description: "Return a deterministic public status for MCP Conduct Register verification.",
              inputSchema: { type: "object", properties: {}, additionalProperties: false },
              outputSchema: {
                type: "object",
                properties: {
                  status: { type: "string", const: "aura-system" },
                  version: { type: "string", const: "conduct-v1" },
                },
                required: ["status", "version"],
                additionalProperties: false,
              },
            }],
          },
        });
      }

      if (
        req.method === "POST" &&
        conductMethod === "tools/call" &&
        (Array.isArray(req.body) ? req.body[0]?.params?.name : req.body?.params?.name) === "get_conduct_status"
      ) {
        return res.status(200).json({
          jsonrpc: "2.0",
          id: conductId ?? null,
          result: {
            structuredContent: { status: "aura-system", version: "conduct-v1" },
            content: [{ type: "text", text: JSON.stringify({ status: "aura-system", version: "conduct-v1" }) }],
          },
        });
      }
    }

    if (!sessionId) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: MCP-Session-Id is required after initialization.",
        },
        id: null,
      });
    }

    if (sessionId.startsWith("conduct-")) {
      if (req.method === "POST" && conductMethod === "tools/list") {
        return res.status(200).json({
          jsonrpc: "2.0",
          id: conductId ?? null,
          result: {
            tools: [{
              name: "get_conduct_status",
              description: "Return a deterministic public status for MCP Conduct Register verification.",
              inputSchema: { type: "object", properties: {}, additionalProperties: false },
              outputSchema: {
                type: "object",
                properties: { status: { type: "string", const: "aura-system" }, version: { type: "string", const: "conduct-v1" } },
                required: ["status", "version"],
                additionalProperties: false,
              },
            }],
          },
        });
      }
      if (req.method === "POST" && conductMethod === "tools/call" && (Array.isArray(req.body) ? req.body[0]?.params?.name : req.body?.params?.name) === "get_conduct_status") {
        return res.status(200).json({
          jsonrpc: "2.0",
          id: conductId ?? null,
          result: {
            structuredContent: { status: "aura-system", version: "conduct-v1" },
            content: [{ type: "text", text: JSON.stringify({ status: "aura-system", version: "conduct-v1" }) }],
          },
        });
      }
      if (req.method === "DELETE") return res.status(200).json({ ok: true });
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not supported on public conformance surface." },
        id: req.body?.id ?? null,
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Session not found. Start a new MCP initialize request.",
        },
        id: null,
      });
    }

    const sessionClaims = session.publicConduct
      ? { sub: "conduct-public" }
      : verifyMcpAccessToken(session.token, "aura.read", RESOURCE_URL) ||
        verifyMcpAccessToken(session.token, "aura.read", `${RESOURCE_URL}/mcp`);

    if (!sessionClaims) {
      closeSession(sessionId);
      challenge(res, "aura.read");
      return res.status(401).json({
        error: "unauthorized",
        error_description: "The MCP access token is no longer valid.",
      });
    }

    if (session.publicConduct) {
      if (req.method === "POST" && req.body?.method === "tools/call" && req.body?.params?.name !== "get_conduct_status") {
        return res.status(403).json({ jsonrpc: "2.0", error: { code: -32003, message: "Authentication is required for this tool." }, id: req.body?.id ?? null });
      }
    }

    if (req.method === "DELETE") {
      closeSession(sessionId);
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST" && req.method !== "GET") {
      res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
      return res.status(405).json({ error: "method_not_allowed" });
    }

    try {
      await session.transport.handleRequest(req, res, req.method === "POST" ? req.body : undefined);
    } catch (error) {
      console.error("[MCP] request failed", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "mcp_request_failed",
          message: error instanceof Error ? error.message : "MCP request failed",
          requestId: crypto.randomUUID(),
        });
      }
    }
  });
}
