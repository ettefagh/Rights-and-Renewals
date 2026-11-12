<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
  import { firstCaptureError, validateCaptureDetails, type CaptureField, type CaptureValidationScope } from '../../lib/capture-wizard';

  let { initialTitle = '', onInitialTitleConsumed }: {
    initialTitle?: string;
    onInitialTitleConsumed?: () => void;
  } = $props();

  let title = $state('');
  let merchant = $state('');
  let category = $state<'hardware' | 'subscription'>('hardware');
  let billingCycle = $state<BillingCycle>('monthly');
  let paymentType = $state<PaymentMethodType>('auto_pay');
  let priceStr = $state('');
  let serialNumber = $state('');
  const localToday = new Date();
  let purchaseDate = $state(`${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`);
  let isTaxDeductible = $state(false);
  let taxCategory = $state<TaxCategory>('arbeitsmittel');
  let beruflicheNutzungProzent = $state(100);
  let cancellationUrl = $state('');
  let policyPlanId = $state<string | undefined>(undefined);
  let currentStep = $state(0);
  let fieldErrors = $state<Partial<Record<CaptureField, string>>>({});
  let stepHeading = $state<HTMLHeadingElement | null>(null);
  const wizardSteps = ['Type', 'Details', 'Receipt & tax', 'Review & save'];
  const taxCategoryLabels: Record<TaxCategory, string> = {
    arbeitsmittel: 'Work equipment',
    software_saas: 'Software / SaaS',
    telekommunikation: 'Telecom / internet',
    fachliteratur: 'Books & study',
    other: 'Other'
  };

  function captureValidationInput() {
    return {
      category,
      title,
      merchant,
      purchaseDate,
      price: priceStr,
      cancellationUrl,
      includeInTaxSummary: isTaxDeductible,
      workUsePercent: beruflicheNutzungProzent
    };
  }

  function validateCurrentStep(scope: CaptureValidationScope) {
    fieldErrors = validateCaptureDetails(captureValidationInput(), new Date(), scope);
    const firstError = firstCaptureError(fieldErrors);
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(fieldId(firstError))?.focus());
      return false;
    }
    errorMessage = '';
    return true;
  }

  function fieldId(field: CaptureField) {
    return ({
      title: 'item-title',
      merchant: 'item-merchant',
      purchaseDate: 'item-date',
      price: 'item-price',
      cancellationUrl: 'item-cancel-url',
      workUsePercent: 'tax-pct'
    } satisfies Record<CaptureField, string>)[field];
  }

  function continueWizard() {
    if (currentStep === 1 && !validateCurrentStep('details')) return;
    if (currentStep === 2 && !ensureReceiptReady()) return;
    if (currentStep === 2 && !validateCurrentStep('extras')) return;
    fieldErrors = {};
    currentStep = Math.min(currentStep + 1, wizardSteps.length - 1);
    requestAnimationFrame(() => stepHeading?.focus());
  }

  function ensureReceiptReady() {
    if (!receiptFile || (compressedBytes && receiptSha256)) return true;
    errorMessage = 'Choose a different receipt image or remove it before continuing.';
    requestAnimationFrame(() => document.getElementById('receipt-file-button')?.focus());
    return false;
  }

  function goBack() {
    fieldErrors = {};
    errorMessage = '';
    currentStep = Math.max(currentStep - 1, 0);
    requestAnimationFrame(() => stepHeading?.focus());
  }

  function chooseCategory(value: 'hardware' | 'subscription') {
    category = value;
    fieldErrors = {};
    errorMessage = '';
    currentStep = 1;
    requestAnimationFrame(() => stepHeading?.focus());
  }

  // Receipt processing state
  let receiptFile = $state<File | null>(null);
  let receiptPreviewUrl = $state<string | null>(null);
  let compressedBytes = $state<Uint8Array | null>(null);
  let receiptSha256 = $state<string>('');
  let cameraInput = $state<HTMLInputElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let receiptWorker: Worker | null = null;
  let destroyed = false;
  let isCompressing = $state(false);
  let isSaving = $state(false);
  let errorMessage = $state('');

  function removeReceipt() {
    receiptWorker?.terminate();
    receiptWorker = null;
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    receiptFile = null;
    receiptPreviewUrl = null;
    compressedBytes = null;
    receiptSha256 = '';
    isCompressing = false;
    errorMessage = '';
  }

  onDestroy(() => {
    destroyed = true;
    receiptWorker?.terminate();
    receiptWorker = null;
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
  });

  // PrefixTrie autocomplete
  let trie = new PrefixTrie();
  let brandSuggestions = $state<string[]>([]);

  onMount(async () => {
    title = initialTitle.trim().slice(0, 160);
    onInitialTitleConsumed?.();
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
    target.value = '';
    if (isCompressing || isSaving) return;
    if (file.type && !file.type.startsWith('image/')) {
      errorMessage = 'Please choose a receipt image.';
      return;
    }

    removeReceipt();
    receiptFile = file;
    receiptPreviewUrl = URL.createObjectURL(file);
    isCompressing = true;
    errorMessage = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (destroyed || receiptFile !== file) return;

      const worker = new Worker(
        new URL('../../workers/image-compression.worker.ts', import.meta.url),
        { type: 'module' }
      );
      receiptWorker = worker;

      worker.onmessage = (msg: MessageEvent) => {
        if (receiptWorker !== worker) return;
        isCompressing = false;
        if (msg.data.error) {
          errorMessage = msg.data.error;
        } else {
          compressedBytes = msg.data.compressedBytes;
          receiptSha256 = msg.data.sha256Hex;
        }
        worker.terminate();
        receiptWorker = null;
      };

      worker.onerror = () => {
        if (receiptWorker !== worker) return;
        isCompressing = false;
        errorMessage = 'Worker compression failed';
        worker.terminate();
        receiptWorker = null;
      };

      worker.postMessage({ fileBytes: arrayBuffer }, [arrayBuffer]);
    } catch (err: any) {
      if (destroyed || receiptFile !== file) return;
      receiptWorker?.terminate();
      receiptWorker = null;
      isCompressing = false;
      errorMessage = err.message || 'Failed to read receipt file';
    }
  }

  async function handleSave() {
    if (currentStep !== wizardSteps.length - 1 || isSaving || isCompressing) return;
    if (receiptFile && (!compressedBytes || !receiptSha256)) {
      errorMessage = 'Choose a different receipt image or remove it before saving.';
      currentStep = 2;
      requestAnimationFrame(() => document.getElementById('receipt-file-button')?.focus());
      return;
    }
    const saveErrors = validateCaptureDetails(captureValidationInput());
    if (Object.keys(saveErrors).length > 0) {
      fieldErrors = saveErrors;
      const firstError = firstCaptureError(saveErrors)!;
      currentStep = firstError === 'workUsePercent' || (firstError === 'price' && category === 'hardware') ? 2 : 1;
      requestAnimationFrame(() => document.getElementById(fieldId(firstError))?.focus());
      return;
    }
    const priceGross = category === 'subscription' || isTaxDeductible
      ? Number(priceStr.trim().replace(',', '.')) || 0
      : 0;

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
    <button type="button" class="close-btn" onclick={() => walletStore.setView('dashboard')} aria-label="Close capture">
      <X size={20} aria-hidden="true" />
    </button>
  </div>

  <nav class="wizard-progress" aria-label="Capture progress">
    <ol>
      {#each wizardSteps as step, index (step)}
        <li class:complete={index < currentStep} class:current={index === currentStep} aria-current={index === currentStep ? 'step' : undefined}>
          <span class="step-number" aria-hidden="true">{index + 1}</span>
          <span>{step}</span>
        </li>
      {/each}
    </ol>
    <span class="sr-only" aria-live="polite">Step {currentStep + 1} of {wizardSteps.length}: {wizardSteps[currentStep]}</span>
  </nav>

  {#if errorMessage}
    <div class="error-banner" role="alert">{errorMessage}</div>
  {/if}

  <section class="wizard-step" aria-labelledby="wizard-step-heading">
    {#if currentStep === 0}
      <h3 id="wizard-step-heading" bind:this={stepHeading} tabindex="-1">What are you adding?</h3>
      <p class="step-intro">Choose a purchase or a subscription to get started.</p>
      <div class="category-choices">
        <button type="button" class="choice-btn" onclick={() => chooseCategory('hardware')}>
          <Shield size={20} aria-hidden="true" />
          <span><strong>Warranty</strong><small>A purchase with warranty details</small></span>
        </button>
        <button type="button" class="choice-btn" onclick={() => chooseCategory('subscription')}>
          <Receipt size={20} aria-hidden="true" />
          <span><strong>Subscription</strong><small>A recurring service or plan</small></span>
        </button>
      </div>
    {:else if currentStep === 1}
      <h3 id="wizard-step-heading" bind:this={stepHeading} tabindex="-1">{category === 'subscription' ? 'Subscription details' : 'Purchase details'}</h3>
      <div class="capture-form">
        <div class="field-wrap">
          <label for="item-title" class="field-label">{category === 'subscription' ? 'Subscription name *' : 'Item *'}</label>
          <input id="item-title" type="text" placeholder="Enter a name" bind:value={title} class="text-input" required aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? 'item-title-error' : undefined} />
          {#if fieldErrors.title}<span id="item-title-error" class="field-error">{fieldErrors.title}</span>{/if}
        </div>
        <div class="field-wrap relative">
          <label for="item-merchant" class="field-label">{category === 'subscription' ? 'Provider *' : 'Store or brand *'}</label>
          <input id="item-merchant" type="text" placeholder="Enter provider or store" value={merchant} oninput={(e) => handleMerchantInput((e.target as HTMLInputElement).value)} class="text-input" required aria-invalid={!!fieldErrors.merchant} aria-describedby={fieldErrors.merchant ? 'item-merchant-error' : undefined} />
          {#if fieldErrors.merchant}<span id="item-merchant-error" class="field-error">{fieldErrors.merchant}</span>{/if}
          {#if brandSuggestions.length > 0}
            <div class="autocomplete-dropdown">
              {#each brandSuggestions as suggestion (suggestion)}
                <button type="button" class="suggestion-row" onclick={() => selectBrandSuggestion(suggestion)}>{suggestion}</button>
              {/each}
            </div>
          {/if}
        </div>
        <div class="field-wrap">
          <label for="item-date" class="field-label">{category === 'subscription' ? 'Start date *' : 'Purchase date *'}</label>
          <input id="item-date" type="date" bind:value={purchaseDate} class="text-input" required aria-invalid={!!fieldErrors.purchaseDate} aria-describedby={fieldErrors.purchaseDate ? 'item-date-error' : undefined} />
          {#if fieldErrors.purchaseDate}<span id="item-date-error" class="field-error">{fieldErrors.purchaseDate}</span>{/if}
        </div>
        {#if category === 'subscription'}
          <div class="form-grid-2">
            <div class="field-wrap">
              <label for="item-cycle" class="field-label">Billing frequency</label>
              <select id="item-cycle" bind:value={billingCycle} class="text-input">
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="field-wrap">
              <label for="item-payment-type" class="field-label">Payment method</label>
              <select id="item-payment-type" bind:value={paymentType} class="text-input">
                <option value="auto_pay">Auto-pay (card / SEPA)</option><option value="invoice">Invoice (manual)</option>
              </select>
            </div>
          </div>
          <div class="field-wrap">
            <label for="item-price" class="field-label">Recurring price (€) *</label>
            <input id="item-price" type="text" inputmode="decimal" placeholder="e.g. 5.99" bind:value={priceStr} class="text-input" required aria-invalid={!!fieldErrors.price} aria-describedby={fieldErrors.price ? 'item-price-error' : undefined} />
            {#if fieldErrors.price}<span id="item-price-error" class="field-error">{fieldErrors.price}</span>{/if}
          </div>
          <div class="field-wrap">
            <label for="item-cancel-url" class="field-label">Cancellation link (optional)</label>
            <input id="item-cancel-url" type="url" placeholder="https://..." bind:value={cancellationUrl} class="text-input" aria-invalid={!!fieldErrors.cancellationUrl} aria-describedby={fieldErrors.cancellationUrl ? 'item-cancel-url-error' : undefined} />
            {#if fieldErrors.cancellationUrl}<span id="item-cancel-url-error" class="field-error">{fieldErrors.cancellationUrl}</span>{/if}
          </div>
          <SubscriptionPlanPanel bind:planId={policyPlanId} />
        {:else}
          <div class="field-wrap">
            <label for="item-serial" class="field-label">Serial number (optional)</label>
            <input id="item-serial" type="text" placeholder="e.g. C02X9481Q6L4" bind:value={serialNumber} class="text-input" />
          </div>
        {/if}
      </div>
    {:else if currentStep === 2}
      <h3 id="wizard-step-heading" bind:this={stepHeading} tabindex="-1">Receipt &amp; tax</h3>
      <div class="capture-form">
        <section class="receipt-slot-card" aria-labelledby="receipt-heading" aria-describedby="receipt-description">
          <div class="receipt-title-row"><Camera size={18} aria-hidden="true" /><strong id="receipt-heading">Add receipt</strong></div>
          <p id="receipt-description" class="sr-only">Take a photo or choose an existing receipt image. It is processed and stored on this device.</p>
          <div class="upload-controls">
            <button type="button" class="file-upload-btn" onclick={() => cameraInput?.click()} disabled={isCompressing || isSaving} aria-describedby="receipt-description">
              <Camera size={16} aria-hidden="true" /><span>Take photo</span>
            </button>
            <button id="receipt-file-button" type="button" class="file-upload-btn" onclick={() => fileInput?.click()} disabled={isCompressing || isSaving} aria-describedby="receipt-description">
              <Upload size={16} aria-hidden="true" /><span>{receiptFile ? 'Choose another image' : 'Choose photo or file'}</span>
            </button>
            <input bind:this={cameraInput} type="file" accept="image/*" capture="environment" onchange={handleFileInput} class="hidden-input" aria-label="Take a receipt photo" />
            <input bind:this={fileInput} type="file" accept="image/*" onchange={handleFileInput} class="hidden-input" aria-label="Choose a receipt image from photos or files" />
            {#if receiptFile}<button type="button" class="remove-receipt-btn" onclick={removeReceipt} disabled={isSaving}>Remove receipt</button>{/if}
            {#if isCompressing}<span class="processing-hint" role="status">Optimizing receipt photo...</span>{:else if receiptSha256}<span class="receipt-confirmed-badge"><Check size={14} aria-hidden="true" /><span>Receipt ready</span></span>{/if}
          </div>
          {#if receiptPreviewUrl}<div class="preview-wrap"><img src={receiptPreviewUrl} alt="Receipt preview" class="receipt-img" /></div>{/if}
        </section>

        <section class="tax-card" aria-labelledby="tax-heading">
          <label class="tax-toggle-row">
            <span class="tax-info"><strong id="tax-heading">Include in tax summary</strong><span class="sub-hint">Mark this if you want to consider it for tax purposes.</span></span>
            <input type="checkbox" bind:checked={isTaxDeductible} class="switch-input" />
          </label>
          {#if isTaxDeductible}
            <div class="tax-details-row">
              {#if category === 'hardware'}
                <div class="field-wrap flex-1"><label for="item-price" class="field-label">Purchase price (€), optional</label><input id="item-price" type="text" inputmode="decimal" placeholder="e.g. 899.00" bind:value={priceStr} class="text-input" aria-invalid={!!fieldErrors.price} aria-describedby={fieldErrors.price ? 'item-price-error' : undefined} />{#if fieldErrors.price}<span id="item-price-error" class="field-error">{fieldErrors.price}</span>{/if}</div>
              {/if}
              <div class="field-wrap flex-1"><label for="tax-cat-select" class="field-label">Expense type</label><select id="tax-cat-select" bind:value={taxCategory} class="text-input"><option value="arbeitsmittel">Work equipment</option><option value="software_saas">Software / SaaS</option><option value="telekommunikation">Telecom / internet</option><option value="fachliteratur">Books &amp; study</option><option value="other">Other</option></select></div>
              <div class="field-wrap flex-1"><label for="tax-pct" class="field-label">Work use (%)</label><input id="tax-pct" type="number" min="0" max="100" bind:value={beruflicheNutzungProzent} class="text-input" aria-invalid={!!fieldErrors.workUsePercent} aria-describedby={fieldErrors.workUsePercent ? 'tax-pct-error' : undefined} />{#if fieldErrors.workUsePercent}<span id="tax-pct-error" class="field-error">{fieldErrors.workUsePercent}</span>{/if}</div>
            </div>
          {/if}
        </section>
      </div>
    {:else}
      <h3 id="wizard-step-heading" bind:this={stepHeading} tabindex="-1">Review &amp; save</h3>
      <p class="step-intro">Check these details. Nothing is saved until you choose Save to vault.</p>
      <dl class="review-list">
        <div><dt>Type</dt><dd>{category === 'subscription' ? 'Subscription' : 'Purchase'}</dd></div>
        <div><dt>{category === 'subscription' ? 'Name' : 'Item'}</dt><dd>{title.trim() || 'Not entered'}</dd></div>
        <div><dt>{category === 'subscription' ? 'Provider' : 'Store or brand'}</dt><dd>{merchant.trim() || 'Not entered'}</dd></div>
        <div><dt>{category === 'subscription' ? 'Start date' : 'Purchase date'}</dt><dd>{purchaseDate || 'Not entered'}</dd></div>
        {#if category === 'subscription'}
          <div><dt>Recurring price</dt><dd>€{priceStr || '—'} · {billingCycle}</dd></div>
          <div><dt>Payment method</dt><dd>{paymentType === 'auto_pay' ? 'Auto-pay' : 'Invoice'}</dd></div>
          {#if cancellationUrl.trim()}<div><dt>Cancellation link</dt><dd>{cancellationUrl.trim()}</dd></div>{/if}
          {#if policyPlanId}<div><dt>Selected plan</dt><dd>Selected</dd></div>{/if}
        {:else}
          {#if serialNumber.trim()}<div><dt>Serial number</dt><dd>{serialNumber.trim()}</dd></div>{/if}
          {#if isTaxDeductible && priceStr.trim()}<div><dt>Purchase price</dt><dd>€{priceStr}</dd></div>{/if}
        {/if}
        <div><dt>Receipt</dt><dd>{receiptFile ? (receiptSha256 ? 'Attached and ready' : isCompressing ? 'Processing' : 'Needs attention') : 'None added'}</dd></div>
        <div><dt>Tax summary</dt><dd>{isTaxDeductible ? `Marked · ${taxCategoryLabels[taxCategory]} · ${beruflicheNutzungProzent}% work use` : 'Not marked'}</dd></div>
      </dl>
    {/if}
  </section>

  <div class="wizard-actions">
    {#if currentStep > 0}<button type="button" class="back-action-btn" onclick={goBack} disabled={isSaving}>Back</button>{/if}
    {#if currentStep > 0}
      {#if currentStep < wizardSteps.length - 1}
        <button type="button" class="submit-action-btn" onclick={continueWizard} disabled={isSaving || isCompressing}>Continue</button>
      {:else}
        <button type="button" class="submit-action-btn" onclick={handleSave} disabled={isSaving || isCompressing}>{isSaving ? 'Saving...' : 'Save to vault'}</button>
      {/if}
    {/if}
  </div>
</div>
<style>
  .capture-panel { display: flex; flex-direction: column; gap: 18px; min-width: 0; max-width: 100%; padding: clamp(16px, 2.5vw, 28px); border: 1px solid var(--color-border-subtle, #e2e8f0); border-radius: 22px; background: var(--color-card-white, #fff); box-shadow: 0 12px 34px rgba(22, 51, 44, .07); }
  .capture-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid var(--color-border-subtle, #e2e8f0); }
  .panel-eyebrow { margin: 0 0 2px; color: var(--color-ink-secondary, #475569); font-size: 13px; }
  .panel-title { margin: 0; color: var(--color-ink-primary, #0f172a); font-size: clamp(26px, 4vw, 34px); font-weight: 700; letter-spacing: -.04em; }
  .close-btn { display: grid; width: 48px; height: 48px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--color-ink-tertiary, #64748b); cursor: pointer; }
  .close-btn:hover { color: var(--color-pine-teal, #126b56); background: var(--color-surface-subtle, #f0f5f3); }
  .wizard-progress ol { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
  .wizard-progress li { display: flex; align-items: center; gap: 7px; min-width: 0; color: var(--color-ink-tertiary, #64748b); font-size: 12px; font-weight: 600; }
  .wizard-progress li.current { color: var(--color-pine-teal, #126b56); }
  .wizard-progress li.complete { color: var(--color-ink-secondary, #475569); }
  .step-number { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%; background: #eef2f1; }
  .wizard-progress li.current .step-number { background: var(--color-pine-teal, #126b56); color: #fff; }
  .error-banner { padding: 10px 12px; border-radius: 8px; background: #fee2e2; color: #991b1b; font-size: 13px; }
  .wizard-step { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .wizard-step h3 { margin: 0; color: var(--color-ink-primary, #10201d); font-size: 20px; letter-spacing: -.025em; }
  .wizard-step h3:focus { outline: none; }
  .step-intro { margin: -6px 0 0; color: var(--color-ink-secondary, #475569); font-size: 13px; line-height: 1.5; }
  .category-choices { display: grid; gap: 10px; }
  .choice-btn { display: flex; align-items: center; gap: 14px; min-height: 78px; padding: 14px 16px; border: 1.5px solid var(--color-border-subtle, #cbd5d1); border-radius: 14px; background: #fff; color: var(--color-ink-primary, #10201d); text-align: left; cursor: pointer; }
  .choice-btn > span { display: flex; flex-direction: column; gap: 4px; }
  .choice-btn strong { font-size: 15px; }
  .choice-btn small { color: var(--color-ink-secondary, #475569); font-size: 12px; }
  .capture-form { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .field-wrap { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .relative { position: relative; }
  .field-label { color: var(--color-ink-primary, #10201d); font-size: 13px; font-weight: 700; }
  .text-input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 50px; padding: 0 12px; border: 1px solid #c7d2ce; border-radius: 12px; background: #fff; color: #0f172a; font-size: 14px; }
  .text-input:focus-visible { outline: 3px solid rgba(18, 107, 86, .3); border-color: var(--color-pine-teal, #126b56); }
  .text-input[aria-invalid="true"] { border-color: #b91c1c; }
  .field-error { color: #991b1b; font-size: 12px; }
  .form-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .autocomplete-dropdown { position: absolute; z-index: 50; top: 100%; right: 0; left: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border-subtle, #e2e8f0); border-radius: 8px; background: #fff; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, .1); }
  .suggestion-row { padding: 10px 12px; border: 0; background: transparent; text-align: left; font-size: 13px; cursor: pointer; }
  .suggestion-row:hover { background: #f1f5f9; }
  .receipt-slot-card { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 14px; background: #fff; }
  .receipt-title-row { display: flex; align-items: center; gap: 7px; color: var(--color-ink-primary, #10201d); font-size: 14px; }
  .receipt-title-row :global(svg) { color: var(--color-pine-teal, #126b56); }
  .upload-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
  .file-upload-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; padding: 8px 12px; border: 1px solid var(--color-pine-teal, #126b56); border-radius: 12px; background: #fff; color: var(--color-pine-teal, #126b56); font-size: 12px; font-weight: 600; cursor: pointer; }
  .file-upload-btn:disabled { opacity: .6; cursor: wait; }
  .hidden-input { display: none; }
  .remove-receipt-btn { min-height: 44px; border: 0; background: transparent; color: var(--color-ink-secondary, #475569); text-decoration: underline; cursor: pointer; }
  .processing-hint, .receipt-confirmed-badge { color: var(--color-ink-secondary, #475569); font-size: 11px; }
  .receipt-confirmed-badge { display: inline-flex; align-items: center; gap: 4px; color: #065f46; font-weight: 600; }
  .preview-wrap { flex-basis: 100%; margin-top: 4px; }
  .receipt-img { max-width: min(100%, 280px); max-height: 160px; border: 1px solid #e2e8f0; border-radius: 6px; }
  .tax-card { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--color-border-subtle, #e2e8f0); border-radius: 14px; background: var(--color-surface-subtle, #f8fafc); }
  .tax-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }
  .tax-info { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .sub-hint { color: var(--color-ink-secondary, #475569); font-size: 11px; }
  .switch-input { flex: 0 0 auto; width: 20px; height: 20px; accent-color: var(--color-pine-teal, #126b56); cursor: pointer; }
  .tax-details-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .flex-1 { flex: 1; min-width: 120px; }
  .review-list { display: grid; gap: 0; margin: 0; border-top: 1px solid var(--color-border-subtle, #e2e8f0); }
  .review-list > div { display: grid; grid-template-columns: minmax(110px, .7fr) minmax(0, 1.3fr); gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle, #e2e8f0); }
  .review-list dt { color: var(--color-ink-secondary, #475569); font-size: 12px; }
  .review-list dd { overflow-wrap: anywhere; margin: 0; color: var(--color-ink-primary, #10201d); font-size: 13px; font-weight: 600; }
  .wizard-actions { display: flex; justify-content: space-between; gap: 10px; }
  .submit-action-btn { flex: 1; min-height: 52px; margin-top: 2px; border: 0; border-radius: 14px; background: var(--color-pine-teal, #126b56); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 5px 14px rgba(18, 107, 86, .16); }
  .submit-action-btn:hover { background: #25423d; }
  .submit-action-btn:disabled { opacity: .5; cursor: not-allowed; }
  .back-action-btn { min-height: 48px; padding: 0 18px; border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 12px; background: #fff; color: var(--color-ink-primary, #10201d); font-weight: 700; cursor: pointer; }
  .back-action-btn:disabled { opacity: .6; cursor: wait; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .file-upload-btn:focus-visible, .remove-receipt-btn:focus-visible, .choice-btn:focus-visible, .back-action-btn:focus-visible, .submit-action-btn:focus-visible, .close-btn:focus-visible { outline: 3px solid rgba(18, 107, 86, .35); outline-offset: 3px; }
  @media (max-width: 520px) {
    .capture-panel { padding: 16px; border-radius: 18px; }
    .wizard-progress ol { gap: 3px; }
    .wizard-progress li { flex-direction: column; align-items: flex-start; gap: 4px; font-size: 10px; }
    .step-number { flex-basis: 26px; width: 26px; height: 26px; }
    .form-grid-2 { grid-template-columns: 1fr; }
    .receipt-slot-card { align-items: flex-start; }
    .receipt-title-row, .upload-controls { width: 100%; }
    .upload-controls { justify-content: flex-start; }
    .file-upload-btn { flex: 1; }
    .review-list > div { grid-template-columns: minmax(90px, .65fr) minmax(0, 1.35fr); }
  }
</style>
