import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    // Tentar fallback para public se dist não existir
    const fallbackPath = path.resolve(process.cwd(), "public");
    if (fs.existsSync(fallbackPath) && fs.existsSync(path.join(fallbackPath, "index.html"))) {
       app.use(express.static(fallbackPath));
       app.use("*", (_req, res) => {
         res.sendFile(path.resolve(fallbackPath, "index.html"));
       });
       return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
