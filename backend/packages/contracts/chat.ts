export type ChatIntent = 'general' | 'balance' | 'swap' | 'transfer';

export interface ChatResponse {
  reply: string;
  intent: ChatIntent;
  confirmation: {
    kind: 'swap' | 'transfer';
    summary: string;
  } | null;
}
