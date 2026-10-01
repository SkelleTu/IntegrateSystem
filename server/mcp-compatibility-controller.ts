import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { runtimeEvent } from "./runtimeMonitor";

type CompatibilityState = {
  startedAt: string;
  checks: number;
  repairs: number;
  lastCheckAt: string | null;
  lastRepairAt: string | null;
  lastResult: "unknown" | "pass" | "fail";
  lastError: string | null;
  activeProfile: string;
  adaptiveProfile: {
    transport: "streamable-http";
    resourcePath: "/mcp";
    jsonResponse: true;
    bearerHeader: true;
    oauthDiscovery: true;
    protectedResourceMetadata: true;
    protocolVersion: string;
    authChallenge: "required";
    resourceUri: string;
    issuer: string;
  };
};

const RESOURCE = String(
  process.env.AURA_MCP_RESOURCE_URL ??
    process.env.MCP_RESOURCE_URL ??
    "https://integrated-system-gzyu.onrender.com",
).replace(/\/$/, "");

const ISSUER = String(
  process.env.MCP_OAUTH_ISSUER ?? RESOURCE,
).replace(/\/$/, "");

const RESOURCE_CANDIDATES = [
  `${RESOURCE}/mcp`,
  RESOURCE,
  "https://integrated-system-gzyu.onrender.com/mcp",
  "https://integrated-system-gzyu.onrender.com",
].filter((value, index, all) => value && all.indexOf(value) === index);

const PROTOCOL_CANDIDATES = [
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
];

const state: CompatibilityState = {
  startedAt: new Date().toISOString(),
  checks: 0,
  repairs: 0,
  lastCheckAt: null,
  lastRepairAt: null,
  lastResult: "unknown",
  lastError: null,
  activeProfile: "chatgpt-streamable-http-oauth",
  adaptiveProfile: {
    transport: "streamable-http",
    resourcePath: "/mcp",
    jsonResponse: true,
    bearerHeader: true,
    oauthDiscovery: true,
    protectedResourceMetadata: true,
    protocolVersion: "2025-06-18",
    authChallenge: "required",
    resourceUri: `${RESOURCE}/mcp`,
    issuer: ISSUER,
  },
};

function localUrl(path: string) {
  return `http://127.0.0.1:${process.env.PORT || "10000"}${path}`;
}

function signSelfTestToken(resource: string) {
  const secret = String(process.env.MCP_OAUTH_SECRET ?? "");
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: ISSUER,
    aud: resource,
    sub: "mcp-compatibility-controller",
    username: "mcp-compatibility-controller",
    scope: "aura.read aura.execute",
    iat: now,
    exp: now + 300,
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(header + "." + payload)
    .digest("base64url");

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
    bodyPreview: body.slice(0, 1000),
  };
}

function initializeBody(protocolVersion: string, id: string) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: {
        name: "chatgpt-mcp-compatibility-controller",
        version: "2.0.0",
      },
    },
  });
}

async function authenticatedProbe(
  protocolVersion: string,
  resource: string,
  method: "initialize" | "tools/list",
) {
  const token = signSelfTestToken(resource);
  if (!token) throw new Error("MCP_OAUTH_SECRET is missing; authenticated MCP self-test cannot run");

  return probe("/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "MCP-Protocol-Version": protocolVersion,
      authorization: `Bearer ${token}`,
    },
    body: method === "initialize"
      ? initializeBody(protocolVersion, "authenticated-initialize")
      : JSON.stringify({
          jsonrpc: "2.0",
          id: "authenticated-tools-list",
          method: "tools/list",
          params: {},
        }),
  });
}

async function discoverMetadata() {
  const protectedPaths = [
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-protected-resource",
    "/mcp/.well-known/oauth-protected-resource",
  ];

  let protectedResource: Awaited<ReturnType<typeof probe>> | null = null;
  for (const path of protectedPaths) {
    const candidate = await probe(path);
    if (candidate.status === 200) {
      protectedResource = candidate;
      break;
    }
  }

  const authorizationServer = await probe("/.well-known/oauth-authorization-server");

  if (!protectedResource || authorizationServer.status !== 200) {
    throw new Error(
      `OAuth discovery failed: protected-resource=${protectedResource?.status ?? "missing"}, authorization-server=${authorizationServer.status}`,
    );
  }

  let discoveredResource = `${RESOURCE}/mcp`;
  let discoveredIssuer = ISSUER;

  try {
    const json = JSON.parse(protectedResource.bodyPreview);
    if (typeof json.resource === "string" && json.resource) discoveredResource = json.resource.replace(/\/$/, "");
    if (Array.isArray(json.authorization_servers) && typeof json.authorization_servers[0] === "string") {
      discoveredIssuer = json.authorization_servers[0].replace(/\/$/, "");
    }
  } catch {
    // The contract still requires a successful JSON response; the HTTP status is retained for diagnosis.
  }

  try {
    const json = JSON.parse(authorizationServer.bodyPreview);
    if (typeof json.issuer === "string" && json.issuer) discoveredIssuer = json.issuer.replace(/\/$/, "");
  } catch {
    // Keep the protected-resource issuer if the second document is not JSON.
  }

  state.adaptiveProfile.resourceUri = discoveredResource;
  state.adaptiveProfile.issuer = discoveredIssuer;

  return { protectedResource, authorizationServer, discoveredResource, discoveredIssuer };
}

async function checkOnce(reason: string) {
  state.checks += 1;
  state.lastCheckAt = new Date().toISOString();

  try {
    const discovery = await discoverMetadata();

    let lastFailure = "No compatible MCP profile found";

    for (const protocolVersion of PROTOCOL_CANDIDATES) {
      state.adaptiveProfile.protocolVersion = protocolVersion;

      const challenge = await probe("/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "MCP-Protocol-Version": protocolVersion,
        },
        body: initializeBody(protocolVersion, `challenge-${protocolVersion}`),
      });

      const challengeHeader = String(challenge.wwwAuthenticate ?? "");
      const metadataOk = challengeHeader.includes("/.well-known/oauth-protected-resource");

      if (challenge.status !== 401 || !metadataOk) {
        lastFailure = `MCP protection contract failed for ${protocolVersion}: status=${challenge.status}, www-authenticate=${challengeHeader || "missing"}`;
        continue;
      }

      const resourceCandidates = [
        discovery.discoveredResource,
        ...RESOURCE_CANDIDATES,
      ].filter((value, index, all) => value && all.indexOf(value) === index);

      for (const resource of resourceCandidates) {
        state.adaptiveProfile.resourceUri = resource;

        const initialize = await authenticatedProbe(protocolVersion, resource, "initialize");

        if (initialize.status !== 200 || !initialize.bodyPreview.includes('"result"')) {
          lastFailure = `Authenticated initialize failed for resource=${resource}, protocol=${protocolVersion}: status=${initialize.status}, body=${initialize.bodyPreview}`;
          continue;
        }

        const toolsList = await authenticatedProbe(protocolVersion, resource, "tools/list");

        if (toolsList.status !== 200 || !toolsList.bodyPreview.includes('"tools"')) {
          lastFailure = `Authenticated tools/list failed for resource=${resource}, protocol=${protocolVersion}: status=${toolsList.status}, body=${toolsList.bodyPreview}`;
          continue;
        }

        const changedProfile =
          state.adaptiveProfile.protocolVersion !== "2025-06-18" ||
          resource !== `${RESOURCE}/mcp`;

        if (changedProfile) {
          state.repairs += 1;
          state.lastRepairAt = new Date().toISOString();
          runtimeEvent("mcp-compatibility-adapted", "MCP controller selected a compatible runtime profile", {
            phase: "mcp",
            reason,
            protocolVersion,
            resource,
            issuer: discovery.discoveredIssuer,
            repairs: state.repairs,
          });
        }

        state.lastResult = "pass";
        state.lastError = null;

        runtimeEvent("mcp-compatibility-check", "MCP compatibility contract passed", {
          phase: "mcp",
          reason,
          checks: state.checks,
          protectedResourceStatus: discovery.protectedResource.status,
          authorizationServerStatus: discovery.authorizationServer.status,
          initializeWithoutTokenStatus: challenge.status,
          authenticatedInitializeStatus: initialize.status,
          toolsListStatus: toolsList.status,
          adaptiveProfile: state.adaptiveProfile,
        });

        return {
          ok: true,
          state,
          probes: {
            protectedResource: discovery.protectedResource,
            authorizationServer: discovery.authorizationServer,
            challenge,
            initialize,
            toolsList,
          },
        };
      }
    }

    throw new Error(lastFailure);
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
      mode: "self-adaptive-chatgpt-mcp",
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
