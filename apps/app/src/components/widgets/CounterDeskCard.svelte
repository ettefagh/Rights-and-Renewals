<script lang="ts">
  import {
    copyToClipboardSafe,
    generateBarcodeSvg,
    type WalletItem
  } from '@cmlab/core';
  import { formatFriendlyDate } from '../../utils/dateFormatters';
  import {
    Copy,
    Check,
    Scan,
    Receipt,
    ShieldCheck,
    AlertTriangle
  } from 'lucide-svelte';

  interface Props {
    item: WalletItem;
    onOpenReceiptZoom: () => void;
  }

  let { item, onOpenReceiptZoom }: Props = $props();

  let copied = $state(false);

  let serial = $derived(item.serialNumber || 'Not set (tap Edit to add)');
  let hasSerial = $derived(!!item.serialNumber && item.serialNumber.trim().length > 0);

  let barcodeValue = $derived(item.barcodeValue || item.serialNumber || '');
  let barcodeSvg = $derived(
    barcodeValue ? generateBarcodeSvg(barcodeValue, { height: 50, moduleWidth: 1.8 }) : null
  );

  let proofStatus = $derived.by(() => {
    if (!item.purchaseDate) return { isWithin12m: false, label: 'Unknown' };
    const purchase = new Date(item.purchaseDate).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - purchase) / (1000 * 60 * 60 * 24));
    const isWithin12m = diffDays <= 365;
    return {
      isWithin12m,
      diffDays,
      label: isWithin12m
        ? 'Easy-Claim Period Active* (First 12 Months)'
        : '2-Year Defect Protection* (Months 13–24)'
    };
  });

  async function handleCopySerial() {
    if (!hasSerial) return;
    await copyToClipboardSafe(item.serialNumber!);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="counter-desk-card">
  <div class="desk-card-header">
    <div class="header-left">
      <span class="desk-badge">In-Store Return Pass</span>
      <h3 class="desk-title">Serial &amp; Checkout Barcode</h3>
    </div>
    {#if item.hasProofOfPurchase}
      <button
        type="button"
        class="receipt-quick-btn"
        onclick={onOpenReceiptZoom}
        aria-label="Open full-screen receipt"
      >
        <Receipt size={16} />
        <span>Full-Screen Receipt</span>
      </button>
    {/if}
  </div>

  <!-- High-Contrast Serial Monospace Display -->
  <div class="serial-strip">
    <div class="serial-meta">
      <span class="serial-label">Serial Number (S/N · IMEI · E-Nr.)</span>
      <span class="serial-code" class:empty={!hasSerial}>{serial}</span>
    </div>
    {#if hasSerial}
      <button
        type="button"
        class="copy-serial-btn"
        class:copied
        onclick={handleCopySerial}
        aria-label="Copy serial number"
        title="1-Tap Copy"
      >
        {#if copied}
          <Check size={18} class="check-icon" />
          <span class="btn-caption">Copied!</span>
        {:else}
          <Copy size={18} />
          <span class="btn-caption">Copy</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Inline Scannable Barcode for Handheld Scanners -->
  {#if barcodeSvg}
    <div class="barcode-desk-section">
      <div class="barcode-meta">
        <Scan size={14} class="barcode-icon" />
        <span class="barcode-label">Store Scanner Barcode (Code 128)</span>
      </div>
      <div class="barcode-svg-box">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html barcodeSvg}
      </div>
    </div>
  {/if}

  <!-- Friendly Warranty Status Footer -->
  <div class="statutory-proof-footer" class:favorable={proofStatus.isWithin12m}>
    {#if proofStatus.isWithin12m}
      <ShieldCheck size={16} class="proof-icon green" />
    {:else}
      <AlertTriangle size={16} class="proof-icon amber" />
    {/if}
    <div class="proof-text-cluster">
      <span class="proof-title">{proofStatus.label}</span>
      <span class="proof-sub">
        Purchased {formatFriendlyDate(item.purchaseDate, 'long')} at {item.merchantOrProvider}
      </span>
    </div>
  </div>
</div>

<style>
  .counter-desk-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 16px);
    padding: var(--space-4, 16px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
  }

  .desk-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .desk-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-pine-teal, #2F524C);
    background: rgba(47, 82, 76, 0.08);
    padding: 2px 8px;
    border-radius: 9999px;
    margin-bottom: 2px;
  }

  .desk-title {
    margin: 0;
    font-size: var(--font-size-base, 15px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .receipt-quick-btn {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-md, 8px);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 100ms ease, background-color 100ms ease;
    min-height: 38px;
  }

  .receipt-quick-btn:hover {
    background: #233F3A;
    transform: translateY(-1px);
  }

  .receipt-quick-btn:active {
    transform: scale(0.96);
  }

  .serial-strip {
    background: var(--color-surface-muted, #F8FAFC);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 8px);
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .serial-meta {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .serial-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-secondary, #64748B);
    text-transform: uppercase;
  }

  .serial-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
    letter-spacing: 0.06em;
    word-break: break-all;
  }

  .serial-code.empty {
    font-size: 13px;
    color: #94A3B8;
    font-weight: 500;
  }

  .copy-serial-btn {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    transition: all 120ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    min-height: 40px;
  }

  .copy-serial-btn:hover {
    border-color: #94A3B8;
    background: #F1F5F9;
  }

  .copy-serial-btn:active {
    transform: scale(0.94);
  }

  .copy-serial-btn.copied {
    background: #DCFCE7;
    border-color: #86EFAC;
    color: #166534;
  }

  .btn-caption {
    font-size: 12px;
  }

  .barcode-desk-section {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .barcode-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
    width: 100%;
  }

  .barcode-svg-box {
    width: 100%;
    overflow-x: auto;
    display: flex;
    justify-content: center;
    padding: 4px 0;
  }

  .statutory-proof-footer {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: var(--radius-sm, 6px);
    padding: 10px 12px;
  }

  .statutory-proof-footer.favorable {
    background: #F0FDF4;
    border-color: #BBF7D0;
  }

  :global(.proof-icon) {
    flex-shrink: 0;
    margin-top: 2px;
  }

  :global(.proof-icon.green) {
    color: #16A34A;
  }

  :global(.proof-icon.amber) {
    color: #D97706;
  }

  .proof-text-cluster {
    display: flex;
    flex-direction: column;
  }

  .proof-title {
    font-size: 12px;
    font-weight: 700;
    color: #0F172A;
  }

  .proof-sub {
    font-size: 11px;
    color: #475569;
    margin-top: 2px;
    line-height: 1.3;
  }
</style>
