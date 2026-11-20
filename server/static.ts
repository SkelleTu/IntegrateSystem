import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  // O frontend é uma SPA: rotas navegáveis sem arquivo físico precisam
  // receber o index.html para o router do cliente resolver a URL.
  if (fs.existsSync(distPath)) {
    const indexPath = path.join(distPath, "index.html");

    app.use(express.static(distPath));

    app.use((req, res, next) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/api") &&
        !path.extname(req.path)
      ) {
        return res.sendFile(indexPath);
      }
      next();
    });

    // Fallback final para compatibilidade com navegadores/proxies que
    // encaminhem uma rota SPA de forma diferente.
    app.get("*", (req, res, next) => {
      if (!req.path.startsWith("/api")) {
        return res.sendFile(indexPath);
      }
      next();
    });
  } else {
    const publicPath = path.resolve(process.cwd(), "public");
    app.use(express.static(publicPath));
  }
}
