import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  // No Vercel, o roteamento deve ser tratado com cuidado para não conflitar com as Serverless Functions
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    app.get("*", (req, res, next) => {
      // Se não for API e o arquivo não existir fisicamente, serve o index.html (SPA routing)
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        next();
      }
    });
  } else {
    // Fallback para desenvolvimento ou ambientes sem build
    const publicPath = path.resolve(process.cwd(), "public");
    app.use(express.static(publicPath));
  }
}
