import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { wallets } from '../../db/schema.js';
import { ARC_TESTNET_CHAIN_ID, formatUsdcAmount, getUsdcBalance } from '../../integrations/arc/arcClient.js';
import { CircleClient } from '../../integrations/circle/circleClient.js';

/**
 * This service is about the AGENT's wallet only — the one the backend holds
 * signing authority for, per the governance doc's two-wallet model. It is NOT
 * where User Wallet creation happens; that's 100% client-side, and the backend
 * never sees that key material, encrypted or not. (The scaffold had this
 * service also handling `/api/wallet/create` and `/api/wallet/import` with a
 * fake `Math.random()`-based address — that conflated the two wallets and has
 * been removed. See the repo review for why.)
 */
export class AgentWalletService {
  private readonly circleClient = new CircleClient();

  async provisionAgentWallet(ownerWallet: string) {
    const result = await this.circleClient.provisionDeveloperControlledWallet(ownerWallet);

    if (result.mock) {
      return result;
    }

    await db.insert(wallets).values({
      address: result.address!,
      chainId: ARC_TESTNET_CHAIN_ID,
      isAgentWallet: 'true',
      circleWalletId: result.circleWalletId!,
      ownerWallet,
    });

    return result;
  }

  async getAgentWalletForOwner(ownerWallet: string) {
    const [row] = await db.select().from(wallets).where(eq(wallets.ownerWallet, ownerWallet));
    return row ?? null;
  }

  /** Look up a wallet record by its on-chain address — used to resolve an
   * Agent Wallet's Circle wallet ID from the address stored on a permission card. */
  async getWalletByAddress(address: string) {
    const [row] = await db.select().from(wallets).where(eq(wallets.address, address));
    return row ?? null;
  }

  /** Real on-chain read against the Arc Testnet RPC — works for any address, agent or user. */
  async getBalance(address: string, rpcUrl?: string) {
    const balance = await getUsdcBalance(address, rpcUrl);

    return {
      address,
      balance: formatUsdcAmount(balance),
      chainId: ARC_TESTNET_CHAIN_ID,
    };
  }
}
