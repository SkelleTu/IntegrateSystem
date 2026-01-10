import { z } from "zod";
import { insertServiceSchema, insertUserSchema, services, tickets, queueState } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: insertUserSchema,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user",
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  services: {
    list: {
      method: "GET" as const,
      path: "/api/services",
      responses: {
        200: z.array(z.custom<typeof services.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/services",
      input: insertServiceSchema.omit({ id: true }),
      responses: {
        201: z.custom<typeof services.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/services/:id",
      input: insertServiceSchema.omit({ id: true }).partial(),
      responses: {
        200: z.custom<typeof services.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/services/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  queue: {
    state: {
      method: "GET" as const,
      path: "/api/queue/state",
      responses: {
        200: z.custom<typeof queueState.$inferSelect>(),
      },
    },
    next: {
      method: "POST" as const,
      path: "/api/queue/next",
      responses: {
        200: z.custom<typeof queueState.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    prev: {
      method: "POST" as const,
      path: "/api/queue/prev",
      responses: {
        200: z.custom<typeof queueState.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    reset: {
      method: "POST" as const,
      path: "/api/queue/reset",
      input: z.object({ startFrom: z.number().default(0) }),
      responses: {
        200: z.custom<typeof queueState.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    set: {
      method: "POST" as const,
      path: "/api/queue/set",
      input: z.object({ number: z.number() }),
      responses: {
        200: z.custom<typeof queueState.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    createTicket: {
      method: "POST" as const,
      path: "/api/tickets",
      input: z.object({ serviceId: z.number() }),
      responses: {
        201: z.custom<typeof tickets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
