import type { FastifyPluginAsync } from 'fastify';
import { AuditService } from '../modules/audit/auditService.js';

export const createAuditRoutes: FastifyPluginAsync = async (fastify) => {
  const auditService = new AuditService();

  fastify.get('/api/audit', async (request) => {
    const query = request.query as { walletAddress?: string };
    return auditService.list(query.walletAddress);
  });
};
