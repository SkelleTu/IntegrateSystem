import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const serverEntry = path.join(root, "dist", "index.js");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "aura-electron-smoke-"));
const runtimeDir = path.join(dataDir, "runtime");
const port = 5117;
const base = `http://127.0.0.1:${port}`;
const childEnv = {
  ...process.env,
  ELECTRON_RUN_AS_NODE: "1",
  NODE_ENV: "production",
  PORT: String(port),
  SESSION_SECRET: "ci-only-aura-electron-smoke-session-secret",
  AURA_DATA_DIR: dataDir,
  AURA_RUNTIME_DIR: runtimeDir,
};
for (const key of ["DATABASE_URL", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "VERCEL", "VERCEL_ENV"]) {
  delete childEnv[key];
}

await access(serverEntry, constants.R_OK);
await access(electronBinary, constants.X_OK);
await access(dataDir, constants.W_OK);

const child = spawn(electronBinary, [serverEntry], {
  cwd: root,
  env: childEnv,
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", chunk => { output = (output + chunk.toString()).slice(-12000); });
child.stderr.on("data", chunk => { output = (output + chunk.toString()).slice(-12000); });

let started = false;
try {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Electron Node backend exited early (code ${child.exitCode}).\n${output}`);
    }
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        const health = await response.json();
        assert.equal(health.status, "ok");
        assert.equal(health.service, "integrated-system");
        started = true;
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  assert.equal(started, true, `Electron Node backend did not become healthy.\n${output}`);

  const dbResponse = await fetch(`${base}/api/db/status`);
  assert.equal(dbResponse.status, 200);
  const dbStatus = await dbResponse.json();
  assert.equal(dbStatus.provider, "sqlite-local");
  assert.equal(Object.hasOwn(dbStatus, "lastAction"), false);
  console.log("Electron Node backend: health and isolated SQLite status passed.");

  const pageResponse = await fetch(base);
  assert.equal(pageResponse.status, 200);
  const html = await pageResponse.text();
  assert.match(html, /<div[^>]+id=["']root["']/i);
  console.log("Electron Node backend: packaged SPA static route passed.");
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 12000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await rm(dataDir, { recursive: true, force: true });
}

if (!started) process.exitCode = 1;
