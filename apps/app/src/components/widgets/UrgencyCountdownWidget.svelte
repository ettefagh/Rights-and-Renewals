<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { copyToClipboardSafe } from '@cmlab/core';
  import {
    AlertTriangle,
    ChevronRight,
    ShieldCheck,
    ExternalLink,
    Receipt,
    Copy,
    Check
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
        <AlertTriangle size={18} class="text-urgent" />
        <h3 class="card-title">Urgent Attention Required (&le;30d)</h3>
      {:else}
        <ShieldCheck size={18} class="text-protected" />
        <h3 class="card-title">All Vault Contracts Protected</h3>
      {/if}
    </div>
    {#if walletStore.urgentItems.length > 0}
      <span class="capital-badge">
        €{walletStore.capitalAtRisk.toFixed(2)} at risk
      </span>
    {/if}
  </div>

  {#if walletStore.urgentItems.length > 0}
    <div class="urgent-items-list">
      {#each walletStore.urgentItems as item (item.id)}
        {@const days = walletStore.computeDaysRemaining(item.expiryDate)}
        <div
          class="urgent-item-row"
          onclick={() => walletStore.selectItem(item)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && walletStore.selectItem(item)}
        >
          <div class="item-meta">
            <span class="item-name">{item.title}</span>
            <span class="item-merchant">{item.merchantOrProvider} • €{item.priceGrossEur.toFixed(2)}</span>
          </div>

          <div class="item-right-cluster">
            <!-- 1-Tap Daily Life Quick Actions -->
            <div class="quick-actions-strip">
              {#if item.category === 'subscription'}
                <button
                  type="button"
                  class="quick-action-btn cancel"
                  onclick={(e) => {
                    e.stopPropagation();
                    walletStore.openCancellationModal(item);
                  }}
                  aria-label={`§ 312k Kündigungsassistent für ${item.title}`}
                  title="§ 312k Kündigen"
                >
                  <ExternalLink size={12} />
                  <span>Kündigen</span>
                </button>
              {:else if item.category === 'hardware'}
                {#if item.hasProofOfPurchase}
                  <button
                    type="button"
                    class="quick-action-btn receipt"
                    onclick={(e) => {
                      e.stopPropagation();
                      walletStore.openReceiptZoom(item);
                    }}
                    aria-label={`Kassenbeleg im Vollbild für ${item.title}`}
                    title="Kassenbeleg"
                  >
                    <Receipt size={12} />
                    <span>Beleg</span>
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
                    aria-label={`Seriennummer für ${item.title} kopieren`}
                    title="E-Nr. kopieren"
                  >
                    {#if copiedSerialId === item.id}
                      <Check size={12} class="text-green" />
                      <span>Kopiert</span>
                    {:else}
                      <Copy size={12} />
                      <span>E-Nr.</span>
                    {/if}
                  </button>
                {/if}
              {/if}
            </div>

            <div class="item-urgency">
              <span class="countdown-badge" class:critical={days <= 7}>
                {days <= 0 ? 'Expires today' : `${days}d left`}
              </span>
              <ChevronRight size={16} class="chevron" />
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-state-text">
      No statutory deadlines or subscription renewals due in the next 30 days.
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

  .card-title {
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  :global(.text-urgent) {
    color: var(--color-urgent-red, #DC2626);
  }

  :global(.text-protected) {
    color: var(--color-protected-green, #059669);
  }

  .capital-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
    background: var(--color-status-urgent-bg);
    color: var(--color-status-urgent-text);
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
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-card-white);
    cursor: pointer;
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 150ms ease, box-shadow 180ms ease;
    gap: 12px;
  }

  .urgent-item-row:hover {
    border-color: var(--color-pine-teal);
    transform: translateY(-2px);
    box-shadow: var(--elevation-md);
  }

  .urgent-item-row:active {
    transform: scale(0.98) translateY(1px);
  }

  .item-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-ink-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-merchant {
    font-size: var(--font-size-xs);
    color: var(--color-ink-secondary);
  }

  .item-right-cluster {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .quick-actions-strip {
    display: flex;
    align-items: center;
    gap: 6px;
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

  .quick-action-btn:active {
    transform: scale(0.94);
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

  .quick-action-btn.receipt:hover {
    background: rgba(47, 82, 76, 0.18);
  }

  .quick-action-btn.copy {
    background: var(--color-surface-muted, #F1F5F9);
    border-color: var(--color-border-subtle, #CBD5E1);
    color: var(--color-ink-primary, #0F172A);
  }

  .quick-action-btn.copy:hover {
    background: #E2E8F0;
  }

  .quick-action-btn.copy.copied {
    background: #DCFCE7;
    border-color: #86EFAC;
    color: #166534;
  }

  .item-urgency {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .countdown-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--color-status-warning-bg);
    color: var(--color-status-warning-text);
  }

  .countdown-badge.critical {
    background: var(--color-status-urgent-bg);
    color: var(--color-status-urgent-text);
  }

  :global(.chevron) {
    color: var(--color-ink-tertiary, #94A3B8);
  }

  :global(.text-green) {
    color: #16A34A;
  }

  .empty-state-text {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-ink-secondary, #475569);
    margin: 0;
    padding: 12px 0;
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
