import { and, desc, eq, gte, lte } from "drizzle-orm";
import { cashRegisters, cashRegisterMovements, payments, saleItems, sales, users } from "../shared/schema.js";
import { db } from "./db.js";

function parseDate(value: unknown, endOfDay = false) {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (!value.includes("T")) {
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }
  return date;
}

function sumType(movements: any[], type: string) {
  return movements.filter((m) => m.type === type).reduce((sum, m) => sum + Number(m.amount || 0), 0);
}

export function registerCashRegisterReports(app: any, isAuthenticated: any) {
  app.get("/api/cash-control/reports/history", isAuthenticated, async (req: any, res: any) => {
    try {
      const startDate = parseDate(req.query?.start);
      const endDate = parseDate(req.query?.end, true);
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(cashRegisters.openedAt, startDate));
      if (endDate) conditions.push(lte(cashRegisters.openedAt, endDate));

      const registers = await db.select().from(cashRegisters)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(cashRegisters.openedAt));

      const result = await Promise.all(registers.map(async (register: any) => {
        const movements = await db.select().from(cashRegisterMovements)
          .where(eq(cashRegisterMovements.cashRegisterId, register.id))
          .orderBy(cashRegisterMovements.createdAt);
        const registerSales = await db.select().from(sales)
          .where(eq(sales.cashRegisterId, register.id))
          .orderBy(sales.createdAt);
        const detailedSales = await Promise.all(registerSales.map(async (sale: any) => {
          const [items, salePayments] = await Promise.all([
            db.select().from(saleItems).where(eq(saleItems.saleId, sale.id)),
            db.select().from(payments).where(eq(payments.saleId, sale.id)),
          ]);
          return { ...sale, items, payments: salePayments };
        }));
        const [operator] = await db.select().from(users).where(eq(users.id, register.userId)).limit(1);
        const completedSales = registerSales.filter((sale: any) => sale.status === "completed");
        let cashSales = 0;
        let cardSales = 0;
        let pixSales = 0;
        let otherSales = 0;
        for (const sale of detailedSales.filter((item: any) => item.status === "completed")) {
          for (const payment of sale.payments) {
            const value = Number(payment.amount || 0);
            if (payment.method === "cash") cashSales += value;
            else if (payment.method === "card") cardSales += value;
            else if (payment.method === "pix") pixSales += value;
            else otherSales += value;
          }
        }
        const replenishments = sumType(movements, "replenishment");
        const withdrawals = sumType(movements, "withdrawal");
        const adjustments = sumType(movements, "adjustment");
        const expectedAmount = Number(register.openingAmount || 0) + cashSales + replenishments - withdrawals + adjustments;

        return {
          ...register,
          operator: operator ? { id: operator.id, username: operator.username, role: operator.role } : null,
          movements,
          sales: detailedSales,
          summary: {
            openingAmount: Number(register.openingAmount || 0),
            cashSales,
            cardSales,
            pixSales,
            otherSales,
            replenishments,
            withdrawals,
            adjustments,
            completedSales: completedSales.length,
            cancelledSales: registerSales.filter((sale: any) => sale.status === "cancelled").length,
            simulations: registerSales.filter((sale: any) => sale.status === "simulation").length,
            expectedAmount,
            closingAmount: register.closingAmount == null ? null : Number(register.closingAmount),
            difference: register.difference == null ? null : Number(register.difference),
          },
        };
      }));

      res.json(result);
    } catch (error: any) {
      console.error("[RELATORIOS][CAIXA] Erro ao montar histórico completo:", error);
      res.status(500).json({ message: error?.message || "Erro ao carregar histórico completo dos caixas." });
    }
  });
}
