<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-svelte';
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
          <div class="item-urgency">
            <span class="countdown-badge" class:critical={days <= 7}>
              {days <= 0 ? 'Expires today' : `${days}d left`}
            </span>
            <ChevronRight size={16} class="chevron" />
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
  }

  .item-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  .item-merchant {
    font-size: var(--font-size-xs);
    color: var(--color-ink-secondary);
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

  .empty-state-text {
    font-size: var(--font-size-sm, 14px);
    color: var(--color-ink-secondary, #475569);
    margin: 0;
    padding: 12px 0;
  }
</style>
