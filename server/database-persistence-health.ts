import fs from "fs";
import { sql } from "drizzle-orm";
import { db, isRemoteEnabled } from "./db.js";
import { ensureRuntimeDataDir, getRuntimeSqliteFile } from "./runtime-data.js";

ensureRuntimeDataDir();
const sqliteFile = getRuntimeSqliteFile();

export function registerDatabasePersistenceHealth(app: any, isAuthenticated: any) {
  app.get("/api/system/persistence-health", isAuthenticated, async (_req: any, res: any) => {
    try {
      const tables = ["cash_register", "cash_register_movements", "sales", "sale_items", "payments", "transactions", "inventory", "products", "batches"];
      const counts: Record<string, number> = {};
      for (const table of tables) {
        const result: any = await db.execute(sql.raw(`SELECT COUNT(*) AS count FROM "${table}"`));
        const row = result?.rows?.[0];
        counts[table] = Number(row?.count ?? row?.["COUNT(*)"] ?? 0);
      }
      const localStat = fs.existsSync(sqliteFile) ? fs.statSync(sqliteFile) : null;
      res.json({
        ok: true,
        backend: isRemoteEnabled ? "turso+sqlite-mirror" : "sqlite-local",
        remoteEnabled: isRemoteEnabled,
        sqliteFile,
        localFile: {
          exists: !!localStat,
          sizeBytes: localStat?.size ?? 0,
          modifiedAt: localStat?.mtime?.toISOString() ?? null,
        },
        counts,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[DB][HEALTH] Falha no diagnostico de persistencia:", error);
      res.status(500).json({ ok: false, message: error?.message || "Falha ao verificar persistência." });
    }
  });
}
