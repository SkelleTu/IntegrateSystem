// PostgreSQL runtime integration test. Use only a dedicated Neon test branch/database.
import assert from "node:assert/strict";
import { eq, or } from "drizzle-orm";
import { setupDatabase, db, isPostgresEnabled } from "../server/db.js";
import { storage } from "../server/storage.js";
import { cashRegisterMovements, cashRegisters, inventory, inventoryLogs, payments, saleItems, sales, transactions } from "../shared/schema.js";

if (!isPostgresEnabled) {
  throw new Error("Este teste exige DATABASE_URL e deve rodar somente contra um banco PostgreSQL/Neon de teste isolado.");
}
await setupDatabase();

const userId = 8_000_000 + Math.floor(Math.random() * 1_000_000);
let registerId: number | undefined;
let saleId: number | undefined;
let inventoryId: number | undefined;

try {
  const concurrentOpens = await Promise.allSettled([
    storage.openCashRegister({
      userId,
      openingAmount: 1000,
      status: "open",
      openedAt: new Date(),
    } as any),
    storage.openCashRegister({
      userId,
      openingAmount: 1000,
      status: "open",
      openedAt: new Date(),
    } as any),
  ]);
  assert.equal(concurrentOpens.filter((result) => result.status === "fulfilled").length, 1,
    "exactly one concurrent opening should succeed for an operator");
  assert.equal(concurrentOpens.filter((result) => result.status === "rejected").length, 1,
    "the competing concurrent opening must be rejected");
  const register = concurrentOpens.find((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")!.value;
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

  const concurrentWithdrawals = await Promise.allSettled([
    storage.createCashRegisterMovement(registerId, userId, "withdrawal", 1000, "Teste automatizado: sangria concorrente A"),
    storage.createCashRegisterMovement(registerId, userId, "withdrawal", 1000, "Teste automatizado: sangria concorrente B"),
  ]);
  assert.equal(concurrentWithdrawals.filter((result) => result.status === "fulfilled").length, 1,
    "only one concurrent withdrawal may spend the same available cash");
  assert.equal(concurrentWithdrawals.filter((result) => result.status === "rejected").length, 1,
    "the competing withdrawal must be rejected when funds are no longer available");
  summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.expectedAmount, 400, "concurrent withdrawals must not drive the expected cash below zero");

  const [testInventory] = await db.insert(inventory).values({
    itemId: 987654321,
    itemType: "product",
    quantity: 2,
    unit: "unit",
    itemsPerUnit: 1,
    costPrice: 500,
    salePrice: 2000,
    updatedAt: new Date(),
  }).returning();
  inventoryId = testInventory.id;

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
      itemType: "product",
      itemId: 10000 + inventoryId,
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
  assert.equal(summary.expectedAmount, 2400, "sale must reconcile with opening and manual movements");
  const [stockAfterSale] = await db.select().from(inventory).where(eq(inventory.id, inventoryId)).limit(1);
  assert.equal(stockAfterSale.quantity, 1, "sale must deduct one unit from inventory");

  await storage.cancelSale(saleId);
  summary = await storage.getCashRegisterSummary(registerId);
  assert.equal(summary.cashSales, 0, "cancelled sale must no longer count as cash income");
  assert.equal(summary.expectedAmount, 400, "cancelling a cash sale must reverse the expected register balance");
  const [stockAfterCancellation] = await db.select().from(inventory).where(eq(inventory.id, inventoryId)).limit(1);
  assert.equal(stockAfterCancellation.quantity, 2, "cancelling a sale must restore inventory");

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
    storage.closeCashRegister(registerId, 400),
    storage.closeCashRegister(registerId, 400),
  ]);
  assert.equal(concurrentCloses.filter((result) => result.status === "fulfilled").length, 1,
    "exactly one concurrent close should succeed");
  assert.equal(concurrentCloses.filter((result) => result.status === "rejected").length, 1,
    "the competing concurrent close must be rejected");
  const closed = concurrentCloses.find((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")!.value;
  assert.equal(closed.status, "closed", "register should close");
  assert.equal(closed.difference, 0, "closing against expected balance should have zero difference");

  console.log("CASH REGISTER INTEGRATION: PASS (concurrent open/withdrawal, replenishment, adjustment, cash sale, stock deduction/restoration, cancellation, idempotency, concurrent close)");
} catch (error) {
  console.error("CASH REGISTER INTEGRATION: FAIL", error);
  process.exitCode = 1;
} finally {
  if (inventoryId !== undefined) {
    await db.delete(inventoryLogs).where(eq(inventoryLogs.inventoryId, inventoryId));
    await db.delete(inventory).where(eq(inventory.id, inventoryId));
  }
  if (saleId !== undefined) {
    await db.delete(transactions).where(or(
      eq(transactions.description, `Venda PDV #${saleId}`),
      eq(transactions.description, `ESTORNO: Venda PDV #${saleId} CANCELADA`),
    ));
    await db.delete(payments).where(eq(payments.saleId, saleId));
    await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await db.delete(sales).where(eq(sales.id, saleId));
  }
  if (registerId !== undefined) {
    await db.delete(cashRegisterMovements).where(eq(cashRegisterMovements.cashRegisterId, registerId));
    await db.delete(cashRegisters).where(eq(cashRegisters.id, registerId));
  }
}
