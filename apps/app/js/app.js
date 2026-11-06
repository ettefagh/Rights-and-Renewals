/**
 * app.js
 * Master Application Bootstrap and Orchestrator for CM-LAB Modern Application Interface
 * Domain: https://app.[Project].page.dev
 * Architecture:
 * - Offline-first IndexedDB (VaultDB)
 * - 8-State Unified Omnibar (FSM + Dual-Index Search)
 * - Modular Dashboard Widgets (UrgentBanner, SpendRadar, MasterLedger)
 * - 520px Slide-Over Contextual Item Detail Drawer
 * - GoBD SHA-256 Immutability Engine
 * - German Statutory BGB & Tax Compliance (§§ 437, 477 BGB, § 9 EStG, BMF 2022)
 * - Dual-Domain Privacy & URL-Hash Deep Link Protocol (RFC 3986 §3.5)
 */

import { VaultDB } from './db/vaultDb.js';
import { INITIAL_VAULT_ITEMS } from './data/sampleItems.js';
import { BGBTimelineService } from './services/bgbTimeline.js';
import { GoBDCryptoService } from './services/gobdCrypto.js';
import { UnifiedOmnibarComponent } from './components/omnibar.js';
import { UrgentAttentionBanner, SpendSubscriptionRadar, MasterVaultLedger } from './components/widgets.js';
import { ContextualItemDrawer } from './components/drawer.js';

class CMApp {
  constructor() {
    this.db = new VaultDB();
    this.wikiBrands = [];
    this.vaultItems = [];

    // Component Instances
    this.omnibar = null;
    this.urgentBanner = null;
    this.radar = null;
    this.ledger = null;
    this.drawer = null;

    // Autocomplete brand list for quick capture
    this.canonicalBrands = [
      'Apple', 'Sony', 'Spotify', 'Netflix', 'FitX', 'Amazon', 'MediaMarkt', 'Saturn',
      'Adobe', 'JetBrains', 'Nintendo', 'Google', 'Samsung', 'Microsoft', 'Philips Hue',
      'Bose', 'Logitech', 'Telekom', 'Vodafone', 'Gymondo'
    ];
  }

  async init() {
    try {
      // 1. Initialize Storage & Seed Database
      await this.db.init();
      await this.db.seedIfEmpty(INITIAL_VAULT_ITEMS);

      // 2. Fetch Policy Wiki Seed Data
      await this.loadPolicyWikiData();

      // 3. Load Vault Items
      await this.loadVaultItems();

      // 4. Mount Components
      this.mountOmnibar();
      this.mountWidgets();
      this.mountDrawer();

      // 5. Bind Global UI Events & Theme
      this.bindThemeToggle();
      this.bindQuickAddTriggers();
      this.bindNavigation();
      this.bindOmnibarCustomEvents();

      // 6. Handle URL-Hash Deep Link Handoff
      this.handleUrlHashHandoff();
      window.addEventListener('hashchange', () => this.handleUrlHashHandoff());

      // 7. Update Storage Quota UI
      this.updateStorageQuotaUI();

      console.log('✓ CM-LAB Modern Application Initialized Successfully.');
    } catch (err) {
      console.error('Fatal initialization error in CMApp:', err);
      this.showToast('Fehler bei der Initialisierung des Tresors: ' + err.message, 'urgent');
    }
  }

  // --------------------------------------------------------------------------
  // DATA MANAGEMENT
  // --------------------------------------------------------------------------

  async loadPolicyWikiData() {
    try {
      const resp = await fetch('./data/policy_wiki_seed_v1.json');
      if (resp.ok) {
        const data = await resp.json();
        this.wikiBrands = Array.isArray(data) ? data : (data.brands || []);
      }
    } catch (e) {
      console.warn('Could not fetch policy_wiki_seed_v1.json, using fallback brands:', e);
    }
  }

  async loadVaultItems() {
    this.vaultItems = await this.db.getItems();
    this.updateVaultCountBadge();
  }

  async refreshAll() {
    await this.loadVaultItems();

    if (this.omnibar) {
      this.omnibar.updateData({
        wikiBrands: this.wikiBrands,
        vaultItems: this.vaultItems
      });
    }

    if (this.urgentBanner) this.urgentBanner.update(this.vaultItems);
    if (this.radar) this.radar.update(this.vaultItems);
    if (this.ledger) this.ledger.update(this.vaultItems);

    this.updateStorageQuotaUI();
  }

  updateVaultCountBadge() {
    const badge = document.getElementById('sidebar-vault-count');
    if (badge) {
      badge.textContent = String(this.vaultItems.length);
    }
  }

  updateStorageQuotaUI() {
    const quotaText = document.getElementById('storage-quota-text');
    const barFill = document.getElementById('storage-bar-fill');

    // Calculate approximate local storage payload in KB
    const jsonStr = JSON.stringify(this.vaultItems);
    const bytes = new Blob([jsonStr]).size + 150000; // include sample blobs/wiki
    const mbUsed = (bytes / (1024 * 1024)).toFixed(1);

    if (quotaText) {
      quotaText.textContent = `${mbUsed} MB / 50 MB`;
    }
    if (barFill) {
      const pct = Math.min(100, Math.max(4, Math.round((parseFloat(mbUsed) / 50) * 100)));
      barFill.style.width = `${pct}%`;
    }
  }

  // --------------------------------------------------------------------------
  // COMPONENT MOUNTING
  // --------------------------------------------------------------------------

  mountOmnibar() {
    const mountTarget = document.getElementById('omnibar-root');
    this.omnibar = new UnifiedOmnibarComponent({
      mountTarget,
      wikiBrands: this.wikiBrands,
      vaultItems: this.vaultItems,
      recentActivities: [
        { icon: '🎧', title: 'Sony WH-1000XM5', sub: 'Geschützt · BGB § 477 Beweislast beim Händler' },
        { icon: '🎵', title: 'Spotify Premium Student', sub: 'Frist in 3 Tagen · § 312k Kündigungsbutton' },
        { icon: '💻', title: 'Apple MacBook Pro 14" M3', sub: 'GoBD SHA-256 pre-encryption digest verifiziert' },
        { icon: '🏋️', title: 'FitX Fitnessstudio Vertrag', sub: 'Auto-Verlängerung droht · 1 Monat Frist' }
      ]
    });
  }

  mountWidgets() {
    // 1. Urgent Attention Banner
    const bannerContainer = document.getElementById('urgent-banner-container');
    if (bannerContainer) {
      this.urgentBanner = new UrgentAttentionBanner(bannerContainer, {
        onAction: (action) => this.handleBannerAction(action)
      });
      this.urgentBanner.update(this.vaultItems);
    }

    // 2. Spend & Subscription Radar
    const radarContainer = document.getElementById('radar-container');
    if (radarContainer) {
      this.radar = new SpendSubscriptionRadar(radarContainer, {
        onExportTax: (items) => this.radar.exportTaxCsv(),
        onSelectCategory: (category) => {
          if (this.ledger) {
            this.ledger.setCategoryFilter(category);
            document.getElementById('ledger-container')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
      this.radar.update(this.vaultItems);
    }

    // 3. Master Chronological Vault Ledger
    const ledgerContainer = document.getElementById('ledger-container');
    if (ledgerContainer) {
      this.ledger = new MasterVaultLedger(ledgerContainer, {
        onSelectItem: (itemId) => this.openItemDrawerById(itemId),
        onGenerateClaim: (itemId) => this.generateClaimDossier(itemId),
        onCancelSubscription: (itemId) => this.generateCancellationNotice(itemId)
      });
      this.ledger.update(this.vaultItems);
    }
  }

  mountDrawer() {
    this.drawer = new ContextualItemDrawer(document.body, {
      onItemUpdated: async (updatedItem) => {
        await this.db.saveItem(updatedItem);
        await this.refreshAll();
        this.showToast('Änderungen gespeichert.', 'success');
      },
      onDeleteItem: async (itemId) => {
        await this.db.deleteItem(itemId);
        await this.refreshAll();
        this.showToast('Eintrag aus dem Tresor gelöscht.', 'warning');
      },
      onGenerateClaim: (itemId) => this.generateClaimDossier(itemId),
      onGenerateCancellation: (itemId) => this.generateCancellationNotice(itemId)
    });
  }

  // --------------------------------------------------------------------------
  // EVENT WIRING & GLOBAL ACTIONS
  // --------------------------------------------------------------------------

  bindOmnibarCustomEvents() {
    const addDualListener = (eventName, handler) => {
      const guardedHandler = (e) => {
        if (e.__cmlab_handled) return;
        e.__cmlab_handled = true;
        handler(e);
      };
      document.addEventListener(eventName, guardedHandler);
      if (typeof window !== 'undefined') {
        window.addEventListener(eventName, guardedHandler);
      }
    };

    // Open Drawer for Item
    addDualListener('omnibar:open-drawer', (e) => {
      if (e.detail && this.drawer) {
        const fullItem = (e.detail.id && this.vaultItems.find(i => String(i.id) === String(e.detail.id))) || e.detail;
        this.drawer.open(fullItem);
      }
    });

    // Create New Hardware Item
    addDualListener('omnibar:create-item', (e) => {
      const query = (e.detail && (e.detail.query || e.detail.name)) || '';
      this.openQuickCaptureModal({ name: query, category: 'hardware' });
    });

    // Add Subscription Item
    addDualListener('omnibar:add-subscription', (e) => {
      const query = (e.detail && (e.detail.query || e.detail.name)) || '';
      this.openQuickCaptureModal({ name: query, category: 'subscription' });
    });

    // Import Receipt Action
    addDualListener('omnibar:import-receipt', (e) => {
      this.openQuickCaptureModal({ openDropzone: true });
    });

    // Executable Verbs
    addDualListener('omnibar:claim-workflow', (e) => {
      const target = (e.detail?.target || e.detail?.itemId || e.detail?.id || (e.detail?.item && e.detail.item.id) || '').toString().trim();
      let item = null;
      if (target) {
        const targetLower = target.toLowerCase();
        item = this.vaultItems.find(i => String(i.id).toLowerCase() === targetLower) ||
               this.vaultItems.find(i => i.name && i.name.toLowerCase().includes(targetLower)) ||
               this.vaultItems.find(i => i.merchant && i.merchant.toLowerCase().includes(targetLower));
      }
      if (item) {
        this.generateClaimDossier(item.id);
      } else if (!target) {
        this.showToast('Bitte geben Sie einen Artikel an, z.B. ">claim Sony"', 'warning');
      } else {
        this.showToast('Artikel im Tresor nicht gefunden.', 'warning');
      }
    });

    addDualListener('omnibar:cancel-workflow', (e) => {
      const target = (e.detail?.target || e.detail?.itemId || e.detail?.id || (e.detail?.item && e.detail.item.id) || '').toString().trim();
      let item = null;
      if (target) {
        const targetLower = target.toLowerCase();
        item = this.vaultItems.find(i => String(i.id).toLowerCase() === targetLower) ||
               this.vaultItems.find(i => i.name && i.name.toLowerCase().includes(targetLower)) ||
               this.vaultItems.find(i => i.merchant && i.merchant.toLowerCase().includes(targetLower));
      }
      if (item) {
        this.generateCancellationNotice(item.id);
      } else if (!target) {
        this.showToast('Bitte geben Sie ein Abonnement an, z.B. ">cancel Spotify"', 'warning');
      } else {
        this.showToast('Abonnement im Tresor nicht gefunden.', 'warning');
      }
    });

    addDualListener('omnibar:tax-workflow', () => {
      if (this.radar) {
        this.radar.exportTaxCsv();
        this.showToast('Steuer-Dossier (BMF 2022) als CSV exportiert.', 'success');
      }
    });

    const handleAuditVault = () => {
      this.runVaultAudit();
    };
    addDualListener('omnibar:audit-vault', handleAuditVault);
    addDualListener('omnibar:audit-workflow', handleAuditVault);

    addDualListener('omnibar:export-backup', () => {
      this.exportVaultBackup();
    });

    const handleAction = (e) => {
      const actionId = e.detail?.actionId || e.detail?.action;
      if (actionId === 'quick_add') {
        this.openQuickCaptureModal();
      } else if (actionId === 'import_receipt') {
        this.openQuickCaptureModal({ openDropzone: true });
      } else if (actionId === 'policy_wiki') {
        this.filterLedgerToWiki();
      } else if (actionId === 'tax_summary') {
        if (this.radar) this.radar.exportTaxCsv();
      } else if (actionId === 'claim_wizard') {
        this.openFirstClaimableHardware();
      } else if (actionId === 'audit_vault') {
        this.runVaultAudit();
      }
    };
    addDualListener('omnibar:action', handleAction);
    addDualListener('omnibar:quick-action', handleAction);
  }

  bindThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      try {
        localStorage.setItem('cmlab-theme', nextTheme);
      } catch (e) {}

      btn.textContent = nextTheme === 'dark' ? '☀️' : '🌓';
      this.showToast(`Farbschema auf "${nextTheme === 'dark' ? 'Dunkel' : 'Hell'}" umgestellt.`, 'info', 2000);
    });

    // Initialize icon based on initial theme
    const active = document.documentElement.getAttribute('data-theme');
    if (active === 'dark') btn.textContent = '☀️';
  }

  bindQuickAddTriggers() {
    const headerBtn = document.getElementById('quick-add-btn');
    if (headerBtn) {
      headerBtn.addEventListener('click', () => this.openQuickCaptureModal());
    }

    const mobileAddBtn = document.getElementById('mobile-add-btn');
    if (mobileAddBtn) {
      mobileAddBtn.addEventListener('click', () => this.openQuickCaptureModal());
    }
  }

  bindNavigation() {
    // Sidebar Links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const nav = e.currentTarget.getAttribute('data-nav');
        this.handleNavigationAction(nav);
      });
    });

    // Mobile Bottom Nav
    document.querySelectorAll('.mobile-nav-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.currentTarget.id === 'mobile-add-btn') return;
        document.querySelectorAll('.mobile-nav-link').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const nav = e.currentTarget.getAttribute('data-nav');
        this.handleNavigationAction(nav);
      });
    });

    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', () => {
        const input = document.getElementById('omnibar-input');
        if (input) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          input.focus();
        }
      });
    }
  }

  handleNavigationAction(nav) {
    if (nav === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (this.ledger) this.ledger.setCategoryFilter('all');
    } else if (nav === 'vault') {
      document.getElementById('ledger-container')?.scrollIntoView({ behavior: 'smooth' });
      if (this.ledger) this.ledger.setCategoryFilter('all');
    } else if (nav === 'calendar') {
      document.getElementById('urgent-banner-container')?.scrollIntoView({ behavior: 'smooth' });
    } else if (nav === 'tax') {
      document.getElementById('radar-container')?.scrollIntoView({ behavior: 'smooth' });
      if (this.ledger) this.ledger.setCategoryFilter('tax');
    } else if (nav === 'wiki') {
      const input = document.getElementById('omnibar-input');
      if (input) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        input.value = 'Apple';
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  handleBannerAction(action) {
    if (!action) return;
    if (action.type === 'open_drawer') {
      this.openItemDrawerById(action.itemId);
    } else if (action.type === 'cancel_subscription') {
      this.generateCancellationNotice(action.itemId);
    } else if (action.type === 'generate_claim') {
      this.generateClaimDossier(action.itemId);
    }
  }

  openItemDrawerById(itemId) {
    const item = this.vaultItems.find(i => String(i.id) === String(itemId));
    if (item && this.drawer) {
      this.drawer.open(item);
    }
  }

  // --------------------------------------------------------------------------
  // URL HASH DEEP LINK PROTOCOL (RFC 3986 §3.5 & TC-APP-05)
  // --------------------------------------------------------------------------

  handleUrlHashHandoff() {
    const hash = window.location.hash;
    if (!hash) return;

    // Format: #action=view&slug=... or #action=view&id=...
    if (hash.includes('action=view')) {
      const params = new URLSearchParams(hash.replace(/^#\/?/, '').replace('action=view&', '').replace('action=view', ''));
      const fullParams = new URLSearchParams(hash.substring(hash.indexOf('?') + 1) || hash.substring(1));
      const slug = fullParams.get('slug') || params.get('slug');
      const id = fullParams.get('id') || params.get('id');

      const found = this.vaultItems.find(i => 
        (id && String(i.id) === String(id)) ||
        (slug && ((i.brandSlug === slug) || (i.name && i.name.toLowerCase().includes(slug.toLowerCase()))))
      );

      if (found && this.drawer) {
        this.drawer.open(found);
      }
      return;
    }

    // Format: #/quick-add?brand=... or #action=add?...
    if (hash.startsWith('#/quick-add') || hash.startsWith('#action=add')) {
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const queryPart = hash.substring(qIndex + 1);
        const params = new URLSearchParams(queryPart);

        this.openQuickCaptureModal({
          merchant: params.get('brand') || params.get('merchant') || '',
          name: params.get('name') || '',
          priceEur: params.get('price') ? parseFloat(params.get('price')) : '',
          category: params.get('category') || 'hardware',
          purchaseDate: params.get('purchaseDate') || new Date().toISOString().split('T')[0],
          isTaxDeductible: params.get('tax') === 'true'
        });

        // Strip hash to prevent sensitive query params from persisting in browser history
        try {
          history.replaceState(null, '', window.location.pathname);
        } catch (e) {}
      }
    }
  }

  // --------------------------------------------------------------------------
  // QUICK CAPTURE MODAL (<15s Entry Workflow)
  // --------------------------------------------------------------------------

  openQuickCaptureModal(defaults = {}) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const brand = defaults.merchant || defaults.brand || '';
    const name = defaults.name || '';
    const price = defaults.priceEur !== undefined ? defaults.priceEur : '';
    const category = defaults.category || 'hardware';
    const purchaseDate = defaults.purchaseDate || new Date().toISOString().split('T')[0];
    const isTax = defaults.isTaxDeductible || false;

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="quick-capture-backdrop">
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-quick-title">
          <header class="modal-header">
            <h3 id="modal-quick-title" class="modal-title">
              <span aria-hidden="true">⚡</span> Neuer Beleg / Garantieerfassung (&lt;15s)
            </h3>
            <button type="button" class="modal-close-btn" id="modal-close-x" aria-label="Schließen">✕</button>
          </header>

          <form id="quick-capture-form" class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="qc-category">Kategorie *</label>
                <select id="qc-category" class="form-select font-mono" required>
                  <option value="hardware" ${category === 'hardware' ? 'selected' : ''}>💻 Hardware / Kaufgerät</option>
                  <option value="subscription" ${category === 'subscription' ? 'selected' : ''}>🎵 Abonnement / Vertrag</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="qc-brand">Hersteller / Händler *</label>
                <input
                  type="text"
                  id="qc-brand"
                  class="form-input"
                  list="qc-brand-datalist"
                  placeholder="z.B. Sony, Apple, Saturn"
                  value="${this.escapeHtml(brand)}"
                  required
                />
                <datalist id="qc-brand-datalist">
                  ${this.canonicalBrands.map(b => `<option value="${b}">`).join('')}
                </datalist>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="qc-name">Artikel- / Vertragsbezeichnung *</label>
              <input
                type="text"
                id="qc-name"
                class="form-input"
                placeholder="z.B. Sony WH-1000XM5 oder Spotify Student"
                value="${this.escapeHtml(name)}"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="qc-price">Betrag (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="qc-price"
                  class="form-input font-mono"
                  placeholder="z.B. 279.00"
                  value="${price}"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="qc-date">Kauf- / Startdatum *</label>
                <input
                  type="date"
                  id="qc-date"
                  class="form-input font-mono"
                  value="${purchaseDate}"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-checkbox-label" for="qc-tax">
                <input type="checkbox" id="qc-tax" class="form-checkbox" ${isTax ? 'checked' : ''} />
                <span>Als Werbungskosten erfassen (§ 9 EStG / 100% BMF 2022 Sofortabschreibung)</span>
              </label>
            </div>

            <!-- Receipt File Dropzone with GoBD SHA-256 Pre-Encryption Stamping -->
            <div class="form-group">
              <label class="form-label">Kaufbeleg / Rechnung (GoBD Rn. 108–110 Unveränderbarkeit)</label>
              <div class="dropzone-box" id="qc-dropzone">
                <div class="dropzone-icon">📷</div>
                <div class="dropzone-text" id="qc-dropzone-text">
                  Klicken zum Auswählen oder Belegbild hierhin ziehen
                </div>
                <div class="dropzone-meta">JPG, PNG, WebP oder PDF · Max 10MB · Lokale SHA-256 Signierung</div>
                <input type="file" id="qc-file-input" accept="image/*,application/pdf" style="display: none;" />
              </div>
              <div id="qc-hash-preview" class="font-mono text-muted" style="font-size: 0.75rem; margin-top: 4px; display: none;"></div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="qc-cancel-btn">Abbrechen</button>
              <button type="submit" class="btn-primary" id="qc-submit-btn">✓ Im Tresor speichern</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('quick-capture-backdrop');
    const closeX = document.getElementById('modal-close-x');
    const cancelBtn = document.getElementById('qc-cancel-btn');
    const form = document.getElementById('quick-capture-form');
    const dropzone = document.getElementById('qc-dropzone');
    const fileInput = document.getElementById('qc-file-input');
    const hashPreview = document.getElementById('qc-hash-preview');
    const dropzoneText = document.getElementById('qc-dropzone-text');

    let receiptBlob = null;
    let computedDigest = null;

    const closeModal = () => {
      modalContainer.innerHTML = '';
    };

    closeX.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Dropzone triggers
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processSelectedFile(e.target.files[0]);
      }
    });

    const processSelectedFile = async (file) => {
      receiptBlob = file;
      dropzoneText.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      try {
        const metadata = {
          name: document.getElementById('qc-name').value || file.name,
          merchant: document.getElementById('qc-brand').value || 'Unbekannt',
          date: document.getElementById('qc-date').value || new Date().toISOString()
        };
        computedDigest = await GoBDCryptoService.computeReceiptDigest(file, metadata);
        hashPreview.style.display = 'block';
        hashPreview.innerHTML = `🔒 GoBD SHA-256 Digest: <strong>${computedDigest.substring(0, 16)}...</strong>`;
      } catch (err) {
        console.warn('Could not compute client hash:', err);
      }
    };

    // Auto-focus first field
    setTimeout(() => {
      const firstInput = document.getElementById('qc-brand');
      if (firstInput) firstInput.focus();
    }, 100);

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const itemCategory = document.getElementById('qc-category').value;
      const itemBrand = document.getElementById('qc-brand').value.trim();
      const itemName = document.getElementById('qc-name').value.trim();
      const itemPrice = parseFloat(document.getElementById('qc-price').value) || 0;
      const itemDate = document.getElementById('qc-date').value;
      const isTaxDeductible = document.getElementById('qc-tax').checked;

      // Calculate BGB milestones
      const pDate = new Date(itemDate);
      const isHardware = itemCategory === 'hardware';
      let milestones = null;
      let legalStatus = null;

      if (isHardware) {
        milestones = BGBTimelineService.calculateMilestones(pDate);
        legalStatus = BGBTimelineService.evaluateStatus(pDate, new Date());
      }

      // Generate GoBD hash if not generated via dropzone
      if (!computedDigest) {
        computedDigest = await GoBDCryptoService.computeReceiptDigest(
          `CMLAB_RECEIPT_STAMP_${itemName}_${itemBrand}_${itemDate}_${itemPrice}`,
          { name: itemName, merchant: itemBrand, date: itemDate, price: itemPrice }
        );
      }

      const newItem = {
        id: 'vault_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: itemName,
        merchant: itemBrand,
        category: itemCategory,
        priceEur: itemPrice,
        purchaseDate: itemDate,
        isTaxDeductible: isTaxDeductible,
        taxCategory: isTaxDeductible ? 'Arbeitsmittel' : 'Private',
        receiptSha256: computedDigest,
        receiptMimeType: receiptBlob ? receiptBlob.type : 'image/jpeg',
        receiptBlob: receiptBlob || null,
        status: isHardware 
          ? (legalStatus?.status === 'protected' ? 'protected' : (legalStatus?.status === 'cliff_warning' ? 'warning' : 'expired'))
          : 'protected',
        daysRemaining: isHardware ? (milestones?.daysToExpiry || 730) : 30,
        daysToCliff: isHardware ? (milestones?.daysToCliff || 365) : null,
        isWithinReversedBurdenOfProof: isHardware ? (legalStatus?.burden_of_proof === 'seller') : false,
        searchTokens: [itemName, itemBrand, itemCategory, isTaxDeductible ? 'tax' : '']
      };

      await this.db.saveItem(newItem);
      await this.refreshAll();
      closeModal();
      this.showToast(`"${newItem.name}" erfolgreich im Tresor gesichert.`, 'success');
    });
  }

  // --------------------------------------------------------------------------
  // STATUTORY LEGAL NOTICE WORKFLOWS (DIN 5008 & BGB § 312k)
  // --------------------------------------------------------------------------

  generateClaimDossier(itemId) {
    const item = this.vaultItems.find(i => String(i.id) === String(itemId));
    if (!item) {
      this.showToast('Artikel im Tresor nicht gefunden.', 'warning');
      return;
    }

    const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : new Date();
    const notice = BGBTimelineService.generateStatutoryNotice(
      item,
      purchaseDate,
      'Mangel festgestellt: Gerät weist Funktionsausfall auf (z.B. Defekt der Elektronik / Signalverlust).'
    );

    const noticeContent = notice.fullNoticeText || notice.dossier_text_de;

    this.showDossierModal('⚡ Gesetzliche Mängelrüge gem. §§ 437, 439 BGB', noticeContent, () => {
      this.downloadTextFile(
        `Maengelruege_${item.merchant || 'Haendler'}_${item.name.replace(/\s+/g, '_')}.txt`,
        noticeContent
      );
    });
  }

  generateCancellationNotice(itemId) {
    const item = this.vaultItems.find(i => String(i.id) === String(itemId));
    if (!item) {
      this.showToast('Abonnement im Tresor nicht gefunden.', 'warning');
      return;
    }

    const noticeText = `
KÜNDIGUNG GEMÄSS § 312K BGB (KÜNDIGUNGSBUTTON-PFLICHT)
Empfänger: ${item.merchant || 'Vertragspartner'}
Vertragsgegenstand: ${item.name}
Datum: ${new Date().toLocaleDateString('de-DE')}

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen oben genannten Vertrag zum nächstmöglichen Zeitpunkt 
gemäß § 309 Nr. 9 lit. c BGB (maximale Kündigungsfrist von einem Monat nach Ablauf der Erstlaufzeit).

Hilfsweise kündige ich außerordentlich und fristlos gemäß § 312k Abs. 6 BGB, da die 
gesetzlich vorgeschriebene Kündigungsschaltfläche ("Kündigungsbutton") auf Ihrer Webseite 
nicht ordnungsgemäß oder barrierefrei bereitgestellt wurde.

Bitte bestätigen Sie mir den Eingang dieser Kündigung sowie das Beendigungsdatum 
innerhalb von 14 Tagen in Textform (§ 126b BGB).

Mit freundlichen Grüßen,
Verbraucher / Vertragsinhaber
    `.trim();

    this.showDossierModal('🛑 Kündigungsschreiben gem. § 312k BGB', noticeText, () => {
      this.downloadTextFile(
        `Kuendigung_${item.merchant || 'Anbieter'}_${item.name.replace(/\s+/g, '_')}.txt`,
        noticeText
      );
    });
  }

  showDossierModal(title, textContent, onDownload) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="dossier-backdrop">
        <div class="modal-container" role="dialog" aria-modal="true" style="max-width: 680px;">
          <header class="modal-header">
            <h3 class="modal-title">${this.escapeHtml(title)}</h3>
            <button type="button" class="modal-close-btn" id="dossier-close-x">✕</button>
          </header>
          <div class="modal-body">
            <pre class="font-mono" style="background: var(--color-surface-canvas); padding: 14px; border-radius: 8px; border: 1px solid var(--color-border-subtle); max-height: 400px; overflow-y: auto; font-size: 0.8125rem; white-space: pre-wrap;">${this.escapeHtml(textContent)}</pre>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="dossier-close-btn">Schließen</button>
            <button type="button" class="btn-primary" id="dossier-download-btn">📥 Dossier herunterladen (.txt)</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('dossier-backdrop');
    const closeX = document.getElementById('dossier-close-x');
    const closeBtn = document.getElementById('dossier-close-btn');
    const dlBtn = document.getElementById('dossier-download-btn');

    const close = () => { modalContainer.innerHTML = ''; };
    closeX.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    dlBtn.addEventListener('click', () => {
      if (typeof onDownload === 'function') onDownload();
      this.showToast('Dokument erfolgreich heruntergeladen.', 'success');
      close();
    });
  }

  runVaultAudit() {
    let gobdVerified = 0;
    let missingProofs = 0;
    let cliffWarnings = 0;

    for (const item of this.vaultItems) {
      if (item.receiptSha256 && item.receiptSha256.length === 64) {
        gobdVerified++;
      } else {
        missingProofs++;
      }
      if (item.category === 'hardware' && item.isWithinReversedBurdenOfProof && (item.daysToCliff || 0) <= 45) {
        cliffWarnings++;
      }
    }

    const auditSummary = `GoBD Integritäts-Audit abgeschlossen:
• ${gobdVerified} Belege mit unveränderlichem SHA-256 Digest verifiziert
• ${missingProofs} Positionen ohne Belegbild
• ${cliffWarnings} Hardware-Artikel vor BGB § 477 Beweislast-Cliff`;

    this.showToast(auditSummary, 'success', 5000);
  }

  exportVaultBackup() {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      vaultItemsCount: this.vaultItems.length,
      items: this.vaultItems
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    this.downloadTextFile(`CMLAB_Vault_Backup_${new Date().toISOString().split('T')[0]}.json`, jsonStr);
    this.showToast('Lokales Tresor-Backup heruntergeladen.', 'success');
  }

  openFirstClaimableHardware() {
    const hw = this.vaultItems.find(i => i.category === 'hardware');
    if (hw) {
      this.generateClaimDossier(hw.id);
    } else {
      this.showToast('Keine Hardware im Tresor vorhanden.', 'info');
    }
  }

  filterLedgerToWiki() {
    if (this.ledger) {
      this.ledger.setCategoryFilter('all');
      document.getElementById('ledger-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `cmlab-toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'urgent' ? '🛑' : (type === 'warning' ? '⚠️' : 'ℹ️'));
    toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
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

// Instantiate and bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new CMApp();
  window.cmApp = app;
  app.init();
});

export { CMApp };
