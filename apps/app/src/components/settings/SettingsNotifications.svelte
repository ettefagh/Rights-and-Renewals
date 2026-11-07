<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore } from '../../state/wallet.svelte';
  import {
    setThemeMode,
    applyCustomDesignTokens,
    resetCustomDesignTokens,
    BUILTIN_THEME_PRESETS,
    type ThemeMode
  } from '@cmlab/design-tokens/themeEngine';
  import {
    Bell,
    Calendar,
    Copy,
    Download,
    ExternalLink,
    Check,
    Smartphone,
    Sun,
    Moon,
    Laptop,
    Palette
  } from 'lucide-svelte';

  // 4 Granular Category Toggles
  let notifyWiderruf = $state(true);
  let notifyWarranty = $state(true);
  let notifySubscriptions = $state(true);
  let notifyTax = $state(true);

  // Master Web Push State
  let isPushSupported = $state(false);
  let isPushSubscribed = $state(false);
  let pushLoading = $state(false);

  // Theme & Preset State
  let activeThemeMode = $state<ThemeMode>('light');
  let activePresetKey = $state<string>('pine-coral');

  // Copy Feedback State
  let copiedFeed = $state<'subscriptions' | 'warranties' | null>(null);

  // Dynamic Feed URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.cm-lab.de';
  const tokenParam = walletStore.icalToken ? `/${walletStore.icalToken}` : '/default';
  const subFeedUrl = `${origin}/api/ical/subscriptions${tokenParam}`;
  const warFeedUrl = `${origin}/api/ical/warranties${tokenParam}`;
  const subWebcalUrl = subFeedUrl.replace(/^https?:\/\//i, 'webcal://');
  const warWebcalUrl = warFeedUrl.replace(/^https?:\/\//i, 'webcal://');

  onMount(() => {
    // Read theme mode
    const storedMode = localStorage.getItem('cmlab_theme_mode') as ThemeMode | null;
    if (storedMode) {
      activeThemeMode = storedMode;
      setThemeMode(storedMode);
    }

    // Check push support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      isPushSupported = true;
    }
  });

  function handleThemeChange(mode: ThemeMode) {
    activeThemeMode = mode;
    setThemeMode(mode);
  }

  function handlePresetChange(presetKey: string) {
    activePresetKey = presetKey;
    if (presetKey === 'pine-coral') {
      resetCustomDesignTokens();
    } else {
      const preset = BUILTIN_THEME_PRESETS[presetKey];
      if (preset) {
        applyCustomDesignTokens(preset.tokens);
      }
    }
  }

  async function handleTogglePush() {
    if (!isPushSupported) return;
    pushLoading = true;
    try {
      if (typeof Notification !== 'undefined') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          isPushSubscribed = true;
        }
      }
    } catch (err) {
      console.error('Failed to request push notification permission:', err);
    } finally {
      pushLoading = false;
    }
  }

  async function copyToClipboard(text: string, type: 'subscriptions' | 'warranties') {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      copiedFeed = type;
      setTimeout(() => {
        copiedFeed = null;
      }, 2000);
    }
  }

  function downloadLocalIcs(type: 'subscriptions' | 'warranties') {
    const link = document.createElement('a');
    link.href = type === 'subscriptions' ? `${origin}/api/calendar/subscriptions.ics` : `${origin}/api/calendar/warranties.ics`;
    link.download = `${type}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="settings-panel">
  <div class="panel-header">
    <div class="header-icon">
      <Bell size={22} color="#2F524C" />
    </div>
    <div>
      <h2 class="panel-title">Settings & Notifications</h2>
      <p class="panel-subtitle">
        Manage theme appearance, deadline alert categories, and live RFC 5545 calendar subscriptions.
      </p>
    </div>
  </div>

  <!-- Section 1: Appearance & Custom Design Tokens -->
  <section class="settings-card">
    <div class="section-title-wrap">
      <Palette size={18} />
      <h3 class="card-section-title">Theme & Color Palette</h3>
    </div>
    <div class="theme-controls">
      <div class="mode-toggles">
        <button
          type="button"
          class="theme-mode-btn"
          class:active={activeThemeMode === 'light'}
          onclick={() => handleThemeChange('light')}
        >
          <Sun size={16} />
          <span>Light</span>
        </button>
        <button
          type="button"
          class="theme-mode-btn"
          class:active={activeThemeMode === 'dark'}
          onclick={() => handleThemeChange('dark')}
        >
          <Moon size={16} />
          <span>Dark</span>
        </button>
        <button
          type="button"
          class="theme-mode-btn"
          class:active={activeThemeMode === 'system'}
          onclick={() => handleThemeChange('system')}
        >
          <Laptop size={16} />
          <span>System</span>
        </button>
      </div>

      <div class="preset-selector-wrap">
        <label for="theme-preset-select" class="field-label">Custom Design Token Preset:</label>
        <select
          id="theme-preset-select"
          class="preset-select"
          value={activePresetKey}
          onchange={(e) => handlePresetChange((e.target as HTMLSelectElement).value)}
        >
          {#each Object.entries(BUILTIN_THEME_PRESETS) as [key, preset]}
            <option value={key}>{preset.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </section>

  <!-- Section 2: Urgency Alert Categories -->
  <section class="settings-card">
    <div class="section-title-wrap">
      <Bell size={18} />
      <h3 class="card-section-title">Deadline & Urgency Alert Channels</h3>
    </div>

    <!-- Master Web Push Toggle -->
    <div class="master-push-banner">
      <div class="push-info">
        <strong>Master Web Push Notifications</strong>
        <span class="sub-hint">Receives 09:00 Europe/Berlin wall-clock notifications.</span>
      </div>
      <button
        type="button"
        class="push-toggle-btn"
        class:subscribed={isPushSubscribed}
        onclick={handleTogglePush}
        disabled={pushLoading}
      >
        {isPushSubscribed ? '✓ Push Active' : 'Enable Web Push'}
      </button>
    </div>

    <div class="toggle-list">
      <label class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-title">14-Day Widerrufsfrist Alerts</span>
          <span class="toggle-desc">Statutory cooling-off cancellation notice window (§ 355 BGB).</span>
        </div>
        <input type="checkbox" bind:checked={notifyWiderruf} class="switch-input" />
      </label>

      <label class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-title">Hardware Warranty & § 477 Cliffs</span>
          <span class="toggle-desc">Month 11 (Day 335) reversed burden-of-proof alert & 24m statutory expiry (§ 438 BGB).</span>
        </div>
        <input type="checkbox" bind:checked={notifyWarranty} class="switch-input" />
      </label>

      <label class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-title">Subscription Renewals & Cancellation Guards</span>
          <span class="toggle-desc">T-30d, T-7d, T-1d rolling cancellation notice windows under BGB § 309 Nr. 9.</span>
        </div>
        <input type="checkbox" bind:checked={notifySubscriptions} class="switch-input" />
      </label>

      <label class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-title">Annual Tax Reminders (§ 9 EStG)</span>
          <span class="toggle-desc">ELSTER Werbungskosten filing preparation & 1-year digital AfA write-off milestones.</span>
        </div>
        <input type="checkbox" bind:checked={notifyTax} class="switch-input" />
      </label>
    </div>
  </section>

  <!-- Section 3: Dual RFC 5545 iCal Subscription Feeds -->
  <section class="settings-card">
    <div class="section-title-wrap">
      <Calendar size={18} />
      <h3 class="card-section-title">Dual RFC 5545 Live Calendar Feeds</h3>
    </div>
    <p class="feed-desc">
      Subscribe to live calendar feeds syncing directly with Apple Calendar, Google Calendar, or Outlook.
    </p>

    <div class="feed-grid">
      <!-- Feed Card 1: Subscriptions -->
      <div class="calendar-card">
        <div class="card-top">
          <span class="feed-badge">Digital Subscriptions</span>
          <h4 class="feed-card-title">subscriptions.ics</h4>
        </div>
        <p class="feed-card-desc">
          Recurring billing dates and BGB § 309 Nr. 9 cancellation windows with VALARM at -P7D and -P1D.
        </p>

        <div class="btn-group">
          <a href={subWebcalUrl} class="action-btn-primary">
            <Smartphone size={14} />
            <span>Apple Cal</span>
          </a>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(subWebcalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            class="action-btn-secondary"
          >
            <ExternalLink size={14} />
            <span>Google Cal</span>
          </a>
          <button
            type="button"
            class="action-btn-secondary"
            onclick={() => copyToClipboard(subFeedUrl, 'subscriptions')}
          >
            {#if copiedFeed === 'subscriptions'}
              <Check size={14} color="#059669" />
              <span>Copied!</span>
            {:else}
              <Copy size={14} />
              <span>Copy URL</span>
            {/if}
          </button>
          <button
            type="button"
            class="action-btn-secondary"
            onclick={() => downloadLocalIcs('subscriptions')}
          >
            <Download size={14} />
            <span>.ics File</span>
          </button>
        </div>
      </div>

      <!-- Feed Card 2: Warranties -->
      <div class="calendar-card">
        <div class="card-top">
          <span class="feed-badge badge-warning">Hardware & Cliffs</span>
          <h4 class="feed-card-title">warranties.ics</h4>
        </div>
        <p class="feed-card-desc">
          14d Widerruf, Day 335 § 477 Beweislastumkehr cliff, and 24m statutory expiry with VALARM triggers.
        </p>

        <div class="btn-group">
          <a href={warWebcalUrl} class="action-btn-primary">
            <Smartphone size={14} />
            <span>Apple Cal</span>
          </a>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(warWebcalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            class="action-btn-secondary"
          >
            <ExternalLink size={14} />
            <span>Google Cal</span>
          </a>
          <button
            type="button"
            class="action-btn-secondary"
            onclick={() => copyToClipboard(warFeedUrl, 'warranties')}
          >
            {#if copiedFeed === 'warranties'}
              <Check size={14} color="#059669" />
              <span>Copied!</span>
            {:else}
              <Copy size={14} />
              <span>Copy URL</span>
            {/if}
          </button>
          <button
            type="button"
            class="action-btn-secondary"
            onclick={() => downloadLocalIcs('warranties')}
          >
            <Download size={14} />
            <span>.ics File</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-surface-subtle, #F1F5F9);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .panel-title {
    margin: 0;
    font-size: var(--font-size-xl, 20px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .panel-subtitle {
    margin: 2px 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .settings-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
  }

  .section-title-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    margin-bottom: var(--space-3, 12px);
    color: var(--color-pine-teal, #2F524C);
  }

  .card-section-title {
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-ink-primary, #0F172A);
  }

  .theme-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
  }

  .mode-toggles {
    display: flex;
    gap: 8px;
  }

  .theme-mode-btn {
    flex: 1;
    height: 38px;
    border-radius: var(--radius-sm, 8px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: var(--color-surface-canvas, #F4F7F6);
    color: var(--color-ink-primary, #0F172A);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-medium, 500);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .theme-mode-btn.active {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border-color: var(--color-pine-teal, #2F524C);
  }

  .preset-selector-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .preset-select {
    height: 38px;
    border-radius: var(--radius-sm, 8px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    padding: 0 10px;
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    font-size: var(--font-size-sm, 14px);
  }

  .master-push-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-surface-subtle, #F1F5F9);
    padding: var(--space-3, 12px);
    border-radius: var(--radius-md, 12px);
    margin-bottom: var(--space-3, 12px);
  }

  .push-info {
    display: flex;
    flex-direction: column;
    font-size: var(--font-size-sm, 14px);
  }

  .sub-hint {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .push-toggle-btn {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    padding: 8px 14px;
    border-radius: var(--radius-sm, 6px);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
  }

  .push-toggle-btn.subscribed {
    background: var(--color-protected-green, #059669);
  }

  .toggle-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-3, 12px);
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    cursor: pointer;
  }

  .toggle-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .toggle-info {
    display: flex;
    flex-direction: column;
  }

  .toggle-title {
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-semibold, 600);
  }

  .toggle-desc {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .switch-input {
    width: 20px;
    height: 20px;
    accent-color: var(--color-pine-teal, #2F524C);
    cursor: pointer;
  }

  .feed-desc {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
    margin: 0 0 var(--space-4, 16px);
  }

  .feed-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4, 16px);
  }

  .calendar-card {
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
    padding: var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2, 8px);
  }

  .feed-badge {
    padding: 2px 8px;
    border-radius: 4px;
    background: #E9EFEF;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-pine-teal, #2F524C);
  }

  .badge-warning {
    background: #FEF3C7;
    color: #92400E;
  }

  .feed-card-title {
    margin: 0;
    font-family: monospace;
    font-size: var(--font-size-sm, 14px);
  }

  .feed-card-desc {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
    margin: 0 0 var(--space-4, 16px);
  }

  .btn-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2, 8px);
  }

  .action-btn-primary, .action-btn-secondary {
    height: 36px;
    border-radius: var(--radius-sm, 6px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: var(--font-size-xs, 12px);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }

  .action-btn-primary {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
  }

  .action-btn-secondary {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    color: var(--color-ink-primary, #0F172A);
  }
</style>
