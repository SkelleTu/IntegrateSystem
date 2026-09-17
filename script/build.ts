import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  // Keep all npm packages external to avoid bundling CommonJS dependencies
  // into the ESM server bundle. Node built-ins are also left as native imports.
  const externals = allDeps;

  // The server uses top-level await in server/db.ts to initialize sql.js and
  // optionally connect to Turso. CommonJS cannot represent top-level await,
  // while this project is already declared as ESM in package.json. Keep the
  // bundled server as ESM instead of forcing an incompatible CJS artifact.
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "error",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
