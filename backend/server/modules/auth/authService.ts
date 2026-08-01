export class AuthService {
  async validateToken(_token: string) {
    return { valid: true, principal: 'anonymous' };
  }
}
