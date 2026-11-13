import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
const runtimePackage = {
  name: "aura-system-local-runtime",
  version: rootPackage.version || "1.0.0",
  private: true,
  type: "module",
  dependencies: rootPackage.dependencies || {},
};
await writeFile(path.join("dist", "package.json"), JSON.stringify(runtimePackage, null, 2) + "\n");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(npm, ["install", "--prefix", "dist", "--omit=dev", "--package-lock=false", "--no-audit", "--no-fund"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
console.log("[DESKTOP] Production server dependencies installed under dist/node_modules.");
