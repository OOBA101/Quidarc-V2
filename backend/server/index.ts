import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

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

async function registerHooks(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    reply.header('access-control-allow-origin', '*');
    reply.header('access-control-allow-methods', 'GET, POST, OPTIONS');
    reply.header('access-control-allow-headers', 'content-type');

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
  await registerHooks(app);
  await registerRoutes(app);

  const port = Number(process.env.PORT) || 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Quidarc backend listening on http://0.0.0.0:${port}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
