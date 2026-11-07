<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import StatutoryTimelineBar from '../widgets/StatutoryTimelineBar.svelte';
  import {
    X,
    Shield,
    Receipt,
    FileText,
    Trash2,
    Calendar,
    ExternalLink,
    Lock
  } from 'lucide-svelte';

  let item = $derived(walletStore.selectedItem);

  let gobdDigest = $derived(item?.receiptSha256 || 'None (No physical receipt attached)');
</script>

{#if walletStore.isDrawerOpen && item}
  <div
    class="drawer-backdrop"
    onclick={() => walletStore.closeDrawer()}
    role="presentation"
  >
    <div
      class="drawer-panel"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-item-title"
    >
      <div class="drawer-header">
        <div class="header-left">
          <span class="category-pill">{item.category}</span>
          <h2 id="drawer-item-title" class="drawer-title">{item.title}</h2>
        </div>
        <button
          type="button"
          class="close-btn"
          onclick={() => walletStore.closeDrawer()}
          aria-label="Close drawer"
        >
          <X size={20} />
        </button>
      </div>

      <div class="drawer-body">
        <!-- Overview Card -->
        <div class="detail-card">
          <div class="row">
            <span class="label">Merchant / Provider</span>
            <span class="val">{item.merchantOrProvider}</span>
          </div>
          <div class="row">
            <span class="label">Gross Amount</span>
            <span class="val price">€{item.priceGrossEur.toFixed(2)}</span>
          </div>
          <div class="row">
            <span class="label">Purchase Date</span>
            <span class="val">{item.purchaseDate}</span>
          </div>
          <div class="row">
            <span class="label">Status</span>
            <span class="val status-badge">{item.status}</span>
          </div>
          {#if item.cancellationUrl}
            <div class="row">
              <span class="label">§ 312k Cancellation</span>
              <a
                href={item.cancellationUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="cancel-link"
              >
                Open Cancellation Page <ExternalLink size={12} />
              </a>
            </div>
          {/if}
        </div>

        <!-- Statutory 24m BGB Timeline Bar -->
        {#if item.category === 'hardware'}
          <div class="timeline-section">
            <h3 class="section-title">BGB Statutory Warranty Timeline</h3>
            <StatutoryTimelineBar {item} />
          </div>
        {/if}

        <!-- GoBD Pre-Encryption SHA-256 Digest Proof -->
        <div class="proof-card">
          <div class="proof-header">
            <Lock size={16} color="#059669" />
            <h4 class="proof-title">GoBD Tamper-Proof Audit Seal</h4>
          </div>
          <p class="proof-desc">
            Pre-encryption SHA-256 hash computed client-side in accordance with GoBD Rn. 108–110.
          </p>
          <code class="hash-display">{gobdDigest}</code>
        </div>

        <!-- Action Buttons -->
        <div class="drawer-actions">
          <button
            type="button"
            class="claim-action-btn"
            onclick={() => {
              walletStore.closeDrawer();
              walletStore.setView('claim', item.id);
            }}
          >
            <FileText size={16} />
            <span>Compile Statutory Notice (BGB T1–T5)</span>
          </button>

          <button
            type="button"
            class="delete-action-btn"
            onclick={() => {
              if (confirm('Delete this item from your local encrypted vault?')) {
                walletStore.deleteItem(item.id);
              }
            }}
          >
            <Trash2 size={16} />
            <span>Delete Item</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    z-index: var(--z-index-drawer, 400);
    display: flex;
    justify-content: flex-end;
  }

  .drawer-panel {
    width: 100%;
    max-width: 520px;
    height: 100%;
    background: #FFFFFF;
    box-shadow: -10px 0 25px -5px rgba(15, 23, 42, 0.2);
    display: flex;
    flex-direction: column;
    animation: slideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @media (max-width: 768px) {
    .drawer-backdrop {
      align-items: flex-end;
    }
    .drawer-panel {
      max-width: 100%;
      height: 85vh;
      border-radius: var(--radius-xl, 28px) var(--radius-xl, 28px) 0 0;
      animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-4, 16px) var(--space-6, 24px);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .category-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
  }

  .drawer-title {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-ink-tertiary, #94A3B8);
    padding: 4px;
    border-radius: 6px;
  }

  .close-btn:hover {
    color: var(--color-ink-primary, #0F172A);
    background: #F1F5F9;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .detail-card {
    background: var(--color-surface-subtle, #F8FAFC);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 12px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-sm, 14px);
  }

  .label {
    color: var(--color-ink-secondary, #475569);
  }

  .val {
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .price {
    font-size: var(--font-size-base, 16px);
    color: var(--color-pine-teal, #2F524C);
  }

  .status-badge {
    padding: 2px 8px;
    border-radius: 4px;
    background: #DCFCE7;
    color: #065F46;
    font-size: 12px;
  }

  .cancel-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-terracotta-coral, #D96B4B);
    text-decoration: underline;
  }

  .timeline-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .proof-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 12px);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .proof-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .proof-title {
    margin: 0;
    font-size: var(--font-size-xs, 12px);
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .proof-desc {
    margin: 0;
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
    line-height: 1.4;
  }

  .hash-display {
    font-family: monospace;
    font-size: 10px;
    word-break: break-all;
    background: #F1F5F9;
    padding: 6px 8px;
    border-radius: 4px;
    color: var(--color-ink-primary, #0F172A);
  }

  .drawer-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .claim-action-btn {
    height: 44px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .delete-action-btn {
    height: 40px;
    border-radius: var(--radius-md, 12px);
    background: transparent;
    border: 1px solid #CBD5E1;
    color: #DC2626;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }

  .delete-action-btn:hover {
    background: #FEE2E2;
  }
</style>
