import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerCashRegisterControl, startCashRegisterControl } from "./cash-register-control";
import { registerCashAudit } from "./cash-audit";
import { installLegacyCashGuards } from "./legacy-cash-guard";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import fs from "fs";

const app = express();
const httpServer = createServer(app);

process.env.TZ = 'America/Sao_Paulo';

const uploadsPath = process.env.VERCEL ? path.join('/tmp', "uploads") : path.join(process.cwd(), "attached_assets", "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use("/attached_assets/uploads", express.static(uploadsPath));

declare module "http" { interface IncomingMessage { rawBody: unknown; } }

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let line = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(line);
    }
  });
  next();
});

export async function initApp() {
  const { setupDatabase } = await import("./db");
  await setupDatabase();
  installLegacyCashGuards(app);
  await registerRoutes(httpServer, app);
  const auth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };
  registerCashRegisterControl(app, auth);
  await registerCashAudit(app, auth);
  await startCashRegisterControl();
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  if (isProduction) serveStatic(app);
  else {
    try { const { setupVite } = await import("./vite"); await setupVite(httpServer, app); }
    catch { log("Vite setup skipped or failed"); }
  }
  return { app, httpServer };
}

export default app;
