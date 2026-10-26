import assert from "node:assert/strict";
import { eq, or } from "drizzle-orm";
import { setupDatabase, dbRemote, dbLocal } from "../server/db.js";
import { storage } from "../server/storage.js";
import { cashRegisterMovements, cashRegisters, payments, saleItems, sales, transactions } from "../shared/schema.js";

if (dbRemote) {
  throw new Error("Este teste usa SQLite local isolado e se recusa a executar contra uma conexão Turso configurada.");
}
await setupDatabase();

const userId = 8_000_000 + Math.floor(Math.random() * 1_000_000);
let registerId: number | undefined;
let saleId: number | undefined;

try {
  const register = await storage.openCashRegister({
    userId,
    openingAmount: 1000,
    status: "open",
    openedAt: new Date(),
  } as any);
  registerId = register.id;
  assert.ok(registerId, "register should be created");

  let summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.expectedAmount, 1000, "opening amount must be the initial expected cash");

  await storage.createCashRegisterMovement(registerId, userId, "replenishment", 500, "Teste automatizado: reposição");
  await storage.createCashRegisterMovement(registerId, userId, "withdrawal", 200, "Teste automatizado: sangria");
  await storage.createCashRegisterMovement(registerId, userId, "adjustment", 100, "Teste automatizado: ajuste positivo");
  summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.expectedAmount, 1400, "replenishment, withdrawal and adjustment must reconcile");

  await assert.rejects(
    storage.createCashRegisterMovement(registerId, userId, "withdrawal", 1401, "Teste automatizado: sangria inválida"),
    /saldo disponível/,
    "withdrawal above available cash must be rejected",
  );

  const sale = await storage.createSale(
    {
      cashRegisterId: registerId,
      userId,
      totalAmount: 2000,
      status: "completed",
      fiscalStatus: "none",
      createdAt: new Date(),
    } as any,
    [{
      itemType: "service",
      itemId: 987654321,
      quantity: 1,
      unitPrice: 2000,
      totalPrice: 2000,
      unitType: "unit",
    }] as any,
    [{
      method: "cash",
      amount: 2000,
      createdAt: new Date(),
    }] as any,
  );
  saleId = sale.id;

  summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.cashSales, 2000, "cash payment should increase cash sales");
  assert.equal(summary.expectedAmount, 3400, "sale must reconcile with opening and manual movements");

  await storage.cancelSale(saleId);
  summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.cashSales, 0, "cancelled sale must no longer count as cash income");
  assert.equal(summary.expectedAmount, 1400, "cancelling a cash sale must reverse the expected register balance");

  const transactionsBeforeRepeat = await storage.getTransactions({});
  const reversalCountBeforeRepeat = transactionsBeforeRepeat.filter((t: any) =>
    t.description === `ESTORNO: Venda PDV #${saleId} CANCELADA`
  ).length;
  await storage.cancelSale(saleId);
  const transactionsAfterRepeat = await storage.getTransactions({});
  const reversalCountAfterRepeat = transactionsAfterRepeat.filter((t: any) =>
    t.description === `ESTORNO: Venda PDV #${saleId} CANCELADA`
  ).length;
  assert.equal(reversalCountAfterRepeat, reversalCountBeforeRepeat, "repeated cancellation must not duplicate financial reversal");

  const concurrentCloses = await Promise.allSettled([
    storage.closeCashRegister(registerId, 1400),
    storage.closeCashRegister(registerId, 1400),
  ]);
  assert.equal(concurrentCloses.filter((result) => result.status === "fulfilled").length, 1,
    "exactly one concurrent close should succeed");
  assert.equal(concurrentCloses.filter((result) => result.status === "rejected").length, 1,
    "the competing concurrent close must be rejected");
  const closed = concurrentCloses.find((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")!.value;
  assert.equal(closed.status, "closed", "register should close");
  assert.equal(closed.difference, 0, "closing against expected balance should have zero difference");

  console.log("CASH REGISTER INTEGRATION: PASS (open, replenishment, withdrawal, adjustment, cash sale, cancellation, idempotency, concurrent close)");
} catch (error) {
  console.error("CASH REGISTER INTEGRATION: FAIL", error);
  process.exitCode = 1;
} finally {
  if (saleId !== undefined) {
    await dbLocal.delete(transactions).where(or(
      eq(transactions.description, `Venda PDV #${saleId}`),
      eq(transactions.description, `ESTORNO: Venda PDV #${saleId} CANCELADA`),
    ));
    await dbLocal.delete(payments).where(eq(payments.saleId, saleId));
    await dbLocal.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await dbLocal.delete(sales).where(eq(sales.id, saleId));
  }
  if (registerId !== undefined) {
    await dbLocal.delete(cashRegisterMovements).where(eq(cashRegisterMovements.cashRegisterId, registerId));
    await dbLocal.delete(cashRegisters).where(eq(cashRegisters.id, registerId));
  }
}
