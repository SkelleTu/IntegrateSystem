import {
  installConsoleCapture,
  runtimeError,
  runtimeEvent,
  stopRuntimeMonitor,
} from "./runtimeMonitor";

installConsoleCapture();

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

process.once("SIGINT", () => {
  runtimeEvent("signal", "Servidor recebeu SIGINT", { phase: "shutdown" });
  stopRuntimeMonitor("Servidor encerrado por SIGINT");
});

process.once("SIGTERM", () => {
  runtimeEvent("signal", "Servidor recebeu SIGTERM", { phase: "shutdown" });
  stopRuntimeMonitor("Servidor encerrado por SIGTERM");
});

(async () => {
  try {
    runtimeEvent("server-start", "Processo Node do servidor iniciado", {
      phase: "server",
      progress: 0,
    });

    const { initApp, log, httpServer } = await import("./app");
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
    httpServer.listen(
      { port, host: "0.0.0.0", reusePort: true },
      () => {
        log(`serving on port ${port}`);
        runtimeEvent("server-listening", `Servidor ouvindo na porta ${port}`, {
          phase: "server",
          progress: 20,
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
    process.exitCode = 1;
  }
})();
