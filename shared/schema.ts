import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // "login", "logout"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSessionSchema = createInsertSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("barber"), // "admin" or "barber"
  fingerprintId: text("fingerprint_id").unique(), // ID da digital vinculada
  enterpriseId: integer("enterprise_id").references(() => enterprises.id),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: integer("ticket_number").notNull(),
  serviceId: integer("service_id"),
  status: text("status", { enum: ["pending", "serving", "completed", "cancelled"] }).default("pending").notNull(),
  items: text("items").array(), // JSON strings or simple item identifiers
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const queueState = pgTable("queue_state", {
  id: serial("id").primaryKey(),
  currentNumber: integer("current_number").default(0).notNull(), // The last issued ticket number
  servingNumber: integer("serving_number").default(0).notNull(), // The currently displayed/served number
});

// Schemas
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  order: integer("order").notNull().default(0),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  tags: text("tags").array(), // e.g. ["Vegetarian", "Spicy"]
});

export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertTicketSchema = createInsertSchema(tickets);
export const insertQueueStateSchema = createInsertSchema(queueState);
export const insertCategorySchema = createInsertSchema(categories);
export const cashRegisters = pgTable("cash_register", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  openingAmount: integer("opening_amount"), // in cents
  closingAmount: integer("closing_amount"), // in cents
  difference: integer("difference"), // in cents
  status: text("status").notNull(), // "open", "closed"
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  cashRegisterId: integer("cash_register_id").references(() => cashRegisters.id),
  userId: integer("user_id").references(() => users.id),
  totalAmount: integer("total_amount").notNull(), // in cents
  customerTaxId: text("customer_tax_id"), // CPF para NF-e
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"), // Logradouro, número, bairro
  customerCity: text("customer_city"),
  customerState: text("customer_state"),
  customerZip: text("customer_zip"),
  fiscalStatus: text("fiscal_status").notNull().default("pending"), // "pending", "issued", "error", "none"
  fiscalKey: text("fiscal_key"), // Chave de acesso da NF-e
  fiscalXml: text("fiscal_xml"), // XML da nota (armazenamento local inicial)
  fiscalError: text("fiscal_error"), // Log de erro da SEFAZ
  fiscalType: text("fiscal_type").default("NFCe"), // "NFe" (grande) ou "NFCe" (cupom)
  status: text("status").notNull().default("completed"), // "completed", "cancelled"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  itemType: text("item_type").notNull(), // "product", "service"
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents
  totalPrice: integer("total_price").notNull(), // in cents
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  method: text("method").notNull(), // "cash", "card", "pix"
  amount: integer("amount").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCashRegisterSchema = createInsertSchema(cashRegisters, {
  openingAmount: z.number().transform(v => Math.round(v * 100)),
  closingAmount: z.number().transform(v => Math.round(v * 100)).optional(),
});
export const insertSaleSchema = createInsertSchema(sales);
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ saleId: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ saleId: true });
export const insertMenuItemSchema = createInsertSchema(menuItems);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessType: text("business_type").notNull(), // "barbearia", "padaria"
  type: text("type").notNull(), // "income", "expense"
  category: text("category").notNull(), // e.g., "venda", "aluguel", "estoque", "outros"
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions);

export const timeClock = pgTable("time_clock", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // "in", "break_start", "break_end", "out"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  fingerprintId: text("fingerprint_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimeClockSchema = createInsertSchema(timeClock);
export type TimeClock = typeof timeClock.$inferSelect;
export type InsertTimeClock = z.infer<typeof insertTimeClockSchema>;

export const enterprises = pgTable("enterprises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  taxId: text("tax_id"), // CNPJ ou CPF
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  addressProofUrl: text("address_proof_url"),
  rgFrontUrl: text("rg_front_url"),
  rgBackUrl: text("rg_back_url"),
  slug: text("slug").notNull().unique(), // URL-friendly name
  status: text("status").notNull().default("pending"), // "pending", "active", "rejected"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  enterpriseId: integer("enterprise_id").references(() => enterprises.id),
  siteName: text("site_name").default("Barbearia & Padaria").notNull(),
  logoUrl: text("logo_url").default(""),
  primaryColor: text("primary_color").default("#00FF66").notNull(), // Neon Green
  secondaryColor: text("secondary_color").default("#10b981").notNull(),
  accentColor: text("accent_color").default("#00FF66").notNull(),
  backgroundColor: text("background_color").default("#0a0a0b").notNull(),
  bgImageUrl: text("bg_image_url").default(""),
  borderRadius: text("border_radius").default("1rem").notNull(),
  glassOpacity: text("glass_opacity").default("0.1").notNull(),
});

export const insertEnterpriseSchema = createInsertSchema(enterprises);
export type Enterprise = typeof enterprises.$inferSelect;
export type InsertEnterprise = z.infer<typeof insertEnterpriseSchema>;

export const insertSettingsSchema = createInsertSchema(settings);
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type QueueState = typeof queueState.$inferSelect;
export type InsertQueueState = z.infer<typeof insertQueueStateSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Transaction = typeof transactions.$inferSelect;
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(), // References menuItems.id or services.id
  itemType: text("item_type").notNull(), // "product" or "service"
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(), // e.g., "Bag", "Caixa", "Unidade"
  itemsPerUnit: integer("items_per_unit").notNull().default(1),
  expiryDate: timestamp("expiry_date"),
  minStock: integer("min_stock").notNull().default(5),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  type: text("type").notNull(), // "in" (entrada) or "out" (saída)
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
export const insertInventoryLogSchema = createInsertSchema(inventoryLogs).omit({ id: true, createdAt: true });

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type InsertInventoryLog = z.infer<typeof insertInventoryLogSchema>;

export type CreateServiceRequest = Omit<InsertService, "id">;
export type UpdateServiceRequest = Partial<CreateServiceRequest>;
export type LoginRequest = z.infer<typeof insertUserSchema>;
