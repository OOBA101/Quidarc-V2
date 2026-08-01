import type { FastifyPluginAsync } from 'fastify';
import { ContentService } from '../modules/content/contentService.js';

export const createContentRoutes: FastifyPluginAsync = async (fastify) => {
  const contentService = new ContentService();

  fastify.get('/api/news', async () => contentService.listNews());

  fastify.get('/api/dapps', async () => contentService.listDApps());
};
