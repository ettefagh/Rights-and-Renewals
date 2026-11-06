/**
 * widgets.js
 * Modular Dashboard Widgets for CM-LAB Modern Application (M3)
 * Components:
 * 1. UrgentAttentionBanner — BGB § 477 cliff warnings (<= 30d) and renewal deadlines (<= 7d)
 * 2. SpendSubscriptionRadar — Monthly run-rate, protected capital, § 9 EStG / BMF 2022 tax deductions
 * 3. MasterVaultLedger — Searchable, filterable vault inventory with GoBD SHA-256 hashes & statutory pills
 */

// ============================================================================
// 1. URGENT ATTENTION BANNER
// ============================================================================

export class UrgentAttentionBanner {
  /**
   * @param {HTMLElement} container - DOM container element
   * @param {Object} [options] - Configuration options
   * @param {Function} [options.onAction] - Callback for user actions
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.items = [];
  }

  update(vaultItems = []) {
    this.items = vaultItems;
    this.render();
  }

  /**
   * Filter urgent and warning items pursuant to TC-APP-06 (<= 30 days remaining)
   * @returns {{ urgentSubs: Array<Object>, cliffWarnings: Array<Object>, totalSpend: number }}
   */
  computeAlerts() {
    const urgentSubs = [];
    const cliffWarnings = [];
    let totalSpend = 0;

    for (const item of this.items) {
      if (item.category === 'subscription') {
        const days = item.daysRemaining !== undefined ? item.daysRemaining : 999;
        if (days <= 30) {
          urgentSubs.push(item);
          totalSpend += (item.priceEur || 0);
        }
      } else if (item.category === 'hardware') {
        const daysToCliff = item.daysToCliff !== undefined ? item.daysToCliff : 999;
        if (item.isWithinReversedBurdenOfProof && daysToCliff <= 45) {
          cliffWarnings.push(item);
          totalSpend += (item.priceEur || 0);
        }
      }
    }

    // Sort subscriptions by daysRemaining ascending (most urgent first)
    urgentSubs.sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));
    // Sort hardware by daysToCliff ascending
    cliffWarnings.sort((a, b) => (a.daysToCliff || 0) - (b.daysToCliff || 0));

    return { urgentSubs, cliffWarnings, totalSpend };
  }

  render() {
    if (!this.container) return;

    const { urgentSubs, cliffWarnings, totalSpend } = this.computeAlerts();
    const totalAlerts = urgentSubs.length + cliffWarnings.length;

    if (totalAlerts === 0) {
      this.container.innerHTML = `
        <section class="urgent-banner banner-safe" role="region" aria-label="Fristenstatus">
          <div class="banner-body">
            <span class="banner-glyph" aria-hidden="true">🛡️</span>
            <div class="banner-text">
              <span class="banner-title font-bold">Alle Fristen gesichert</span>
              <p class="banner-desc text-muted">Keine anstehenden Kündigungsfristen oder ablaufenden Beweislastumkehr-Fristen in den nächsten 30 Tagen.</p>
            </div>
          </div>
        </section>
      `;
      return;
    }

    // Determine primary alert
    const hasCriticalRed = urgentSubs.some(s => (s.daysRemaining || 0) <= 7);
    const primarySub = urgentSubs[0];
    const primaryCliff = cliffWarnings[0];

    const bannerTypeClass = hasCriticalRed ? 'banner-critical' : 'banner-warning';
    const glyph = hasCriticalRed ? '🛑' : '⚠️';

    let titleText = '';
    let detailsHtml = '';
    let actionButtonsHtml = '';

    if (primarySub && ((primarySub.daysRemaining || 0) <= 7 || !primaryCliff)) {
      titleText = `Dringender Handlungsbedarf: ${this.escapeHtml(primarySub.name)}`;
      detailsHtml = `
        <div class="banner-alert-line">
          <strong>Automatische Vertragsverlängerung in ${primarySub.daysRemaining} Tagen</strong> (${primarySub.expiryDate || 'N/A'}).
          Monatliche Belastung: <strong>${primarySub.priceEur.toFixed(2)} €/Monat</strong>.
          Kündigungsrecht gem. <strong>BGB § 309 Nr. 9</strong>.
        </div>
      `;
      actionButtonsHtml = `
        <button type="button" class="btn-banner-action btn-urgent-cancel" data-id="${primarySub.id}">
          🛑 Kündigen via Online-Button (§ 312k)
        </button>
        <button type="button" class="btn-banner-secondary btn-inspect" data-id="${primarySub.id}">
          Details anzeigen
        </button>
      `;
    } else if (primaryCliff) {
      titleText = `Beweislastumkehr endet in ${primaryCliff.daysToCliff} Tagen: ${this.escapeHtml(primaryCliff.name)}`;
      detailsHtml = `
        <div class="banner-alert-line">
          <strong>BGB § 477 Abs. 1 Frist läuft am ${primaryCliff.beweislastumkehrDate || 'N/A'} ab.</strong>
          Geschützter Kaufpreis: <strong>${primaryCliff.priceEur.toFixed(2)} €</strong> bei ${this.escapeHtml(primaryCliff.merchant || 'Händler')}.
          Nach Ablauf trägt der Käufer die Beweislast für Mängel bei Übergabe.
        </div>
      `;
      actionButtonsHtml = `
        <button type="button" class="btn-banner-action btn-urgent-claim" data-id="${primaryCliff.id}">
          ⚡ 1-Tap Mängelrüge (§ 437 BGB)
        </button>
        <button type="button" class="btn-banner-secondary btn-inspect" data-id="${primaryCliff.id}">
          Timeline &amp; Beleg öffnen
        </button>
      `;
    }

    this.container.innerHTML = `
      <section class="urgent-banner ${bannerTypeClass}" role="alert" aria-live="polite">
        <div class="banner-body">
          <div class="banner-icon-container">
            <span class="banner-pulsing-glyph" aria-hidden="true">${glyph}</span>
          </div>
          <div class="banner-content">
            <div class="banner-badge-row">
              <span class="banner-urgency-badge font-mono">${hasCriticalRed ? 'Fristablauf ≤ 7 Tage' : 'Fristablauf ≤ 30 Tage'}</span>
              <span class="banner-stat-badge font-mono">Positionen: ${totalAlerts}</span>
              <span class="banner-spend-badge font-mono font-bold">Kapital: ${totalSpend.toFixed(2)} €</span>
            </div>
            <h3 class="banner-heading">${titleText}</h3>
            <div class="banner-description">${detailsHtml}</div>
          </div>
        </div>
        <div class="banner-footer-actions">
          ${actionButtonsHtml}
        </div>
      </section>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.btn-inspect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (typeof this.options.onAction === 'function') {
          this.options.onAction({ type: 'open_drawer', itemId: id });
        }
      });
    });

    this.container.querySelectorAll('.btn-urgent-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = this.items.find(i => String(i.id) === String(id));
        if (item && item.cancellationUrl) {
          window.open(item.cancellationUrl, '_blank', 'noopener,noreferrer');
        } else if (typeof this.options.onAction === 'function') {
          this.options.onAction({ type: 'cancel_subscription', itemId: id });
        }
      });
    });

    this.container.querySelectorAll('.btn-urgent-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (typeof this.options.onAction === 'function') {
          this.options.onAction({ type: 'generate_claim', itemId: id });
        }
      });
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

// ============================================================================
// 2. SPEND & SUBSCRIPTION RADAR
// ============================================================================

export class SpendSubscriptionRadar {
  /**
   * @param {HTMLElement} container
   * @param {Object} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.items = [];
  }

  update(vaultItems = []) {
    this.items = vaultItems;
    this.render();
  }

  calculateKpis() {
    const hardware = this.items.filter(i => i.category === 'hardware');
    const subscriptions = this.items.filter(i => i.category === 'subscription');

    const totalProtectedCapital = hardware
      .filter(i => i.status !== 'expired')
      .reduce((sum, i) => sum + (i.priceEur || 0), 0);

    const monthlyRunRate = subscriptions
      .filter(i => i.status !== 'expired')
      .reduce((sum, i) => sum + (i.priceEur || 0), 0);

    const annualRunRate = monthlyRunRate * 12;

    const taxDeductibleTotal = this.items
      .filter(i => i.isTaxDeductible)
      .reduce((sum, i) => sum + (i.priceEur || 0), 0);

    // Subscriptions nearing deadline (<= 30d) that can be cancelled
    const cancellableSubs = subscriptions.filter(i => i.status !== 'expired' && i.daysRemaining !== undefined && i.daysRemaining <= 30);
    const potentialMonthlySavings = cancellableSubs.reduce((sum, i) => sum + (i.priceEur || 0), 0);
    const potentialAnnualSavings = potentialMonthlySavings * 12;

    return {
      totalProtectedCapital,
      monthlyRunRate,
      annualRunRate,
      taxDeductibleTotal,
      cancellableCount: cancellableSubs.length,
      potentialMonthlySavings,
      potentialAnnualSavings
    };
  }

  render() {
    if (!this.container) return;

    const kpi = this.calculateKpis();

    this.container.innerHTML = `
      <div class="radar-card" role="region" aria-label="Finanz- und Vertragsradar">
        <div class="radar-header">
          <div class="radar-title-wrap">
            <span class="radar-pill font-mono">ANALYTICS &amp; RECHTE</span>
            <h3 class="radar-title">Finanz- &amp; Vertragsradar</h3>
          </div>
          <span class="radar-currency-tag font-mono">EUR (€)</span>
        </div>

        <div class="radar-metrics-grid">
          <!-- Metric 1: Protected Capital -->
          <div class="radar-metric-cell">
            <span class="metric-label">Geschütztes Hardware-Kapital</span>
            <span class="metric-value font-mono font-bold">${kpi.totalProtectedCapital.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            <span class="metric-footnote status-protected-text">
              <span class="glyph" aria-hidden="true">[✓]</span> 100% gesetzlich nach BGB §§ 437, 438
            </span>
          </div>

          <!-- Metric 2: Monthly Subscriptions -->
          <div class="radar-metric-cell">
            <span class="metric-label">Monatliche Abo-Fixkosten</span>
            <span class="metric-value font-mono font-bold">${kpi.monthlyRunRate.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € <span class="metric-unit">/ Mo</span></span>
            <span class="metric-footnote text-muted font-mono">
              ${kpi.annualRunRate.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / Jahr (12 Mo)
            </span>
          </div>

          <!-- Metric 3: German Tax Deductions -->
          <div class="radar-metric-cell">
            <span class="metric-label">Steuerabzugsfähig (§ 9 EStG)</span>
            <span class="metric-value font-mono font-bold status-tax-text">${kpi.taxDeductibleTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            <span class="metric-footnote text-muted">
              <span class="glyph" aria-hidden="true">[§]</span> 100% BMF 2022 Sofortabschreibung
            </span>
          </div>

          <!-- Metric 4: Cancellation Savings Potential -->
          <div class="radar-metric-cell savings-cell">
            <span class="metric-label">Einsparpotenzial Kündigungen</span>
            <span class="metric-value font-mono font-bold text-accent">${kpi.potentialMonthlySavings.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € <span class="metric-unit">/ Mo</span></span>
            <span class="metric-footnote status-warning-text font-mono">
              ${kpi.cancellableCount} ${kpi.cancellableCount === 1 ? 'Abo' : 'Abos'} fällig (${kpi.potentialAnnualSavings.toFixed(2)} € / Jahr)
            </span>
          </div>
        </div>

        <div class="radar-footer">
          <button type="button" class="btn-radar-action btn-export-tax font-mono" aria-label="Steueraufstellung als CSV exportieren">
            📄 Werbungskosten-Export (CSV)
          </button>
          <button type="button" class="btn-radar-secondary btn-review-subs" aria-label="Abos im Vault prüfen">
            🔍 Alle Abos prüfen
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const exportBtn = this.container.querySelector('.btn-export-tax');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (typeof this.options.onExportTax === 'function') {
          this.options.onExportTax();
        } else {
          this.exportTaxCsv();
        }
      });
    }

    const reviewBtn = this.container.querySelector('.btn-review-subs');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        if (typeof this.options.onFilterSubscriptions === 'function') {
          this.options.onFilterSubscriptions();
        }
      });
    }
  }

  exportTaxCsv() {
    const taxItems = this.items.filter(i => i.isTaxDeductible);
    if (taxItems.length === 0) {
      alert('Keine steuerlich abzugsfähigen Positionen vorhanden.');
      return;
    }

    const headers = ['Gegenstand', 'Händler/Anbieter', 'Kategorie', 'Kaufdatum', 'Betrag (EUR)', 'GoBD-Status', 'Rechtsgrundlage'];
    const rows = taxItems.map(item => [
      `"${String(item.name || '').replace(/"/g, '""')}"`,
      `"${String(item.merchant || '').replace(/"/g, '""')}"`,
      `"${item.taxCategory || 'Arbeitsmittel'}"`,
      item.purchaseDate || '',
      (item.priceEur || 0).toFixed(2),
      item.receiptSha256 ? 'GoBD Verifiziert (SHA-256)' : 'Unbestätigt',
      '§ 9 EStG / BMF 22.02.2022'
    ]);

    const disclaimer = '"HINWEIS NACH § 2 StBerG: Diese Aufstellung stellt keine steuerliche Beratung dar und dient der deterministischen Vorbereitung der Einkommensteuererklärung."';
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';')), '', disclaimer].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Werbungskosten_BMF2022_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// 3. MASTER VAULT LEDGER
// ============================================================================

export class MasterVaultLedger {
  /**
   * @param {HTMLElement} container
   * @param {Object} [options]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.allItems = [];
    this.filterCategory = 'all'; // 'all' | 'hardware' | 'subscription' | 'tax' | 'urgent'
    this.searchQuery = '';
    this.sortBy = 'urgency'; // 'urgency' | 'date-desc' | 'price-desc' | 'name-asc'
  }

  update(vaultItems = []) {
    this.allItems = vaultItems;
    this.render();
  }

  setCategoryFilter(category) {
    this.filterCategory = category;
    this.render();
  }

  getFilteredItems() {
    let result = [...this.allItems];

    // Search query
    if (this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const merchantMatch = (item.merchant || '').toLowerCase().includes(q);
        const tokenMatch = (item.searchTokens || []).some(t => t.toLowerCase().includes(q));
        const hashMatch = (item.receiptSha256 || '').toLowerCase().includes(q);
        return nameMatch || merchantMatch || tokenMatch || hashMatch;
      });
    }

    // Category filter
    if (this.filterCategory === 'hardware') {
      result = result.filter(i => i.category === 'hardware');
    } else if (this.filterCategory === 'subscription') {
      result = result.filter(i => i.category === 'subscription');
    } else if (this.filterCategory === 'tax') {
      result = result.filter(i => i.isTaxDeductible);
    } else if (this.filterCategory === 'urgent') {
      result = result.filter(i => {
        const days = i.daysRemaining !== undefined ? i.daysRemaining : 999;
        const cliff = i.daysToCliff !== undefined ? i.daysToCliff : 999;
        return days <= 30 || (i.isWithinReversedBurdenOfProof && cliff <= 45);
      });
    }

    // Sorting
    if (this.sortBy === 'urgency') {
      const urgencyRank = { urgent: 1, warning: 2, protected: 3, expired: 4 };
      result.sort((a, b) => {
        const rankA = urgencyRank[a.status] || 5;
        const rankB = urgencyRank[b.status] || 5;
        if (rankA !== rankB) return rankA - rankB;
        return (a.daysRemaining || 999) - (b.daysRemaining || 999);
      });
    } else if (this.sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.purchaseDate || 0).getTime() - new Date(a.purchaseDate || 0).getTime());
    } else if (this.sortBy === 'price-desc') {
      result.sort((a, b) => (b.priceEur || 0) - (a.priceEur || 0));
    } else if (this.sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }

  render() {
    if (!this.container) return;

    const items = this.getFilteredItems();

    this.container.innerHTML = `
      <div class="ledger-card" role="region" aria-label="Master Vault Ledger">
        <div class="ledger-toolbar">
          <div class="ledger-title-group">
            <h3 class="ledger-title">Master Vault Ledger</h3>
            <span class="ledger-count-badge font-mono">${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'}</span>
          </div>

          <!-- Search Input -->
          <div class="ledger-search-wrap">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input 
              type="search" 
              class="ledger-search-input" 
              placeholder="Vault durchsuchen (Name, Händler, SHA-256)..." 
              value="${this.escapeHtml(this.searchQuery)}"
              aria-label="Vault durchsuchen"
            />
          </div>

          <!-- Sort Select -->
          <div class="ledger-sort-wrap">
            <label for="ledger-sort-select" class="sort-label text-muted">Sortierung:</label>
            <select id="ledger-sort-select" class="ledger-sort-select">
              <option value="urgency" ${this.sortBy === 'urgency' ? 'selected' : ''}>Dringlichkeit (Fristen)</option>
              <option value="date-desc" ${this.sortBy === 'date-desc' ? 'selected' : ''}>Neuestes Kaufdatum</option>
              <option value="price-desc" ${this.sortBy === 'price-desc' ? 'selected' : ''}>Höchster Preis</option>
              <option value="name-asc" ${this.sortBy === 'name-asc' ? 'selected' : ''}>Alphabetisch (A–Z)</option>
            </select>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="ledger-filter-chips" role="tablist" aria-label="Filter nach Kategorie">
          <button type="button" class="chip-filter ${this.filterCategory === 'all' ? 'active' : ''}" data-cat="all">
            Alle Einträge (${this.allItems.length})
          </button>
          <button type="button" class="chip-filter ${this.filterCategory === 'hardware' ? 'active' : ''}" data-cat="hardware">
            💻 Hardware (${this.allItems.filter(i => i.category === 'hardware').length})
          </button>
          <button type="button" class="chip-filter ${this.filterCategory === 'subscription' ? 'active' : ''}" data-cat="subscription">
            🎵 Abonnements (${this.allItems.filter(i => i.category === 'subscription').length})
          </button>
          <button type="button" class="chip-filter ${this.filterCategory === 'tax' ? 'active' : ''}" data-cat="tax">
            💶 Steuer § 9 EStG (${this.allItems.filter(i => i.isTaxDeductible).length})
          </button>
          <button type="button" class="chip-filter ${this.filterCategory === 'urgent' ? 'active' : ''}" data-cat="urgent">
            🛑 Fällig ≤ 30d
          </button>
        </div>

        <!-- Ledger Content -->
        <div class="ledger-table-container">
          ${items.length === 0 ? this.renderEmptyState() : this.renderTable(items)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderEmptyState() {
    return `
      <div class="ledger-empty-state">
        <span class="empty-icon" aria-hidden="true">🗄️</span>
        <h4>Keine Einträge gefunden</h4>
        <p class="text-muted">Für den gewählten Filter oder Suchbegriff "${this.escapeHtml(this.searchQuery)}" existieren keine Datensätze.</p>
        <button type="button" class="btn-compact btn-primary btn-reset-filter">Filter zurücksetzen</button>
      </div>
    `;
  }

  renderTable(items) {
    return `
      <table class="ledger-table" role="table">
        <thead>
          <tr>
            <th scope="col">Gegenstand / Händler</th>
            <th scope="col">Kategorie</th>
            <th scope="col">Kauf- / Startdatum</th>
            <th scope="col">Status (BGB)</th>
            <th scope="col">Betrag</th>
            <th scope="col">GoBD SHA-256 Beleg</th>
            <th scope="col" class="th-actions">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => this.renderTableRow(item)).join('')}
        </tbody>
      </table>
    `;
  }

  renderTableRow(item) {
    const isHardware = item.category === 'hardware';
    const catBadge = isHardware 
      ? '<span class="badge badge-hardware"><span class="glyph" aria-hidden="true">💻</span> Hardware</span>' 
      : '<span class="badge badge-subscription"><span class="glyph" aria-hidden="true">🎵</span> Abo</span>';

    // Status pill with geometric non-color glyph
    let statusPill = '';
    if (item.status === 'urgent') {
      statusPill = `<span class="status-pill pill-urgent" title="Kündigungsfrist oder Garantie endet in <= 7 Tagen"><span class="glyph">[🛑]</span> Fällig (${item.daysRemaining}d)</span>`;
    } else if (item.status === 'warning') {
      const label = item.daysToCliff !== undefined && item.daysToCliff <= 45 
        ? `12m Cliff (${item.daysToCliff}d)` 
        : `Prüfung (${item.daysRemaining}d)`;
      statusPill = `<span class="status-pill pill-warning" title="BGB § 477 Beweislastumkehr oder Fristfenster aktiv"><span class="glyph">[!]</span> ${label}</span>`;
    } else if (item.status === 'protected') {
      statusPill = `<span class="status-pill pill-protected" title="Gesetzlich abgesichert nach BGB"><span class="glyph">[✓]</span> Gesichert</span>`;
    } else {
      statusPill = `<span class="status-pill pill-expired" title="Garantie oder Vertrag abgelaufen"><span class="glyph">[x]</span> Abgelaufen</span>`;
    }

    // GoBD SHA-256 Hash
    let hashHtml = '';
    if (item.receiptSha256) {
      const shortHash = item.receiptSha256.substring(0, 8) + '...';
      hashHtml = `
        <button type="button" class="btn-copy-hash font-mono" data-hash="${item.receiptSha256}" title="GoBD SHA-256 Hash kopieren">
          <span class="glyph" aria-hidden="true">🔒</span> ${shortHash}
        </button>
      `;
    } else {
      hashHtml = `<span class="text-muted font-mono">—</span>`;
    }

    const priceText = isHardware 
      ? `${item.priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` 
      : `${item.priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/Mo`;

    return `
      <tr class="ledger-row" data-id="${item.id}">
        <td class="td-item-info">
          <div class="item-title font-bold">${this.escapeHtml(item.name)}</div>
          <div class="item-merchant text-muted">${this.escapeHtml(item.merchant || '')}</div>
        </td>
        <td>${catBadge}</td>
        <td class="font-mono text-muted">${item.purchaseDate || 'N/A'}</td>
        <td>${statusPill}</td>
        <td class="font-mono font-bold">${priceText}</td>
        <td>${hashHtml}</td>
        <td class="td-actions">
          <button type="button" class="btn-table-action btn-view-drawer" data-id="${item.id}">
            Details
          </button>
          ${isHardware 
            ? `<button type="button" class="btn-table-action btn-claim-direct" data-id="${item.id}" title="1-Tap Mängelrüge (§ 437 BGB)">⚡ Claim</button>`
            : `<button type="button" class="btn-table-action btn-cancel-direct" data-id="${item.id}" title="Online Kündigen (§ 312k BGB)">🛑 Kündigen</button>`
          }
        </td>
      </tr>
    `;
  }

  bindEvents() {
    // Search input
    const searchInput = this.container.querySelector('.ledger-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Sort select
    const sortSelect = this.container.querySelector('#ledger-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    // Filter chips
    this.container.querySelectorAll('.chip-filter').forEach(chip => {
      chip.addEventListener('click', (e) => {
        this.filterCategory = e.currentTarget.getAttribute('data-cat');
        this.render();
      });
    });

    // Reset filter button
    const resetBtn = this.container.querySelector('.btn-reset-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.filterCategory = 'all';
        this.searchQuery = '';
        this.render();
      });
    }

    // Drawer openers
    this.container.querySelectorAll('.btn-view-drawer, .ledger-row').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button') && !e.target.closest('.btn-view-drawer')) return;
        const id = el.getAttribute('data-id');
        if (id && typeof this.options.onSelectItem === 'function') {
          this.options.onSelectItem(id);
        }
      });
    });

    // Copy hash buttons
    this.container.querySelectorAll('.btn-copy-hash').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hash = btn.getAttribute('data-hash');
        if (hash) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hash).then(() => {
              const originalHtml = btn.innerHTML;
              btn.innerHTML = '✓ Kopiert!';
              setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
            }).catch(() => {
              prompt('GoBD SHA-256 Digest:', hash);
            });
          } else {
            prompt('GoBD SHA-256 Digest:', hash);
          }
        }
      });
    });

    // Claim triggers
    this.container.querySelectorAll('.btn-claim-direct').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (typeof this.options.onGenerateClaim === 'function') {
          this.options.onGenerateClaim(id);
        }
      });
    });

    // Cancel triggers
    this.container.querySelectorAll('.btn-cancel-direct').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.allItems.find(i => String(i.id) === String(id));
        if (item && item.cancellationUrl) {
          window.open(item.cancellationUrl, '_blank', 'noopener,noreferrer');
        } else if (typeof this.options.onCancelSubscription === 'function') {
          this.options.onCancelSubscription(id);
        }
      });
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
