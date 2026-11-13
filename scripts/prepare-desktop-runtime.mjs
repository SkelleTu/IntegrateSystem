import { execSync } from "node:child_process";
import { copyFile, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(path.join("dist", "package.json"), JSON.stringify(rootPackage, null, 2) + "\n");
await copyFile("package-lock.json", path.join("dist", "package-lock.json"));
execSync("npm ci --prefix dist --omit=dev --no-audit --no-fund", {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
await rm(path.join("dist", "package-lock.json"), { force: true });
console.log("[DESKTOP] Locked production server dependencies installed under dist/node_modules.");
