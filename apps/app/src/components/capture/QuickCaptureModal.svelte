<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore } from '../../state/wallet.svelte';
  import {
    PrefixTrie,
    getOrCreateMasterKey,
    encryptReceiptBlob,
    computeAlertSchedule,
    type WalletItem,
    type ReceiptVaultBlob,
    type TaxCategory,
    type BillingCycle,
    type PaymentMethodType
  } from '@cmlab/core';
  import {
    Camera,
    Upload,
    Check,
    X,
    Receipt,
    Shield
  } from 'lucide-svelte';
  import SubscriptionPlanPanel from '../views/SubscriptionPlanPanel.svelte';

  let title = $state('');
  let merchant = $state('');
  let category = $state<'hardware' | 'subscription'>('hardware');
  let billingCycle = $state<BillingCycle>('monthly');
  let paymentType = $state<PaymentMethodType>('auto_pay');
  let priceStr = $state('');
  let serialNumber = $state('');
  let purchaseDate = $state(new Date().toISOString().split('T')[0]!);
  let isTaxDeductible = $state(false);
  let taxCategory = $state<TaxCategory>('arbeitsmittel');
  let beruflicheNutzungProzent = $state(100);
  let cancellationUrl = $state('');
  let policyPlanId = $state<string | undefined>(undefined);

  // Receipt processing state
  let receiptFile = $state<File | null>(null);
  let receiptPreviewUrl = $state<string | null>(null);
  let compressedBytes = $state<Uint8Array | null>(null);
  let receiptSha256 = $state<string>('');
  let isCompressing = $state(false);
  let isSaving = $state(false);
  let errorMessage = $state('');

  // PrefixTrie autocomplete
  let trie = new PrefixTrie();
  let brandSuggestions = $state<string[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/data/policy_wiki_seed_v1.json');
      if (res.ok) {
        const data = await res.json();
        const brands = Array.isArray(data) ? data : data.brands || [];
        for (const b of brands) {
          if (b.brandName) trie.insert(b.brandName.toLowerCase(), b.brandName);
        }
      }
    } catch {
      // offline fallback
    }
  });

  function handleMerchantInput(val: string) {
    merchant = val;
    if (val.trim().length >= 2) {
      brandSuggestions = (trie.search(val.trim().toLowerCase()) as string[]).slice(0, 5);
    } else {
      brandSuggestions = [];
    }
  }

  function selectBrandSuggestion(name: string) {
    merchant = name;
    brandSuggestions = [];
  }

  async function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    receiptFile = file;
    receiptPreviewUrl = URL.createObjectURL(file);
    isCompressing = true;
    errorMessage = '';

    try {
      const arrayBuffer = await file.arrayBuffer();

      const worker = new Worker(
        new URL('../../workers/image-compression.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (msg: MessageEvent) => {
        isCompressing = false;
        if (msg.data.error) {
          errorMessage = msg.data.error;
        } else {
          compressedBytes = msg.data.compressedBytes;
          receiptSha256 = msg.data.sha256Hex;
        }
        worker.terminate();
      };

      worker.onerror = () => {
        isCompressing = false;
        errorMessage = 'Worker compression failed';
        worker.terminate();
      };

      worker.postMessage({ fileBytes: arrayBuffer }, [arrayBuffer]);
    } catch (err: any) {
      isCompressing = false;
      errorMessage = err.message || 'Failed to read receipt file';
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      errorMessage = 'Please enter a name.';
      return;
    }
    const priceGross = parseFloat(priceStr.replace(',', '.')) || 0;
    if (category === 'subscription' && priceGross <= 0) {
      errorMessage = 'Please enter the recurring subscription price.';
      return;
    }

    isSaving = true;
    errorMessage = '';

    try {
      const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const pDate = new Date(purchaseDate);

      // Compute default expiry without mutating Date
      const monthsToAdd = category === 'hardware' ? 24 : 1;
      const expDate = new Date(
        pDate.getFullYear(),
        pDate.getMonth() + monthsToAdd,
        pDate.getDate()
      );
      const expiryDateStr = expDate.toISOString().split('T')[0]!;

      let receiptBlobRecord: ReceiptVaultBlob | undefined;

      if (compressedBytes && receiptSha256) {
        const masterKey = await getOrCreateMasterKey();
        const encrypted = await encryptReceiptBlob(compressedBytes, masterKey);
        receiptBlobRecord = {
          id: `blob-${id}`,
          itemId: id,
          encryptedBlob: encrypted.ciphertext,
          ivHex: encrypted.ivHex,
          mimeType: 'image/jpeg',
          byteLength: compressedBytes.byteLength,
          sha256: receiptSha256,
          createdAt: Date.now()
        };
      }

      const walletItem: WalletItem = {
        id,
        title: title.trim(),
        category,
        policyPlanId: category === 'subscription' ? policyPlanId : undefined,
        billingCycle: category === 'subscription' ? billingCycle : undefined,
        paymentType: category === 'subscription' ? paymentType : undefined,
        brandSlug: merchant.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        merchantOrProvider: merchant.trim() || 'Unknown',
        purchaseDate,
        expiryDate: expiryDateStr,
        priceGrossEur: priceGross,
        serialNumber: category === 'hardware' && serialNumber.trim() ? serialNumber.trim() : undefined,
        barcodeValue: category === 'hardware' && serialNumber.trim() ? serialNumber.trim() : undefined,
        status: 'active',
        isTaxDeductible,
        taxCategory: isTaxDeductible ? taxCategory : undefined,
        beruflicheNutzungProzent: isTaxDeductible ? beruflicheNutzungProzent : undefined,
        cancellationUrl: category === 'subscription' && cancellationUrl.trim() ? cancellationUrl.trim() : undefined,
        receiptSha256: receiptSha256 || undefined,
        receiptBlobId: receiptBlobRecord?.id,
        hasProofOfPurchase: Boolean(receiptBlobRecord),
        searchTokens: [title.toLowerCase(), merchant.toLowerCase()],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const alarms = computeAlertSchedule(walletItem);

      await walletStore.saveItem({
        item: walletItem,
        ...(receiptBlobRecord ? { receiptBlob: receiptBlobRecord } : {}),
        alarmSchedules: alarms
      });

      walletStore.setView('dashboard');
    } catch (err: any) {
      errorMessage = err.message || 'Failed to save entry';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="capture-panel">
  <div class="capture-header">
    <div>
      <p class="panel-eyebrow">On this device</p>
      <h2 class="panel-title">Quick Capture</h2>
    </div>
    <button
      type="button"
      class="close-btn"
      onclick={() => walletStore.setView('dashboard')}
      aria-label="Close capture"
    >
      <X size={20} aria-hidden="true" />
    </button>
  </div>

  {#if errorMessage}
    <div class="error-banner">{errorMessage}</div>
  {/if}

  <div class="capture-form">
    <!-- Manual entry type selection -->
    <div class="category-toggle-row">
      <button
        type="button"
        class="cat-btn"
        class:active={category === 'hardware'}
        aria-pressed={category === 'hardware'}
        onclick={() => (category = 'hardware')}
      >
        <Shield size={16} aria-hidden="true" />
        <span>Purchase</span>
      </button>
      <button
        type="button"
        class="cat-btn"
        class:active={category === 'subscription'}
        aria-pressed={category === 'subscription'}
        onclick={() => (category = 'subscription')}
      >
        <Receipt size={16} aria-hidden="true" />
        <span>Subscription</span>
      </button>
    </div>

    <!-- Title / Item Name -->
    <div class="field-wrap">
      <label for="item-title" class="field-label">
        Item *
      </label>
      <input
        id="item-title"
        type="text"
        placeholder="Enter item name"
        bind:value={title}
        class="text-input"
        required
      />
    </div>

    <!-- Merchant with PrefixTrie Autocomplete -->
    <div class="field-wrap relative">
      <label for="item-merchant" class="field-label">
        {category === 'subscription' ? 'Provider *' : 'Store or brand *'}
      </label>
      <input
        id="item-merchant"
        type="text"
        placeholder="Enter provider or store"
        value={merchant}
        oninput={(e) => handleMerchantInput((e.target as HTMLInputElement).value)}
        class="text-input"
        required
      />
      {#if brandSuggestions.length > 0}
        <div class="autocomplete-dropdown">
          {#each brandSuggestions as suggestion (suggestion)}
            <button
              type="button"
              class="suggestion-row"
              onclick={() => selectBrandSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if category === 'subscription'}
      <div class="form-grid-2">
        <div class="field-wrap">
          <label for="item-cycle" class="field-label">Billing Frequency</label>
          <select id="item-cycle" bind:value={billingCycle} class="text-input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div class="field-wrap">
          <label for="item-payment-type" class="field-label">Payment Method</label>
          <select id="item-payment-type" bind:value={paymentType} class="text-input">
            <option value="auto_pay">● Auto-Pay (Card / SEPA)</option>
            <option value="invoice">Invoice Due (Manual)</option>
          </select>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="field-wrap">
          <label for="item-price" class="field-label">Recurring Price (€) *</label>
          <input
            id="item-price"
            type="text"
            placeholder="e.g. 5.99"
            bind:value={priceStr}
            class="text-input"
            required
          />
        </div>

        <div class="field-wrap">
          <label for="item-date" class="field-label">Start date *</label>
          <input
            id="item-date"
            type="date"
            bind:value={purchaseDate}
            class="text-input"
            required
          />
        </div>
      </div>

      <div class="field-wrap">
        <label for="item-cancel-url" class="field-label">Official 1-Click Cancel Link** (URL)</label>
        <input
          id="item-cancel-url"
          type="url"
          placeholder="https://..."
          bind:value={cancellationUrl}
          class="text-input"
        />
      </div>
      <SubscriptionPlanPanel bind:planId={policyPlanId} />
    {:else}
      <div class="form-grid-2">
        <div class="field-wrap">
          <label for="item-date" class="field-label">Purchase date *</label>
          <input
            id="item-date"
            type="date"
            bind:value={purchaseDate}
            class="text-input"
            required
          />
        </div>

        <div class="field-wrap">
          <label for="item-serial" class="field-label">Serial Number (S/N · Optional)</label>
          <input
            id="item-serial"
            type="text"
            placeholder="e.g. C02X9481Q6L4"
            bind:value={serialNumber}
            class="text-input"
          />
        </div>
      </div>
    {/if}

    <!-- Receipt Capture Slot -->
    <div class="receipt-slot-card">
      <div class="receipt-header">
        <Camera size={18} class="text-pine" />
        <strong>Add receipt</strong>
      </div>
      <p class="receipt-desc">
        Photo or file. Your receipt is processed and stored on this device.
      </p>

      <div class="upload-controls">
        <label class="file-upload-btn">
          <Upload size={16} />
          <span>{receiptFile ? 'Change receipt' : 'Photo or file'}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onchange={handleFileInput}
            class="hidden-input"
          />
        </label>

        {#if isCompressing}
          <span class="processing-hint">Optimizing receipt photo...</span>
        {:else if receiptSha256}
          <div class="receipt-confirmed-badge">
            <Check size={14} color="#059669" />
            <span>Receipt fingerprint created</span>
          </div>
        {/if}
      </div>

      {#if receiptPreviewUrl}
        <div class="preview-wrap">
          <img src={receiptPreviewUrl} alt="Receipt Preview" class="receipt-img" />
        </div>
      {/if}
    </div>

    <!-- Optional Annual Tax Export Toggle -->
    <div class="tax-card">
      <label class="tax-toggle-row">
        <div class="tax-info">
          <strong>Include in tax summary</strong>
          <span class="sub-hint">Optional label for your records. Review before filing.</span>
        </div>
        <input type="checkbox" bind:checked={isTaxDeductible} class="switch-input" />
      </label>

      {#if isTaxDeductible}
        <div class="tax-details-row">
          {#if category === 'hardware'}
            <div class="field-wrap flex-1">
              <label for="item-price-tax" class="field-label">Purchase Price (€)</label>
              <input
                id="item-price-tax"
                type="text"
                placeholder="e.g. 899.00"
                bind:value={priceStr}
                class="text-input"
              />
            </div>
          {/if}
          <div class="field-wrap flex-1">
            <label for="tax-cat-select" class="field-label">Expense Type</label>
            <select id="tax-cat-select" bind:value={taxCategory} class="text-input">
              <option value="arbeitsmittel">Work Equipment</option>
              <option value="software_saas">Software / SaaS</option>
              <option value="telekommunikation">Telecom / Internet</option>
              <option value="fachliteratur">Books &amp; Study</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field-wrap flex-1">
            <label for="tax-pct" class="field-label">Work Use %</label>
            <input
              id="tax-pct"
              type="number"
              min="10"
              max="100"
              bind:value={beruflicheNutzungProzent}
              class="text-input"
            />
          </div>
        </div>
      {/if}
    </div>

    <button
      type="button"
      class="submit-action-btn"
      onclick={handleSave}
      disabled={isSaving || isCompressing}
    >
      {isSaving ? 'Saving...' : 'Save to vault'}
    </button>
  </div>
</div>

<style>
  .capture-panel {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .capture-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    padding-bottom: var(--space-3, 12px);
  }

  .panel-title {
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
  }

  .error-banner {
    padding: 8px 12px;
    border-radius: 6px;
    background: #FEE2E2;
    color: #991B1B;
    font-size: 12px;
  }

  .capture-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .panel-eyebrow {
    margin: 0 0 2px;
    color: var(--color-ink-secondary, #475569);
    font-size: 12px;
  }

  .category-toggle-row {
    display: flex;
    gap: 8px;
  }

  .cat-btn {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius-md, 12px);
    border: 1.5px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .cat-btn.active {
    border-color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    color: var(--color-pine-teal, #2F524C);
  }

  .field-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .relative {
    position: relative;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary, #475569);
  }

  .text-input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    min-height: 48px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-sm, 8px);
    padding: 0 12px;
    font-size: 14px;
    background: #FFFFFF;
    color: #0F172A;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .suggestion-row {
    padding: 8px 12px;
    border: none;
    background: transparent;
    text-align: left;
    font-size: 13px;
    cursor: pointer;
  }

  .suggestion-row:hover {
    background: #F1F5F9;
  }

  .receipt-slot-card {
    background: var(--color-surface-subtle, #F8FAFC);
    border: 1px dashed var(--color-border-strong, #CBD5E1);
    border-radius: var(--radius-md, 12px);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .receipt-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .receipt-desc {
    margin: 0;
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
  }

  .upload-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .file-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .hidden-input {
    display: none;
  }

  .processing-hint {
    font-size: 11px;
    color: #94A3B8;
  }

  .receipt-confirmed-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #065F46;
  }

  .preview-wrap {
    margin-top: 6px;
  }

  .receipt-img {
    max-height: 120px;
    border-radius: 6px;
    border: 1px solid #E2E8F0;
  }

  .tax-card {
    background: var(--color-surface-subtle, #F8FAFC);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tax-toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .tax-info {
    display: flex;
    flex-direction: column;
    font-size: 13px;
  }

  .sub-hint {
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
  }

  .switch-input {
    width: 20px;
    height: 20px;
    accent-color: var(--color-pine-teal, #2F524C);
    cursor: pointer;
  }

  .tax-details-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .flex-1 {
    flex: 1;
    min-width: 110px;
  }

  .submit-action-btn {
    min-height: 48px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 8px;
    transition: background 150ms ease;
  }

  @media (max-width: 520px) {
    .capture-panel {
      padding: 12px;
    }

    .form-grid-2 {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .category-toggle-row {
      gap: 6px;
    }

    .cat-btn {
      font-size: 12px;
      gap: 4px;
    }
  }

  .submit-action-btn:hover {
    background: #25423D;
  }

  .submit-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .capture-panel {
    border-radius: 22px;
    padding: clamp(18px, 2.5vw, 28px);
    gap: 18px;
    box-shadow: 0 12px 34px rgba(22, 51, 44, 0.07);
  }

  .capture-panel, .capture-form, .form-grid-2 { min-width: 0; max-width: 100%; }
  .capture-header { padding-bottom: 16px; }
  .panel-title { font-size: clamp(28px, 4vw, 36px); letter-spacing: -0.04em; }
  .panel-eyebrow { font-size: 14px; }
  .close-btn { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 50%; }
  .close-btn:hover { color: var(--color-pine-teal, #126b56); background: var(--color-surface-subtle, #f0f5f3); }
  .category-toggle-row { gap: 0; padding: 4px; border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 999px; background: #f5f8f7; }
  .cat-btn { min-height: 50px; border: 0; border-radius: 999px; background: transparent; font-size: 14px; }
  .cat-btn.active { border-color: transparent; background: var(--color-pine-teal, #126b56); color: #fff; box-shadow: 0 3px 8px rgba(18, 107, 86, 0.16); }
  .field-label { font-size: 13px; font-weight: 700; color: var(--color-ink-primary, #10201d); }
  .text-input { min-height: 50px; border-radius: 12px; border-color: #c7d2ce; }
  .text-input:focus-visible { outline: 3px solid rgba(18, 107, 86, 0.3); border-color: var(--color-pine-teal, #126b56); }
  .receipt-slot-card { background: #fff; border: 1.5px solid var(--color-pine-teal, #126b56); border-radius: 16px; padding: 14px 16px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 14px; }
  .receipt-header { font-size: 15px; color: var(--color-ink-primary, #10201d); }
  .receipt-header :global(svg) { color: var(--color-pine-teal, #126b56); }
  .receipt-desc { font-size: 12px; }
  .upload-controls { grid-column: 2; grid-row: 1 / span 2; justify-content: flex-end; }
  .file-upload-btn { min-height: 48px; border: 1px solid var(--color-pine-teal, #126b56); border-radius: 12px; background: #fff; color: var(--color-pine-teal, #126b56); font-size: 13px; }
  .submit-action-btn { min-height: 54px; border-radius: 14px; margin-top: 2px; font-size: 16px; letter-spacing: -0.01em; box-shadow: 0 5px 14px rgba(18, 107, 86, 0.16); }
  .tax-card { border-radius: 14px; }

  @media (max-width: 520px) {
    .capture-panel { padding: 16px; border-radius: 18px; }
    .category-toggle-row { gap: 2px; }
    .cat-btn { min-height: 48px; font-size: 13px; }
    .receipt-slot-card { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    .upload-controls { grid-column: 1; grid-row: auto; justify-content: flex-start; }
    .file-upload-btn { width: 100%; justify-content: center; }
  }

</style>
