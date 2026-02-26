import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import path from "path";
import fs from "fs";

const app = express();
const httpServer = createServer(app);

// Configurar fuso horário para Brasília
process.env.TZ = 'America/Sao_Paulo';

// Serve attached assets/uploads
const uploadsPath = process.env.VERCEL 
  ? path.join('/tmp', "uploads")
  : path.join(process.cwd(), "attached_assets", "uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/attached_assets/uploads", express.static(uploadsPath));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Wrapper function to initialize routes and static serving
export async function initApp() {
  const { setupDatabase } = await import("./db.js");
  await setupDatabase();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  if (isProduction) {
    serveStatic(app);
  } else {
    try {
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
    } catch (e) {
      // Vite might not be available in production/serverless environment
      log("Vite setup skipped or failed");
    }
  }
  
  return { app, httpServer };
}

// Default export for serverless-http
export default app;
