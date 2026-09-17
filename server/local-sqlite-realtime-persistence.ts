import fs from "fs";
import { localSqlite } from "./db.js";
import { ensureRuntimeDataDir, getRuntimeSqliteFile } from "./runtime-data.js";

let installed = false;

function getSqliteFile() {
  ensureRuntimeDataDir();
  return getRuntimeSqliteFile();
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
 * Mantemos o espelho físico do banco local após cada operação mutável.
 * O arquivo físico fica fora do Git working tree e nunca volta a ser
 * substituído por um banco versionado durante pull/restart.
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
