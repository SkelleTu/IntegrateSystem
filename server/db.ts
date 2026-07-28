import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import * as schema from "../shared/schema";
import path from "path";
import { sql } from "drizzle-orm";

// ─── 1. SQLite Local — SEMPRE ligado, nunca desligado ────────────────────────
const sqliteFile = process.env.VERCEL ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db");
export const localSqlite = new Database(sqliteFile);
export const dbLocal = drizzleSqlite(localSqlite, { schema });

// ─── 2. Turso (remote) — opcional, liga se as credenciais existirem ──────────
export let dbRemote: ReturnType<typeof drizzleLibsql> | null = null;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    dbRemote = drizzleLibsql(client, { schema });
    console.log("✅ Turso conectado com sucesso (banco remoto ativo).");
  } catch (e) {
    console.error("⚠️  Falha ao conectar ao Turso:", e);
  }
}

export const isRemoteEnabled = !!dbRemote;

// ─── 3. db principal — Turso se disponível, senão SQLite local ───────────────
export const db = dbRemote ?? dbLocal;

// ─── 4. Lista de TODOS os bancos ativos ──────────────────────────────────────
// Sempre inclui o local. O remoto entra se configurado.
// Nunca remove o local — é o âncora de segurança permanente.
export function getAllDatabases(): Array<typeof db> {
  if (dbRemote) {
    return [dbRemote, dbLocal]; // remoto primeiro (fonte de verdade), local como espelho
  }
  return [dbLocal];
}

// ─── 5. multiWrite — escreve em TODOS os bancos simultaneamente ──────────────
// Usa o banco primário para obter o resultado canônico (com ID gerado).
// Espelha nos demais com Promise.allSettled — falha num banco não bloqueia os outros.
export async function multiWrite<T>(
  operation: (database: typeof db) => Promise<T>
): Promise<T> {
  const dbs = getAllDatabases();
  const primary = dbs[0];

  // Escreve no primário e captura resultado (ex: ID gerado)
  const result = await operation(primary);

  // Espelha em paralelo nos demais (best-effort)
  if (dbs.length > 1) {
    await Promise.allSettled(
      dbs.slice(1).map((mirrorDb) =>
        operation(mirrorDb).catch((e: any) => {
          console.warn(
            `[MULTI-DB] ⚠️  Espelhamento falhou (banco secundário): ${e?.message ?? e}`
          );
        })
      )
    );
  }

  return result;
}

// ─── 6. Setup / auto-migração das tabelas ────────────────────────────────────
const TABLE_DEFINITIONS = [
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
    codigo_produto TEXT,
    tags TEXT,
    ncm TEXT,
    cfop TEXT,
    icms_origem INTEGER DEFAULT 0,
    icms_st TEXT,
    unit_type TEXT DEFAULT 'unit' NOT NULL,
    rotation INTEGER DEFAULT 0 NOT NULL,
    image_scale INTEGER DEFAULT 100 NOT NULL
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
    total_price INTEGER NOT NULL,
    unit_type TEXT DEFAULT 'unit' NOT NULL
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
    codigo_balanca TEXT,
    expiry_date INTEGER,
    min_stock INTEGER NOT NULL DEFAULT 5,
    image_url TEXT,
    rotation INTEGER DEFAULT 0 NOT NULL,
    image_scale INTEGER DEFAULT 100 NOT NULL,
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
    ultimo_numero_nfce INTEGER NOT NULL DEFAULT 0,
    ambiente TEXT NOT NULL DEFAULT 'homologacao',
    simulacao_real INTEGER NOT NULL DEFAULT 0,
    certificado_a1 TEXT,
    certificado_senha TEXT,
    printer_width TEXT NOT NULL DEFAULT '58mm'
  )`,
  `CREATE TABLE IF NOT EXISTS nfce (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    chave_acesso TEXT NOT NULL,
    xml_enviado TEXT,
    xml_autorizado TEXT,
    protocolo TEXT,
    status TEXT NOT NULL,
    motivo TEXT,
    data_emissao INTEGER NOT NULL,
    valor_total INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS data_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    size INTEGER NOT NULL,
    tables_count INTEGER NOT NULL,
    rows_count INTEGER NOT NULL,
    filepath TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    flavor TEXT,
    unit TEXT NOT NULL DEFAULT 'Unidade',
    weight TEXT,
    description TEXT,
    image_url TEXT,
    min_stock INTEGER NOT NULL DEFAULT 5,
    sale_price INTEGER,
    em_liquidacao INTEGER NOT NULL DEFAULT 0,
    ncm TEXT,
    cfop TEXT,
    codigo_balanca TEXT,
    codigo_produto TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT,
    variant_name TEXT,
    barcode TEXT,
    batch_number TEXT,
    supplier_code TEXT,
    supplier TEXT,
    manufacture_date INTEGER,
    expiry_date INTEGER,
    entry_date INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price INTEGER NOT NULL DEFAULT 0,
    sale_price INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS batch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    batch_id INTEGER,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export async function setupDatabase() {
  // ── SQLite local: cria tabelas via SQL direto ──────────────────────────────
  for (const stmt of TABLE_DEFINITIONS) {
    try {
      localSqlite.prepare(stmt).run();
    } catch {
      // tabela já existe — ignora
    }
  }

  // ── Turso (remoto): migrações incrementais ────────────────────────────────
  if (isRemoteEnabled && dbRemote) {
    const remoteMigrations = [
      "ALTER TABLE fiscal_settings ADD COLUMN ultimo_numero_nfce INTEGER DEFAULT 0",
      "ALTER TABLE fiscal_settings ADD COLUMN simulacao_real INTEGER DEFAULT 0",
      "ALTER TABLE fiscal_settings ADD COLUMN regime_tributario TEXT",
      "ALTER TABLE fiscal_settings ADD COLUMN csc_token TEXT",
      "ALTER TABLE fiscal_settings ADD COLUMN csc_id TEXT",
      "ALTER TABLE fiscal_settings ADD COLUMN certificado_a1 TEXT",
      "ALTER TABLE fiscal_settings ADD COLUMN certificado_senha TEXT",
      "ALTER TABLE fiscal_settings ADD COLUMN serie_nfce INTEGER DEFAULT 1",
      "ALTER TABLE menu_items ADD COLUMN unit_type TEXT DEFAULT 'unit'",
      "ALTER TABLE menu_items ADD COLUMN rotation INTEGER DEFAULT 0",
      "ALTER TABLE menu_items ADD COLUMN image_scale INTEGER DEFAULT 100",
      "ALTER TABLE menu_items ADD COLUMN codigo_produto TEXT",
      "ALTER TABLE products ADD COLUMN codigo_produto TEXT",
      "ALTER TABLE inventory ADD COLUMN codigo_balanca TEXT",
      "ALTER TABLE inventory ADD COLUMN rotation INTEGER DEFAULT 0",
      "ALTER TABLE inventory ADD COLUMN image_scale INTEGER DEFAULT 100",
      "ALTER TABLE sale_items ADD COLUMN unit_type TEXT DEFAULT 'unit'",
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        flavor TEXT,
        unit TEXT NOT NULL DEFAULT 'Unidade',
        weight TEXT,
        description TEXT,
        image_url TEXT,
        min_stock INTEGER NOT NULL DEFAULT 5,
        sale_price INTEGER,
        em_liquidacao INTEGER NOT NULL DEFAULT 0,
        ncm TEXT,
        cfop TEXT,
        codigo_balanca TEXT,
        codigo_produto TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      "ALTER TABLE products ADD COLUMN em_liquidacao INTEGER NOT NULL DEFAULT 0",
      // ── Novas colunas de variante por lote (sistema ERP/PDV) ────────────────
      "ALTER TABLE batches ADD COLUMN sku TEXT",
      "ALTER TABLE batches ADD COLUMN variant_name TEXT",
      "ALTER TABLE batches ADD COLUMN sale_price INTEGER",
      `CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        sku TEXT,
        variant_name TEXT,
        barcode TEXT,
        batch_number TEXT,
        supplier_code TEXT,
        supplier TEXT,
        manufacture_date INTEGER,
        expiry_date INTEGER,
        entry_date INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        cost_price INTEGER NOT NULL DEFAULT 0,
        sale_price INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS batch_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        batch_id INTEGER,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT,
        user_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS data_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        size INTEGER NOT NULL,
        tables_count INTEGER NOT NULL,
        rows_count INTEGER NOT NULL,
        filepath TEXT NOT NULL
      )`,
    ];

    for (const migration of remoteMigrations) {
      try {
        const client = (dbRemote as any).$client ?? (dbRemote as any).client;
        if (client && typeof client.execute === "function") {
          await client.execute(migration);
        }
      } catch (e: any) {
        if (!e.message?.includes("duplicate column") && !e.message?.includes("already exists")) {
          console.warn(`[DB] Migração remota avisou: ${e.message}`);
        }
      }
    }
  }
}

// Pool compatibility shim
export const pool = {
  connect: () => ({ release: () => {} }),
  query: () => ({ rows: [] }),
  end: () => {},
} as any;
