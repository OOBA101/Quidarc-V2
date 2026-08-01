import { describe, expect, it } from 'vitest';
import {
  formatNativeAmount,
  parseNativeAmount,
  formatUsdcAmount,
  parseUsdcAmount,
  normalizeRpcUrl,
  encodeUsdcTransferData,
  ARC_TESTNET_USDC_CONTRACT,
} from './arcClient.js';

describe('Arc dual-decimal handling', () => {
  // The native path is 18 decimals — for gas-layer reads only.
  it('parses/formats native amounts at 18 decimals', () => {
    expect(parseNativeAmount('1.5')).toBe(1500000000000000000n);
    expect(formatNativeAmount(1500000000000000000n)).toBe('1.5');
  });

  // The ERC-20 USDC path is 6 decimals — this is what app-level logic should
  // use. These two must never be interchangeable, which is the entire point
  // of having them as clearly separate functions rather than one shared helper.
  it('parses/formats USDC amounts at 6 decimals, distinctly from native', () => {
    expect(parseUsdcAmount('1.5')).toBe(1500000n);
    expect(formatUsdcAmount(1500000n)).toBe('1.5');

    // Same human-readable value, genuinely different raw representation —
    // this is exactly the mismatch that caused the original bug risk.
    expect(parseUsdcAmount('1.5')).not.toBe(parseNativeAmount('1.5'));
  });

  it('normalizes RPC URLs', () => {
    expect(normalizeRpcUrl('rpc.arc.testnet')).toBe('https://rpc.arc.testnet');
    expect(normalizeRpcUrl('https://already-has-scheme.test')).toBe('https://already-has-scheme.test');
  });

  it('builds USDC transfer calldata against the correct contract, at 6 decimals', () => {
    const tx = encodeUsdcTransferData('0x1234567890123456789012345678901234567890', '10.5');

    expect(tx.to).toBe(ARC_TESTNET_USDC_CONTRACT);
    expect(tx.functionName).toBe('transfer');
    expect(tx.args[1]).toBe(10500000n); // 10.5 USDC at 6 decimals, not 18
  });
});
