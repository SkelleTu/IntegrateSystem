import fs from "fs";
import path from "path";
import { localSqlite } from "./db.js";

let installed = false;

function getSqliteFile() {
  return process.env.VERCEL
    ? "/tmp/sqlite.db"
    : path.join(process.cwd(), "sqlite.db");
}

function persist() {
  try {
    const file = getSqliteFile();
    fs.writeFileSync(file, localSqlite.export());
  } catch (error) {
    console.error("[DB] Falha ao persistir SQLite local:", error);
  }
}

/**
 * sql.js não garante persistência em disco ao usar apenas a API Drizzle.
 * Mantemos um espelho físico do banco local após cada operação mutável.
 */
export function installLocalSqliteRealtimePersistence() {
  if (installed) return;
  installed = true;

  const originalExec = localSqlite.exec.bind(localSqlite);
  localSqlite.exec = (...args: any[]) => {
    const result = originalExec(...args);
    persist();
    return result;
  };

  const originalRun = localSqlite.run?.bind(localSqlite);
  if (originalRun) {
    localSqlite.run = (...args: any[]) => {
      const result = originalRun(...args);
      persist();
      return result;
    };
  }

  const originalPrepare = localSqlite.prepare.bind(localSqlite);
  localSqlite.prepare = (...args: any[]) => {
    const statement = originalPrepare(...args);
    const originalStatementRun = statement.run?.bind(statement);
    if (originalStatementRun) {
      statement.run = (...runArgs: any[]) => {
        const result = originalStatementRun(...runArgs);
        persist();
        return result;
      };
    }
    return statement;
  };

  persist();
}
