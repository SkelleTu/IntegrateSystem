import { initApp, log } from "./app";
import { runtimeError, runtimeEvent, stopRuntimeMonitor } from "./runtimeMonitor";

console.log("VERCEL_ENV:", process.env.VERCEL_ENV);

(async () => {
  try {
    runtimeEvent("server-start", "Processo Node do servidor iniciado", {
      phase: "server",
      progress: 0,
    });

    const { httpServer } = await initApp();

    const port = parseInt(process.env.PORT || "5010", 10);
    httpServer.on("error", (error) => {
      runtimeError(error, "Erro no servidor HTTP", {
        phase: "server",
        port,
      });
    });

    httpServer.on("close", () => {
      runtimeEvent("http-server-close", "Servidor HTTP encerrado", {
        phase: "shutdown",
        progress: 100,
      });
    });

    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
        runtimeEvent("server-listening", `Servidor ouvindo na porta ${port}`, {
          phase: "server",
          progress: 100,
          port,
        });
      },
    );
  } catch (error) {
    runtimeError(error, "Falha fatal ao iniciar o servidor");
    process.exitCode = 1;
  }
})();
\nprocess.once("SIGINT", () => {
  runtimeEvent("signal", "Servidor recebeu SIGINT", { phase: "shutdown" });
  stopRuntimeMonitor("Servidor encerrado por SIGINT");
});

process.once("SIGTERM", () => {
  runtimeEvent("signal", "Servidor recebeu SIGTERM", { phase: "shutdown" });
  stopRuntimeMonitor("Servidor encerrado por SIGTERM");
});
