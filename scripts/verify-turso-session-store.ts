import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { TursoSessionStore } from "../server/routes";

async function run() {
  const client = createClient({ url: "file::memory:" });
  await client.execute("CREATE TABLE aura_sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expire INTEGER NOT NULL)");
  const writer = new TursoSessionStore(client);
  const reader = new TursoSessionStore(client);

  const set = (store: TursoSessionStore, sid: string, sess: any) => new Promise<void>((resolve, reject) => {
    store.set(sid, sess, (error?: any) => error ? reject(error) : resolve());
  });
  const get = (store: TursoSessionStore, sid: string) => new Promise<any>((resolve, reject) => {
    store.get(sid, (error?: any, value?: any) => error ? reject(error) : resolve(value ?? null));
  });
  const touch = (store: TursoSessionStore, sid: string, sess: any) => new Promise<void>((resolve, reject) => {
    store.touch(sid, sess, (error?: any) => error ? reject(error) : resolve());
  });
  const destroy = (store: TursoSessionStore, sid: string) => new Promise<void>((resolve, reject) => {
    store.destroy(sid, (error?: any) => error ? reject(error) : resolve());
  });

  try {
    const initial = { userId: 42, cookie: { expires: new Date(Date.now() + 60_000), maxAge: 60_000 } };
    await set(writer, "persisted-session", initial);
    const loaded = await get(reader, "persisted-session");
    assert.equal(loaded?.userId, 42, "session must be readable from a second store instance");

    const touched = { userId: 99, cookie: { expires: new Date(Date.now() + 120_000), maxAge: 120_000 } };
    await touch(reader, "persisted-session", touched);
    assert.equal((await get(writer, "persisted-session"))?.userId, 99, "touch must refresh stored session data");

    await set(writer, "expired-session", { userId: 1, cookie: { expires: new Date(Date.now() - 1_000) } });
    assert.equal(await get(reader, "expired-session"), null, "expired sessions must not be returned");

    await destroy(writer, "persisted-session");
    assert.equal(await get(reader, "persisted-session"), null, "destroy must remove the session");
  } finally {
    await client.close();
  }
}

run().then(() => process.stdout.write("Turso session store checks passed\\n")).catch((error) => {
  process.stderr.write(String(error?.stack || error) + "\\n");
  process.exitCode = 1;
});
