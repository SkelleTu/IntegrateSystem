import { db, dbLocal, isRemoteEnabled } from "./db.js";
import {
  users, services, tickets, queueState, categories, menuItems,
  cashRegisters, sales, saleItems, payments, transactions,
  inventory, inventoryLogs, inventoryRestocks, settings, enterprises, timeClock,
  userSessions, fiscalSettings, nfce,
  type User, type InsertUser,
  type Service, type InsertService, type UpdateServiceRequest,
  type Ticket, type InsertTicket,
  type QueueState, type InsertQueueState,
  type Category, type InsertCategory,
  type MenuItem, type InsertMenuItem,
  type CashRegister, type InsertCashRegister,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem,
  type Payment, type InsertPayment,
  type Transaction,
  type Inventory, type InsertInventory,
  type InventoryLog, type InsertInventoryLog,
  type InventoryRestock, type InsertInventoryRestock,
  type Settings,
  type Enterprise, type InsertEnterprise,
  type TimeClock, type InsertTimeClock,
  type UserSession,
  type FiscalSettings, type InsertFiscalSettings,
  type Nfce, type InsertNfce
} from "../shared/schema.js";
import { eq, desc, asc, and, isNull, gte, lte } from "drizzle-orm";

// Helper para escrita dupla (Garante persistência)
async function dualWrite(operation: (database: any) => Promise<any>) {
  const result = await operation(db); // Escreve no principal (Remoto se disponível)
  
  // Se o principal for o remoto, tentamos espelhar no local como cache/backup
  if (isRemoteEnabled) {
    try {
      await operation(dbLocal).catch(() => {}); 
    } catch (e) {
      console.error("Falha no espelhamento local:", e);
    }
  }
  
  return result;
}

export interface IStorage {
  // Enterprise
  getEnterprises(): Promise<Enterprise[]>;
  getEnterprise(id: number): Promise<Enterprise | undefined>;
  getEnterpriseBySlug(slug: string): Promise<Enterprise | undefined>;
  createEnterprise(enterprise: InsertEnterprise): Promise<Enterprise>;
  updateEnterprise(id: number, update: Partial<Enterprise>): Promise<Enterprise>;
  deleteEnterprise(id: number): Promise<void>;

  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: UpdateServiceRequest): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // User Management
  getUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Queue & Tickets
  getQueueState(): Promise<QueueState>;
  updateQueueState(state: Partial<QueueState>): Promise<QueueState>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicketByNumber(number: number): Promise<Ticket | undefined>;
  getLatestTicket(): Promise<Ticket | undefined>;

  // Digital Menu
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;

  // Cashier
  getOpenCashRegister(userId: number): Promise<CashRegister | undefined>;
  openCashRegister(register: InsertCashRegister): Promise<CashRegister>;
  closeCashRegister(id: number, closingAmount: number): Promise<CashRegister>;
  createSale(sale: InsertSale, items: InsertSaleItem[], paymentsData: InsertPayment[]): Promise<Sale>;
  getSales(filters: { startDate?: Date; endDate?: Date }): Promise<Sale[]>;
  cancelSale(id: number): Promise<Sale>;

  // Financial Transactions
  getTransactions(filters: { startDate?: Date; endDate?: Date; businessType?: string }): Promise<Transaction[]>;
  createTransaction(transaction: any): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  
  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventoryItemByBarcode(barcode: string): Promise<Inventory | undefined>;
  updateInventory(id: number, quantity: number): Promise<Inventory>;
  deleteInventoryItem(id: number): Promise<void>;
  upsertInventory(data: any): Promise<Inventory>;
  createInventoryLog(log: InsertInventoryLog): Promise<InventoryLog>;
  updateTicketItems(id: number, items: string[]): Promise<Ticket>;

  // Time Clock
  getTimeClockHistory(userId: number): Promise<TimeClock[]>;
  getLatestTimeClock(userId: number): Promise<TimeClock | undefined>;
  createTimeClock(data: InsertTimeClock): Promise<TimeClock>;
  updateTimeClock(id: number, data: Partial<TimeClock>): Promise<TimeClock>;

  // Settings
  getSettings(enterpriseId?: number): Promise<Settings>;
  updateSettings(update: Partial<Settings>): Promise<Settings>;
  
  // User Sessions
  logUserSession(data: { userId: number; type: string; ipAddress?: string; userAgent?: string }): Promise<UserSession>;
  getAdminMonitoringData(): Promise<{ 
    sessions: (UserSession & { username: string })[], 
    enterprises: Enterprise[] 
  }>;

  // Fiscal
  getFiscalSettings(enterpriseId: number): Promise<FiscalSettings | undefined>;
  upsertFiscalSettings(settings: InsertFiscalSettings): Promise<FiscalSettings>;
  getLogsFiscais(enterpriseId: number): Promise<any[]>;
  updateSaleFiscal(id: number, update: Partial<Pick<Sale, 'fiscalStatus' | 'fiscalKey' | 'fiscalXml' | 'fiscalError' | 'fiscalType'>>): Promise<Sale>;
  getSale(id: number): Promise<Sale | undefined>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  getPayments(saleId: number): Promise<Payment[]>;
  getNextNfceNumber(enterpriseId: number): Promise<number>;
  createNfce(data: InsertNfce): Promise<Nfce>;
  getNfceHistory(enterpriseId: number): Promise<Nfce[]>;
  getNfce(id: number): Promise<Nfce | undefined>;
  
  // New Methods for Reports
  getCashRegisters(filters: { startDate?: Date; endDate?: Date }): Promise<CashRegister[]>;
  getSalesByRegisterId(registerId: number): Promise<Sale[]>;
  
  getAllInventoryRestocks(): Promise<InventoryRestock[]>;
  getInventoryRestocks(inventoryId: number): Promise<InventoryRestock[]>;
  restockInventory(id: number, data: any): Promise<Inventory>;
}

export class DatabaseStorage implements IStorage {
  private lastAction: string = "Sistema iniciado";

  private logAction(action: string) {
    this.lastAction = `${action} em ${new Date().toLocaleTimeString('pt-BR')}`;
    console.log(`[DB ACTION]: ${this.lastAction}`);
  }

  getLastAction(): string {
    return this.lastAction;
  }

  async getEnterprises(): Promise<Enterprise[]> {
    this.logAction("Consulta de instituições");
    return await db.select().from(enterprises);
  }

  async getEnterprise(id: number): Promise<Enterprise | undefined> {
    this.logAction(`Consulta instituição ID:${id}`);
    const [enterprise] = await db.select().from(enterprises).where(eq(enterprises.id, id));
    return enterprise;
  }

  async getEnterpriseBySlug(slug: string): Promise<Enterprise | undefined> {
    this.logAction(`Busca instituição por slug: ${slug}`);
    const [enterprise] = await db.select().from(enterprises).where(eq(enterprises.slug, slug));
    return enterprise;
  }

  async createEnterprise(enterprise: InsertEnterprise, adminData?: any): Promise<Enterprise> {
    this.logAction(`Criação de instituição: ${enterprise.name}`);
    return await db.transaction(async (tx: any) => {
      const [newEnterprise] = await tx.insert(enterprises).values(enterprise).returning();
      // Initialize settings for new enterprise
      await tx.insert(settings).values({ enterpriseId: newEnterprise.id });
      
      if (adminData) {
        await tx.insert(users).values({
          ...adminData,
          enterpriseId: newEnterprise.id,
          role: "admin"
        });
      }
      
      return newEnterprise;
    });
  }

  async updateEnterprise(id: number, update: Partial<Enterprise>): Promise<Enterprise> {
    this.logAction(`Atualização instituição ID:${id}`);
    const [updated] = await db.update(enterprises).set(update).where(eq(enterprises.id, id)).returning();
    return updated;
  }

  async deleteEnterprise(id: number): Promise<void> {
    this.logAction(`Exclusão instituição ID:${id}`);
    await db.delete(settings).where(eq(settings.enterpriseId, id));
    await db.delete(enterprises).where(eq(enterprises.id, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    this.logAction(`Consulta usuário ID:${id}`);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    this.logAction(`Login/Busca usuário: ${username}`);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    this.logAction(`Novo usuário cadastrado: ${user.username}`);
    return await dualWrite(async (database) => {
      const [newUser] = await database.insert(users).values(user).returning();
      return newUser;
    });
  }

  async getServices(): Promise<Service[]> {
    this.logAction("Consulta lista de serviços");
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: number): Promise<Service | undefined> {
    this.logAction(`Consulta serviço ID:${id}`);
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    this.logAction(`Criação de serviço: ${service.name}`);
    return await dualWrite(async (database) => {
      const [newService] = await database.insert(services).values(service).returning();
      return newService;
    });
  }

  async updateService(id: number, update: UpdateServiceRequest): Promise<Service> {
    this.logAction(`Atualização serviço ID:${id}`);
    return await dualWrite(async (database) => {
      const [updated] = await database.update(services).set(update).where(eq(services.id, id)).returning();
      return updated;
    });
  }

  async deleteService(id: number): Promise<void> {
    this.logAction(`Desativação serviço ID:${id}`);
    await dualWrite(async (database) => {
      await database.update(services).set({ isActive: false }).where(eq(services.id, id));
    });
  }

  async getUsers(): Promise<User[]> {
    this.logAction("Consulta lista de usuários");
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    this.logAction(`Exclusão usuário ID:${id}`);
    await db.delete(users).where(eq(users.id, id));
  }

  async getQueueState(): Promise<QueueState> {
    this.logAction("Consulta estado da fila");
    let [state] = await db.select().from(queueState);
    if (!state) {
      [state] = await db.insert(queueState).values({ currentNumber: 0, servingNumber: 0 }).returning();
    }
    return state;
  }

  async updateQueueState(update: Partial<QueueState>): Promise<QueueState> {
    this.logAction("Atualização da fila");
    let [state] = await db.select().from(queueState);
    if (!state) {
      [state] = await db.insert(queueState).values({ currentNumber: 0, servingNumber: 0 }).returning();
    }
    const [updated] = await db.update(queueState)
      .set(update)
      .where(eq(queueState.id, state.id))
      .returning();
    return updated;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    this.logAction(`Novo ticket gerado: #${ticket.ticketNumber}`);
    return await dualWrite(async (database) => {
      const [newTicket] = await database.insert(tickets).values(ticket).returning();
      return newTicket;
    });
  }

  async getTicketByNumber(number: number): Promise<Ticket | undefined> {
    this.logAction(`Busca ticket #${number}`);
    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.ticketNumber, number), eq(tickets.status, "pending"))).orderBy(desc(tickets.createdAt)).limit(1);
    if (ticket && typeof ticket.items === 'string') {
      try {
        (ticket as any).items = JSON.parse(ticket.items);
      } catch (e) {
        (ticket as any).items = [];
      }
    } else if (ticket && !ticket.items) {
      (ticket as any).items = [];
    }
    return ticket;
  }

  async getLatestTicket(): Promise<Ticket | undefined> {
    this.logAction("Consulta último ticket");
    const [ticket] = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(1);
    if (ticket && typeof ticket.items === 'string') {
      try {
        (ticket as any).items = JSON.parse(ticket.items);
      } catch (e) {
        (ticket as any).items = [];
      }
    } else if (ticket && !ticket.items) {
      (ticket as any).items = [];
    }
    return ticket;
  }

  async getCategories(): Promise<Category[]> {
    this.logAction("Consulta categorias menu");
    return await db.select().from(categories).orderBy(asc(categories.order));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    this.logAction(`Nova categoria: ${category.name}`);
    return await dualWrite(async (database) => {
      const [newCategory] = await database.insert(categories).values(category).returning();
      return newCategory;
    });
  }

  async getMenuItems(): Promise<MenuItem[]> {
    this.logAction("Consulta itens menu");
    const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    const inv = await db.select().from(inventory);
    
    // Only return items that exist in inventory OR are 'Coca-Cola'
    return (items as any[]).filter((item: any) => 
      item.name === 'Coca-Cola' || 
      (inv as any[]).some((i: any) => i.itemId === item.id && i.itemType === 'product')
    );
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    this.logAction(`Busca itens categoria ID:${categoryId}`);
    return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    this.logAction(`Novo item menu: ${item.name}`);
    const itemToInsert = {
      ...item,
      tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : item.tags
    };
    const [newItem] = await db.insert(menuItems).values(itemToInsert).returning();
    return newItem;
  }

  // Cashier
  async getOpenCashRegister(userId: number): Promise<CashRegister | undefined> {
    this.logAction(`Verificação caixa aberto usuário ID:${userId}`);
    const [register] = await db.select()
      .from(cashRegisters)
      .where(and(eq(cashRegisters.userId, userId), isNull(cashRegisters.closedAt)));
    return register;
  }

  async openCashRegister(register: InsertCashRegister): Promise<CashRegister> {
    this.logAction(`Abertura de caixa usuário ID:${register.userId}`);
    return await dualWrite(async (database) => {
      const [newRegister] = await database.insert(cashRegisters).values(register).returning();
      
      if (newRegister.openingAmount && newRegister.openingAmount > 0) {
        await database.insert(transactions).values({
          businessType: "padaria",
          type: "income",
          category: "caixa",
          description: `Abertura de Caixa #${newRegister.id}`,
          amount: newRegister.openingAmount,
          createdAt: new Date()
        } as any);
      }
      
      return newRegister;
    });
  }

  async closeCashRegister(id: number, closingAmount: number): Promise<CashRegister> {
    this.logAction(`Fechamento de caixa ID:${id}`);
    return await dualWrite(async (database) => {
      const [register] = await database.select().from(cashRegisters).where(eq(cashRegisters.id, id));
      if (!register) throw new Error("Caixa não encontrado");

      const salesList = await database.select().from(sales).where(eq(sales.cashRegisterId, id));
      const totalSales = salesList.filter((s: any) => s.status === "completed").reduce((sum: number, s: any) => sum + s.totalAmount, 0);
      const expectedAmount = (register.openingAmount || 0) + totalSales;
      const difference = closingAmount - expectedAmount;

      const [updated] = await database.update(cashRegisters)
        .set({ 
          closingAmount, 
          difference,
          closedAt: new Date(),
          status: "closed"
        })
        .where(eq(cashRegisters.id, id))
        .returning();

      await database.insert(transactions).values({
        businessType: "padaria",
        type: "income",
        category: "caixa",
        description: `Fechamento de Caixa #${id} - Valor em Gaveta`,
        amount: closingAmount,
        createdAt: new Date()
      } as any);

      return updated;
    });
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[], paymentsData: InsertPayment[]): Promise<Sale> {
    this.logAction(`Nova venda registrada. Total: R$ ${sale.totalAmount / 100}`);
    return await dualWrite(async (database) => {
      const [insertedSale] = await database.insert(sales).values(sale).returning();
      
      const itemsWithSaleId = items.map(item => ({ ...item, saleId: insertedSale.id }));
      await database.insert(saleItems).values(itemsWithSaleId);
      
      const paymentsWithSaleId = paymentsData.map(payment => ({ ...payment, saleId: insertedSale.id }));
      await database.insert(payments).values(paymentsWithSaleId);

      for (const item of items) {
        const [inventoryItem] = await database.select()
          .from(inventory)
          .where(
            item.itemType === 'product' 
              ? eq(inventory.itemId, item.itemId)
              : eq(inventory.customName, item.itemId.toString())
          )
          .limit(1);

        if (inventoryItem) {
          await database.update(inventory)
            .set({ 
              quantity: inventoryItem.quantity - item.quantity,
              updatedAt: new Date()
            })
            .where(eq(inventory.id, inventoryItem.id));
          
          await database.insert(inventoryLogs).values({
            inventoryId: inventoryItem.id,
            type: "out",
            quantity: item.quantity,
            reason: `Venda #${insertedSale.id}`,
            userId: sale.userId || 0,
            createdAt: new Date()
          });
        }
      }

      await database.insert(transactions).values({
        businessType: "padaria",
        type: "income",
        category: "vendas",
        description: `Venda PDV #${insertedSale.id}`,
        amount: insertedSale.totalAmount,
        createdAt: new Date()
      });
      
      return insertedSale;
    });
  }

  async getSales(filters: { startDate?: Date; endDate?: Date }): Promise<Sale[]> {
    this.logAction("Consulta histórico de vendas");
    let conditions = [];
    if (filters.startDate) conditions.push(gte(sales.createdAt, filters.startDate));
    if (filters.endDate) conditions.push(lte(sales.createdAt, filters.endDate));
    
    return await db.select()
      .from(sales)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sales.createdAt));
  }

  async cancelSale(id: number): Promise<Sale> {
    this.logAction(`Cancelamento venda ID:${id}`);
    return await dualWrite(async (database) => {
      const [sale] = await database.select().from(sales).where(eq(sales.id, id));
      if (!sale) throw new Error("Venda não encontrada");
      if (sale.status === "cancelled") return sale;

      const [updatedSale] = await database.update(sales)
        .set({ status: "cancelled" })
        .where(eq(sales.id, id))
        .returning();

      const items = await database.select().from(saleItems).where(eq(saleItems.saleId, id));
      for (const item of items) {
        const [inventoryItem] = await database.select()
          .from(inventory)
          .where(and(eq(inventory.itemId, item.itemId), eq(inventory.itemType, item.itemType === 'product' ? 'product' : 'service')))
          .limit(1);

        if (inventoryItem) {
          await database.update(inventory)
            .set({ 
              quantity: inventoryItem.quantity + item.quantity,
              updatedAt: new Date()
            })
            .where(eq(inventory.id, inventoryItem.id));
          
          await database.insert(inventoryLogs).values({
            inventoryId: inventoryItem.id,
            type: "in",
            quantity: item.quantity,
            reason: `Estorno Venda Cancelada #${id}`,
            userId: sale.userId || 0,
            createdAt: new Date()
          });
        }
      }

      await database.insert(transactions).values({
        businessType: "padaria",
        type: "expense",
        category: "vendas",
        description: `ESTORNO: Venda PDV #${id} CANCELADA`,
        amount: sale.totalAmount,
        createdAt: new Date()
      });

      return updatedSale;
    });
  }

  async getTransactions(filters: { startDate?: Date; endDate?: Date; businessType?: string }): Promise<Transaction[]> {
    this.logAction("Consulta financeiro");
    let conditions = [];
    if (filters.startDate) {
      conditions.push(gte(transactions.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(transactions.createdAt, filters.endDate));
    }
    if (filters.businessType) {
      conditions.push(eq(transactions.businessType, filters.businessType));
    }
    
    return await db.select()
      .from(transactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.createdAt));
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    this.logAction("Consulta estoque completo");
    return await db.select().from(inventory);
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    this.logAction(`Busca item estoque ID:${id}`);
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
    return item;
  }

  async getInventoryItemByBarcode(barcode: string): Promise<Inventory | undefined> {
    this.logAction(`Busca item por código: ${barcode}`);
    const [item] = await db.select().from(inventory).where(eq(inventory.barcode, barcode)).limit(1);
    return item;
  }

  async updateInventory(id: number, quantity: number): Promise<Inventory> {
    this.logAction(`Ajuste manual estoque ID:${id}`);
    const [updated] = await db.update(inventory)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    this.logAction(`Exclusão item estoque ID:${id}`);
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async upsertInventory(data: any): Promise<Inventory> {
    this.logAction(`Cadastro/Atualização estoque: ${data.customName || data.itemId}`);
    return await dualWrite(async (database) => {
      const { id, ...itemData } = data;
      if (id) {
        const [existing] = await database.select().from(inventory).where(eq(inventory.id, id)).limit(1);
        if (existing) {
          const [updated] = await database.update(inventory)
            .set({ ...itemData, updatedAt: new Date() })
            .where(eq(inventory.id, id))
            .returning();
          return updated;
        }
      }
      
      // If no ID or item doesn't exist, try to find by itemId and itemType
      if (itemData.itemId && itemData.itemType) {
        const [existing] = await database.select()
          .from(inventory)
          .where(and(eq(inventory.itemId, itemData.itemId), eq(inventory.itemType, itemData.itemType)))
          .limit(1);
          
        if (existing) {
          const [updated] = await database.update(inventory)
            .set({ ...itemData, updatedAt: new Date() })
            .where(eq(inventory.id, existing.id))
            .returning();
          return updated;
        }
      }

      const [inserted] = await database.insert(inventory).values({ ...itemData, updatedAt: new Date() }).returning();
      return inserted;
    });
  }

  async createInventoryLog(log: InsertInventoryLog): Promise<InventoryLog> {
    this.logAction(`Log movimento estoque ID:${log.inventoryId}`);
    return await dualWrite(async (database) => {
      const [newLog] = await database.insert(inventoryLogs).values(log).returning();
      return newLog;
    });
  }

  async updateCashRegisterOpeningAmount(id: number, amount: number) {
    this.logAction(`Ajuste abertura caixa ID:${id}`);
    return await dualWrite(async (database) => {
      return await database
        .update(cashRegisters)
        .set({ openingAmount: amount })
        .where(eq(cashRegisters.id, id));
    });
  }

  async restockInventory(id: number, data: any): Promise<Inventory> {
    this.logAction(`Reposição estoque ID:${id} (+${data.quantity})`);
    return await dualWrite(async (database) => {
      const [item] = await database.select().from(inventory).where(eq(inventory.id, id)).limit(1);
      if (!item) throw new Error("Item de inventário não encontrado");

      const [updated] = await database.update(inventory)
        .set({ 
          quantity: item.quantity + data.quantity,
          updatedAt: new Date()
        })
        .where(eq(inventory.id, id))
        .returning();

      await database.insert(inventoryRestocks).values({
        inventoryId: id,
        quantity: data.quantity,
        unit: data.unit || item.unit,
        itemsPerUnit: data.itemsPerUnit || item.itemsPerUnit,
        costPrice: data.costPrice || 0,
        expiryDate: data.expiryDate,
        createdAt: new Date()
      });

      return updated;
    });
  }

  async createTransaction(transaction: any): Promise<Transaction> {
    return await dualWrite(async (database) => {
      const [newTransaction] = await database.insert(transactions).values(transaction).returning();
      return newTransaction;
    });
  }

  async deleteTransaction(id: number): Promise<void> {
    await dualWrite(async (database) => {
      await database.delete(transactions).where(eq(transactions.id, id));
    });
  }

  async updateTicketItems(id: number, items: string[]): Promise<Ticket> {
    const [updated] = await db.update(tickets)
      .set({ items: JSON.stringify(items) })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  // Time Clock
  async getTimeClockHistory(userId: number): Promise<TimeClock[]> {
    return await db.select().from(timeClock).where(eq(timeClock.userId, userId)).orderBy(desc(timeClock.timestamp));
  }

  async getLatestTimeClock(userId: number): Promise<TimeClock | undefined> {
    const [latest] = await db.select().from(timeClock).where(eq(timeClock.userId, userId)).orderBy(desc(timeClock.timestamp)).limit(1);
    return latest;
  }

  async createTimeClock(data: InsertTimeClock): Promise<TimeClock> {
    const [clock] = await db.insert(timeClock).values(data).returning();
    return clock;
  }

  async updateTimeClock(id: number, data: Partial<TimeClock>): Promise<TimeClock> {
    const [updated] = await db.update(timeClock).set(data).where(eq(timeClock.id, id)).returning();
    return updated;
  }

  // Settings
  async getSettings(enterpriseId?: number): Promise<Settings> {
    let query = db.select().from(settings);
    if (enterpriseId) {
      query = query.where(eq(settings.enterpriseId, enterpriseId)) as any;
    }
    const [s] = await query.limit(1);
    if (!s) {
      const [newSettings] = await db.insert(settings).values({ enterpriseId }).returning();
      return newSettings;
    }
    return s;
  }

  async updateSettings(update: Partial<Settings>): Promise<Settings> {
    const { enterpriseId, ...rest } = update;
    let query = db.update(settings).set(rest);
    if (enterpriseId) {
      query = query.where(eq(settings.enterpriseId, enterpriseId)) as any;
    }
    const [updated] = await query.returning();
    return updated;
  }

  // User Sessions
  async logUserSession(data: { userId: number; type: string; ipAddress?: string; userAgent?: string }): Promise<UserSession> {
    const [session] = await db.insert(userSessions).values(data).returning();
    return session;
  }

  async getAdminMonitoringData(): Promise<{ sessions: (UserSession & { username: string })[], enterprises: Enterprise[] }> {
    const sessionsList = await db.select({
      id: userSessions.id,
      userId: userSessions.userId,
      type: userSessions.type,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      createdAt: userSessions.createdAt,
      username: users.username,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .orderBy(desc(userSessions.createdAt))
    .limit(50);

    const enterprisesList = await db.select().from(enterprises);

    return {
      sessions: sessionsList,
      enterprises: enterprisesList
    };
  }

  // Fiscal
  async getFiscalSettings(enterpriseId: number): Promise<FiscalSettings | undefined> {
    this.logAction(`Consulta configurações fiscais empresa ID:${enterpriseId}`);
    try {
      const idToUse = enterpriseId || 1;
      // Busca segura: tenta buscar todos os campos, se falhar, tenta buscar apenas os básicos
      try {
        const [settings] = await db.select().from(fiscalSettings).where(eq(fiscalSettings.enterpriseId, idToUse)).limit(1);
        return settings || undefined;
      } catch (e: any) {
        console.warn("Aviso: Algumas colunas podem estar faltando na tabela fiscal_settings. Usando busca raw.");
        const result = await db.execute({
          sql: `SELECT id, enterprise_id, razao_social, nome_fantasia, cnpj FROM fiscal_settings WHERE enterprise_id = ? LIMIT 1`,
          args: [idToUse]
        });
        if (result.rows.length > 0) {
          const row = result.rows[0] as any;
          return {
            id: row.id,
            enterpriseId: row.enterprise_id,
            razaoSocial: row.razao_social,
            nomeFantasia: row.nome_fantasia,
            cnpj: row.cnpj,
            simulacaoReal: false, // Default fallback
            ambiente: "homologacao"
          } as any;
        }
      }
      return undefined;
    } catch (e: any) {
      console.error("Erro ao buscar fiscal_settings:", e.message);
      return undefined;
    }
  }

  async upsertFiscalSettings(settingsData: InsertFiscalSettings): Promise<FiscalSettings> {
    this.logAction(`Upsert configurações fiscais empresa ID:${settingsData.enterpriseId}`);
    const enterpriseId = settingsData.enterpriseId || 1;
    
    let existing = await this.getFiscalSettings(enterpriseId);

    const dataToSave = {
      ...settingsData,
      enterpriseId,
      simulacaoReal: !!settingsData.simulacaoReal
    };

    try {
      if (existing) {
        const { id, ...updateData } = dataToSave as any;
        try {
          const [updated] = await db.update(fiscalSettings)
            .set(updateData)
            .where(eq(fiscalSettings.id, existing.id))
            .returning();
          return updated;
        } catch (updateErr: any) {
          console.error("Falha ao atualizar todas as colunas:", updateErr.message);
          return (await this.getFiscalSettings(enterpriseId))!;
        }
      } else {
        try {
          const [inserted] = await db.insert(fiscalSettings)
            .values(dataToSave)
            .returning();
          return inserted;
        } catch (insertErr: any) {
          console.error("Falha ao inserir com todas as colunas:", insertErr.message);
          return (await this.getFiscalSettings(enterpriseId))!;
        }
      }
    } catch (e: any) {
      console.error("Erro crítico no upsertFiscalSettings:", e.message);
      throw e;
    }
  }

  async getLogsFiscais(enterpriseId: number): Promise<any[]> {
    return await db.select().from(sales)
      .where(and(
        eq(sales.status, "completed"), 
        or(
          eq(sales.fiscalStatus, "authorized"), 
          eq(sales.fiscalStatus, "simulated")
        )
      ))
      .orderBy(desc(sales.createdAt));
  }

  async updateSaleFiscal(id: number, update: Partial<Pick<Sale, 'fiscalStatus' | 'fiscalKey' | 'fiscalXml' | 'fiscalError' | 'fiscalType'>>): Promise<Sale> {
    const [updated] = await db.update(sales).set(update).where(eq(sales.id, id)).returning();
    return updated;
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }

  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async getPayments(saleId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.saleId, saleId));
  }

  async getNextNfceNumber(enterpriseId: number): Promise<number> {
    const settingsData = await this.getFiscalSettings(enterpriseId);
    if (!settingsData) throw new Error("Configurações fiscais não encontradas");
    
    // Fallback manual se a coluna não existir no objeto
    const currentNumber = (settingsData as any).ultimoNumeroNfce || 0;
    const nextNumber = currentNumber + 1;
    
    try {
      await db.update(fiscalSettings)
        .set({ ultimoNumeroNfce: nextNumber } as any)
        .where(eq(fiscalSettings.id, settingsData.id));
    } catch (e) {
      console.warn("Aviso: Não foi possível atualizar ultimoNumeroNfce (coluna ausente?)");
    }
    
    return nextNumber;
  }

  async createNfce(data: InsertNfce): Promise<Nfce> {
    const [inserted] = await db.insert(nfce).values(data).returning();
    return inserted;
  }

  async getNfceHistory(enterpriseId: number): Promise<Nfce[]> {
    return await db.select().from(nfce).orderBy(desc(nfce.dataEmissao));
  }

  async getNfce(id: number): Promise<Nfce | undefined> {
    const [item] = await db.select().from(nfce).where(eq(nfce.id, id));
    return item;
  }

  async getCashRegisters(filters: { startDate?: Date; endDate?: Date }): Promise<CashRegister[]> {
    let conditions = [];
    if (filters.startDate) conditions.push(gte(cashRegisters.openedAt, filters.startDate));
    if (filters.endDate) conditions.push(lte(cashRegisters.openedAt, filters.endDate));
    
    return await db.select()
      .from(cashRegisters)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cashRegisters.openedAt));
  }

  async getSalesByRegisterId(registerId: number): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.cashRegisterId, registerId));
  }

  async getAllInventoryRestocks(): Promise<InventoryRestock[]> {
    return await db.select().from(inventoryRestocks).orderBy(desc(inventoryRestocks.createdAt));
  }

  async getInventoryRestocks(inventoryId: number): Promise<InventoryRestock[]> {
    return await db.select().from(inventoryRestocks).where(eq(inventoryRestocks.inventoryId, inventoryId)).orderBy(desc(inventoryRestocks.createdAt));
  }
}

export const storage = new DatabaseStorage();
