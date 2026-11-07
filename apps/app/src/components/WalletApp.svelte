<script lang="ts">
  import { walletStore } from '../state/wallet.svelte';
  import EmailGate from './auth/EmailGate.svelte';
  import OnboardingModal from './onboarding/OnboardingModal.svelte';
  import SettingsNotifications from './settings/SettingsNotifications.svelte';
  import UnifiedOmniBar from './omnibar/UnifiedOmniBar.svelte';
  import FloatingActionMenu from './widgets/FloatingActionMenu.svelte';
  import MonthlyCalendarGrid from './widgets/MonthlyCalendarGrid.svelte';
  import UrgencyCountdownWidget from './widgets/UrgencyCountdownWidget.svelte';
  import ItemDetailDrawer from './views/ItemDetailDrawer.svelte';
  import QuickCaptureModal from './capture/QuickCaptureModal.svelte';
  import ClaimCancelDossierView from './views/ClaimCancelDossierView.svelte';
  import TaxSummaryExportView from './views/TaxSummaryExportView.svelte';

  import {
    Search,
    ShieldCheck,
    Bell,
    Settings,
    Plus,
    Receipt,
    Calendar,
    FolderKanban,
    ChevronRight,
    Camera,
    Sun,
    Moon
  } from 'lucide-svelte';

  let isDarkTheme = $state(false);

  function toggleThemeMode() {
    if (typeof document === 'undefined') return;
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    isDarkTheme = next === 'dark';
    try {
      localStorage.setItem('cmlab-theme-mode', next);
    } catch {}
  }

  // Global ⌘K / Ctrl+K listener for Omni-Bar
  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      walletStore.isOmnibarOpen = !walletStore.isOmnibarOpen;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="wallet-shell">
  <!-- Mandatory E2E Header Contract: role="banner" id="app-header" -->
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <header role="banner" id="app-header" class="app-header">
    <div class="header-left">
      <div
        class="brand-cluster"
        onclick={() => walletStore.setView('dashboard')}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && walletStore.setView('dashboard')}
      >
        <div class="brand-icon" style="padding: 0; overflow: hidden; background: transparent;">
          <img src="/favicon.svg" alt="Rights & Renewals Icon" width="36" height="36" style="display: block; border-radius: 9px;" />
        </div>
        <div class="brand-text">
          <span class="brand-title">Rights &amp; Renewals</span>
          <span class="brand-subtitle">Sovereign Consumer Wallet</span>
        </div>
      </div>
    </div>

    <!-- Mandatory E2E Combobox Contract: role="combobox" aria-expanded id="omnibar-root" -->
    <div
      role="combobox"
      aria-expanded={walletStore.isOmnibarOpen}
      aria-haspopup="listbox"
      aria-controls="omnibar-results"
      id="omnibar-root"
      class="omnibar-trigger-wrapper"
    >
      <button
        type="button"
        class="omnibar-trigger-btn"
        onclick={() => (walletStore.isOmnibarOpen = true)}
        aria-label="Open Universal Search (⌘K)"
      >
        <Search size={16} class="search-icon" />
        <span class="placeholder-text">Search warranties, subscriptions, policies (⌘K)...</span>
        <kbd class="shortcut-badge">⌘K</kbd>
      </button>
    </div>

    <div class="header-right">
      <button
        type="button"
        class="icon-action-btn"
        onclick={toggleThemeMode}
        aria-label="Toggle Light/Dark Theme"
        title="Toggle Light / Dark Theme"
      >
        {#if isDarkTheme}
          <Sun size={18} />
        {:else}
          <Moon size={18} />
        {/if}
      </button>

      <button
        type="button"
        class="icon-action-btn"
        onclick={() => walletStore.setView('settings')}
        aria-label="Notification & Calendar Settings"
        title="Settings & Notifications"
      >
        <Bell size={18} />
      </button>

      <button
        type="button"
        class="icon-action-btn"
        onclick={() => (walletStore.isEmailGateOpen = true)}
        aria-label="Account & Backup Sync"
        title="Sync & Email Auth"
      >
        <Settings size={18} />
      </button>

      <button
        type="button"
        class="primary-action-btn"
        onclick={() => walletStore.setView('capture')}
      >
        <Plus size={16} />
        <span class="btn-label">Capture</span>
      </button>
    </div>
  </header>

  <!-- Mandatory E2E Main Grid Contract: id="app-dashboard-grid" class="grid-12-col" -->
  <main id="app-dashboard-grid" class="grid-12-col">
    {#if walletStore.currentView === 'dashboard'}
      <!-- Overview Statistics Banner -->
      <section class="col-12 stat-banner-card">
        <div class="stat-cluster">
          <div class="stat-block">
            <span class="stat-label">Protected Capital</span>
            <span class="stat-value">€{walletStore.capitalAtRisk.toFixed(2)}</span>
          </div>
          <div class="stat-block">
            <span class="stat-label">Active Items</span>
            <span class="stat-value">{walletStore.items.length}</span>
          </div>
          <div class="stat-block">
            <span class="stat-label">Urgent Attention (&le;30d)</span>
            <span class="stat-value text-urgent">{walletStore.urgentItems.length}</span>
          </div>
          <div class="stat-block">
            <span class="stat-label">Tax Deductible</span>
            <span class="stat-value text-pine">{walletStore.taxDeductibleItems.length}</span>
          </div>
        </div>
      </section>

      <!-- Urgent Attention Radar Stream (Asymmetrical Bento Left 5-col on Desktop) -->
      <section class="col-12 bento-col-5">
        <UrgencyCountdownWidget />
      </section>

      <!-- All Vault Contracts & Warranties (Asymmetrical Bento Right 7-col on Desktop) -->
      <section class="col-12 bento-col-7 vault-overview-card">
        <div class="card-header">
          <div class="header-title-cluster">
            <Receipt size={18} />
            <h3 class="card-title">All Vault Contracts & Warranties</h3>
          </div>
          <span class="count-tag">{walletStore.items.length} items</span>
        </div>

        {#if walletStore.items.length === 0}
          <div class="vault-empty-state">
            <Camera size={36} class="text-secondary" />
            <p>Your local encrypted vault is empty. Capture your first receipt or test with sample student items.</p>
            <div class="empty-actions">
              <button
                type="button"
                class="primary-action-btn"
                onclick={() => walletStore.setView('capture')}
              >
                <Plus size={16} />
                <span>Snap First Receipt (&lt;15s)</span>
              </button>
              <button
                type="button"
                class="secondary-action-btn"
                onclick={() => (walletStore.isOnboardingOpen = true)}
              >
                Open Onboarding Wizard
              </button>
            </div>
          </div>
        {:else}
          <div class="vault-items-grid">
            {#each walletStore.items as item (item.id)}
              <div
                class="vault-card"
                onclick={() => walletStore.selectItem(item)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && walletStore.selectItem(item)}
              >
                <div class="vault-card-top">
                  <span class="category-pill">{item.category}</span>
                  <span class="price-tag">€{item.priceGrossEur.toFixed(2)}</span>
                </div>
                <h4 class="vault-card-name">{item.title}</h4>
                <p class="vault-card-merchant">{item.merchantOrProvider}</p>
                <div class="vault-card-footer">
                  <span class="expiry-notice">Valid until {item.expiryDate}</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Calendar ISO 8601 DIN Grid Widget -->
      <section class="col-12">
        <MonthlyCalendarGrid />
      </section>

    {:else if walletStore.currentView === 'capture'}
      <section class="col-12">
        <QuickCaptureModal />
      </section>

    {:else if walletStore.currentView === 'claim'}
      <section class="col-12">
        <ClaimCancelDossierView />
      </section>

    {:else if walletStore.currentView === 'tax'}
      <section class="col-12">
        <TaxSummaryExportView />
      </section>

    {:else if walletStore.currentView === 'calendar'}
      <section class="col-12">
        <MonthlyCalendarGrid />
      </section>

    {:else if walletStore.currentView === 'settings'}
      <section class="col-12">
        <SettingsNotifications />
      </section>
    {/if}
  </main>

  <!-- 520px Responsive Drawer System -->
  <ItemDetailDrawer />

  <!-- Portable FAB Speed Dial -->
  <FloatingActionMenu />

  <!-- Universal OmniBar Dialog -->
  <UnifiedOmniBar />

  <!-- Onboarding Wizard Modal -->
  <OnboardingModal
    bind:isOpen={walletStore.isOnboardingOpen}
    onCompleted={(action) => {
      if (action === 'snap_receipt') {
        walletStore.setView('capture');
      }
    }}
  />

  <!-- Email 6-Digit PIN Auth Gate -->
  <EmailGate bind:open={walletStore.isEmailGateOpen} />
</div>

<style>
  .wallet-shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface-canvas, #F4F7F6);
  }

  .app-header {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4, 16px);
    background-color: var(--color-card-white, #FFFFFF);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    position: sticky;
    top: 0;
    z-index: var(--z-index-navbar, 200);
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }

  .brand-cluster {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    cursor: pointer;
  }

  .brand-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm, 6px);
    background-color: var(--color-pine-teal, #2F524C);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
  }

  .brand-title {
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
    line-height: 1.1;
  }

  .brand-subtitle {
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
  }

  .omnibar-trigger-wrapper {
    flex: 1;
    max-width: 480px;
    margin: 0 var(--space-4, 16px);
  }

  .omnibar-trigger-btn {
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 var(--space-3, 12px);
    background-color: var(--color-surface-subtle, #F1F5F9);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    cursor: pointer;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-ink-secondary, #475569);
    transition: border-color var(--motion-duration-fast, 150ms) ease;
  }

  .omnibar-trigger-btn:hover {
    border-color: var(--color-pine-teal, #2F524C);
  }

  .placeholder-text {
    flex: 1;
    text-align: left;
    margin-left: var(--space-2, 8px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .shortcut-badge {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-card-white);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-ink-secondary);
    font-size: 11px;
    font-family: var(--font-family-mono);
  }

  .icon-action-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-card-white);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-ink-primary);
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease, border-color 150ms ease;
  }

  .icon-action-btn:hover {
    background: var(--color-surface-subtle);
    border-color: var(--color-pine-teal);
    transform: translateY(-2px);
  }

  .icon-action-btn:active,
  .primary-action-btn:active,
  .secondary-action-btn:active,
  .omnibar-trigger-btn:active,
  .vault-card:active {
    transform: scale(0.98) translateY(1px);
  }

  .primary-action-btn {
    height: 40px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-md);
    background-color: var(--color-pine-teal);
    color: var(--color-text-inverse);
    border: none;
    font-weight: var(--font-weight-semibold);
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    cursor: pointer;
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease;
  }

  .primary-action-btn:hover {
    background-color: var(--color-brand-primary-hover);
    transform: translateY(-2px);
  }

  .secondary-action-btn {
    height: 40px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-card-white);
    border: 1px solid var(--color-border-strong);
    color: var(--color-ink-primary);
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease, border-color 150ms ease;
  }

  .secondary-action-btn:hover {
    background: var(--color-surface-subtle);
    border-color: var(--color-pine-teal);
    transform: translateY(-2px);
  }

  @media (pointer: coarse), (max-width: 768px) {
    .icon-action-btn,
    .primary-action-btn,
    .secondary-action-btn,
    .omnibar-trigger-btn {
      min-height: 48px;
      min-width: 48px;
    }
  }

  @media (min-width: 1024px) {
    .bento-col-5 {
      grid-column: span 5;
    }
    .bento-col-7 {
      grid-column: span 7;
    }
  }

  .stat-banner-card, .vault-overview-card {
    background: var(--color-card-white);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
  }

  .stat-cluster {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
  }

  @media (min-width: 900px) {
    .stat-cluster {
      grid-template-columns: 2fr 1fr 1fr 1fr;
    }
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    border: 1px solid var(--color-border-subtle);
  }

  .stat-block:first-child {
    border-left: 3px solid var(--color-pine-teal);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-ink-secondary);
  }

  .stat-value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.015em;
    color: var(--color-ink-primary);
    margin-top: 4px;
  }

  :global(.text-urgent) {
    color: var(--color-urgent-red);
  }

  :global(.text-pine) {
    color: var(--color-pine-teal);
  }

  :global(.text-secondary) {
    color: var(--color-ink-tertiary);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .header-title-cluster {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-pine-teal);
  }

  .card-title {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.015em;
    color: var(--color-ink-primary);
  }

  .count-tag {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary);
    background: var(--color-surface-subtle);
    border: 1px solid var(--color-border-subtle);
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .vault-empty-state {
    padding: 40px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--color-ink-secondary);
  }

  .empty-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .vault-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-4);
  }

  .vault-card {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-card-white);
    cursor: pointer;
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 150ms ease, box-shadow 180ms ease;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .vault-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-pine-teal);
    box-shadow: var(--elevation-md);
  }

  .vault-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .category-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: var(--color-surface-subtle, #F1F5F9);
    color: var(--color-pine-teal, #2F524C);
    text-transform: uppercase;
  }

  .price-tag {
    font-weight: var(--font-weight-bold, 700);
    font-size: var(--font-size-base, 16px);
    color: var(--color-ink-primary, #0F172A);
  }

  .vault-card-name {
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .vault-card-merchant {
    margin: 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .vault-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border-subtle, #F1F5F9);
    font-size: 11px;
    color: var(--color-ink-tertiary, #94A3B8);
  }
</style>
