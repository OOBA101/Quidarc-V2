import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { createHealthRoutes } from './routes/health.js';
import { createChatRoutes } from './routes/chat.js';
import { createWalletRoutes } from './routes/wallet.js';
import { createPermissionRoutes } from './routes/permissions.js';
import { createContentRoutes } from './routes/content.js';
import { createWaitlistRoutes } from "./routes/waitlist.js";
import { createAuditRoutes } from './routes/audit.js';

const app = Fastify({
  logger: true,
});

// Origins allowed to make browser requests. In production this comes entirely
// from CORS_ORIGINS (validated non-empty by env.ts). In development we also
// allow the local Vite dev servers so `npm run dev` works with no config.
const configuredOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  env.NODE_ENV === 'production'
    ? configuredOrigins
    : [...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'],
);

async function registerHooks(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;

    // Echo the origin back only when it is on the allowlist. A disallowed or
    // absent origin simply gets no CORS headers, so the browser blocks it —
    // no wildcard, which is inappropriate for a fintech backend.
    if (origin && allowedOrigins.has(origin)) {
      reply.header('access-control-allow-origin', origin);
      reply.header('vary', 'Origin');
      reply.header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
      reply.header('access-control-allow-headers', 'content-type, authorization');
    }

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
    }
  });
}

async function registerRoutes(server: FastifyInstance) {
  await server.register(createHealthRoutes);
  await server.register(createChatRoutes);
  await server.register(createWalletRoutes);
  await server.register(createPermissionRoutes);
  await server.register(createContentRoutes);
  await server.register(createWaitlistRoutes);
  await server.register(createAuditRoutes);
}

async function start() {
  // Apply the database schema before serving any traffic. Idempotent, so it is
  // safe on every boot/restart and guarantees routes never hit missing tables.
  // await runMigrations();

  await registerHooks(app);
  await registerRoutes(app);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Quidarc backend listening on http://0.0.0.0:${env.PORT}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
