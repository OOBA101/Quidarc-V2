import { createNewAccount, importAccount, encryptPrivateKey, decryptPrivateKey } from './src/lib/walletCrypto';
import { privateKeyToAccount } from 'viem/accounts';

async function main() {
  console.log('--- 1. Generate a real account ---');
  const { account, privateKeyHex } = createNewAccount();
  console.log('Address:', account.address);
  console.log('Is valid 0x + 40 hex chars:', /^0x[0-9a-fA-F]{40}$/.test(account.address));

  console.log('\n--- 2. Encrypt, then decrypt, then verify round-trip ---');
  const password = 'correct horse battery staple';
  const encrypted = await encryptPrivateKey(privateKeyHex, password);
  console.log('Encrypted (ciphertext, first 20 chars):', encrypted.ciphertext.slice(0, 20) + '...');

  const decrypted = await decryptPrivateKey(
    { ...encrypted, address: account.address, createdAt: new Date().toISOString() },
    password,
  );
  console.log('Decrypted key matches original:', decrypted === privateKeyHex);

  console.log('\n--- 3. The real proof: decrypted key re-derives the SAME address ---');
  const reconstructed = privateKeyToAccount(decrypted);
  console.log('Original address:    ', account.address);
  console.log('Reconstructed address:', reconstructed.address);
  console.log('Match:', reconstructed.address === account.address);

  console.log('\n--- 4. Wrong password correctly fails to decrypt (not silently wrong data) ---');
  try {
    await decryptPrivateKey({ ...encrypted, address: account.address, createdAt: new Date().toISOString() }, 'wrong password');
    console.log('FAIL: should have thrown');
  } catch {
    console.log('Correctly rejected wrong password (AES-GCM auth tag failure)');
  }

  console.log('\n--- 5. Import path: private key round-trips to the same address ---');
  const imported = importAccount(privateKeyHex);
  console.log('Import produces same address as original generation:', imported.account.address === account.address);

  console.log('\n--- 6. Import path: a real 12-word mnemonic derives a valid, different account ---');
  // A real, valid BIP-39 test mnemonic (this is a well-known public test vector, not a real fund-holding wallet)
  const testMnemonic = 'test test test test test test test test test test test junk';
  const mnemonicImport = importAccount(testMnemonic);
  console.log('Mnemonic-derived address:', mnemonicImport.account.address);
  console.log('Is valid 0x + 40 hex chars:', /^0x[0-9a-fA-F]{40}$/.test(mnemonicImport.account.address));

  console.log('\n--- 7. Malformed input is rejected, not silently turned into a fake address ---');
  try {
    importAccount('not a real key or phrase');
    console.log('FAIL: should have thrown');
  } catch (error) {
    console.log('Correctly rejected:', (error as Error).message);
  }
}

main().catch((error) => {
  console.error('VERIFICATION FAILED:', error);
  process.exit(1);
});
