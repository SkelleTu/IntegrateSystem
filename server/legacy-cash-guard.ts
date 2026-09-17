import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { users } from "../shared/schema.js";

const scryptAsync = promisify(scrypt);

async function comparePassword(stored: string, supplied: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * The old cashier endpoints remain in routes.ts for compatibility with older
 * screens. They must not bypass the new administrator-controlled workflow.
 * This wrapper is installed before route registration and protects only the
 * legacy open/close endpoints.
 */
export function installLegacyCashGuards(app: any) {
  const originalPost = app.post.bind(app);

  app.post = ((path: string, ...handlers: any[]) => {
    const protectedPath = path === "/api/cash-register/open" || path === "/api/cash-register/close";
    if (!protectedPath || handlers.length === 0) return originalPost(path, ...handlers);

    const lastIndex = handlers.length - 1;
    const originalHandler = handlers[lastIndex];
    handlers[lastIndex] = async (req: any, res: any, next: any) => {
      try {
        if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Não autenticado." });
        const user = req.user as any;
        if (!user || !["admin", "owner"].includes(user.role)) {
          return res.status(403).json({ message: "Abertura e fechamento exigem autorização administrativa." });
        }

        const password = String(req.body?.password ?? "");
        if (!password) {
          return res.status(403).json({ message: "Use Opções do Caixa e informe a senha administrativa." });
        }

        const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        if (!dbUser || !(await comparePassword(dbUser.password, password))) {
          return res.status(401).json({ message: "Senha administrativa incorreta." });
        }

        return originalHandler(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    return originalPost(path, ...handlers);
  }) as any;
}
