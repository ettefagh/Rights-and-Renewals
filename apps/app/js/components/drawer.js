/**
 * drawer.js
 * 520px Slide-Over Contextual Item Detail Drawer for CM-LAB Modern Application (M3)
 * Standards:
 * - WAI-ARIA 1.3 Dialog (role="dialog", aria-modal="true")
 * - BGB §§ 434, 437, 438, 475e, 477 Abs. 1, 309 Nr. 9, 312k
 * - GoBD Rn. 108–110 SHA-256 Immutability Proof
 * - § 9 EStG / BMF 22.02.2022 Sofortabschreibung
 */

import { BGBTimelineService } from '../services/bgbTimeline.js';

export class ContextualItemDrawer {
  /**
   * @param {HTMLElement} [rootContainer=document.body]
   * @param {Object} [options]
   */
  constructor(rootContainer = document.body, options = {}) {
    this.root = rootContainer;
    this.options = options;
    this.isOpen = false;
    this.activeItem = null;
    this.previouslyFocusedEl = null;

    this.mountElements();
    this.bindGlobalKeyboard();
  }

  mountElements() {
    // Backdrop Scrim
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'drawer-backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');
    this.backdrop.style.display = 'none';

    // Slide-over Drawer Container
    this.drawer = document.createElement('aside');
    this.drawer.className = 'drawer-container';
    this.drawer.setAttribute('role', 'dialog');
    this.drawer.setAttribute('aria-modal', 'true');
    this.drawer.setAttribute('aria-labelledby', 'drawer-item-title');
    this.drawer.style.display = 'none';

    this.root.appendChild(this.backdrop);
    this.root.appendChild(this.drawer);

    this.backdrop.addEventListener('click', () => this.close());
  }

  open(item) {
    if (!item) return;
    this.activeItem = item;
    this.previouslyFocusedEl = document.activeElement;

    this.renderContent();

    this.backdrop.style.display = 'block';
    this.drawer.style.display = 'flex';
    document.body.classList.add('drawer-scroll-lock');

    // Trigger CSS slide-in transition
    requestAnimationFrame(() => {
      this.backdrop.classList.add('open');
      this.drawer.classList.add('open');
      this.isOpen = true;

      const closeBtn = this.drawer.querySelector('.drawer-close-btn');
      if (closeBtn) closeBtn.focus();
    });
  }

  close() {
    if (!this.isOpen) return;

    this.backdrop.classList.remove('open');
    this.drawer.classList.remove('open');
    this.isOpen = false;

    setTimeout(() => {
      this.backdrop.style.display = 'none';
      this.drawer.style.display = 'none';
      document.body.classList.remove('drawer-scroll-lock');

      if (this.previouslyFocusedEl && typeof this.previouslyFocusedEl.focus === 'function') {
        this.previouslyFocusedEl.focus();
      }
    }, 300);
  }

  renderContent() {
    const item = this.activeItem;
    if (!item) return;

    const isHardware = item.category === 'hardware';
    const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : new Date();
    const currentDate = new Date();

    // BGB Timeline Analysis
    const timeline = isHardware 
      ? BGBTimelineService.calculateMilestones(purchaseDate) 
      : null;
    const legalStatus = isHardware 
      ? BGBTimelineService.evaluateStatus(purchaseDate, currentDate) 
      : null;

    this.drawer.innerHTML = `
      <div class="drawer-inner">
        <!-- ==========================================
             ZONE 1: HEADER & IDENTITY
             ========================================== -->
        <header class="drawer-zone drawer-header">
          <div class="drawer-header-top">
            <div class="drawer-badges-wrap">
              <span class="badge ${isHardware ? 'badge-hardware' : 'badge-subscription'}">
                ${isHardware ? '💻 Hardware' : '🎵 Abonnement'}
              </span>
              ${this.renderStatusPill(item, legalStatus)}
            </div>
            <button type="button" class="drawer-close-btn" aria-label="Detailansicht schließen (Esc)">
              ✕
            </button>
          </div>

          <h2 id="drawer-item-title" class="drawer-title">${this.escapeHtml(item.name)}</h2>
          <div class="drawer-meta-sub">
            <span class="drawer-merchant text-muted">${this.escapeHtml(item.merchant || 'Händler')}</span>
            <span class="drawer-divider">•</span>
            <span class="drawer-price font-bold font-mono">
              ${(item.priceEur || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € ${isHardware ? '' : '/ Mo'}
            </span>
          </div>
        </header>

        <div class="drawer-scroll-body">
          <!-- ==========================================
               ZONE 2: 24-MONTH STATUTORY BGB TIMELINE
               ========================================== -->
          ${isHardware && timeline && legalStatus ? this.renderZoneTimeline(item, timeline, legalStatus) : this.renderZoneSubscriptionTerm(item)}

          <!-- ==========================================
               ZONE 3: GOBD RECEIPT PROOF VAULT
               ========================================== -->
          ${this.renderZoneReceiptProof(item)}

          <!-- ==========================================
               ZONE 4: GERMAN INCOME TAX LEDGER (§ 9 EStG)
               ========================================== -->
          ${this.renderZoneTaxLedger(item)}
        </div>

        <!-- ==========================================
             ZONE 5: PRIMARY ACTION FOOTER
             ========================================== -->
        <footer class="drawer-zone drawer-footer">
          ${isHardware ? this.renderHardwareActions(item) : this.renderSubscriptionActions(item)}
        </footer>
      </div>
    `;

    this.bindEvents();
  }

  renderStatusPill(item, legalStatus) {
    if (item.status === 'urgent') {
      return `<span class="status-pill pill-urgent"><span class="glyph">[🛑]</span> Dringend (≤ 7 Tage)</span>`;
    }
    if (legalStatus && legalStatus.status === 'cliff_warning') {
      return `<span class="status-pill pill-warning"><span class="glyph">[!]</span> Beweislast beim Käufer</span>`;
    }
    if (item.status === 'warning') {
      return `<span class="status-pill pill-warning"><span class="glyph">[!]</span> Prüfung empfohlen</span>`;
    }
    return `<span class="status-pill pill-protected"><span class="glyph">[✓]</span> Gesetzlich geschützt</span>`;
  }

  renderZoneTimeline(item, timeline, legalStatus) {
    const isSellerProof = legalStatus.burden_of_proof === 'seller';
    const percent = Math.min(100, Math.max(0, legalStatus.progressPercent));

    return `
      <section class="drawer-zone zone-timeline" aria-labelledby="heading-timeline">
        <div class="zone-header">
          <span class="zone-tag font-mono">GESETZLICHE FRISTEN</span>
          <h3 id="heading-timeline" class="zone-title">24-Monats-Gewährleistung (BGB §§ 437, 438)</h3>
        </div>

        <!-- Two-Phase Progress Bar -->
        <div class="timeline-bar-wrapper">
          <div class="timeline-bar-track">
            <div class="timeline-bar-fill ${isSellerProof ? 'fill-protected' : 'fill-warning'}" style="width: ${percent}%;"></div>
            <div class="timeline-milestone milestone-0" title="Kaufdatum">
              <span class="milestone-dot"></span>
              <span class="milestone-label font-mono">0m</span>
            </div>
            <div class="timeline-milestone milestone-12" style="left: 50%;" title="BGB § 477 Beweislastumkehr">
              <span class="milestone-dot dot-cliff"></span>
              <span class="milestone-label font-mono">12m Cliff</span>
            </div>
            <div class="timeline-milestone milestone-24" style="left: 100%;" title="BGB § 438 Ablauf">
              <span class="milestone-dot"></span>
              <span class="milestone-label font-mono">24m</span>
            </div>
          </div>
        </div>

        <div class="timeline-status-card ${isSellerProof ? 'card-protected' : 'card-warning'}">
          <div class="status-card-header">
            <span class="status-icon" aria-hidden="true">${isSellerProof ? '🛡️' : '⚠️'}</span>
            <div class="status-title-group">
              <h4 class="status-card-heading">
                ${isSellerProof 
                  ? 'Beweislastumkehr AKTIV (§ 477 Abs. 1 BGB)' 
                  : 'Reguläre Gewährleistung (§ 438 Abs. 1 Nr. 3 BGB)'}
              </h4>
              <span class="status-card-sub font-mono">
                ${isSellerProof 
                  ? `Verkäufer trägt Beweislast bis zum ${timeline.cliff_12m_beweislastumkehr}` 
                  : `Käufer trägt Beweislast seit dem ${timeline.cliff_12m_beweislastumkehr}`}
              </span>
            </div>
          </div>
          <p class="status-card-desc">
            ${isSellerProof 
              ? 'Tritt innerhalb der ersten 12 Monate ein Mangel auf, wird gesetzlich vermutet, dass die Sache bereits bei Übergabe mangelhaft war. Der Händler muss kostenfrei reparieren oder nachliefern.' 
              : 'Nach Ablauf von 12 Monaten verbleibt der gesetzliche Gewährleistungsanspruch bis Monat 24. Der Käufer muss jedoch nachweisen, dass der Mangel auf einer vertragswidrigen Beschaffenheit bei Übergabe beruht.'}
          </p>
          <div class="statutory-citation font-mono">
            Rechtsnormen: BGB §§ 434, 437, 438, 439, 477 i.V.m. § 475e Abs. 1 (Ablaufhemmung 28m)
          </div>
        </div>
      </section>
    `;
  }

  renderZoneSubscriptionTerm(item) {
    return `
      <section class="drawer-zone zone-subscription" aria-labelledby="heading-sub-term">
        <div class="zone-header">
          <span class="zone-tag font-mono">VERTRAGSLAUFZEIT &amp; KÜNDIGUNG</span>
          <h3 id="heading-sub-term" class="zone-title">Gesetzlicher Schutz nach BGB § 309 Nr. 9</h3>
        </div>

        <div class="sub-term-card card-safe">
          <div class="sub-term-row">
            <span class="label">Nächste Abrechnung:</span>
            <span class="value font-mono font-bold">${item.expiryDate || 'N/A'}</span>
          </div>
          <div class="sub-term-row">
            <span class="label">Verbleibende Frist:</span>
            <span class="value font-mono">${item.daysRemaining !== undefined ? item.daysRemaining : '—'} Tage</span>
          </div>
          <div class="sub-term-row">
            <span class="label">Kündigungsfrist:</span>
            <span class="value">Max. 1 Monat zum Monatsende gem. § 309 Nr. 9 BGB</span>
          </div>
          <div class="sub-term-row">
            <span class="label">Kündigungsbutton (§ 312k):</span>
            <span class="value status-protected-text font-bold">✓ Gesetzlich vorgeschrieben</span>
          </div>
        </div>
      </section>
    `;
  }

  renderZoneReceiptProof(item) {
    const hasReceipt = Boolean(item.receiptSha256);
    const hash = item.receiptSha256 || 'Kein Beleg hinterlegt';

    return `
      <section class="drawer-zone zone-receipt" aria-labelledby="heading-receipt">
        <div class="zone-header">
          <span class="zone-tag font-mono">GOBD-BELEGARCHIV</span>
          <h3 id="heading-receipt" class="zone-title">Kryptografischer Kaufnachweis (SHA-256)</h3>
        </div>

        <div class="receipt-container">
          <div class="receipt-thumb-wrap">
            <div class="receipt-thumbnail" id="receipt-thumb-container">
              <span class="thumb-icon" aria-hidden="true">🧾</span>
              <span class="thumb-label">Originalbeleg</span>
            </div>
            <button type="button" class="btn-thermal-toggle font-mono" title="Thermopapier-Invertierung aktivieren">
              🌓 Thermofilter
            </button>
          </div>

          <div class="receipt-meta-wrap">
            <div class="receipt-meta-row">
              <span class="meta-label">Status:</span>
              <span class="status-protected-text font-bold">
                ${hasReceipt ? '✓ GoBD Rn. 108–110 Konform' : 'Kein Beleg hinterlegt'}
              </span>
            </div>
            <div class="receipt-meta-row">
              <span class="meta-label">Format:</span>
              <span class="font-mono text-muted">JPEG/PDF (Web Worker Pre-Hash)</span>
            </div>
            <div class="receipt-meta-row">
              <span class="meta-label">SHA-256 Digest:</span>
              <div class="hash-box font-mono" id="drawer-hash-box">
                ${hash}
              </div>
            </div>
            ${hasReceipt ? `
              <button type="button" class="btn-copy-digest font-mono" data-hash="${hash}">
                📋 Hash kopieren
              </button>
            ` : ''}
          </div>
        </div>
      </section>
    `;
  }

  renderZoneTaxLedger(item) {
    const isTax = Boolean(item.isTaxDeductible);
    return `
      <section class="drawer-zone zone-tax" aria-labelledby="heading-tax">
        <div class="zone-header">
          <span class="zone-tag font-mono">STEUER &amp; WERBUNGSKOSTEN</span>
          <h3 id="heading-tax" class="zone-title">Einkommensteuergesetz (§ 9 EStG)</h3>
        </div>

        <div class="tax-card">
          <div class="tax-toggle-row">
            <label class="tax-toggle-label" for="drawer-tax-toggle">
              <input type="checkbox" id="drawer-tax-toggle" ${isTax ? 'checked' : ''} />
              <span class="toggle-switch"></span>
              <span class="toggle-text font-bold">Als Werbungskosten erfassen</span>
            </label>
          </div>

          <div class="tax-details-box" id="tax-details-box" style="${isTax ? 'display: block;' : 'display: none;'}">
            <div class="tax-field">
              <label for="drawer-tax-category">Kategorie:</label>
              <select id="drawer-tax-category" class="tax-select font-mono">
                <option value="Arbeitsmittel" ${item.taxCategory === 'Arbeitsmittel' ? 'selected' : ''}>Arbeitsmittel (Hard-/Software)</option>
                <option value="Telekommunikation" ${item.taxCategory === 'Telekommunikation' ? 'selected' : ''}>Telekommunikation / Internet</option>
                <option value="Fachliteratur" ${item.taxCategory === 'Fachliteratur' ? 'selected' : ''}>Fachliteratur &amp; Kurse</option>
              </select>
            </div>
            <div class="tax-sofortabschreibung-badge">
              <span class="glyph" aria-hidden="true">✓</span> 
              <strong>100% Sofortabschreibung:</strong> Berechtigt nach BMF-Schreiben vom 22.02.2022 (Nutzungsdauer 1 Jahr für digitale Wirtschaftsgüter).
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderHardwareActions(item) {
    return `
      <div class="drawer-actions-grid">
        <button type="button" class="btn-cta btn-accent btn-gen-claim font-bold" data-id="${item.id}">
          ⚡ 1-Tap Mängelrüge generieren (BGB § 437)
        </button>
        <button type="button" class="btn-secondary btn-open-rma" data-id="${item.id}">
          🔗 Händler-Service &amp; RMA Portal
        </button>
        <div class="drawer-secondary-actions">
          <button type="button" class="btn-subtle btn-edit-item" data-id="${item.id}">✎ Bearbeiten</button>
          <button type="button" class="btn-subtle btn-danger btn-delete-item" data-id="${item.id}">🗑 Löschen</button>
        </div>
      </div>
    `;
  }

  renderSubscriptionActions(item) {
    const cancelUrl = item.cancellationUrl || 'https://www.verbraucherzentrale.de/kuendigung';
    return `
      <div class="drawer-actions-grid">
        <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" class="btn-cta btn-urgent btn-cancel-online font-bold">
          🛑 Sofort kündigen (§ 312k Online-Button)
        </a>
        <button type="button" class="btn-secondary btn-gen-notice" data-id="${item.id}">
          📄 Kündigungsschreiben (PDF/Text) generieren
        </button>
        <div class="drawer-secondary-actions">
          <button type="button" class="btn-subtle btn-edit-item" data-id="${item.id}">✎ Bearbeiten</button>
          <button type="button" class="btn-subtle btn-danger btn-delete-item" data-id="${item.id}">🗑 Löschen</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Close button
    const closeBtn = this.drawer.querySelector('.drawer-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Thermal filter toggle
    const thermalBtn = this.drawer.querySelector('.btn-thermal-toggle');
    const thumbContainer = this.drawer.querySelector('#receipt-thumb-container');
    if (thermalBtn && thumbContainer) {
      thermalBtn.addEventListener('click', () => {
        thumbContainer.classList.toggle('thermal-inverted');
      });
    }

    // Copy hash button
    const copyBtn = this.drawer.querySelector('.btn-copy-digest');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const hash = copyBtn.getAttribute('data-hash');
        if (hash) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hash).then(() => {
              const orig = copyBtn.textContent;
              copyBtn.textContent = '✓ Hash kopiert!';
              setTimeout(() => { copyBtn.textContent = orig; }, 2000);
            }).catch(() => {
              prompt('GoBD SHA-256 Digest:', hash);
            });
          } else {
            prompt('GoBD SHA-256 Digest:', hash);
          }
        }
      });
    }

    // Tax toggle
    const taxToggle = this.drawer.querySelector('#drawer-tax-toggle');
    const taxDetailsBox = this.drawer.querySelector('#tax-details-box');
    if (taxToggle && taxDetailsBox) {
      taxToggle.addEventListener('change', (e) => {
        const checked = e.target.checked;
        taxDetailsBox.style.display = checked ? 'block' : 'none';
        if (this.activeItem) {
          this.activeItem.isTaxDeductible = checked;
          if (typeof this.options.onItemUpdated === 'function') {
            this.options.onItemUpdated(this.activeItem);
          }
        }
      });
    }

    // Tax category change
    const taxCatSelect = this.drawer.querySelector('#drawer-tax-category');
    if (taxCatSelect) {
      taxCatSelect.addEventListener('change', (e) => {
        if (this.activeItem) {
          this.activeItem.taxCategory = e.target.value;
          if (typeof this.options.onItemUpdated === 'function') {
            this.options.onItemUpdated(this.activeItem);
          }
        }
      });
    }

    // Action buttons
    const genClaimBtn = this.drawer.querySelector('.btn-gen-claim');
    if (genClaimBtn) {
      genClaimBtn.addEventListener('click', () => {
        if (typeof this.options.onGenerateClaim === 'function') {
          this.options.onGenerateClaim(this.activeItem.id);
        }
      });
    }

    const genNoticeBtn = this.drawer.querySelector('.btn-gen-notice');
    if (genNoticeBtn) {
      genNoticeBtn.addEventListener('click', () => {
        if (typeof this.options.onGenerateCancellation === 'function') {
          this.options.onGenerateCancellation(this.activeItem.id);
        }
      });
    }

    const deleteBtn = this.drawer.querySelector('.btn-delete-item');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Möchten Sie "${this.activeItem.name}" unwiderruflich aus dem Vault entfernen?`)) {
          if (typeof this.options.onDeleteItem === 'function') {
            this.options.onDeleteItem(this.activeItem.id);
          }
          this.close();
        }
      });
    }

    const openRmaBtn = this.drawer.querySelector('.btn-open-rma');
    if (openRmaBtn) {
      openRmaBtn.addEventListener('click', () => {
        const url = this.activeItem.rmaUrl || this.activeItem.cancellationUrl || 'https://www.verbraucherzentrale.de/reklamation';
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    }
  }

  bindGlobalKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      // Focus trap navigation
      if (e.key === 'Tab') {
        const focusable = this.drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
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
