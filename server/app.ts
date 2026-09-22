import express, { type Express, Request, Response, NextFunction } from "express";
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
} from "./runtimeMonitor";

const app = express();
const httpServer = createServer(app);

// Configurar fuso horário para Brasília
process.env.TZ = "America/Sao_Paulo";

startRuntimeMonitor();
runtimeEvent("server-bootstrap", "Servidor começando a inicialização", {
  phase: "server",
  progress: 5,
});

// Serve attached assets/uploads
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

// Configuração de proxy e caminhos públicos
app.set("trust proxy", 1);

app.use((req, res, next) => {
  // Ajuste de Headers para evitar bloqueios de conexão
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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
    });

    if (requestPath.startsWith("/api")) {
      log(`${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Eventos enviados pela interface Electron/renderer.
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
    ...data,
  });

  res.json({ ok: true });
});

app.get("/api/runtime/status", (_req: Request, res: Response) => {
  res.json(getRuntimeStatus());
});

// Wrapper function to initialize routes and static serving
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

    runtimeEvent("routes-ready", "Rotas da aplicação registradas", {
      phase: "initialization",
      progress: 55,
    });

    // Statuso leve do backup do Google Drive para a barra inferior.
    // Não expõe caminho local nem informações sensíveis.
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

    return { app, httpServer };
  } catch (error) {
    runtimeError(error, "Falha crítica durante a inicialização do servidor", {
      phase: "initialization",
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

// Default export for serverless-http
export default app;
