export interface ExecutionQuote {
  kind: 'swap' | 'transfer';
  amount: string;
  protocol: string;
  slippage: string;
  fee: string;
  requiresConfirmation: boolean;
}

export interface ExecutionConfirmationResponse {
  message: string;
  transaction: {
    kind: 'swap' | 'transfer';
    summary: string;
    walletAddress?: string;
    status: string;
    permissionCardId?: string;
    quote: ExecutionQuote;
  };
}
