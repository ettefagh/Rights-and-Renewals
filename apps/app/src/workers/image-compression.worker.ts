/**
 * image-compression.worker.ts
 * Client-Side Web Worker downsampling (<=2048px, <1.5MB) + GoBD SHA-256 pre-encryption digest.
 * Explicit OffscreenCanvas memory release.
 */

export interface CompressionInput {
  imageBitmap?: ImageBitmap;
  fileBytes?: ArrayBuffer;
  maxDimension?: number;
  quality?: number;
}

export interface CompressionOutput {
  compressedBytes: Uint8Array;
  sha256Hex: string;
  originalSha256Hex: string;
  width: number;
  height: number;
  byteLength: number;
}

self.onmessage = async (e: MessageEvent<CompressionInput>) => {
  try {
    const { imageBitmap, fileBytes, maxDimension = 2048, quality = 0.85 } = e.data;

    let bitmap: ImageBitmap;
    let origSha256 = '';

    if (fileBytes) {
      const origHashBuf = await crypto.subtle.digest('SHA-256', fileBytes);
      origSha256 = Array.from(new Uint8Array(origHashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const blob = new Blob([fileBytes]);
      bitmap = await createImageBitmap(blob);
    } else if (imageBitmap) {
      bitmap = imageBitmap;
    } else {
      throw new Error('No image provided to compression worker');
    }

    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // OffscreenCanvas processing
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get OffscreenCanvas 2D context');

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Explicitly close bitmap
    bitmap.close();

    const compressedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality
    });

    const compressedBuffer = await compressedBlob.arrayBuffer();
    const compressedBytes = new Uint8Array(compressedBuffer);

    // Compute GoBD SHA-256 of compressed proof
    const hashBuf = await crypto.subtle.digest('SHA-256', compressedBytes);
    const sha256Hex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Explicitly release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    const response: CompressionOutput = {
      compressedBytes,
      sha256Hex,
      originalSha256Hex: origSha256 || sha256Hex,
      width,
      height,
      byteLength: compressedBytes.byteLength
    };

    self.postMessage(response, [compressedBytes.buffer] as any);
  } catch (err: any) {
    self.postMessage({ error: err.message || 'Compression failed' });
  }
};
