import { Router } from "express";
import { clearAuroraDiagnostics, getAuroraDiagnostics, recordAuroraEvent } from "./aurora-diagnostics";

export function createAuroraDiagnosticsRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ ok: true, diagnostics: getAuroraDiagnostics() });
  });

  router.get("/:traceId", (req, res) => {
    const diagnostics = getAuroraDiagnostics(req.params.traceId);
    if (!diagnostics) return res.status(404).json({ ok: false, error: "Trace não encontrada" });
    return res.json({ ok: true, diagnostics });
  });

  router.post("/event", (req, res) => {
    const event = req.body;
    if (!event || typeof event.event !== "string") {
      return res.status(400).json({ ok: false, error: "event é obrigatório" });
    }
    return res.status(202).json({ ok: true, result: recordAuroraEvent(event) });
  });

  router.delete("/", (_req, res) => {
    clearAuroraDiagnostics();
    res.json({ ok: true });
  });

  return router;
}
