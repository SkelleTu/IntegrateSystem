import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
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
    protocolVersion: string;
    authChallenge: "required";
  };
};

const RESOURCE = String(
  process.env.AURA_MCP_RESOURCE_URL ??
    process.env.MCP_RESOURCE_URL ??
    "https://integrated-system-gzyu.onrender.com",
).replace(/\/$/, "");

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
    protocolVersion: "2025-06-18",
    authChallenge: "required",
  },
};

function localUrl(path: string) {
  return `http://127.0.0.1:${process.env.PORT || "5010"}${path}`;
}

function signSelfTestToken() {
  const secret = String(process.env.MCP_OAUTH_SECRET ?? "");
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: RESOURCE,
    aud: RESOURCE,
    sub: "mcp-compatibility-controller",
    username: "mcp-compatibility-controller",
    scope: "aura.read aura.execute",
    iat: now,
    exp: now + 300,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
  return header + "." + payload + "." + signature;
}

async function probe(path: string, options: RequestInit = {}) {
  const response = await fetch(localUrl(path), {
    ...options,
    headers: {
      Accept: "application/json, text/event-stream",
      ...(options.headers ?? {}),
    },
    signal: options.signal ?? AbortSignal.timeout(5000),
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

async function checkOnce(reason: string) {
  state.checks += 1;
  state.lastCheckAt = new Date().toISOString();

  try {
    const protectedResource = await probe("/.well-known/oauth-protected-resource/mcp");
    const authorizationServer = await probe("/.well-known/oauth-authorization-server");

    if (protectedResource.status !== 200 || authorizationServer.status !== 200) {
      throw new Error(
        `OAuth discovery failed: protected-resource=${protectedResource.status}, authorization-server=${authorizationServer.status}`,
      );
    }

    const selfTestToken = signSelfTestToken();
    if (!selfTestToken) throw new Error("MCP_OAUTH_SECRET is missing; authenticated MCP self-test cannot run");

    const challenge = await probe("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "MCP-Protocol-Version": state.adaptiveProfile.protocolVersion,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "compatibility-probe",
        method: "initialize",
        params: {
          protocolVersion: state.adaptiveProfile.protocolVersion,
          capabilities: {},
          clientInfo: {
            name: "aura-mcp-compatibility-controller",
            version: "1.1.0",
          },
        },
      }),
    });

    const challengeHeader = String(challenge.wwwAuthenticate ?? "");
    const metadataOk = challengeHeader.includes(
      "/.well-known/oauth-protected-resource/mcp",
    );

    if (challenge.status !== 401 || !metadataOk) {
      throw new Error(
        `MCP protection contract failed: status=${challenge.status}, www-authenticate=${challengeHeader || "missing"}`,
      );
    }

    const authenticatedInitialize = await probe("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "MCP-Protocol-Version": state.adaptiveProfile.protocolVersion,
        authorization: `Bearer ${selfTestToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "authenticated-initialize",
        method: "initialize",
        params: {
          protocolVersion: state.adaptiveProfile.protocolVersion,
          capabilities: {},
          clientInfo: { name: "chatgpt-mcp-compatibility-self-test", version: "1.0.0" },
        },
      }),
    });

    if (authenticatedInitialize.status !== 200 || !authenticatedInitialize.bodyPreview.includes('"result"')) {
      throw new Error(`Authenticated MCP initialize failed: status=${authenticatedInitialize.status}, body=${authenticatedInitialize.bodyPreview}`);
    }

    const toolsList = await probe("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "MCP-Protocol-Version": state.adaptiveProfile.protocolVersion,
        authorization: `Bearer ${selfTestToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "authenticated-tools-list",
        method: "tools/list",
        params: {},
      }),
    });

    if (toolsList.status !== 200 || !toolsList.bodyPreview.includes('"tools"')) {
      throw new Error(`Authenticated MCP tools/list failed: status=${toolsList.status}, body=${toolsList.bodyPreview}`);
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
      authenticatedInitializeStatus: authenticatedInitialize.status,
      toolsListStatus: toolsList.status,
      adaptiveProfile: state.adaptiveProfile,
    });

    return {
      ok: true,
      state,
      probes: { protectedResource, authorizationServer, challenge },
    };
  } catch (error) {
    state.lastResult = "fail";
    state.lastError = error instanceof Error ? error.message : String(error);

    runtimeEvent("mcp-compatibility-check-failed", state.lastError, {
      phase: "mcp",
      reason,
      checks: state.checks,
      adaptiveProfile: state.adaptiveProfile,
    });

    return { ok: false, state };
  }
}

let loopStarted = false;

export async function runMcpCompatibilityCheck(reason = "manual") {
  return checkOnce(reason);
}

export function startMcpCompatibilityLoop() {
  if (loopStarted) return;
  loopStarted = true;

  const intervalMs = Math.max(
    30_000,
    Number(process.env.MCP_COMPATIBILITY_INTERVAL_MS ?? 300_000),
  );

  const run = async (reason: string) => {
    const result = await checkOnce(reason);
    if (!result.ok) {
      setTimeout(() => void checkOnce("automatic-retry"), 15_000);
    }
  };

  void run("server-listening");

  setInterval(() => {
    void run("scheduled");
  }, intervalMs).unref();
}

export function registerMcpCompatibilityController(app: Express) {
  app.get("/api/mcp/compatibility/status", (_req: Request, res: Response) => {
    res.json({
      ok: state.lastResult === "pass",
      controller: "active",
      resource: RESOURCE,
      ...state,
    });
  });

  app.post("/api/mcp/compatibility/check", async (req: Request, res: Response) => {
    const result = await runMcpCompatibilityCheck(
      typeof req.body?.reason === "string" ? req.body.reason.slice(0, 100) : "api",
    );
    res.status(result.ok ? 200 : 503).json(result);
  });
}
