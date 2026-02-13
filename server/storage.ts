import { db } from "./db";
import {
  users, services, tickets, queueState, categories, menuItems,
  cashRegisters, sales, saleItems, payments, transactions,
  inventory, inventoryLogs, inventoryRestocks, settings, enterprises, timeClock,
  userSessions, fiscalSettings,
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
  type FiscalSettings, type InsertFiscalSettings
} from "@shared/schema";
import { eq, desc, asc, and, isNull, gte, lte } from "drizzle-orm";

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
  updateSaleFiscal(id: number, update: Partial<Pick<Sale, 'fiscalStatus' | 'fiscalKey' | 'fiscalXml' | 'fiscalError'>>): Promise<Sale>;

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
}

export class DatabaseStorage implements IStorage {
  async getEnterprises(): Promise<Enterprise[]> {
    return await db.select().from(enterprises);
  }

  async getEnterprise(id: number): Promise<Enterprise | undefined> {
    const [enterprise] = await db.select().from(enterprises).where(eq(enterprises.id, id));
    return enterprise;
  }

  async getEnterpriseBySlug(slug: string): Promise<Enterprise | undefined> {
    const [enterprise] = await db.select().from(enterprises).where(eq(enterprises.slug, slug));
    return enterprise;
  }

  async createEnterprise(enterprise: InsertEnterprise, adminData?: any): Promise<Enterprise> {
    return await db.transaction(async (tx) => {
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
    const [updated] = await db.update(enterprises).set(update).where(eq(enterprises.id, id)).returning();
    return updated;
  }

  async deleteEnterprise(id: number): Promise<void> {
    await db.delete(settings).where(eq(settings.enterpriseId, id));
    await db.delete(enterprises).where(eq(enterprises.id, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, update: UpdateServiceRequest): Promise<Service> {
    const [updated] = await db.update(services).set(update).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    // Soft delete
    await db.update(services).set({ isActive: false }).where(eq(services.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getQueueState(): Promise<QueueState> {
    let [state] = await db.select().from(queueState);
    if (!state) {
      [state] = await db.insert(queueState).values({ currentNumber: 0, servingNumber: 0 }).returning();
    }
    return state;
  }

  async updateQueueState(update: Partial<QueueState>): Promise<QueueState> {
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
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async getTicketByNumber(number: number): Promise<Ticket | undefined> {
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
    return await db.select().from(categories).orderBy(asc(categories.order));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    const items = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
    const inv = await db.select().from(inventory);
    
    // Only return items that exist in inventory OR are 'Coca-Cola'
    return items.filter(item => 
      item.name === 'Coca-Cola' || 
      inv.some(i => i.itemId === item.id && i.itemType === 'product')
    );
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const itemToInsert = {
      ...item,
      tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : item.tags
    };
    const [newItem] = await db.insert(menuItems).values(itemToInsert).returning();
    return newItem;
  }

  // Cashier
  async getOpenCashRegister(userId: number): Promise<CashRegister | undefined> {
    const [register] = await db.select()
      .from(cashRegisters)
      .where(and(eq(cashRegisters.userId, userId), isNull(cashRegisters.closedAt)));
    return register;
  }

  async openCashRegister(register: InsertCashRegister): Promise<CashRegister> {
    const [newRegister] = await db.insert(cashRegisters).values(register).returning();
    return newRegister;
  }

  async updateCashRegisterOpeningAmount(id: number, amount: number): Promise<CashRegister> {
    const [updated] = await db.update(cashRegisters)
      .set({ openingAmount: amount })
      .where(eq(cashRegisters.id, id))
      .returning();
    return updated;
  }

  async closeCashRegister(id: number, closingAmount: number): Promise<CashRegister> {
    const [register] = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id));
    if (!register) throw new Error("Caixa não encontrado");

    // Cálculo da diferença: Valor Final Real - (Valor Inicial + Total de Vendas em Dinheiro)
    const salesList = await db.select().from(sales).where(eq(sales.cashRegisterId, id));
    const totalSales = salesList.filter(s => s.status === "completed" && s.paymentMethod === "cash").reduce((sum, s) => sum + s.totalAmount, 0);
    const expectedAmount = (register.openingAmount || 0) + totalSales;
    const difference = closingAmount - expectedAmount;

    const [updated] = await db.update(cashRegisters)
      .set({ 
        closingAmount, 
        difference,
        closedAt: new Date(),
        status: "closed"
      })
      .where(eq(cashRegisters.id, id))
      .returning();
    return updated;
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[], paymentsData: InsertPayment[]): Promise<Sale> {
    return await db.transaction(async (tx) => {
      const [newSale] = await tx.insert(sales).values(sale).returning();
      
      const itemsWithSaleId = items.map(item => ({ ...item, saleId: newSale.id }));
      await tx.insert(saleItems).values(itemsWithSaleId);
      
      const paymentsWithSaleId = paymentsData.map(payment => ({ ...payment, saleId: newSale.id }));
      await tx.insert(payments).values(paymentsWithSaleId);

      // Sincronização com Estoque e Financeiro
      for (const item of items) {
        // 1. Atualizar Estoque (Venda subtrai do estoque)
        // Procurar no inventário pelo itemId (que refere-se ao produto cadastrado no menu)
        const [inventoryItem] = await tx.select()
          .from(inventory)
          .where(and(eq(inventory.itemId, item.itemId), eq(inventory.itemType, 'product')))
          .limit(1);

        if (inventoryItem) {
          await tx.update(inventory)
            .set({ 
              quantity: inventoryItem.quantity - item.quantity,
              updatedAt: new Date()
            })
            .where(eq(inventory.id, inventoryItem.id));
          
          // Registrar log de movimentação
          await tx.insert(inventoryLogs).values({
            inventoryId: inventoryItem.id,
            type: "out",
            quantity: item.quantity,
            reason: `Venda #${newSale.id}`,
            userId: sale.userId || 0,
            createdAt: new Date()
          });
        }
      }

      // 2. Registrar Transação Financeira (Receita)
      await tx.insert(transactions).values({
        businessType: "padaria",
        type: "income",
        category: "vendas",
        description: `Venda PDV #${newSale.id}`,
        amount: newSale.totalAmount,
        createdAt: new Date()
      });
      
      return newSale;
    });
  }

  async getSales(filters: { startDate?: Date; endDate?: Date }): Promise<Sale[]> {
    let conditions = [];
    if (filters.startDate) conditions.push(gte(sales.createdAt, filters.startDate));
    if (filters.endDate) conditions.push(lte(sales.createdAt, filters.endDate));
    
    return await db.select()
      .from(sales)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sales.createdAt));
  }

  async cancelSale(id: number): Promise<Sale> {
    const [updated] = await db.update(sales)
      .set({ status: "cancelled" })
      .where(eq(sales.id, id))
      .returning();
    return updated;
  }

  async getTransactions(filters: { startDate?: Date; endDate?: Date; businessType?: string }): Promise<Transaction[]> {
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
    return await db.select().from(inventory);
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async getInventoryItemByBarcode(barcode: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.barcode, barcode));
    return item;
  }

  async updateInventory(id: number, quantity: number): Promise<Inventory> {
    const [updated] = await db.update(inventory)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async createInventoryLog(log: InsertInventoryLog): Promise<InventoryLog> {
    const [newLog] = await db.insert(inventoryLogs).values(log).returning();
    return newLog;
  }

  async createTransaction(transaction: any): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async restockInventory(id: number, data: {
    quantity: number;
    unit?: string;
    itemsPerUnit?: number;
    costPrice?: number;
    expiryDate?: Date | null;
  }): Promise<Inventory> {
    return db.transaction(async (tx) => {
      const [existingItem] = await tx.select().from(inventory).where(eq(inventory.id, id));
      if (!existingItem) {
        throw new Error(`Item com ID ${id} não encontrado no estoque`);
      }

      const newQuantity = existingItem.quantity + data.quantity;
      
      const updateData: any = {
        quantity: newQuantity,
        updatedAt: new Date()
      };

      if (data.unit) updateData.unit = data.unit;
      if (data.itemsPerUnit) updateData.itemsPerUnit = data.itemsPerUnit;
      if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;

      const [result] = await tx.update(inventory)
        .set(updateData)
        .where(eq(inventory.id, id))
        .returning();

      await tx.insert(inventoryRestocks).values({
        inventoryId: id,
        quantity: data.quantity,
        unit: data.unit || existingItem.unit,
        itemsPerUnit: data.itemsPerUnit || existingItem.itemsPerUnit,
        costPrice: data.costPrice || 0,
        expiryDate: data.expiryDate || null,
      });

      if (data.costPrice && data.costPrice > 0 && data.quantity > 0) {
        await tx.insert(transactions).values({
          businessType: "padaria",
          type: "expense",
          category: "estoque",
          description: `Reposição de estoque: ${existingItem.customName || 'Item'} (${data.quantity} ${data.unit || existingItem.unit})`,
          amount: data.costPrice * data.quantity,
          createdAt: new Date()
        });
      }

      return result;
    });
  }

  async getInventoryRestocks(inventoryId: number): Promise<InventoryRestock[]> {
    return await db.select().from(inventoryRestocks)
      .where(eq(inventoryRestocks.inventoryId, inventoryId))
      .orderBy(desc(inventoryRestocks.createdAt));
  }

  async getAllInventoryRestocks(): Promise<InventoryRestock[]> {
    return await db.select().from(inventoryRestocks)
      .orderBy(desc(inventoryRestocks.createdAt));
  }

  async upsertInventory(data: any): Promise<Inventory> {
    return db.transaction(async (tx) => {
      // Logic for "Delete-then-Create" as requested by user
      // This ensures a clean slate for the edited item
      if (data.id) {
        await tx.delete(inventory).where(eq(inventory.id, data.id));
      }

      // NOVO: Validar se já existe um item com o mesmo código de barras (ID personalizado)
      // Se estiver editando (data.id presente), o delete acima já limpou o registro anterior
      // Se for novo ou duplicado, precisamos garantir que o barcode não esteja em uso por OUTRO item
      if (data.barcode) {
        const [existing] = await tx.select().from(inventory).where(eq(inventory.barcode, data.barcode));
        if (existing) {
          throw new Error(`O ID/Código "${data.barcode}" já está em uso pelo item: ${existing.customName || 'Sem nome'}`);
        }
      }

      // Ensure data objects are handled correctly for SQLite
      const processedData = {
        itemId: data.itemId || null,
        itemType: data.itemType,
        customName: data.customName || null,
        quantity: parseInt(data.quantity) || 0,
        unit: data.unit,
        itemsPerUnit: parseInt(data.itemsPerUnit) || 1,
        costPrice: typeof data.costPrice === 'string' ? Math.round(Number(data.costPrice.replace(',', '.')) * 100) : data.costPrice,
        salePrice: typeof data.salePrice === 'string' ? Math.round(Number(data.salePrice.replace(',', '.')) * 100) : (data.salePrice || null),
        barcode: data.barcode || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        updatedAt: new Date()
      };

      const [result] = await tx.insert(inventory).values(processedData).returning();

      // Automatically create a financial transaction if it's an "in" entry with cost
      if (processedData.costPrice && processedData.costPrice > 0 && processedData.quantity > 0) {
        await tx.insert(transactions).values({
          businessType: "padaria",
          type: "expense",
          category: "estoque",
          description: `Compra de estoque: ${data.itemType === 'product' ? 'Produto' : 'Serviço'} ${data.customName || data.itemId}`,
          amount: processedData.costPrice * processedData.quantity,
          createdAt: new Date()
        });
      }

      return result;
    });
  }

  async updateTicketItems(id: number, items: string[]): Promise<Ticket> {
    const [updated] = await db.update(tickets)
      .set({ items: JSON.stringify(items) })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async getLatestTimeClock(userId: number): Promise<TimeClock | undefined> {
    const [latest] = await db.select().from(timeClock)
      .where(eq(timeClock.userId, userId))
      .orderBy(desc(timeClock.timestamp))
      .limit(1);
    return latest;
  }

  async getTimeClockHistory(userId: number): Promise<TimeClock[]> {
    return await db.select().from(timeClock).where(eq(timeClock.userId, userId)).orderBy(desc(timeClock.timestamp));
  }

  async createTimeClock(data: InsertTimeClock): Promise<TimeClock> {
    const [newClock] = await db.insert(timeClock).values(data).returning();
    return newClock;
  }

  async updateTimeClock(id: number, data: Partial<TimeClock>): Promise<TimeClock> {
    const [updated] = await db.update(timeClock).set(data).where(eq(timeClock.id, id)).returning();
    return updated;
  }

  async getSettings(enterpriseId?: number): Promise<Settings> {
    let condition = enterpriseId ? eq(settings.enterpriseId, enterpriseId) : isNull(settings.enterpriseId);
    let [item] = await db.select().from(settings).where(condition).limit(1);
    if (!item) {
      [item] = await db.insert(settings).values({ enterpriseId }).returning();
    }
    return item;
  }

  async updateSettings(update: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings(update.enterpriseId || undefined);
    const [updated] = await db.update(settings)
      .set(update)
      .where(eq(settings.id, current.id))
      .returning();
    return updated;
  }

  async logUserSession(data: any): Promise<UserSession> {
    const [session] = await db.insert(userSessions).values(data).returning();
    return session;
  }

  async getAdminMonitoringData(): Promise<any> {
    const sessionsList = await db.select({
      id: userSessions.id,
      userId: userSessions.userId,
      username: users.username,
      type: userSessions.type,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .orderBy(desc(userSessions.createdAt))
    .limit(100);

    const enterprisesList = await db.select().from(enterprises).orderBy(desc(enterprises.createdAt));

    return { sessions: sessionsList, enterprises: enterprisesList };
  }

  async updateSaleFiscal(id: number, update: Partial<Pick<Sale, 'fiscalStatus' | 'fiscalKey' | 'fiscalXml' | 'fiscalError' | 'fiscalType'>>): Promise<Sale> {
    const [updated] = await db.update(sales)
      .set(update)
      .where(eq(sales.id, id))
      .returning();
    return updated;
  }

  async getFiscalSettings(enterpriseId: number): Promise<FiscalSettings | undefined> {
    const [item] = await db.select().from(fiscalSettings).where(eq(fiscalSettings.enterpriseId, enterpriseId)).limit(1);
    return item;
  }

  async upsertFiscalSettings(data: InsertFiscalSettings): Promise<FiscalSettings> {
    const existing = await this.getFiscalSettings(data.enterpriseId);
    if (existing) {
      const [updated] = await db.update(fiscalSettings).set(data).where(eq(fiscalSettings.id, existing.id)).returning();
      return updated;
    } else {
      const [inserted] = await db.insert(fiscalSettings).values(data).returning();
      return inserted;
    }
  }

  async getLogsFiscais(enterpriseId: number): Promise<any[]> {
    return [];
  }
}

export const storage = new DatabaseStorage();
