import type { Express } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage, storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { 
  insertCashRegisterSchema, 
  insertSaleSchema, 
  insertSaleItemSchema, 
  insertPaymentSchema, 
  insertTransactionSchema, 
  insertTimeClockSchema,
  insertInventorySchema
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import SQLiteStore from "better-sqlite3-session-store";
import sqlite from "better-sqlite3";
import passport from "passport";
import { WebSocketServer, WebSocket } from "ws";

const SessionStore = SQLiteStore(session);
const dbSession = new sqlite("sessions.db");
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.diskStorage({
    destination: "attached_assets/uploads/",
    filename: (req: any, file: any, cb: any) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(stored: string, supplied: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

import { eq, desc, asc, and, isNull, gte, lte, or } from "drizzle-orm";
import { db } from "./db";
import { tickets, users, fiscalSettings, insertFiscalSettingsSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // WebSocket for Label System
  const wss = new WebSocketServer({ noServer: true });
  let windowsClient: WebSocket | null = null;

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url;

    if (pathname === '/ws/labels') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('WS Connection established for labels');

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'WINDOWS_HELLO') {
          windowsClient = ws;
          console.log('Windows Label App connected');
        }
      } catch (e) {
        console.error('WS Message error:', e);
      }
    });

    ws.on('close', () => {
      if (ws === windowsClient) {
        windowsClient = null;
        console.log('Windows Label App disconnected');
      }
    });
  });

  // Label Printing Route
  app.post("/api/labels/print", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const user = req.user as any;
    if (user.username !== "SkelleTu") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (!windowsClient || windowsClient.readyState !== WebSocket.OPEN) {
      return res.status(500).json({ error: "APP WINDOWS OFFLINE" });
    }

    windowsClient.send(JSON.stringify({
      type: "PRINT_LABEL",
      payload: req.body
    }));

    res.json({ status: "ENVIADO" });
  });

  app.get("/api/labels/status", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const user = req.user as any;
    if (user.username !== "SkelleTu") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    res.json({
      appConnected: !!windowsClient && windowsClient.readyState === WebSocket.OPEN
    });
  });

  // Session & Auth Setup
  app.use(
    session({
      store: new SessionStore({
        client: dbSession,
        expired: {
          clear: true,
          intervalMs: 900000 // 15 minutes
        }
      }),
      secret: process.env.SESSION_SECRET || "barber_shop_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dias
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Incorrect username." });
        
        const isValid = await comparePassword(user.password, password);
        if (!isValid) return done(null, false, { message: "Incorrect password." });
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes
  app.post(api.auth.login.path, passport.authenticate("local"), async (req, res) => {
    const user = req.user as any;
    await storage.logUserSession({
      userId: user.id,
      type: "login",
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json(req.user);
  });

  app.post(api.auth.logout.path, async (req, res) => {
    const user = req.user as any;
    if (user) {
      await storage.logUserSession({
        userId: user.id,
        type: "logout",
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
    }
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logout successful" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  app.get("/api/admin/monitoring", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao proprietário" });
    const data = await storage.getAdminMonitoringData();
    res.json(data);
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });

  app.post("/api/admin/register-barber", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Apenas administradores podem cadastrar barbeiros" });
    
    try {
      const { username, password } = req.body;
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(400).json({ message: "Usuário já existe" });
      
      const hashed = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashed,
        role: "barber"
      });
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ message: "Erro ao cadastrar barbeiro" });
    }
  });

  // Enterprise Routes
  app.get("/api/admin/enterprises", async (req, res) => {
    const list = await storage.getEnterprises();
    res.json(list);
  });

  app.post("/api/admin/enterprises", async (req, res) => {
    try {
      const { name, slug, username, password } = req.body;
      
      console.log("Recebendo dados para registro de instituição:", { name, slug, username, hasPassword: !!password });

      if (!password) {
        return res.status(400).json({ message: "A senha é obrigatória." });
      }
      
      // Validação básica do slug se não for enviado
      const finalSlug = slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      
      const existing = await storage.getEnterpriseBySlug(finalSlug);
      if (existing) {
        return res.status(400).json({ message: "Uma instituição com este nome ou slug já existe." });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Este nome de usuário já está em uso." });
      }

      const hashedPassword = await hashPassword(password);
      
      const enterpriseData = { ...req.body };
      delete enterpriseData.username;
      delete enterpriseData.password;
      enterpriseData.slug = finalSlug;
      enterpriseData.status = "pending";

      const adminData = {
        username,
        password: hashedPassword,
      };

      const enterprise = await (storage as DatabaseStorage).createEnterprise(enterpriseData, adminData);
      res.status(201).json(enterprise);
    } catch (err) {
      console.error("Erro ao criar empresa:", err);
      res.status(500).json({ message: "Erro ao criar empresa. Verifique se os dados estão corretos." });
    }
  });

  app.put("/api/admin/enterprises/:id", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
    const updated = await storage.updateEnterprise(Number(req.params.id), req.body);
    res.json(updated);
  });

  app.put("/api/admin/enterprises/:id/status", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
    const { status } = req.body;
    if (!["active", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }
    const updated = await storage.updateEnterprise(Number(req.params.id), { status });
    res.json(updated);
  });

  app.delete("/api/admin/enterprises/:id", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
    await storage.deleteEnterprise(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/settings", async (req, res) => {
    const enterpriseId = req.query.enterpriseId ? Number(req.query.enterpriseId) : undefined;
    const s = await storage.getSettings(enterpriseId);
    res.json(s);
  });

  app.post("/api/settings", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
    const s = await storage.updateSettings(req.body);
    res.json(s);
  });

  app.post("/api/admin/upload", isAuthenticated, upload.single("file"), (req: any, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito" });
    if (!req.file) return res.status(400).json({ message: "Nenhum arquivo enviado" });
    res.json({ url: `/attached_assets/uploads/${req.file.filename}` });
  });

  function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  }

  // Fiscal Routes
  app.get("/api/fiscal/settings", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Acesso restrito" });
    const settings = await storage.getFiscalSettings(user.enterpriseId);
    res.json(settings || {});
  });

  app.post("/api/fiscal/settings", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Acesso restrito" });
    try {
      const data = insertFiscalSettingsSchema.parse({ ...req.body, enterpriseId: user.enterpriseId });
      const settings = await storage.upsertFiscalSettings(data);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Dados fiscais inválidos" });
    }
  });

  app.get("/api/fiscal/logs", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "admin") return res.status(403).json({ message: "Acesso restrito" });
    const logs = await storage.getLogsFiscais(user.enterpriseId);
    res.json(logs);
  });

  // Services Routes
  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.post(api.services.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.services.create.input.parse(req.body);
      const service = await storage.createService(input);
      res.status(201).json(service);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put(api.services.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.services.update.input.parse(req.body);
      const service = await storage.updateService(Number(req.params.id), input);
      res.json(service);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete(api.services.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.status(204).send();
  });

  // Queue Routes
  app.get(api.queue.state.path, async (req, res) => {
    const state = await storage.getQueueState();
    res.json(state);
  });

  app.post(api.queue.next.path, async (req, res) => {
    const state = await storage.getQueueState();
    const newState = await storage.updateQueueState({ servingNumber: state.servingNumber + 1 });
    res.json(newState);
  });

  app.post(api.queue.prev.path, async (req, res) => {
    const state = await storage.getQueueState();
    const newNum = Math.max(0, state.servingNumber - 1);
    const newState = await storage.updateQueueState({ servingNumber: newNum });
    res.json(newState);
  });

  app.post(api.queue.reset.path, async (req, res) => {
    const input = api.queue.reset.input.parse(req.body);
    const newState = await storage.updateQueueState({ servingNumber: input.startFrom, currentNumber: input.startFrom });
    res.json(newState);
  });

  app.post(api.queue.set.path, async (req, res) => {
    const input = api.queue.set.input.parse(req.body);
    const newState = await storage.updateQueueState({ servingNumber: input.number });
    res.json(newState);
  });

  app.post(api.queue.createTicket.path, async (req, res) => {
    const input = api.queue.createTicket.input.parse(req.body);
    const state = await storage.getQueueState();
    
    // Find next available ticket number that isn't currently active (pending or serving)
    let nextNum = state.currentNumber + 1;
    let isUnique = false;
    while (!isUnique) {
      const existing = await db.select().from(tickets).where(and(
        eq(tickets.ticketNumber, nextNum),
        or(eq(tickets.status, "pending"), eq(tickets.status, "serving"))
      )).limit(1);
      
      if (existing.length === 0) {
        isUnique = true;
      } else {
        nextNum++;
      }
    }

    await storage.updateQueueState({ currentNumber: nextNum });
    const ticket = await storage.createTicket({
      ticketNumber: nextNum,
      serviceId: input.serviceId,
      status: "pending"
    });
    res.status(201).json(ticket);
  });

  // Digital Menu Routes
  app.get("/api/categories", async (req, res) => {
    const categoriesList = await storage.getCategories();
    res.json(categoriesList);
  });

  // Inventory API
  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const body = { ...req.body };
      // Trata a conversão de string de data para objeto Date se necessário
      if (body.expiryDate && typeof body.expiryDate === 'string') {
        body.expiryDate = new Date(body.expiryDate);
      }
      
      // Se costPrice ou salePrice vierem como string com vírgula ou ponto decimal, tratamos aqui
      if (typeof body.costPrice === 'string') {
        body.costPrice = Math.round(Number(body.costPrice.replace(',', '.')) * 100);
      }
      if (typeof body.salePrice === 'string') {
        body.salePrice = Math.round(Number(body.salePrice.replace(',', '.')) * 100);
      }

      const item = await storage.upsertInventory(body);
      res.json(item);
    } catch (err) {
      console.error("Erro no upsert de inventário:", err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Erro ao atualizar estoque" });
      }
    }
  });

  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    const items = await storage.getInventory();
    res.json(items);
  });

  app.delete("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInventoryItem(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      console.error("Erro ao deletar item do estoque:", err);
      res.status(500).json({ message: "Erro ao deletar item do estoque" });
    }
  });

  app.get("/api/menu-items", async (req, res) => {
    const items = (await storage.getMenuItems()).map(item => ({
      ...item,
      tags: typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || [])
    }));
    res.json(items);
  });

  // Cashier API
  app.get("/api/cash-register/open", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const register = await storage.getOpenCashRegister(user.id);
    if (!register) return res.status(404).json({ message: "No open register" });
    res.json(register);
  });

  app.post("/api/cash-register/open", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const existing = await storage.getOpenCashRegister(user.id);
    if (existing) return res.status(400).json({ message: "Register already open" });
    
    const data = insertCashRegisterSchema.parse({
      ...req.body,
      userId: user.id,
      status: "open",
      openedAt: new Date()
    });
    const register = await storage.openCashRegister(data);
    res.json(register);
  });

  app.post("/api/cash-register/close", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const register = await storage.getOpenCashRegister(user.id);
    if (!register) return res.status(404).json({ message: "No open register" });
    
    const updated = await storage.closeCashRegister(register.id, {
      ...req.body,
      status: "closed",
      closedAt: new Date()
    });
    res.json(updated);
  });

  app.post("/api/sales", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const register = await storage.getOpenCashRegister(user.id);
    if (!register) return res.status(400).json({ message: "Register must be open to make a sale" });

    const { sale, items, payments, ticketId } = req.body;
    
    const parsedSale = insertSaleSchema.parse({ 
      ...sale, 
      cashRegisterId: register.id, 
      userId: user.id,
      fiscalStatus: sale.customerTaxId ? "pending" : "none",
      createdAt: new Date()
    });
    const parsedItems = items.map((item: any) => insertSaleItemSchema.parse(item));
    const parsedPayments = payments.map((p: any) => insertPaymentSchema.parse(p));

    const newSale = await storage.createSale(
      parsedSale,
      parsedItems,
      parsedPayments
    );

    if (ticketId) {
      // Mark ticket as completed when sale is finalized
      await db.update(tickets).set({ status: "completed" }).where(eq(tickets.id, ticketId));
    }

    // Notificação Webhook Simples (Ex: para o dono receber via celular)
    const WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;
    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `💰 Nova Venda: R$ ${(newSale.totalAmount / 100).toFixed(2)}`,
          saleId: newSale.id,
          method: payments[0]?.method
        })
      }).catch(err => console.error("Erro ao enviar notificação:", err));
    }

    res.json(newSale);
  });

  app.get("/api/sales", isAuthenticated, async (req, res) => {
    const { start, end } = req.query;
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const isValidDate = (date: any) => date instanceof Date && !isNaN(date.getTime());

    if (start && start !== "undefined" && start !== "") {
      const date = new Date(start as string);
      if (isValidDate(date)) startDate = date;
    }

    if (end && end !== "undefined" && end !== "") {
      const date = new Date(end as string);
      if (isValidDate(date)) endDate = date;
    }

    const filters = { startDate, endDate };
    const salesList = await storage.getSales(filters);
    res.json(salesList);
  });

  app.post("/api/sales/:id/emit-fiscal", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const salesList = await storage.getSales({});
      const sale = salesList.find(s => s.id === id);
      
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });
      if (!sale.customerTaxId) return res.status(400).json({ message: "CPF necessário para emissão" });

      // Simulação de emissão (Estrutura completa NF-e / NFC-e)
      const isNFCe = sale.fiscalType === "NFCe";
      const mod = isNFCe ? "65" : "55";
      const simulatedKey = `35240100000000000191${mod}001${String(sale.id).padStart(9, '0')}123456789`;
      
      const simulatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${simulatedKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>Venda de Mercadoria</natOp>
        <mod>${mod}</mod>
        <serie>1</serie>
        <nNF>${sale.id}</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpImp>${isNFCe ? '4' : '1'}</tpImp>
      </ide>
      <emit>
        <CNPJ>00000000000191</CNPJ>
        <xNome>Barbearia &amp; Padaria SkelleTu</xNome>
        <enderEmit>
          <xLgr>Rua Exemplo</xLgr><nro>123</nro><xBairro>Centro</xBairro><cMun>3550308</cMun><xMun>SAO PAULO</xMun><UF>SP</UF>
        </enderEmit>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CPF>${sale.customerTaxId}</CPF>
        <xNome>${sale.customerName || 'Consumidor Final'}</xNome>
        ${!isNFCe ? `<enderDest><xLgr>${sale.customerAddress || ''}</xLgr><nro>SN</nro><xBairro>Bairro</xBairro><cMun>3550308</cMun><xMun>${sale.customerCity || ''}</xMun><UF>${sale.customerState || ''}</UF></enderDest>` : ''}
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>Serviço/Produto Geral</xProd>
          <NCM>00000000</NCM>
          <CFOP>${isNFCe ? '5102' : '5101'}</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${(sale.totalAmount/100).toFixed(2)}</vUnCom>
          <vProd>${(sale.totalAmount/100).toFixed(2)}</vProd>
        </prod>
        <imposto>
          <vTotTrib>${(sale.totalAmount * 0.1345 / 100).toFixed(2)}</vTotTrib>
          <ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>${(sale.totalAmount/100).toFixed(2)}</vBC><pICMS>18.00</pICMS><vICMS>${(sale.totalAmount * 0.18 / 100).toFixed(2)}</vICMS></ICMS00></ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>${(sale.totalAmount/100).toFixed(2)}</vBC><vICMS>${(sale.totalAmount * 0.18 / 100).toFixed(2)}</vICMS>
          <vProd>${(sale.totalAmount/100).toFixed(2)}</vProd><vNF>${(sale.totalAmount/100).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp><modFrete>9</modFrete></transp>
      <pag>
        <detPag><tPag>01</tPag><vPag>${(sale.totalAmount/100).toFixed(2)}</vPag></detPag>
      </pag>
    </infNFe>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo>...</Signature>
  </NFe>
</nfeProc>`;
      
      const updatedSale = await storage.updateSaleFiscal(sale.id, {
        fiscalStatus: "issued",
        fiscalKey: simulatedKey,
        fiscalXml: simulatedXml
      });

      res.json({ 
        message: "Simulação de emissão concluída", 
        key: simulatedKey,
        status: "issued",
        sale: updatedSale
      });
    } catch (err) {
      res.status(500).json({ message: "Erro na simulação fiscal" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const { start, end, businessType } = req.query;
      console.log('API Request - GET /api/transactions:', { start, end, businessType });
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      const isValidDate = (date: any) => date instanceof Date && !isNaN(date.getTime());

      if (start && start !== "undefined" && start !== "") {
        const date = new Date(start as string);
        if (isValidDate(date)) startDate = date;
      }

      if (end && end !== "undefined" && end !== "") {
        const date = new Date(end as string);
        if (isValidDate(date)) endDate = date;
      }

      const filters = {
        startDate,
        endDate,
        businessType: businessType as string,
      };
      const list = await storage.getTransactions(filters);
      console.log('Storage returned transactions count:', list.length);
      res.json(list);
    } catch (err) {
      console.error('Error in GET /api/transactions:', err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const input = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransaction(id);
      res.status(200).json({ message: "Transaction deleted" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inventory API
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    const items = await storage.getInventory();
    res.json(items);
  });

  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao dono" });
      
      const data = req.body;
      const item = await storage.upsertInventory(data);
      
      await storage.createInventoryLog({
        inventoryId: item.id,
        type: "in",
        quantity: data.quantity,
        reason: "Manual Adjustment",
        userId: user.id
      });
      
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar estoque" });
    }
  });

  app.post("/api/inventory/log", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const log = await storage.createInventoryLog({ ...req.body, userId: user.id });
    const inv = await storage.getInventoryItem(log.inventoryId);
    if (inv) {
      const newQty = log.type === "in" ? inv.quantity + log.quantity : inv.quantity - log.quantity;
      await storage.updateInventory(inv.id, newQty);
    }
    res.json(log);
  });
  app.post("/api/tickets/:id/items", async (req, res) => {
    try {
      const { items } = req.body;
      const ticket = await storage.updateTicketItems(Number(req.params.id), items);
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar comanda" });
    }
  });

  // Time Clock Routes
  app.get("/api/time-clock/history", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const history = await storage.getTimeClockHistory(user.id);
    res.json(history);
  });

  app.get("/api/admin/time-clock/history/:userId", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.username !== "SkelleTu") return res.status(403).json({ message: "Acesso restrito ao administrador" });
    const history = await storage.getTimeClockHistory(Number(req.params.userId));
    res.json(history);
  });

  app.get("/api/time-clock/status", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const latest = await storage.getLatestTimeClock(user.id);
    res.json({ latest });
  });

  app.post("/api/time-clock/register", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { type, fingerprintId } = req.body;
    
    if (!user.fingerprintId) {
      return res.status(400).json({ message: "Você precisa cadastrar sua digital primeiro!" });
    }

    if (fingerprintId !== user.fingerprintId) {
      return res.status(400).json({ message: "Digital não reconhecida." });
    }
    
    const clock = await storage.createTimeClock({
      userId: user.id,
      type, // "in", "break_start", "break_end", "out"
      timestamp: new Date(),
      fingerprintId
    });
    res.json(clock);
  });

  app.post("/api/auth/register-fingerprint", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { fingerprintId } = req.body;
    if (!fingerprintId) return res.status(400).json({ message: "ID da digital é obrigatório" });
    
    await db.update(users).set({ fingerprintId }).where(eq(users.id, user.id));
    res.json({ message: "Digital vinculada com sucesso" });
  });

  app.get("/api/tickets/:number", async (req, res) => {
    const ticket = await storage.getTicketByNumber(Number(req.params.number));
    if (!ticket) return res.status(404).json({ message: "Comanda não encontrada" });
    res.json(ticket);
  });
  const adminUser = await storage.getUserByUsername("SkelleTu");
  if (!adminUser) {
    const hashed = await hashPassword("Victor.!.1999");
    await storage.createUser({
      username: "SkelleTu",
      password: hashed,
      role: "admin"
    });
    console.log("Admin user seeded");
  }

  // Seed Barber User
  const barberUser = await storage.getUserByUsername("Barbeiro1");
  if (!barberUser) {
    const hashed = await hashPassword("SenhaBarbeiro");
    await storage.createUser({
      username: "Barbeiro1",
      password: hashed,
      role: "barber"
    });
    console.log("Barber user seeded");
  }

  // Seed Ticket 20 for testing
  const ticket20 = await storage.getTicketByNumber(20);
  if (!ticket20) {
    await storage.createTicket({
      ticketNumber: 20,
      status: "pending",
      items: "[]"
    });
    console.log("Ticket 20 seeded for testing");
  }

  // Seed Data (Categories -> Services & Menu Items)
  const categoriesList = await storage.getCategories();
  if (categoriesList.length === 0) {
    const cat1 = await storage.createCategory({ name: "Cortes de Cabelo", icon: "Scissors", order: 1 });
    const cat2 = await storage.createCategory({ name: "Barba e Tratamentos", icon: "Info", order: 2 });
    const cat3 = await storage.createCategory({ name: "Pães Artesanais", icon: "Croissant", order: 3 });
    const cat4 = await storage.createCategory({ name: "Doces e Bolos", icon: "Cake", order: 4 });
    const cat5 = await storage.createCategory({ name: "Bebidas Quentes", icon: "Coffee", order: 5 });

    await storage.createService({ 
      name: "Corte Clássico", 
      price: 3000, 
      imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b7f304?q=80&w=1000&auto=format&fit=crop",
      isActive: true
    });
    await storage.createService({ 
      name: "Barba Completa", 
      price: 2500, 
      imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000&auto=format&fit=crop",
      isActive: true
    });
    await storage.createService({ 
      name: "Corte + Barba", 
      price: 5000, 
      imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop",
      isActive: true
    });
    await storage.createService({ 
      name: "Pezinho / Acabamento", 
      price: 1500, 
      imageUrl: "https://images.unsplash.com/photo-1585747685352-3a996977f6cd?q=80&w=1000&auto=format&fit=crop",
      isActive: true
    });

    await storage.createMenuItem({
      categoryId: cat1.id,
      name: "Corte Degradê (Fade)",
      description: "Técnica moderna com transição suave nas laterais, acabamento perfeito e estilo contemporâneo.",
      price: 5500,
      imageUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80",
      tags: ["Moderno", "Tendência"]
    });

    await storage.createMenuItem({
      categoryId: cat1.id,
      name: "Corte Executivo Tesoura",
      description: "Corte clássico realizado inteiramente na tesoura, ideal para um visual sóbrio e profissional.",
      price: 6500,
      imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b7f304?w=800&q=80",
      tags: ["Clássico", "Tesoura"]
    });

    await storage.createMenuItem({
      categoryId: cat1.id,
      name: "Corte Militar",
      description: "Praticidade e estilo com corte bem baixo, uniforme e de fácil manutenção.",
      price: 4500,
      imageUrl: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=800&q=80",
      tags: ["Prático", "Militar"]
    });

    await storage.createMenuItem({
      categoryId: cat2.id,
      name: "Barba com Toalha Quente",
      description: "Ritual tradicional com vaporizador, toalhas quentes e navalha para um barbear suave e relaxante.",
      price: 4000,
      imageUrl: "https://images.unsplash.com/photo-1512690118294-7003820986b1?w=800&q=80",
      tags: ["Relaxante", "Tradicional"]
    });

    await storage.createMenuItem({
      categoryId: cat2.id,
      name: "Modelagem de Barba",
      description: "Ajuste de volume e contornos da barba, utilizando máquinas e tesouras para um visual alinhado.",
      price: 3500,
      imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80",
      tags: ["Estilo", "Alinhado"]
    });

    await storage.createMenuItem({
      categoryId: cat3.id,
      name: "Baguete de Longa Fermentação",
      description: "Pão de casca crocante e miolo aerado, produzido com levain e maturação de 24 horas.",
      price: 1800,
      imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddf13cf?w=800&q=80",
      tags: ["Artesanal", "Levain"]
    });

    await storage.createMenuItem({
      categoryId: cat3.id,
      name: "Croissant de Manteiga Francesa",
      description: "Folhado com 100% manteiga, textura aveludada e múltiplas camadas de sabor.",
      price: 1400,
      imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
      tags: ["Folhado", "Clássico"]
    });

    await storage.createMenuItem({
      categoryId: cat3.id,
      name: "Pão de Campanha",
      description: "Rústico e saboroso, com mix de farinhas integrais e fermentação natural.",
      price: 2200,
      imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80",
      tags: ["Rústico", "Integral"]
    });

    await storage.createMenuItem({
      categoryId: cat4.id,
      name: "Eclair de Pistache e Framboesa",
      description: "Massa choux fina, recheada com ganache de pistache siciliano e geleia artesanal de framboesa.",
      price: 1900,
      imageUrl: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80",
      tags: ["Confeitaria", "Fino"]
    });

    await storage.createMenuItem({
      categoryId: cat4.id,
      name: "Tartelette de Frutas Vermelhas",
      description: "Massa sablée crocante, creme de baunilha Bourbon e seleção de frutas vermelhas frescas.",
      price: 2400,
      imageUrl: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&q=80",
      tags: ["Frutas", "Frescor"]
    });

    await storage.createMenuItem({
      categoryId: cat5.id,
      name: "Latte Macchiato Caramelo",
      description: "Camadas de leite cremoso, espresso intenso e um toque de calda artesanal de caramelo salgado.",
      price: 1600,
      imageUrl: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&q=80",
      tags: ["Bebida Quente"]
    });

    await storage.createMenuItem({
      categoryId: cat5.id,
      name: "Cappuccino Italiano",
      description: "Equilíbrio perfeito entre espresso, leite vaporizado e uma densa camada de espuma.",
      price: 1400,
      imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&q=80",
      tags: ["Clássico"]
    });

    console.log("Full business data seeded successfully");
  }

  return httpServer;
}
