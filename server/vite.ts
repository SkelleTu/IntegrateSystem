import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      host: "localhost",
      port: 5010,
      clientPort: 5010,
      protocol: "ws" as const,
      path: "/vite-hmr",
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Em desenvolvimento, um erro de transformação/HMR não pode derrubar
        // o servidor Express inteiro. O erro continua sendo exibido pelo Vite,
        // enquanto o backend permanece acessível para diagnóstico e recuperação.
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  const clientTemplate = path.resolve(
    import.meta.dirname,
    "..",
    "client",
    "index.html",
  );

  let cachedTemplate: string | null = null;

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      if (!cachedTemplate) {
        cachedTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
      }

      const page = await vite.transformIndexHtml(url, cachedTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
