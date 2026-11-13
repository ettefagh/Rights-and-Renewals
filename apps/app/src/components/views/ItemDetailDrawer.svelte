<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import type { BillingCycle, PaymentMethodType, WalletItem } from '@cmlab/core';
  import {
    CONCURRENCY_BADGE_LABEL,
    CONCURRENCY_SHORT_SUFFIX,
    formatFriendlyDate,
    formatRelativeRemaining,
    getSubscriptionConcurrency
  } from '../../utils/dateFormatters';
  import StatutoryTimelineBar from '../widgets/StatutoryTimelineBar.svelte';
  import CounterDeskCard from '../widgets/CounterDeskCard.svelte';
  import SubscriptionPlanPanel from './SubscriptionPlanPanel.svelte';
  import {
    X,
    FileText,
    Trash2,
    ExternalLink,
    CheckCircle2,
    ShieldAlert,
    Pencil,
    Check
  } from 'lucide-svelte';

  let item = $derived(walletStore.selectedItem);
  let subMeta = $derived(item ? getSubscriptionConcurrency(item) : null);

  let categoryOverride = $state<'hardware' | 'subscription' | null>(null);
  let activeEditCategory = $derived(
    categoryOverride ?? (item?.category === 'subscription' ? 'subscription' : 'hardware')
  );
  let isSaving = $state(false);
  let editingPlanId = $state<string | undefined>(undefined);

  function startEditMode(targetItem: WalletItem) {
    categoryOverride = targetItem.category === 'subscription' ? 'subscription' : 'hardware';
    editingPlanId = targetItem.policyPlanId;
    walletStore.isEditingDrawer = true;
  }

  function cancelEditMode() {
    categoryOverride = null;
    walletStore.isEditingDrawer = false;
  }

  async function handleSaveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!item || isSaving) return;

    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);

    const rawTitle = String(data.get('title') ?? '').trim();
    if (!rawTitle) return;

    const rawMerchant = String(data.get('merchantOrProvider') ?? '').trim() || 'Unknown';
    const rawPrice = Number.parseFloat(String(data.get('priceGrossEur') ?? '0'));
    const safePrice = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const rawPurchaseDate = String(data.get('purchaseDate') ?? '').trim();
    const rawExpiryDate = String(data.get('expiryDate') ?? '').trim();
    const rawSerial = String(data.get('serialNumber') ?? '').trim();
    const rawBarcode = String(data.get('barcodeValue') ?? '').trim();
    const rawCancelUrl = String(data.get('cancellationUrl') ?? '').trim();
    const rawNotes = String(data.get('notes') ?? '').trim();
    const rawBillingCycle = (String(data.get('billingCycle') ?? 'monthly') as BillingCycle);
    const rawPaymentType = (String(data.get('paymentType') ?? 'auto_pay') as PaymentMethodType);
    const isTaxDeductible = data.get('isTaxDeductible') === 'on';

    isSaving = true;
    try {
      await walletStore.updateItem(item.id, {
        title: rawTitle,
        category: activeEditCategory,
        merchantOrProvider: rawMerchant,
        billingCycle: activeEditCategory === 'subscription' ? rawBillingCycle : undefined,
        paymentType: activeEditCategory === 'subscription' ? rawPaymentType : undefined,
        policyPlanId: activeEditCategory === 'subscription' ? editingPlanId : undefined,
        priceGrossEur: activeEditCategory === 'subscription' ? safePrice : item.priceGrossEur,
        purchaseDate: rawPurchaseDate || item.purchaseDate,
        expiryDate: rawExpiryDate || item.expiryDate,
        serialNumber: rawSerial || undefined,
        barcodeValue: rawBarcode || rawSerial || undefined,
        cancellationUrl: rawCancelUrl || undefined,
        notes: rawNotes || undefined,
        isTaxDeductible
      });
      categoryOverride = null;
    } finally {
      isSaving = false;
    }
  }
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
      onkeydown={(e) => e.key === 'Escape' && walletStore.closeDrawer()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-item-title"
      tabindex="-1"
    >
      <div class="drawer-header">
        <div class="header-left">
          <span class="category-pill" class:sub={item.category === 'subscription'}>
            {item.category === 'subscription' ? 'Sub' : 'Warranty'}
          </span>
          <h2 id="drawer-item-title" class="drawer-title">{item.title}</h2>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="edit-toggle-btn"
            class:active={walletStore.isEditingDrawer}
            onclick={() => {
              if (walletStore.isEditingDrawer) {
                cancelEditMode();
              } else {
                startEditMode(item);
              }
            }}
            aria-label="Edit entry"
          >
            <Pencil size={15} />
            <span>{walletStore.isEditingDrawer ? 'Viewing' : 'Edit'}</span>
          </button>
          <button
            type="button"
            class="close-btn"
            onclick={() => walletStore.closeDrawer()}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div class="drawer-body">
        {#if walletStore.isEditingDrawer}
          {#key item.id}
            <form class="edit-entry-form" onsubmit={handleSaveEdit}>
              <div class="form-section-header">
                <h3 class="edit-heading">Edit Entry Details</h3>
                <span class="edit-sub">Changes update your local encrypted vault immediately.</span>
              </div>

              <div class="field-group">
                <span class="field-label">Entry Type</span>
                <div class="segmented-type-row">
                  <button
                    type="button"
                    class="type-seg-btn"
                    class:selected={activeEditCategory === 'subscription'}
                    onclick={() => (categoryOverride = 'subscription')}
                  >
                    🔄 Sub
                  </button>
                  <button
                    type="button"
                    class="type-seg-btn"
                    class:selected={activeEditCategory === 'hardware'}
                    onclick={() => (categoryOverride = 'hardware')}
                  >
                    🛡️ Warranty
                  </button>
                </div>
              </div>

              <label class="field-group">
                <span class="field-label">Name / Title</span>
                <input
                  type="text"
                  name="title"
                  class="field-input"
                  value={item.title}
                  required
                  placeholder="e.g. Spotify Student or Apple MacBook Pro"
                />
              </label>

              <label class="field-group">
                <span class="field-label">
                  {activeEditCategory === 'subscription' ? 'Provider' : 'Store / Brand'}
                </span>
                <input
                  type="text"
                  name="merchantOrProvider"
                  class="field-input"
                  value={item.merchantOrProvider}
                  placeholder="e.g. Spotify AB or Apple Store"
                />
              </label>

              {#if activeEditCategory === 'subscription'}
                <div class="two-col-fields">
                  <label class="field-group">
                    <span class="field-label">Billing Frequency</span>
                    <select
                      name="billingCycle"
                      class="field-input"
                      value={subMeta ?? 'monthly'}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>

                  <label class="field-group">
                    <span class="field-label">Payment Method</span>
                    <select
                      name="paymentType"
                      class="field-input"
                      value={item.paymentType || 'auto_pay'}
                    >
                      <option value="auto_pay">● Auto-Pay (Direct Debit / Card)</option>
                      <option value="invoice">Invoice Due (Manual Transfer)</option>
                    </select>
                  </label>
                </div>

                <div class="two-col-fields">
                  <label class="field-group">
                    <span class="field-label">Recurring Price (€)</span>
                    <input
                      type="number"
                      name="priceGrossEur"
                      step="0.01"
                      min="0"
                      class="field-input"
                      value={item.priceGrossEur}
                    />
                  </label>

                  <label class="field-group">
                    <span class="field-label">Next Renewal Date</span>
                    <input
                      type="date"
                      name="expiryDate"
                      class="field-input"
                      value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                    />
                  </label>
                </div>

                <label class="field-group">
                  <span class="field-label">Official 1-Click Cancel Link** (URL)</span>
                  <input
                    type="url"
                    name="cancellationUrl"
                    class="field-input"
                    value={item.cancellationUrl || ''}
                    placeholder="https://..."
                  />
                </label>
                <SubscriptionPlanPanel bind:planId={editingPlanId} lookupEnabled={false} />
              {:else}
                <div class="two-col-fields">
                  <label class="field-group">
                    <span class="field-label">Purchase Date</span>
                    <input
                      type="date"
                      name="purchaseDate"
                      class="field-input"
                      value={item.purchaseDate ? item.purchaseDate.slice(0, 10) : ''}
                    />
                  </label>

                  <label class="field-group">
                    <span class="field-label">Warranty End Date</span>
                    <input
                      type="date"
                      name="expiryDate"
                      class="field-input"
                      value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                    />
                  </label>
                </div>

                <div class="two-col-fields">
                  <label class="field-group">
                    <span class="field-label">Serial Number (S/N · IMEI)</span>
                    <input
                      type="text"
                      name="serialNumber"
                      class="field-input"
                      value={item.serialNumber || ''}
                      placeholder="e.g. C02X9481Q6L4"
                    />
                  </label>

                  <label class="field-group">
                    <span class="field-label">Store Barcode Value</span>
                    <input
                      type="text"
                      name="barcodeValue"
                      class="field-input"
                      value={item.barcodeValue || ''}
                      placeholder="Optional receipt code"
                    />
                  </label>
                </div>
              {/if}

              <label class="field-group">
                <span class="field-label">Notes</span>
                <textarea
                  name="notes"
                  class="field-input field-textarea"
                  rows="2"
                  value={item.notes || ''}
                  placeholder="Optional contract number, care notes, or support details..."
                ></textarea>
              </label>

              <label class="tax-checkbox-row">
                <input
                  type="checkbox"
                  name="isTaxDeductible"
                  checked={Boolean(item.isTaxDeductible)}
                />
                <span>Include in Annual Tax Export (Work / Study Expense)</span>
              </label>

              <div class="edit-form-actions">
                <button
                  type="button"
                  class="cancel-edit-btn"
                  onclick={cancelEditMode}
                >
                  Cancel
                </button>
                <button type="submit" class="save-edit-btn" disabled={isSaving}>
                  <Check size={16} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          {/key}
        {:else}
          {#if item.category === 'hardware'}
            <CounterDeskCard
              {item}
              onOpenReceiptZoom={() => walletStore.openReceiptZoom(item)}
            />
          {/if}

          {#if item.category === 'subscription'}
            {#if item.policyPlanId}
              <SubscriptionPlanPanel planId={item.policyPlanId} editable={false} />
            {/if}
            <div class="cancellation-prompt-card">
              <div class="cancel-prompt-header">
                <ShieldAlert size={16} class="text-pine" />
                <span class="cancel-prompt-title">Cancellation options**</span>
              </div>
              <p class="cancel-prompt-desc">
                Cancel directly via the provider's official cancellation page without dark patterns, or generate a ready-to-send cancellation notice.
              </p>
              <button
                type="button"
                class="open-cancel-assistant-btn"
                onclick={() => walletStore.openCancellationModal(item)}
              >
                <ExternalLink size={16} />
                <span>Open 1-Click Cancel Assistant**</span>
              </button>
            </div>
          {/if}

          <div class="detail-card">
            <div class="row">
              <span class="label">
                {item.category === 'subscription' ? 'Provider' : 'Store / Brand'}
              </span>
              <span class="val">{item.merchantOrProvider}</span>
            </div>

            {#if item.category === 'subscription' && subMeta}
              <div class="row">
                <span class="label">Payment Method</span>
                <span
                  class="payment-indicator-pill"
                  class:invoice={item.paymentType === 'invoice'}
                >
                  <span class="pulse-dot"></span>
                  {item.paymentType === 'invoice' ? 'Invoice' : 'Auto-Pay'}
                </span>
              </div>
              <div class="row">
                <span class="label">Billing Rate ({CONCURRENCY_BADGE_LABEL[subMeta]})</span>
                <span class="val price">
                  €{item.priceGrossEur.toFixed(2)} <small>{CONCURRENCY_SHORT_SUFFIX[subMeta]}</small>
                </span>
              </div>
              <div class="row">
                <span class="label">Next renewal</span>
                <span class="val">
                  {formatFriendlyDate(item.expiryDate, 'long')}
                  <span class="rel-tag">({formatRelativeRemaining(item.expiryDate, 'renewal').label})</span>
                </span>
              </div>
            {:else}
              <div class="row">
                <span class="label">Purchased On</span>
                <span class="val">{formatFriendlyDate(item.purchaseDate, 'long')}</span>
              </div>
              <div class="row">
                <span class="label">Warranty Valid Until*</span>
                <span class="val">
                  {formatFriendlyDate(item.expiryDate, 'long')}
                  <span class="rel-tag">({formatRelativeRemaining(item.expiryDate, 'warranty').label})</span>
                </span>
              </div>
            {/if}

            {#if item.notes}
              <div class="row notes-row">
                <span class="label">Notes</span>
                <span class="val notes-val">{item.notes}</span>
              </div>
            {/if}

            {#if item.cancellationUrl}
              <div class="row">
                <span class="label">Direct Cancel Page**</span>
                <a
                  href={item.cancellationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="cancel-link"
                >
                  Open Provider Page <ExternalLink size={12} />
                </a>
              </div>
            {/if}
          </div>

          {#if item.category === 'hardware'}
            <div class="timeline-section">
              <h3 class="section-title">Timeline</h3>
              <StatutoryTimelineBar {item} />
            </div>
          {/if}

          {#if item.hasProofOfPurchase || item.receiptSha256}
            <div class="verified-receipt-card">
              <div class="verified-top">
                <div class="verified-badge-cluster">
                  <CheckCircle2 size={16} class="verified-icon" aria-hidden="true" />
                  <span class="verified-title">Receipt saved on this device</span>
                </div>
                {#if item.receiptSha256}
                  <details class="audit-details">
                    <summary>Audit ID</summary>
                    <code class="hash-display">{item.receiptSha256}</code>
                  </details>
                {/if}
              </div>
              <span class="verified-caption">
                {item.receiptSha256
                  ? 'Receipt fingerprint stored locally.'
                  : 'Receipt details stored locally.'}
              </span>
            </div>
          {/if}

          <div class="drawer-actions">
            <button
              type="button"
              class="edit-primary-btn"
              onclick={() => startEditMode(item)}
            >
              <Pencil size={16} />
              <span>Edit Entry Details</span>
            </button>

            <button
              type="button"
              class="claim-action-btn"
              onclick={() => {
                walletStore.closeDrawer();
                walletStore.setView('claim', item.id);
              }}
            >
              <FileText size={16} />
              <span>
                {item.category === 'subscription'
                  ? 'Generate Formal Cancellation Letter**'
                  : 'Create Official Warranty Claim*'}
              </span>
            </button>

            <button
              type="button"
              class="delete-action-btn"
              onclick={() => {
                if (confirm('Delete this entry from your local vault?')) {
                  walletStore.deleteItem(item.id);
                }
              }}
            >
              <Trash2 size={16} />
              <span>Delete Entry</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    z-index: var(--z-index-drawer, 400);
    display: flex;
    justify-content: flex-end;
  }

  .drawer-panel {
    width: 100%;
    max-width: 520px;
    height: 100%;
    background: var(--color-card-white, #FFFFFF);
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
      height: 88vh;
      border-radius: var(--radius-xl, 28px) var(--radius-xl, 28px) 0 0;
      animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-4, 16px) var(--space-6, 24px);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    gap: 12px;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .category-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    padding: 2px 8px;
    border-radius: 999px;
    width: fit-content;
  }

  .category-pill.sub {
    color: #9A3412;
    background: #FFEDD5;
  }

  .drawer-title {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .edit-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .edit-toggle-btn:hover,
  .edit-toggle-btn.active {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border-color: var(--color-pine-teal, #2F524C);
  }

  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-ink-tertiary, #94A3B8);
    min-width: 48px;
    min-height: 48px;
    padding: 12px;
    border-radius: 6px;
  }

  .close-btn:hover {
    color: var(--color-ink-primary, #0F172A);
    background: #F1F5F9;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5, 20px) var(--space-6, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  /* Edit Form Styles */
  .edit-entry-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-section-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .edit-heading {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .edit-sub {
    font-size: 12px;
    color: var(--color-ink-secondary, #64748B);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary, #475569);
  }

  .field-input {
    min-height: 48px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    background: #FFFFFF;
    font-size: 14px;
    color: var(--color-ink-primary, #0F172A);
    font-family: inherit;
  }

  .field-textarea {
    height: auto;
    padding: 8px 12px;
    resize: vertical;
  }

  .two-col-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .segmented-type-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .type-seg-btn {
    min-height: 48px;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: #F8FAFC;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
  }

  .type-seg-btn.selected {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border-color: var(--color-pine-teal, #2F524C);
  }

  .tax-checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--color-ink-secondary, #475569);
    cursor: pointer;
    padding: 4px 0;
  }

  .edit-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid #E2E8F0;
  }

  .cancel-edit-btn {
    height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid #CBD5E1;
    background: transparent;
    font-weight: 600;
    font-size: 13px;
    color: #475569;
    cursor: pointer;
  }

  .save-edit-btn {
    height: 40px;
    padding: 0 18px;
    border-radius: 8px;
    border: none;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    font-weight: 700;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  /* View Mode Styles */
  .detail-card {
    background: var(--color-surface-subtle, #F8FAFC);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 14px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-sm, 14px);
    gap: 12px;
  }

  .notes-row {
    align-items: flex-start;
  }

  .notes-val {
    text-align: right;
    font-weight: 500;
    max-width: 65%;
  }

  .label {
    color: var(--color-ink-secondary, #475569);
  }

  .val {
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .rel-tag {
    font-size: 12px;
    font-weight: 500;
    color: #64748B;
    margin-left: 4px;
  }

  .price {
    font-size: var(--font-size-base, 16px);
    color: var(--color-pine-teal, #2F524C);
  }

  .payment-indicator-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #FFF7ED;
    color: #C2410C;
    border: 1px solid #FED7AA;
  }

  .payment-indicator-pill.invoice {
    background: #FEFCE8;
    color: #A16207;
    border-color: #FEF08A;
  }

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .cancel-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
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

  .verified-receipt-card {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .verified-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .verified-badge-cluster {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #166534;
  }

  .verified-title {
    font-size: 12px;
    font-weight: 700;
  }

  .verified-caption {
    font-size: 11px;
    color: #15803D;
  }

  .audit-details {
    font-size: 11px;
    color: #475569;
    cursor: pointer;
  }

  .hash-display {
    display: block;
    margin-top: 4px;
    font-family: monospace;
    font-size: 10px;
    word-break: break-all;
    background: #FFFFFF;
    padding: 4px 6px;
    border-radius: 4px;
    color: #0F172A;
  }

  .drawer-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .edit-primary-btn {
    min-height: 48px;
    border-radius: var(--radius-md, 12px);
    background: #F1F5F9;
    color: var(--color-ink-primary, #0F172A);
    border: 1px solid #CBD5E1;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .edit-primary-btn:hover {
    background: #E2E8F0;
  }

  .claim-action-btn {
    min-height: 48px;
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
    min-height: 48px;
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

  .cancellation-prompt-card {
    background: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%);
    border: 1px solid #BBF7D0;
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 12px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cancel-prompt-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cancel-prompt-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .cancel-prompt-desc {
    margin: 0;
    font-size: 11px;
    color: #475569;
    line-height: 1.35;
  }

  .open-cancel-assistant-btn {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 100ms ease;
    min-height: 38px;
  }

  .open-cancel-assistant-btn:hover {
    background: #233F3A;
  }
</style>
