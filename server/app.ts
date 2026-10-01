import express, { type Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { startGoogleDriveBackupScheduler, getGoogleDriveBackupStatus } from "./googleDriveBackup";
import {
  getRuntimeStatus,
  runtimeError,
  runtimeEvent,
  startRuntimeMonitor,
  installConsoleCapture,
} from "./runtimeMonitor";
import { supremeOperatorMiddleware } from "./supreme-operator";
import { registerMcpOAuth } from "./mcp-oauth";
import { registerAuraDirectMcp } from "./direct-mcp";
import { registerMcpCompatibilityController, runMcpCompatibilityCheck } from "./mcp-compatibility-controller";

const app = express();
const httpServer = createServer(app);

process.env.TZ = "America/Sao_Paulo";

startRuntimeMonitor();
installConsoleCapture();
runtimeEvent("server-bootstrap", "Servidor começando a inicialização", {
  phase: "server",
  progress: 5,
});

const uploadsPath = process.env.VERCEL
  ? path.join("/tmp", "uploads")
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
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-Trace-Id, X-Request-Id, X-Aurora-Operator-Mode",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// O gateway Aurora/Universal pode transportar a correlação ponta a ponta.
// O IntegrateSystem preserva os IDs e cria novos apenas quando necessário.
app.use((req, res, next) => {
  const traceId = req.get("x-trace-id")?.trim() || randomUUID();
  const requestId = req.get("x-request-id")?.trim() || randomUUID();

  res.setHeader("X-Trace-Id", traceId);
  res.setHeader("X-Request-Id", requestId);

  res.locals.traceId = traceId;
  res.locals.requestId = requestId;

  runtimeEvent("request-correlation", `${req.method} ${req.path}`, {
    phase: "http",
    traceId,
    requestId,
  });

  next();
});

// O nível Supremo é o único modo operacional ativo inicialmente.
// A política fica centralizada e os IDs continuam disponíveis para auditoria.
app.use(supremeOperatorMiddleware);
registerMcpOAuth(app);
registerAuraDirectMcp(app);
registerMcpCompatibilityController(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
  runtimeEvent("server-log", message, { source });
}

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    runtimeEvent("http-request", `${req.method} ${requestPath}`, {
      phase: "http",
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.getHeader("content-length") || null,
      traceId: res.locals.traceId || null,
      requestId: res.locals.requestId || null,
      operatorMode: res.locals.operatorMode || null,
    });

    if (requestPath.startsWith("/api") && requestPath !== "/api/runtime/event") {
      log(`${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`, "express");
    }
  });

  next();
});

app.post("/api/runtime/event", (req: Request, res: Response) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const event = typeof body.event === "string" ? body.event.slice(0, 200) : "renderer-event";
  const message =
    typeof body.message === "string" ? body.message.slice(0, 2000) : "Evento recebido do Electron";
  const data =
    body.data && typeof body.data === "object"
      ? body.data
      : {};

  runtimeEvent(event, message, {
    phase: "electron",
    source: "electron",
    traceId: res.locals.traceId || null,
    requestId: res.locals.requestId || null,
    operatorMode: res.locals.operatorMode || null,
    ...data,
  });

  res.json({ ok: true });
});

app.get("/api/runtime/status", (_req: Request, res: Response) => {
  res.json({
    ...getRuntimeStatus(),
    operatorMode: res.locals.operatorMode || "supreme",
    traceId: res.locals.traceId || null,
    requestId: res.locals.requestId || null,
  });
});

export async function initApp() {
  try {
    runtimeEvent("database-init", "Iniciando banco de dados", {
      phase: "initialization",
      progress: 10,
    });

    const { setupDatabase } = await import("./db");
    await setupDatabase();

    runtimeEvent("database-ready", "Banco de dados inicializado", {
      phase: "initialization",
      progress: 25,
    });

    startGoogleDriveBackupScheduler();

    runtimeEvent("backup-scheduler-ready", "Agendador de backup inicializado", {
      phase: "initialization",
      progress: 30,
    });

    await registerRoutes(httpServer, app);

    void runMcpCompatibilityCheck("startup");

    runtimeEvent("routes-ready", "Rotas da aplicação registradas", {
      phase: "initialization",
      progress: 55,
    });

    app.get("/api/google-drive/status", (_req: Request, res: Response) => {
      const status = getGoogleDriveBackupStatus();
      res.json(status);
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      runtimeError(err, "Erro do servidor ao processar uma requisição", {
        phase: "http",
        statusCode: status,
        traceId: res.locals.traceId || null,
        requestId: res.locals.requestId || null,
        operatorMode: res.locals.operatorMode || null,
      });

      res.status(status).json({ message });
    });

    const isProduction =
      process.env.NODE_ENV === "production" || !!process.env.VERCEL;

    if (isProduction) {
      runtimeEvent("static-ready", "Serviço de arquivos estáticos preparado", {
        phase: "initialization",
        progress: 80,
      });
      serveStatic(app);
    } else {
      try {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
        runtimeEvent("vite-ready", "Vite preparado para desenvolvimento", {
          phase: "initialization",
          progress: 80,
        });
      } catch (e) {
        runtimeError(e, "Vite setup skipped or failed", {
          phase: "initialization",
        });
      }
    }

    runtimeEvent("server-app-ready", "Aplicação do servidor pronta para escutar", {
      phase: "server",
      progress: 90,
    });

    const universalServerUrl = (process.env.UNIVERSAL_SERVER_URL || "https://universal-server1.onrender.com").replace(/\/$/, "");
    app.get("/api/universal/status", async (req: Request, res: Response) => {
      const startedAt = Date.now();
      try {
        const response = await fetch(universalServerUrl + "/api/healthz", {
          headers: {
            Accept: "application/json",
            "X-Trace-Id": res.locals.traceId,
            "X-Request-Id": res.locals.requestId,
            "X-Aurora-Operator-Mode": res.locals.operatorMode || "supreme",
          },
          signal: AbortSignal.timeout(8000),
        });
        const body = await response.json().catch(() => null);
        res.status(response.ok ? 200 : 503).json({
          connected: response.ok,
          url: universalServerUrl,
          latencyMs: Date.now() - startedAt,
          statusCode: response.status,
          traceId: res.locals.traceId,
          requestId: res.locals.requestId,
          operatorMode: res.locals.operatorMode || "supreme",
          universal: body,
        });
      } catch (error: any) {
        res.status(503).json({
          connected: false,
          url: universalServerUrl,
          latencyMs: Date.now() - startedAt,
          traceId: res.locals.traceId,
          requestId: res.locals.requestId,
          operatorMode: res.locals.operatorMode || "supreme",
          error: error?.message || String(error),
        });
      }
    });

    return { app, httpServer };
  } catch (error) {
    runtimeError(error, "Falha crítica durante a inicialização do servidor", {
      phase: "initialization",
      traceId: undefined,
      requestId: undefined,
    });
    throw error;
  }
}

process.on("uncaughtException", (error) => {
  runtimeError(error, "uncaughtException no servidor");
});

process.on("unhandledRejection", (reason) => {
  runtimeError(reason, "unhandledRejection no servidor");
});

export default app;
