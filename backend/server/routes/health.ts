import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../db/client.js';

export const createHealthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    let dbStatus = 'disconnected';

    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        dbStatus = 'connected';
      } finally {
        client.release();
      }
    } catch {
      dbStatus = 'disconnected';
    }

    const isHealthy = dbStatus === 'connected';
    if (!isHealthy) {
      reply.code(200); // 200 with degraded state or 503 if strict
    }

    return {
      status: isHealthy ? 'ok' : 'degraded',
      database: dbStatus,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });
};
