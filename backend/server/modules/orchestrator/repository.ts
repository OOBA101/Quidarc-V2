export interface OrchestratorRepository {
  loadConversationContext(id: string): Promise<unknown>;
  saveConversationContext(id: string, context: unknown): Promise<void>;
}
