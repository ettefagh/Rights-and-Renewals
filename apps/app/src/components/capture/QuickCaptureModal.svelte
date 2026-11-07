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
    type TaxCategory
  } from '@cmlab/core';
  import {
    Camera,
    Upload,
    Check,
    X,
    Lock,
    Tag,
    Receipt,
    Shield
  } from 'lucide-svelte';

  let title = $state('');
  let merchant = $state('');
  let category = $state<'hardware' | 'subscription'>('hardware');
  let priceStr = $state('');
  let purchaseDate = $state(new Date().toISOString().split('T')[0]!);
  let isTaxDeductible = $state(false);
  let taxCategory = $state<TaxCategory>('arbeitsmittel');
  let beruflicheNutzungProzent = $state(100);
  let cancellationUrl = $state('');

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

      // Launch Web Worker for client-side OffscreenCanvas downsampling & GoBD SHA-256
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

      worker.onerror = (err) => {
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
      errorMessage = 'Please enter an item name.';
      return;
    }
    const priceGross = parseFloat(priceStr.replace(',', '.')) || 0;
    if (priceGross <= 0) {
      errorMessage = 'Please enter a valid price.';
      return;
    }

    isSaving = true;
    errorMessage = '';

    try {
      const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const pDate = new Date(purchaseDate);

      // Default statutory expiry: 24 months for hardware, 12 months for subscriptions
      let expDate = new Date(pDate);
      if (category === 'hardware') {
        expDate.setMonth(pDate.getMonth() + 24);
      } else {
        expDate.setMonth(pDate.getMonth() + 1);
      }
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
        brandSlug: merchant.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        merchantOrProvider: merchant.trim() || 'Unknown Merchant',
        purchaseDate,
        expiryDate: expiryDateStr,
        priceGrossEur: priceGross,
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

      walletStore.setView('detail', id);
    } catch (err: any) {
      errorMessage = err.message || 'Failed to save item to encrypted vault';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="capture-panel">
  <div class="capture-header">
    <div>
      <h2 class="panel-title">Quick Capture (&lt;15s Flow)</h2>
      <p class="panel-subtitle">Register a physical warranty or recurring digital subscription.</p>
    </div>
    <button
      type="button"
      class="close-btn"
      onclick={() => walletStore.setView('dashboard')}
      aria-label="Close capture"
    >
      <X size={20} />
    </button>
  </div>

  {#if errorMessage}
    <div class="error-banner">{errorMessage}</div>
  {/if}

  <div class="capture-form">
    <!-- Category Toggle -->
    <div class="category-toggle-row">
      <button
        type="button"
        class="cat-btn"
        class:active={category === 'hardware'}
        onclick={() => (category = 'hardware')}
      >
        <Shield size={16} />
        <span>Hardware Guarantee (24m BGB)</span>
      </button>
      <button
        type="button"
        class="cat-btn"
        class:active={category === 'subscription'}
        onclick={() => (category = 'subscription')}
      >
        <Receipt size={16} />
        <span>Digital Subscription (§ 309 BGB)</span>
      </button>
    </div>

    <!-- Title / Item Name -->
    <div class="field-wrap">
      <label for="item-title" class="field-label">Item / Service Name *</label>
      <input
        id="item-title"
        type="text"
        placeholder="e.g. Apple MacBook Pro, Spotify Student..."
        bind:value={title}
        class="text-input"
        required
      />
    </div>

    <!-- Merchant with PrefixTrie Autocomplete -->
    <div class="field-wrap relative">
      <label for="item-merchant" class="field-label">Merchant / Provider *</label>
      <input
        id="item-merchant"
        type="text"
        placeholder="e.g. MediaMarkt, Apple Store, Spotify..."
        value={merchant}
        oninput={(e) => handleMerchantInput((e.target as HTMLInputElement).value)}
        class="text-input"
        required
      />
      {#if brandSuggestions.length > 0}
        <div class="autocomplete-dropdown">
          {#each brandSuggestions as suggestion}
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

    <!-- Price and Purchase Date Grid -->
    <div class="form-grid-2">
      <div class="field-wrap">
        <label for="item-price" class="field-label">Gross Price (€) *</label>
        <input
          id="item-price"
          type="text"
          placeholder="e.g. 89.99"
          bind:value={priceStr}
          class="text-input"
          required
        />
      </div>

      <div class="field-wrap">
        <label for="item-date" class="field-label">Purchase / Start Date *</label>
        <input
          id="item-date"
          type="date"
          bind:value={purchaseDate}
          class="text-input"
          required
        />
      </div>
    </div>

    {#if category === 'subscription'}
      <div class="field-wrap">
        <label for="item-cancel-url" class="field-label">Direct Cancellation URL (§ 312k BGB)</label>
        <input
          id="item-cancel-url"
          type="url"
          placeholder="https://..."
          bind:value={cancellationUrl}
          class="text-input"
        />
      </div>
    {/if}

    <!-- Receipt Capture Slot with Web Worker Compression -->
    <div class="receipt-slot-card">
      <div class="receipt-header">
        <Camera size={18} class="text-pine" />
        <strong>Proof of Purchase (Offline Encrypted)</strong>
      </div>
      <p class="receipt-desc">
        Images are downsampled to &le;2048px (&lt;1.5MB) and sealed with GoBD SHA-256 pre-encryption digest.
      </p>

      <div class="upload-controls">
        <label class="file-upload-btn">
          <Upload size={16} />
          <span>{receiptFile ? 'Change Receipt Photo' : 'Snap / Upload Receipt'}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onchange={handleFileInput}
            class="hidden-input"
          />
        </label>

        {#if isCompressing}
          <span class="processing-hint">Downsampling & hashing in Web Worker...</span>
        {:else if receiptSha256}
          <div class="receipt-confirmed-badge">
            <Check size={14} color="#059669" />
            <span>GoBD Proof Sealed: <code>{receiptSha256.slice(0, 12)}...</code></span>
          </div>
        {/if}
      </div>

      {#if receiptPreviewUrl}
        <div class="preview-wrap">
          <img src={receiptPreviewUrl} alt="Receipt Preview" class="receipt-img" />
        </div>
      {/if}
    </div>

    <!-- Tax Deductibility Toggle (§ 9 EStG) -->
    <div class="tax-card">
      <label class="tax-toggle-row">
        <div class="tax-info">
          <strong>Tax Deductible Expense (§ 9 EStG Werbungskosten)</strong>
          <span class="sub-hint">1-year 100% digital Sofortabschreibung per BMF 22.02.2022.</span>
        </div>
        <input type="checkbox" bind:checked={isTaxDeductible} class="switch-input" />
      </label>

      {#if isTaxDeductible}
        <div class="tax-details-row">
          <div class="field-wrap flex-1">
            <label for="tax-cat-select" class="field-label">Tax Category</label>
            <select id="tax-cat-select" bind:value={taxCategory} class="text-input">
              <option value="arbeitsmittel">Arbeitsmittel (§ 9 EStG)</option>
              <option value="software_saas">Digital Software / SaaS (BMF 2022)</option>
              <option value="telekommunikation">Telekommunikation</option>
              <option value="fachliteratur">Fachliteratur</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field-wrap flex-1">
            <label for="tax-pct" class="field-label">Professional Use %</label>
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
      {isSaving ? 'Encrypting & Sealing...' : 'Save to Sovereign Vault'}
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

  .panel-subtitle {
    margin: 2px 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
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

  .category-toggle-row {
    display: flex;
    gap: 8px;
  }

  .cat-btn {
    flex: 1;
    height: 40px;
    border-radius: var(--radius-md, 12px);
    border: 1.5px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: var(--font-size-xs, 12px);
    font-weight: 600;
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
    font-weight: 500;
    color: var(--color-ink-secondary, #475569);
  }

  .text-input {
    height: 42px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-sm, 8px);
    padding: 0 12px;
    font-size: 14px;
    background: #FFFFFF;
    color: #0F172A;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
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
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 500;
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
  }

  .flex-1 {
    flex: 1;
  }

  .submit-action-btn {
    height: 44px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
    transition: background 150ms ease;
  }

  .submit-action-btn:hover {
    background: #25423D;
  }

  .submit-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
