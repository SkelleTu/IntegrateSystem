import type { Server } from "node:http";

import {
  installConsoleCapture,
  runtimeError,
  runtimeEvent,
  stopRuntimeMonitor,
} from "./runtimeMonitor";

installConsoleCapture();

let activeHttpServer: Server | undefined;

const shutdown = (signal: "SIGINT" | "SIGTERM") => {
  runtimeEvent("signal", `Servidor recebeu ${signal}`, { phase: "shutdown" });
  stopRuntimeMonitor(`Servidor encerrando por ${signal}`);
  if (activeHttpServer?.listening) {
    activeHttpServer.close(() => process.exit(0));
    const forcedExit = setTimeout(() => process.exit(1), 10_000);
    forcedExit.unref();
  } else {
    process.exit(0);
  }
};

console.log("VERCEL_ENV:", process.env.VERCEL_ENV);

process.on("warning", (warning) => {
  runtimeError(warning, "Warning emitido pelo Node.js", {
    phase: "node",
    warningName: warning.name,
  });
});

process.on("beforeExit", (code) => {
  runtimeEvent("before-exit", `Processo Node entrando em beforeExit (code ${code})`, {
    phase: "shutdown",
    exitCode: code,
  });
  stopRuntimeMonitor(`Servidor encerrando via beforeExit (code ${code})`);
});

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
const utilityParentPort = (process as any).parentPort;
utilityParentPort?.on("message", (event: any) => {
  const message = event?.data;
  if (message && typeof message === "object" && message.type === "AURA_SHUTDOWN") {
    shutdown("SIGTERM");
  }
});

(async () => {
  try {
    runtimeEvent("server-start", "Processo Node do servidor iniciado", {
      phase: "server",
      progress: 0,
    });

    const { initApp, log, httpServer } = await import("./app");
    activeHttpServer = httpServer;
    const port = parseInt(process.env.PORT || "5010", 10);

    httpServer.on("error", (error) => {
      runtimeError(error, "Erro no servidor HTTP", { phase: "server", port });
      console.error("[SERVER] HTTP listener error:", error);
    });

    httpServer.on("close", () => {
      runtimeEvent("http-server-close", "Servidor HTTP encerrado", {
        phase: "shutdown",
        progress: 100,
      });
    });

    // Open the port immediately so Render can detect the service while the
    // remote database is initializing. /health remains 503 until initApp finishes.
    const host = process.env.AURA_BIND_HOST || "0.0.0.0";
    const listenOptions: { port: number; host: string; reusePort?: boolean } = { port, host };
    if (process.env.AURA_DESKTOP_LOCAL !== "1") listenOptions.reusePort = true;

    httpServer.listen(
      listenOptions,
      () => {
        log(`serving on ${host}:${port}`);
        runtimeEvent("server-listening", `Servidor ouvindo em ${host}:${port}`, {
          phase: "server",
          progress: 20,
          host,
          port,
        });
      },
    );

    await initApp();

    void import("./mcp-compatibility-controller").then(
      ({ startMcpCompatibilityLoop }) => startMcpCompatibilityLoop(),
    ).catch((error) => {
      runtimeError(error, "Falha ao iniciar o loop de compatibilidade MCP");
      console.error("[MCP] Compatibility loop failed to start:", error);
    });
  } catch (error) {
    runtimeError(error, "Falha fatal ao iniciar o servidor");
    console.error("[BOOT] Fatal startup error:", error);
    if (activeHttpServer?.listening) {
      activeHttpServer.close(() => process.exit(1));
      const forcedExit = setTimeout(() => process.exit(1), 10_000);
      forcedExit.unref();
    } else {
      process.exit(1);
    }
  }
})();
