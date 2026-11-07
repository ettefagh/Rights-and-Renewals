<script lang="ts">
  import {
    copyToClipboardSafe,
    LEXFOX_SAFE_HARBOR_DE,
    type WalletItem
  } from '@cmlab/core';
  import { walletStore } from '../../state/wallet.svelte';
  import {
    X,
    ExternalLink,
    Copy,
    Check,
    ShieldAlert,
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2
  } from 'lucide-svelte';

  interface Props {
    item: WalletItem;
    onClose: () => void;
  }

  let { item, onClose }: Props = $props();

  let copiedToken = $state(false);
  let handoffInitiated = $state(false);
  let cancellationSaved = $state(false);

  let tokenToCopy = $derived.by(() => {
    if (item.notes && item.notes.trim().length > 0) return item.notes.trim();
    if (item.serialNumber && item.serialNumber.trim().length > 0) return item.serialNumber.trim();
    return `Vertrag ${item.title}`;
  });

  let effectiveCancellationUrl = $derived.by(() => {
    if (item.cancellationUrl && item.cancellationUrl.startsWith('http')) {
      return item.cancellationUrl;
    }
    // Fallback search link for brand cancellation
    return `https://www.google.com/search?q=${encodeURIComponent(item.merchantOrProvider + ' verträge hier kündigen 312k')}`;
  });

  async function handleCopyToken() {
    await copyToClipboardSafe(tokenToCopy);
    copiedToken = true;
    setTimeout(() => {
      copiedToken = false;
    }, 2500);
  }

  async function handleOpenPortal() {
    // 1. Copy contract token first synchronously
    await copyToClipboardSafe(tokenToCopy);
    copiedToken = true;

    // 2. Open official vendor cancellation portal in authenticated session
    if (typeof window !== 'undefined') {
      window.open(effectiveCancellationUrl, '_blank', 'noopener,noreferrer');
    }

    // 3. Trigger post-handoff check-in state
    handoffInitiated = true;
  }

  async function confirmCancellationSubmitted() {
    await walletStore.updateItemStatus(item.id, 'cancellation_pending');
    cancellationSaved = true;
    setTimeout(() => {
      onClose();
    }, 1800);
  }

  function routeToFormalNotice(templateId: 'T4' | 'T5') {
    onClose();
    walletStore.setView('claim', item.id);
  }
</script>

<div
  class="cancellation-modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="cancel-modal-title"
>
  <div class="cancellation-card">
    <!-- Header -->
    <header class="modal-header">
      <div class="header-left">
        <span class="badge-law">§ 312k BGB Kündigungs-Assistent</span>
        <h2 id="cancel-modal-title" class="modal-title">
          Kündigung: {item.title}
        </h2>
        <p class="modal-sub">
          {item.merchantOrProvider} • Laufzeit/Verlängerung: {item.expiryDate}
        </p>
      </div>
      <button
        type="button"
        class="close-btn"
        onclick={onClose}
        aria-label="Assistent schließen"
      >
        <X size={20} />
      </button>
    </header>

    <div class="modal-body">
      {#if cancellationSaved}
        <div class="success-banner">
          <CheckCircle2 size={36} class="success-icon" />
          <h3 class="success-title">Status: Kündigung eingereicht (Tracking aktiv)</h3>
          <p class="success-desc">
            Der Status wurde auf <strong>Kündigung in Prüfung</strong> gesetzt. Das gesetzliche 14-Tage-Tracking für die Bestätigung (§ 312k Abs. 4 BGB) läuft ab heute.
          </p>
        </div>
      {:else}
        <!-- DUAL-RAIL CHOICE -->
        <div class="rails-container">
          <!-- RAIL A: Statutory Web Cancellation (Fast Path) -->
          <div class="rail-box rail-a">
            <div class="rail-header">
              <span class="rail-badge fast">Schiene A (Schnellweg)</span>
              <h3 class="rail-title">Offizielle § 312k Kündigungsseite</h3>
            </div>
            <p class="rail-desc">
              Öffnet die gesetzlich vorgeschriebene Kündigungsseite des Anbieters in deinem Browser. Deine Kundendaten werden vorab in die Zwischenablage kopiert.
            </p>

            <div class="token-preview">
              <span class="token-label">Kunden-/Vertragsdaten:</span>
              <div class="token-chip">
                <code>{tokenToCopy}</code>
                <button
                  type="button"
                  class="copy-chip-btn"
                  onclick={handleCopyToken}
                  title="In Zwischenablage kopieren"
                >
                  {#if copiedToken}
                    <Check size={14} class="text-green" />
                  {:else}
                    <Copy size={14} />
                  {/if}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="primary-rail-btn"
              onclick={handleOpenPortal}
            >
              <span>Kündigungsseite aufrufen &amp; Daten kopieren</span>
              <ExternalLink size={16} />
            </button>

            {#if handoffInitiated}
              <div class="post-handoff-prompt">
                <div class="prompt-icon">
                  <Clock size={18} class="text-amber" />
                </div>
                <div class="prompt-content">
                  <h4 class="prompt-title">Hast du den Button "Jetzt kündigen" geklickt?</h4>
                  <p class="prompt-text">
                    Bestätige die Einreichung, um den 14-tägigen Bestätigungsnachweis zu tracken.
                  </p>
                  <div class="prompt-actions">
                    <button
                      type="button"
                      class="confirm-btn"
                      onclick={confirmCancellationSubmitted}
                    >
                      <Check size={14} />
                      <span>Ja, Kündigung eingereicht</span>
                    </button>
                    <button
                      type="button"
                      class="subtle-btn"
                      onclick={onClose}
                    >
                      Noch nicht / Später
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- RAIL B: Deterministic Legal Notice Generation (Formal Path) -->
          <div class="rail-box rail-b">
            <div class="rail-header">
              <span class="rail-badge legal">Schiene B (Schriftform &amp; Streitfall)</span>
              <h3 class="rail-title">Rechtssicheres Kündigungsschreiben</h3>
            </div>
            <p class="rail-desc">
              Erstellt ein DIN 5008 Kündigungsschreiben mit SEPA-Lastschrift-Widerruf und GoBD SHA-256 Zeitstempel für E-Mail, Fax oder Einschreiben.
            </p>

            <div class="rail-b-actions">
              <button
                type="button"
                class="secondary-rail-btn"
                onclick={() => routeToFormalNotice('T5')}
              >
                <FileText size={16} />
                <span>Ordentliche Kündigung erstellen (BGB § 309 Nr. 9)</span>
              </button>

              <button
                type="button"
                class="alert-rail-btn"
                onclick={() => routeToFormalNotice('T4')}
              >
                <ShieldAlert size={16} />
                <span>Button fehlt? Fristlos kündigen (§ 312k Abs. 6 BGB)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Safe Harbor Notice (BGH LexFox Compliance) -->
        <div class="safe-harbor-footer">
          <AlertCircle size={14} class="safe-harbor-icon" />
          <p class="safe-harbor-text">
            {LEXFOX_SAFE_HARBOR_DE}
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .cancellation-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    z-index: var(--z-index-modal, 500);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 16px);
  }

  .cancellation-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-xl, 24px);
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-4, 16px) var(--space-5, 20px);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  .badge-law {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-pine-teal, #2F524C);
    background: rgba(47, 82, 76, 0.1);
    padding: 2px 8px;
    border-radius: 9999px;
    margin-bottom: 4px;
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .modal-sub {
    margin: 4px 0 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #64748B);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--color-ink-secondary, #64748B);
    padding: 8px;
    border-radius: var(--radius-sm, 6px);
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--color-surface-muted, #F1F5F9);
    color: var(--color-ink-primary, #0F172A);
  }

  .modal-body {
    padding: var(--space-5, 20px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .rails-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .rail-box {
    border-radius: var(--radius-md, 12px);
    padding: var(--space-4, 16px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  .rail-a {
    background: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%);
    border-color: #BBF7D0;
  }

  .rail-b {
    background: var(--color-surface-muted, #F8FAFC);
    border-color: var(--color-border-subtle, #E2E8F0);
  }

  .rail-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 4px;
  }

  .rail-badge.fast {
    background: #DCFCE7;
    color: #166534;
  }

  .rail-badge.legal {
    background: #E2E8F0;
    color: #334155;
  }

  .rail-title {
    margin: 0;
    font-size: var(--font-size-base, 15px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .rail-desc {
    font-size: var(--font-size-xs, 13px);
    color: var(--color-ink-secondary, #475569);
    margin: 6px 0 12px 0;
    line-height: 1.4;
  }

  .token-preview {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .token-label {
    font-size: 11px;
    color: #64748B;
    font-weight: 600;
  }

  .token-chip {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-chip code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 12px;
    font-weight: 700;
    color: #0F172A;
  }

  .copy-chip-btn {
    background: var(--color-surface-muted, #F1F5F9);
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .primary-rail-btn {
    width: 100%;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    border-radius: var(--radius-md, 8px);
    padding: 12px 16px;
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-bold, 700);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: transform 100ms ease, background-color 100ms ease;
    min-height: 48px;
  }

  .primary-rail-btn:hover {
    background: #233F3A;
    transform: translateY(-1px);
  }

  .primary-rail-btn:active {
    transform: scale(0.98);
  }

  .post-handoff-prompt {
    margin-top: 14px;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: var(--radius-md, 8px);
    padding: 12px;
    display: flex;
    gap: 10px;
  }

  :global(.text-amber) {
    color: #D97706;
  }

  :global(.text-green) {
    color: #16A34A;
  }

  .prompt-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #92400E;
  }

  .prompt-text {
    margin: 4px 0 10px 0;
    font-size: 12px;
    color: #B45309;
    line-height: 1.3;
  }

  .prompt-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .confirm-btn {
    background: #059669;
    color: #FFFFFF;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    min-height: 40px;
  }

  .confirm-btn:hover {
    background: #047857;
  }

  .subtle-btn {
    background: transparent;
    border: 1px solid #D97706;
    color: #92400E;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    min-height: 40px;
  }

  .rail-b-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .secondary-rail-btn, .alert-rail-btn {
    width: 100%;
    border-radius: var(--radius-md, 8px);
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    min-height: 44px;
  }

  .secondary-rail-btn {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    color: var(--color-ink-primary, #0F172A);
  }

  .secondary-rail-btn:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
  }

  .alert-rail-btn {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
  }

  .alert-rail-btn:hover {
    background: #FEE2E2;
  }

  .safe-harbor-footer {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--color-surface-muted, #F8FAFC);
    border-radius: var(--radius-sm, 6px);
    padding: 8px 12px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
  }

  :global(.safe-harbor-icon) {
    color: #64748B;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .safe-harbor-text {
    margin: 0;
    font-size: 11px;
    color: #64748B;
    line-height: 1.4;
  }

  .success-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-6, 24px) var(--space-4, 16px);
  }

  :global(.success-icon) {
    color: #059669;
    margin-bottom: 12px;
  }

  .success-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .success-desc {
    margin: 0;
    font-size: 13px;
    color: var(--color-ink-secondary, #475569);
    max-width: 440px;
    line-height: 1.4;
  }
</style>
