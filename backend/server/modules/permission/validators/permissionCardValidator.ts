import { z } from 'zod';

export const permissionCardValidator = z.object({
  name: z.string().min(1),
  ownerWallet: z.string().min(1),
  agentWalletAddress: z.string().optional(),
  actions: z.array(z.enum(['swap', 'transfer', 'bridge', 'claim'])).min(1),
  dailySpendLimit: z.number().nonnegative(),
  protocolAllowlist: z.array(z.string()).min(1),
  expiresAt: z.string().datetime({ message: 'expiresAt must be an ISO 8601 timestamp' }),
});

export const authorizationRequestValidator = z.object({
  cardId: z.string().uuid(),
  action: z.enum(['swap', 'transfer', 'bridge', 'claim']),
  protocol: z.string().min(1),
  amount: z.number().positive(),
});
