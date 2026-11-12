/**
 * simulator.js
 * Controller for Live App Simulator sub-panel (Feature 5)
 */

export class SimulatorController {
  constructor(options = {}) {
    this.container = document.getElementById('app-simulator-root');
    this.simulatedItems = [
      {
        id: 'sim-sony',
        title: 'Sony WH-1000XM5 ANC Headphones',
        brand: 'Sony',
        brandSlug: 'sony',
        category: 'Hardware',
        priceEur: 279.00,
        purchaseDate: '15.12.2025',
        merchant: 'MediaMarkt Berlin',
        statusLevel: 'warning',
        statusGlyph: '⚠️',
        statusText: 'Warnung: Tag 325 von 365 — Beweislastumkehr endet in 40 Tagen',
        statutoryCite: 'BGB § 477 Abs. 1 (Verkäuferhaftung)',
        actionType: 'claim',
        actionLabel: '⚖️ 1-Tap Mängelrüge (§ 439)',
        itemArgs: {
          brand_slug: 'sony',
          item_name: 'Sony WH-1000XM5 ANC Headphones',
          purchase_date: '2025-12-15',
          defect_description: 'Active Noise Canceling microphone feedback squeal',
          issue_type: 'statutory_defect_claim'
        }
      },
      {
        id: 'sim-spotify',
        title: 'Spotify Premium Student',
        brand: 'Spotify',
        brandSlug: 'spotify',
        category: 'Subscription',
        priceEur: 5.99,
        billingCycle: 'Monatlich rollierend',
        purchaseDate: '01.03.2025',
        merchant: 'Spotify AB',
        statusLevel: 'urgent',
        statusGlyph: '🛑',
        statusText: 'Dringend: Verlängerung in 3 Tagen (€5.99)',
        statutoryCite: 'BGB § 309 Nr. 9 & § 312k (Kündigungsbutton)',
        actionType: 'cancel',
        actionLabel: '🛑 Kündigen (BGB § 312k)',
        itemArgs: {
          service_slug: 'spotify',
          category: 'subscription'
        }
      },
      {
        id: 'sim-fitx',
        title: 'FitX Gym Mitgliedschaft',
        brand: 'FitX',
        brandSlug: 'fitx',
        category: 'Subscription',
        priceEur: 29.00,
        billingCycle: 'Monatlich rollierend',
        purchaseDate: '08.05.2025',
        merchant: 'FitX Deutschland GmbH',
        statusLevel: 'urgent',
        statusGlyph: '🛑',
        statusText: 'Dringend: Kündigungsfrist läuft in 72h ab',
        statutoryCite: 'Gesetz für faire Verbraucherverträge (§ 312k BGB)',
        actionType: 'cancel',
        actionLabel: '🛑 Sofort-Kündigung generieren',
        itemArgs: {
          service_slug: 'fitx',
          category: 'subscription'
        }
      }
    ];

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="simulator-header">
        <div class="simulator-title-group">
          <span class="simulator-badge">LIVE SIMULATOR</span>
          <h3 class="simulator-title">Encrypted User Wallet</h3>
        </div>
        <button id="sim-quick-capture-btn" class="btn-compact btn-accent" title="Benchmark rapid multi-modal item capture">
          ⚡ Schnell-Erfassung simulieren (&lt;15s)
        </button>
      </div>

      <div id="sim-capture-progress" class="sim-capture-progress" style="display: none;" role="status">
        <div class="capture-progress-bar">
          <div id="capture-progress-fill" class="capture-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="capture-progress-info">
          <span id="capture-step-label">Schritt 1: Autocomplete Suche...</span>
          <span id="capture-timer-label" class="capture-timer font-mono">0.0s</span>
        </div>
      </div>

      <div class="simulator-items-list" id="sim-items-list">
        ${this.simulatedItems.map(item => this.renderItemCard(item)).join('')}
      </div>

      <div class="simulator-footer-hint">
        <span>🔒 Client-side AES-256-GCM / Dexie.js Vault Mock</span>
        <a href="https://app.[Project].page.dev/#/quick-add?brand=Sony&name=Sony+WH-1000XM5&price=279" target="_blank" rel="noopener noreferrer" class="link-external">
          In Web-App öffnen ↗
        </a>
      </div>
    `;
  }

  renderItemCard(item) {
    const isSub = item.category === 'Subscription';
    return `
      <article class="sim-card sim-card-${item.statusLevel}" id="card-${item.id}">
        <div class="sim-card-header">
          <div class="sim-card-brand-row">
            <span class="sim-card-category">${item.category}</span>
            <span class="sim-card-price">${item.priceEur.toFixed(2)} € ${isSub ? '/ Mo.' : ''}</span>
          </div>
          <h4 class="sim-card-name">${item.title}</h4>
          <div class="sim-card-merchant text-muted">Händler: ${item.merchant} · Datum: ${item.purchaseDate}</div>
        </div>

        <div class="sim-status-badge status-${item.statusLevel}">
          <span class="sim-status-glyph" aria-hidden="true">${item.statusGlyph}</span>
          <span class="sim-status-text">${item.statusText}</span>
        </div>

        <div class="sim-card-statutory font-mono text-muted">
          § ${item.statutoryCite}
        </div>

        <div class="sim-card-actions">
          <button class="btn-compact btn-primary sim-action-btn" data-action="${item.actionType}" data-id="${item.id}">
            ${item.actionLabel}
          </button>
          <button class="btn-compact btn-outline sim-details-btn" data-id="${item.id}">
            📄 Details
          </button>
        </div>
      </article>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.sim-action-btn');
      if (actionBtn) {
        const itemId = actionBtn.getAttribute('data-id');
        this.triggerItemAction(itemId);
        return;
      }

      const captureBtn = e.target.closest('#sim-quick-capture-btn');
      if (captureBtn) {
        this.runQuickCaptureSimulation();
        return;
      }

      const detailsBtn = e.target.closest('.sim-details-btn');
      if (detailsBtn) {
        const itemId = detailsBtn.getAttribute('data-id');
        this.showItemDetails(itemId);
      }
    });
  }

  triggerItemAction(itemId) {
    const item = this.simulatedItems.find(i => i.id === itemId);
    if (!item) return;

    // Visual card pulse
    const cardEl = document.getElementById(`card-${itemId}`);
    if (cardEl) {
      cardEl.classList.add('sim-card-active');
      setTimeout(() => cardEl.classList.remove('sim-card-active'), 1200);
    }

    if (item.actionType === 'cancel') {
      window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
        detail: {
          tool: 'policy_lookup',
          args: item.itemArgs
        }
      }));
    } else if (item.actionType === 'claim') {
      window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
        detail: {
          tool: 'claim_dossier_generate',
          args: item.itemArgs
        }
      }));
    }
  }

  showItemDetails(itemId) {
    const item = this.simulatedItems.find(i => i.id === itemId);
    if (!item) return;
    alert(`Item Details (${item.title}):\n• Kaufdatum: ${item.purchaseDate}\n• Betrag: €${item.priceEur.toFixed(2)}\n• Rechtsgrundlage: ${item.statutoryCite}\n• GoBD Pre-Encryption Digest vorhanden`);
  }

  runQuickCaptureSimulation() {
    const progressEl = document.getElementById('sim-capture-progress');
    const fillEl = document.getElementById('capture-progress-fill');
    const stepEl = document.getElementById('capture-step-label');
    const timerEl = document.getElementById('capture-timer-label');
    const btn = document.getElementById('sim-quick-capture-btn');

    if (!progressEl || !fillEl || !stepEl || !timerEl) return;

    btn.disabled = true;
    progressEl.style.display = 'block';
    fillEl.style.width = '0%';

    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      timerEl.textContent = `${elapsed}s`;
    }, 100);

    // Step 1: Autocomplete
    stepEl.textContent = 'Schritt 1 (3.2s): Autocomplete Suche ("Apple iPad Pro M4")...';
    fillEl.style.width = '33%';

    setTimeout(() => {
      // Step 2: Price / Date
      stepEl.textContent = 'Schritt 2 (7.4s): Kaufdatum & Preis (€1,299.00) validiert...';
      fillEl.style.width = '66%';

      setTimeout(() => {
        // Step 3: GoBD SHA-256
        stepEl.textContent = 'Schritt 3 (11.4s): GoBD SHA-256 Hash erzeugt & gespeichert...';
        fillEl.style.width = '100%';

        setTimeout(() => {
          clearInterval(interval);
          stepEl.innerHTML = '✅ <strong>Erfassung abgeschlossen in 11.4s (SLA &lt;15s: BESTANDEN)</strong>';
          btn.disabled = false;

          // Add newly captured item to simulated wallet
          const newItem = {
            id: `sim-ipad-${Date.now()}`,
            title: 'Apple iPad Pro 13" M4 (256GB)',
            brand: 'Apple',
            brandSlug: 'apple',
            category: 'Hardware',
            priceEur: 1299.00,
            purchaseDate: '05.11.2026',
            merchant: 'Apple Store Frankfurt',
            statusLevel: 'protected',
            statusGlyph: '🛡️',
            statusText: 'Geschützt: Tag 1 von 365 (Beweislast beim Verkäufer)',
            statutoryCite: 'BGB § 477 Abs. 1 & BGB § 438',
            actionType: 'claim',
            actionLabel: '⚖️ Mängelrüge generieren',
            itemArgs: {
              brand_slug: 'apple',
              item_name: 'Apple iPad Pro 13" M4',
              purchase_date: '2026-11-05',
              defect_description: 'OLED Display Pixelanomalie bei Erstinbetriebnahme'
            }
          };

          this.simulatedItems.unshift(newItem);
          const listEl = document.getElementById('sim-items-list');
          if (listEl) {
            listEl.insertAdjacentHTML('afterbegin', this.renderItemCard(newItem));
          }

          // Trigger synchronized MCP policy lookup
          window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
            detail: {
              tool: 'policy_lookup',
              args: { service_slug: 'apple', category: 'hardware' }
            }
          }));
        }, 1200);
      }, 1200);
    }, 1200);
  }
}
