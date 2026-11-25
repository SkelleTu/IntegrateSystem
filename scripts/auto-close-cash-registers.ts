import { storage } from "../server/storage.js";

async function main() {
  const closed = await storage.autoCloseExpiredCashRegisters(new Date());
  console.log("[CASH_REGISTER_AUTO_CLOSE] " + closed.length + " caixa(s) encerrado(s) automaticamente.");
  for (const register of closed) {
    console.log("[CASH_REGISTER_AUTO_CLOSE] Caixa #" + register.id + " fechado em " + register.closedAt?.toISOString() + " (" + (register.timezone || "America/Sao_Paulo") + ") — revisão pendente.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[CASH_REGISTER_AUTO_CLOSE] Falha:", error);
    process.exit(1);
  });
