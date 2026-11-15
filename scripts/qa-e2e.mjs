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
  const requestOptions = { ...options, signal: options.signal || AbortSignal.timeout(15000) };
  return fetch(new URL(route, base), requestOptions);
}

async function expectStatus(response, expected, label) {
  const body = await response.text();
  assert.equal(response.status, expected, `${label}: HTTP ${response.status}; body=${body.slice(0, 800)}`);
  summary.push({ test: label, status: response.status });
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
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

const sessionUser = await expectStatus(await request("/api/user", { headers: { cookie } }), 200, "authenticated-session");
assert.ok(Number(sessionUser.enterpriseId) > 0, "QA administrator must be linked to its isolated enterprise");
await expectStatus(await request("/api/admin/users", { headers: { cookie } }), 403, "owner-user-list-denied-to-admin");
const invalidStaff = await request("/api/admin/register-employee", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ username: "x", password: "short" }),
});
await expectStatus(invalidStaff, 400, "invalid-staff-account-rejected");
const staff = await expectStatus(await request("/api/admin/register-employee", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ username: "qa-employee-ci", password }),
}), 201, "create-enterprise-staff");
assert.equal(staff.role, "employee");
const employeeLogin = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "qa-employee-ci", password }),
});
assert.equal(employeeLogin.status, 200);
const employeeCookie = (employeeLogin.headers.get("set-cookie") || "").split(";")[0];
await expectStatus(await request("/api/services", { method: "POST", headers: { cookie: employeeCookie, "content-type": "application/json" }, body: JSON.stringify({ name: "Forbidden", price: 100, imageUrl: "https://example.invalid/x.png", isActive: true }) }), 403, "employee-service-create-denied");
await expectStatus(await request("/api/queue/reset", { method: "POST", headers: { cookie: employeeCookie, "content-type": "application/json" }, body: JSON.stringify({ startFrom: 0 }) }), 403, "employee-queue-reset-denied");
await expectStatus(await request("/api/sales", { headers: { cookie: employeeCookie } }), 403, "employee-sales-report-denied");
await expectStatus(await request("/api/transactions", { headers: { cookie: employeeCookie } }), 403, "employee-financial-read-denied");
assert.equal(Number(staff.enterpriseId), Number(sessionUser.enterpriseId), "staff account must inherit the administrator's enterprise");
// Validate the server-side time-clock state machine in isolated QA.
const qaCredentialId = "qa-webauthn-credential-id-1234567890";
await expectStatus(await request("/api/auth/register-fingerprint", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ fingerprintId: qaCredentialId }),
}), 200, "qa-timeclock-credential-registration");
const outOfOrderPunch = await request("/api/time-clock/register", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ type: "break_start", fingerprintId: qaCredentialId }),
});
const outOfOrderData = await expectStatus(outOfOrderPunch, 409, "timeclock-out-of-order-rejected");
assert.equal(outOfOrderData.expectedType, "in");
for (const type of ["in", "break_start", "break_end", "out"]) {
  await expectStatus(await request("/api/time-clock/register", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ type, fingerprintId: qaCredentialId }),
  }), 200, `timeclock-${type}`);
}
const repeatedPunch = await expectStatus(await request("/api/time-clock/register", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ type: "out", fingerprintId: qaCredentialId }),
}), 409, "timeclock-duplicate-out-rejected");
assert.equal(repeatedPunch.expectedType, "in");

const tutorialBefore = await expectStatus(await request("/api/tutorial/status", { headers: { cookie } }), 200, "tutorial-status-before");
assert.equal(tutorialBefore.completed, false);
const tutorialCompleted = await expectStatus(await request("/api/tutorial/complete", {
  method: "POST",
  headers: { cookie },
}), 200, "tutorial-complete-persisted");
assert.equal(tutorialCompleted.completed, true);
const tutorialAfter = await expectStatus(await request("/api/tutorial/status", { headers: { cookie } }), 200, "tutorial-status-after");
assert.equal(tutorialAfter.completed, true);
await expectStatus(await request("/api/products", { headers: { cookie } }), 200, "products-api-before");

// Queue control mutations must never be callable by anonymous visitors.
await expectStatus(await request("/api/queue/next", { method: "POST" }), 401, "anonymous-queue-next-denied");
await expectStatus(await request("/api/queue/prev", { method: "POST" }), 401, "anonymous-queue-prev-denied");
await expectStatus(await request("/api/queue/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startFrom: 0 }) }), 401, "anonymous-queue-reset-denied");
await expectStatus(await request("/api/queue/set", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: 0 }) }), 401, "anonymous-queue-set-denied");

// Exercise the service catalog and every authenticated queue control in the isolated database.
await expectStatus(await request("/api/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "QA service", price: 2500, imageUrl: "https://example.invalid/aura-qa.png", isActive: true }) }), 401, "anonymous-service-create-denied");
const service = await expectStatus(await request("/api/services", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ name: "QA service", price: 2500, imageUrl: "https://example.invalid/aura-qa.png", isActive: true }),
}), 201, "service-create");
const serviceId = Number(service.id);
assert.ok(Number.isSafeInteger(serviceId) && serviceId > 0);
const updatedService = await expectStatus(await request(`/api/services/${serviceId}`, {
  method: "PUT",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ price: 2750 }),
}), 200, "service-update");
assert.equal(updatedService.price, 2750);
const servicesList = await expectStatus(await request("/api/services", { headers: { cookie } }), 200, "service-list");
assert.ok(servicesList.some(item => item.id === serviceId));
await expectStatus(await request("/api/queue/reset", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ startFrom: 0 }) }), 200, "queue-reset");
const queueNext = await expectStatus(await request("/api/queue/next", { method: "POST", headers: { cookie } }), 200, "queue-next");
assert.equal(queueNext.servingNumber, 1);
const queuePrev = await expectStatus(await request("/api/queue/prev", { method: "POST", headers: { cookie } }), 200, "queue-previous");
assert.equal(queuePrev.servingNumber, 0);
const queueSet = await expectStatus(await request("/api/queue/set", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ number: 7 }) }), 200, "queue-set-number");
assert.equal(queueSet.servingNumber, 7);
await expectStatus(await request("/api/queue/reset", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ startFrom: 0 }) }), 200, "queue-reset-after-test");
const ticket = await expectStatus(await request(`/api/tickets?enterpriseId=${sessionUser.enterpriseId}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ serviceId }),
}), 201, "public-queue-ticket-create");
const ticketLookup = await expectStatus(await request(`/api/tickets/${ticket.ticketNumber}`), 200, "public-queue-ticket-lookup");
assert.equal(ticketLookup.id, ticket.id);
const priceProduct = await expectStatus(await request("/api/products", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ name: "QA Price Integrity", unit: "Unidade", minStock: 1, salePrice: "12.50", category: "QA", codigoProduto: "QA-PRICE-001" }),
}), 201, "price-integrity-product-create");
const priceBatch = await expectStatus(await request(`/api/products/${priceProduct.id}/batches`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ quantity: 3, costPrice: "5.00", salePrice: "12.50", batchNumber: "QA-PRICE-001" }),
}), 201, "price-integrity-batch-create");
await expectStatus(await request("/api/cash-register/open", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ openingAmount: 0 }),
}), 200, "price-integrity-cash-open");
const tamperedSale = await request("/api/sales", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    sale: { totalAmount: 1 },
    items: [{ itemType: "product", itemId: 500000 + priceBatch.id, sourceType: "batch", sourceId: priceBatch.id, quantity: 1, unitPrice: 1, totalPrice: 1, unitType: "unit" }],
    payments: [{ method: "cash", amount: 1 }],
  }),
});
await expectStatus(tamperedSale, 409, "sale-price-tampering-rejected");
const validSale = await expectStatus(await request("/api/sales", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({
    sale: { totalAmount: 1250 },
    items: [{ itemType: "product", itemId: 500000 + priceBatch.id, sourceType: "batch", sourceId: priceBatch.id, quantity: 1, unitPrice: 1250, totalPrice: 1250, unitType: "unit" }],
    payments: [{ method: "cash", amount: 1250 }],
  }),
}), 200, "sale-server-priced-create");
await expectStatus(await request(`/api/sales/${validSale.id}/cancel`, { method: "POST", headers: { cookie } }), 200, "sale-server-priced-cancel");
const restoredPriceBatches = await expectStatus(await request(`/api/products/${priceProduct.id}/batches`, { headers: { cookie } }), 200, "sale-price-stock-restored");
assert.equal(Number(restoredPriceBatches.find(x => x.id === priceBatch.id)?.quantity), 3);
await expectStatus(await request("/api/cash-register/close", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ closingAmount: 0 }),
}), 200, "price-integrity-cash-close");
await expectStatus(await request(`/api/products/${priceProduct.id}`, { method: "DELETE", headers: { cookie } }), 204, "price-integrity-product-cleanup");

await expectStatus(await request(`/api/services/${serviceId}`, { method: "DELETE", headers: { cookie } }), 204, "service-delete");

// Finance transaction create/read/delete cycle, using integer cents in the isolated database.
const transaction = await expectStatus(await request("/api/transactions", {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ businessType: "barbearia", type: "expense", category: "qa", description: "E2E despesa isolada", amount: 1234 }),
}), 201, "finance-transaction-create");
const transactionId = Number(transaction.id);
assert.ok(Number.isSafeInteger(transactionId) && transactionId > 0);
const transactionList = await expectStatus(await request("/api/transactions?businessType=barbearia", { headers: { cookie } }), 200, "finance-transaction-read");
assert.ok(transactionList.some(item => item.id === transactionId));
await expectStatus(await request(`/api/transactions/${transactionId}`, { method: "DELETE", headers: { cookie } }), 200, "finance-transaction-delete");

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
assert.equal(invalidUpload.status, 400, "unsupported upload type must be rejected with HTTP 400");
summary.push({ test: "admin-upload-type-filter", status: invalidUpload.status });

// Verify label gateway status and truthful backup/Drive status endpoints.
await expectStatus(await request("/api/labels/status", { headers: { cookie } }), 403, "labels-status-owner-restriction");
const backup = await expectStatus(await request("/api/backup/status", { headers: { cookie } }), 200, "backup-status-local-qa");
assert.equal(backup.backup.authoritativeSource, "sqlite-local");
assert.equal(backup.backup.complete, true);
const drive = await expectStatus(await request("/api/google-drive/status", { headers: { cookie } }), 200, "google-drive-status");
assert.equal(drive.available, false);
summary.push({ test: "qa-backup-status-and-drive-unconfigured-state", status: "passed" });

// Remove the disposable label product. The cash E2E route already verifies its own cleanup.
await expectStatus(await request(`/api/products/${productId}`, {
  method: "DELETE",
  headers: { cookie },
}), 204, "delete-label-product");

// Read-only coverage across the remaining operational modules.
// Cross-tenant isolation: create a second disposable tenant and prove horizontal isolation.
const registrationB = await request("/api/public/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Aura QA Tenant B", taxId: "98765432000188", email: "qa-tenant-b@example.invalid", phone: "11988880000", address: "Rua de Teste B, 200, Araras/SP", slug: "aura-qa-tenant-b", username: "qa-admin-b-ci", password }),
});
const registrationBData = await expectStatus(registrationB, 201, "public-registration-tenant-b");
assert.equal(registrationBData.ok, true);
const loginB = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "qa-admin-b-ci", password }) });
assert.equal(loginB.status, 200, "tenant B login must work");
const setCookiesB = typeof loginB.headers.getSetCookie === "function" ? loginB.headers.getSetCookie() : [loginB.headers.get("set-cookie")].filter(Boolean);
const cookieB = setCookiesB.map(value => value.split(";")[0]).join("; ");
const sessionUserB = await expectStatus(await request("/api/user", { headers: { cookie: cookieB } }), 200, "tenant-b-session");
assert.notEqual(Number(sessionUserB.enterpriseId), Number(sessionUser.enterpriseId), "tenant B must have a distinct enterprise");
const productB = await expectStatus(await request("/api/products", { method: "POST", headers: { cookie: cookieB, "content-type": "application/json" }, body: JSON.stringify({ name: "QA Tenant B Product", unit: "Unidade", minStock: 1, salePrice: "9.90", category: "QA-B", codigoProduto: "QA-B-001" }) }), 201, "tenant-b-product-create");
const serviceB = await expectStatus(await request("/api/services", { method: "POST", headers: { cookie: cookieB, "content-type": "application/json" }, body: JSON.stringify({ name: "QA Tenant B Service", price: 990, imageUrl: "https://example.invalid/b.png", isActive: true }) }), 201, "tenant-b-service-create");
const publicTicketB = await expectStatus(await request(`/api/tickets?enterpriseId=${sessionUserB.enterpriseId}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ serviceId: Number(serviceB.id) }),
}), 201, "public-ticket-tenant-b-create");
const publicTicketBLookup = await expectStatus(await request(`/api/tickets/${publicTicketB.ticketNumber}?enterpriseId=${sessionUserB.enterpriseId}`), 200, "public-ticket-tenant-b-lookup");
assert.equal(Number(publicTicketBLookup.id), Number(publicTicketB.id));
await expectStatus(await request("/api/tickets/1"), 409, "public-ticket-requires-tenant-selection-when-multiple-establishments");
const productsA = await expectStatus(await request("/api/products", { headers: { cookie } }), 200, "tenant-a-products-isolated");
assert.ok(!productsA.some(item => Number(item.id) === Number(productB.id)), "tenant A must not list tenant B products");
await expectStatus(await request(`/api/products/${productB.id}`, { headers: { cookie } }), 404, "tenant-a-product-b-by-id-denied");
await expectStatus(await request(`/api/products/${productB.id}`, { method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ name: "cross-tenant-write" }) }), 404, "tenant-a-product-b-update-denied");
await expectStatus(await request(`/api/products/${productB.id}`, { method: "DELETE", headers: { cookie } }), 404, "tenant-a-product-b-delete-denied");
const transactionB = await expectStatus(await request("/api/transactions", {
  method: "POST",
  headers: { cookie: cookieB, "content-type": "application/json" },
  body: JSON.stringify({ businessType: "barbearia", type: "expense", category: "tenant-b", description: "Tenant B isolated transaction", amount: 777 }),
}), 201, "tenant-b-transaction-create");
const transactionsA = await expectStatus(await request("/api/transactions", { headers: { cookie } }), 200, "tenant-a-transactions-isolated");
assert.ok(!transactionsA.some(item => Number(item.id) === Number(transactionB.id)), "tenant A must not read tenant B transactions");
const servicesA = await expectStatus(await request("/api/services", { headers: { cookie } }), 200, "tenant-a-services-isolated");
assert.ok(!servicesA.some(item => Number(item.id) === Number(serviceB.id)), "tenant A must not list tenant B services");
await expectStatus(await request(`/api/settings?enterpriseId=${sessionUserB.enterpriseId}`, { headers: { cookie } }), 403, "tenant-a-settings-b-denied");
const moduleReadRoutes = [
  ["catalog-categories", "/api/categories"],
  ["catalog-menu-items", "/api/menu-items"],
  ["queue-state", "/api/queue/state"],
  ["inventory-list", "/api/inventory"],
  ["inventory-restocks", "/api/inventory-restocks"],
  ["product-cashier-catalog", "/api/products/cashier-items"],
  ["finance-transactions", "/api/transactions"],
  ["sales-history", "/api/sales"],
  ["cash-register-history", "/api/cash-registers/history"],
  ["fiscal-settings", "/api/fiscal/settings"],
  ["fiscal-logs", "/api/fiscal/logs"],
  ["fiscal-history", "/api/fiscal/history"],
  ["employee-timeclock-history", "/api/time-clock/history"],
  ["employee-timeclock-status", "/api/time-clock/status"],
];
for (const [label, route] of moduleReadRoutes) {
  await expectStatus(await request(route, { headers: { cookie } }), 200, label);
}
await expectStatus(await request("/api/admin/monitoring", { headers: { cookie } }), 403, "owner-only-monitoring-denied-to-admin");
await expectStatus(await request("/api/admin/users", { headers: { cookie } }), 403, "owner-only-user-list-denied-to-admin");

// Anonymous write attempts must fail closed across transactional and administrative modules.
await expectStatus(await request("/api/cash-register/open", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-cash-register-open-denied");
await expectStatus(await request("/api/cash-register/close", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ closingAmount: 0 }) }), 401, "anonymous-cash-register-close-denied");
await expectStatus(await request("/api/sales", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-sale-denied");
await expectStatus(await request("/api/transactions", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-finance-write-denied");
await expectStatus(await request("/api/fiscal/emitir/1", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-fiscal-emission-denied");
await expectStatus(await request("/api/backup/save", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-backup-write-denied");
await expectStatus(await request("/api/time-clock/register", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), 401, "anonymous-timeclock-write-denied");

// Static UI contracts for the fixes requested during the assisted audit.
const sidebarSource = fs.readFileSync("client/src/components/app-sidebar.tsx", "utf8");
const homeSource = fs.readFileSync("client/src/pages/Home.tsx", "utf8");
const cashierSource = fs.readFileSync("client/src/pages/Cashier.tsx", "utf8");
const inventorySource = fs.readFileSync("client/src/pages/Inventory.tsx", "utf8");
const guardSource = fs.readFileSync("client/src/components/MasterPasswordGuard.tsx", "utf8");
const reportsSource = fs.readFileSync("client/src/pages/Reports.tsx", "utf8");
const routesSource = fs.readFileSync("server/routes.ts", "utf8");
assert.ok(sidebarSource.includes('String(user?.role ?? "").trim().toLowerCase() === "owner"'), "owner navigation must be role-based");
assert.ok(!sidebarSource.includes('username === "SkelleTu"'), "owner access must not depend on a hard-coded username");
assert.ok(homeSource.includes("border border-white/40") && homeSource.includes("Plataforma Multi-Serviços"), "dashboard label contrast contract missing");
assert.ok(homeSource.includes('<item.icon className="w-8 h-8 md:w-10 md:h-10 text-white"') && homeSource.includes('<b.icon className="w-10 h-10 md:w-12 md:h-12 text-white'), "dashboard icon contrast contract missing");
assert.ok(guardSource.includes("bg-primary text-white border border-white/30"), "authorization action contrast contract missing");
assert.ok(cashierSource.includes("h-[46%] max-h-[46%]") && cashierSource.includes("text-white text-2xl"), "cashier portrait/total contrast contract missing");
assert.ok(cashierSource.includes('setWeightInputValue("")') && cashierSource.includes('placeholder="0,000"'), "weight input must start empty and use pt-BR decimal notation");
assert.ok(inventorySource.includes("Sem validade") && inventorySource.includes("Peso Total em Estoque (kg)"), "inventory expiry/weight unit contract missing");
assert.ok(inventorySource.includes("Custo de Compra (R$/kg)") && inventorySource.includes("Preço de Venda (R$/kg)"), "inventory per-kg pricing contract missing");
assert.ok(routesSource.includes("const allowedTypes = new Set") && routesSource.includes("const expectedType ="), "time-clock server-side state machine contract missing");
assert.ok(!inventorySource.includes("deixe em branco para usar o preço do produto"), "inventory sale price placeholder must be explicit");
assert.ok(reportsSource.includes('new Date(`${dateRange.start}T00:00:00`).toISOString()') && !reportsSource.includes('T00:00:00.000Z'), "reports must filter by local business-day boundaries");
assert.ok(routesSource.includes('String(user?.role || "").trim().toLowerCase() === "owner";') && !routesSource.includes('String(user?.username || "").trim().toLowerCase() === "skelletu"'), "server owner authorization must rely on the owner role only");
assert.ok(routesSource.includes('app.get("/api/admin/users"') && routesSource.includes("users.map(toAdminPublicUser)"), "owner user-list endpoint must exist and redact sensitive fields");
assert.ok(routesSource.includes("enterpriseId,") && routesSource.includes('role: "employee"'), "new staff accounts must inherit the active enterprise");
assert.ok(routesSource.includes("complete: !neonPool && !isRemoteEnabled") && routesSource.includes("if (neonPool || isRemoteEnabled) return res.status(409).json(remoteBackupUnavailable);"), "backup must not treat a local SQLite snapshot as a complete Neon backup");
summary.push({ test: "cross-module-read-only-api-coverage", status: "passed", routes: moduleReadRoutes.length });
summary.push({ test: "requested-ui-contracts", status: "passed" });

console.log(JSON.stringify({ ok: true, tests: summary.length, summary }, null, 2));
