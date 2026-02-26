import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as schema from "../shared/schema.js";
import path from "path";
import { sql } from "drizzle-orm";

// 1. Configuração do SQLite Local (Rápido, mas volátil na Vercel)
const localSqlite = new Database(process.env.VERCEL ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db"));
export const dbLocal = drizzleSqlite(localSqlite, { schema });

// 2. Configuração do Banco Persistente (Turso ou outro)
// Se houver TURSO_DATABASE_URL, usamos como mestre.
let remoteDb: any = null;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  try {
    const client = createClient({ 
      url: process.env.TURSO_DATABASE_URL, 
      authToken: process.env.TURSO_AUTH_TOKEN 
    });
    remoteDb = drizzleLibsql(client, { schema });
    console.log("Conectado ao Turso com sucesso.");
  } catch (e) {
    console.error("Erro ao conectar ao Turso:", e);
  }
}

// Exportamos o db que tenta usar o remoto, caindo no local se não configurado
export const db = remoteDb || dbLocal;
export const isRemoteEnabled = !!remoteDb;

// Auto-migration for SQLite in ephemeral environments like Vercel
export async function setupDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'barber',
      fingerprint_id TEXT UNIQUE,
      enterprise_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number INTEGER NOT NULL,
      service_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      items TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS queue_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current_number INTEGER NOT NULL DEFAULT 0,
      serving_number INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      barcode TEXT,
      tags TEXT,
      ncm TEXT,
      cfop TEXT,
      icms_origem INTEGER DEFAULT 0,
      icms_st TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cash_register (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      opened_at INTEGER,
      closed_at INTEGER,
      opening_amount INTEGER,
      closing_amount INTEGER,
      difference INTEGER,
      status TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER,
      user_id INTEGER,
      total_amount INTEGER NOT NULL,
      customer_tax_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_address TEXT,
      customer_city TEXT,
      customer_state TEXT,
      customer_zip TEXT,
      fiscal_status TEXT NOT NULL DEFAULT 'pending',
      fiscal_key TEXT,
      fiscal_xml TEXT,
      fiscal_error TEXT,
      fiscal_type TEXT DEFAULT 'NFCe',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_type TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS time_clock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      fingerprint_id TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS enterprises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_id TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      address_proof_url TEXT,
      rg_front_url TEXT,
      rg_back_url TEXT,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enterprise_id INTEGER,
      site_name TEXT NOT NULL DEFAULT 'Padaria',
      logo_url TEXT DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#00FF66',
      secondary_color TEXT NOT NULL DEFAULT '#10b981',
      accent_color TEXT NOT NULL DEFAULT '#00FF66',
      background_color TEXT NOT NULL DEFAULT '#0a0a0b',
      bg_image_url TEXT DEFAULT '',
      border_radius TEXT NOT NULL DEFAULT '1rem',
      glass_opacity TEXT NOT NULL DEFAULT '0.1'
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      item_type TEXT NOT NULL,
      custom_name TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      items_per_unit INTEGER NOT NULL DEFAULT 1,
      cost_price INTEGER NOT NULL DEFAULT 0,
      sale_price INTEGER,
      barcode TEXT,
      expiry_date INTEGER,
      min_stock INTEGER NOT NULL DEFAULT 5,
      image_url TEXT,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_restocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      items_per_unit INTEGER NOT NULL DEFAULT 1,
      cost_price INTEGER NOT NULL DEFAULT 0,
      expiry_date INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS fiscal_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enterprise_id INTEGER NOT NULL,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT NOT NULL,
      cnpj TEXT NOT NULL,
      inscricao_estadual TEXT NOT NULL,
      logradouro TEXT NOT NULL,
      numero TEXT NOT NULL,
      bairro TEXT NOT NULL,
      municipio TEXT NOT NULL,
      codigo_ibge TEXT NOT NULL,
      uf TEXT NOT NULL,
      cep TEXT NOT NULL,
      regime_tributario TEXT NOT NULL,
      csc_token TEXT,
      csc_id TEXT,
      serie_nfce INTEGER NOT NULL DEFAULT 1,
      ambiente TEXT NOT NULL DEFAULT 'homologacao',
      certificado_a1 TEXT,
      certificado_senha TEXT,
      printer_width TEXT NOT NULL DEFAULT '58mm'
    )`
  ];

  for (const table of tables) {
    try {
      if (isRemoteEnabled) {
        await (db as any).run(sql.raw(table));
      } else {
        localSqlite.prepare(table).run();
      }
    } catch (e) {
      console.error(`Erro ao criar tabela:`, e);
    }
  }
}

// Helper para manter compatibilidade com o pool se necessário
export const pool = {
  connect: () => ({ release: () => {} }),
  query: () => ({ rows: [] }),
  end: () => {}
} as any;
