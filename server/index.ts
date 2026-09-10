import { initApp, log } from "./app";
import { exec } from "child_process";

console.log("VERCEL_ENV:", process.env.VERCEL_ENV);

(async () => {
  const { httpServer } = await initApp();

  const port = parseInt(process.env.PORT || "5005", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  const url = `http://localhost:${port}`;
  let command = "";

  if (process.platform === "darwin") {
    command = `open "${url}"`;
  } else if (process.platform === "win32") {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.warn(`Não foi possível abrir o browser automaticamente: ${err.message}`);
    }
  });
})();
