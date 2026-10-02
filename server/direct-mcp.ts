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
    { name: "aura-system-direct", version: "1.0.3" },
    {
      instructions:
        "Direct ChatGPT control surface for Aura System. Read before mutation. Mutating operations require aura.execute.",
    },
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

    const claims = requireToken(req, res, "aura.read");
    if (!claims) return;

    const sessionId = String(req.headers["mcp-session-id"] ?? "").trim();

    if (req.method === "POST" && !sessionId && isInitializeRequest(req)) {
      const token = bearer(req);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true,
      });
      const server = createServer(token);
      const session: McpSession = { transport, server, token };

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

    const sessionClaims =
      verifyMcpAccessToken(session.token, "aura.read", RESOURCE_URL) ||
      verifyMcpAccessToken(session.token, "aura.read", `${RESOURCE_URL}/mcp`);

    if (!sessionClaims) {
      closeSession(sessionId);
      challenge(res, "aura.read");
      return res.status(401).json({
        error: "unauthorized",
        error_description: "The MCP access token is no longer valid.",
      });
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
