/**
 * omnibar.js — Modern App Unified Search/Activity/Request Bar (Omnibar)
 * Milestone: M3 (Features 12, 13, 14, 15, 16)
 * Standards: WAI-ARIA 1.3 Combobox, 8-State FSM, BGB §§ 437/477/312k, GoBD SHA-256
 *
 * Self-contained, zero external runtime dependencies.
 */

// ============================================================================
// 1. FORMAL 8-STATE FINITE STATE MACHINE (FSM)
// ============================================================================

export const OmnibarState = Object.freeze({
  IDLE: 'IDLE',
  FOCUSED_EMPTY: 'FOCUSED_EMPTY',
  QUERYING: 'QUERYING',
  VAULT_MATCHES: 'VAULT_MATCHES',
  WIKI_MATCHES: 'WIKI_MATCHES',
  HYBRID_MATCHES: 'HYBRID_MATCHES',
  NO_MATCH_SUGGESTION: 'NO_MATCH_SUGGESTION',
  COMMAND_MODE: 'COMMAND_MODE'
});

export class OmnibarFSM {
  constructor() {
    this.state = OmnibarState.IDLE;
    this.query = '';
    this.history = [this.state];
    this.executedRules = new Set();
  }

  reset() {
    this.state = OmnibarState.IDLE;
    this.query = '';
    this.history = [this.state];
    this.executedRules.clear();
  }

  transitionTo(nextState, ruleNumber = null) {
    if (!Object.values(OmnibarState).includes(nextState)) {
      throw new Error(`Illegal Omnibar state transition: ${nextState}`);
    }
    this.state = nextState;
    this.history.push(nextState);
    if (ruleNumber) this.executedRules.add(ruleNumber);
    return this.state;
  }
}

// ============================================================================
// 2. DUAL-INDEX CLIENT SEARCH ENGINE
// ============================================================================

export class OmnibarSearchEngine {
  constructor(wikiBrands = [], vaultItems = []) {
    this.wikiBrands = wikiBrands;
    this.vaultItems = vaultItems;
  }

  setWikiBrands(brands) {
    this.wikiBrands = brands || [];
  }

  setVaultItems(items) {
    this.vaultItems = items || [];
  }

  search(rawQuery, filterCategory = 'all') {
    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      return { vaultMatches: [], wikiMatches: [], query: '' };
    }

    // 1. Search Wiki Brands (Top 20 Canonical Brands + BGB Statutes)
    const wikiMatches = this.wikiBrands.filter(b => {
      if (filterCategory !== 'all' && b.category !== filterCategory) return false;
      const slug = (b.service_slug || b.serviceSlug || '').toLowerCase();
      const name = (b.brand_name || b.brandName || '').toLowerCase();
      const aliases = (b.search_aliases || []).map(a => a.toLowerCase());
      const statutes = (b.statutory_basis || []).map(s => s.toLowerCase());

      return (
        slug.includes(q) ||
        name.includes(q) ||
        aliases.some(a => a.includes(q)) ||
        statutes.some(s => s.includes(q))
      );
    });

    // 2. Search Saved Vault Items
    const vaultMatches = this.vaultItems.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      const name = (item.name || '').toLowerCase();
      const merchant = (item.merchant || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const tokens = (item.searchTokens || []).map(t => t.toLowerCase());

      return (
        name.includes(q) ||
        merchant.includes(q) ||
        cat.includes(q) ||
        tokens.some(t => t.includes(q))
      );
    });

    return { vaultMatches, wikiMatches, query: rawQuery.trim() };
  }
}

// ============================================================================
// 3. COMPLETE OMNIBAR WEB COMPONENT & CONTROLLER
// ============================================================================

export class UnifiedOmnibarComponent {
  constructor(options = {}) {
    this.mountTarget = options.mountTarget || document.getElementById('omnibar-root');
    this.fsm = new OmnibarFSM();
    this.searchEngine = new OmnibarSearchEngine(options.wikiBrands, options.vaultItems);
    this.filterCategory = 'all'; // 'all' | 'hardware' | 'subscription'
    this.activeIndex = -1;
    this.debounceTimer = null;
    this.cachedResults = { vaultMatches: [], wikiMatches: [], suggestions: [] };
    this.previouslyFocusedElement = null;

    this.recentActivities = options.recentActivities || [
      { icon: '🎧', title: 'Sony WH-1000XM5', sub: 'Angesehen vor 2h · Geschützt (13m verbleibend)' },
      { icon: '🎵', title: 'Spotify Premium Student', sub: 'Frist in 3d · BGB § 309 Nr. 9 Frist' },
      { icon: '💻', title: 'Apple MacBook Pro 14" M3', sub: 'Beleg angehängt (GoBD SHA-256 verifiziert)' }
    ];

    this.quickActions = [
      { id: 'quick_add', label: '+ Neuer Beleg (<15s)', icon: '➕' },
      { id: 'import_receipt', label: '📥 Beleg importieren', icon: '📷' },
      { id: 'policy_wiki', label: '⚖️ Policy Wiki (20 Brands)', icon: '🏛️' },
      { id: 'tax_summary', label: '💶 Steuer-Report (BMF 2022)', icon: '💶' },
      { id: 'claim_wizard', label: '⚡ Mängelrüge (§ 437)', icon: '📄' },
      { id: 'audit_vault', label: '⏰ Fristen-Wecker & Audit', icon: '🛡️' }
    ];

    this.commands = [
      { verb: '>claim', desc: 'Mängelrüge gem. §§ 437, 439, 477 BGB generieren', example: '>claim Sony' },
      { verb: '>cancel', desc: 'Kündigung gem. § 312k BGB online einleiten', example: '>cancel Spotify' },
      { verb: '>tax', desc: 'Werbungskosten-Dossier (BMF 2022) exportieren', example: '>tax 2026' },
      { verb: '>import', desc: 'Belegbild komprimieren und SHA-256 signieren', example: '>import Saturn' },
      { verb: '>audit', desc: 'Kryptografische GoBD-Integritätsprüfung starten', example: '>audit' },
      { verb: '>export', desc: 'AES-GCM-256 verschlüsseltes Vault-Backup erzeugen', example: '>export' }
    ];

    this.init();
  }

  init() {
    if (!this.mountTarget) {
      console.warn('UnifiedOmnibarComponent: Mount target not found.');
      return;
    }
    this.render();
    this.bindDOMEvents();
    this.bindGlobalShortcuts();
  }

  updateData({ wikiBrands, vaultItems }) {
    if (wikiBrands) this.searchEngine.setWikiBrands(wikiBrands);
    if (vaultItems) this.searchEngine.setVaultItems(vaultItems);
  }

  // --------------------------------------------------------------------------
  // DOM RENDERING
  // --------------------------------------------------------------------------

  render() {
    this.mountTarget.innerHTML = `
      <div class="omnibar-container" id="omnibar-container">
        <!-- WAI-ARIA 1.3 Combobox Root -->
        <div
          class="omnibar-combobox"
          id="omnibar-combobox"
          role="combobox"
          aria-expanded="false"
          aria-haspopup="listbox"
          aria-controls="omnibar-dropdown"
          aria-owns="omnibar-dropdown"
        >
          <div class="omnibar-input-wrapper">
            <span class="omnibar-leading-icon" id="omnibar-leading-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              id="omnibar-input"
              class="omnibar-input"
              placeholder="Suche 20 Brand-Policies, Belege oder '>' für Befehle... (⌘K)"
              aria-label="Unified Search and Command Bar"
              aria-autocomplete="list"
              aria-controls="omnibar-dropdown"
              aria-activedescendant=""
              autocomplete="off"
              spellcheck="false"
            />
            <div class="omnibar-trailing-controls">
              <span class="omnibar-spinner" id="omnibar-spinner" style="display: none;" aria-hidden="true">◌</span>
              <button
                type="button"
                id="omnibar-clear-btn"
                class="omnibar-clear-btn"
                style="display: none;"
                aria-label="Eingabe löschen"
                title="Eingabe löschen (Esc)"
              >✕</button>
              <kbd class="omnibar-kbd-badge" id="omnibar-kbd-badge" title="Tastenkombination Strg+K / ⌘K">⌘K</kbd>
            </div>
          </div>
        </div>

        <!-- Popover Dropdown -->
        <div
          class="omnibar-dropdown"
          id="omnibar-dropdown"
          role="listbox"
          aria-label="Suchergebnisse und Aktionen"
          style="display: none;"
        >
          <!-- Category Filter Chips -->
          <div class="omnibar-chip-bar" id="omnibar-chip-bar" role="toolbar" aria-label="Kategorie-Filter">
            <button type="button" class="omnibar-chip chip-active" data-cat="all">Alle</button>
            <button type="button" class="omnibar-chip" data-cat="hardware">💻 Hardware</button>
            <button type="button" class="omnibar-chip" data-cat="subscription">🎵 Abos</button>
          </div>

          <!-- Dynamic Results Container -->
          <div class="omnibar-results-pane" id="omnibar-results-pane"></div>

          <!-- Footer Keyboard Hint -->
          <div class="omnibar-footer-hint font-mono text-muted">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigieren</span>
            <span><kbd>↵</kbd> Auswählen</span>
            <span><kbd>Esc</kbd> Schließen</span>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // EVENT BINDINGS
  // --------------------------------------------------------------------------

  bindDOMEvents() {
    const input = this.mountTarget.querySelector('#omnibar-input');
    const clearBtn = this.mountTarget.querySelector('#omnibar-clear-btn');
    const container = this.mountTarget.querySelector('#omnibar-container');
    const dropdown = this.mountTarget.querySelector('#omnibar-dropdown');

    // Input Focus (Rule 1)
    input.addEventListener('focus', (e) => {
      if (e.relatedTarget && e.relatedTarget !== input) {
        this.previouslyFocusedElement = e.relatedTarget;
      }
      if (this.fsm.state === OmnibarState.IDLE) {
        if (!input.value.trim()) {
          this.transitionState(OmnibarState.FOCUSED_EMPTY, 1);
        } else {
          this.handleInput(input.value);
        }
      }
    });

    // Input Keystrokes (Rules 3, 4, 11, 18)
    input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });

    // Keyboard Navigation (Rules 12, 13, 19, 20, 21)
    input.addEventListener('keydown', (e) => {
      this.handleKeyNavigation(e);
    });

    // Clear Button (Rule 20)
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      this.handleInput('');
    });

    // Click Outside (Rule 6)
    document.addEventListener('pointerdown', (e) => {
      if (!container.contains(e.target) && this.fsm.state !== OmnibarState.IDLE) {
        this.closeOmnibar(6);
      }
    });

    // Delegate Click Events within Dropdown
    dropdown.addEventListener('click', (e) => {
      this.handleDropdownClicks(e);
    });
  }

  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      const input = this.mountTarget.querySelector('#omnibar-input');
      if (!input) return;

      // Ctrl+K / Cmd+K Global Hotkey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (document.activeElement && document.activeElement !== input) {
          this.previouslyFocusedElement = document.activeElement;
        }
        input.focus();
        input.select();
        if (!input.value.trim()) {
          this.transitionState(OmnibarState.FOCUSED_EMPTY, 1);
        }
        return;
      }

      // Forward Slash '/' Hotkey (when outside inputs)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        if (document.activeElement && document.activeElement !== input) {
          this.previouslyFocusedElement = document.activeElement;
        }
        input.focus();
        input.select();
        if (!input.value.trim()) {
          this.transitionState(OmnibarState.FOCUSED_EMPTY, 1);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // INPUT & FSM RESOLUTION
  // --------------------------------------------------------------------------

  handleInput(rawVal) {
    const trimmed = rawVal.trim();
    const clearBtn = this.mountTarget.querySelector('#omnibar-clear-btn');
    const leadingIcon = this.mountTarget.querySelector('#omnibar-leading-icon');

    clearBtn.style.display = trimmed.length > 0 ? 'inline-flex' : 'none';

    // Empty query -> FOCUSED_EMPTY (Rule 11)
    if (!trimmed) {
      leadingIcon.textContent = '🔍';
      this.transitionState(OmnibarState.FOCUSED_EMPTY, 11);
      return;
    }

    // Command Mode -> '>' prefix (Rules 4, 18)
    if (trimmed.startsWith('>')) {
      leadingIcon.textContent = '⚡';
      this.transitionState(OmnibarState.COMMAND_MODE, 4);
      this.renderCommandMode(trimmed);
      return;
    }

    // Standard Querying (Rule 3)
    leadingIcon.textContent = '🔍';
    this.transitionState(OmnibarState.QUERYING, 3);
    this.showSpinner(true);

    // 150ms Debounce
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.resolveSearch(trimmed);
    }, 150);
  }

  resolveSearch(query) {
    this.showSpinner(false);
    const { vaultMatches, wikiMatches } = this.searchEngine.search(query, this.filterCategory);
    this.cachedResults = { vaultMatches, wikiMatches, query };

    // FSM State Arbitration (Rules 7, 8, 9, 10)
    if (vaultMatches.length > 0 && wikiMatches.length > 0) {
      this.transitionState(OmnibarState.HYBRID_MATCHES, 9);
      this.renderHybridMatches(vaultMatches, wikiMatches, query);
    } else if (vaultMatches.length > 0) {
      this.transitionState(OmnibarState.VAULT_MATCHES, 7);
      this.renderVaultMatches(vaultMatches, query);
    } else if (wikiMatches.length > 0) {
      this.transitionState(OmnibarState.WIKI_MATCHES, 8);
      this.renderWikiMatches(wikiMatches, query);
    } else {
      this.transitionState(OmnibarState.NO_MATCH_SUGGESTION, 10);
      this.renderNoMatchSuggestions(query);
    }

    this.activeIndex = -1;
    this.updateActiveDescendant();
  }

  // --------------------------------------------------------------------------
  // KEYBOARD NAVIGATION LOGIC
  // --------------------------------------------------------------------------

  handleKeyNavigation(e) {
    const input = this.mountTarget.querySelector('#omnibar-input');
    const items = this.mountTarget.querySelectorAll('.omnibar-option');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (items.length === 0) return;
        this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
        this.updateActiveItemVisuals(items);
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (items.length === 0) return;
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.updateActiveItemVisuals(items);
        break;

      case 'Enter':
        e.preventDefault();
        if (this.activeIndex >= 0 && items[this.activeIndex]) {
          items[this.activeIndex].click();
        } else if (this.fsm.state === OmnibarState.COMMAND_MODE) {
          // Execute top command
          const topVerb = this.mountTarget.querySelector('.command-option');
          if (topVerb) topVerb.click();
        } else if (items.length > 0) {
          // Default to first item
          items[0].click();
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (input.value.trim().length > 0) {
          // Progressive Escape Step 1: Clear text, stay in FOCUSED_EMPTY (Rule 20)
          input.value = '';
          this.handleInput('');
        } else {
          // Progressive Escape Step 2: Close dropdown, return to IDLE (Rule 21)
          this.closeOmnibar(21);
        }
        break;

      case 'Tab':
        // Cycle Category Chips if dropdown open
        if (this.fsm.state !== OmnibarState.IDLE) {
          e.preventDefault();
          this.cycleCategoryChips();
        }
        break;
    }
  }

  updateActiveItemVisuals(items) {
    items.forEach((it, idx) => {
      const isActive = idx === this.activeIndex;
      it.classList.toggle('omnibar-option-active', isActive);
      it.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
    this.updateActiveDescendant();
  }

  updateActiveDescendant() {
    const input = this.mountTarget.querySelector('#omnibar-input');
    const activeItem = this.mountTarget.querySelector('.omnibar-option-active');
    if (activeItem) {
      input.setAttribute('aria-activedescendant', activeItem.id);
    } else {
      input.setAttribute('aria-activedescendant', '');
    }
  }

  cycleCategoryChips() {
    const chips = ['all', 'hardware', 'subscription'];
    const currentIdx = chips.indexOf(this.filterCategory);
    const nextIdx = (currentIdx + 1) % chips.length;
    this.setFilterCategory(chips[nextIdx]);
  }

  setFilterCategory(cat) {
    this.filterCategory = cat;
    const chips = this.mountTarget.querySelectorAll('.omnibar-chip');
    chips.forEach(c => {
      c.classList.toggle('chip-active', c.getAttribute('data-cat') === cat);
    });

    const input = this.mountTarget.querySelector('#omnibar-input');
    if (input.value.trim()) {
      this.resolveSearch(input.value.trim());
    }
  }

  // --------------------------------------------------------------------------
  // STATE MUTATION & VIEW DISPATCH
  // --------------------------------------------------------------------------

  transitionState(nextState, ruleNumber) {
    this.fsm.transitionTo(nextState, ruleNumber);
    const combobox = this.mountTarget.querySelector('#omnibar-combobox');
    const dropdown = this.mountTarget.querySelector('#omnibar-dropdown');

    const isOpen = nextState !== OmnibarState.IDLE;
    if (combobox) combobox.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (this.mountTarget) this.mountTarget.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (dropdown) dropdown.style.display = isOpen ? 'block' : 'none';

    if (nextState === OmnibarState.FOCUSED_EMPTY) {
      this.renderFocusedEmpty();
    }
  }

  closeOmnibar(ruleNumber = 6) {
    this.fsm.transitionTo(OmnibarState.IDLE, ruleNumber);
    const input = this.mountTarget.querySelector('#omnibar-input');
    const combobox = this.mountTarget.querySelector('#omnibar-combobox');
    const dropdown = this.mountTarget.querySelector('#omnibar-dropdown');

    if (combobox) combobox.setAttribute('aria-expanded', 'false');
    if (this.mountTarget) this.mountTarget.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.style.display = 'none';
    if (input) {
      input.setAttribute('aria-activedescendant', '');
      input.blur();
    }

    if (
      this.previouslyFocusedElement &&
      this.previouslyFocusedElement !== input &&
      typeof this.previouslyFocusedElement.focus === 'function' &&
      (typeof this.previouslyFocusedElement.isConnected === 'undefined' || this.previouslyFocusedElement.isConnected)
    ) {
      try {
        this.previouslyFocusedElement.focus();
      } catch (_) {}
    }
  }

  showSpinner(show) {
    const spinner = this.mountTarget.querySelector('#omnibar-spinner');
    const kbd = this.mountTarget.querySelector('#omnibar-kbd-badge');
    if (spinner) spinner.style.display = show ? 'inline-block' : 'none';
    if (kbd && show) kbd.style.display = 'none';
    if (kbd && !show && this.mountTarget.querySelector('#omnibar-clear-btn').style.display !== 'inline-flex') {
      kbd.style.display = 'inline-block';
    }
  }

  // --------------------------------------------------------------------------
  // STATE RENDERERS
  // --------------------------------------------------------------------------

  renderFocusedEmpty() {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    pane.innerHTML = `
      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">SCHNELLAKTIONEN</div>
        <div class="omnibar-quick-grid">
          ${this.quickActions.map(act => `
            <button type="button" class="omnibar-quick-btn" data-action="${act.id}">
              <span class="quick-icon">${act.icon}</span>
              <span class="quick-label">${act.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">LETZTE AKTIVITÄTEN</div>
        <div class="omnibar-recent-list">
          ${this.recentActivities.map((rec, i) => `
            <div
              class="omnibar-option omnibar-recent-item"
              id="omnibar-opt-${i}"
              role="option"
              aria-selected="false"
              data-type="recent"
              data-title="${rec.title}"
            >
              <span class="recent-icon">${rec.icon}</span>
              <div class="recent-info">
                <div class="recent-title font-bold">${rec.title}</div>
                <div class="recent-sub text-muted font-mono">${rec.sub}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderVaultMatches(vaultMatches, query) {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    pane.innerHTML = `
      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">
          🗄️ GESPEICHERTE BELEGE &amp; ARTIKEL (${vaultMatches.length})
        </div>
        ${vaultMatches.map((item, i) => this.renderVaultItemRow(item, i)).join('')}
      </div>
    `;
  }

  renderWikiMatches(wikiMatches, query) {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    pane.innerHTML = `
      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">
          🏛️ POLICY WIKI RECHTSGRUNDLAGEN (${wikiMatches.length})
        </div>
        ${wikiMatches.map((brand, i) => this.renderWikiBrandRow(brand, i)).join('')}
      </div>
    `;
  }

  renderHybridMatches(vaultMatches, wikiMatches, query) {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    let optCounter = 0;

    pane.innerHTML = `
      <div class="omnibar-section" role="group" aria-label="Gespeicherte Vault-Einträge">
        <div class="omnibar-section-title font-mono">
          🗄️ GESPEICHERTE BELEGE &amp; ARTIKEL (${vaultMatches.length})
        </div>
        ${vaultMatches.map(item => this.renderVaultItemRow(item, optCounter++)).join('')}
      </div>

      <div class="omnibar-section" role="group" aria-label="Policy Wiki Rechtsgrundlagen">
        <div class="omnibar-section-title font-mono">
          🏛️ POLICY WIKI RECHTSGRUNDLAGEN (${wikiMatches.length})
        </div>
        ${wikiMatches.map(brand => this.renderWikiBrandRow(brand, optCounter++)).join('')}
      </div>
    `;
  }

  renderNoMatchSuggestions(query) {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    pane.innerHTML = `
      <div class="omnibar-no-match-header font-mono text-muted" style="padding: var(--space-2) var(--space-3);">
        0 direkte Treffer für "${this.escapeHtml(query)}"
      </div>
      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">💡 ZERO-DEAD-END AKTIONEN</div>
        <div class="omnibar-suggestion-list">
          <div
            class="omnibar-option omnibar-suggestion-card"
            id="omnibar-opt-0"
            role="option"
            aria-selected="false"
            data-action="create_warranty"
            data-query="${this.escapeHtml(query)}"
          >
            <span class="sugg-icon">➕</span>
            <div class="sugg-text">
              <strong>Erfasse neue Garantie für "${this.escapeHtml(query)}"</strong>
              <span class="text-muted">Setzt 24m BGB § 438 Garantie &amp; 12m Beweislastumkehr (§ 477 Abs. 1)</span>
            </div>
          </div>

          <div
            class="omnibar-option omnibar-suggestion-card"
            id="omnibar-opt-1"
            role="option"
            aria-selected="false"
            data-action="add_subscription"
            data-query="${this.escapeHtml(query)}"
          >
            <span class="sugg-icon">🎵</span>
            <div class="sugg-text">
              <strong>Abonnement für "${this.escapeHtml(query)}" eintragen</strong>
              <span class="text-muted">Monatliche Frist gem. § 309 Nr. 9 BGB &amp; automatische Kündigungsalarme</span>
            </div>
          </div>

          <div
            class="omnibar-option omnibar-suggestion-card"
            id="omnibar-opt-2"
            role="option"
            aria-selected="false"
            data-action="import_receipt"
            data-query="${this.escapeHtml(query)}"
          >
            <span class="sugg-icon">📷</span>
            <div class="sugg-text">
              <strong>Beleg / Rechnung für "${this.escapeHtml(query)}" scannen</strong>
              <span class="text-muted">GoBD-konforme SHA-256 Signatur &amp; Web Worker Bildkomprimierung</span>
            </div>
          </div>

          <div
            class="omnibar-option omnibar-suggestion-card"
            id="omnibar-opt-3"
            role="option"
            aria-selected="false"
            data-action="search_wiki"
            data-query="${this.escapeHtml(query)}"
          >
            <span class="sugg-icon">⚖️</span>
            <div class="sugg-text">
              <strong>Policy Wiki nach "${this.escapeHtml(query)}" durchsuchen</strong>
              <span class="text-muted">Recherchiere Verbraucherrechte und Händler-RMA-Richtlinien</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCommandMode(cmdStr) {
    const pane = this.mountTarget.querySelector('#omnibar-results-pane');
    const cleanCmd = cmdStr.toLowerCase();
    const matched = this.commands.filter(c => c.verb.startsWith(cleanCmd) || cleanCmd.startsWith(c.verb));

    pane.innerHTML = `
      <div class="omnibar-section">
        <div class="omnibar-section-title font-mono">⚡ BEFEHLSMODUS (${matched.length} VERFÜGBAR)</div>
        <div class="omnibar-command-list">
          ${matched.map((cmd, i) => `
            <div
              class="omnibar-option command-option${i === 0 ? ' omnibar-option-active' : ''}"
              id="omnibar-opt-${i}"
              role="option"
              aria-selected="${i === 0 ? 'true' : 'false'}"
              data-type="command"
              data-verb="${cmd.verb}"
              data-cmd="${this.escapeHtml(cmdStr)}"
            >
              <div class="command-row">
                <span class="command-verb font-mono font-bold">${cmd.verb}</span>
                <span class="command-example font-mono badge-subtle">${cmd.example}</span>
              </div>
              <div class="command-desc text-muted">${cmd.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    this.activeIndex = 0;
    this.updateActiveDescendant();
  }

  // --------------------------------------------------------------------------
  // ITEM ROW TEMPLATES
  // --------------------------------------------------------------------------

  renderVaultItemRow(item, index) {
    const isHardware = item.category === 'hardware';
    const statusColor = item.status === 'urgent' ? 'badge-urgent' : item.status === 'warning' ? 'badge-warning' : 'badge-protected';
    const statusLabel = item.status === 'urgent' ? '[🛑] Dringend' : item.status === 'warning' ? '[!] Fristwarnung' : '[✓] Geschützt';

    return `
      <div
        class="omnibar-option omnibar-item-row"
        id="omnibar-opt-${index}"
        role="option"
        aria-selected="false"
        data-type="vault"
        data-id="${item.id}"
        data-name="${this.escapeHtml(item.name)}"
      >
        <div class="item-left">
          <span class="item-icon">${isHardware ? '💻' : '🎵'}</span>
          <div class="item-info">
            <div class="item-title font-bold">${this.escapeHtml(item.name)}</div>
            <div class="item-sub text-muted font-mono">
              ${this.escapeHtml(item.merchant || 'Händler')} · Frist: ${item.expiryDate || 'N/A'}
              ${item.receiptSha256 ? '· <span class="badge-gobd">GoBD SHA-256 ✓</span>' : ''}
            </div>
          </div>
        </div>
        <div class="item-right">
          ${item.priceEur ? `<span class="badge-price font-mono font-bold">${item.priceEur.toFixed(2)} €</span>` : ''}
          <span class="status-pill ${statusColor}">${statusLabel}</span>
          <button type="button" class="omnibar-row-action-btn" data-action="open_drawer" data-id="${item.id}" title="Details anzeigen">→</button>
        </div>
      </div>
    `;
  }

  renderWikiBrandRow(brand, index) {
    const isSub = brand.category === 'subscription';
    const slug = brand.service_slug || brand.serviceSlug;
    const name = brand.brand_name || brand.brandName;
    const buttonUrl = brand.cancellation_button_url || brand.cancellationButtonUrl;

    return `
      <div
        class="omnibar-option omnibar-item-row"
        id="omnibar-opt-${index}"
        role="option"
        aria-selected="false"
        data-type="wiki"
        data-slug="${slug}"
      >
        <div class="item-left">
          <span class="item-icon">${isSub ? '📱' : '🏛️'}</span>
          <div class="item-info">
            <div class="item-title font-bold">
              ${this.escapeHtml(name)}
              <span class="badge-subtle font-mono">${brand.category}</span>
            </div>
            <div class="item-sub text-muted font-mono">
              ${(brand.statutory_basis || []).slice(0, 2).join(' · ') || 'BGB'}
            </div>
          </div>
        </div>
        <div class="item-right">
          ${buttonUrl ? `
            <a
              href="${buttonUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="badge-link badge-protected font-mono"
              title="Online-Kündigung nach § 312k BGB öffnen"
              onclick="event.stopPropagation();"
            >§ 312k Button ↗</a>
          ` : `
            <span class="badge-subtle font-mono">§ 437 BGB</span>
          `}
          <button
            type="button"
            class="omnibar-row-action-btn"
            data-action="apply_wiki"
            data-slug="${slug}"
            title="Auf neuen Artikel anwenden"
          >Übernehmen +</button>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // DROPDOWN CLICK DISPATCHER
  // --------------------------------------------------------------------------

  handleDropdownClicks(e) {
    // 1. Filter Chips
    const chip = e.target.closest('.omnibar-chip');
    if (chip) {
      this.setFilterCategory(chip.getAttribute('data-cat'));
      return;
    }

    // 2. Quick Actions in Focused Empty (Rule 5)
    const quickBtn = e.target.closest('.omnibar-quick-btn');
    if (quickBtn) {
      const act = quickBtn.getAttribute('data-action');
      this.dispatchCustomEvent('omnibar:quick-action', { action: act, actionId: act });
      this.dispatchCustomEvent('omnibar:action', { action: act, actionId: act });
      this.closeOmnibar(5);
      return;
    }

    // 3. Fallback Suggestions in No Match (Rules 16, 17)
    const suggCard = e.target.closest('.omnibar-suggestion-card');
    if (suggCard) {
      const action = suggCard.getAttribute('data-action');
      const query = suggCard.getAttribute('data-query');
      if (action === 'create_warranty') {
        this.dispatchCustomEvent('omnibar:create-item', { name: query, query, category: 'hardware' });
        this.closeOmnibar(16);
      } else if (action === 'add_subscription') {
        this.dispatchCustomEvent('omnibar:add-subscription', { name: query, query, category: 'subscription' });
        this.closeOmnibar(16);
      } else if (action === 'import_receipt') {
        this.dispatchCustomEvent('omnibar:import-receipt', { query, name: query });
        this.closeOmnibar(17);
      } else if (action === 'search_wiki') {
        this.dispatchCustomEvent('omnibar:query-wiki', { query, name: query });
        this.closeOmnibar(14);
      }
      return;
    }

    // 4. Command Option Execution (Rule 19)
    const cmdOpt = e.target.closest('.command-option');
    if (cmdOpt) {
      const verb = cmdOpt.getAttribute('data-verb');
      const rawCmd = cmdOpt.getAttribute('data-cmd');
      this.executeVerbCommand(verb, rawCmd);
      return;
    }

    // 5. Vault Row Selection -> Open Drawer (Rule 13)
    const vaultRow = e.target.closest('[data-type="vault"]');
    if (vaultRow) {
      const id = vaultRow.getAttribute('data-id');
      const name = vaultRow.getAttribute('data-name');
      this.dispatchCustomEvent('omnibar:open-drawer', { id, name });
      this.closeOmnibar(13);
      return;
    }

    // 6. Wiki Row Selection -> Apply Policy (Rule 14)
    const wikiRow = e.target.closest('[data-type="wiki"]');
    if (wikiRow) {
      const slug = wikiRow.getAttribute('data-slug');
      this.dispatchCustomEvent('omnibar:apply-wiki', { slug });
      this.closeOmnibar(14);
      return;
    }
  }

  // --------------------------------------------------------------------------
  // VERB COMMAND DISPATCHER (Rule 19)
  // --------------------------------------------------------------------------

  executeVerbCommand(verb, rawCmd) {
    const parts = (rawCmd || verb).split(/\s+/);
    const args = parts.slice(1).join(' ').trim();

    this.dispatchCustomEvent('omnibar:execute-command', { verb, args, rawCmd });

    switch (verb) {
      case '>claim':
        this.dispatchCustomEvent('omnibar:claim-workflow', { target: args, basis: 'BGB § 437' });
        break;
      case '>cancel':
        this.dispatchCustomEvent('omnibar:cancel-workflow', { target: args, basis: 'BGB § 312k' });
        break;
      case '>tax':
        this.dispatchCustomEvent('omnibar:tax-workflow', { year: args || '2026', basis: '§ 9 EStG / BMF 2022' });
        break;
      case '>import':
        this.dispatchCustomEvent('omnibar:import-receipt', { query: args, name: args });
        break;
      case '>audit':
        this.dispatchCustomEvent('omnibar:audit-workflow', {});
        this.dispatchCustomEvent('omnibar:audit-vault', {});
        break;
      case '>export':
        this.dispatchCustomEvent('omnibar:export-backup', {});
        break;
      default:
        console.info(`Executed command: ${verb} with args: ${args}`);
    }

    this.closeOmnibar(19);
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  dispatchCustomEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail, bubbles: false, cancelable: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    } else if (typeof document !== 'undefined') {
      document.dispatchEvent(event);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Ensure custom events dispatched on window also reach document listeners
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__cmlab_bridge_installed) {
  window.__cmlab_bridge_installed = true;
  const _origWindowDispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = function(event) {
    if (event && !event.__cmlab_doc_forwarded) {
      event.__cmlab_doc_forwarded = true;
      try {
        document.dispatchEvent(event);
      } catch (_) {}
    }
    return _origWindowDispatch(event);
  };
}
