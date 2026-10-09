import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import * as schema from "../shared/schema";
import path from "path";
import fs from "fs";
import { sql } from "drizzle-orm";

// ─── 1. SQLite Local via sql.js (WASM) ─────────────────────────────────────────
const sqliteFile = process.env.VERCEL ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db");
console.log("[DB] sqliteFile=", sqliteFile, "exists=", fs.existsSync(sqliteFile), "size=", fs.existsSync(sqliteFile) ? fs.statSync(sqliteFile).size : 0);

// Initialize sql.js database
let sqlJsDb: any;
if (fs.existsSync(sqliteFile)) {
  const filebuffer = fs.readFileSync(sqliteFile);
  const SQL = await initSqlJs();
  sqlJsDb = new SQL.Database(filebuffer);
} else {
  const SQL = await initSqlJs();
  sqlJsDb = new SQL.Database();
}

// Auto-save to file
const originalExec = sqlJsDb.exec.bind(sqlJsDb);
sqlJsDb.exec = function(...args: any[]) {
  const result = originalExec(...args);
  fs.writeFileSync(sqliteFile, sqlJsDb.export());
  return result;
};

export const localSqlite = sqlJsDb;
export function persistLocalSqlite() {
  fs.writeFileSync(sqliteFile, sqlJsDb.export());
}
export const dbLocal = drizzle(localSqlite, { schema });

// ─── 2. Turso (remote) — opcional, liga se as credenciais existirem ──────────
export let dbRemote: any = null;
export let tursoClient: any = null;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  try {
    const { createClient } = await import("@libsql/client");
    const { drizzle: drizzleLibsql } = await import("drizzle-orm/libsql");
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    dbRemote = drizzleLibsql(tursoClient, { schema });
    console.log("✅ Turso conectado com sucesso (banco remoto ativo).");
  } catch (e) {
    console.error("⚠️  Falha ao conectar ao Turso:", e);
  }
}

export const isRemoteEnabled = !!dbRemote;

// ─── 3. db principal — Turso quando disponível + espelhamento automático ─────
const primaryDatabase: any = dbRemote ?? dbLocal;
const mirrorDatabase: any = dbRemote ? dbLocal : null;

function isPromiseLike(value: any): boolean {
  if (!value) return false;
  try {
    return typeof value.then === "function";
  } catch {
    return false;
  }
}

function isQueryBuilder(value: any): boolean {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
  // Drizzle builders can expose chain methods before they become awaitable.
  // Do not inspect .then here: some builders throw until values()/set() is called.
  return ["values", "set", "where", "returning", "execute", "run"].some((method) => {
    try {
      return typeof value[method] === "function";
    } catch {
      return false;
    }
  });
}

function createMirroredQuery(primaryQuery: any, mirrorQuery: any): any {
  return new Proxy(primaryQuery, {
    get(target, property, receiver) {
      if (property === "then") {
        return (onFulfilled?: any, onRejected?: any) =>
          Promise.all([primaryQuery, mirrorQuery])
            .then(([result]) => result)
            .then(onFulfilled, onRejected);
      }

      if (property === "catch") {
        return (onRejected?: any) =>
          Promise.all([primaryQuery, mirrorQuery])
            .then(([result]) => result)
            .catch(onRejected);
      }

      if (property === "finally") {
        return (onFinally?: any) =>
          Promise.all([primaryQuery, mirrorQuery])
            .then(([result]) => result)
            .finally(onFinally);
      }

      const primaryMember = Reflect.get(target, property, receiver);
      if (typeof primaryMember !== "function") return primaryMember;

      const mirrorMember = mirrorQuery ? mirrorQuery[property] : undefined;
      if (typeof mirrorMember !== "function") {
        return primaryMember.bind(target);
      }

      return (...args: any[]) => {
        const primaryResult = primaryMember.apply(target, args);
        const mirrorResult = mirrorMember.apply(mirrorQuery, args);

        if (isQueryBuilder(primaryResult) && isQueryBuilder(mirrorResult)) {
          return createMirroredQuery(primaryResult, mirrorResult);
        }

        if (isPromiseLike(primaryResult) && isPromiseLike(mirrorResult)) {
          return Promise.all([primaryResult, mirrorResult]).then(([result]) => result);
        }

        return primaryResult;
      };
    },
  });
}

export const db = (mirrorDatabase
  ? new Proxy(primaryDatabase as any, {
      get(target, property, receiver) {
        if (property === "insert" || property === "update" || property === "delete") {
          return (...args: any[]) => {
            const primaryQuery = target[property].apply(target, args);
            const mirrorQuery = (mirrorDatabase as any)[property].apply(mirrorDatabase, args);
            return createMirroredQuery(primaryQuery, mirrorQuery);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    })
  : primaryDatabase) as typeof dbLocal;

// ─── 4. Lista de TODOS os bancos ativos ──────────────────────────────────────
export function getAllDatabases(): Array<typeof db> {
  if (dbRemote) {
    return [dbRemote, dbLocal];
  }
  return [dbLocal];
}

// ─── 5. multiWrite — escreve em TODOS os bancos simultaneamente ──────────────
export async function multiWrite<T>(
  operation: (database: typeof db) => Promise<T>
): Promise<T> {
  const dbs = getAllDatabases();

  // Executa a mesma operação nos dois bancos em paralelo.
  // Nenhum banco é tratado como "primário" para fins de escrita.
  const results = await Promise.allSettled(dbs.map((database) => operation(database)));

  const failures = results
    .map((result, index) => ({ result, index }))
    .filter((entry): entry is { result: PromiseRejectedResult; index: number } => entry.result.status === "rejected");

  if (failures.length > 0) {
    const details = failures
      .map(({ result, index }) => {
        const target = dbs[index] === dbRemote ? "Turso" : "SQLite local";
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        return `${target}: ${reason}`;
      })
      .join(" | ");

    throw new Error(`Falha na gravação simultânea do banco de dados. ${details}`);
  }

  return (results[0] as PromiseFulfilledResult<T>).value;
}

// ─── 6. Setup / auto-migração das tabelas ────────────────────────────────────
const TABLE_DEFINITIONS = [
  `CREATE TABLE IF NOT EXISTS runtime_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    process TEXT NOT NULL DEFAULT 'server',
    pid INTEGER,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    trace_id TEXT,
    request_id TEXT,
    source TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    data TEXT
  )`,

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
  `CREATE TABLE IF NOT EXISTS stock_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    products_json TEXT NOT NULL,
    batches_json TEXT NOT NULL,
    product_count INTEGER NOT NULL
  )`,
];

export async function setupDatabase() {
  // ── SQLite local: cria tabelas via SQL direto ──────────────────────────────
  for (const stmt of TABLE_DEFINITIONS) {
    // CREATE TABLE IF NOT EXISTS é idempotente. Qualquer outro erro deve interromper o boot.
    localSqlite.prepare(stmt).run();
  }

  // ── SQLite local: migrações incrementais (espelho das remotas) ───────────
  const localMigrations = [
    "ALTER TABLE enterprises ADD COLUMN owner_id INTEGER",
    "ALTER TABLE enterprises ADD COLUMN business_type TEXT DEFAULT 'barbearia'",
    "ALTER TABLE enterprises ADD COLUMN city TEXT",
    "ALTER TABLE enterprises ADD COLUMN state TEXT",
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
    "ALTER TABLE products ADD COLUMN em_liquidacao INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE inventory ADD COLUMN codigo_balanca TEXT",
    "ALTER TABLE inventory ADD COLUMN rotation INTEGER DEFAULT 0",
    "ALTER TABLE inventory ADD COLUMN image_scale INTEGER DEFAULT 100",
    "ALTER TABLE sale_items ADD COLUMN unit_type TEXT DEFAULT 'unit'",
    "ALTER TABLE batches ADD COLUMN sku TEXT",
    "ALTER TABLE batches ADD COLUMN variant_name TEXT",
    "ALTER TABLE batches ADD COLUMN sale_price INTEGER",
  ];
  for (const migration of localMigrations) {
    try {
      localSqlite.prepare(migration).run();
    } catch (e: any) {
      if (!/duplicate column|already exists/i.test(String(e.message))) {
        throw new Error(`[DB] Migração local falhou: ${migration}: ${e.message}`, { cause: e });
      }
    }
  }

  // ── Turso: bootstrap em lote e migrações incrementais apenas quando faltam ──
  if (isRemoteEnabled && dbRemote && tursoClient) {
    // Executa o script DDL em uma única chamada sem manter um batch transacional aberto.
    await tursoClient.executeMultiple(TABLE_DEFINITIONS.join(";\n") + ";");

    const migrationColumns = localMigrations.map((migration) => {
      const match = migration.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
      if (!match) throw new Error(`[DB] Migração remota inválida: ${migration}`);
      return { migration, table: match[1], column: match[2] };
    });

    const tablesToInspect = [...new Set(migrationColumns.map((entry) => entry.table))];
    const tableColumns = new Map<string, Set<string>>(
      await Promise.all(tablesToInspect.map(async (table) => {
        const result = await tursoClient.execute(`PRAGMA table_info("${table}")`);
        return [table, new Set(result.rows.map((row: any) => String(row.name)))] as [string, Set<string>];
      })),
    );

    const missingMigrations = migrationColumns
      .filter(({ table, column }) => !tableColumns.get(table)?.has(column))
      .map(({ migration }) => migration);

    for (const migration of missingMigrations) {
      await tursoClient.execute(migration);
    }

    console.log(
      `[DB] Turso schema verified: ${TABLE_DEFINITIONS.length} table definitions; ${missingMigrations.length} missing-column migrations applied.`,
    );
  }

  // Ensure local sql.js changes made with prepare().run() are persisted.
  persistLocalSqlite();
}

export async function auditDatabaseParity() {
  if (!tursoClient) {
    return { ok: false, remoteEnabled: false, error: "Turso is not configured", tablesChecked: 0, mismatches: [] };
  }

  const tableNames = [...new Set(TABLE_DEFINITIONS
    .map((statement) => statement.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i)?.[1])
    .filter((table): table is string => Boolean(table)))];
  if (tableNames.length === 0) {
    return { ok: false, remoteEnabled: true, error: "No table definitions found", tablesChecked: 0, mismatches: [] };
  }

  const mismatches: Array<Record<string, unknown>> = [];
  const tables: Array<Record<string, unknown>> = [];
  const normalize = (value: any): unknown => {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Uint8Array) return Array.from(value);
    if (value instanceof Date) return value.toISOString();
    return value;
  };
  const readLocal = (statement: string) => {
    const handle = localSqlite.prepare(statement);
    const rows: Array<Record<string, unknown>> = [];
    try {
      while (handle.step()) rows.push(handle.getAsObject() as Record<string, unknown>);
    } finally {
      handle.free();
    }
    return rows;
  };

  for (const table of tableNames) {
    try {
      const localInfo = readLocal(`PRAGMA table_info("${table}")`);
      const localColumns = localInfo.map((row: any) => String(row.name)).sort();
      const remoteInfo = await tursoClient.execute(`PRAGMA table_info("${table}")`);
      const remoteColumns = remoteInfo.rows.map((row: any) => String(row.name)).sort();
      const missingLocal = remoteColumns.filter((column) => !localColumns.includes(column));
      const missingRemote = localColumns.filter((column) => !remoteColumns.includes(column));

      let localRows = 0;
      let remoteRows = 0;
      let rowCountsMatch = true;
      let rowContentsMatch = true;
      const mismatchedRowIds: string[] = [];
      const mismatchedColumns = new Set<string>();

      // Runtime events are written asynchronously by multiple processes; compare their schema,
      // but do not treat their momentary row-count/content drift as business-data divergence.
      if (table !== "runtime_events") {
        const localData = readLocal(`SELECT * FROM "${table}" ORDER BY id`);
        const remoteData = await tursoClient.execute(`SELECT * FROM "${table}" ORDER BY id`);
        const remoteDataRows = remoteData.rows as any[];
        localRows = localData.length;
        remoteRows = remoteDataRows.length;
        rowCountsMatch = localRows === remoteRows;

        const localById = new Map(localData.map((row: any, index) => [String(row.id ?? index), row]));
        const remoteById = new Map(remoteDataRows.map((row: any, index) => [String(row.id ?? index), row]));
        const allIds = new Set([...localById.keys(), ...remoteById.keys()]);
        for (const id of allIds) {
          const localRow = localById.get(id) as Record<string, unknown> | undefined;
          const remoteRow = remoteById.get(id) as Record<string, unknown> | undefined;
          if (!localRow || !remoteRow) {
            rowContentsMatch = false;
            if (mismatchedRowIds.length < 10) mismatchedRowIds.push(id);
            continue;
          }
          for (const column of new Set([...localColumns, ...remoteColumns])) {
            if (JSON.stringify(normalize(localRow[column])) !== JSON.stringify(normalize(remoteRow[column]))) {
              rowContentsMatch = false;
              mismatchedColumns.add(column);
              if (mismatchedRowIds.length < 10 && !mismatchedRowIds.includes(id)) mismatchedRowIds.push(id);
            }
          }
        }
      }

      const countCompared = table !== "runtime_events";
      const entry = {
        table,
        localColumns: localColumns.length,
        remoteColumns: remoteColumns.length,
        missingLocalColumns: missingLocal,
        missingRemoteColumns: missingRemote,
        localRows,
        remoteRows,
        rowCountsMatch: !countCompared || rowCountsMatch,
        rowContentsMatch: !countCompared || rowContentsMatch,
        mismatchedRowIds,
        mismatchedColumns: [...mismatchedColumns],
      };
      tables.push(entry);
      if (
        missingLocal.length ||
        missingRemote.length ||
        (countCompared && (!rowCountsMatch || !rowContentsMatch))
      ) {
        mismatches.push(entry);
      }
    } catch (error: any) {
      const entry = { table, error: error?.message || String(error) };
      tables.push(entry);
      mismatches.push(entry);
    }
  }

  return {
    ok: mismatches.length === 0,
    remoteEnabled: true,
    tablesChecked: tables.length,
    rowCountsCompared: tables.filter((table: any) => table.table !== "runtime_events").length,
    rowContentsCompared: tables.filter((table: any) => table.table !== "runtime_events").length,
    mismatches,
    tables,
  };
}

// Pool compatibility shim
export const pool = {
  connect: () => ({ release: () => {} }),
  query: () => ({ rows: [] }),
  end: () => {},
} as any;
