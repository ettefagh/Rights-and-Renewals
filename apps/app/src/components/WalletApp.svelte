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
    Receipt,
    Shield,
    ExternalLink,
    Pencil,
    Sun,
    Moon,
    BookOpen,
    RefreshCw,
    CalendarDays,
    LockKeyhole,
    ChevronRight
  } from 'lucide-svelte';

  let isDarkTheme = $state(false);
  let isNotifCenterOpen = $state(false);
  let activeWorkspace = $state<'deadlines' | 'vault'>('deadlines');
  let selectedDeadlineId = $state<string | null>(null);

  let deadlineItems = $derived.by(() =>
    walletStore.items
      .filter((item) => item.status === 'active' || item.status === 'expiring_soon' || item.status === 'cancellation_pending')
      .filter((item) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) return false;
        const date = new Date(`${item.expiryDate}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === item.expiryDate;
      })
      .filter((item) => walletStore.computeDaysRemaining(item.expiryDate) >= 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
  );
  let selectedDeadline = $derived(
    deadlineItems.find((item) => item.id === selectedDeadlineId) ?? deadlineItems[0] ?? null
  );

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
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search size={18} aria-hidden="true" />
          <span>Search wallet</span>
        </button>
      </div>
    </section>

    {#if walletStore.currentView === 'dashboard'}
      {#if activeWorkspace === 'deadlines'}
        <section class="col-12 deadlines-workspace" aria-labelledby="deadlines-title">
          <div class="deadlines-heading">
            <div>
              <p class="workspace-eyebrow">On this device</p>
              <h1 id="deadlines-title">Deadlines</h1>
              <p class="workspace-subtitle">What needs your attention</p>
            </div>
            <span class="today-date">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span>
          </div>

          <div class="deadlines-master-detail">
            <section class="deadline-list" aria-label="Upcoming deadlines">
              {#if deadlineItems.length === 0}
                <div class="deadline-empty">
                  <CalendarDays size={24} aria-hidden="true" />
                  <h2>No upcoming deadlines</h2>
                  <p>Items saved in your wallet with a future date will appear here.</p>
                  <button type="button" class="deadline-primary-action" onclick={() => walletStore.setView('capture')}>Add an item</button>
                </div>
              {:else}
                {#each deadlineItems as item (item.id)}
                  {@const days = walletStore.computeDaysRemaining(item.expiryDate)}
                  <button
                    type="button"
                    class="deadline-row"
                    class:selected={selectedDeadline?.id === item.id}
                    aria-pressed={selectedDeadline?.id === item.id}
                    onclick={() => (selectedDeadlineId = item.id)}
                  >
                    <CalendarDays size={22} aria-hidden="true" />
                    <span class="deadline-row-copy">
                      <strong>{item.title}</strong>
                      <span>{item.category === 'subscription' ? 'Renewal' : 'Warranty ends'} · {formatFriendlyDate(item.expiryDate, 'short')}</span>
                    </span>
                    <span class="deadline-countdown" class:critical={days <= 7}>{days === 0 ? 'Today' : `${days} days`}</span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                {/each}
              {/if}
            </section>

            {#if selectedDeadline}
              <aside class="deadline-detail" aria-label={`Details for ${selectedDeadline.title}`}>
                <div class="deadline-detail-heading">
                  <CalendarDays size={30} aria-hidden="true" />
                  <div>
                    <h2>{selectedDeadline.title}</h2>
                    <p>{selectedDeadline.category === 'subscription' ? 'Subscription' : 'Purchase protection'}</p>
                  </div>
                </div>
                <p class="deadline-date-panel">
                  <strong>{selectedDeadline.category === 'subscription' ? 'Next renewal' : 'Warranty end'}</strong>
                  <span>{formatFriendlyDate(selectedDeadline.expiryDate, 'long')}</span>
                </p>
                <p class="deadline-merchant">{selectedDeadline.merchantOrProvider}</p>
                {#if selectedDeadline.category === 'subscription'}
                  <button type="button" class="deadline-primary-action" onclick={() => walletStore.openCancellationModal(selectedDeadline!)}>Prepare cancellation</button>
                {:else if selectedDeadline.hasProofOfPurchase}
                  <button type="button" class="deadline-primary-action" onclick={() => walletStore.openReceiptZoom(selectedDeadline!)}>View receipt</button>
                {/if}
                <button type="button" class="deadline-secondary-action" onclick={() => walletStore.selectItem(selectedDeadline)}>Open wallet item</button>
              </aside>
            {/if}
          </div>
        </section>
      {:else}
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
      {/if}

    {:else if walletStore.currentView === 'capture'}
      <section class="col-12">
        <div class="capture-workspace">
          <QuickCaptureModal />
          {#if selectedDeadline}
            <aside class="capture-deadline-support" aria-label="Next upcoming deadline">
              <div class="capture-support-icon"><CalendarDays size={21} aria-hidden="true" /></div>
              <div>
                <p>Next deadline</p>
                <strong>{selectedDeadline.title}</strong>
                <span>{selectedDeadline.category === 'subscription' ? 'Renewal' : 'Warranty ends'} · {formatFriendlyDate(selectedDeadline.expiryDate, 'short')}</span>
              </div>
              <button
                type="button"
                aria-label={`Open deadline for ${selectedDeadline.title}`}
                onclick={() => {
                  activeWorkspace = 'deadlines';
                  walletStore.setView('dashboard');
                }}
              ><ChevronRight size={20} aria-hidden="true" /></button>
            </aside>
          {/if}
        </div>
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

  <nav class="wallet-bottom-nav" aria-label="Wallet navigation">
    <button
      type="button"
      class="wallet-nav-link"
      class:active={walletStore.currentView === 'dashboard' && activeWorkspace === 'deadlines'}
      aria-current={walletStore.currentView === 'dashboard' && activeWorkspace === 'deadlines' ? 'page' : undefined}
      onclick={() => {
        activeWorkspace = 'deadlines';
        walletStore.setView('dashboard');
      }}
    ><CalendarDays size={20} aria-hidden="true" /><span>Deadlines</span></button>
    <button
      type="button"
      class="wallet-nav-link"
      class:active={walletStore.currentView === 'dashboard' && activeWorkspace === 'vault'}
      aria-current={walletStore.currentView === 'dashboard' && activeWorkspace === 'vault' ? 'page' : undefined}
      onclick={() => {
        activeWorkspace = 'vault';
        walletStore.setView('dashboard');
      }}
    ><LockKeyhole size={20} aria-hidden="true" /><span>Vault</span></button>
    {#if showcaseWikiUrl}
      <a class="wallet-nav-link" href={showcaseWikiUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={20} aria-hidden="true" /><span>Wiki</span></a>
    {/if}
  </nav>

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
    --workspace-gutter: clamp(18px, 3vw, 42px);
    --wallet-dock-left: max(12px, calc((100% - 370px) / 2));
    --wallet-dock-right: var(--wallet-dock-left);
    --wallet-dock-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface-canvas, #F4F7F6);
    padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .col-12 {
    grid-column: 1 / -1;
  }

  .deadlines-workspace {
    padding: var(--workspace-gutter) var(--workspace-gutter) 28px;
  }

  .deadlines-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin: 0 0 24px;
  }

  .workspace-eyebrow { margin: 0 0 5px; color: var(--color-ink-secondary, #526561); font-size: 14px; }
  .deadlines-heading h1 { margin: 0; font-size: clamp(30px, 4vw, 44px); letter-spacing: -0.04em; color: var(--color-ink-primary, #10201d); }
  .workspace-subtitle { margin: 5px 0 0; font-size: 17px; color: var(--color-ink-secondary, #526561); }
  .today-date { color: var(--color-ink-secondary, #526561); white-space: nowrap; }

  .deadlines-master-detail { display: grid; grid-template-columns: minmax(300px, 1.2fr) minmax(300px, 0.9fr); gap: clamp(18px, 3vw, 36px); align-items: stretch; }
  .deadline-list { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .deadline-row { min-height: 78px; width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 18px; text-align: left; color: var(--color-ink-primary, #10201d); border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 14px; background: var(--color-card-white, #fff); cursor: pointer; }
  .deadline-row > :first-child { color: #b95c15; flex-shrink: 0; }
  .deadline-row.selected { border-color: var(--color-pine-teal, #18765f); background: rgba(20, 137, 106, 0.07); box-shadow: inset 0 0 0 1px var(--color-pine-teal, #18765f); }
  .deadline-row-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .deadline-row-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; }
  .deadline-row-copy span { color: var(--color-ink-secondary, #526561); font-size: 14px; }
  .deadline-countdown { white-space: nowrap; padding: 7px 10px; border-radius: 999px; background: #fff0dc; color: #a84f0c; font-weight: 700; font-size: 13px; }
  .deadline-countdown.critical { background: #ffeadb; color: #b9470b; }
  .deadline-detail { min-height: 300px; padding: clamp(20px, 3vw, 32px); border-left: 1px solid var(--color-border-subtle, #d1d9d6); display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
  .deadline-detail-heading { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
  .deadline-detail-heading > :first-child { color: #bd5b16; }
  .deadline-detail-heading h2 { margin: 0; font-size: 28px; letter-spacing: -0.03em; }
  .deadline-detail-heading p { margin: 3px 0 0; color: var(--color-ink-secondary, #526561); }
  .deadline-date-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding: 18px; border-radius: 14px; background: #fff0df; color: #7a380c; }
  .deadline-merchant { margin: 0; color: var(--color-ink-secondary, #526561); }
  .deadline-primary-action, .deadline-secondary-action { min-height: 50px; padding: 12px 18px; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; }
  .deadline-primary-action { border: 1px solid var(--color-pine-teal, #126b56); background: var(--color-pine-teal, #126b56); color: #fff; }
  .deadline-secondary-action { border: 1px solid var(--color-pine-teal, #126b56); background: transparent; color: var(--color-pine-teal, #126b56); }
  .deadline-empty { display: grid; justify-items: start; gap: 8px; padding: 28px; border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 16px; background: var(--color-card-white, #fff); }
  .deadline-empty h2, .deadline-empty p { margin: 0; }
  .deadline-empty p { color: var(--color-ink-secondary, #526561); }

  .wallet-bottom-nav { position: fixed; z-index: var(--z-index-navbar, 200); left: var(--wallet-dock-left); right: calc(var(--wallet-dock-right) + 68px); bottom: var(--wallet-dock-bottom); display: flex; align-items: center; gap: 4px; padding: 7px; border: 1px solid var(--color-border-subtle, rgba(180, 196, 190, 0.82)); border-radius: 999px; background: var(--color-card-white, #fff); backdrop-filter: blur(16px); box-shadow: 0 8px 28px rgba(22, 51, 44, 0.14); }
  .wallet-nav-link { flex: 1; min-width: 0; min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 13px; border: 0; border-radius: 999px; color: var(--color-ink-primary, #10201d); background: transparent; text-decoration: none; font: inherit; font-size: 12px; cursor: pointer; }
  .wallet-nav-link.active { background: rgba(29, 153, 116, 0.12); color: #086849; font-weight: 700; }
  .wallet-nav-link:focus-visible { outline: 3px solid #16765e; outline-offset: 2px; }

  @supports (background: color-mix(in srgb, white 90%, transparent)) {
    .wallet-bottom-nav { background: color-mix(in srgb, var(--color-card-white, #fff) 88%, transparent); }
  }

  :global([data-theme="dark"]) .wallet-nav-link.active { background: #1f4038; color: #c5f5e8; }

  .capture-workspace { display: flex; flex-direction: column; gap: 16px; max-width: 1160px; margin: 0 auto; }
  .capture-deadline-support { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--color-border-subtle, #cbd5d1); border-radius: 14px; background: var(--color-card-white, #fff); }
  .capture-support-icon { display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 12px; color: #b95c15; background: #fff0df; }
  .capture-deadline-support > div:nth-child(2) { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .capture-deadline-support p, .capture-deadline-support strong, .capture-deadline-support span { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .capture-deadline-support p, .capture-deadline-support span { color: var(--color-ink-secondary, #526561); font-size: 13px; }
  .capture-deadline-support strong { font-size: 16px; }
  .capture-deadline-support button { width: 48px; height: 48px; flex: 0 0 48px; display: grid; place-items: center; border: 0; border-radius: 12px; color: var(--color-pine-teal, #126b56); background: transparent; cursor: pointer; }
  .capture-deadline-support button:focus-visible { outline: 3px solid #16765e; }

  @media (max-width: 767px) {
    .wallet-shell { --workspace-gutter: 16px; }
    .deadlines-workspace { padding-block: 20px 26px; }
    .deadlines-heading { align-items: flex-start; }
    .today-date { padding-top: 7px; font-size: 13px; }
    .deadlines-master-detail { grid-template-columns: minmax(0, 1fr); }
    .deadline-detail { border-left: 0; border-top: 1px solid var(--color-border-subtle, #d1d9d6); min-height: 0; padding: 20px 4px 4px; }
    .deadline-row { padding: 12px; gap: 9px; }
    .deadline-row-copy strong { font-size: 15px; }
    .deadline-row-copy span { font-size: 12px; }
    .deadline-countdown { font-size: 11px; padding: 6px 8px; }
    .wallet-bottom-nav { padding: 5px; }
    .wallet-nav-link { min-height: 52px; }
    .wallet-shell { padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)); }
    .capture-workspace { gap: 12px; }
  }

  @media (horizontal-viewport-segments: 2) {
    .wallet-shell {
      --wallet-segment-inset: max(12px, calc((env(viewport-segment-width 0 0, 50vw) - 370px) / 2));
      --wallet-dock-left: calc(env(viewport-segment-left 0 0, 0px) + var(--wallet-segment-inset));
      --wallet-dock-right: calc(100vw - env(viewport-segment-right 0 0, 50vw) + var(--wallet-segment-inset));
    }
    .search-command-row { max-width: calc(env(viewport-segment-width 0 0, 50vw) - 24px); }
    .deadlines-master-detail { grid-template-columns: minmax(0, calc(env(viewport-segment-width 0 0, 50vw) - var(--workspace-gutter) - 24px)) minmax(0, calc(env(viewport-segment-width 1 0, 50vw) - var(--workspace-gutter) - 24px)); gap: calc(env(viewport-segment-left 1 0, 50vw) - env(viewport-segment-right 0 0, 50vw) + 48px); }
    .deadline-list { padding-right: 18px; }
    .deadline-detail { padding-left: 24px; }
    .wallet-nav-link { padding-inline: 4px; }
    .capture-workspace { max-width: none; display: grid; grid-template-columns: minmax(0, calc(env(viewport-segment-width 0 0, 50vw) - 24px)) minmax(0, calc(env(viewport-segment-width 1 0, 50vw) - 24px)); gap: calc(env(viewport-segment-left 1 0, 50vw) - env(viewport-segment-right 0 0, 50vw) + 48px); align-items: start; }
    .capture-workspace :global(.capture-panel) { grid-column: 1; }
    .capture-deadline-support { grid-column: 2; margin-top: 64px; }
  }

  @media (max-width: 360px) {
    .wallet-nav-link { padding-inline: 4px; font-size: 10px; white-space: nowrap; }
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
    min-width: 0;
    padding-inline: var(--workspace-gutter);
  }

  .omnibar-trigger-wrapper {
    max-width: 560px;
  }

  .omnibar-trigger-btn {
    width: 100%;
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 10px;
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

  .omnibar-trigger-btn:focus-visible {
    outline: 3px solid var(--color-pine-teal, #2F524C);
    outline-offset: 2px;
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
