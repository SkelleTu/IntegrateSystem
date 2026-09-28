import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { runtimeEvent } from "./runtimeMonitor";

export function supremeOperatorMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = req.get("x-trace-id")?.trim() || randomUUID();
  const requestId = req.get("x-request-id")?.trim() || randomUUID();
  const mode = req.get("x-aurora-operator-mode")?.trim().toLowerCase() || "supreme";
  const activeMode = (process.env.AURORA_OPERATOR_MODE || "supreme").trim().toLowerCase() || "supreme";

  res.setHeader("X-Trace-Id", traceId);
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Aurora-Operator-Mode", activeMode);

  res.locals.traceId = traceId;
  res.locals.requestId = requestId;
  res.locals.operatorMode = activeMode;

  runtimeEvent("supreme-operator-request", `${req.method} ${req.path}`, {
    phase: "operator",
    traceId,
    requestId,
    requestedMode: mode,
    activeMode,
  });

  if (mode !== activeMode) {
    res.status(403).json({
      ok: false,
      error: "Aurora operator mode is not permitted",
      requestedMode: mode,
      activeMode,
      traceId,
      requestId,
    });
    return;
  }

  next();
}
