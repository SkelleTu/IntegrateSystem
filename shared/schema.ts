import { sqliteTable as pgTable, text, integer, numeric } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userSessions = pgTable("user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "login", "logout"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("barber"), // "admin" or "barber"
  fingerprintId: text("fingerprint_id").unique(), // ID da digital vinculada
  enterpriseId: integer("enterprise_id"),
});

export const services = pgTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(true).notNull(),
});

export const tickets = pgTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketNumber: integer("ticket_number").notNull(),
  serviceId: integer("service_id"),
  status: text("status").default("pending").notNull(),
  items: text("items"), // Store as JSON string since SQLite doesn't have native arrays
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const queueState = pgTable("queue_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currentNumber: integer("current_number").default(0).notNull(), 
  servingNumber: integer("serving_number").default(0).notNull(), 
});

export const categories = pgTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  order: integer("order").notNull().default(0),
});

export const menuItems = pgTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  isAvailable: integer("is_available", { mode: 'boolean' }).default(true).notNull(),
  barcode: text("barcode"), // Código de barras para busca
  tags: text("tags"), // Store as JSON string
});

export const cashRegisters = pgTable("cash_register", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  openedAt: integer("opened_at", { mode: 'timestamp' }),
  closedAt: integer("closed_at", { mode: 'timestamp' }),
  openingAmount: integer("opening_amount"), // in cents
  closingAmount: integer("closing_amount"), // in cents
  difference: integer("difference"), // in cents
  status: text("status").notNull(), // "open", "closed"
});

export const sales = pgTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cashRegisterId: integer("cash_register_id"),
  userId: integer("user_id"),
  totalAmount: integer("total_amount").notNull(), // in cents
  customerTaxId: text("customer_tax_id"), 
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"), 
  customerCity: text("customer_city"),
  customerState: text("customer_state"),
  customerZip: text("customer_zip"),
  fiscalStatus: text("fiscal_status").notNull().default("pending"), 
  fiscalKey: text("fiscal_key"), 
  fiscalXml: text("fiscal_xml"), 
  fiscalError: text("fiscal_error"), 
  fiscalType: text("fiscal_type").default("NFCe"), 
  status: text("status").notNull().default("completed"), 
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const saleItems = pgTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").notNull(),
  itemType: text("item_type").notNull(), 
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents
  totalPrice: integer("total_price").notNull(), // in cents
});

export const payments = pgTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").notNull(),
  method: text("method").notNull(), // "cash", "card", "pix"
  amount: integer("amount").notNull(), // in cents
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const transactions = pgTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessType: text("business_type").notNull(), // "barbearia", "padaria"
  type: text("type").notNull(), // "income", "expense"
  category: text("category").notNull(), 
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // in cents
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const timeClock = pgTable("time_clock", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "in", "break_start", "break_end", "out"
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  fingerprintId: text("fingerprint_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const enterprises = pgTable("enterprises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  taxId: text("tax_id"), 
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  addressProofUrl: text("address_proof_url"),
  rgFrontUrl: text("rg_front_url"),
  rgBackUrl: text("rg_back_url"),
  slug: text("slug").notNull().unique(), 
  status: text("status").notNull().default("pending"), 
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  enterpriseId: integer("enterprise_id"),
  siteName: text("site_name").default("Barbearia & Padaria").notNull(),
  logoUrl: text("logo_url").default(""),
  primaryColor: text("primary_color").default("#00FF66").notNull(), 
  secondaryColor: text("secondary_color").default("#10b981").notNull(),
  accentColor: text("accent_color").default("#00FF66").notNull(),
  backgroundColor: text("background_color").default("#0a0a0b").notNull(),
  bgImageUrl: text("bg_image_url").default(""),
  borderRadius: text("border_radius").default("1rem").notNull(),
  glassOpacity: text("glass_opacity").default("0.1").notNull(),
});

export const inventory = pgTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id"), // Can be null for custom items
  itemType: text("item_type").notNull(), // "product", "service", or "custom"
  customName: text("custom_name"), // Name for custom items
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(), 
  itemsPerUnit: integer("items_per_unit").notNull().default(1),
  costPrice: integer("cost_price").notNull().default(0), // in cents
  salePrice: integer("sale_price"), // in cents
  barcode: text("barcode"), // Barcode or internal ID
  expiryDate: integer("expiry_date", { mode: 'timestamp' }),
  minStock: integer("min_stock").notNull().default(5),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inventoryId: integer("inventory_id").notNull(),
  type: text("type").notNull(), // "in" or "out"
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Helper types and schemas
export const fiscalSettings = pgTable("fiscal_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  enterpriseId: integer("enterprise_id").notNull(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia").notNull(),
  cnpj: text("cnpj").notNull(),
  inscricaoEstadual: text("inscricao_estadual").notNull(),
  logradouro: text("logradouro").notNull(),
  numero: text("numero").notNull(),
  bairro: text("bairro").notNull(),
  municipio: text("municipio").notNull(),
  codigoIbge: text("codigo_ibge").notNull(),
  uf: text("uf").notNull(),
  cep: text("cep").notNull(),
  regimeTributario: text("regime_tributario").notNull(), // "Simples Nacional", etc
  cscToken: text("csc_token"),
  cscId: text("csc_id"),
  serieNfce: integer("serie_nfce").notNull().default(1),
  ambiente: text("ambiente").notNull().default("homologacao"), // "homologacao" or "producao"
  certificadoA1: text("certificado_a1"), // Base64 or path
  certificadoSenha: text("certificado_senha"),
  printerWidth: text("printer_width").default("58mm").notNull(), // "58mm" or "80mm"
});

export const insertFiscalSettingsSchema = createInsertSchema(fiscalSettings);
export type FiscalSettings = typeof fiscalSettings.$inferSelect;
export type InsertFiscalSettings = z.infer<typeof insertFiscalSettingsSchema>;

export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertTicketSchema = createInsertSchema(tickets);
export const insertQueueStateSchema = createInsertSchema(queueState);
export const insertCategorySchema = createInsertSchema(categories);
export const insertCashRegisterSchema = createInsertSchema(cashRegisters, {
  openingAmount: z.number().transform(v => Math.round(v * 100)),
  closingAmount: z.number().transform(v => Math.round(v * 100)).optional(),
});
export const insertSaleSchema = createInsertSchema(sales);
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ saleId: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ saleId: true });
export const insertMenuItemSchema = createInsertSchema(menuItems, {
  tags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertTimeClockSchema = createInsertSchema(timeClock);
export const insertEnterpriseSchema = createInsertSchema(enterprises);
export const insertSettingsSchema = createInsertSchema(settings);
export const insertInventorySchema = createInsertSchema(inventory, {
  costPrice: z.number().transform(v => Math.round(v * 100)),
  salePrice: z.number().transform(v => Math.round(v * 100)).optional(),
}).omit({ id: true, updatedAt: true });
export const insertInventoryLogSchema = createInsertSchema(inventoryLogs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type QueueState = typeof queueState.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type CashRegister = typeof cashRegisters.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type TimeClock = typeof timeClock.$inferSelect;
export type Enterprise = typeof enterprises.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryLog = typeof inventoryLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertQueueState = z.infer<typeof insertQueueStateSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertTimeClock = z.infer<typeof insertTimeClockSchema>;
export type InsertEnterprise = z.infer<typeof insertEnterpriseSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryLog = z.infer<typeof insertInventoryLogSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type CreateServiceRequest = Omit<InsertService, "id">;
export type UpdateServiceRequest = Partial<CreateServiceRequest>;
export type LoginRequest = z.infer<typeof insertUserSchema>;
