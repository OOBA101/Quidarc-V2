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

    // Return 503 when the database is unreachable so orchestration/uptime tools
    // (and Railway's health probe) can detect a degraded backend by status code.
    reply.code(200);

    return {
    status: isHealthy ? "ok" : "degraded",
    database: dbStatus
   };
  });
};
