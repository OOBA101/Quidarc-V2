export interface AuthContext {
  principal: string;
  sessionId?: string;
}

export interface AuthResult {
  valid: boolean;
  principal: string;
}

export interface SessionResult {
  sessionId: string;
}
