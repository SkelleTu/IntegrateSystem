import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";

const base = process.env.AURA_QA_BASE_URL || "http://127.0.0.1:5010";
const password = "QaOnly!2026-Test-Account";
const username = "qa-admin-ci";
const email = "qa-admin@example.invalid";
const summary = [];

async function request(route, options = {}) {
  return fetch(new URL(route, base), options);
}

async function expectStatus(response, expected, label) {
  const body = await response.text();
  assert.equal(response.status, expected, `${label}: HTTP ${response.status}; body=${body.slice(0, 800)}`);
  summary.push({ test: label, status: response.status });
  return body ? JSON.parse(body) : null;
}

async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await request("/health");
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Servidor QA não ficou saudável em 60 segundos.");
}

await waitForHealth();

// Create a disposable tenant and administrator in the isolated SQLite database.
const registration = await request("/api/public/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Aura QA Isolated",
    taxId: "12345678000199",
    email,
    phone: "11999990000",
    address: "Rua de Teste, 100, Araras/SP",
    slug: "aura-qa-isolated",
    username,
    password,
  }),
});
const registrationData = await expectStatus(registration, 201, "public-registration");
assert.equal(registrationData.ok, true);

// Login must work for the pending test tenant only in the isolated QA runtime.
const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password }),
});
assert.equal(login.status, 200, `login failed: ${await login.text()}`);
const setCookies = typeof login.headers.getSetCookie === "function"
  ? login.headers.getSetCookie()
  : [login.headers.get("set-cookie")].filter(Boolean);
const cookie = setCookies.map(value => value.split(";")[0]).join("; ");
assert.ok(cookie.includes("connect.sid="), "session cookie was not issued");
summary.push({ test: "qa-admin-login", status: 200 });

await expectStatus(await request("/api/user", { headers: { cookie } }), 200, "authenticated-session");
const productsBefore = await expectStatus(await request("/api/products", { headers: { cookie } }), 200, "products-api-before");

// Product catalog used by the label screen must read from /api/products.
const product = await expectStatus(await request("/api/products", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    name: "Produto Etiqueta QA",
    unit: "Unidade",
    minStock: 1,
    salePrice: "1.50",
    category: "QA",
    codigoProduto: "QA-LABEL-001",
  }),
}), 201, "create-label-product");
const productId = Number(product.id);
assert.ok(Number.isSafeInteger(productId) && productId > 0);
const productList = await expectStatus(await request("/api/products", { headers: { cookie } }), 200, "products-api-after");
assert.ok(productList.some(item => item.id === productId && item.name === "Produto Etiqueta QA"));
summary.push({ test: "label-catalog-product-source", status: "passed" });

// Full cash E2E covers cash/PIX, stock deduction/reversal, financial postings, cancellation and cash close.
const e2e = await expectStatus(await request("/api/audit/e2e/cash", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: "{}",
}), 200, "cash-e2e");
assert.equal(e2e.ok, true);
assert.equal(e2e.cleanupVerified, true);
assert.equal(e2e.evidence.cashDifference, 0);
summary.push({ test: "cash-stock-finance-pix-cancellation-and-cleanup", status: "passed", cleanup: e2e.cleanupEvidence });

// The Windows bridge must fail closed when no shared device token is configured.
const wsStatus = await new Promise((resolve, reject) => {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws/labels", {
    headers: { Authorization: "Bearer deliberately-invalid-qa-token" },
    handshakeTimeout: 8000,
  });
  const timeout = setTimeout(() => {
    ws.terminate();
    reject(new Error("WebSocket handshake did not reject an unauthenticated client."));
  }, 9000);
  ws.on("unexpected-response", (_request, response) => {
    clearTimeout(timeout);
    resolve(response.statusCode);
    response.resume();
  });
  ws.on("open", () => {
    clearTimeout(timeout);
    ws.close();
    reject(new Error("Unauthenticated WebSocket client was accepted."));
  });
  ws.on("error", error => {
    if (error.message.includes("Unexpected server response")) return;
    clearTimeout(timeout);
    reject(error);
  });
});
assert.equal(wsStatus, 503, `Expected closed-by-default WS (503), got ${wsStatus}`);
summary.push({ test: "labels-websocket-fail-closed", status: wsStatus });

// Anonymous upload is denied; an authenticated admin may upload a whitelisted file.
const anonymousForm = new FormData();
anonymousForm.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "anonymous.png");
await expectStatus(await request("/api/admin/upload", { method: "POST", body: anonymousForm }), 401, "anonymous-admin-upload-denied");

const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=", "base64");
const uploadForm = new FormData();
uploadForm.append("file", new Blob([pngBytes], { type: "image/png" }), "qa-valid.png");
const upload = await expectStatus(await request("/api/admin/upload", {
  method: "POST",
  headers: { cookie },
  body: uploadForm,
}), 200, "admin-upload-valid-image");
const uploadedName = path.basename(String(upload.url).split("/").pop() || "");
if (uploadedName) {
  const uploadedPath = path.join(process.cwd(), "attached_assets", "uploads", uploadedName);
  if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
}

const invalidForm = new FormData();
invalidForm.append("file", new Blob(["not an image"], { type: "text/plain" }), "not-allowed.txt");
const invalidUpload = await request("/api/admin/upload", {
  method: "POST",
  headers: { cookie },
  body: invalidForm,
});
assert.ok(invalidUpload.status >= 400, "unsupported upload type was accepted");
summary.push({ test: "admin-upload-type-filter", status: invalidUpload.status });

// Verify label gateway status and truthful backup/Drive status endpoints.
await expectStatus(await request("/api/labels/status", { headers: { cookie } }), 200, "labels-status");
const backup = await expectStatus(await request("/api/backup/status", { headers: { cookie } }), 200, "backup-status");
const drive = await expectStatus(await request("/api/google-drive/status", { headers: { cookie } }), 200, "google-drive-status");
assert.equal(backup.autoBackup, false);
assert.equal(drive.available, false);
summary.push({ test: "backup-and-drive-report-unconfigured-state", status: "passed" });

// Remove the disposable label product. The cash E2E route already verifies its own cleanup.
await expectStatus(await request(`/api/products/${productId}`, {
  method: "DELETE",
  headers: { cookie },
}), 200, "delete-label-product");

console.log(JSON.stringify({ ok: true, tests: summary.length, summary }, null, 2));
