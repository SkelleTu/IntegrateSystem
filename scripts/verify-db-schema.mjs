import fs from "node:fs";

const schema = fs.readFileSync("shared/schema.ts", "utf8");
const db = fs.readFileSync("server/db.ts", "utf8");

const schemaBlocks = [...schema.matchAll(/(?:sqliteTable|pgTable)\("([^"]+)",\s*\{([\s\S]*?)\}\);/g)];
const expected = new Map();
for (const match of schemaBlocks) {
  const table = match[1];
  const columns = [...match[2].matchAll(/^\s*\w+\s*:\s*\w+\("([^"]+)"/gm)].map((item) => item[1]);
  expected.set(table, new Set(columns));
}

const actual = new Map();
for (const match of db.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\)\s*`/g)) {
  const table = match[1];
  const columns = [...match[2].matchAll(/^\s*"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+(?:INTEGER|TEXT|REAL|NUMERIC|BLOB)\b/gm)].map((item) => item[1]);
  if (!actual.has(table)) actual.set(table, new Set());
  for (const column of columns) actual.get(table).add(column);
}

const migrated = new Map();
for (const match of db.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi)) {
  const table = match[1];
  if (!migrated.has(table)) migrated.set(table, new Set());
  migrated.get(table).add(match[2]);
}

const errors = [];
for (const [table, columns] of expected) {
  if (!actual.has(table)) {
    errors.push(`Missing CREATE TABLE definition: ${table}`);
    continue;
  }
  const present = new Set([...(actual.get(table) || []), ...(migrated.get(table) || [])]);
  for (const column of columns) {
    if (!present.has(column)) errors.push(`Missing column definition/migration: ${table}.${column}`);
  }
}

if (!db.includes("throw new Error(`[DB] Migração local falhou:") ||
    !db.includes("await tursoClient.executeMultiple(TABLE_DEFINITIONS.join") ||
    !db.includes("await tursoClient.execute(migration)")) {
  errors.push("Unexpected migration errors must fail startup visibly on both databases.");
}
if (db.includes("Migração remota avisou:") || db.includes("Migração local avisou:")) {
  errors.push("Migration failures are still being swallowed/logged as warnings.");
}

if (errors.length) {
  console.error("DATABASE SCHEMA PARITY: FAIL");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log(`DATABASE SCHEMA PARITY: PASS (${expected.size} Drizzle tables; all columns have a create definition or migration)`);
}
