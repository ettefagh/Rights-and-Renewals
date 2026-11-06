import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptReceiptBlob,
  decryptReceiptBlob,
  computeSha256Hex,
  generateVaultKey,
  getOrCreateMasterKey,
  GoBDIntegrityError,
  bufferToHex,
  hexToBytes,
} from '../src/crypto/cryptoVault.js';

describe('cryptoVault - WebCrypto AES-GCM-256 & GoBD SHA-256', () => {
  let masterKey: CryptoKey;
  const mockReceiptPlaintext = new TextEncoder().encode(
    'SATURN KASSENBON 2026-03-15 SONY WH-1000XM4 TOTAL EUR 279.00'
  );

  beforeEach(async () => {
    masterKey = await generateVaultKey(true);
  });

  it('CRYPTO-01: encrypts and decrypts receipt buffer matching plaintext verbatim', async () => {
    const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
    expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
    expect(encrypted.ivHex).toHaveLength(24); // 12 bytes = 24 hex characters
    expect(encrypted.sha256).toHaveLength(64);

    const decrypted = await decryptReceiptBlob(
      encrypted.ciphertext,
      encrypted.ivHex,
      encrypted.sha256,
      masterKey
    );
    expect(decrypted).toEqual(mockReceiptPlaintext);
  });

  it('CRYPTO-02: supports ArrayBuffer input across encrypt and computeSha256Hex', async () => {
    const rawArrayBuffer = mockReceiptPlaintext.buffer.slice(
      mockReceiptPlaintext.byteOffset,
      mockReceiptPlaintext.byteOffset + mockReceiptPlaintext.byteLength
    );
    const hash = await computeSha256Hex(rawArrayBuffer);
    expect(hash).toHaveLength(64);

    const encrypted = await encryptReceiptBlob(rawArrayBuffer, masterKey);
    const decrypted = await decryptReceiptBlob(
      encrypted.ciphertext.buffer as ArrayBuffer,
      encrypted.ivHex,
      encrypted.sha256,
      masterKey
    );
    expect(decrypted).toEqual(mockReceiptPlaintext);
  });

  it('CRYPTO-03: generates 100 unique 96-bit CSPRNG IVs with zero collision', async () => {
    const ivSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
      ivSet.add(encrypted.ivHex);
    }
    expect(ivSet.size).toBe(100);
  });

  it('CRYPTO-04: verifies GoBD pre-encryption SHA-256 matches plaintext digest', async () => {
    const expectedSha256 = await computeSha256Hex(mockReceiptPlaintext);
    const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
    expect(encrypted.sha256).toBe(expectedSha256);
  });

  it('CRYPTO-05: detects 1-bit ciphertext tampering and throws GoBDIntegrityError', async () => {
    const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
    const tamperedCiphertext = new Uint8Array(encrypted.ciphertext);
    tamperedCiphertext[0]! ^= 1; // Flip 1 bit

    await expect(
      decryptReceiptBlob(
        tamperedCiphertext,
        encrypted.ivHex,
        encrypted.sha256,
        masterKey
      )
    ).rejects.toThrow(GoBDIntegrityError);
  });

  it('CRYPTO-06: tampering auth tag throws GoBDIntegrityError', async () => {
    const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
    const tamperedCiphertext = new Uint8Array(encrypted.ciphertext);
    tamperedCiphertext[tamperedCiphertext.length - 1]! ^= 1;

    await expect(
      decryptReceiptBlob(
        tamperedCiphertext,
        encrypted.ivHex,
        encrypted.sha256,
        masterKey
      )
    ).rejects.toThrow(GoBDIntegrityError);
  });

  it('CRYPTO-07: throws GoBDIntegrityError when expected SHA-256 does not match', async () => {
    const encrypted = await encryptReceiptBlob(mockReceiptPlaintext, masterKey);
    const corruptedSha256 = '0'.repeat(64);

    await expect(
      decryptReceiptBlob(
        encrypted.ciphertext,
        encrypted.ivHex,
        corruptedSha256,
        masterKey
      )
    ).rejects.toThrow(/Pre-encryption SHA-256 mismatch/);
  });

  it('CRYPTO-08: hexToBytes throws on invalid hex string length and converts valid hex', () => {
    expect(() => hexToBytes('abc')).toThrow('Invalid hex string length');
    const bytes = hexToBytes('0102030a');
    expect(Array.from(bytes)).toEqual([1, 2, 3, 10]);
    expect(bufferToHex(bytes)).toBe('0102030a');
  });

  it('CRYPTO-09: retrieves or creates master key from key ring db', async () => {
    const key1 = await getOrCreateMasterKey('test_key_01');
    expect(key1).toBeDefined();
    const key2 = await getOrCreateMasterKey('test_key_01');
    expect(key2).toBeDefined();
  });

  it('CRYPTO-10: generates non-extractable key by default', async () => {
    const defaultKey = await generateVaultKey();
    expect(defaultKey.extractable).toBe(false);
  });
});
