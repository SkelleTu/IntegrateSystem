import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

async function buildAll() {
  console.log("[BUILD 10%] Limpando build anterior...");
  await rm("dist", { recursive: true, force: true });

  console.log("[BUILD 20%] Iniciando build do cliente...");
  await viteBuild();

  console.log("[BUILD 60%] Cliente concluido. Iniciando build do servidor...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  // Keep all npm packages external to avoid bundling CommonJS dependencies
  // into the ESM server bundle. Node built-ins are also left as native imports.
  const externals = allDeps;

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

  console.log("[BUILD 100%] Build do cliente e servidor concluido.");
}

buildAll().catch((err) => {
  console.error("[BUILD ERRO] Falha durante o build:");
  console.error(err);
  process.exit(1);
});
