import { and, desc, eq } from "drizzle-orm";
import { cashRegisterMovements, cashRegisters, transactions } from "../shared/schema.js";
import { db, multiWrite } from "./db.js";

/**
 * Integra operações administrativas do Caixa ao Financeiro sem criar outro
 * estado para o Caixa. O módulo canônico continua sendo cash-control.
 */
export function installCashFinanceBridge(app: any, isAuthenticated: any) {
  app.use("/api/cash-control", isAuthenticated, (req: any, res: any, next: any) => {
    const operation = req.path;
    if (req.method !== "POST" || (operation !== "/open" && operation !== "/close")) {
      return next();
    }

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      void syncCashFinancialRecord(req, operation).catch((error) => {
        console.error("[CAIXA][FINANCEIRO] Falha ao refletir operação administrativa:", error);
      });
    });

    next();
  });
}

async function syncCashFinancialRecord(req: any, operation: string) {
  const user = req.user as any;
  if (!user?.id) return;

  if (operation === "/open") {
    const openingAmount = Math.round(Number(req.body?.openingAmount || 0) * 100);
    if (!Number.isFinite(openingAmount) || openingAmount < 0) return;

    const [register] = await db.select().from(cashRegisters)
      .where(eq(cashRegisters.userId, user.id))
      .orderBy(desc(cashRegisters.openedAt))
      .limit(1);
    if (!register) return;

    const description = `Abertura de Caixa #${register.id}`;
    const [existing] = await db.select().from(transactions)
      .where(and(eq(transactions.category, "caixa"), eq(transactions.description, description)))
      .limit(1);
    if (existing) return;

    await multiWrite(async (database: any) => {
      await database.insert(transactions).values({
        businessType: "padaria",
        type: "cash",
        category: "caixa",
        description,
        amount: openingAmount,
        createdAt: new Date(register.openedAt || new Date()),
      } as any);
    });
    return;
  }

  const registerId = Number(req.body?.registerId);
  const [register] = await db.select().from(cashRegisters)
    .where(registerId ? eq(cashRegisters.id, registerId) : eq(cashRegisters.userId, user.id))
    .orderBy(desc(cashRegisters.closedAt))
    .limit(1);
  if (!register?.closedAt) return;

  const observation = String(req.body?.observation || "").trim();
  const description = `Fechamento de Caixa #${register.id}${observation ? ` — ${observation}` : ""}`;
  const [existing] = await db.select().from(transactions)
    .where(and(eq(transactions.category, "caixa"), eq(transactions.description, description)))
    .limit(1);
  if (existing) return;

  const closingAmount = Number(register.closingAmount || 0);
  await multiWrite(async (database: any) => {
    await database.insert(transactions).values({
      businessType: "padaria",
      type: "cash",
      category: "caixa",
      description,
      amount: closingAmount,
      createdAt: new Date(register.closedAt || new Date()),
    } as any);

    if (observation) {
      const [closingMovement] = await database.select().from(cashRegisterMovements)
        .where(and(eq(cashRegisterMovements.cashRegisterId, register.id), eq(cashRegisterMovements.type, "closing")))
        .orderBy(desc(cashRegisterMovements.createdAt))
        .limit(1);
      if (closingMovement) {
        await database.update(cashRegisterMovements)
          .set({ reason: `Fechamento administrativo — ${observation}` })
          .where(eq(cashRegisterMovements.id, closingMovement.id));
      }
    }
  });
}
