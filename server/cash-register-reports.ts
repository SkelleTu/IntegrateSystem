import { and, desc, eq, gte, lte } from "drizzle-orm";
import { cashRegisters, cashRegisterMovements, payments, saleItems, sales, users, menuItems, products, batches, inventory } from "../shared/schema.js";
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

function paymentDisplayMethod(method: string) {
  if (method === "cash") return "Dinheiro";
  if (method === "pix") return "PIX";
  if (method === "card_debit") return "Cartão • Débito";
  if (method === "card_credit") return "Cartão • Crédito";
  if (method === "card") return "Cartão • Tipo não informado";
  return method;
}

async function enrichSaleItem(item: any) {
  const batchId = item.itemType === "product" && item.itemId >= 500000 ? item.itemId - 500000 : null;
  if (batchId !== null) {
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
    if (batch) {
      const [product] = await db.select().from(products).where(eq(products.id, batch.productId)).limit(1);
      const unitType = product?.unit === "kg" ? "kg" : "unit";
      return {
        ...item,
        fiscal: {
          name: batch.variantName ? `${product?.name || `Produto ${batch.productId}`} – ${batch.variantName}` : (product?.name || `Produto ${batch.productId}`),
          barcode: batch.barcode ?? null,
          sku: batch.sku ?? null,
          codigoProduto: product?.codigoProduto ?? null,
          ncm: product?.ncm ?? null,
          cfop: product?.cfop ?? null,
          icmsOrigem: 0,
          icmsSituacaoTributaria: "400",
          unitType,
          batchNumber: batch.batchNumber ?? null,
          supplier: batch.supplier ?? null,
          manufactureDate: batch.manufactureDate ?? null,
          expiryDate: batch.expiryDate ?? null,
          quantity: unitType === "kg" ? Number(item.quantity) / 1000 : Number(item.quantity),
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
        },
      };
    }
  }

  if (item.itemType === "product") {
    const [product] = await db.select().from(products).where(eq(products.id, item.itemId)).limit(1);
    if (product) {
      return {
        ...item,
        fiscal: {
          name: product.name,
          barcode: null,
          sku: null,
          codigoProduto: product.codigoProduto ?? null,
          ncm: product.ncm ?? null,
          cfop: product.cfop ?? null,
          icmsOrigem: 0,
          icmsSituacaoTributaria: "400",
          unitType: product.unit === "kg" ? "kg" : "unit",
          batchNumber: null,
          supplier: null,
          manufactureDate: null,
          expiryDate: null,
          quantity: product.unit === "kg" ? Number(item.quantity) / 1000 : Number(item.quantity),
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
        },
      };
    }
  }

  const [menu] = await db.select().from(menuItems).where(eq(menuItems.id, item.itemId)).limit(1);
  if (menu) {
    return {
      ...item,
      fiscal: {
        name: menu.name,
        barcode: menu.barcode ?? null,
        sku: null,
        codigoProduto: menu.codigoProduto ?? null,
        ncm: menu.ncm ?? null,
        cfop: menu.cfop ?? null,
        icmsOrigem: menu.icmsOrigem ?? 0,
        icmsSituacaoTributaria: menu.icmsSituacaoTributaria ?? "400",
        unitType: menu.unitType === "kg" ? "kg" : "unit",
        batchNumber: null,
        supplier: null,
        manufactureDate: null,
        expiryDate: null,
        quantity: menu.unitType === "kg" ? Number(item.quantity) / 1000 : Number(item.quantity),
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
      },
    };
  }

  const [legacy] = await db.select().from(inventory).where(eq(inventory.id, Math.max(0, Number(item.itemId) - 10000))).limit(1);
  return {
    ...item,
    fiscal: {
      name: legacy?.customName || `Item ${item.itemId}`,
      barcode: legacy?.barcode ?? null,
      sku: null,
      codigoProduto: null,
      ncm: null,
      cfop: null,
      icmsOrigem: 0,
      icmsSituacaoTributaria: "400",
      unitType: legacy?.unit === "kg" ? "kg" : "unit",
      batchNumber: null,
      supplier: null,
      manufactureDate: null,
      expiryDate: legacy?.expiryDate ?? null,
      quantity: legacy?.unit === "kg" ? Number(item.quantity) / 1000 : Number(item.quantity),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
    },
  };
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
          const fiscalItems = await Promise.all(items.map(enrichSaleItem));
          const detailedPayments = salePayments.map((payment: any) => ({
            ...payment,
            displayMethod: paymentDisplayMethod(payment.method),
            cardType: payment.method === "card_credit" ? "credit" : payment.method === "card_debit" ? "debit" : null,
          }));
          return { ...sale, items: fiscalItems, payments: detailedPayments };
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
            else if (payment.method === "card" || payment.method === "card_debit" || payment.method === "card_credit") cardSales += value;
            else if (payment.method === "pix") pixSales += value;
            else otherSales += value;
          }
        }
        const replenishments = sumType(movements, "replenishment");
        const withdrawals = sumType(movements, "withdrawal");
        const adjustments = sumType(movements, "adjustment");
        const expectedAmount = Number(register.openingAmount || 0) + cashSales + replenishments - withdrawals + adjustments;

        // Mantém a compatibilidade com a tabela atual do frontend, mas entrega os detalhes fiscais em cada item.
        const reportSales = detailedSales.map((sale: any) => ({
          ...sale,
          items: sale.items.map((item: any) => ({
            ...item,
            itemType: `${item.itemType} • ${item.fiscal?.name || "Produto"} • NCM: ${item.fiscal?.ncm || "—"} • CFOP: ${item.fiscal?.cfop || "—"} • Cód.: ${item.fiscal?.codigoProduto || item.fiscal?.sku || item.fiscal?.barcode || "—"} • ${item.fiscal?.unitType === "kg" ? "KG" : "UN"} • Unit.: ${((Number(item.unitPrice || 0)) / 100).toFixed(2)} • Total: ${((Number(item.totalPrice || 0)) / 100).toFixed(2)}`,
          })),
          payments: sale.payments.map((payment: any) => ({
            ...payment,
            method: payment.displayMethod,
          })),
        }));

        return {
          ...register,
          operator: operator ? { id: operator.id, username: operator.username, role: operator.role } : null,
          movements,
          sales: reportSales,
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
