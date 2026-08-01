/**
 * Circle Developer-Controlled Wallets integration boundary.
 *
 * This is intentionally NOT a full implementation of Circle's SDK — that
 * requires a real Circle API key + entity secret, which only the team has, and
 * I can't verify exact current SDK method signatures without testing against a
 * real account. What this gives you: a correctly-shaped interface the rest of
 * the codebase can depend on, wired to genuinely call Circle's SDK once
 * credentials are present, and an honestly-labeled mock (never a silently-fake
 * real-looking response) otherwise.
 *
 * Before wiring the real call: `npm install @circle-fin/developer-controlled-wallets`
 * and follow https://developers.circle.com/w3s/developer-controlled-wallets for
 * the current wallet-set + wallet creation flow. Don't copy method names from
 * this file assuming they match Circle's actual SDK — verify against their docs.
 */
export class CircleClient {
  private readonly apiKey = process.env.CIRCLE_API_KEY;

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async getStatus() {
    return {
      provider: 'circle',
      status: this.isConfigured() ? 'configured' : 'not_configured',
      mock: !this.isConfigured(),
    };
  }

  /**
   * Provisions the Agent Wallet — a Circle Developer-Controlled Wallet the
   * backend holds signing authority for. This is NOT the User Wallet; the User
   * Wallet is created entirely client-side and never touches this class.
   */
  async provisionDeveloperControlledWallet(ownerWallet: string) {
    if (!this.isConfigured()) {
      return {
        mock: true,
        message:
          'CIRCLE_API_KEY is not set — returning a labeled mock, not a real wallet. Do not treat this address as usable on-chain.',
        ownerWallet,
        circleWalletId: null,
        address: null,
      };
    }

    // TODO: real Circle SDK call goes here once credentials are configured.
    // Verify the current wallet-set/wallet creation flow against Circle's docs
    // — don't assume the shape below is exactly right, it's a placeholder for
    // the real call's return shape, not a tested implementation.
    throw new Error(
      'CIRCLE_API_KEY is set, but the real Circle SDK call has not been implemented yet. ' +
        'See the comment at the top of circleClient.ts before removing this guard.',
    );
  }
}
