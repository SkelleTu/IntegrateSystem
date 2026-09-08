---
name: DB dual-write pattern
description: How to add columns so they appear in both local SQLite and remote Turso.
---

# DB dual-write pattern

## The rule
New columns must be added in TWO places in `server/db.ts`:

1. **`TABLE_DEFINITIONS` array** — the `CREATE TABLE IF NOT EXISTS` block for the table. This creates the column in the local SQLite DB on first run / reset.

2. **`remoteMigrations` array** — an `ALTER TABLE <table> ADD COLUMN <col> <type>` string. This idempotently adds the column to the remote Turso DB. The migration runner skips statements that fail (column already exists).

**Why:** The app dual-writes to local SQLite (`sqlite.db`) and remote Turso (`libsql`). The local DB is recreated from `TABLE_DEFINITIONS`; Turso persists across restarts so it needs incremental migrations.

**How to apply:** For every new column, add it to both sections. The `remoteMigrations` array is at the bottom of `setupDatabase()` in `server/db.ts`. Use snake_case for SQL column names; Drizzle maps to camelCase in TS automatically.
