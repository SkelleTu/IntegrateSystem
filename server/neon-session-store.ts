import session from "express-session";
import type { Pool } from "pg";

export class NeonSessionStore extends session.Store {
  private cleanupTimer: NodeJS.Timeout;

  constructor(private readonly pool: Pool) {
    super();
    this.cleanupTimer = setInterval(() => {
      void this.pool.query("DELETE FROM aura_sessions WHERE expire <= $1", [Date.now()])
        .catch((error) => console.warn("[SESSION] Neon expired-session cleanup failed:", error?.message || error));
    }, 60 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  private expiry(sess: any): number {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    if (Number.isFinite(cookieExpiry)) return cookieExpiry;
    const maxAge = Number(sess?.cookie?.maxAge);
    return Date.now() + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 30 * 24 * 60 * 60 * 1000);
  }

  get(sid: string, callback: (err?: any, sess?: any) => void): void {
    void this.pool.query("SELECT sess, expire FROM aura_sessions WHERE sid = $1 LIMIT 1", [sid])
      .then(async ({ rows }) => {
        const row = rows[0];
        if (!row) return callback(null, null);
        if (!Number.isFinite(Number(row.expire)) || Number(row.expire) <= Date.now()) {
          await this.pool.query("DELETE FROM aura_sessions WHERE sid = $1", [sid]);
          return callback(null, null);
        }
        try {
          const value = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
          return callback(null, value);
        } catch {
          await this.pool.query("DELETE FROM aura_sessions WHERE sid = $1", [sid]);
          return callback(null, null);
        }
      })
      .catch((error) => callback(error));
  }

  set(sid: string, sess: any, callback?: (err?: any) => void): void {
    void this.pool.query(
      "INSERT INTO aura_sessions (sid, sess, expire) VALUES ($1, $2, $3) ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire",
      [sid, JSON.stringify(sess), this.expiry(sess)],
    ).then(() => callback?.(null)).catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    void this.pool.query("DELETE FROM aura_sessions WHERE sid = $1", [sid])
      .then(() => callback?.(null)).catch((error) => callback?.(error));
  }

  touch(sid: string, sess: any, callback?: (err?: any) => void): void {
    void this.pool.query(
      "UPDATE aura_sessions SET sess = $1, expire = $2 WHERE sid = $3",
      [JSON.stringify(sess), this.expiry(sess), sid],
    ).then(() => callback?.(null)).catch((error) => callback?.(error));
  }

  close(): void {
    clearInterval(this.cleanupTimer);
  }
}
