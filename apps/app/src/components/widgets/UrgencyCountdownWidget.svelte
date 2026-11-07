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
    font-size: var(--font-size-xs, 12px);
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
    background: #FEE2E2;
    color: #991B1B;
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
    background: #FFFFFF;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .urgent-item-row:hover {
    border-color: var(--color-pine-teal, #2F524C);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .item-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .item-name {
    font-size: var(--font-size-sm, 14px);
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .item-merchant {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
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
    background: #FEF3C7;
    color: #92400E;
  }

  .countdown-badge.critical {
    background: #FEE2E2;
    color: #991B1B;
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
