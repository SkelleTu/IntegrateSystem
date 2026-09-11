import { eq, and, isNull, desc } from "drizzle-orm";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { db, dbRemote, localSqlite, multiWrite, getAllDatabases } from "./db.js";
import { cashRegisters, sales, payments, transactions, users } from "../shared/schema.js";

const scryptAsync = promisify(scrypt);

const cashRegisterMovements = sqliteTable("cash_register_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cashRegisterId: integer("cash_register_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // opening, replenishment, withdrawal, adjustment, closing
  amount: integer("amount").notNull(), // cents; closing stores the physically informed amount
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

const AUTO_CLOSE_INTERVAL_MS = 30_000;
let autoCloseTimer: ReturnType<typeof setInterval> | null = null;

async function comparePassword(stored: string, supplied: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

function getMidnight(date = new Date()) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

function validMoney(value: unknown, allowZero = false) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (allowZero ? n < 0 : n <= 0) return null;
  return Math.round(n * 100);
}

async function ensureCashRegisterControlTable() {
  const createSql = `CREATE TABLE IF NOT EXISTS cash_register_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
  )`;

  try {
    localSqlite.prepare(createSql).run();
  } catch (err) {
    console.warn("[CAIXA] Falha ao criar tabela local de movimentos:", err);
  }

  if (dbRemote) {
    try {
      const client = (dbRemote as any).$client ?? (dbRemote as any).client;
      if (client && typeof client.execute === "function") await client.execute(createSql);
    } catch (err) {
      console.warn("[CAIXA] Falha ao criar tabela remota de movimentos:", err);
    }
  }
}

async function calculateSummary(database: any, registerId: number) {
  const [register] = await database.select().from(cashRegisters).where(eq(cashRegisters.id, registerId)).limit(1);
  if (!register) throw new Error("Caixa não encontrado");

  const registerSales = await database.select().from(sales).where(eq(sales.cashRegisterId, registerId));
  const completedSaleIds = registerSales
    .filter((sale: any) => sale.status === "completed")
    .map((sale: any) => sale.id);

  let cashSales = 0;
  if (completedSaleIds.length > 0) {
    for (const saleId of completedSaleIds) {
      const salePayments = await database.select().from(payments).where(
        and(eq(payments.saleId, saleId), eq(payments.method, "cash"))
      );
      cashSales += salePayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    }
  }

  const movements = await database.select().from(cashRegisterMovements)
    .where(eq(cashRegisterMovements.cashRegisterId, registerId))
    .orderBy(desc(cashRegisterMovements.createdAt));

  const replenishments = movements
    .filter((m: any) => m.type === "replenishment")
    .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

  const withdrawals = movements
    .filter((m: any) => m.type === "withdrawal")
    .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

  const adjustments = movements
    .filter((m: any) => m.type === "adjustment")
    .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

  const expectedAmount = Number(register.openingAmount || 0) + cashSales + replenishments - withdrawals + adjustments;

  return {
    register,
    openingAmount: Number(register.openingAmount || 0),
    cashSales,
    replenishments,
    withdrawals,
    adjustments,
    expectedAmount,
    movements,
  };
}

async function closeAutomaticallyForDatabase(database: any, register: any, cutoff: Date) {
  await database.transaction(async (tx: any) => {
    const [fresh] = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, register.id)).limit(1);
    if (!fresh || fresh.status !== "open" || fresh.closedAt) return;
    if (!fresh.openedAt || new Date(fresh.openedAt).getTime() >= cutoff.getTime()) return;

    await tx.update(cashRegisters)
      .set({
        closedAt: cutoff,
        status: "closed_pending_review",
        closingAmount: null,
        difference: null,
      })
      .where(and(eq(cashRegisters.id, fresh.id), eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt)));

    await tx.insert(cashRegisterMovements).values({
      cashRegisterId: fresh.id,
      userId: fresh.userId,
      type: "closing",
      amount: 0,
      reason: "Fechamento automático às 00:00 — pendente de revisão administrativa",
      createdAt: cutoff,
    });
  });
}

async function autoCloseExpiredRegisters() {
  const cutoff = getMidnight();
  for (const database of getAllDatabases()) {
    try {
      const registers = await database.select().from(cashRegisters).where(
        and(eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt))
      );
      for (const register of registers) {
        await closeAutomaticallyForDatabase(database, register, cutoff);
      }
    } catch (err) {
      console.error("[CAIXA] Erro no fechamento automático:", err);
    }
  }
}

export async function startCashRegisterControl() {
  await ensureCashRegisterControlTable();
  await autoCloseExpiredRegisters();
  if (!autoCloseTimer) {
    autoCloseTimer = setInterval(() => {
      void autoCloseExpiredRegisters();
    }, AUTO_CLOSE_INTERVAL_MS);
    autoCloseTimer.unref?.();
  }
}

export function registerCashRegisterControl(app: any, isAuthenticated: any) {
  app.post("/api/auth/verify-admin-password", isAuthenticated, async (req: any, res: any) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser || !["admin", "owner"].includes(sessionUser.role)) {
        return res.status(403).json({ message: "Acesso exclusivo de administrador/owner." });
      }

      const password = String(req.body?.password ?? "");
      if (!password) return res.status(400).json({ message: "Senha obrigatória." });

      const dbUser = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
      if (!dbUser[0] || !(await comparePassword(dbUser[0].password, password))) {
        return res.status(401).json({ message: "Senha administrativa incorreta." });
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("[AUTH] Falha na verificação administrativa:", err);
      res.status(500).json({ message: "Não foi possível validar a autorização administrativa." });
    }
  });

  app.get("/api/cash-control/status", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = req.user as any;
      const [openRegister] = await db.select().from(cashRegisters)
        .where(and(eq(cashRegisters.userId, user.id), eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt)))
        .limit(1);

      const summary = openRegister ? await calculateSummary(db, openRegister.id) : null;
      const pendingReviews = await db.select().from(cashRegisters)
        .where(eq(cashRegisters.status, "closed_pending_review"))
        .orderBy(desc(cashRegisters.closedAt));

      res.json({ register: openRegister || null, summary, pendingReviews });
    } catch (err: any) {
      console.error("[CAIXA] Erro ao consultar estado:", err);
      res.status(500).json({ message: err.message || "Erro ao consultar Caixa." });
    }
  });

  app.post("/api/cash-control/open", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = req.user as any;
      if (!["admin", "owner"].includes(user.role)) return res.status(403).json({ message: "Somente administradores podem abrir o Caixa." });

      const password = String(req.body?.password ?? "");
      const openingAmount = validMoney(req.body?.openingAmount, true);
      if (!password) return res.status(400).json({ message: "Senha administrativa obrigatória." });
      if (openingAmount === null) return res.status(400).json({ message: "Valor inicial inválido." });

      const authorizedUser = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      if (!authorizedUser[0] || !(await comparePassword(authorizedUser[0].password, password))) {
        return res.status(401).json({ message: "Senha administrativa incorreta." });
      }

      const result = await multiWrite(async (database: any) => database.transaction(async (tx: any) => {
        const [existing] = await tx.select().from(cashRegisters)
          .where(and(eq(cashRegisters.userId, user.id), eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt)))
          .limit(1);
        if (existing) throw new Error("Já existe um Caixa aberto para este operador.");

        const [register] = await tx.insert(cashRegisters).values({
          userId: user.id,
          openedAt: new Date(),
          openingAmount,
          closingAmount: null,
          difference: null,
          status: "open",
        }).returning();

        await tx.insert(cashRegisterMovements).values({
          cashRegisterId: register.id,
          userId: user.id,
          type: "opening",
          amount: openingAmount,
          reason: "Abertura administrativa do Caixa",
          createdAt: new Date(),
        });

        return register;
      }));

      res.json(result);
    } catch (err: any) {
      console.error("[CAIXA] Erro ao abrir:", err);
      const status = err.message?.includes("Já existe") ? 409 : 500;
      res.status(status).json({ message: err.message || "Erro ao abrir Caixa." });
    }
  });

  async function validateAdminPassword(userId: number, password: string) {
    const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!dbUser) return false;
    return comparePassword(dbUser.password, password);
  }

  app.post("/api/cash-control/close", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = req.user as any;
      if (!["admin", "owner"].includes(user.role)) return res.status(403).json({ message: "Somente administradores podem fechar o Caixa." });
      const password = String(req.body?.password ?? "");
      const closingAmount = validMoney(req.body?.closingAmount, true);
      if (!password) return res.status(400).json({ message: "Senha administrativa obrigatória." });
      if (closingAmount === null) return res.status(400).json({ message: "Valor físico informado inválido." });
      if (!(await validateAdminPassword(user.id, password))) return res.status(401).json({ message: "Senha administrativa incorreta." });

      const registerId = Number(req.body?.registerId);
      const result = await multiWrite(async (database: any) => database.transaction(async (tx: any) => {
        const [register] = await tx.select().from(cashRegisters)
          .where(registerId ? eq(cashRegisters.id, registerId) : and(eq(cashRegisters.userId, user.id), eq(cashRegisters.status, "open")))
          .limit(1);
        if (!register) throw new Error("Nenhum Caixa aberto para fechar.");
        if (register.status !== "open" || register.closedAt) throw new Error("Este Caixa já está fechado.");

        const summary = await calculateSummary(tx, register.id);
        const difference = closingAmount - summary.expectedAmount;

        const [updated] = await tx.update(cashRegisters)
          .set({ closingAmount, difference, closedAt: new Date(), status: "closed" })
          .where(and(eq(cashRegisters.id, register.id), eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt)))
          .returning();

        if (!updated) throw new Error("O Caixa já foi fechado por outra operação.");

        await tx.insert(cashRegisterMovements).values({
          cashRegisterId: register.id,
          userId: user.id,
          type: "closing",
          amount: closingAmount,
          reason: `Fechamento administrativo — diferença R$ ${(difference / 100).toFixed(2)}`,
          createdAt: new Date(),
        });

        return { register: updated, summary: { ...summary, closingAmount, difference } };
      }));

      res.json(result);
    } catch (err: any) {
      console.error("[CAIXA] Erro ao fechar:", err);
      const status = err.message?.includes("já está fechado") ? 409 : 500;
      res.status(status).json({ message: err.message || "Erro ao fechar Caixa." });
    }
  });

  async function createMovement(req: any, res: any, type: "withdrawal" | "replenishment") {
    try {
      const user = req.user as any;
      const amount = validMoney(req.body?.amount, false);
      const reason = String(req.body?.reason ?? "").trim();
      if (amount === null) return res.status(400).json({ message: "Valor da movimentação inválido." });
      if (!reason) return res.status(400).json({ message: "O motivo é obrigatório." });

      const result = await multiWrite(async (database: any) => database.transaction(async (tx: any) => {
        const [register] = await tx.select().from(cashRegisters)
          .where(and(eq(cashRegisters.userId, user.id), eq(cashRegisters.status, "open"), isNull(cashRegisters.closedAt)))
          .limit(1);
        if (!register) throw new Error("O Caixa precisa estar aberto para realizar esta operação.");

        const summary = await calculateSummary(tx, register.id);
        if (type === "withdrawal" && amount > summary.expectedAmount) {
          throw new Error(`Sangria recusada: o valor disponível é R$ ${(summary.expectedAmount / 100).toFixed(2)}.`);
        }

        const [movement] = await tx.insert(cashRegisterMovements).values({
          cashRegisterId: register.id,
          userId: user.id,
          type,
          amount,
          reason,
          createdAt: new Date(),
        }).returning();

        await tx.insert(transactions).values({
          businessType: "padaria",
          type: type === "withdrawal" ? "expense" : "income",
          category: "caixa",
          description: `${type === "withdrawal" ? "Sangria" : "Suprimento"} — Caixa #${register.id} — ${reason}`,
          amount,
          createdAt: new Date(),
        } as any);

        return { movement, summary: await calculateSummary(tx, register.id) };
      }));

      res.json(result);
    } catch (err: any) {
      console.error(`[CAIXA] Erro na movimentação ${type}:`, err);
      const status = err.message?.includes("disponível") ? 400 : 500;
      res.status(status).json({ message: err.message || "Erro ao registrar movimentação." });
    }
  }

  app.post("/api/cash-control/withdrawal", isAuthenticated, (req: any, res: any) => createMovement(req, res, "withdrawal"));
  app.post("/api/cash-control/replenishment", isAuthenticated, (req: any, res: any) => createMovement(req, res, "replenishment"));

  app.post("/api/cash-control/review", isAuthenticated, async (req: any, res: any) => {
    try {
      const user = req.user as any;
      if (!["admin", "owner"].includes(user.role)) return res.status(403).json({ message: "Somente administradores podem revisar fechamentos." });
      const password = String(req.body?.password ?? "");
      const closingAmount = validMoney(req.body?.closingAmount, true);
      const registerId = Number(req.body?.registerId);
      if (!registerId || closingAmount === null || !password) return res.status(400).json({ message: "Dados de revisão incompletos." });
      if (!(await validateAdminPassword(user.id, password))) return res.status(401).json({ message: "Senha administrativa incorreta." });

      const result = await multiWrite(async (database: any) => database.transaction(async (tx: any) => {
        const [register] = await tx.select().from(cashRegisters)
          .where(and(eq(cashRegisters.id, registerId), eq(cashRegisters.status, "closed_pending_review")))
          .limit(1);
        if (!register) throw new Error("Fechamento automático não encontrado ou já revisado.");

        const summary = await calculateSummary(tx, register.id);
        const difference = closingAmount - summary.expectedAmount;
        const [updated] = await tx.update(cashRegisters).set({ closingAmount, difference, status: "closed" })
          .where(and(eq(cashRegisters.id, register.id), eq(cashRegisters.status, "closed_pending_review")))
          .returning();
        if (!updated) throw new Error("A revisão já foi concluída por outra operação.");

        await tx.insert(cashRegisterMovements).values({
          cashRegisterId: register.id,
          userId: user.id,
          type: "closing",
          amount: closingAmount,
          reason: `Revisão administrativa do fechamento automático — diferença R$ ${(difference / 100).toFixed(2)}`,
          createdAt: new Date(),
        });

        return { register: updated, summary: { ...summary, closingAmount, difference } };
      }));

      res.json(result);
    } catch (err: any) {
      console.error("[CAIXA] Erro na revisão:", err);
      res.status(500).json({ message: err.message || "Erro ao revisar fechamento automático." });
    }
  });

  app.get("/api/cash-control/register/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const id = Number(req.params.id);
      const summary = await calculateSummary(db, id);
      res.json(summary);
    } catch (err: any) {
      res.status(404).json({ message: err.message || "Caixa não encontrado." });
    }
  });
}
