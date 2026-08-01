import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AgentWalletService } from '../modules/agent-wallet/walletService.js';

/**
 * `/api/wallet/create` and `/api/wallet/import` were removed here — they
 * existed in the scaffold but conflated User Wallet creation (which must
 * happen 100% client-side, per the governance doc) with Agent Wallet
 * provisioning. Real wallet creation now happens only in the frontend. This
 * file only exposes reads (balance) and Agent Wallet provisioning, neither of
 * which needs a password or key material from the client.
 */
export const createWalletRoutes: FastifyPluginAsync = async (fastify) => {
  const walletService = new AgentWalletService();

  fastify.post('/api/wallet/balance', async (request, reply) => {
    const parsed = z.object({ address: z.string().min(1) }).safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'Address is required.' };
    }

    // Deliberately not accepting a client-supplied rpcUrl anymore — letting the
    // client choose which host the backend connects to is an unnecessary SSRF
    // surface. The server always uses its own configured ARC_RPC_URL.
    return walletService.getBalance(parsed.data.address);
  });

  fastify.post('/api/wallet/agent/provision', async (request, reply) => {
    const parsed = z.object({ ownerWallet: z.string().min(1) }).safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return { error: 'ownerWallet is required.' };
    }

    return walletService.provisionAgentWallet(parsed.data.ownerWallet);
  });
};
