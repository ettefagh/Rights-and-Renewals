/**
 * calendars.js
 * Implementation of 3 Distinct Calendar Widgets (Features 7, 8, 9)
 * 1. Monthly DIN Grid (ISO 8601 DIN 7-col)
 * 2. Timeline Agenda Horizon (12m BGB § 477 Presumption Cliff)
 * 3. Countdown & Risk Heatmap (52-week density matrix)
 */

import { SAMPLE_SHOWCASE_ITEMS, SHOWCASE_ANCHOR_DATE, getKpiSummary } from '../data/showcaseSampleData.js';

export class CalendarSuiteController {
  constructor(options = {}) {
    this.container = document.getElementById('calendar-suite-root');
    this.items = options.items || SAMPLE_SHOWCASE_ITEMS;
    this.currentView = 'grid'; // 'grid' | 'timeline' | 'heatmap'
    this.currentDate = new Date(SHOWCASE_ANCHOR_DATE + 'T00:00:00Z');
    this.gridMode = 'month'; // 'month' | 'week'
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="calendar-suite-header">
        <div class="calendar-suite-intro">
          <span class="badge-accent">3 CALENDAR ARCHITECTURES</span>
          <h3 class="section-title">Fristen- &amp; Gewährleistungskalender</h3>
          <p class="section-subtitle text-muted">
            Projektion derselben BGB-Fristen in drei spezialisierte Visualisierungsmodelle:
            DIN-Monatsraster, gesetzlicher Fristen-Horizont und 52-Wochen-Risikomatrix.
          </p>
        </div>

        <div class="calendar-view-tabs" role="tablist" aria-label="Calendar View Modes">
          <button class="calendar-tab-btn ${this.currentView === 'grid' ? 'active' : ''}" data-view="grid" role="tab" aria-selected="${this.currentView === 'grid'}">
            📅 1. DIN Monatsraster
          </button>
          <button class="calendar-tab-btn ${this.currentView === 'timeline' ? 'active' : ''}" data-view="timeline" role="tab" aria-selected="${this.currentView === 'timeline'}">
            ⏱️ 2. Fristen-Horizont (BGB § 477)
          </button>
          <button class="calendar-tab-btn ${this.currentView === 'heatmap' ? 'active' : ''}" data-view="heatmap" role="tab" aria-selected="${this.currentView === 'heatmap'}">
            🗺️ 3. 52-Wochen Risikomatrix
          </button>
        </div>
      </div>

      <div class="calendar-view-container" id="calendar-active-view">
        ${this.renderActiveView()}
      </div>

      <div id="calendar-popover" class="calendar-popover" style="display: none;" role="tooltip"></div>
    `;
  }

  renderActiveView() {
    if (this.currentView === 'grid') {
      return this.renderGridCalendar();
    } else if (this.currentView === 'timeline') {
      return this.renderTimelineCalendar();
    } else if (this.currentView === 'heatmap') {
      return this.renderHeatmapCalendar();
    }
    return '';
  }

  // ==========================================================================
  // CALENDAR TYPE 1: MONTHLY / WEEKLY DIN GRID (ISO 8601 DIN 1355-1)
  // ==========================================================================
  renderGridCalendar() {
    const year = this.currentDate.getUTCFullYear();
    const month = this.currentDate.getUTCMonth();
    const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(this.currentDate);

    // Days calculation for DIN ISO 8601 (Monday=0 to Sunday=6)
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    let startDayOfWeek = firstDay.getUTCDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday -> 6

    const totalDays = lastDay.getUTCDate();
    const prevMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // Map events by ISO date
    const eventsByDate = {};
    for (const item of this.items) {
      const d = item.expiryDate || item.beweislastumkehrDate;
      if (d) {
        if (!eventsByDate[d]) eventsByDate[d] = [];
        eventsByDate[d].push(item);
      }
    }

    let cellsHtml = '';

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      cellsHtml += `<div class="cal-cell cal-cell-pad text-muted"><span class="cal-day-num">${dayNum}</span></div>`;
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dayStr === SHOWCASE_ANCHOR_DATE;
      const dayEvents = eventsByDate[dayStr] || [];

      let eventsHtml = '';
      if (dayEvents.length > 0) {
        eventsHtml = dayEvents.slice(0, 3).map(ev => {
          const isUrgent = ev.status === 'urgent';
          const isWarn = ev.status === 'warning';
          const glyph = isUrgent ? '🛑' : isWarn ? '⚠️' : '🛡️';
          const urgencyClass = isUrgent ? 'pill-urgent' : isWarn ? 'pill-warning' : 'pill-protected';
          return `
            <div class="cal-event-pill ${urgencyClass}" data-date="${dayStr}" data-id="${ev.id}" title="${ev.name}">
              <span class="pill-glyph">${glyph}</span>
              <span class="pill-name">${ev.name}</span>
            </div>
          `;
        }).join('');

        if (dayEvents.length > 3) {
          eventsHtml += `<div class="cal-event-more">+${dayEvents.length - 3} weitere</div>`;
        }
      }

      cellsHtml += `
        <div class="cal-cell ${isToday ? 'cal-cell-today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}" data-date="${dayStr}">
          <div class="cal-cell-top">
            <span class="cal-day-num">${day}</span>
            ${isToday ? '<span class="today-marker">HEUTE</span>' : ''}
          </div>
          <div class="cal-cell-events">
            ${eventsHtml}
          </div>
        </div>
      `;
    }

    // Trailing padding days
    const totalFilled = startDayOfWeek + totalDays;
    const trailingCount = (7 - (totalFilled % 7)) % 7;
    for (let i = 1; i <= trailingCount; i++) {
      cellsHtml += `<div class="cal-cell cal-cell-pad text-muted"><span class="cal-day-num">${i}</span></div>`;
    }

    return `
      <div class="calendar-grid-card card">
        <div class="cal-grid-nav">
          <div class="cal-nav-left">
            <button class="btn-compact btn-outline" id="cal-prev-btn">&lt; Vorheriger</button>
            <button class="btn-compact btn-outline" id="cal-today-btn">Heute (${SHOWCASE_ANCHOR_DATE})</button>
            <button class="btn-compact btn-outline" id="cal-next-btn">Nächster &gt;</button>
          </div>
          <h4 class="cal-current-label">${monthName}</h4>
          <div class="cal-nav-right">
            <span class="cal-din-badge">DIN 1355-1 / ISO 8601</span>
          </div>
        </div>

        <div class="cal-weekdays-row">
          <div class="cal-weekday">Mo</div>
          <div class="cal-weekday">Di</div>
          <div class="cal-weekday">Mi</div>
          <div class="cal-weekday">Do</div>
          <div class="cal-weekday">Fr</div>
          <div class="cal-weekday cal-weekend">Sa</div>
          <div class="cal-weekday cal-weekend">So</div>
        </div>

        <div class="cal-grid-matrix">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CALENDAR TYPE 2: TIMELINE / AGENDA HORIZON (BGB § 477 CLIFF)
  // ==========================================================================
  renderTimelineCalendar() {
    // Sort items chronologically by deadline
    const sorted = [...this.items].sort((a, b) => {
      const dA = a.daysRemaining ?? 999;
      const dB = b.daysRemaining ?? 999;
      return dA - dB;
    });

    const horizon1 = sorted.filter(i => (i.daysRemaining ?? 999) <= 7);
    const horizon2 = sorted.filter(i => (i.daysRemaining ?? 999) > 7 && (i.daysRemaining ?? 999) <= 30);
    const horizon3 = sorted.filter(i => i.category === 'hardware' && i.isWithinReversedBurdenOfProof && i.daysToCliff && i.daysToCliff <= 45);
    const horizon4 = sorted.filter(i => i.category === 'hardware' && !i.isWithinReversedBurdenOfProof);

    return `
      <div class="calendar-timeline-card card">
        <div class="timeline-spotlight-banner">
          <div class="spotlight-header">
            <span class="spotlight-pill">⚖️ BGB § 477 ABS. 1 SPOTLIGHT</span>
            <h4>Gesetzliche Beweislastumkehr (12-Monats-Klippe)</h4>
          </div>
          <p class="spotlight-text text-muted">
            Innerhalb der ersten 12 Monate nach Kauf gilt die gesetzliche Vermutung, dass ein Mangel bereits bei Gefahrübergang vorlag.
            Danach kehrt sich die Beweislast um: Der Verbraucher muss beweisen, dass die Ware von Anfang an mangelhaft war.
          </p>

          <div class="dual-phase-bar-wrapper">
            <div class="dual-phase-header font-mono">
              <span>Phase 1: Verkäufer haftet (0–12 Mo.)</span>
              <span>BGB § 477 Klippe</span>
              <span>Phase 2: Käufer beweist (13–24 Mo.)</span>
            </div>
            <div class="dual-phase-bar">
              <div class="phase-segment phase-protected" style="width: 50%;">
                <span class="phase-label">✓ Gesetzliche Vermutung</span>
              </div>
              <div class="cliff-divider" title="12-Month Cliff"></div>
              <div class="phase-segment phase-warning" style="width: 50%;">
                <span class="phase-label">⚠️ Beweislast beim Käufer</span>
              </div>
              <div class="progress-pin" style="left: 45%;" title="Aktueller Zeitpunkt: Tag 325 (Sony Headphones)">
                <span class="pin-marker">📍 Sony WH-1000XM5 (Tag 325)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline-horizons-container">
          <div class="horizon-group">
            <h5 class="horizon-title status-urgent-text">
              🛑 Horizont 1: Akuter Handlungsbedarf (&le; 7 Tage Frist)
            </h5>
            <div class="horizon-items-grid">
              ${horizon1.map(item => this.renderTimelineItem(item)).join('')}
            </div>
          </div>

          <div class="horizon-group">
            <h5 class="horizon-title status-warning-text">
              ⚠️ Horizont 2: Ankündigungsfenster (8 &ndash; 30 Tage Frist)
            </h5>
            <div class="horizon-items-grid">
              ${horizon2.map(item => this.renderTimelineItem(item)).join('')}
            </div>
          </div>

          <div class="horizon-group">
            <h5 class="horizon-title">
              ⚖️ Horizont 3: Bevorstehende Beweislastumkehr (Hardware Monat 11&ndash;12)
            </h5>
            <div class="horizon-items-grid">
              ${horizon3.map(item => this.renderTimelineItem(item)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTimelineItem(item) {
    const isUrgent = item.status === 'urgent';
    const isWarn = item.status === 'warning';
    const glyph = isUrgent ? '🛑' : isWarn ? '⚠️' : '🛡️';
    const daysLabel = item.daysRemaining !== undefined ? `${item.daysRemaining} Tage verbleibend` : 'Aktiv';

    return `
      <div class="timeline-item-card status-${item.status}">
        <div class="timeline-item-header">
          <span class="timeline-glyph">${glyph}</span>
          <span class="timeline-name font-bold">${item.name}</span>
          <span class="timeline-price text-muted">${item.priceEur.toFixed(2)} €</span>
        </div>
        <div class="timeline-meta font-mono text-muted">
          <span>Händler: ${item.merchant}</span> · <span>Frist: ${item.expiryDate}</span>
        </div>
        <div class="timeline-urgency-badge">
          <strong>${daysLabel}</strong> · ${item.bgbClauses ? item.bgbClauses[0] : 'BGB statutory'}
        </div>
        <div class="timeline-item-actions">
          ${item.category === 'subscription' ? `
            <button class="btn-compact btn-primary timeline-btn" data-tool="policy_lookup" data-slug="${item.brandSlug}">
              🛑 Kündigung vorbereiten (§ 312k)
            </button>
          ` : `
            <button class="btn-compact btn-primary timeline-btn" data-tool="claim_dossier_generate" data-slug="${item.brandSlug}" data-name="${item.name}" data-date="${item.purchaseDate}">
              ⚖️ Mängelrüge vorbereiten (§ 439)
            </button>
          `}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CALENDAR TYPE 3: COUNTDOWN & RISK HEATMAP (52-WEEK DENSITY MATRIX)
  // ==========================================================================
  renderHeatmapCalendar() {
    const kpis = getKpiSummary();
    const cells = this.generate52WeekHeatmapData();

    return `
      <div class="calendar-heatmap-card card">
        <div class="heatmap-kpi-banner">
          <div class="kpi-block">
            <span class="kpi-label text-muted">GESAMTES GESCHÜTZTES KAPITAL</span>
            <span class="kpi-value">${kpis.totalTrackedCapitalEur.toFixed(2)} €</span>
            <span class="kpi-subtext status-protected-text">10 Hardware-Geräte aktiv</span>
          </div>
          <div class="kpi-block">
            <span class="kpi-label text-muted">ABONNEMENT-VOLUMEN / JAHR</span>
            <span class="kpi-value">${kpis.annualSubscriptionsEur.toFixed(2)} €</span>
            <span class="kpi-subtext text-muted">${kpis.monthlySubscriptionsEur.toFixed(2)} € / Monat</span>
          </div>
          <div class="kpi-block">
            <span class="kpi-label text-muted">STEUERLICH RELEVANT (§ 9 EStG)</span>
            <span class="kpi-value">${kpis.taxDeductibleEur.toFixed(2)} €</span>
            <span class="kpi-subtext status-protected-text">Sofortabschreibung nach BMF 2022</span>
          </div>
          <div class="kpi-block">
            <span class="kpi-label text-muted">BEVORSTEHENDE BGB-KLIPPEN</span>
            <span class="kpi-value status-warning-text">${kpis.activeCliffsCount} Geräte</span>
            <span class="kpi-subtext status-warning-text">Beweislastumkehr &le; 45 Tage</span>
          </div>
        </div>

        <div class="heatmap-matrix-wrapper">
          <div class="heatmap-matrix-header">
            <span class="font-bold">52-Wochen Fristendichte-Matrix (365 Tage)</span>
            <div class="heatmap-legend">
              <span class="text-muted">Gering</span>
              <span class="heatmap-swatch level-0" title="Keine Fristen"></span>
              <span class="heatmap-swatch level-1" title="1 Frist (&lt;50 €)"></span>
              <span class="heatmap-swatch level-2" title="50–200 €"></span>
              <span class="heatmap-swatch level-3" title="200–500 €"></span>
              <span class="heatmap-swatch level-4" title="&gt;500 € oder Klippe"></span>
              <span class="text-muted">Hoch</span>
            </div>
          </div>

          <div class="heatmap-grid" id="heatmap-grid">
            ${cells.map(cell => `
              <div class="hm-cell level-${cell.intensityLevel}"
                   data-date="${cell.date}"
                   data-count="${cell.events.length}"
                   data-amount="${cell.totalAmountEur}"
                   title="${cell.date}: ${cell.events.length} Fristen (${cell.totalAmountEur.toFixed(2)} €)">
              </div>
            `).join('')}
          </div>

          <div class="heatmap-months-labels text-muted font-mono">
            <span>Nov</span><span>Dez</span><span>Jan</span><span>Feb</span><span>Mär</span><span>Apr</span>
            <span>Mai</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Okt</span>
          </div>
        </div>
      </div>
    `;
  }

  generate52WeekHeatmapData() {
    const cells = [];
    const baseDate = new Date(SHOWCASE_ANCHOR_DATE + 'T00:00:00Z');

    // Create 52 * 7 = 364 days
    for (let dayOffset = 0; dayOffset < 364; dayOffset++) {
      const d = new Date(baseDate.getTime() + dayOffset * 86400000);
      const isoDate = d.toISOString().split('T')[0];

      // Check matching items
      const matches = this.items.filter(item => {
        return item.expiryDate === isoDate || item.beweislastumkehrDate === isoDate;
      });

      let intensity = 0;
      let totalAmount = 0;

      if (matches.length > 0) {
        totalAmount = matches.reduce((acc, curr) => acc + (curr.priceEur || 0), 0);
        if (matches.some(m => m.status === 'urgent') || totalAmount > 500) {
          intensity = 4;
        } else if (totalAmount > 200) {
          intensity = 3;
        } else if (totalAmount > 50) {
          intensity = 2;
        } else {
          intensity = 1;
        }
      }

      cells.push({
        date: isoDate,
        intensityLevel: intensity,
        events: matches,
        totalAmountEur: totalAmount
      });
    }

    return cells;
  }

  bindEvents() {
    if (!this.container) return;

    // View tab switching
    this.container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.calendar-tab-btn');
      if (tabBtn) {
        this.currentView = tabBtn.getAttribute('data-view');
        this.render();
        return;
      }

      // Timeline trigger action button
      const tlBtn = e.target.closest('.timeline-btn');
      if (tlBtn) {
        const tool = tlBtn.getAttribute('data-tool');
        const slug = tlBtn.getAttribute('data-slug');
        if (tool === 'policy_lookup') {
          window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
            detail: { tool, args: { service_slug: slug } }
          }));
        } else if (tool === 'claim_dossier_generate') {
          window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
            detail: {
              tool,
              args: {
                brand_slug: slug,
                item_name: tlBtn.getAttribute('data-name'),
                purchase_date: tlBtn.getAttribute('data-date'),
                defect_description: 'Gesetzliche Mängelanzeige vor Ablauf der Frist'
              }
            }
          }));
        }
        return;
      }

      // Grid navigation
      const prevBtn = e.target.closest('#cal-prev-btn');
      if (prevBtn) {
        this.currentDate.setUTCMonth(this.currentDate.getUTCMonth() - 1);
        this.render();
        return;
      }

      const nextBtn = e.target.closest('#cal-next-btn');
      if (nextBtn) {
        this.currentDate.setUTCMonth(this.currentDate.getUTCMonth() + 1);
        this.render();
        return;
      }

      const todayBtn = e.target.closest('#cal-today-btn');
      if (todayBtn) {
        this.currentDate = new Date(SHOWCASE_ANCHOR_DATE + 'T00:00:00Z');
        this.render();
        return;
      }

      // Event popovers in grid
      const pill = e.target.closest('.cal-event-pill');
      if (pill) {
        const itemId = pill.getAttribute('data-id');
        const item = this.items.find(i => i.id === itemId);
        if (item) {
          alert(`Frist-Details (${item.name}):\n• Frist: ${item.expiryDate}\n• Status: ${item.status}\n• Betrag: €${item.priceEur.toFixed(2)}\n• Rechtsgrundlage: ${item.bgbClauses ? item.bgbClauses.join(', ') : 'BGB'}`);
        }
      }
    });
  }
}
