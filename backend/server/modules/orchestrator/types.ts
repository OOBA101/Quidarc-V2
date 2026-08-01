export interface ChatRequest {
  message: string;
}

export interface ChatResult {
  reply: string;
  intent: 'general' | 'balance' | 'swap' | 'transfer';
  confirmation: {
    kind: 'swap' | 'transfer';
    summary: string;
  } | null;
}
