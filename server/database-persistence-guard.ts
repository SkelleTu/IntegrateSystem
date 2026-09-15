import { isRemoteEnabled } from "./db.js";

export function assertProductionPersistence() {
  const production = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  if (production && !isRemoteEnabled) {
    throw new Error("PERSISTENCIA DE PRODUÇÃO NÃO CONFIGURADA: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN são obrigatórios para manter os dados após reinícios da instância.");
  }
}
