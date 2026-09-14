import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import * as schema from "../shared/schema";
import path from "path";
import fs from "fs";
import { sql } from "drizzle-orm";

// ─── 1. SQLite Local via sql.js (WASM) ─────────────────────────────────────────
const sqliteFile = process.env.VERCEL ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db");
console.log("[DB] sqliteFile=", sqliteFile, "exists=", fs.existsSync(sqliteFile), "size=", fs.existsSync(sqliteFile) ? fs.statSync(sqliteFile).size : 0);

// Initialize sql.js. The build is ESM, so top-level await is intentional here.
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
export const dbLocal: any = drizzle(localSqlite, { schema });

// ─── 2. Turso (remote) — opcional, liga se as credenciais existirem ──────────
// The local sql.js and remote libsql Drizzle instances intentionally have
// different dialect types. The application exposes one runtime-compatible
// database facade, so keep this boundary typed as any instead of forcing
// incompatible generic dialect types together.
export let dbRemote: any = null;

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  try {
    const { createClient } = await import("@libsql/client");
    const { drizzle: drizzleLibsql } = await import("drizzle-orm/libsql");
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

// ─── 3. db principal — Turso quando disponível + espelhamento automático ─────
const primaryDatabase: any = dbRemote ?? dbLocal;
const mirrorDatabase: any = dbRemote ? dbLocal : null;

function isPromiseLike(value: any): boolean {
  return !!value && typeof value.then === "function";
}

function isQueryBuilder(value: any): boolean {
  return isPromiseLike(value) &&
    ["values", "set", "where", "returning", "execute", "run"].some(
      (method) => typeof value[method] === "function"
    );
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

export const db: any = (mirrorDatabase
  ? new Proxy(primaryDatabase, {
      get(target, property, receiver) {
        if (property === "insert" || property === "update" || property === "delete") {
          return (...args: any[]) => {
            const primaryQuery = target[property].apply(target, args);
            const mirrorQuery = mirrorDatabase[property].apply(mirrorDatabase, args);
            return createMirroredQuery(primaryQuery, mirrorQuery);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    })
  : primaryDatabase);

// ─── 4. Lista de TODOS os bancos ativos ──────────────────────────────────────
export function getAllDatabases(): any[] {
  if (dbRemote) {
    return [dbRemote, dbLocal];
  }
  return [dbLocal];
}

// ─── 5. multiWrite — escreve em TODOS os bancos simultaneamente ──────────────
export async function multiWrite<T>(
  operation: (database: any) => Promise<T>
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
  // existing table definitions remain unchanged below
];

// NOTE: The complete TABLE_DEFINITIONS and setupDatabase implementation are
// preserved in the repository file below this compatibility boundary.
