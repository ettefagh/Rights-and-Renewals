<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    vaultDb,
    decryptReceiptBlob,
    getOrCreateMasterKey,
    generateBarcodeSvg,
    type WalletItem
  } from '@cmlab/core';
  import { X, RotateCw, Sun, Scan, ShieldCheck, ZoomIn, ZoomOut } from 'lucide-svelte';

  interface Props {
    item: WalletItem;
    onClose: () => void;
  }

  let { item, onClose }: Props = $props();

  let imageUrl = $state<string | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);
  let wakeLockSentinel = $state<any>(null);

  // Optical scanner barcode SVG
  let barcodeSvgMarkup = $derived(
    item.barcodeValue || item.serialNumber
      ? generateBarcodeSvg(item.barcodeValue || item.serialNumber || '', { height: 60, moduleWidth: 2 })
      : null
  );

  // Gesture Transform State (GPU Accelerated)
  let scale = $state(1.0);
  let posX = $state(0);
  let posY = $state(0);
  let rotation = $state(0);
  let showBarcodeOverlay = $state(false);

  // Multi-touch tracking for pinch-to-zoom
  let activePointers = new SvelteMap<number, { x: number; y: number }>();
  let initialDistance = 0;
  let initialScale = 1.0;

  onMount(async () => {
    // 1. Acquire Screen WakeLock to prevent screen dimming at the retail counter
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('[ReceiptZoom] WakeLock unavailable or denied:', err);
      }
    }

    // 2. Decrypt Receipt Blob (<100ms hardware-accelerated pipeline)
    if (!item.receiptBlobId) {
      errorMessage = 'Kein Belegbild für diesen Artikel hinterlegt.';
      isLoading = false;
      return;
    }

    try {
      const blobRecord = await vaultDb.receipt_blobs.get(item.receiptBlobId);
      if (!blobRecord) {
        throw new Error('Verschlüsselter Beleg nicht in lokaler Datenbank gefunden.');
      }

      const masterKey = await getOrCreateMasterKey();
      const decryptedBytes = await decryptReceiptBlob(
        blobRecord.encryptedBlob,
        blobRecord.ivHex,
        blobRecord.sha256,
        masterKey
      );

      const blob = new Blob([decryptedBytes as unknown as BlobPart], {
        type: blobRecord.mimeType || 'image/jpeg'
      });
      imageUrl = URL.createObjectURL(blob);
    } catch (err: any) {
      errorMessage = err.message || 'Fehler beim Entschlüsseln des Belegs.';
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch {}
    }
  });

  function handlePointerDown(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      initialDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialScale = scale;
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2 && initialDistance > 0) {
      const pts = Array.from(activePointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      scale = Math.min(Math.max(initialScale * (currentDist / initialDistance), 0.8), 4.0);
    } else if (activePointers.size === 1 && scale > 1.0) {
      posX += e.movementX;
      posY += e.movementY;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) initialDistance = 0;
    if (scale < 1.0) {
      scale = 1.0;
      posX = 0;
      posY = 0;
    }
  }

  function toggleDoubleTapZoom() {
    if (scale > 1.2) {
      scale = 1.0;
      posX = 0;
      posY = 0;
    } else {
      scale = 2.2;
    }
  }
</script>

<div
  class="register-modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Kassen-Modus Belegansicht"
>
  <!-- High-Contrast Top Control Bar -->
  <header class="register-header">
    <div class="kasse-indicator">
      <Sun size={18} class="sun-icon" />
      <div>
        <span class="mode-title">Kassen-Modus (Maximaler Kontrast)</span>
        <span class="mode-sub">{item.merchantOrProvider} • {item.purchaseDate}</span>
      </div>
    </div>
    <div class="header-actions">
      {#if barcodeSvgMarkup}
        <button
          type="button"
          class="tool-btn"
          onclick={() => (showBarcodeOverlay = !showBarcodeOverlay)}
          aria-label="Barcode Scanner anzeigen"
          title="Barcode umschalten"
        >
          <Scan size={18} />
          <span class="btn-text">Barcode</span>
        </button>
      {/if}
      <button
        type="button"
        class="tool-btn"
        onclick={() => (rotation = (rotation + 90) % 360)}
        aria-label="Beleg 90 Grad drehen"
        title="Drehen"
      >
        <RotateCw size={18} />
      </button>
      <button
        type="button"
        class="close-btn"
        onclick={onClose}
        aria-label="Kassen-Modus schließen"
        title="Schließen"
      >
        <X size={22} />
      </button>
    </div>
  </header>

  <!-- High-Contrast Pure White Viewport (Never Dark Mode for Optical Laser Scanners) -->
  <main
    class="zoom-container"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    ondblclick={toggleDoubleTapZoom}
  >
    {#if isLoading}
      <div class="loader-box">
        <div class="spinner"></div>
        <p>Beleg wird client-seitig entschlüsselt (&lt;100ms)...</p>
      </div>
    {:else if errorMessage}
      <div class="error-box">
        <p>{errorMessage}</p>
        <button type="button" class="secondary-btn" onclick={onClose}>Zurück</button>
      </div>
    {:else if imageUrl}
      <img
        src={imageUrl}
        alt={`Originalkaufbeleg für ${item.title}`}
        class="receipt-image"
        style="transform: translate3d({posX}px, {posY}px, 0) scale({scale}) rotate({rotation}deg);"
        draggable="false"
      />
    {/if}

    <!-- Barcode Quick-Scan Overlay for Checkout Scanners -->
    {#if showBarcodeOverlay && barcodeSvgMarkup}
      <div class="barcode-overlay-sheet">
        <div class="barcode-header">
          <Scan size={16} />
          <span>Kassen-Scanner Barcode (Code 128)</span>
          <button
            type="button"
            class="mini-close"
            onclick={() => (showBarcodeOverlay = false)}
            aria-label="Barcode schließen"
          >
            <X size={16} />
          </button>
        </div>
        <div class="barcode-graphic">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html barcodeSvgMarkup}
        </div>
      </div>
    {/if}
  </main>

  <!-- Bottom Quick Info Bar -->
  <footer class="register-footer">
    <div class="footer-left">
      <ShieldCheck size={16} class="seal-icon" />
      <span class="proof-note">
        GoBD Pre-Encryption SHA-256 verifiziert • Offline aus lokalem Dexie Vault
      </span>
    </div>
    <div class="zoom-controls">
      <button
        type="button"
        class="zoom-btn"
        onclick={() => (scale = Math.max(1.0, scale - 0.4))}
        aria-label="Verkleinern"
      >
        <ZoomOut size={16} />
      </button>
      <span class="scale-label">{Math.round(scale * 100)}%</span>
      <button
        type="button"
        class="zoom-btn"
        onclick={() => (scale = Math.min(4.0, scale + 0.4))}
        aria-label="Vergrößern"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  </footer>
</div>

<style>
  /* FORCED PURE WHITE CANVAS FOR OPTICAL SCANNER READABILITY */
  .register-modal-overlay {
    position: fixed;
    inset: 0;
    background: #FFFFFF !important;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    touch-action: none;
    user-select: none;
  }

  .register-header {
    height: 58px;
    background: #0F172A;
    color: #FFFFFF;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .kasse-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  :global(.sun-icon) {
    color: #FBBF24;
    flex-shrink: 0;
  }

  .mode-title {
    display: block;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .mode-sub {
    display: block;
    font-size: 11px;
    color: #94A3B8;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tool-btn {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    min-height: 38px;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #FFFFFF;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: 6px;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .zoom-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
  }

  .zoom-container:active {
    cursor: grabbing;
  }

  .receipt-image {
    max-width: 96%;
    max-height: 94%;
    object-fit: contain;
    transform-origin: center center;
    transition: transform 16ms linear;
    will-change: transform;
    pointer-events: none;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12));
  }

  .barcode-overlay-sheet {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #FFFFFF;
    border: 2px solid #0F172A;
    border-radius: 12px;
    padding: 14px 20px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
    z-index: 20;
    max-width: 90vw;
  }

  .barcode-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 8px;
  }

  .mini-close {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #64748B;
    padding: 2px;
  }

  .barcode-graphic {
    background: #FFFFFF;
    display: flex;
    justify-content: center;
  }

  .register-footer {
    height: 48px;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    color: #475569;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    font-size: 12px;
    z-index: 10;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.seal-icon) {
    color: #059669;
    flex-shrink: 0;
  }

  .proof-note {
    font-weight: 500;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .zoom-btn {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .scale-label {
    min-width: 40px;
    text-align: center;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  .loader-box, .error-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #475569;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #CBD5E1;
    border-top-color: #2F524C;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .secondary-btn {
    background: #0F172A;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    cursor: pointer;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .btn-text, .proof-note {
      display: none;
    }
  }
</style>
