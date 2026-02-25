import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// Usando SQLite local para garantir que o banco de dados seja um arquivo do projeto
// e migre junto com o código via GitHub ou qualquer outro meio.
const sqlite = new Database(process.env.VERCEL ? "/tmp/sqlite.db" : (process.env.NODE_ENV === "production" ? "/tmp/sqlite.db" : path.join(process.cwd(), "sqlite.db")));
export const db = drizzle(sqlite, { schema });

// Helper para manter compatibilidade com o pool se necessário
export const pool = {
  connect: () => ({ release: () => {} }),
  query: () => ({ rows: [] }),
  end: () => {}
} as any;
