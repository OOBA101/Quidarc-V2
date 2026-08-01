import { generatePrivateKey, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { Account, PrivateKeyAccount } from 'viem';

export interface EncryptedWalletRecord {
  address: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  createdAt: string;
}

const WALLET_STORAGE_KEY = 'quidarc.wallet.v2';

// --- Real key generation / import (replaces SHA-256-of-a-string) ---
//
// The original code did `SHA-256(privateKeyString)` and called the result an
// "address." That produces something address-shaped with zero relationship to
// any real keypair — it can't sign anything. Real EVM addresses come from
// secp256k1 public-key derivation + Keccak-256, which is exactly what viem's
// `privateKeyToAccount` / `mnemonicToAccount` do correctly.
//
// Note: viem's PrivateKeyAccount deliberately does NOT expose the raw private
// key back as a property once created — it's captured in a closure for the
// signing methods to use internally. That's good security design for normal
// usage, but this app also needs the raw hex to encrypt-and-persist the
// wallet across page reloads, so these functions return both explicitly
// rather than trying to pull a `.privateKey` off the account object (which
// doesn't exist and would silently be `undefined`).

export function createNewAccount(): { account: PrivateKeyAccount; privateKeyHex: `0x${string}` } {
  const privateKeyHex = generatePrivateKey();
  return { account: privateKeyToAccount(privateKeyHex), privateKeyHex };
}

/**
 * Accepts either a private key (0x-prefixed, 64 hex chars) or a BIP-39
 * mnemonic. Throws if neither shape is valid — never silently produces a fake
 * address for malformed input the way the original code did.
 *
 * For the mnemonic case, `secretForStorage` is the phrase itself (there is no
 * single "private key" to extract from a mnemonic account the way there is
 * for a raw key — viem derives signatures from the phrase on demand). Either
 * way, only the encrypted form of whatever's returned here should ever touch
 * storage.
 */
export function importAccount(secret: string): { account: Account; secretForStorage: string } {
  const trimmed = secret.trim();

  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { account: privateKeyToAccount(trimmed as `0x${string}`), secretForStorage: trimmed };
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount === 12 || wordCount === 24) {
    return { account: mnemonicToAccount(trimmed), secretForStorage: trimmed };
  }

  throw new Error('Not a recognized private key (0x + 64 hex chars) or a 12/24-word recovery phrase.');
}

// --- Encryption at rest — this part of the original code was already sound
// (PBKDF2 + AES-GCM via the native Web Crypto API). Kept the approach, raised
// the iteration count toward current guidance, and added a decrypt path since
// the original only ever encrypted and never decrypted anything. ---

const PBKDF2_ITERATIONS = 600_000; // OWASP's current baseline for PBKDF2-SHA256

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  arr.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveEncryptionKey(password: string, salt: Uint8Array<ArrayBuffer>, usages: KeyUsage[]) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export async function encryptPrivateKey(
  privateKeyHex: string,
  password: string,
): Promise<Omit<EncryptedWalletRecord, 'address' | 'createdAt'>> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, ['encrypt']);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(privateKeyHex),
  );

  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

/**
 * Decrypts and returns the raw private key. Caller is responsible for keeping
 * this in memory only for the duration it's needed (e.g. signing one
 * transaction) — never persist the decrypted result anywhere, including
 * component state that outlives the immediate signing operation.
 */
export async function decryptPrivateKey(record: EncryptedWalletRecord, password: string): Promise<`0x${string}`> {
  const salt = fromBase64(record.salt);
  const iv = fromBase64(record.iv);
  const key = await deriveEncryptionKey(password, salt, ['decrypt']);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(record.ciphertext));
  return new TextDecoder().decode(plaintext) as `0x${string}`;
}

// --- Local storage (client-only, per the architecture doc — the backend
// never sees this, encrypted or not, and there is deliberately no
// cross-device sync). ---

export function saveEncryptedWallet(record: EncryptedWalletRecord) {
  window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(record));
}

export function loadEncryptedWallet(): EncryptedWalletRecord | null {
  const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as EncryptedWalletRecord) : null;
}

export function clearStoredWallet() {
  window.localStorage.removeItem(WALLET_STORAGE_KEY);
}
