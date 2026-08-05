import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_CONTRACT,
  DEFAULT_ARC_RPC_URL,
  USDC_DECIMALS,
  getChainId,
  getUsdcDecimals,
} from './arcClient.js';

/**
 * Verifies that Quidarc can actually reach Arc Testnet at the configured RPC
 * and that the configured USDC contract matches the app's assumptions. This is
 * a live network check — run it after setting ARC_RPC_URL / ARC_USDC_CONTRACT_ADDRESS
 * to catch a wrong RPC or a mis-set contract address before it surfaces as a
 * confusing balance/transfer bug in the UI.
 *
 *   Local:                 npm run arc:verify
 *   On Railway (compiled): npm run arc:verify:prod
 *
 * Exits 0 when the chain ID and USDC decimals match, 1 on any mismatch or if
 * the RPC is unreachable.
 */
async function verify(): Promise<boolean> {
  const problems: string[] = [];

  console.log(`🔌 RPC: ${DEFAULT_ARC_RPC_URL}`);
  console.log(`🪙 USDC contract: ${ARC_TESTNET_USDC_CONTRACT}`);

  // Chain ID — confirms we are talking to Arc Testnet, not some other network.
  const chainId = await getChainId();
  if (chainId === ARC_TESTNET_CHAIN_ID) {
    console.log(`✅ chain ID ${chainId}`);
  } else {
    problems.push(`Chain ID mismatch: expected ${ARC_TESTNET_CHAIN_ID}, RPC reported ${chainId}`);
  }

  // On-chain USDC decimals — the app's spend-limit and transfer math assume 6.
  const decimals = await getUsdcDecimals();
  if (Number(decimals) === USDC_DECIMALS) {
    console.log(`✅ USDC decimals ${decimals}`);
  } else {
    problems.push(`USDC decimals mismatch: expected ${USDC_DECIMALS}, contract reported ${decimals}`);
  }

  if (problems.length) {
    console.error('\n❌ Arc verification failed:');
    for (const p of problems) console.error(`   - ${p}`);
    return false;
  }
  console.log('\n✅ Arc verification passed — RPC reachable, chain and USDC contract match.');
  return true;
}

if (process.argv[1] && process.argv[1].includes('verify')) {
  verify()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((error) => {
      console.error('❌ Arc verification error:', error);
      process.exit(1);
    });
}
