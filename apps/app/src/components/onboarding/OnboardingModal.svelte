<script lang="ts">
  import { onMount, tick } from 'svelte';
  import VaultScene from '../3d/VaultScene.svelte';
  import StaticVectorFallback from '../3d/StaticVectorFallback.svelte';
  import { populateSampleStudentVault } from '../../utils/seedVaultUtility';

  interface Props {
    isOpen?: boolean;
    onCompleted?: (action: 'sample_seeded' | 'snap_receipt' | 'skipped') => void;
  }

  let { isOpen = $bindable(false), onCompleted }: Props = $props();

  let currentStep = $state<number>(1);
  let storageConfirmed = $state<boolean>(true);
  let notificationStatus = $state<NotificationPermission | 'unsupported'>('default');
  let subscribeSubscriptionsIcal = $state<boolean>(true);
  let subscribeWarrantiesIcal = $state<boolean>(true);
  let prefersReducedMotion = $state<boolean>(false);
  let isSeeding = $state<boolean>(false);
  let dialogElement = $state<HTMLDivElement | null>(null);
  let lastFocusedElement: HTMLElement | null = null;

  onMount(() => {
    // 1. Gating check
    const completed = localStorage.getItem('cmlab_onboarding_completed') === 'true';
    if (!completed) {
      isOpen = true;
    }

    // 2. Reduced motion detection
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    const updateMotion = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', updateMotion);

    // 3. Notification status check
    if (typeof Notification !== 'undefined') {
      notificationStatus = Notification.permission;
    } else {
      notificationStatus = 'unsupported';
    }

    return () => {
      mediaQuery.removeEventListener('change', updateMotion);
    };
  });

  // Focus trap and accessibility management
  $effect(() => {
    if (isOpen) {
      lastFocusedElement = document.activeElement as HTMLElement | null;
      tick().then(() => {
        const firstFocusable = dialogElement?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      });
    } else if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      skipOnboarding();
      return;
    }

    if (event.key === 'Tab') {
      if (!dialogElement) return;
      const focusableElements = dialogElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  async function requestNotificationPermission() {
    if (typeof Notification !== 'undefined') {
      try {
        const result = await Notification.requestPermission();
        notificationStatus = result;
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
  }

  function completeOnboarding(action: 'sample_seeded' | 'snap_receipt' | 'skipped') {
    localStorage.setItem('cmlab_onboarding_completed', 'true');
    localStorage.setItem('cmlab_onboarding_completed_at', new Date().toISOString());

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 15]);
    }

    isOpen = false;
    onCompleted?.(action);
  }

  async function selectPathA() {
    isSeeding = true;
    try {
      await populateSampleStudentVault();
      completeOnboarding('sample_seeded');
    } catch (err) {
      console.error('Failed to populate student vault:', err);
      completeOnboarding('sample_seeded');
    } finally {
      isSeeding = false;
    }
  }

  function selectPathB() {
    completeOnboarding('snap_receipt');
  }

  function skipOnboarding() {
    completeOnboarding('skipped');
  }

  function nextStep() {
    if (currentStep < 4) {
      currentStep += 1;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep -= 1;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div class="onboarding-scrim" role="presentation">
    <div
      bind:this={dialogElement}
      class="onboarding-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
    >
      <!-- Header Bar -->
      <div class="modal-header">
        <div class="step-indicator">
          <span class="step-badge">STEP {currentStep} OF 4</span>
          <div class="dots-progress" aria-hidden="true">
            {#each [1, 2, 3, 4] as step}
              <span class="dot" class:active={currentStep === step} class:completed={currentStep > step}></span>
            {/each}
          </div>
        </div>
        <button
          type="button"
          class="btn-skip"
          onclick={skipOnboarding}
          aria-label="Skip onboarding setup"
        >
          Skip
        </button>
      </div>

      <!-- 3D Spatial Canvas / Accessible Vector Fallback Container -->
      <div class="spatial-canvas-wrapper" aria-hidden="true">
        {#if !prefersReducedMotion}
          <VaultScene {currentStep} reducedMotion={false} />
        {:else}
          <StaticVectorFallback {currentStep} />
        {/if}
      </div>

      <!-- Step Content Area -->
      <div class="step-content">
        {#if currentStep === 1}
          <h2 id="onboarding-step-title" class="step-headline">
            Your Consumer Rights, Protected Automatically.
          </h2>
          <p class="step-desc">
            Welcome to your Sovereign Consumer Rights & Tax Wallet. Protect hardware guarantees (BGB §§ 438, 477),
            tame recurring subscription traps (§§ 309 Nr. 9, 312k), and unlock tax deductions (§ 9 EStG)
            without cloud intermediaries.
          </p>

          <div class="guarantee-pills">
            <span class="pill"><span class="pill-icon">⚖️</span> BGB §§ 438/477 24m Guarantee</span>
            <span class="pill"><span class="pill-icon">⚡</span> BGB § 309/312k Cancellation</span>
            <span class="pill"><span class="pill-icon">🧾</span> § 9 EStG 100% Tax Write-Off</span>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-primary" onclick={nextStep}>
              Get Started →
            </button>
          </div>

        {:else if currentStep === 2}
          <h2 id="onboarding-step-title" class="step-headline">
            100% Client-Side. Zero Cloud Plaintext.
          </h2>
          <p class="step-desc">
            Under <strong>GDPR Article 25 (Privacy by Design)</strong>, your invoices, serial numbers, and personal
            expenses never touch a central server.
          </p>

          <div class="security-card">
            <div class="sec-row">
              <span class="sec-badge">🔒 AES-GCM-256</span>
              <span class="sec-text">Non-extractable WebCrypto key sandboxed in your browser.</span>
            </div>
            <div class="sec-row">
              <span class="sec-badge">🔏 GoBD SHA-256</span>
              <span class="sec-text">Receipts pre-hashed pre-encryption for tamper-proof tax audits (Rn. 108–110).</span>
            </div>
            <div class="sec-row">
              <span class="sec-badge">🛡️ Dexie.js v4</span>
              <span class="sec-text">Local IndexedDB ACID vault; works completely offline on trains and campus.</span>
            </div>
          </div>

          <label class="confirmation-checkbox">
            <input type="checkbox" bind:checked={storageConfirmed} />
            <span>I understand my data resides solely on this device under my encryption key.</span>
          </label>

          <div class="modal-actions split">
            <button type="button" class="btn-secondary" onclick={prevStep}>
              ← Back
            </button>
            <button
              type="button"
              class="btn-primary"
              disabled={!storageConfirmed}
              onclick={nextStep}
            >
              Confirm & Continue →
            </button>
          </div>

        {:else if currentStep === 3}
          <h2 id="onboarding-step-title" class="step-headline">
            Never Miss a Statutory Deadline or Renewal.
          </h2>
          <p class="step-desc">
            Calibrate proactive alert notifications and subscribe to dual offline calendar feeds (RFC 5545).
          </p>

          <div class="notification-box">
            <div class="notif-header">
              <div class="notif-title-group">
                <span class="bell-glyph">🔔</span>
                <div>
                  <strong>09:00 Europe/Berlin Wall-Clock Alerts</strong>
                  <div class="sub-hint">Calibrated with 0h CEST/CET daylight saving drift.</div>
                </div>
              </div>
              <button
                type="button"
                class="btn-permission"
                class:granted={notificationStatus === 'granted'}
                onclick={requestNotificationPermission}
              >
                {notificationStatus === 'granted' ? '✓ Enabled' : 'Enable Web Alerts'}
              </button>
            </div>

            <div class="alert-timing-summary">
              <div class="timing-chip"><span class="chip-dot red"></span> 7d / 1d: Urgent Notice</div>
              <div class="timing-chip"><span class="chip-dot amber"></span> Day 335: BGB § 477 12m Cliff</div>
              <div class="timing-chip"><span class="chip-dot green"></span> 30d: Renewal Window</div>
            </div>
          </div>

          <!-- Dual RFC 5545 iCal Choice modeled on CampusWeb -->
          <div class="ical-calibration-tray">
            <div class="tray-label">Subscribe to Dual Calendar Feeds:</div>
            <div class="ical-toggle-row">
              <label class="toggle-pill">
                <input type="checkbox" bind:checked={subscribeSubscriptionsIcal} />
                <span>⚡ Subscriptions (Renewals & § 312k notices)</span>
              </label>
              <label class="toggle-pill">
                <input type="checkbox" bind:checked={subscribeWarrantiesIcal} />
                <span>💻 Warranties (24m BGB § 438 & § 477 cliff)</span>
              </label>
            </div>
          </div>

          <div class="modal-actions split">
            <button type="button" class="btn-secondary" onclick={prevStep}>
              ← Back
            </button>
            <button type="button" class="btn-primary" onclick={nextStep}>
              Next Step →
            </button>
          </div>

        {:else if currentStep === 4}
          <h2 id="onboarding-step-title" class="step-headline">
            How Would You Like to Start?
          </h2>
          <p class="step-desc">
            Explore with pre-seeded realistic student items or immediately snap your first physical receipt.
          </p>

          <div class="seed-paths">
            <!-- Path A: Recommended Sample Vault -->
            <button
              type="button"
              class="path-card recommended"
              disabled={isSeeding}
              onclick={selectPathA}
            >
              <div class="path-badge">Recommended for Students</div>
              <div class="path-icon">🎓</div>
              <div class="path-title">Load Sample Student Vault</div>
              <div class="path-desc">
                Includes Spotify Student, MacBook Pro 14", and MediaMarkt USB-C Hub. Test widgets, 24m BGB timeline,
                and 1-tap PDF claims immediately.
              </div>
              <div class="path-action-label">
                {isSeeding ? 'Populating...' : 'Seed Sample Vault & Launch →'}
              </div>
            </button>

            <!-- Path B: Fresh Start -->
            <button
              type="button"
              class="path-card"
              disabled={isSeeding}
              onclick={selectPathB}
            >
              <div class="path-badge secondary">Fresh Start</div>
              <div class="path-icon">📷</div>
              <div class="path-title">Snap My First Receipt (&lt;15s)</div>
              <div class="path-desc">
                Start with a blank vault and immediately trigger Quick Capture to register your own hardware guarantee or recurring subscription.
              </div>
              <div class="path-action-label">Open Camera Capture →</div>
            </button>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" onclick={prevStep}>
              ← Back
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .onboarding-scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-index-modal, 600);
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 16px);
  }

  .onboarding-modal {
    width: 100%;
    max-width: 580px;
    background: var(--color-card-white, #ffffff);
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    border-radius: var(--radius-xl, 28px);
    box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4, 16px) var(--space-6, 24px);
    border-bottom: 1px solid var(--color-border-subtle, #e2e8f0);
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
  }

  .step-badge {
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-bold, 700);
    letter-spacing: 0.05em;
    color: var(--color-pine-teal, #2f524c);
    background: var(--color-mineral-canvas, #f4f7f6);
    padding: 3px 8px;
    border-radius: 9999px;
  }

  .dots-progress {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 9999px;
    background: #cbd5e1;
    transition: all 220ms ease;
  }

  .dot.active {
    width: 20px;
    background: var(--color-pine-teal, #2f524c);
  }

  .dot.completed {
    background: var(--color-protected-green, #059669);
  }

  .btn-skip {
    background: transparent;
    border: none;
    font-size: var(--font-size-sm, 0.875rem);
    color: #64748b;
    cursor: pointer;
    padding: var(--space-1, 4px) var(--space-2, 8px);
    border-radius: var(--radius-sm, 6px);
  }

  .btn-skip:hover {
    color: var(--color-ink-primary, #0f172a);
    background: var(--color-mineral-canvas, #f4f7f6);
  }

  .spatial-canvas-wrapper {
    height: 220px;
    background: radial-gradient(circle at center, rgba(47, 82, 76, 0.12) 0%, rgba(244, 247, 246, 0.3) 70%);
    position: relative;
    border-bottom: 1px solid var(--color-border-subtle, #e2e8f0);
  }

  .step-content {
    padding: var(--space-6, 24px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .step-headline {
    font-size: var(--font-size-xl, 1.25rem);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0f172a);
    line-height: 1.25;
    letter-spacing: -0.015em;
    margin: 0;
  }

  .step-desc {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--color-ink-secondary, #475569);
    line-height: 1.625;
    margin: 0;
  }

  .guarantee-pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 8px);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--color-mineral-canvas, #f4f7f6);
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    padding: 6px 12px;
    border-radius: 9999px;
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-medium, 500);
    color: var(--color-ink-primary, #0f172a);
  }

  .security-card {
    background: var(--color-mineral-canvas, #f4f7f6);
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 12px) var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
  }

  .sec-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-2, 8px);
    font-size: var(--font-size-xs, 0.75rem);
  }

  .sec-badge {
    font-family: var(--font-family-mono, monospace);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-pine-teal, #2f524c);
    background: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    white-space: nowrap;
  }

  .sec-text {
    color: var(--color-ink-secondary, #475569);
  }

  .confirmation-checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2, 8px);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-ink-primary, #0f172a);
    cursor: pointer;
    user-select: none;
    margin-top: var(--space-2, 8px);
  }

  .notification-box {
    background: var(--color-mineral-canvas, #f4f7f6);
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    border-radius: var(--radius-md, 12px);
    padding: var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
  }

  .notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3, 12px);
  }

  .notif-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    font-size: var(--font-size-sm, 0.875rem);
  }

  .sub-hint {
    font-size: var(--font-size-xs, 0.75rem);
    color: #64748b;
  }

  .btn-permission {
    background: var(--color-pine-teal, #2f524c);
    color: #ffffff;
    border: none;
    padding: 6px 12px;
    border-radius: var(--radius-sm, 6px);
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
    transition: background 150ms;
  }

  .btn-permission.granted {
    background: var(--color-protected-green, #059669);
  }

  .alert-timing-summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 8px);
  }

  .timing-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-xs, 0.75rem);
    background: #ffffff;
    border: 1px solid var(--color-border-subtle, #e2e8f0);
    padding: 3px 8px;
    border-radius: 4px;
    color: var(--color-ink-secondary, #475569);
  }

  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 9999px;
  }
  .chip-dot.red { background: var(--color-urgent-red, #dc2626); }
  .chip-dot.amber { background: var(--color-warning-amber, #d97706); }
  .chip-dot.green { background: var(--color-protected-green, #059669); }

  .ical-calibration-tray {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: var(--radius-md, 12px);
    padding: var(--space-3, 12px);
  }

  .tray-label {
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-ink-primary, #0f172a);
  }

  .ical-toggle-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .toggle-pill {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-ink-secondary, #475569);
    cursor: pointer;
  }

  .seed-paths {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3, 12px);
  }

  @media (max-width: 640px) {
    .seed-paths {
      grid-template-columns: 1fr;
    }
  }

  .path-card {
    background: var(--color-mineral-canvas, #f4f7f6);
    border: 2px solid var(--color-border-subtle, #e2e8f0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    cursor: pointer;
    transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .path-card:hover {
    border-color: var(--color-pine-teal, #2f524c);
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
  }

  .path-card.recommended {
    border-color: var(--color-pine-teal, #2f524c);
    background: #ffffff;
  }

  .path-badge {
    font-size: 0.65rem;
    font-weight: var(--font-weight-bold, 700);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--color-pine-teal, #2f524c);
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: var(--space-2, 8px);
  }

  .path-badge.secondary {
    background: #94a3b8;
  }

  .path-icon {
    font-size: 1.75rem;
    margin-bottom: var(--space-1, 4px);
  }

  .path-title {
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0f172a);
    margin-bottom: var(--space-1, 4px);
  }

  .path-desc {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-ink-secondary, #475569);
    line-height: 1.5;
    flex-grow: 1;
    margin-bottom: var(--space-3, 12px);
  }

  .path-action-label {
    font-size: var(--font-size-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-terracotta-coral, #d96b4b);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-2, 8px);
  }

  .modal-actions.split {
    justify-content: space-between;
  }

  .btn-primary {
    background: var(--color-pine-teal, #2f524c);
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: var(--radius-md, 12px);
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
    transition: background 150ms, transform 150ms;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1e3632;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: transparent;
    color: var(--color-ink-secondary, #475569);
    border: 1px solid #cbd5e1;
    padding: 10px 18px;
    border-radius: var(--radius-md, 12px);
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: var(--font-weight-medium, 500);
    cursor: pointer;
  }

  .btn-secondary:hover {
    background: var(--color-mineral-canvas, #f4f7f6);
    color: var(--color-ink-primary, #0f172a);
  }
</style>
