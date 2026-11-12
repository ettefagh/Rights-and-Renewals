/**
 * gobdCrypto.js
 * Client-Side GoBD Rn. 108–110 Cryptographic Immutability Pre-Encryption Digest Service
 * Milestone: M3 (Feature 17, 18)
 *
 * Uses standard Web Cryptography API (crypto.subtle) with zero external libraries.
 */

export class GoBDCryptoService {
  /**
   * Compute immutable SHA-256 pre-encryption digest combining canonical metadata and binary blob
   * Formula: SHA-256(canonical_json(meta) + "::GOBD_RECEIPT_BLOB::" + fileBuffer)
   *
   * @param {ArrayBuffer|Uint8Array|string} fileBuffer - Receipt file payload
   * @param {Object} metadata - Item and receipt metadata
   * @returns {Promise<string>} 64-character lowercase hex digest
   */
  static async computeDigest(fileBuffer = new Uint8Array(0), metadata = {}) {
    // 1. Produce canonical sorted JSON string (matching tests/e2e/harness.py compute_gobd_sha256)
    const sortedKeys = Object.keys(metadata).sort();
    const sortedObj = {};
    for (const key of sortedKeys) {
      sortedObj[key] = metadata[key];
    }
    const canonicalMeta = JSON.stringify(sortedObj);

    const enc = new TextEncoder();
    const metaBytes = enc.encode(canonicalMeta);
    const separatorBytes = enc.encode('::GOBD_RECEIPT_BLOB::');

    let payloadBytes;
    if (typeof fileBuffer === 'string') {
      payloadBytes = enc.encode(fileBuffer);
    } else if (fileBuffer instanceof Uint8Array) {
      payloadBytes = fileBuffer;
    } else if (fileBuffer instanceof ArrayBuffer) {
      payloadBytes = new Uint8Array(fileBuffer);
    } else {
      payloadBytes = new Uint8Array(0);
    }

    // 2. Concatenate metadata + separator + payload
    const merged = new Uint8Array(metaBytes.length + separatorBytes.length + payloadBytes.length);
    merged.set(metaBytes, 0);
    merged.set(separatorBytes, metaBytes.length);
    merged.set(payloadBytes, metaBytes.length + separatorBytes.length);

    // 3. Compute SHA-256 using SubtleCrypto
    const subtle = (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) ||
                   (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle);

    if (subtle) {
      const hashBuffer = await subtle.digest('SHA-256', merged);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js fallback using crypto module if running outside browser
      try {
        const nodeCrypto = await import('crypto');
        const hash = nodeCrypto.createHash('sha256');
        hash.update(merged);
        return hash.digest('hex');
      } catch (e) {
        throw new Error('SubtleCrypto not available in current execution environment');
      }
    }
  }

  static async computeReceiptDigest(fileBuffer, metadata) {
    return this.computeDigest(fileBuffer, metadata);
  }
}
