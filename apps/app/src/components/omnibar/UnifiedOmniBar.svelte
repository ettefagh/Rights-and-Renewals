<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { policySeedData, type PolicyWikiEntry, type WalletItem } from '@cmlab/core';
  import { walletStore } from '../../state/wallet.svelte';
  import { fetchPublishedWiki } from '../../lib/wiki-cms-client';
  import { getShowcaseUrl } from '../../lib/showcase-url';
  import { parseOmniCommand, projectWalletSearchItem, searchWalletItems, searchWikiPolicies, type OmniCommand, type WalletSearchProjection } from '../../lib/omnibar-search';
  import { Search, Shield, Sparkles, Receipt, X, BookOpen, Camera } from 'lucide-svelte';

  type OmniResult = {
    id: string;
    kind: 'wallet' | 'wiki' | 'action';
    title: string;
    subtitle: string;
    badge?: string;
    walletItem?: WalletItem;
    walletProjection?: WalletSearchProjection;
    wikiEntry?: PolicyWikiEntry;
    command?: OmniCommand;
    argument?: string;
    score?: number;
  };

  let query = $state('');
  let activeResultId = $state<string | null>(null);
  let dialogElement = $state<HTMLDialogElement | null>(null);
  let inputElement = $state<HTMLInputElement | null>(null);
  let wikiPolicies = $state.raw<PolicyWikiEntry[]>(policySeedData);
  let wikiSourceStatus = $state<'published' | 'offline'>('offline');

  onMount(() => {
    void fetchPublishedWiki(getShowcaseUrl('/api/emdash/wiki'))
      .then((published) => { wikiPolicies = published.policies; wikiSourceStatus = 'published'; })
      .catch(() => { wikiPolicies = policySeedData; wikiSourceStatus = 'offline'; });
  });

  // The native dialog supplies modal focus containment and restores focus to its invoker on close.
  $effect(() => {
    const shouldOpen = walletStore.isOmnibarOpen;
    if (!dialogElement) return;
    if (shouldOpen && !dialogElement.open) {
      dialogElement.showModal();
      inputElement?.focus();
    } else if (!shouldOpen && dialogElement.open) {
      dialogElement.close();
    }
  });

  function resultId(index: number) {
    return `omnibar-option-${index}`;
  }

  function setActiveIndex(index: number) {
    const target = results[index];
    activeResultId = target?.id ?? null;
    if (target) void tick().then(() => document.getElementById(resultId(index))?.scrollIntoView({ block: 'nearest' }));
  }

  function action(command: OmniCommand, title: string, subtitle: string, argument = ''): OmniResult {
    return { id: `action-${command}-${argument}`, kind: 'action', command, title, subtitle, argument };
  }

  let results = $derived.by<OmniResult[]>(() => {
    const trimmed = query.trim();
    const parsed = parseOmniCommand(trimmed);
    if (!trimmed) {
      return [
        action('add', 'Add an item', 'Capture a receipt or enter a purchase manually'),
        action('wiki', 'Open the Policy Wiki', 'Browse published guidance and the offline policy catalog'),
        action('tax', 'Tax summary', 'Review tax deductible items')
      ];
    }

    if (parsed) {
      const term = parsed.argument;
      switch (parsed.command) {
        case 'add': return [action('add', term ? `Add “${term}”` : 'Add an item', 'Capture a receipt or enter a purchase manually', term)];
        case 'wiki':
          return term
            ? searchWikiPolicies(term, wikiPolicies, 8).map(({ item }) => ({ id: `wiki-${item.brandSlug}`, kind: 'wiki', title: item.brandName, subtitle: `${item.category} · ${item.legalNotes}`, badge: 'Wiki', wikiEntry: item }))
            : [action('wiki', 'Open the Policy Wiki', 'Browse published guidance and the offline policy catalog')];
        case 'tax': return term ? [] : [action('tax', 'Open tax summary', 'Review tax deductible items')];
        case 'claim':
          return term
            ? searchWalletItems(term, walletStore.items, 8).map(({ item, projection }) => ({ id: `claim-${String(item.id)}`, kind: 'wallet', title: `Select for claim: ${projection.title}`, subtitle: `${projection.merchantOrProvider} · Review actions in item details`, badge: 'Claim', walletItem: item, walletProjection: projection, command: 'claim' }))
            : [];
        case 'cancel':
          return term
            ? searchWalletItems(term, walletStore.items.filter((item) => projectWalletSearchItem(item).category === 'subscription'), 8).map(({ item, projection }) => ({ id: `cancel-${String(item.id)}`, kind: 'wallet', title: `Select subscription: ${projection.title}`, subtitle: `${projection.merchantOrProvider} · Review cancellation options in item details`, badge: 'Cancel', walletItem: item, walletProjection: projection, command: 'cancel' }))
            : [];
        default: return [];
      }
    }

    const walletMatches = searchWalletItems(trimmed, walletStore.items, 8).map(({ item, projection, score }) => ({
      id: `wallet-${String(item.id)}`, kind: 'wallet' as const, title: projection.title,
      subtitle: `${projection.merchantOrProvider} · ${projection.priceLabel}`,
      badge: projection.category, walletItem: item, walletProjection: projection, score
    }));
    const wikiMatches = searchWikiPolicies(trimmed, wikiPolicies, 8).map(({ item, score }) => ({
      id: `wiki-${item.brandSlug}`, kind: 'wiki' as const, title: item.brandName,
      subtitle: `${item.category} · ${item.legalNotes}`,
      badge: 'Wiki', wikiEntry: item, score
    }));
    const matches = [...walletMatches, ...wikiMatches]
      .sort((a, b) => b.score - a.score || (a.kind === b.kind ? 0 : a.kind === 'wallet' ? -1 : 1))
      .slice(0, 8)
      .map(({ score: _score, ...result }) => result);
    return matches.length ? matches : [action('add', `Add “${trimmed}”`, 'Start a new item with this title', trimmed)];
  });
  let activeIndex = $derived(results.findIndex((result) => result.id === activeResultId));

  function closeDialog() {
    walletStore.isOmnibarOpen = false;
  }

  function handleDialogClose() {
    walletStore.isOmnibarOpen = false;
    query = '';
    activeResultId = null;
  }

  function handleSelect(result: OmniResult) {
    closeDialog();
    if (result.kind === 'wallet' && result.walletItem) {
      // Claim/cancel search only selects the matching local item. The user chooses
      // the next action from its dossier; search never submits or opens cancellation.
      walletStore.selectItem(result.walletItem);
      return;
    }
    if (result.kind === 'wiki' && result.wikiEntry) {
      onWikiSelect?.(result.wikiEntry.brandSlug);
      return;
    }
    switch (result.command) {
      case 'add': onCapture?.(result.argument || undefined); break;
      case 'wiki': onWikiSelect?.(); break;
      case 'tax': walletStore.setView('tax'); break;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length) setActiveIndex((activeIndex + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) setActiveIndex(activeIndex <= 0 ? results.length - 1 : activeIndex - 1);
    } else if (event.key === 'Home' && results.length) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && results.length) {
      event.preventDefault();
      setActiveIndex(results.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      handleSelect(results[activeIndex]!);
    }
  }

  let activeOptionId = $derived(activeIndex >= 0 ? resultId(activeIndex) : undefined);
  let { onWikiSelect, onCapture }: { onWikiSelect?: (slug?: string) => void; onCapture?: (title?: string) => void } = $props();
</script>

<dialog
  bind:this={dialogElement}
  id="omnibar-dialog"
  class="omnibar-dialog"
  aria-labelledby="omnibar-title"
  onclick={(event) => { if (event.target === dialogElement) closeDialog(); }}
  onclose={handleDialogClose}
  oncancel={(event) => { event.preventDefault(); closeDialog(); }}
>
  <h2 id="omnibar-title" class="sr-only">Search wallet and Policy Wiki</h2>
  <div class="omnibar-input-bar">
    <Search size={20} class="search-glyph" aria-hidden="true" />
    <input
      bind:this={inputElement}
      type="search"
      class="omnibar-input"
      maxlength="256"
      role="combobox"
      aria-label="Search wallet items and policies"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={walletStore.isOmnibarOpen && results.length > 0}
      aria-controls="omnibar-results"
      aria-activedescendant={activeOptionId}
      placeholder="Search items, providers, or policies"
      bind:value={query}
      oninput={() => { activeResultId = null; }}
      onkeydown={handleKeyDown}
    />
    {#if query}
      <button type="button" class="clear-btn" onclick={() => { query = ''; activeResultId = null; inputElement?.focus(); }} aria-label="Clear search">
        <X size={16} aria-hidden="true" />
      </button>
    {/if}
    <kbd class="esc-badge">ESC</kbd>
    <button type="button" class="close-btn" onclick={closeDialog} aria-label="Close search">
      <X size={16} aria-hidden="true" />
    </button>
  </div>
  <p class="sr-only" aria-live="polite">{results.length} search {results.length === 1 ? 'result' : 'results'}</p>
  <p class="source-status">{wikiSourceStatus === 'published' ? 'Published policies' : 'Bundled policies'}</p>
  <div id="omnibar-results" class="omnibar-results" role="listbox" aria-label="Search results">
    {#each results as result, index (result.id)}
      <button
        id={resultId(index)}
        type="button"
        class={['result-row', { active: activeIndex === index }]}
        role="option"
        aria-selected={activeIndex === index}
        tabindex="-1"
        onmouseenter={() => { setActiveIndex(index); }}
        onclick={() => handleSelect(result)}
      >
        {#if result.kind === 'wallet'}
          <Shield size={16} class="row-icon text-pine" aria-hidden="true" />
        {:else if result.kind === 'wiki'}
          <Sparkles size={16} class="row-icon text-coral" aria-hidden="true" />
        {:else if result.command === 'add'}
          <Camera size={16} class="row-icon text-pine" aria-hidden="true" />
        {:else if result.command === 'wiki'}
          <BookOpen size={16} class="row-icon text-coral" aria-hidden="true" />
        {:else if result.command === 'tax'}
          <Receipt size={16} class="row-icon text-pine" aria-hidden="true" />
        {/if}
        <span class="row-info"><span class="row-title">{result.title}</span><span class="row-sub">{result.subtitle}</span></span>
        {#if result.badge}<span class="row-badge">{result.badge}</span>{/if}
      </button>
    {/each}
  </div>
  {#if !results.length}
    <p class="no-match-msg">
      {#if parseOmniCommand(query)?.command === 'tax' && parseOmniCommand(query)?.argument}
        Tax summary does not accept a year argument. Type <code>&gt;tax</code> to open it.
      {:else}
        No matching action or item for “{query.trim()}”. Try <code>&gt;claim headphones</code> or <code>&gt;cancel Spotify</code> to select a local item.
      {/if}
    </p>
  {/if}
  <div class="keyboard-help" aria-hidden="true">↑ ↓ move · Home / End jump · Enter select · Esc close</div>
</dialog>

<style>
  .omnibar-dialog {
    width: min(640px, calc(100vw - 32px));
    max-width: none;
    max-height: 75vh;
    margin: 10vh auto auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
    animation: popIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .omnibar-dialog::backdrop { background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px); }
  @keyframes popIn { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .omnibar-input-bar { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 16px; border-bottom: 1px solid var(--color-border-subtle, #E2E8F0); }
  :global(.search-glyph) { color: var(--color-ink-secondary, #475569); }
  .omnibar-input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--color-ink-primary, #0F172A); font: inherit; font-size: var(--font-size-base, 16px); }
  .clear-btn { display: flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; border: 0; background: transparent; color: var(--color-ink-tertiary, #64748B); cursor: pointer; }
  .close-btn { display: flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border: 1px solid var(--color-border-subtle, #E2E8F0); border-radius: 9px; background: #fff; color: var(--color-ink-secondary, #475569); cursor: pointer; }
  .close-btn:hover { background: var(--color-surface-subtle, #F1F5F9); }
  .esc-badge { padding: 2px 6px; border: 1px solid var(--color-border-subtle, #E2E8F0); border-radius: 4px; background: var(--color-surface-subtle, #F1F5F9); color: var(--color-ink-secondary, #475569); font: 11px monospace; }
  .omnibar-results { display: flex; flex-direction: column; gap: 4px; max-height: calc(75vh - 90px); overflow-y: auto; padding: 12px 16px; }
  .result-row { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 8px 10px; border: 0; border-radius: var(--radius-md, 12px); background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; transition: background 120ms ease; }
  .result-row:hover, .result-row.active { background: var(--color-surface-subtle, #F1F5F9); }
  .result-row:focus-visible { outline: 2px solid var(--color-pine-teal, #2F524C); outline-offset: 1px; }
  :global(.text-pine) { color: var(--color-pine-teal, #2F524C); }
  :global(.text-coral) { color: var(--color-terracotta-coral, #D96B4B); }
  .row-info { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 2px; }
  .row-title { overflow: hidden; color: var(--color-ink-primary, #0F172A); font-size: var(--font-size-sm, 14px); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .row-sub { overflow: hidden; color: var(--color-ink-secondary, #475569); font-size: var(--font-size-xs, 12px); text-overflow: ellipsis; white-space: nowrap; }
  .row-badge { flex: 0 0 auto; padding: 3px 7px; border-radius: 4px; background: #F1F5F9; color: var(--color-ink-secondary, #475569); font-size: 10px; font-weight: 650; text-transform: uppercase; }
  .no-match-msg { margin: 8px 4px; color: var(--color-ink-secondary, #475569); font-size: 13px; line-height: 1.5; }
  .source-status { margin: 0; padding: 0 16px 6px; color: var(--color-ink-tertiary, #64748B); font-size: 10px; text-align: right; }
  .no-match-msg code { border-radius: 4px; background: var(--color-surface-subtle, #F1F5F9); padding: 2px 5px; }
  .keyboard-help { padding: 9px 16px 11px; border-top: 1px solid var(--color-border-subtle, #E2E8F0); color: var(--color-ink-tertiary, #64748B); font-size: 11px; }
  @media (max-width: 640px) { .omnibar-dialog { margin-top: 6vh; max-height: 86vh; } .omnibar-results { max-height: calc(86vh - 90px); } .row-sub { white-space: normal; } .esc-badge { display: none; } }
</style>
