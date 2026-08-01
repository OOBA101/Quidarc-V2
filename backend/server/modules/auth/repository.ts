export interface AuthRepository {
  validateToken(token: string): Promise<{ valid: boolean; principal: string }>;
}

export interface SessionRepository {
  createSession(principal: string): Promise<{ sessionId: string }>;
}
