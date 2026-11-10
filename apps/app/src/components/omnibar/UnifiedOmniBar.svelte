<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore } from '../../state/wallet.svelte';
  import { PrefixTrie, type PolicyWikiEntry, type WalletItem } from '@cmlab/core';
  import {
    Search,
    Shield,
    Receipt,
    Zap,
    Sparkles,
    Camera,
    Plus,
    X,
    ExternalLink
  } from 'lucide-svelte';

  let query = $state('');
  let isFocused = $state(false);
  let inputElement = $state<HTMLInputElement | null>(null);

  // PrefixTrie instance populated from seed/wiki
  let trie = new PrefixTrie();
  let wikiEntries = $state<PolicyWikiEntry[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/data/policy_wiki_seed_v1.json');
      if (res.ok) {
        const data = await res.json();
        wikiEntries = Array.isArray(data) ? data : data.brands || [];
        for (const entry of wikiEntries) {
          trie.insert(entry.brandSlug, entry.brandName);
          if (entry.brandName) {
            trie.insert(entry.brandName.toLowerCase(), entry.brandName);
          }
        }
      }
    } catch {
      // Fallback in case fetch is unavailable
    }

    if (walletStore.isOmnibarOpen && inputElement) {
      inputElement.focus();
    }
  });

  $effect(() => {
    if (walletStore.isOmnibarOpen) {
      setTimeout(() => inputElement?.focus(), 50);
    }
  });

  // 8 FSM States Computation
  type OmnibarState =
    | 'IDLE'
    | 'FOCUSED_EMPTY'
    | 'QUERYING'
    | 'WIKI_MATCHES'
    | 'VAULT_MATCHES'
    | 'HYBRID_MATCHES'
    | 'NO_MATCH_SUGGESTION'
    | 'COMMAND_MODE';

  let trimmedQuery = $derived(query.trim());

  let fsmState = $derived.by<OmnibarState>(() => {
    if (!walletStore.isOmnibarOpen && !isFocused) return 'IDLE';
    if (!trimmedQuery) return 'FOCUSED_EMPTY';
    if (trimmedQuery.startsWith('>')) return 'COMMAND_MODE';

    const hasVault = matchedVaultItems.length > 0;
    const hasWiki = matchedWikiEntries.length > 0;

    if (hasVault && hasWiki) return 'HYBRID_MATCHES';
    if (hasVault) return 'VAULT_MATCHES';
    if (hasWiki) return 'WIKI_MATCHES';

    return 'NO_MATCH_SUGGESTION';
  });

  // Vault matching: search items in store
  let matchedVaultItems = $derived.by<WalletItem[]>(() => {
    if (!trimmedQuery || trimmedQuery.startsWith('>')) return [];
    const lower = trimmedQuery.toLowerCase();
    return walletStore.items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.merchantOrProvider.toLowerCase().includes(lower) ||
        item.brandSlug?.toLowerCase().includes(lower)
    );
  });

  // Wiki matching: search loaded wiki entries
  let matchedWikiEntries = $derived.by<PolicyWikiEntry[]>(() => {
    if (!trimmedQuery || trimmedQuery.startsWith('>')) return [];
    const lower = trimmedQuery.toLowerCase();
    return wikiEntries.filter(
      (entry) =>
        entry.brandName.toLowerCase().includes(lower) ||
        entry.brandSlug.toLowerCase().includes(lower) ||
        entry.category.toLowerCase().includes(lower)
    );
  });

  // Parsed command
  let parsedCommand = $derived.by(() => {
    if (!trimmedQuery.startsWith('>')) return null;
    const parts = trimmedQuery.slice(1).trim().split(/\s+/);
    const verb = parts[0]?.toLowerCase() || '';
    const arg = parts.slice(1).join(' ');
    return { verb, arg };
  });

  function handleSelectVaultItem(item: WalletItem) {
    walletStore.isOmnibarOpen = false;
    walletStore.selectItem(item);
  }

  function handleSelectWikiEntry(entry: PolicyWikiEntry) {
    walletStore.isOmnibarOpen = false;
    // Route to capture with pre-filled brand
    walletStore.setView('capture');
  }

  function executeCommand(verb: string, arg?: string) {
    walletStore.isOmnibarOpen = false;
    switch (verb) {
      case 'claim':
        if (walletStore.items.length > 0) {
          walletStore.setView('claim', walletStore.items[0]?.id);
        } else {
          walletStore.setView('capture');
        }
        break;
      case 'cancel':
        const sub = walletStore.digitalSubscriptions[0];
        if (sub && sub.cancellationUrl) {
          window.open(sub.cancellationUrl, '_blank');
        } else {
          walletStore.setView('dashboard');
        }
        break;
      case 'tax':
        walletStore.setView('tax');
        break;
      case 'emdash':
      case 'cms':
        if (typeof window !== 'undefined') {
          window.open('https://rightsandrenewals.pages.dev/emdash', '_blank', 'noopener,noreferrer');
        }
        break;
      case 'wiki':
        if (typeof window !== 'undefined') {
          window.open('https://rightsandrenewals.pages.dev/wiki', '_blank', 'noopener,noreferrer');
        }
        break;
      case 'import':
      case 'audit':
      default:
        walletStore.setView('dashboard');
        break;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      walletStore.isOmnibarOpen = false;
      query = '';
    } else if (e.key === 'Enter') {
      if (fsmState === 'COMMAND_MODE' && parsedCommand) {
        executeCommand(parsedCommand.verb, parsedCommand.arg);
      } else if (matchedVaultItems.length > 0) {
        const first = matchedVaultItems[0];
        if (first) handleSelectVaultItem(first);
      } else if (matchedWikiEntries.length > 0) {
        const first = matchedWikiEntries[0];
        if (first) handleSelectWikiEntry(first);
      }
    }
  }
</script>

{#if walletStore.isOmnibarOpen}
  <div
    class="omnibar-backdrop"
    onclick={() => {
      walletStore.isOmnibarOpen = false;
      query = '';
    }}
    role="presentation"
  >
    <div
      class="omnibar-modal"
      onclick={(e) => e.stopPropagation()}
      role="combobox"
      aria-expanded={walletStore.isOmnibarOpen}
      aria-haspopup="listbox"
      aria-controls="omnibar-results"
    >
      <div class="omnibar-input-bar">
        <Search size={20} class="search-glyph" />
        <input
          bind:this={inputElement}
          type="text"
          class="omnibar-input"
          aria-label="Search items and policies"
          placeholder="Search items and policies"
          bind:value={query}
          onfocus={() => (isFocused = true)}
          onblur={() => (isFocused = false)}
          onkeydown={handleKeyDown}
        />
        {#if query}
          <button
            type="button"
            class="clear-btn"
            onclick={() => {
              query = '';
              inputElement?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        {/if}
        <kbd class="esc-badge">ESC</kbd>
      </div>

      <!-- Results Container -->
      <div id="omnibar-results" class="omnibar-results" role="listbox">
        {#if fsmState === 'COMMAND_MODE' && parsedCommand}
          <div class="command-tray">
            <span class="command-badge">COMMAND</span>
            <span class="command-text">
              Execute <strong>>{parsedCommand.verb}</strong> {parsedCommand.arg ? `("${parsedCommand.arg}")` : ''}
            </span>
            <button
              type="button"
              class="run-command-btn"
              onclick={() => parsedCommand && executeCommand(parsedCommand.verb, parsedCommand.arg)}
            >
              Run →
            </button>
          </div>
          <div class="command-hints">
            <span>Available verbs:</span>
            <code>>emdash</code>
            <code>>wiki</code>
            <code>>tax</code>
            <code>>claim</code>
            <code>>cancel</code>
          </div>

        {:else if fsmState === 'FOCUSED_EMPTY'}
          <div class="empty-prompt">
            <p class="hint-heading">Quick Actions & Suggestions</p>
            <div class="quick-chips">
              <button
                type="button"
                class="chip-btn"
                onclick={() => {
                  walletStore.isOmnibarOpen = false;
                  walletStore.setView('capture');
                }}
              >
                <Camera size={14} />
                <span>Snap New Receipt (&lt;15s)</span>
              </button>
              <button
                type="button"
                class="chip-btn"
                onclick={() => {
                  executeCommand('emdash');
                }}
              >
                <Zap size={14} />
                <span>⚡ EmDash Desk</span>
              </button>
              <button
                type="button"
                class="chip-btn"
                onclick={() => {
                  query = '>tax 2026';
                  inputElement?.focus();
                }}
              >
                <Receipt size={14} />
                <span>Run >tax 2026</span>
              </button>
              <button
                type="button"
                class="chip-btn"
                onclick={() => {
                  query = 'Spotify';
                  inputElement?.focus();
                }}
              >
                <Zap size={14} />
                <span>Find Spotify BGB Rules</span>
              </button>
            </div>
          </div>

        {:else if fsmState === 'HYBRID_MATCHES' || fsmState === 'VAULT_MATCHES' || fsmState === 'WIKI_MATCHES'}
          {#if matchedVaultItems.length > 0}
            <div class="results-group">
              <span class="group-header">Local Vault Items ({matchedVaultItems.length})</span>
              {#each matchedVaultItems as item (item.id)}
                <div
                  class="result-row"
                  onclick={() => handleSelectVaultItem(item)}
                  role="option"
                  aria-selected="false"
                  tabindex="0"
                >
                  <Shield size={16} class="row-icon text-pine" />
                  <div class="row-info">
                    <span class="row-title">{item.title}</span>
                    <span class="row-sub">{item.merchantOrProvider} • €{item.priceGrossEur.toFixed(2)}</span>
                  </div>
                  <span class="row-badge">{item.category}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if matchedWikiEntries.length > 0}
            <div class="results-group">
              <span class="group-header">Policy Wiki Knowledge ({matchedWikiEntries.length})</span>
              {#each matchedWikiEntries as entry (entry.brandSlug)}
                <div
                  class="result-row"
                  onclick={() => handleSelectWikiEntry(entry)}
                  role="option"
                  aria-selected="false"
                  tabindex="0"
                >
                  <Sparkles size={16} class="row-icon text-coral" />
                  <div class="row-info">
                    <span class="row-title">{entry.brandName}</span>
                    <span class="row-sub">Statutory warranty: {entry.statutoryWarrantyMonths}m • {entry.legalNotes}</span>
                  </div>
                  <span class="row-badge">{entry.category}</span>
                </div>
              {/each}
            </div>
          {/if}

        {:else if fsmState === 'NO_MATCH_SUGGESTION'}
          <div class="no-match-tray">
            <p class="no-match-msg">No existing vault items or wiki policies matching "{trimmedQuery}".</p>
            <div class="fallback-actions">
              <button
                type="button"
                class="fallback-btn"
                onclick={() => {
                  walletStore.isOmnibarOpen = false;
                  walletStore.setView('capture');
                }}
              >
                <Plus size={16} />
                <span>Create New Hardware Warranty ("{trimmedQuery}")</span>
              </button>
              <button
                type="button"
                class="fallback-btn"
                onclick={() => {
                  walletStore.isOmnibarOpen = false;
                  walletStore.setView('capture');
                }}
              >
                <Zap size={16} />
                <span>Add Subscription ("{trimmedQuery}")</span>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .omnibar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    z-index: var(--z-index-modal, 600);
    display: flex;
    justify-content: center;
    padding-top: 10vh;
    padding-left: 16px;
    padding-right: 16px;
  }

  .omnibar-modal {
    width: 100%;
    max-width: 640px;
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 75vh;
    animation: popIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .omnibar-input-bar {
    display: flex;
    align-items: center;
    padding: 0 16px;
    height: 56px;
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    gap: 12px;
  }

  :global(.search-glyph) {
    color: var(--color-ink-secondary, #475569);
  }

  .omnibar-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    font-size: var(--font-size-base, 16px);
    color: var(--color-ink-primary, #0F172A);
    background: transparent;
  }

  .clear-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-ink-tertiary, #94A3B8);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .esc-badge {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-surface-subtle, #F1F5F9);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    font-size: 11px;
    font-family: monospace;
    color: var(--color-ink-secondary, #475569);
  }

  .omnibar-results {
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .command-tray {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--color-surface-subtle, #F1F5F9);
    border-radius: var(--radius-md, 12px);
  }

  .command-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
  }

  .command-text {
    flex: 1;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-ink-primary, #0F172A);
  }

  .run-command-btn {
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    padding: 6px 12px;
    border-radius: var(--radius-sm, 6px);
    font-size: var(--font-size-xs, 12px);
    font-weight: 600;
    cursor: pointer;
  }

  .command-hints {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .command-hints code {
    background: var(--color-surface-subtle, #F1F5F9);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .empty-prompt {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hint-heading {
    margin: 0;
    font-size: var(--font-size-xs, 12px);
    font-weight: 600;
    color: var(--color-ink-tertiary, #94A3B8);
    text-transform: uppercase;
  }

  .quick-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--color-surface-canvas, #F4F7F6);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    padding: 8px 12px;
    border-radius: var(--radius-md, 12px);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-primary, #0F172A);
    cursor: pointer;
    font-weight: 500;
  }

  .chip-btn:hover {
    border-color: var(--color-pine-teal, #2F524C);
    background: #FFFFFF;
  }

  .results-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .group-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-ink-tertiary, #94A3B8);
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .result-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    border-radius: var(--radius-md, 12px);
    cursor: pointer;
    transition: background 120ms ease;
  }

  .result-row:hover {
    background: var(--color-surface-subtle, #F1F5F9);
  }

  :global(.text-pine) { color: var(--color-pine-teal, #2F524C); }
  :global(.text-coral) { color: var(--color-terracotta-coral, #D96B4B); }

  .row-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .row-title {
    font-size: var(--font-size-sm, 14px);
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .row-sub {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .row-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: #F1F5F9;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--color-ink-secondary, #475569);
  }

  .no-match-tray {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
  }

  .no-match-msg {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-ink-secondary, #475569);
  }

  .fallback-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fallback-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-md, 12px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    font-size: var(--font-size-xs, 12px);
    font-weight: 500;
    color: var(--color-pine-teal, #2F524C);
    cursor: pointer;
    text-align: left;
  }

  .fallback-btn:hover {
    background: var(--color-surface-subtle, #F1F5F9);
  }
</style>
