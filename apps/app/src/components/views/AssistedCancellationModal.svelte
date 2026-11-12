<script lang="ts">
  import {
    copyToClipboardSafe,
    LEXFOX_SAFE_HARBOR_DE,
    type WalletItem
  } from '@cmlab/core';
  import { walletStore } from '../../state/wallet.svelte';
  import { formatFriendlyDate } from '../../utils/dateFormatters';
  import {
    X,
    ExternalLink,
    Copy,
    Check,
    ShieldAlert,
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2
  } from 'lucide-svelte';

  interface Props {
    item: WalletItem;
    onClose: () => void;
  }

  let { item, onClose }: Props = $props();

  let copiedToken = $state(false);
  let handoffInitiated = $state(false);
  let cancellationSaved = $state(false);

  let tokenToCopy = $derived.by(() => {
    if (item.notes && item.notes.trim().length > 0) return item.notes.trim();
    if (item.serialNumber && item.serialNumber.trim().length > 0) return item.serialNumber.trim();
    return `Contract ${item.title}`;
  });

  let effectiveCancellationUrl = $derived.by(() => {
    if (item.cancellationUrl && item.cancellationUrl.startsWith('http')) {
      return item.cancellationUrl;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(item.merchantOrProvider + ' verträge hier kündigen 312k')}`;
  });

  async function handleCopyToken() {
    await copyToClipboardSafe(tokenToCopy);
    copiedToken = true;
    setTimeout(() => {
      copiedToken = false;
    }, 2500);
  }

  async function handleOpenPortal() {
    await copyToClipboardSafe(tokenToCopy);
    copiedToken = true;

    if (typeof window !== 'undefined') {
      window.open(effectiveCancellationUrl, '_blank', 'noopener,noreferrer');
    }

    handoffInitiated = true;
  }

  async function confirmCancellationSubmitted() {
    await walletStore.updateItemStatus(item.id, 'cancellation_pending');
    cancellationSaved = true;
    setTimeout(() => {
      onClose();
    }, 1800);
  }

  function routeToFormalNotice() {
    onClose();
    walletStore.setView('claim', item.id);
  }
</script>

<div
  class="cancellation-modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="cancel-modal-title"
>
  <div class="cancellation-card">
    <header class="modal-header">
      <div class="header-left">
        <span class="badge-law">1-Click Cancel Assistant**</span>
        <h2 id="cancel-modal-title" class="modal-title">
          Cancel {item.title}
        </h2>
        <p class="modal-sub">
          {item.merchantOrProvider} • Next Renewal: {formatFriendlyDate(item.expiryDate, 'long')}
        </p>
      </div>
      <button
        type="button"
        class="close-btn"
        onclick={onClose}
        aria-label="Close cancellation assistant"
      >
        <X size={20} />
      </button>
    </header>

    <div class="modal-body">
      {#if cancellationSaved}
        <div class="success-banner">
          <CheckCircle2 size={36} class="success-icon" />
          <h3 class="success-title">Cancellation Marked as Submitted</h3>
          <p class="success-desc">
            Status updated to <strong>Cancellation Pending</strong>. We will track the 14-day confirmation window** starting today.
          </p>
        </div>
      {:else}
        <div class="rails-container">
          <!-- RAIL A: 1-Click Web Cancellation -->
          <div class="rail-box rail-a">
            <div class="rail-header">
              <span class="rail-badge fast">Option A (Fastest)</span>
              <h3 class="rail-title">Official 1-Click Cancel Page**</h3>
            </div>
            <p class="rail-desc">
              Opens the provider's mandatory 2-step cancellation page in your browser and copies your reference details to the clipboard automatically.
            </p>

            <div class="token-preview">
              <span class="token-label">Reference / Account Note:</span>
              <div class="token-chip">
                <code>{tokenToCopy}</code>
                <button
                  type="button"
                  class="copy-chip-btn"
                  onclick={handleCopyToken}
                  title="Copy to clipboard"
                >
                  {#if copiedToken}
                    <Check size={14} class="text-green" />
                  {:else}
                    <Copy size={14} />
                  {/if}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="primary-rail-btn"
              onclick={handleOpenPortal}
            >
              <span>Open Official Cancel Page &amp; Copy Info</span>
              <ExternalLink size={16} />
            </button>

            {#if handoffInitiated}
              <div class="post-handoff-prompt">
                <div class="prompt-icon">
                  <Clock size={18} class="text-amber" />
                </div>
                <div class="prompt-content">
                  <h4 class="prompt-title">Did you submit the cancellation on the provider page?</h4>
                  <p class="prompt-text">
                    Confirm below so we can track your confirmation deadline.
                  </p>
                  <div class="prompt-actions">
                    <button
                      type="button"
                      class="confirm-btn"
                      onclick={confirmCancellationSubmitted}
                    >
                      <Check size={14} />
                      <span>Yes, Cancellation Submitted</span>
                    </button>
                    <button
                      type="button"
                      class="subtle-btn"
                      onclick={onClose}
                    >
                      Not yet / Later
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- RAIL B: Written Notice -->
          <div class="rail-box rail-b">
            <div class="rail-header">
              <span class="rail-badge legal">Option B (Written Proof)</span>
              <h3 class="rail-title">Ready-to-Send Cancellation Letter**</h3>
            </div>
            <p class="rail-desc">
              Generates a formal cancellation notice with direct-debit revocation for email or post.
            </p>

            <div class="rail-b-actions">
              <button
                type="button"
                class="secondary-rail-btn"
                onclick={routeToFormalNotice}
              >
                <FileText size={16} />
                <span>Create Standard Cancellation Notice (Monthly Cancel Right**)</span>
              </button>

              <button
                type="button"
                class="alert-rail-btn"
                onclick={routeToFormalNotice}
              >
                <ShieldAlert size={16} />
                <span>No Cancel Button Found? Cancel Immediately**</span>
              </button>
            </div>
          </div>
        </div>

        <div class="safe-harbor-footer">
          <AlertCircle size={14} class="safe-harbor-icon" />
          <p class="safe-harbor-text">
            {LEXFOX_SAFE_HARBOR_DE}
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .cancellation-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    z-index: var(--z-index-modal, 500);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 16px);
  }

  .cancellation-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-xl, 24px);
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-4, 16px) var(--space-5, 20px);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  .badge-law {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-pine-teal, #2F524C);
    background: rgba(47, 82, 76, 0.1);
    padding: 2px 8px;
    border-radius: 9999px;
    margin-bottom: 4px;
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .modal-sub {
    margin: 4px 0 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #64748B);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--color-ink-secondary, #64748B);
    padding: 8px;
    border-radius: var(--radius-sm, 6px);
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--color-surface-muted, #F1F5F9);
    color: var(--color-ink-primary, #0F172A);
  }

  .modal-body {
    padding: var(--space-5, 20px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .rails-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .rail-box {
    border-radius: var(--radius-md, 12px);
    padding: var(--space-4, 16px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  .rail-a {
    background: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%);
    border-color: #BBF7D0;
  }

  .rail-b {
    background: var(--color-surface-muted, #F8FAFC);
    border-color: var(--color-border-subtle, #E2E8F0);
  }

  .rail-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 4px;
  }

  .rail-badge.fast {
    background: #DCFCE7;
    color: #166534;
  }

  .rail-badge.legal {
    background: #E2E8F0;
    color: #334155;
  }

  .rail-title {
    margin: 0;
    font-size: var(--font-size-base, 15px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .rail-desc {
    font-size: var(--font-size-xs, 13px);
    color: var(--color-ink-secondary, #475569);
    margin: 6px 0 12px 0;
    line-height: 1.4;
  }

  .token-preview {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .token-label {
    font-size: 11px;
    color: #64748B;
    font-weight: 600;
  }

  .token-chip {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-chip code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 12px;
    font-weight: 700;
    color: #0F172A;
  }

  .copy-chip-btn {
    background: var(--color-surface-muted, #F1F5F9);
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .primary-rail-btn {
    width: 100%;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-md, 8px);
    padding: 12px 16px;
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-bold, 700);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: transform 100ms ease, background-color 100ms ease;
    min-height: 48px;
  }

  .primary-rail-btn:hover {
    background: #233F3A;
    transform: translateY(-1px);
  }

  .post-handoff-prompt {
    margin-top: 14px;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: var(--radius-md, 8px);
    padding: 12px;
    display: flex;
    gap: 10px;
  }

  :global(.text-amber) {
    color: #D97706;
  }

  :global(.text-green) {
    color: #16A34A;
  }

  .prompt-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #92400E;
  }

  .prompt-text {
    margin: 4px 0 10px 0;
    font-size: 12px;
    color: #B45309;
    line-height: 1.3;
  }

  .prompt-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .confirm-btn {
    background: #059669;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    min-height: 40px;
  }

  .subtle-btn {
    background: transparent;
    border: 1px solid #D97706;
    color: #92400E;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    min-height: 40px;
  }

  .rail-b-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .secondary-rail-btn,
  .alert-rail-btn {
    width: 100%;
    border-radius: var(--radius-md, 8px);
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    min-height: 44px;
  }

  .secondary-rail-btn {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    color: var(--color-ink-primary, #0F172A);
  }

  .alert-rail-btn {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
  }

  .safe-harbor-footer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--color-surface-muted, #F8FAFC);
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  :global(.safe-harbor-icon) {
    color: #64748B;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .safe-harbor-text {
    margin: 0;
    font-size: 11px;
    color: #64748B;
    line-height: 1.4;
  }

  .success-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-6, 24px) var(--space-4, 16px);
  }

  :global(.success-icon) {
    color: #059669;
    margin-bottom: 12px;
  }

  .success-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .success-desc {
    margin: 0;
    font-size: 13px;
    color: var(--color-ink-secondary, #475569);
    max-width: 440px;
    line-height: 1.4;
  }
</style>
