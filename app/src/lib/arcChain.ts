import { createWalletClient, http, defineChain } from 'viem';
import type { Account } from 'viem';

/**
 * Intentionally duplicated from backend/server/integrations/arc/arcClient.ts
 * rather than shared via packages/contracts — that would need working through
 * the same npm-workspace resolution issue that blocked drizzle-kit's CLI on
 * the backend (see the repo review). Correct-but-duplicated now beats a
 * shared package fighting the same tooling issue with no time left to debug
 * it. Worth consolidating later — if you change one, change both.
 */
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_RPC_URL = import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_USDC_CONTRACT = (import.meta.env.VITE_ARC_USDC_CONTRACT_ADDRESS ||
  '0x3600000000000000000000000000000000000000') as `0x${string}`;
export const USDC_DECIMALS = 6;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] },
  },
  testnet: true,
});

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Signs and broadcasts a USDC transfer directly from the browser, using the
 * user's own decrypted key. This is the other half of the fix for "the
 * backend should never see a private key" — the backend only ever gets called
 * afterward, to record the resulting tx hash (see confirmTransfer in api.ts).
 */
export async function signAndSendUsdcTransfer(account: Account, toAddress: string, amountRaw: bigint) {
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(ARC_RPC_URL),
  });

  return walletClient.writeContract({
    address: ARC_TESTNET_USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountRaw],
  });
}
