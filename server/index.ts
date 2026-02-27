import { initApp, log } from "./app";

console.log("VERCEL_ENV:", process.env.VERCEL_ENV);

(async () => {
  const { httpServer } = await initApp();
  
  const port = parseInt(process.env.PORT || "5000", 10);
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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
  }
})();
