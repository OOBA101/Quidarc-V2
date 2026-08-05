import { randomUUID } from 'node:crypto';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import type { CircleDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { env } from '../../config/env.js';

/**
 * Circle Developer-Controlled Wallets integration for Agent Wallet provisioning
 * and execution. Returns a labeled mock when unconfigured (CIRCLE_API_KEY blank)
 * so the rest of the codebase can depend on a stable interface whether or not
 * Circle credentials are present — the calling service honestly reports "not
 * configured" rather than fabricating success.
 */
export class CircleClient {
  private client: CircleDeveloperControlledWalletsClient | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = initiateDeveloperControlledWalletsClient({
        apiKey: env.CIRCLE_API_KEY,
        entitySecret: env.CIRCLE_ENTITY_SECRET,
      });
    }
  }

  isConfigured() {
    return Boolean(env.CIRCLE_API_KEY.trim() && env.CIRCLE_ENTITY_SECRET.trim() && env.CIRCLE_WALLET_SET_ID.trim());
  }

  async getStatus() {
    return {
      provider: 'circle',
      status: this.isConfigured() ? 'configured' : 'not_configured',
      mock: !this.isConfigured(),
    };
  }

  /**
   * Provisions a new Agent Wallet — a Circle Developer-Controlled Wallet (EOA)
   * on Arc Testnet that the backend holds signing authority for. This is NOT
   * the User Wallet; the User Wallet is created entirely client-side via Web
   * Crypto and never touches this class.
   */
  async provisionDeveloperControlledWallet(ownerWallet: string) {
    if (!this.isConfigured()) {
      return {
        mock: true,
        message:
          'CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET / CIRCLE_WALLET_SET_ID are not set — returning a labeled mock, not a real wallet. Do not treat this address as usable on-chain.',
        ownerWallet,
        circleWalletId: null,
        address: null,
      };
    }

    const response = await this.client!.createWallets({
      walletSetId: env.CIRCLE_WALLET_SET_ID,
      blockchains: ['ARC-TESTNET'],
      accountType: 'EOA',
      count: 1,
      idempotencyKey: randomUUID(),
    });

    const wallet = response.data?.wallets?.[0];
    if (!wallet) {
      throw new Error('Circle createWallets returned no wallet in the response.');
    }

    return {
      mock: false,
      ownerWallet,
      circleWalletId: wallet.id,
      address: wallet.address,
    };
  }

  /**
   * Creates a USDC transfer transaction from an Agent Wallet. This only works
   * for wallets that exist in Circle's system (provisioned via the method above).
   * Returns the Circle transaction ID; polling for the on-chain txHash happens
   * separately via getTransactionStatus.
   */
  async createUsdcTransfer(input: {
    walletId: string;
    tokenId: string;
    destinationAddress: string;
    amount: string;
  }) {
    if (!this.isConfigured()) {
      throw new Error('Circle is not configured — cannot execute Agent Wallet transfers.');
    }

    const response = await this.client!.createTransaction({
      walletId: input.walletId,
      tokenId: input.tokenId,
      destinationAddress: input.destinationAddress,
      amount: [input.amount],
      fee: {
        type: 'level',
        config: { feeLevel: 'MEDIUM' },
      },
      idempotencyKey: randomUUID(),
    });

    const txId = response.data?.id;
    if (!txId) {
      throw new Error('Circle createTransaction returned no transaction ID.');
    }

    return { transactionId: txId };
  }

  /**
   * Resolves the Circle tokenId for the ERC-20 USDC token held by a wallet, by
   * matching against the known Arc USDC contract address. Circle's createTransaction
   * needs a tokenId, which is only knowable by listing the wallet's balances —
   * there's no static mapping. Returns null if the wallet holds no USDC yet.
   */
  async getUsdcTokenId(walletId: string): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new Error('Circle is not configured.');
    }

    const response = await this.client!.getWalletTokenBalance({ id: walletId });
    const balances = response.data?.tokenBalances ?? [];
    const usdcAddress = env.ARC_USDC_CONTRACT_ADDRESS.toLowerCase();

    const match = balances.find(
      (b) => !b.token.isNative && b.token.tokenAddress?.toLowerCase() === usdcAddress,
    );

    return match?.token.id ?? null;
  }

  /**
   * Polls a Circle transaction until it reaches the requested state or the
   * txHash is populated (for on-chain confirmation). Use this after createUsdcTransfer
   * to wait for the transaction to land on-chain before recording the spend.
   */
  async getTransactionStatus(transactionId: string, waitForTxHash = false) {
    if (!this.isConfigured()) {
      throw new Error('Circle is not configured.');
    }

    const response = waitForTxHash
      ? await this.client!.getTransaction({ id: transactionId, waitForTxHash: true })
      : await this.client!.getTransaction({ id: transactionId });

    const tx = response.data?.transaction;
    if (!tx) {
      throw new Error(`Circle getTransaction returned no transaction for ID ${transactionId}.`);
    }

    return {
      id: tx.id,
      state: tx.state,
      txHash: tx.txHash ?? null,
    };
  }
}
