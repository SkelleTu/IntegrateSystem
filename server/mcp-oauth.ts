import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";

const ISSUER = String(process.env.MCP_OAUTH_ISSUER ?? "https://integrated-system-1c86.onrender.com").replace(/\/$/, "");
const RESOURCE = String(process.env.AURA_MCP_RESOURCE_URL ?? process.env.MCP_RESOURCE_URL ?? "https://integrated-system-1c86.onrender.com").replace(/\/$/, "");
const MCP_RESOURCE = `${RESOURCE}/mcp`;
const RESOURCE_ALLOWLIST = new Set(
  String(process.env.MCP_RESOURCE_URLS ?? [
    RESOURCE,
    `${RESOURCE}/mcp`,
    "https://integrated-system-1c86.onrender.com",
    "https://integrated-system-1c86.onrender.com/mcp",
    "https://aurora-agent-o9x5.onrender.com",
  ].join(",")).split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean),
);
const SECRET = String(process.env.MCP_OAUTH_SECRET ?? "");
const CLIENT_ID = String(process.env.MCP_OAUTH_CLIENT_ID ?? "https://chatgpt.com/oauth/client.json");
const codeStore = new Map<string, {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  username: string;
  userId: string;
  scope: string;
  resource: string;
  expiresAt: number;
}>();

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>): string {
  if (!SECRET) throw new Error("MCP_OAUTH_SECRET is not configured");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = b64url(crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}

function timingEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function hashPassword(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 64);
}

function comparePassword(stored: string, supplied: string): boolean {
  const [hashHex, salt] = String(stored ?? "").split(".");
  if (!hashHex || !salt) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = hashPassword(supplied, salt);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function validClient(clientId: string): boolean {
  return clientId === CLIENT_ID
    || clientId === "https://chatgpt.com/oauth/client.json"
    || /^https:\/\/chatgpt\.com\/oauth\/[^\s]+$/.test(clientId);
}

function validRedirect(uri: string): boolean {
  return uri === "https://chatgpt.com/connector_platform_oauth_redirect"
    || /^https:\/\/chatgpt\.com\/connector\/oauth\/[^\s]+$/.test(uri)
    || /^https:\/\/chatgpt\.com\/oauth\/[^\s]+$/.test(uri);
}

type CimdDocument = {
  client_id?: string;
  redirect_uris?: string[];
  response_types?: string[];
};

async function fetchCimdDocument(clientId: string): Promise<CimdDocument | null> {
  if (clientId !== "https://chatgpt.com/oauth/client.json") return null;
  try {
    const response = await fetch(clientId, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const document = await response.json() as CimdDocument;
    if (document.client_id !== clientId) return null;
    if (!Array.isArray(document.redirect_uris) || !document.redirect_uris.includes("https://chatgpt.com/connector_platform_oauth_redirect")) return null;
    if (!Array.isArray(document.response_types) || !document.response_types.includes("code")) return null;
    return document;
  } catch {
    return null;
  }
}

async function validClientForRequest(clientId: string, redirectUri: string): Promise<boolean> {
  if (clientId !== "https://chatgpt.com/oauth/client.json") return validClient(clientId);
  const document = await fetchCimdDocument(clientId);
  return Boolean(document?.redirect_uris?.includes(redirectUri));
}

async function resolveMasterUser() {
  const explicitId = String(process.env.MCP_MASTER_USER_ID || process.env.AURA_MCP_MASTER_USER_ID || "").trim();
  if (explicitId) {
    const user = await storage.getUser(Number(explicitId));
    if (user && ["admin", "owner"].includes(String((user as any).role).toLowerCase())) return user;
  }
  const explicitUsername = String(
    process.env.MCP_MASTER_USERNAME ||
    process.env.AURA_MCP_MASTER_USERNAME ||
    process.env.AURA_AGENT_OPERATOR_USERNAME ||
    ""
  ).trim();
  if (explicitUsername) {
    const user = await storage.getUserByUsername(explicitUsername);
    if (user && ["admin", "owner"].includes(String((user as any).role).toLowerCase())) return user;
  }
  const users = await storage.getUsers();
  const privileged = users.filter((user: any) => ["admin", "owner"].includes(String(user.role).toLowerCase()));
  const owners = privileged.filter((user: any) => String(user.role).toLowerCase() === "owner");
  if (owners.length === 1) return owners[0];
  if (privileged.length === 1) return privileged[0];
  throw new Error("MCP master identity is ambiguous; configure MCP_MASTER_USER_ID or MCP_MASTER_USERNAME.");
}

function mintAuthorizationCode(args: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  user: any;
  scope: string;
  resource: string;
}) {
  const code = crypto.randomBytes(32).toString("base64url");
  codeStore.set(code, {
    clientId: args.clientId,
    redirectUri: args.redirectUri,
    codeChallenge: args.codeChallenge,
    username: String(args.user.username ?? ""),
    userId: String(args.user.id ?? ""),
    scope: args.scope,
    resource: args.resource,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return code;
}

function cleanScopes(value: string): string[] {
  const allowed = new Set(["aura.read", "aura.execute"]);
  return [...new Set(String(value || "aura.read").split(/\s+/).filter((scope) => allowed.has(scope)))];
}

function errorRedirect(res: Response, redirectUri: string, state: string | undefined, error: string, description: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  url.searchParams.set("iss", ISSUER);
  if (state) url.searchParams.set("state", state);
  res.redirect(302, url.toString());
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}


export function verifyMcpAccessToken(raw: string, requiredScope: string, resource = String(process.env.AURA_MCP_RESOURCE_URL ?? process.env.MCP_RESOURCE_URL ?? "https://integrated-system-1c86.onrender.com").replace(/\/$/, "")) {
  if (!SECRET) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  let header: any, payload: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch { return null; }
  const signature = b64url(crypto.createHmac("sha256", SECRET).update(`${parts[0]}.${parts[1]}`).digest());
  const now = Math.floor(Date.now() / 1000);
  const scopes = String(payload.scope ?? "").split(/\s+/).filter(Boolean);
  if (
    header?.alg !== "HS256" ||
    header?.typ !== "JWT" ||
    !timingEqual(signature, parts[2]) ||
    payload.iss !== ISSUER ||
    !new Set([resource, `${resource}/mcp`]).has(String(payload.aud ?? "").replace(/\/$/, "")) ||
    !payload.sub ||
    Number(payload.exp) <= now ||
    Number(payload.iat) > now + 120 ||
    !scopes.includes(requiredScope)
  ) return null;
  return payload as { sub: string; username?: string; scope?: string; aud: string; iss: string; exp: number; iat: number };
}

export function registerMcpOAuth(app: Express) {
  const protectedResourceMetadata = (_req: Request, res: Response) => {
    res.json({
      resource: MCP_RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: ["aura.read", "aura.execute"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${RESOURCE}/mcp`,
    });
  };

  app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceMetadata);
  app.get("/mcp/.well-known/oauth-protected-resource", protectedResourceMetadata);

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: ISSUER,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      response_types_supported: ["code"],
      refresh_token_grant_supported: true,
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["aura.read", "aura.execute"],
    });
  });

  app.get("/oauth/authorize", async (req: Request, res: Response) => {
    const clientId = String(req.query.client_id ?? "");
    const redirectUri = String(req.query.redirect_uri ?? "");
    const responseType = String(req.query.response_type ?? "");
    const codeChallenge = String(req.query.code_challenge ?? "");
    const codeChallengeMethod = String(req.query.code_challenge_method ?? "");
    const state = String(req.query.state ?? "");
    const resource = String(req.query.resource ?? "");
    const scopes = cleanScopes(String(req.query.scope ?? "aura.read"));

    if (!SECRET) return res.status(503).send("MCP OAuth is not configured.");
    if (!(await validClientForRequest(clientId, redirectUri))) return res.status(400).send("Unsupported OAuth client.");
    if (!validRedirect(redirectUri)) return res.status(400).send("Unsupported redirect URI.");
    if (responseType !== "code") return res.status(400).send("Only response_type=code is supported.");
    if (codeChallengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) return res.status(400).send("PKCE S256 code challenge is required.");
    if (!RESOURCE_ALLOWLIST.has(resource) && resource !== MCP_RESOURCE) return res.status(400).send("Invalid resource.");

    const actionScope = scopes.includes("aura.execute");
    const scopeText = scopes.join(" ");

    if (String(process.env.MCP_MASTER_AUTO_AUTHORIZE || "").toLowerCase() === "true" &&
        clientId === "https://chatgpt.com/oauth/client.json") {
      try {
        const master = await resolveMasterUser();
        const code = mintAuthorizationCode({ clientId, redirectUri, codeChallenge, user: master, scope: scopeText, resource });
        const url = new URL(redirectUri);
        url.searchParams.set("code", code);
        url.searchParams.set("iss", ISSUER);
        if (state) url.searchParams.set("state", state);
        return res.redirect(302, url.toString());
      } catch (error) {
        console.error("MCP master auto-authorization failed:", error);
        return errorRedirect(res, redirectUri, state, "server_error", "MCP master identity is not configured.");
      }
    }
    const sessionUser = (req as any).user;
    const isAuthenticated = Boolean((req as any).isAuthenticated?.() && sessionUser);
    const isMasterSession = isAuthenticated && ["admin", "owner"].includes(String(sessionUser.role).toLowerCase());
    const authenticatedName = isMasterSession ? String(sessionUser.username ?? "") : "";
    const sessionHint = isMasterSession
      ? `<p>Conta mestre já autenticada: <strong>${htmlEscape(authenticatedName || "conta mestre")}</strong>. Não é necessário informar usuário ou senha novamente.</p>`
      : "";
    const credentialsForm = isMasterSession
      ? `<input type="hidden" name="use_session" value="true"><button type="submit">Autorizar com a conta mestre já autenticada</button>`
      : `<label>Usuário<br><input name="username" autocomplete="username" required></label><br><br><label>Senha<br><input type="password" name="password" autocomplete="current-password" required></label><br><br><button type="submit">Autorizar</button>`;
    res.type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Autorizar Aura</title></head><body style="font-family:system-ui;max-width:520px;margin:48px auto;padding:24px"><h1>Autorizar Aura</h1><p>O ChatGPT está solicitando acesso às ferramentas do Aura / Supreme Operator.</p><p>Permissões solicitadas: <strong>${htmlEscape(scopeText)}</strong>${actionScope ? " (inclui ações que podem alterar o estado do sistema)" : ""}</p>${sessionHint}<form method="post" action="/oauth/authorize"><input type="hidden" name="client_id" value="${htmlEscape(clientId)}"><input type="hidden" name="redirect_uri" value="${htmlEscape(redirectUri)}"><input type="hidden" name="response_type" value="code"><input type="hidden" name="code_challenge" value="${htmlEscape(codeChallenge)}"><input type="hidden" name="code_challenge_method" value="S256"><input type="hidden" name="state" value="${htmlEscape(state)}"><input type="hidden" name="resource" value="${htmlEscape(resource)}"><input type="hidden" name="scope" value="${htmlEscape(scopeText)}">${credentialsForm}</form></body></html>`);
  });

  app.post("/oauth/authorize", async (req: Request, res: Response) => {
    const clientId = String(req.body?.client_id ?? "");
    const redirectUri = String(req.body?.redirect_uri ?? "");
    const codeChallenge = String(req.body?.code_challenge ?? "");
    const state = String(req.body?.state ?? "");
    const resource = String(req.body?.resource ?? "");
    const scope = cleanScopes(String(req.body?.scope ?? "aura.read")).join(" ");
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    const useSession = String(req.body?.use_session ?? "") === "true";

    if (!(await validClientForRequest(clientId, redirectUri)) || !validRedirect(redirectUri) || (!RESOURCE_ALLOWLIST.has(resource) && resource !== MCP_RESOURCE)) {
      return res.status(400).send("Invalid OAuth request.");
    }
    if (!SECRET) return res.status(503).send("MCP OAuth is not configured.");

    const sessionUser = (req as any).user;
    const hasAuthenticatedMasterSession = Boolean(
      useSession &&
      (req as any).isAuthenticated?.() &&
      sessionUser &&
      ["admin", "owner"].includes(String(sessionUser.role).toLowerCase()),
    );

    let user: any = hasAuthenticatedMasterSession ? sessionUser : null;
    if (!user) {
      user = await storage.getUserByUsername(username);
      if (!user || !comparePassword(String((user as any).password ?? ""), password)) {
        return errorRedirect(res, redirectUri, state, "access_denied", "Invalid username or password.");
      }
    }

    const code = crypto.randomBytes(32).toString("base64url");
    codeStore.set(code, {
      clientId,
      redirectUri,
      codeChallenge,
      username: String((user as any).username ?? username),
      userId: String((user as any).id ?? ""),
      scope,
      resource,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    url.searchParams.set("iss", ISSUER);
    if (state) url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  app.post("/oauth/token", async (req: Request, res: Response) => {
    if (!SECRET) return res.status(503).json({ error: "server_error", error_description: "MCP OAuth is not configured." });

    const grantType = String(req.body?.grant_type ?? "");
    const clientId = String(req.body?.client_id ?? "");
    const resource = String(req.body?.resource ?? "");

    if (grantType === "refresh_token") {
      const refreshToken = String(req.body?.refresh_token ?? "");
      const parts = refreshToken.split(".");
      if (parts.length !== 3) return res.status(400).json({ error: "invalid_grant" });

      let payload: any;
      try {
        payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      } catch {
        return res.status(400).json({ error: "invalid_grant" });
      }

      const signature = b64url(crypto.createHmac("sha256", SECRET).update(`${parts[0]}.${parts[1]}`).digest());
      const now = Math.floor(Date.now() / 1000);
      const tokenResource = String(payload.aud ?? "").replace(/\/$/, "");
      const scopes = String(payload.scope ?? "").split(/\s+/).filter(Boolean);

      if (
        payload.typ !== "refresh" ||
        !timingEqual(signature, parts[2]) ||
        payload.iss !== ISSUER ||
        !payload.sub ||
        Number(payload.exp) <= now ||
        payload.client_id !== clientId ||
        tokenResource !== resource ||
        (!RESOURCE_ALLOWLIST.has(resource) && resource !== MCP_RESOURCE)
      ) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      const accessToken = signJwt({
        iss: ISSUER,
        aud: resource,
        sub: String(payload.sub),
        username: String(payload.username ?? ""),
        scope: scopes.join(" "),
        iat: now,
        exp: now + 3600,
      });

      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: scopes.join(" "),
      });
      return;
    }

    if (grantType !== "authorization_code") return res.status(400).json({ error: "unsupported_grant_type" });

    const code = String(req.body?.code ?? "");
    const verifier = String(req.body?.code_verifier ?? "");
    const redirectUri = String(req.body?.redirect_uri ?? "");
    const record = codeStore.get(code);
    if (!record) return res.status(400).json({ error: "invalid_grant" });
    codeStore.delete(code);

    if (record.expiresAt < Date.now() || record.clientId !== clientId || record.resource !== resource || (!RESOURCE_ALLOWLIST.has(resource) && resource !== MCP_RESOURCE) || (redirectUri && redirectUri !== record.redirectUri)) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
    if (!verifier || !timingEqual(challenge, record.codeChallenge)) {
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed." });
    }

    const now = Math.floor(Date.now() / 1000);
    const scope = record.scope;
    const accessToken = signJwt({
      iss: ISSUER,
      aud: record.resource,
      sub: record.userId,
      username: record.username,
      scope,
      iat: now,
      exp: now + 3600,
    });
    const refreshToken = signJwt({
      typ: "refresh",
      iss: ISSUER,
      aud: record.resource,
      sub: record.userId,
      username: record.username,
      scope,
      client_id: record.clientId,
      iat: now,
      exp: now + 180 * 24 * 3600,
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope,
    });
  });

  app.get("/.well-known/jwks.json", (_req, res) => {
    res.json({ keys: [] });
  });

  const cleanup = () => {
    const now = Date.now();
    for (const [code, record] of codeStore) if (record.expiresAt < now) codeStore.delete(code);
  };
  setInterval(cleanup, 60_000).unref();
}
