<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { copyToClipboardSafe } from '@cmlab/core';
  import {
    CONCURRENCY_SHORT_SUFFIX,
    formatFriendlyDate,
    computeCoverageProgress,
    getSubscriptionConcurrency
  } from '../../utils/dateFormatters';
  import {
    ChevronRight,
    ShieldCheck,
    ExternalLink,
    Receipt,
    Copy,
    Check,
    Pencil
  } from 'lucide-svelte';

  let copiedSerialId = $state<string | null>(null);

  async function handleCopySerialInline(id: string, serial: string) {
    await copyToClipboardSafe(serial);
    copiedSerialId = id;
    setTimeout(() => {
      if (copiedSerialId === id) copiedSerialId = null;
    }, 2000);
  }
</script>

<div class="urgency-radar-card">
  <div class="radar-header">
    <div class="header-cluster">
      {#if walletStore.urgentItems.length > 0}
        <span class="status-dot urgent-pulse" aria-hidden="true"></span>
        <h3 class="card-title">Action Radar (&le;30d)</h3>
      {:else}
        <ShieldCheck size={18} class="text-protected" />
        <h3 class="card-title">No Immediate Deadlines (&le;30d)</h3>
      {/if}
    </div>
    {#if walletStore.urgentItems.length > 0}
      <span class="due-count-badge">
        {walletStore.urgentItems.length} due soon
      </span>
    {/if}
  </div>

  {#if walletStore.urgentItems.length > 0}
    <div class="urgent-items-list">
      {#each walletStore.urgentItems as item (item.id)}
        {@const days = walletStore.computeDaysRemaining(item.expiryDate)}
        {@const isSub = item.category === 'subscription'}
        {@const subMeta = isSub ? getSubscriptionConcurrency(item) : null}
        {@const paymentType = item.paymentType ?? 'auto_pay'}
        {@const cov = !isSub ? computeCoverageProgress(item.purchaseDate, item.expiryDate) : null}
        <div
          class="urgent-item-row"
          onclick={() => walletStore.selectItem(item)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && walletStore.selectItem(item)}
        >
          <div class="item-meta">
            <div class="title-line">
              <span
                class="row-dot"
                class:critical={days <= 7}
                class:warning={days > 7}
                aria-hidden="true"
              ></span>
              <span class="item-name">{item.title}</span>
              {#if isSub && subMeta}
                <span
                  class="payment-chip"
                  class:invoice={paymentType === 'invoice'}
                >
                  ● {paymentType === 'auto_pay' ? 'Auto-Pay' : 'Invoice'}
                </span>
              {/if}
            </div>

            {#if isSub && subMeta}
              <span class="item-merchant">
                {item.merchantOrProvider} • <strong>€{item.priceGrossEur.toFixed(2)}{CONCURRENCY_SHORT_SUFFIX[subMeta]}</strong> • Renews {formatFriendlyDate(item.expiryDate, 'short')}
              </span>
            {:else if cov}
              <div class="warranty-inline-meta">
                <span class="item-merchant">
                  {item.merchantOrProvider} • Until {formatFriendlyDate(item.expiryDate, 'short')}
                </span>
                <div class="mini-progress-track" title={`${cov.pctRemaining}% coverage left`}>
                  <div
                    class="mini-progress-fill"
                    style={`width: ${cov.pctRemaining}%`}
                  ></div>
                </div>
              </div>
            {/if}
          </div>

          <div class="item-right-cluster">
            <div class="quick-actions-strip">
              <button
                type="button"
                class="quick-action-btn edit"
                onclick={(e) => {
                  e.stopPropagation();
                  walletStore.openEditItem(item);
                }}
                aria-label={`Edit ${item.title}`}
                title="Edit entry"
              >
                <Pencil size={12} />
                <span>Edit</span>
              </button>

              {#if isSub}
                <button
                  type="button"
                  class="quick-action-btn cancel"
                  onclick={(e) => {
                    e.stopPropagation();
                    walletStore.openCancellationModal(item);
                  }}
                  aria-label={`1-Click Cancel for ${item.title}`}
                  title="1-Click Cancel**"
                >
                  <ExternalLink size={12} />
                  <span>Cancel**</span>
                </button>
              {:else}
                {#if item.hasProofOfPurchase}
                  <button
                    type="button"
                    class="quick-action-btn receipt"
                    onclick={(e) => {
                      e.stopPropagation();
                      walletStore.openReceiptZoom(item);
                    }}
                    aria-label={`Open receipt for ${item.title}`}
                    title="Full-Screen Receipt"
                  >
                    <Receipt size={12} />
                    <span>Receipt</span>
                  </button>
                {/if}
                {#if item.serialNumber}
                  <button
                    type="button"
                    class="quick-action-btn copy"
                    class:copied={copiedSerialId === item.id}
                    onclick={(e) => {
                      e.stopPropagation();
                      handleCopySerialInline(item.id, item.serialNumber!);
                    }}
                    aria-label={`Copy serial number for ${item.title}`}
                    title="Copy S/N"
                  >
                    {#if copiedSerialId === item.id}
                      <Check size={12} class="text-green" />
                      <span>Copied</span>
                    {:else}
                      <Copy size={12} />
                      <span>S/N</span>
                    {/if}
                  </button>
                {/if}
              {/if}
            </div>

            <div class="item-urgency">
              <span class="countdown-badge" class:critical={days <= 7}>
                {days <= 0 ? 'Due today' : `${days}d left`}
              </span>
              <ChevronRight size={16} class="chevron" />
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-state-text">
      No renewals or warranty expirations due in the next 30 days.
    </p>
  {/if}
</div>

<style>
  .urgency-radar-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
  }

  .radar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3, 12px);
  }

  .header-cluster {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }

  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #DC2626;
    display: inline-block;
  }

  .urgent-pulse {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.18);
  }

  .card-title {
    margin: 0;
    font-size: var(--font-size-base, 15px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  :global(.text-protected) {
    color: var(--color-protected-green, #059669);
  }

  .due-count-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 9999px;
    background: var(--color-status-urgent-bg, #FEE2E2);
    color: var(--color-status-urgent-text, #991B1B);
  }

  .urgent-items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .urgent-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: var(--radius-md, 12px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: var(--color-card-white, #FFFFFF);
    cursor: pointer;
    transition: transform 160ms ease, border-color 150ms ease, box-shadow 160ms ease;
    gap: 12px;
  }

  .urgent-item-row:hover {
    border-color: var(--color-pine-teal, #2F524C);
    transform: translateY(-1px);
    box-shadow: var(--elevation-md);
  }

  .item-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .title-line {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .row-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .row-dot.critical {
    background: #DC2626;
  }

  .row-dot.warning {
    background: #D97706;
  }

  .item-name {
    font-size: var(--font-size-sm, 14px);
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .payment-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 999px;
    background: #FFF7ED;
    color: #C2410C;
    border: 1px solid #FED7AA;
  }

  .payment-chip.invoice {
    background: #FEFCE8;
    color: #A16207;
    border-color: #FEF08A;
  }

  .item-merchant {
    font-size: 12px;
    color: var(--color-ink-secondary, #64748B);
  }

  .warranty-inline-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .mini-progress-track {
    width: 56px;
    height: 5px;
    border-radius: 999px;
    background: #E2E8F0;
    overflow: hidden;
  }

  .mini-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-pine-teal, #2F524C);
  }

  .item-right-cluster {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .quick-actions-strip {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .quick-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 6px);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 100ms ease, background-color 100ms ease;
    border: 1px solid transparent;
    min-height: 28px;
  }

  .quick-action-btn.edit {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #334155;
  }

  .quick-action-btn.edit:hover {
    background: #E2E8F0;
  }

  .quick-action-btn.cancel {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #991B1B;
  }

  .quick-action-btn.cancel:hover {
    background: #FEE2E2;
  }

  .quick-action-btn.receipt {
    background: rgba(47, 82, 76, 0.1);
    border-color: rgba(47, 82, 76, 0.2);
    color: var(--color-pine-teal, #2F524C);
  }

  .quick-action-btn.copy {
    background: var(--color-surface-muted, #F1F5F9);
    border-color: var(--color-border-subtle, #CBD5E1);
    color: var(--color-ink-primary, #0F172A);
  }

  .quick-action-btn.copy.copied {
    background: #DCFCE7;
    border-color: #86EFAC;
    color: #166534;
  }

  .item-urgency {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .countdown-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    background: var(--color-status-warning-bg, #FEF3C7);
    color: var(--color-status-warning-text, #92400E);
  }

  .countdown-badge.critical {
    background: var(--color-status-urgent-bg, #FEE2E2);
    color: var(--color-status-urgent-text, #991B1B);
  }

  :global(.chevron) {
    color: var(--color-ink-tertiary, #94A3B8);
  }

  :global(.text-green) {
    color: #16A34A;
  }

  .empty-state-text {
    font-size: var(--font-size-sm, 13px);
    color: var(--color-ink-secondary, #475569);
    margin: 0;
    padding: 8px 0;
  }

  @media (max-width: 640px) {
    .urgent-item-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .item-right-cluster {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>