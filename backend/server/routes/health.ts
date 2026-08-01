import type { FastifyPluginAsync } from 'fastify';

export const createHealthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({
    ok: true,
    service: 'quidarc-backend',
    timestamp: new Date().toISOString(),
  }));
};
