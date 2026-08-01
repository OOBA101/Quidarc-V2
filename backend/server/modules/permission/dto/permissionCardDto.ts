export type PermissionCardDto = {
  name: string;
  ownerWallet: string;
  agentWalletAddress?: string;
  actions: Array<'swap' | 'transfer' | 'bridge' | 'claim'>;
  dailySpendLimit: number;
  protocolAllowlist: string[];
  expiresAt: string; // ISO 8601, required — no indefinite cards
};
