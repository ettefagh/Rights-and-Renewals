/**
 * omnibar.js
 * Showcase Unified Search/Activity/Request Bar Demo (Feature 10)
 * Multi-domain querying across 20-brand policy wiki & sample wallet in <5ms
 */

import { SAMPLE_SHOWCASE_ITEMS } from '../data/showcaseSampleData.js';

export class OmnibarDemoController {
  constructor(options = {}) {
    this.container = document.getElementById('showcase-omnibar-root');
    this.seedBrands = options.seedBrands || [];
    this.sampleItems = options.sampleItems || SAMPLE_SHOWCASE_ITEMS;
    this.filterCategory = 'all'; // 'all' | 'subscription' | 'hardware'
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="omnibar-card card" id="omnibar-card">
        <div class="omnibar-input-row" role="combobox" aria-expanded="false" aria-haspopup="listbox" id="omnibar-combobox">
          <span class="omnibar-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            id="showcase-omnibar-input"
            class="omnibar-input"
            placeholder="Suche 20 Brand-Policies, gespeicherte Belege oder '>' für Befehle..."
            aria-label="Universal Search Bar"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="omnibar-badges-right">
            <span class="omnibar-hotkey-badge">⌘K</span>
            <button id="omnibar-clear-btn" class="omnibar-clear-btn" style="display: none;" title="Eingabe löschen">✕</button>
          </div>
        </div>

        <div class="omnibar-filter-chips">
          <button class="chip ${this.filterCategory === 'all' ? 'chip-active' : ''}" data-cat="all">Alle Kategorien</button>
          <button class="chip ${this.filterCategory === 'subscription' ? 'chip-active' : ''}" data-cat="subscription">🎵 Abonnements (10)</button>
          <button class="chip ${this.filterCategory === 'hardware' ? 'chip-active' : ''}" data-cat="hardware">💻 Hardware &amp; Retail (10)</button>
        </div>

        <div class="omnibar-dropdown" id="omnibar-dropdown" style="display: none;" role="listbox">
          <div class="omnibar-results-container" id="omnibar-results-container"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    const input = document.getElementById('showcase-omnibar-input');
    const clearBtn = document.getElementById('omnibar-clear-btn');
    const dropdown = document.getElementById('omnibar-dropdown');
    const combobox = document.getElementById('omnibar-combobox');

    if (input) {
      input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
          if (clearBtn) clearBtn.style.display = 'block';
          if (dropdown) dropdown.style.display = 'block';
          if (combobox) combobox.setAttribute('aria-expanded', 'true');
          this.executeSearch(query);
        } else {
          if (clearBtn) clearBtn.style.display = 'none';
          if (dropdown) dropdown.style.display = 'none';
          if (combobox) combobox.setAttribute('aria-expanded', 'false');
        }
      });

      input.addEventListener('focus', () => {
        if (input.value.trim().length > 0 && dropdown) {
          dropdown.style.display = 'block';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          input.focus();
        }
        clearBtn.style.display = 'none';
        if (dropdown) dropdown.style.display = 'none';
      });
    }

    // Category filter chips
    this.container.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        this.filterCategory = chip.getAttribute('data-cat');
        this.container.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
        chip.classList.add('chip-active');
        if (input && input.value.trim().length > 0) {
          this.executeSearch(input.value.trim());
        }
        return;
      }

      // Result clicks
      const brandMatch = e.target.closest('.omnibar-match-brand');
      if (brandMatch) {
        const slug = brandMatch.getAttribute('data-slug');
        window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
          detail: { tool: 'policy_lookup', args: { service_slug: slug } }
        }));
        if (dropdown) dropdown.style.display = 'none';
        return;
      }

      const vaultMatch = e.target.closest('.omnibar-match-vault');
      if (vaultMatch) {
        const name = vaultMatch.getAttribute('data-name');
        alert(`Gespeicherter Beleg ausgewählt: ${name}\nStatus: GoBD SHA-256 verifiziert`);
        if (dropdown) dropdown.style.display = 'none';
        return;
      }

      const suggestionAction = e.target.closest('.omnibar-fallback-action');
      if (suggestionAction) {
        const action = suggestionAction.getAttribute('data-action');
        const q = input?.value || '';
        alert(`Aktion ausgeführt: ${action} für "${q}"`);
        if (dropdown) dropdown.style.display = 'none';
      }
    });

    // Global Hotkey (Cmd/Ctrl + K)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  }

  executeSearch(rawQuery) {
    const resultsContainer = document.getElementById('omnibar-results-container');
    if (!resultsContainer) return;

    const t0 = performance.now();
    const query = rawQuery.toLowerCase();

    // Check for Command Mode
    if (rawQuery.startsWith('>')) {
      const command = rawQuery.slice(1).trim();
      resultsContainer.innerHTML = this.renderCommandMode(command);
      return;
    }

    // 1. Search Canonical Brands (Wiki)
    let brandMatches = this.seedBrands.filter(b => {
      if (this.filterCategory !== 'all' && b.category !== this.filterCategory) return false;
      const slugMatch = (b.service_slug || '').toLowerCase().includes(query);
      const nameMatch = (b.brand_name || '').toLowerCase().includes(query);
      const aliasMatch = Array.isArray(b.search_aliases) && b.search_aliases.some(a => a.toLowerCase().includes(query));
      return slugMatch || nameMatch || aliasMatch;
    });

    // 2. Search Saved Vault Items
    let vaultMatches = this.sampleItems.filter(item => {
      if (this.filterCategory !== 'all' && item.category !== this.filterCategory) return false;
      const nameMatch = item.name.toLowerCase().includes(query);
      const merchMatch = item.merchant.toLowerCase().includes(query);
      const tokenMatch = Array.isArray(item.searchTokens) && item.searchTokens.some(t => t.includes(query));
      return nameMatch || merchMatch || tokenMatch;
    });

    const elapsed = (performance.now() - t0).toFixed(2);

    // If zero matches, render zero-dead-end fallback suggestions
    if (brandMatches.length === 0 && vaultMatches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="omnibar-timing-row text-muted font-mono">
          <span>0 Treffer für "${rawQuery}" (${elapsed}ms)</span>
        </div>
        <div class="omnibar-fallback-group">
          <div class="omnibar-section-title">Zero-Dead-End Vorschläge</div>
          <button class="omnibar-fallback-action" data-action="create_warranty">
            <span class="action-icon">➕</span>
            <div class="action-text">
              <strong>Erfasse neue Garantie für "${rawQuery}"</strong>
              <span class="text-muted">Statutengerechte BGB Fristerfassung (&lt;15s)</span>
            </div>
          </button>
          <button class="omnibar-fallback-action" data-action="search_bgb">
            <span class="action-icon">⚖️</span>
            <div class="action-text">
              <strong>BGB-Rechtsgrundlagen durchsuchen für "${rawQuery}"</strong>
              <span class="text-muted">Prüfe §§ 437, 477 Abs. 1 und § 309 Nr. 9</span>
            </div>
          </button>
          <button class="omnibar-fallback-action" data-action="import_receipt">
            <span class="action-icon">📷</span>
            <div class="action-text">
              <strong>Beleg / Rechnung für "${rawQuery}" scannen</strong>
              <span class="text-muted">GoBD-konforme SHA-256 Kryptosignatur erzeugen</span>
            </div>
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div class="omnibar-timing-row text-muted font-mono">
        <span>${brandMatches.length + vaultMatches.length} Treffer in ${elapsed}ms</span>
      </div>
    `;

    // Render Brand Wiki matches
    if (brandMatches.length > 0) {
      html += `
        <div class="omnibar-results-section">
          <div class="omnibar-section-title">🏛️ POLICY WIKI RECHTSGRUNDLAGEN (${brandMatches.length})</div>
          ${brandMatches.map(b => `
            <div class="omnibar-match-item omnibar-match-brand" data-slug="${b.service_slug}">
              <div class="match-left">
                <span class="match-icon">${b.category === 'subscription' ? '🎵' : '💻'}</span>
                <div class="match-info">
                  <div class="match-title">
                    <strong>${b.brand_name}</strong>
                    <span class="badge-subtle font-mono">${b.category}</span>
                  </div>
                  <div class="match-sub text-muted font-mono">
                    ${b.statutory_basis ? b.statutory_basis.slice(0, 2).join(' · ') : 'BGB'}
                  </div>
                </div>
              </div>
              <div class="match-right">
                ${b.cancellation_button_url ? '<span class="badge-protected">✓ § 312k Button</span>' : '<span class="badge-subtle">§ 437 Gewährleistung</span>'}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Render Saved Vault Items matches
    if (vaultMatches.length > 0) {
      html += `
        <div class="omnibar-results-section">
          <div class="omnibar-section-title">🔒 GESPEICHERTE BELEGE &amp; GERÄTE (${vaultMatches.length})</div>
          ${vaultMatches.map(item => `
            <div class="omnibar-match-item omnibar-match-vault" data-name="${item.name}">
              <div class="match-left">
                <span class="match-icon">${item.category === 'subscription' ? '📱' : '🎧'}</span>
                <div class="match-info">
                  <div class="match-title font-bold">${item.name}</div>
                  <div class="match-sub text-muted font-mono">
                    Händler: ${item.merchant} · Frist: ${item.expiryDate}
                  </div>
                </div>
              </div>
              <div class="match-right">
                <span class="badge-price">${item.priceEur.toFixed(2)} €</span>
                <span class="sim-status-glyph">${item.status === 'urgent' ? '🛑' : item.status === 'warning' ? '⚠️' : '🛡️'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    resultsContainer.innerHTML = html;
  }

  renderCommandMode(cmd) {
    const commands = [
      { verb: '>claim', desc: 'Mängelrüge nach § 437/439 BGB generieren', example: '>claim MacBook' },
      { verb: '>cancel', desc: 'Vertragskündigung nach § 312k BGB vorbereiten', example: '>cancel Spotify' },
      { verb: '>tax', desc: 'Werbungskosten-Report nach BMF 2022 kompilieren', example: '>tax 2026' },
      { verb: '>import', desc: 'Belegfoto mit GoBD SHA-256 Signatur einlesen', example: '>import Saturn' },
      { verb: '>audit', desc: 'Sicherheitsaudit der lokalen Vault-Datenbank ausführen', example: '>audit' }
    ];

    const matched = commands.filter(c => c.verb.includes(`>${cmd}`));

    return `
      <div class="omnibar-command-container">
        <div class="omnibar-section-title font-mono">⚡ BEFEHLSMODUS (${matched.length} Workflows verfügbar)</div>
        ${matched.map(c => `
          <div class="command-item font-mono" data-verb="${c.verb}">
            <div class="command-verb font-bold">${c.verb}</div>
            <div class="command-desc text-muted">${c.desc}</div>
            <div class="command-eg badge-subtle">${c.example}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}
