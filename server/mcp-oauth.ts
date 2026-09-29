import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";

const ISSUER = String(process.env.MCP_OAUTH_ISSUER ?? "https://integrated-system-gzyu.onrender.com").replace(/\/$/, "");
const RESOURCE = String(process.env.MCP_RESOURCE_URL ?? "https://universal-server1.onrender.com").replace(/\/$/, "");
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

export function registerMcpOAuth(app: Express) {
  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: ISSUER,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: `${ISSUER}/oauth/authorize`,
      token_endpoint: `${ISSUER}/oauth/token`,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      grant_types_supported: ["authorization_code"],
      response_types_supported: ["code"],
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
    if (resource !== RESOURCE) return res.status(400).send("Invalid resource.");

    const actionScope = scopes.includes("aura.execute");
    const scopeText = scopes.join(" ");
    res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Aura authorization</title></head><body style="font-family:system-ui;max-width:520px;margin:48px auto;padding:24px"><h1>Authorize Aura</h1><p>ChatGPT is requesting access to the Aura / Supreme Operator tools.</p><p>Requested permissions: <strong>${htmlEscape(scopeText)}</strong>${actionScope ? " (includes actions that can change system state)" : ""}</p><form method="post" action="/oauth/authorize"><input type="hidden" name="client_id" value="${htmlEscape(clientId)}"><input type="hidden" name="redirect_uri" value="${htmlEscape(redirectUri)}"><input type="hidden" name="response_type" value="code"><input type="hidden" name="code_challenge" value="${htmlEscape(codeChallenge)}"><input type="hidden" name="code_challenge_method" value="S256"><input type="hidden" name="state" value="${htmlEscape(state)}"><input type="hidden" name="resource" value="${htmlEscape(resource)}"><input type="hidden" name="scope" value="${htmlEscape(scopeText)}"><label>Usuário<br><input name="username" autocomplete="username" required></label><br><br><label>Senha<br><input type="password" name="password" autocomplete="current-password" required></label><br><br><button type="submit">Autorizar</button></form></body></html>`);
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

    if (!(await validClientForRequest(clientId, redirectUri)) || !validRedirect(redirectUri) || resource !== RESOURCE) {
      return res.status(400).send("Invalid OAuth request.");
    }
    if (!SECRET) return res.status(503).send("MCP OAuth is not configured.");

    const user = await storage.getUserByUsername(username);
    if (!user || !comparePassword(String((user as any).password ?? ""), password)) {
      return errorRedirect(res, redirectUri, state, "access_denied", "Invalid username or password.");
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
    if (String(req.body?.grant_type ?? "") !== "authorization_code") return res.status(400).json({ error: "unsupported_grant_type" });

    const code = String(req.body?.code ?? "");
    const verifier = String(req.body?.code_verifier ?? "");
    const clientId = String(req.body?.client_id ?? "");
    const redirectUri = String(req.body?.redirect_uri ?? "");
    const resource = String(req.body?.resource ?? "");
    const record = codeStore.get(code);
    if (!record) return res.status(400).json({ error: "invalid_grant" });
    codeStore.delete(code);

    if (record.expiresAt < Date.now() || record.clientId !== clientId || record.resource !== resource || resource !== RESOURCE || (redirectUri && redirectUri !== record.redirectUri)) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
    if (!verifier || !timingEqual(challenge, record.codeChallenge)) {
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed." });
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = signJwt({
      iss: ISSUER,
      aud: RESOURCE,
      sub: record.userId,
      username: record.username,
      scope: record.scope,
      iat: now,
      exp: now + 3600,
    });

    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: record.scope,
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
