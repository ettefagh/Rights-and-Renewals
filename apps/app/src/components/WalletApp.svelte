<script lang="ts">
  import { walletStore } from '../state/wallet.svelte';
  import { getShowcaseUrl } from '../lib/showcase-url';
  import {
    formatFriendlyDate,
    formatRelativeRemaining,
    computeCoverageProgress,
    getSubscriptionConcurrency,
    computeMonthlyNormalizedPrice
  } from '../utils/dateFormatters';
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
  import ReceiptRegisterZoomModal from './views/ReceiptRegisterZoomModal.svelte';
  import AssistedCancellationModal from './views/AssistedCancellationModal.svelte';

  import {
    Search,
    Bell,
    Settings,
    Plus,
    Receipt,
    Shield,
    ExternalLink,
    Pencil,
    Sun,
    Moon,
    BookOpen,
    RefreshCw
  } from 'lucide-svelte';

  let isDarkTheme = $state(false);
  let isNotifCenterOpen = $state(false);

  const DONUT_COLORS = ['#2F524C', '#D96B4B', '#0D9488', '#D97706', '#4F46E5'];
  const showcaseAdminUrl = getShowcaseUrl('/_emdash/admin');
  const showcaseWikiUrl = getShowcaseUrl('/wiki');

  // Compute SVG donut chart segments for active subscriptions
  let donutSegments = $derived.by(() => {
    const subs = walletStore.digitalSubscriptions;
    const total = walletStore.monthlyAutoPayTotal;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;

    if (subs.length === 0 || total <= 0) {
      return { circumference, slices: [] };
    }

    let accumulatedFraction = 0;
    const slices = subs.map((sub, idx) => {
      const monthlyVal = computeMonthlyNormalizedPrice(sub);
      const fraction = Math.max(0.02, monthlyVal / total);
      const dashLength = fraction * circumference;
      const dashOffset = -accumulatedFraction * circumference;
      accumulatedFraction += fraction;
      return {
        id: sub.id,
        title: sub.title,
        monthlyVal,
        color: DONUT_COLORS[idx % DONUT_COLORS.length]!,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset
      };
    });

    return { circumference, slices };
  });

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

  function handleKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      walletStore.isOmnibarOpen = !walletStore.isOmnibarOpen;
    } else if (event.key === 'Escape' && isNotifCenterOpen) {
      isNotifCenterOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="wallet-shell">
  <!-- Mandatory E2E Header Contract: role="banner" id="app-header" -->
  <!-- Clean Header: App Icon + App Name + ONLY Notification Center Button -->
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <header role="banner" id="app-header" class="app-header">
    <div
      class="brand-cluster"
      onclick={() => {
        walletStore.setView('dashboard');
        isNotifCenterOpen = false;
      }}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && walletStore.setView('dashboard')}
    >
      <img
        src="/favicon.svg"
        alt="Rights & Renewals"
        width="34"
        height="34"
        class="brand-logo-img"
      />
      <span class="brand-title">Rights &amp; Renewals</span>
    </div>

    <div class="header-right">
      <button
        type="button"
        class="notif-center-btn"
        onclick={() => (isNotifCenterOpen = !isNotifCenterOpen)}
        aria-label="Notification Center"
        aria-expanded={isNotifCenterOpen}
        title="Notifications & Quick Preferences"
      >
        <Bell size={19} />
        {#if walletStore.urgentItems.length > 0}
          <span class="notif-dot-badge" aria-label={`${walletStore.urgentItems.length} urgent notifications`}>
            {walletStore.urgentItems.length}
          </span>
        {:else}
          <span class="notif-dot-clear" aria-hidden="true"></span>
        {/if}
      </button>

      {#if isNotifCenterOpen}
        <div class="notif-popover" role="region" aria-label="Notification Center">
          <div class="notif-popover-header">
            <span class="notif-popover-title">Notification Center</span>
            <span class="notif-popover-count">{walletStore.urgentItems.length} due (&le;30d)</span>
          </div>

          {#if walletStore.urgentItems.length > 0}
            <div class="notif-list">
              {#each walletStore.urgentItems as uItem (uItem.id)}
                {@const days = walletStore.computeDaysRemaining(uItem.expiryDate)}
                <button
                  type="button"
                  class="notif-row-btn"
                  onclick={() => {
                    isNotifCenterOpen = false;
                    walletStore.selectItem(uItem);
                  }}
                >
                  <span class="notif-item-dot" class:critical={days <= 7}></span>
                  <div class="notif-item-text">
                    <span class="notif-item-name">{uItem.title}</span>
                    <span class="notif-item-date">
                      {uItem.category === 'subscription' ? 'Renews' : 'Ends'} {formatFriendlyDate(uItem.expiryDate, 'short')} ({days <= 0 ? 'today' : `in ${days}d`})
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          {:else}
            <p class="notif-empty">All subscriptions and warranties are clear for the next 30 days.</p>
          {/if}

          <div class="notif-popover-footer">
            <button
              type="button"
              class="notif-util-btn"
              onclick={() => {
                isNotifCenterOpen = false;
                walletStore.setView('settings');
              }}
            >
              <Settings size={14} />
              <span>Alert Schedule</span>
            </button>
            <button
              type="button"
              class="notif-util-btn"
              onclick={toggleThemeMode}
            >
              {#if isDarkTheme}
                <Sun size={14} />
                <span>Light Mode</span>
              {:else}
                <Moon size={14} />
                <span>Dark Mode</span>
              {/if}
            </button>
            <button
              type="button"
              class="notif-util-btn"
              onclick={() => {
                isNotifCenterOpen = false;
                walletStore.isEmailGateOpen = true;
              }}
            >
              <span>Sync / PIN</span>
            </button>
            {#if showcaseAdminUrl}
              <button
                type="button"
                class="notif-util-btn"
                onclick={() => {
                  isNotifCenterOpen = false;
                  if (typeof window !== 'undefined') {
                    window.open(showcaseAdminUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                title="Open the EmDash editorial dashboard"
              >
                <span>⚡ EmDash</span>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </header>

  <!-- Mandatory E2E Main Grid Contract: id="app-dashboard-grid" class="grid-12-col" -->
  <main id="app-dashboard-grid" class="grid-12-col">
    <!-- Separated Search Bar Row (Mandatory E2E Combobox Contract: role="combobox" aria-expanded id="omnibar-root") -->
    <section class="col-12 search-command-row">
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
          <span class="placeholder-text">Search Subs, Warranties, Serial Numbers, or type &gt;tax...</span>
          <kbd class="shortcut-badge">⌘K</kbd>
        </button>
      </div>

      <button
        type="button"
        class="add-entry-btn"
        onclick={() => walletStore.setView('capture')}
      >
        <Plus size={16} />
        <span>Add Entry</span>
      </button>
    </section>

    {#if walletStore.currentView === 'dashboard'}
      <!-- Smart Visual Pulse Row: SVG Spend Donut + Action Radar (Less Text, Zero "Protected Capital" / "Tax Deductible") -->
      <section class="col-12 bento-col-5 visual-pulse-card">
        <div class="donut-widget-layout">
          <div class="donut-svg-box">
            <svg viewBox="0 0 100 100" class="spend-donut-svg" aria-label="Monthly Auto-Pay Breakdown">
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="#E2E8F0"
                stroke-width="11"
              />
              {#each donutSegments.slices as slice (slice.id)}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="none"
                  stroke={slice.color}
                  stroke-width="11"
                  stroke-dasharray={slice.dashArray}
                  stroke-dashoffset={slice.dashOffset}
                  stroke-linecap="butt"
                  transform="rotate(-90 50 50)"
                />
              {/each}
            </svg>
            <div class="donut-center-label">
              <span class="donut-amount">€{walletStore.monthlyAutoPayTotal.toFixed(0)}</span>
              <span class="donut-unit">/ mo</span>
            </div>
          </div>

          <div class="donut-meta-col">
            <div class="pulse-metric-header">
              <span class="pulse-tag">Monthly Auto-Pay</span>
              <span class="pulse-exact">€{walletStore.monthlyAutoPayTotal.toFixed(2)} / mo</span>
            </div>

            <div class="donut-legend-list">
              {#each donutSegments.slices.slice(0, 3) as slice (slice.id)}
                <div class="legend-chip">
                  <span class="legend-dot" style={`background:${slice.color}`}></span>
                  <span class="legend-name">{slice.title}</span>
                  <span class="legend-val">€{slice.monthlyVal.toFixed(2)}</span>
                </div>
              {/each}
            </div>

            <div class="mini-counts-pill-row">
              <span class="mini-count-pill">
                <span class="dot-indicator sub"></span>
                {walletStore.digitalSubscriptions.length} Subs
              </span>
              <span class="mini-count-pill">
                <span class="dot-indicator war"></span>
                {walletStore.hardwareWarranties.length} Warranties
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="col-12 bento-col-7">
        <UrgencyCountdownWidget />
      </section>

      <!-- FIRST GLANCE: Active Subscriptions Ordered by Concurrency (Daily -> Weekly -> Monthly -> Yearly) & Price -->
      <section class="col-12 section-card">
        <div class="card-header">
          <div class="header-title-cluster">
            <RefreshCw size={17} />
            <h3 class="card-title">Active Subscriptions</h3>
            <span class="order-pill">Sorted by Frequency &amp; Price</span>
          </div>
          <span class="count-tag">{walletStore.digitalSubscriptions.length} Subs</span>
        </div>

        {#if walletStore.digitalSubscriptions.length === 0}
          <div class="empty-inline-row">
            <span>No active subscriptions tracked yet.</span>
            <button
              type="button"
              class="inline-add-btn"
              onclick={() => walletStore.setView('capture')}
            >
              + Add Sub
            </button>
          </div>
        {:else}
          <div class="subs-priority-grid">
            {#each walletStore.digitalSubscriptions as sub (sub.id)}
              {@const meta = getSubscriptionConcurrency(sub)}
              {@const days = walletStore.computeDaysRemaining(sub.expiryDate)}
              <div
                class="sub-card"
                onclick={() => walletStore.selectItem(sub)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && walletStore.selectItem(sub)}
              >
                <div class="sub-card-top">
                  <div class="sub-badges">
                    <span
                      class="notif-status-dot"
                      class:urgent={days <= 7}
                      class:soon={days > 7 && days <= 30}
                      title={`${days} days until renewal`}
                    ></span>
                    <span class="concurrency-pill">{meta.label}</span>
                    <!-- Dedicated Payment Indicator (Debated & Standardized in Project Glossary) -->
                    <span
                      class="payment-badge"
                      class:invoice={meta.paymentType === 'invoice'}
                      title={meta.paymentType === 'auto_pay'
                        ? 'Deducted automatically from your account or card'
                        : 'Requires manual invoice transfer'}
                    >
                      <span class="pay-pulse-dot"></span>
                      {meta.paymentLabel}
                    </span>
                  </div>

                  <div class="sub-price-cluster">
                    <span class="sub-price">€{sub.priceGrossEur.toFixed(2)}</span>
                    <span class="sub-cycle-unit">{meta.shortUnit}</span>
                  </div>
                </div>

                <div class="sub-card-main">
                  <div>
                    <h4 class="item-card-title">{sub.title}</h4>
                    <span class="item-card-merchant">{sub.merchantOrProvider}</span>
                  </div>
                  {#if sub.status === 'cancellation_pending'}
                    <span class="pending-cancel-pill">Cancel Pending**</span>
                  {/if}
                </div>

                <div class="sub-card-footer">
                  <span class="friendly-date-text">
                    Next bill: <strong>{formatFriendlyDate(sub.expiryDate, 'long')}</strong>
                    <span class="rel-pill">({formatRelativeRemaining(sub.expiryDate)})</span>
                  </span>

                  <div class="card-action-cluster">
                    <button
                      type="button"
                      class="card-icon-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        walletStore.openEditItem(sub);
                      }}
                      aria-label={`Edit ${sub.title}`}
                      title="Edit Sub"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      class="card-cancel-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        walletStore.openCancellationModal(sub);
                      }}
                      aria-label={`1-Click Cancel ${sub.title}`}
                      title="1-Click Cancel**"
                    >
                      <ExternalLink size={13} />
                      <span>Cancel**</span>
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- ACTIVE WARRANTIES: Zero Product Prices, Zero Redundant Tags, Lifespan Progress Bars -->
      <section class="col-12 section-card">
        <div class="card-header">
          <div class="header-title-cluster">
            <Shield size={17} />
            <h3 class="card-title">Active Warranties</h3>
          </div>
          <span class="count-tag">{walletStore.hardwareWarranties.length} Warranties</span>
        </div>

        {#if walletStore.hardwareWarranties.length === 0}
          <div class="empty-inline-row">
            <span>No product warranties saved yet.</span>
            <button
              type="button"
              class="inline-add-btn"
              onclick={() => walletStore.setView('capture')}
            >
              + Add Warranty
            </button>
          </div>
        {:else}
          <div class="warranties-grid">
            {#each walletStore.hardwareWarranties as war (war.id)}
              {@const cov = computeCoverageProgress(war.purchaseDate, war.expiryDate)}
              <div
                class="warranty-card"
                onclick={() => walletStore.selectItem(war)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && walletStore.selectItem(war)}
              >
                <div class="warranty-card-top">
                  <div class="war-status-left">
                    <span
                      class="notif-status-dot"
                      class:urgent={cov.daysRemaining <= 14}
                      class:soon={cov.daysRemaining > 14 && cov.daysRemaining <= 60}
                    ></span>
                    <span class="easy-claim-pill" class:easy={cov.isEasyClaimPeriod}>
                      {cov.isEasyClaimPeriod ? 'Easy-Claim Period*' : '2-Year Protection*'}
                    </span>
                    {#if war.hasProofOfPurchase || war.receiptSha256}
                      <span class="verified-mini-pill" title="Verified Original Receipt***">
                        ✓ Receipt***
                      </span>
                    {/if}
                  </div>

                  <span class="remaining-time-badge">
                    {formatRelativeRemaining(war.expiryDate)}
                  </span>
                </div>

                <div class="war-card-main">
                  <h4 class="item-card-title">{war.title}</h4>
                  <span class="item-card-merchant">{war.merchantOrProvider}</span>
                </div>

                <!-- Coverage Lifespan Progress Bar (Replaces Product Price) -->
                <div class="coverage-bar-container">
                  <div class="coverage-bar-track">
                    <div
                      class="coverage-bar-fill"
                      class:warning={cov.pctRemaining <= 25}
                      style={`width: ${cov.pctRemaining}%`}
                    ></div>
                  </div>
                  <div class="coverage-bar-labels">
                    <span>Bought {formatFriendlyDate(war.purchaseDate, 'short')}</span>
                    <span>Until {formatFriendlyDate(war.expiryDate, 'long')}</span>
                  </div>
                </div>

                <div class="warranty-card-footer">
                  {#if war.serialNumber}
                    <span class="sn-chip">S/N: {war.serialNumber}</span>
                  {:else}
                    <span class="sn-chip muted">Tap Edit to add S/N</span>
                  {/if}

                  <div class="card-action-cluster">
                    <button
                      type="button"
                      class="card-icon-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        walletStore.openEditItem(war);
                      }}
                      aria-label={`Edit ${war.title}`}
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    {#if war.hasProofOfPurchase}
                      <button
                        type="button"
                        class="card-receipt-btn"
                        onclick={(e) => {
                          e.stopPropagation();
                          walletStore.openReceiptZoom(war);
                        }}
                        aria-label={`Open receipt for ${war.title}`}
                      >
                        <Receipt size={13} />
                        <span>Receipt</span>
                      </button>
                    {/if}
                  </div>
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

      <!-- User-Friendly Starred Legal Glossary Footer with Public Wiki Hyperlinks -->
      <footer class="col-12 app-glossary-footer" aria-label="Consumer Rights Glossary">
        <div class="glossary-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <BookOpen size={15} />
            <span>Quick Guide to Your Consumer Rights</span>
          </div>
          <div style="display: flex; gap: 14px; margin-left: auto;">
            {#if showcaseWikiUrl}
              <a href={showcaseWikiUrl} target="_blank" rel="noopener noreferrer" style="color: var(--color-pine-teal, #2F524C); font-size: 12px; font-weight: 700; text-decoration: underline;">
                Public Wiki ↗
              </a>
            {/if}
            {#if showcaseAdminUrl}
              <a href={showcaseAdminUrl} target="_blank" rel="noopener noreferrer" style="color: var(--color-pine-teal, #2F524C); font-size: 12px; font-weight: 700; text-decoration: underline;">
                ⚡ EmDash CMS Desk ↗
              </a>
            {/if}
          </div>
        </div>
        <div class="glossary-items-grid">
          <div class="glossary-footnote">
            <strong>* Easy-Claim Period &amp; 2-Year Protection:</strong>
            In the first 12 months after buying a product, any defect is automatically presumed to have existed at delivery — you don't need an expert report. Total statutory protection lasts 24 months.
            {#if showcaseWikiUrl}
              <a href={showcaseWikiUrl} target="_blank" rel="noopener noreferrer">
                Learn more (§§ 438, 477 BGB Wiki) &rarr;
              </a>
            {/if}
          </div>
          <div class="glossary-footnote">
            <strong>** 1-Click Cancel &amp; Monthly Cancel Right:</strong>
            Online providers must offer a direct 2-step cancellation button without login walls, and tacitly renewed contracts can be canceled monthly.
            {#if showcaseWikiUrl}
              <a href={showcaseWikiUrl} target="_blank" rel="noopener noreferrer">
                Learn more (§ 312k &amp; § 309 BGB Wiki) &rarr;
              </a>
            {/if}
          </div>
          <div class="glossary-footnote">
            <strong>*** Verified Original Receipt:</strong>
            When you snap a receipt photo, your device computes a tamper-proof cryptographic fingerprint (SHA-256) so stores and tax offices can verify the image was never altered.
            {#if showcaseWikiUrl}
              <a href={showcaseWikiUrl} target="_blank" rel="noopener noreferrer">
                Learn more (Receipt Verification Wiki) &rarr;
              </a>
            {/if}
          </div>
        </div>
      </footer>

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

  <!-- 520px Responsive Detail & Edit Drawer -->
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

  <!-- High-Contrast Kassen-Modus Receipt Zoom Modal -->
  {#if walletStore.activeReceiptZoomItem}
    <ReceiptRegisterZoomModal
      item={walletStore.activeReceiptZoomItem}
      onClose={() => walletStore.closeReceiptZoom()}
    />
  {/if}

  <!-- Dual-Rail Assisted Cancellation Modal -->
  {#if walletStore.activeCancellationItem}
    <AssistedCancellationModal
      item={walletStore.activeCancellationItem}
      onClose={() => walletStore.closeCancellationModal()}
    />
  {/if}
</div>

<style>
  .wallet-shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface-canvas, #F4F7F6);
  }

  /* Clean Header: Only App Icon + Name on Left, Notification Center Button on Right */
  .app-header {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-5, 20px);
    background-color: var(--color-card-white, #FFFFFF);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    position: sticky;
    top: 0;
    z-index: var(--z-index-navbar, 200);
  }

  .brand-cluster {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
  }

  .brand-logo-img {
    display: block;
    border-radius: 9px;
  }

  .brand-title {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--color-ink-primary, #0F172A);
  }

  .header-right {
    position: relative;
    display: flex;
    align-items: center;
  }

  .notif-center-btn {
    position: relative;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: var(--color-card-white, #FFFFFF);
    color: var(--color-ink-primary, #0F172A);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .notif-center-btn:hover {
    border-color: var(--color-pine-teal, #2F524C);
    background: var(--color-surface-subtle, #F8FAFC);
  }

  .notif-dot-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #DC2626;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #FFFFFF;
  }

  .notif-dot-clear {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10B981;
  }

  .notif-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 320px;
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    border-radius: 16px;
    box-shadow: 0 16px 32px -8px rgba(15, 23, 42, 0.18);
    padding: 12px;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .notif-popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #F1F5F9;
  }

  .notif-popover-title {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
  }

  .notif-popover-count {
    font-size: 11px;
    font-weight: 700;
    color: #DC2626;
    background: #FEF2F2;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
  }

  .notif-row-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid #F1F5F9;
    background: #F8FAFC;
    text-align: left;
    cursor: pointer;
  }

  .notif-row-btn:hover {
    border-color: var(--color-pine-teal, #2F524C);
    background: #FFFFFF;
  }

  .notif-item-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D97706;
    flex-shrink: 0;
  }

  .notif-item-dot.critical {
    background: #DC2626;
  }

  .notif-item-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .notif-item-name {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
  }

  .notif-item-date {
    font-size: 11px;
    color: #64748B;
  }

  .notif-empty {
    margin: 0;
    font-size: 12px;
    color: #64748B;
    padding: 8px 4px;
  }

  .notif-popover-footer {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #F1F5F9;
  }

  .notif-util-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    background: #FFFFFF;
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
  }

  .notif-util-btn:hover {
    background: #F1F5F9;
  }

  /* Separated Search Command Row */
  .search-command-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .omnibar-trigger-wrapper {
    flex: 1;
  }

  .omnibar-trigger-btn {
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    background-color: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #CBD5E1);
    border-radius: 14px;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-ink-secondary, #475569);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition: border-color 150ms ease;
  }

  .omnibar-trigger-btn:hover {
    border-color: var(--color-pine-teal, #2F524C);
  }

  .placeholder-text {
    flex: 1;
    text-align: left;
    margin-left: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .shortcut-badge {
    padding: 2px 7px;
    border-radius: 6px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    color: #64748B;
    font-size: 11px;
    font-family: monospace;
  }

  .add-entry-btn {
    height: 44px;
    padding: 0 18px;
    border-radius: 14px;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-weight: 700;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .add-entry-btn:hover {
    background: #233F3A;
  }

  @media (min-width: 1024px) {
    .bento-col-5 {
      grid-column: span 5;
    }
    .bento-col-7 {
      grid-column: span 7;
    }
  }

  /* Visual Pulse Donut Card */
  .visual-pulse-card,
  .section-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 18px);
  }

  .donut-widget-layout {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .donut-svg-box {
    position: relative;
    width: 108px;
    height: 108px;
    flex-shrink: 0;
  }

  .spend-donut-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .donut-center-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .donut-amount {
    font-size: 17px;
    font-weight: 800;
    color: var(--color-ink-primary, #0F172A);
    line-height: 1;
  }

  .donut-unit {
    font-size: 10px;
    font-weight: 600;
    color: #64748B;
  }

  .donut-meta-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .pulse-metric-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .pulse-tag {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pulse-exact {
    font-size: 14px;
    font-weight: 800;
    color: var(--color-pine-teal, #2F524C);
  }

  .donut-legend-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .legend-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-name {
    flex: 1;
    color: #334155;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .legend-val {
    font-weight: 700;
    color: #0F172A;
  }

  .mini-counts-pill-row {
    display: flex;
    gap: 8px;
    margin-top: 2px;
  }

  .mini-count-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .dot-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dot-indicator.sub {
    background: #D96B4B;
  }

  .dot-indicator.war {
    background: #2F524C;
  }

  /* Section Headers */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .header-title-cluster {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-pine-teal, #2F524C);
  }

  .card-title {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: var(--color-ink-primary, #0F172A);
  }

  .order-pill {
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
    background: #F1F5F9;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .count-tag {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 2px 10px;
    border-radius: 999px;
  }

  .empty-inline-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px;
    background: #F8FAFC;
    border-radius: 12px;
    font-size: 13px;
    color: #64748B;
  }

  .inline-add-btn {
    padding: 6px 12px;
    border-radius: 8px;
    border: none;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  /* Subscriptions Grid */
  .subs-priority-grid,
  .warranties-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  .sub-card,
  .warranty-card {
    padding: 15px;
    border-radius: 14px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: var(--color-card-white, #FFFFFF);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
  }

  .sub-card:hover,
  .warranty-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-pine-teal, #2F524C);
    box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.08);
  }

  .sub-card-top,
  .warranty-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .sub-badges,
  .war-status-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .notif-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    flex-shrink: 0;
  }

  .notif-status-dot.soon {
    background: #D97706;
  }

  .notif-status-dot.urgent {
    background: #DC2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
  }

  .concurrency-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    background: #F1F5F9;
    color: #334155;
  }

  .payment-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: #FFF7ED;
    color: #C2410C;
    border: 1px solid #FED7AA;
  }

  .payment-badge.invoice {
    background: #FEFCE8;
    color: #A16207;
    border-color: #FEF08A;
  }

  .pay-pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .sub-price-cluster {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .sub-price {
    font-size: 17px;
    font-weight: 800;
    color: var(--color-ink-primary, #0F172A);
  }

  .sub-cycle-unit {
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
  }

  .sub-card-main,
  .war-card-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .item-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-ink-primary, #0F172A);
  }

  .item-card-merchant {
    font-size: 12px;
    color: #64748B;
  }

  .pending-cancel-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    background: #FEF3C7;
    color: #92400E;
  }

  .sub-card-footer,
  .warranty-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #F1F5F9;
    margin-top: auto;
  }

  .friendly-date-text {
    font-size: 12px;
    color: #475569;
  }

  .rel-pill {
    font-size: 11px;
    color: #64748B;
    margin-left: 2px;
  }

  .card-action-cluster {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-icon-btn,
  .card-cancel-btn,
  .card-receipt-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .card-icon-btn {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #334155;
  }

  .card-icon-btn:hover {
    background: #E2E8F0;
  }

  .card-cancel-btn {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #991B1B;
  }

  .card-cancel-btn:hover {
    background: #FEE2E2;
  }

  .card-receipt-btn {
    background: rgba(47, 82, 76, 0.1);
    border-color: rgba(47, 82, 76, 0.2);
    color: var(--color-pine-teal, #2F524C);
  }

  /* Warranty Card Specifics */
  .easy-claim-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    background: #F1F5F9;
    color: #334155;
  }

  .easy-claim-pill.easy {
    background: #DCFCE7;
    color: #166534;
  }

  .verified-mini-pill {
    font-size: 10px;
    font-weight: 700;
    color: #059669;
    background: #ECFDF5;
    padding: 2px 6px;
    border-radius: 999px;
  }

  .remaining-time-badge {
    font-size: 12px;
    font-weight: 800;
    color: var(--color-pine-teal, #2F524C);
  }

  .coverage-bar-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .coverage-bar-track {
    width: 100%;
    height: 7px;
    border-radius: 999px;
    background: #E2E8F0;
    overflow: hidden;
  }

  .coverage-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-pine-teal, #2F524C);
  }

  .coverage-bar-fill.warning {
    background: #D97706;
  }

  .coverage-bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748B;
  }

  .sn-chip {
    font-family: monospace;
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    background: #F8FAFC;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #E2E8F0;
  }

  .sn-chip.muted {
    font-family: inherit;
    color: #94A3B8;
    border-style: dashed;
  }

  /* Footer Glossary */
  .app-glossary-footer {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .glossary-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--color-pine-teal, #2F524C);
  }

  .glossary-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }

  .glossary-footnote {
    font-size: 12px;
    color: #475569;
    line-height: 1.45;
    background: #F8FAFC;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #F1F5F9;
  }

  .glossary-footnote strong {
    color: #0F172A;
    display: block;
    margin-bottom: 2px;
  }

  .glossary-footnote a {
    display: inline-block;
    margin-top: 4px;
    color: var(--color-pine-teal, #2F524C);
    font-weight: 700;
    text-decoration: underline;
  }
</style>
