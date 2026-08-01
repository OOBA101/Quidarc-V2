import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { OrchestrationService } from '../modules/orchestrator/orchestrationService.js';

const chatInputSchema = z.object({
  message: z.string().min(1),
});

export const createChatRoutes: FastifyPluginAsync = async (fastify) => {
  const orchestrationService = new OrchestrationService();

  fastify.post('/api/chat', async (request, reply) => {
    const parsed = chatInputSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'Message is required.' };
    }

    return orchestrationService.handleChat(parsed.data.message);
  });
};
