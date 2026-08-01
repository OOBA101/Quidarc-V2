export type PermissionAction = 'swap' | 'transfer' | 'bridge' | 'claim';

export interface PermissionCardContract {
  id: string;
  name: string;
  ownerWallet: string;
  agentWalletAddress?: string | null;
  actions: PermissionAction[];
  dailySpendLimit: string; // numeric comes back as string from Postgres/Drizzle — don't silently coerce, parse deliberately
  protocolAllowlist: string[];
  spendWindowType: string;
  expiresAt: string;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
}
