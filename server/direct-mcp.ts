import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { verifyMcpAccessToken } from "./mcp-oauth";

const RESOURCE_URL = String(process.env.AURA_MCP_RESOURCE_URL ?? process.env.MCP_RESOURCE_URL ?? "https://integrated-system-gzyu.onrender.com").replace(/\/$/, "");
const OAUTH_ISSUER = String(process.env.MCP_OAUTH_ISSUER ?? "https://integrated-system-gzyu.onrender.com").replace(/\/$/, "");

function bearer(req: Request) {
  return String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
}

function challenge(res: Response, scope: string) {
  res.setHeader("WWW-Authenticate", `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource", scope="${scope}"`);
}

function requireToken(req: Request, res: Response, scope: "aura.read" | "aura.execute") {
  const raw = bearer(req);
  const claims = verifyMcpAccessToken(raw, scope, RESOURCE_URL) || verifyMcpAccessToken(raw, scope, `${RESOURCE_URL}/mcp`) || (scope === "aura.read" ? verifyMcpAccessToken(raw, "aura.execute", RESOURCE_URL) || verifyMcpAccessToken(raw, "aura.execute", `${RESOURCE_URL}/mcp`) : null);
  if (!claims) {
    challenge(res, scope);
    res.status(401).json({ error: "unauthorized", error_description: "A valid OAuth access token is required." });
    return null;
  }
  return claims;
}

async function local(path: string, options: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT || "5010"}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "X-MCP-Direct-Control": "true",
      ...(options.headers ?? {}),
    },
    signal: options.signal ?? AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let result: unknown = null;
  try { result = text ? JSON.parse(text) : null; } catch { result = { raw: text }; }
  return { ok: response.ok, status: response.status, result };
}

function result(value: unknown) {
  return { structuredContent: value, content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function createServer(token: string) {
  const server = new McpServer(
    { name: "aura-system-direct", version: "1.0.0" },
    { instructions: "Direct ChatGPT control surface for Aura System. Read before mutation. Mutating operations require aura.execute." },
  );

  server.registerTool("get_runtime_status", {
    title: "Get Aura runtime status",
    description: "Read runtime health, telemetry and current server state.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => result(await local("/api/runtime/status")));

  server.registerTool("get_database_status", {
    title: "Get Aura database status",
    description: "Read the active database backend and last recorded action.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => result(await local("/api/db/status")));

  server.registerTool("get_universal_status", {
    title: "Get Universal Server status",
    description: "Read Aura's direct connectivity status to Universal Server.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => result(await local("/api/universal/status")));

  server.registerTool("get_google_drive_status", {
    title: "Get Google Drive status",
    description: "Read the configured Google Drive backup status.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async () => result(await local("/api/google-drive/status")));

  server.registerTool("read_api", {
    title: "Read Aura API",
    description: "Directly read any Aura /api GET endpoint. This bypasses Universal as a command gateway.",
    inputSchema: { path: z.string().regex(/^\/api(?:\/|$)/) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ path }) => result(await local(path, {
    headers: { authorization: `Bearer ${token}` },
  })));

  server.registerTool("execute_api", {
    title: "Execute Aura API",
    description: "Directly invoke any Aura /api endpoint with an HTTP method and JSON body. This is the full mutation surface and may change system state.",
    inputSchema: {
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      path: z.string().regex(/^\/api(?:\/|$)/),
      body: z.record(z.unknown()).optional().default({}),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, async ({ method, path, body }) => {
    const claims = verifyMcpAccessToken(token, "aura.execute", RESOURCE_URL) || verifyMcpAccessToken(token, "aura.execute", `${RESOURCE_URL}/mcp`);
    if (!claims) return { isError: true, content: [{ type: "text" as const, text: "aura.execute scope is required." }] };
    return result(await local(path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
    }));
  });

  return server;
}

export function registerAuraDirectMcp(app: Express) {
  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: RESOURCE_URL,
      authorization_servers: [OAUTH_ISSUER],
      scopes_supported: ["aura.read", "aura.execute"],
      bearer_methods_supported: ["header"],
      resource_documentation: RESOURCE_URL + "/mcp",
    });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS");
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const claims = requireToken(req, res, "aura.read");
    if (!claims) return;

    const server = createServer(bearer(req));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "mcp_request_failed",
          message: error instanceof Error ? error.message : "MCP request failed",
          requestId: crypto.randomUUID(),
        });
      }
    } finally {
      try { await transport.close(); } catch {}
      try { await server.close(); } catch {}
    }
  });
}
