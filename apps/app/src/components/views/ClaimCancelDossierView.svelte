<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import {
    compileBgbNotice,
    compilePlaintextDossier,
    compilePdfDossier,
    LEXFOX_SAFE_HARBOR_DE,
    type WalletItem,
    type LegalTemplateId,
    type NoticeCompilationParams,
    type CompiledLegalNotice
  } from '@cmlab/core';
  import {
    FileText,
    Download,
    Copy,
    Check,
    ArrowLeft,
    ShieldAlert,
    Info
  } from 'lucide-svelte';

  let item = $derived(walletStore.selectedItem);

  let selectedTemplate = $state<LegalTemplateId>('T1');
  let consumerName = $state('');
  let consumerAddress = $state('');
  let consumerEmail = $state('');
  let defectDescription = $state('');
  let copied = $state(false);
  let isGeneratingPdf = $state(false);

  const templates: { id: LegalTemplateId; title: string; statutoryRef: string }[] = [
    { id: 'T1', title: 'T1: Mängelrüge & Nacherfüllungsverlangen', statutoryRef: '§§ 437 Nr. 1, 439 Abs. 1 BGB' },
    { id: 'T2', title: 'T2: Rücktritt nach Fristablauf', statutoryRef: '§§ 437 Nr. 2, 323 Abs. 1, 346 BGB' },
    { id: 'T3', title: 'T3: Minderung des Kaufpreises', statutoryRef: '§§ 437 Nr. 2, 441 BGB' },
    { id: 'T4', title: 'T4: Fristlose Kündigung bei Button-Verstoß', statutoryRef: '§ 312k Abs. 6 BGB' },
    { id: 'T5', title: 'T5: Ordentliche Kündigung Dauerschuldverhältnis', statutoryRef: '§ 309 Nr. 9 BGB' }
  ];

  let noticeResult = $derived.by<CompiledLegalNotice | null>(() => {
    if (!item) return null;
    const params: NoticeCompilationParams = {
      item,
      templateId: selectedTemplate,
      consumer: {
        fullName: consumerName,
        address: consumerAddress,
        email: consumerEmail,
      },
      merchant: {
        name: item.merchantOrProvider,
        address: 'Kundenservice / Rechtsabteilung',
      },
      itemName: item.title,
      purchaseDate: item.purchaseDate,
      preferredRemedy: 'repair',
      priceEur: item.priceGrossEur,
      hasProofOfPurchase: item.hasProofOfPurchase,
      category: item.category,
      ...(selectedTemplate === 'T1' || selectedTemplate === 'T2' ? { defectDescription } : {}),
      ...(item.receiptSha256 ? { receiptSha256: item.receiptSha256 } : {})
    };
    return compileBgbNotice(params);
  });

  async function copyText() {
    if (!noticeResult) return;
    await navigator.clipboard.writeText(noticeResult.text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  async function downloadPdf() {
    if (!noticeResult || !item) return;
    isGeneratingPdf = true;
    try {
      const result = await compilePdfDossier({
        notice: noticeResult
      });
      const blob = new Blob([result.pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CM-LAB-Dossier-${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to compile PDF:', err);
    } finally {
      isGeneratingPdf = false;
    }
  }
</script>

<div class="dossier-view">
  <div class="view-header">
    <button
      type="button"
      class="back-btn"
      onclick={() => (item ? walletStore.setView('detail', item.id) : walletStore.setView('dashboard'))}
    >
      <ArrowLeft size={16} />
      <span>Back</span>
    </button>
    <div class="header-titles">
      <p class="page-eyebrow">Draft · review before sending</p>
      <h2 class="page-title">Claim or cancellation draft</h2>
    </div>
  </div>

  {#if !item}
    <div class="warning-card">
      <ShieldAlert size={18} />
      <span>No item selected. Please select a wallet item first.</span>
    </div>
  {:else}
    <div class="dossier-grid">
      <!-- Left Column: Controls & Form -->
      <div class="controls-column">
        <div class="card-section">
          <label for="template-select" class="section-label">Choose a letter template (T1–T5)</label>
          <div id="template-select" class="template-selector">
            {#each templates as tmpl (tmpl.id)}
              <button
                type="button"
                class="template-option"
                class:active={selectedTemplate === tmpl.id}
                onclick={() => (selectedTemplate = tmpl.id)}
              >
                <div class="tmpl-title">{tmpl.title}</div>
                <div class="tmpl-ref">{tmpl.statutoryRef}</div>
              </button>
            {/each}
          </div>
        </div>

        <div class="card-section">
          <span class="section-label">Your details</span>
          <div class="field-row">
            <label for="claimant-name" class="mini-label">Name:</label>
            <input id="claimant-name" type="text" bind:value={consumerName} class="mini-input" />
          </div>
          <div class="field-row">
            <label for="claimant-address" class="mini-label">Address:</label>
            <input id="claimant-address" type="text" bind:value={consumerAddress} class="mini-input" />
          </div>
          <div class="field-row">
            <label for="claimant-email" class="mini-label">Email:</label>
            <input id="claimant-email" type="email" bind:value={consumerEmail} class="mini-input" />
          </div>
        </div>

        {#if selectedTemplate === 'T1' || selectedTemplate === 'T2'}
          <div class="card-section">
            <label for="defect-desc" class="section-label">Describe the issue</label>
            <textarea
              id="defect-desc"
              rows={3}
              bind:value={defectDescription}
              class="textarea-input"
            ></textarea>
          </div>
        {/if}

        <div class="action-btn-row">
          <button
            type="button"
            class="btn-primary"
            onclick={downloadPdf}
            disabled={isGeneratingPdf}
          >
            <Download size={16} />
            <span>{isGeneratingPdf ? 'Preparing PDF...' : 'Export PDF'}</span>
          </button>
          <button type="button" class="btn-secondary" onclick={copyText}>
            {#if copied}
              <Check size={16} color="#059669" />
              <span>Copied!</span>
            {:else}
              <Copy size={16} />
              <span>Copy text</span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Right Column: Compiled Document Preview -->
      <div class="preview-column">
        <div class="document-preview-card">
          <h3 class="preview-title">Letter preview</h3>
          <p class="preview-note">Check the details and wording before sending.</p>
          <div class="doc-header-bar">
            <span class="doc-badge">DIN 5008 / BGB Formal Notice</span>
            <span class="doc-citation">{noticeResult?.statutoryBasis.join(', ')}</span>
          </div>

          <pre class="doc-text">{noticeResult?.text}</pre>

          <!-- Non-Removable LexFox / RDG Safe-Harbor Footer -->
          <footer class="lexfox-safe-harbor-footer">
            <div class="footer-title">
              <Info size={14} />
              <strong>Gesetzlicher Hinweis gem. BGH VIII ZR 285/18 (LexFox) & RDG §§ 2, 3:</strong>
            </div>
            <p class="footer-text">{LEXFOX_SAFE_HARBOR_DE}</p>
          </footer>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dossier-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .view-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    font-size: var(--font-size-xs, 12px);
    font-weight: 500;
    cursor: pointer;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
  }

  .page-eyebrow {
    margin: 0 0 2px;
    color: var(--color-ink-secondary, #475569);
    font-size: 12px;
  }

  .preview-title {
    margin: 0;
    color: var(--color-ink-primary, #0F172A);
    font-size: 18px;
  }

  .preview-note {
    margin: 4px 0 12px;
    color: var(--color-ink-secondary, #475569);
    font-size: 13px;
  }

  .page-title {
    margin: 0;
    font-size: var(--font-size-xl, 20px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .dossier-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: var(--space-4, 16px);
  }

  @media (max-width: 900px) {
    .dossier-grid {
      grid-template-columns: 1fr;
    }
  }

  .controls-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-section {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .template-selector {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .template-option {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: var(--color-surface-subtle, #F8FAFC);
    text-align: left;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .template-option.active {
    border-color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
  }

  .tmpl-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .tmpl-ref {
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mini-label {
    width: 60px;
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
  }

  .mini-input, .textarea-input {
    flex: 1;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: 6px;
    min-height: 44px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .textarea-input {
    width: 100%;
    resize: vertical;
  }

  .action-btn-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .btn-primary {
    min-height: 48px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .btn-secondary {
    min-height: 48px;
    border-radius: var(--radius-md, 12px);
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    color: var(--color-ink-primary, #0F172A);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }

  .document-preview-card {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 600px) {
    .view-header {
      align-items: flex-start;
    }

    .back-btn {
      min-height: 48px;
      flex: 0 0 auto;
    }

    .page-title {
      font-size: 24px;
    }

    .field-row {
      align-items: stretch;
      flex-direction: column;
      gap: 4px;
    }

    .mini-label {
      width: auto;
    }

    .doc-header-bar {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }
  }

  .doc-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .doc-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .doc-citation {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-terracotta-coral, #D96B4B);
  }

  .doc-text {
    font-family: monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #0F172A;
    white-space: pre-wrap;
    background: #F8FAFC;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    overflow-x: auto;
    margin: 0 0 16px;
  }

  /* Non-Removable LexFox / RDG Safe-Harbor Footer */
  .lexfox-safe-harbor-footer {
    border-top: 2px solid var(--color-border-subtle, #E2E8F0);
    padding-top: 12px;
    margin-top: auto;
    background: #FAFBFB;
    padding: 10px 12px;
    border-radius: 6px;
  }

  .footer-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-ink-primary, #0F172A);
    margin-bottom: 4px;
  }

  .footer-text {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: var(--color-ink-secondary, #475569);
  }
</style>
