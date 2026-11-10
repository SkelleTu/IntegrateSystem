import assert from "node:assert/strict";
import { NeonSessionStore } from "../server/neon-session-store";

type Row = { sess: string; expire: number };
const rows = new Map<string, Row>();
const pool = {
  async query(sql: string, values: any[] = []) {
    if (sql.startsWith("INSERT INTO aura_sessions")) {
      rows.set(String(values[0]), { sess: String(values[1]), expire: Number(values[2]) });
      return { rows: [] };
    }
    if (sql.startsWith("SELECT sess, expire")) {
      const row = rows.get(String(values[0]));
      return { rows: row ? [{ ...row }] : [] };
    }
    if (sql.startsWith("UPDATE aura_sessions")) {
      const row = rows.get(String(values[2]));
      if (row) rows.set(String(values[2]), { sess: String(values[0]), expire: Number(values[1]) });
      return { rows: [] };
    }
    if (sql.startsWith("DELETE FROM aura_sessions")) {
      if (sql.includes("expire <=")) {
        for (const [sid, row] of rows) if (row.expire <= Number(values[0])) rows.delete(sid);
      } else rows.delete(String(values[0]));
      return { rows: [] };
    }
    throw new Error("Unexpected SQL in Neon session-store test: " + sql);
  },
} as any;

const set = (store: NeonSessionStore, sid: string, sess: any) => new Promise<void>((resolve, reject) =>
  store.set(sid, sess, (error?: any) => error ? reject(error) : resolve()));
const get = (store: NeonSessionStore, sid: string) => new Promise<any>((resolve, reject) =>
  store.get(sid, (error?: any, value?: any) => error ? reject(error) : resolve(value ?? null)));
const touch = (store: NeonSessionStore, sid: string, sess: any) => new Promise<void>((resolve, reject) =>
  store.touch(sid, sess, (error?: any) => error ? reject(error) : resolve()));
const destroy = (store: NeonSessionStore, sid: string) => new Promise<void>((resolve, reject) =>
  store.destroy(sid, (error?: any) => error ? reject(error) : resolve()));

async function run() {
  const writer = new NeonSessionStore(pool);
  const reader = new NeonSessionStore(pool);
  try {
    const initial = { userId: 42, cookie: { expires: new Date(Date.now() + 60_000), maxAge: 60_000 } };
    await set(writer, "persisted-session", initial);
    assert.equal((await get(reader, "persisted-session"))?.userId, 42);

    const touched = { userId: 99, cookie: { expires: new Date(Date.now() + 120_000), maxAge: 120_000 } };
    await touch(reader, "persisted-session", touched);
    assert.equal((await get(writer, "persisted-session"))?.userId, 99);

    await set(writer, "expired-session", { userId: 1, cookie: { expires: new Date(Date.now() - 1_000) } });
    assert.equal(await get(reader, "expired-session"), null);

    await destroy(writer, "persisted-session");
    assert.equal(await get(reader, "persisted-session"), null);
  } finally {
    writer.close();
    reader.close();
  }
}

run().then(() => process.stdout.write("Neon session store checks passed\\n")).catch((error) => {
  process.stderr.write(String(error?.stack || error) + "\\n");
  process.exitCode = 1;
});
