import type { Express, Request, Response } from "express";
import { runtimeEvent } from "./runtimeMonitor";

type CompatibilityState = {
  startedAt: string;
  checks: number;
  lastCheckAt: string | null;
  lastResult: "unknown" | "pass" | "fail";
  lastError: string | null;
  adaptiveProfile: {
    transport: "streamable-http";
    resourcePath: "/mcp";
    jsonResponse: true;
    bearerHeader: true;
    oauthDiscovery: true;
    protectedResourceMetadata: true;
  };
};

const RESOURCE = String(process.env.AURA_MCP_RESOURCE_URL ?? process.env.MCP_RESOURCE_URL ?? "https://integrated-system-gzyu.onrender.com").replace(/\/$/, "");

const state: CompatibilityState = {
  startedAt: new Date().toISOString(),
  checks: 0,
  lastCheckAt: null,
  lastResult: "unknown",
  lastError: null,
  adaptiveProfile: {
    transport: "streamable-http",
    resourcePath: "/mcp",
    jsonResponse: true,
    bearerHeader: true,
    oauthDiscovery: true,
    protectedResourceMetadata: true,
  },
};

function localUrl(path: string) {
  return `http://127.0.0.1:${process.env.PORT || "5010"}${path}`;
}

async function probe(path: string, options: RequestInit = {}) {
  const response = await fetch(localUrl(path), {
    ...options,
    headers: { Accept: "application/json", ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.text();
  return {
    path,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type"),
    wwwAuthenticate: response.headers.get("www-authenticate"),
    bodyPreview: body.slice(0, 500),
  };
}

export async function runMcpCompatibilityCheck(reason = "manual") {
  state.checks += 1;
  state.lastCheckAt = new Date().toISOString();

  try {
    const protectedResource = await probe("/.well-known/oauth-protected-resource/mcp");
    const authorizationServer = await probe("/.well-known/oauth-authorization-server");

    if (protectedResource.status !== 200 || authorizationServer.status !== 200) {
      throw new Error(`OAuth discovery failed: protected-resource=${protectedResource.status}, authorization-server=${authorizationServer.status}`);
    }

    const challenge = await probe("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-06-18",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "compatibility-probe",
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "aura-mcp-compatibility-controller", version: "1.0.0" },
        },
      }),
    });

    if (challenge.status !== 401 || !String(challenge.wwwAuthenticate ?? "").includes("/.well-known/oauth-protected-resource/mcp")) {
      throw new Error(`MCP protection contract failed: status=${challenge.status}, www-authenticate=${challenge.wwwAuthenticate ?? "missing"}`);
    }

    state.lastResult = "pass";
    state.lastError = null;
    runtimeEvent("mcp-compatibility-check", "MCP compatibility contract passed", {
      phase: "mcp",
      reason,
      checks: state.checks,
      protectedResourceStatus: protectedResource.status,
      authorizationServerStatus: authorizationServer.status,
      initializeWithoutTokenStatus: challenge.status,
      adaptiveProfile: state.adaptiveProfile,
    });

    return { ok: true, state, probes: { protectedResource, authorizationServer, challenge } };
  } catch (error) {
    state.lastResult = "fail";
    state.lastError = error instanceof Error ? error.message : String(error);
    runtimeEvent("mcp-compatibility-check-failed", state.lastError, { phase: "mcp", reason, checks: state.checks });
    return { ok: false, state };
  }
}

export function registerMcpCompatibilityController(app: Express) {
  app.get("/api/mcp/compatibility/status", (_req: Request, res: Response) => {
    res.json({ ok: state.lastResult === "pass", controller: "active", resource: RESOURCE, ...state });
  });

  app.post("/api/mcp/compatibility/check", async (req: Request, res: Response) => {
    const result = await runMcpCompatibilityCheck(typeof req.body?.reason === "string" ? req.body.reason.slice(0, 100) : "api");
    res.status(result.ok ? 200 : 503).json(result);
  });
}
