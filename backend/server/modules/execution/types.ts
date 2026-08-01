export interface ExecutionInput {
  kind: 'swap' | 'transfer';
  summary: string;
  walletAddress?: string;
  amount?: string;
  toAddress?: string;
  permissionCardId?: string;
  protocol?: string;
}

export interface ExecutionQuote {
  kind: 'swap' | 'transfer';
  amount: string;
  protocol: string;
  slippage: string;
  fee: string;
  requiresConfirmation: boolean;
}
