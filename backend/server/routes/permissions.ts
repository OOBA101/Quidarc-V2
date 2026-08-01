import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PermissionService } from '../modules/permission/permissionService.js';
import { ExecutionService } from '../modules/execution/executionService.js';
import { permissionCardValidator } from '../modules/permission/validators/permissionCardValidator.js';

const prepareTransferSchema = z.object({
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  amount: z.string().min(1),
  permissionCardId: z.string().uuid().optional(),
  protocol: z.string().optional(),
});

const confirmTransferSchema = z.object({
  txHash: z.string().min(1),
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  amount: z.string().min(1),
  permissionCardId: z.string().uuid().optional(),
});

const agentActionSchema = z.object({
  kind: z.enum(['swap', 'bridge', 'claim']),
  permissionCardId: z.string().uuid(),
  protocol: z.string().min(1),
  amount: z.string().min(1),
});

export const createPermissionRoutes: FastifyPluginAsync = async (fastify) => {
  const permissionService = new PermissionService();
  const executionService = new ExecutionService();

  fastify.get('/api/permissions', async (request) => {
    const query = request.query as { ownerWallet?: string };
    return permissionService.listCards(query.ownerWallet);
  });

  fastify.post('/api/permissions', async (request, reply) => {
    const parsed = permissionCardValidator.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.flatten() };
    }

    return permissionService.createCard(parsed.data);
  });

  fastify.post('/api/permissions/:id/revoke', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const result = await permissionService.revokeCard(id);

    if ('error' in result) {
      reply.code(404);
    }

    return result;
  });

  // Step 1 of the transfer flow: authorize (if card-scoped) and get unsigned
  // tx data back. The backend never signs a User Wallet transaction — this is
  // as far as it goes before the frontend takes over.
  fastify.post('/api/execution/prepare-transfer', async (request, reply) => {
    const parsed = prepareTransferSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid transfer preparation payload.' };
    }

    return executionService.prepareTransfer(parsed.data);
  });

  // Step 2: the frontend has already signed and broadcast the transaction
  // itself. This just records what happened — it does not execute anything.
  fastify.post('/api/transactions/confirm', async (request, reply) => {
    const parsed = confirmTransferSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid transaction confirmation payload.' };
    }

    return executionService.confirmTransferBroadcast(parsed.data);
  });

  // Agent-wallet actions (swap/bridge/claim) are always card-scoped — there is
  // no per-action-confirm path for these, by design (see governance doc §3).
  fastify.post('/api/execution/agent-action', async (request, reply) => {
    const parsed = agentActionSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid agent action payload.' };
    }

    return executionService.executeAgentAction(parsed.data);
  });
};
