import { createPublicClient, defineChain, formatEther, formatUnits, http, parseEther, parseUnits } from 'viem';
import { env } from '../../config/env.js';

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const DEFAULT_ARC_RPC_URL = env.ARC_RPC_URL;

/**
 * Arc has a genuinely unusual dual-decimal design, confirmed against Arc's own
 * docs and Circle's developer guidance — this isn't a guess:
 *
 *   - The NATIVE gas balance (what `client.getBalance()` reads) is represented
 *     with 18 decimals, for EVM compatibility — same convention as ETH on most
 *     chains.
 *   - The ERC-20 USDC CONTRACT (a separate interface onto the same underlying
 *     value) uses 6 decimals, the standard USDC convention everywhere else.
 *
 * Circle's own guidance: "ALWAYS use 18 decimals for native gas amounts and 6
 * decimals for ERC-20 USDC amounts. NEVER mix these up." The scaffold only ever
 * wired up the native path — correct for what it did, but incomplete for
 * app-level balance display, transfers, and Permission Card spend-limit math,
 * all of which need the ERC-20 interface below, not the native one.
 */
export const ARC_TESTNET_USDC_CONTRACT = env.ARC_USDC_CONTRACT_ADDRESS as `0x${string}`;

export const USDC_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;

const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: NATIVE_DECIMALS },
  rpcUrls: {
    default: { http: [DEFAULT_ARC_RPC_URL] },
    public: { http: [DEFAULT_ARC_RPC_URL] },
  },
  testnet: true,
});

// Minimal ERC-20 ABI — only what Quidarc actually needs. Add more only when a
// real use case needs it; don't import a full generic ERC-20 ABI for convenience.
const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
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

// The default-RPC client is the hot path (every balance read, every card
// authorization check). Cache it as a module singleton rather than recreating
// the HTTP transport on each request. The parameterized getClient() path stays
// for arc:verify, which needs to test a custom RPC if supplied.
let defaultClient: ReturnType<typeof createPublicClient> | null = null;

function getClient(rpcUrl: string = DEFAULT_ARC_RPC_URL) {
  if (rpcUrl === DEFAULT_ARC_RPC_URL) {
    if (!defaultClient) {
      defaultClient = createPublicClient({
        chain: arcTestnet,
        transport: http(normalizeRpcUrl(DEFAULT_ARC_RPC_URL)),
      });
    }
    return defaultClient;
  }

  // Non-default RPC (arc:verify with a custom --rpc flag) — no caching.
  return createPublicClient({ chain: arcTestnet, transport: http(normalizeRpcUrl(rpcUrl)) });
}

export function normalizeRpcUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
}

// --- Native balance (18 decimals) — for gas-layer reads only. Do not use this
// for anything the user thinks of as "how much USDC do I have to spend." ---

export function parseNativeAmount(value: string) {
  return parseEther(value);
}

export function formatNativeAmount(value: bigint) {
  return formatEther(value);
}

export async function getNativeBalance(address: string, rpcUrl?: string) {
  return getClient(rpcUrl).getBalance({ address: address as `0x${string}` });
}

// --- ERC-20 USDC balance (6 decimals) — use this for anything user- or
// application-facing: balance display, transfers, Permission Card spend math. ---

export function parseUsdcAmount(value: string) {
  return parseUnits(value, USDC_DECIMALS);
}

export function formatUsdcAmount(value: bigint) {
  return formatUnits(value, USDC_DECIMALS);
}

export async function getUsdcBalance(address: string, rpcUrl?: string) {
  const client = getClient(rpcUrl);
  return client.readContract({
    address: ARC_TESTNET_USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
}

// --- Connectivity / sanity reads — used by the arc:verify script to confirm we
// are actually talking to Arc Testnet (chain 5042002) and that the configured
// USDC contract reports the 6 decimals the app's math assumes. ---

export async function getChainId(rpcUrl?: string) {
  return getClient(rpcUrl).getChainId();
}

export async function getUsdcDecimals(rpcUrl?: string) {
  return getClient(rpcUrl).readContract({
    address: ARC_TESTNET_USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'decimals',
  });
}

/**
 * Builds the calldata for an ERC-20 USDC transfer — does NOT sign or send it.
 * Signing happens client-side with the user's own key (see the governance doc:
 * the backend must never hold or receive User Wallet key material). The
 * frontend uses this to construct the transaction, signs it locally with viem,
 * and broadcasts it directly — the backend only records the result afterward.
 */
export function encodeUsdcTransferData(toAddress: string, amount: string) {
  const parsedAmount = parseUsdcAmount(amount);

  return {
    to: ARC_TESTNET_USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'transfer' as const,
    args: [toAddress as `0x${string}`, parsedAmount] as const,
  };
}
