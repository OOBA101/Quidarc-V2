export interface ExecutionRepository {
  recordExecution(event: Record<string, unknown>): Promise<void>;
}
