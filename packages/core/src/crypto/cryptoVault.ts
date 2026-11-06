/**
 * cryptoVault.ts - Client-Side Zero-Knowledge Encryption (WebCrypto AES-GCM-256)
 * & GoBD Pre-Encryption SHA-256 Immutability (GoBD Rn. 108-110)
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import Dexie, { type EntityTable } from 'dexie';

export class GoBDIntegrityError extends Error {
  constructor(
    message = 'Cryptographic receipt tamper detected: SHA-256 hash mismatch under GoBD Rn. 108-110'
  ) {
    super(message);
    this.name = 'GoBDIntegrityError';
  }
}

export interface KeyRingEntry {
  id: string;
  key: CryptoKey;
  createdAt: number;
}

class KeyRingDatabase extends Dexie {
  keys!: EntityTable<KeyRingEntry, 'id'>;

  constructor(dbName = 'WarrantyWalletKeyRing') {
    super(dbName);
    this.version(1).stores({
      keys: 'id',
    });
  }
}

let keyRingDbInstance: KeyRingDatabase | null = null;
function getKeyRingDb(): KeyRingDatabase {
  if (!keyRingDbInstance) {
    keyRingDbInstance = new KeyRingDatabase();
  }
  return keyRingDbInstance;
}

/**
 * Converts a Uint8Array or ArrayBuffer to a lowercase hexadecimal string.
 */
export function bufferToHex(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hexadecimal string back to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Computes a standard SHA-256 digest on raw buffer data.
 * Under GoBD Rn. 108-110, this MUST be computed pre-encryption.
 */
export async function computeSha256Hex(
  buffer: Uint8Array | ArrayBuffer
): Promise<string> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Generates a standard non-extractable (or test-extractable) AES-GCM 256-bit key.
 */
export async function generateVaultKey(extractable = false): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Retrieves the local master CryptoKey from the sandboxed key ring database,
 * generating a fresh one if not present.
 */
export async function getOrCreateMasterKey(
  keyId = 'master_receipt_key'
): Promise<CryptoKey> {
  const db = getKeyRingDb();
  const existing = await db.keys.get(keyId);
  if (existing?.key) {
    return existing.key;
  }

  const newKey = await generateVaultKey(false);
  await db.keys.put({
    id: keyId,
    key: newKey,
    createdAt: Date.now(),
  });
  return newKey;
}

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  ivHex: string;
  sha256: string;
}

/**
 * Encrypts a raw receipt image buffer using WebCrypto AES-GCM-256.
 * Generates a 96-bit (12-byte) CSPRNG IV for every call.
 * Computes pre-encryption SHA-256 forensic digest.
 */
export async function encryptReceiptBlob(
  rawBuffer: Uint8Array | ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const data = rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);

  // 1. Compute pre-encryption SHA-256 hash (GoBD Rn. 108-110)
  const sha256 = await computeSha256Hex(data);

  // 2. Generate a 96-bit (12 bytes) CSPRNG IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivHex = bufferToHex(iv);

  // 3. Encrypt data with AES-GCM-256
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: new Uint8Array(encryptedBuffer),
    ivHex,
    sha256,
  };
}

/**
 * Decrypts ciphertext using WebCrypto AES-GCM-256.
 * Verifies authentication tag and checks post-decryption SHA-256 integrity.
 * Throws GoBDIntegrityError if hash mismatch or tamper detected.
 */
export async function decryptReceiptBlob(
  ciphertext: Uint8Array | ArrayBuffer,
  ivHex: string,
  expectedSha256: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const cipherBytes =
    ciphertext instanceof Uint8Array ? ciphertext : new Uint8Array(ciphertext);
  const iv = hexToBytes(ivHex);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      cipherBytes
    );
  } catch (err) {
    throw new GoBDIntegrityError(
      `Tamper detected during AES-GCM decryption: ${(err as Error).message}`
    );
  }

  const decryptedBytes = new Uint8Array(decryptedBuffer);
  const actualSha256 = await computeSha256Hex(decryptedBytes);

  if (actualSha256 !== expectedSha256) {
    throw new GoBDIntegrityError(
      `Pre-encryption SHA-256 mismatch! Expected ${expectedSha256}, got ${actualSha256}`
    );
  }

  return decryptedBytes;
}
