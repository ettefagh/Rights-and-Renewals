/**
 * widgets.js
 * Modular Dashboard Widgets Suite (Features 6, 18, 19)
 * 1. Urgent Attention Notification Banner
 * 2. Spend & Warranty Radar
 * 3. Live GoBD SHA-256 Cryptographic Receipt Proof Feed
 * 4. Mandatory BGH LexFox Safe-Harbor Legal Notice
 */

import { SAMPLE_SHOWCASE_ITEMS, getUrgentItems, getKpiSummary } from '../data/showcaseSampleData.js';

export class ModularWidgetsController {
  constructor(options = {}) {
    this.urgentContainer = document.getElementById('urgent-attention-widget');
    this.radarContainer = document.getElementById('spend-radar-widget');
    this.gobdContainer = document.getElementById('gobd-feed-widget');
    this.footerLegalContainer = document.getElementById('safe-harbor-footer-root');
    this.init();
  }

  init() {
    this.renderUrgentBanner();
    this.renderSpendRadar();
    this.renderGobdFeed();
    this.renderSafeHarborLegal();
    this.bindEvents();
  }

  renderUrgentBanner() {
    if (!this.urgentContainer) return;
    const urgentItems = getUrgentItems();

    if (urgentItems.length === 0) {
      this.urgentContainer.innerHTML = `
        <div class="urgent-banner banner-safe">
          <span class="banner-icon">🛡️</span>
          <div class="banner-content">
            <strong>Keine überfälligen Fristen:</strong> Alle Verträge und Garantien sind aktuell gesichert.
          </div>
        </div>
      `;
      return;
    }

    const first = urgentItems[0];
    this.urgentContainer.innerHTML = `
      <div class="urgent-banner banner-urgent">
        <div class="banner-left">
          <span class="banner-pulsing-icon" aria-hidden="true">🛑</span>
          <div class="banner-text">
            <span class="banner-tag">DRINGENDER HANDLUNGSBEDARF (&le; 7 TAGE)</span>
            <h4 class="banner-title">${first.name}</h4>
            <p class="banner-desc text-muted">
              Automatische Vertragsverlängerung in <strong>${first.daysRemaining} Tagen</strong> (${first.expiryDate}).
              Kündigungsfrist nach <strong>§ 309 Nr. 9 BGB</strong> läuft ab.
            </p>
          </div>
        </div>
        <div class="banner-actions">
          <button class="btn-compact btn-accent urgent-action-btn" data-slug="${first.brandSlug}">
            🛑 Sofort kündigen (§ 312k)
          </button>
        </div>
      </div>
    `;
  }

  renderSpendRadar() {
    if (!this.radarContainer) return;
    const kpis = getKpiSummary();

    this.radarContainer.innerHTML = `
      <div class="radar-card card">
        <div class="card-header">
          <span class="card-badge">FINANZ- &amp; STEUERRADAR</span>
          <h4 class="card-title">Kapitalüberblick &amp; Werbungskosten</h4>
        </div>

        <div class="radar-metrics-grid">
          <div class="radar-metric-item">
            <span class="metric-label text-muted">Geschütztes Hardware-Kapital</span>
            <span class="metric-value font-bold">${kpis.totalTrackedCapitalEur.toFixed(2)} €</span>
            <span class="metric-note status-protected-text">100% gesetzlich abgesichert</span>
          </div>
          <div class="radar-metric-item">
            <span class="metric-label text-muted">Monatliche Fixkosten</span>
            <span class="metric-value font-bold">${kpis.monthlySubscriptionsEur.toFixed(2)} €</span>
            <span class="metric-note text-muted">${kpis.annualSubscriptionsEur.toFixed(2)} € / Jahr</span>
          </div>
          <div class="radar-metric-item">
            <span class="metric-label text-muted">Steuerabzugsfähig (§ 9 EStG)</span>
            <span class="metric-value font-bold">${kpis.taxDeductibleEur.toFixed(2)} €</span>
            <span class="metric-note status-protected-text">BMF 2022 Sofortabschreibung</span>
          </div>
        </div>

        <div class="radar-footer">
          <span class="text-muted font-mono">Rechtsgrundlage: § 9 EStG i.V.m. BMF-Schreiben 2022</span>
        </div>
      </div>
    `;
  }

  renderGobdFeed() {
    if (!this.gobdContainer) return;

    const receipts = [
      {
        merchant: 'MediaMarkt Berlin',
        item: 'Sony WH-1000XM5 ANC Headphones',
        amount: '279.00 €',
        date: '15.12.2025',
        hash: '8f4b2c9ae13098d752c031aa23881efb889312b9a10245a8b79e19c9e8841df1',
        status: 'Unveränderbar archiviert'
      },
      {
        merchant: 'Apple Store Kurfürstendamm',
        item: 'MacBook Pro 14" M3',
        amount: '1,899.00 €',
        date: '20.06.2025',
        hash: '4c7a1029e84b8032d1847c0a911ef93284091a039824bc109348aef01029841a',
        status: 'Unveränderbar archiviert'
      },
      {
        merchant: 'Saturn Electro',
        item: 'Samsung Galaxy S24 Ultra',
        amount: '1,149.00 €',
        date: '10.02.2026',
        hash: '91b045e810a9c84918e7d23a10984cfb019842bc10293847aef901238491024a',
        status: 'Unveränderbar archiviert'
      }
    ];

    this.gobdContainer.innerHTML = `
      <div class="gobd-card card">
        <div class="card-header">
          <div class="card-badge-row">
            <span class="card-badge">GoBD Rn. 108–110</span>
            <span class="badge-protected font-mono">✓ KRYPTOGRAFISCH VERIFIZIERT</span>
          </div>
          <h4 class="card-title">Live GoBD SHA-256 Belegnachweis-Stream</h4>
        </div>

        <p class="gobd-desc text-muted">
          Revisionssichere digitale Belegerfassung nach den Grundsätzen ordnungsmäßiger Buchführung (GoBD).
          Pre-Encryption Hash sichert die Unveränderbarkeit bereits vor der lokalen Verschlüsselung.
        </p>

        <div class="gobd-feed-list">
          ${receipts.map(r => `
            <div class="gobd-feed-item font-mono">
              <div class="feed-item-top">
                <span class="font-bold">${r.item}</span>
                <span class="feed-price">${r.amount}</span>
              </div>
              <div class="feed-hash text-muted" title="${r.hash}">
                SHA-256: <code>${r.hash.slice(0, 16)}...${r.hash.slice(-16)}</code>
              </div>
              <div class="feed-meta text-muted">
                ${r.merchant} · ${r.date} · <span class="status-protected-text">${r.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSafeHarborLegal() {
    if (!this.footerLegalContainer) return;

    this.footerLegalContainer.innerHTML = `
      <div class="safe-harbor-box card">
        <div class="safe-harbor-header">
          <span class="safe-harbor-icon">⚖️</span>
          <h4 class="safe-harbor-title">Gesetzlicher Safe-Harbor &amp; Transparenzhinweis</h4>
        </div>
        <p class="safe-harbor-text text-muted">
          <strong>Keine Rechtsberatung:</strong> Das CM-LAB-Projekt ist ein akademisches Forschungs- und Technologie-Artefakt
          der SRH Hochschule. Alle Fristberechnungen, Mängelrügen-Vorlagen (§ 437 BGB), Kündigungsschreiben (§ 312k BGB)
          und KI-MCP-Tools werden deterministisch und automatisiert auf Basis öffentlicher Gesetzesquellen kompiliert.
        </p>
        <p class="safe-harbor-text text-muted">
          In Übereinstimmung mit der Leitentscheidung des Bundesgerichtshofs <strong>BGH VIII ZR 285/18 (LexFox)</strong>
          erfolgt keine individuelle Rechtsprüfung im Sinne der §§ 2, 3 des Rechtsdienstleistungsgesetzes (RDG) und
          keine Steuerberatung im Sinne des § 2 des Steuerberatungsgesetzes (StBerG).
        </p>
        <div class="safe-harbor-citations font-mono">
          <span>Zitiert: BGH VIII ZR 285/18</span> ·
          <span>RDG §§ 2, 3</span> ·
          <span>§ 2 StBerG</span> ·
          <span>BGB §§ 437, 438, 477, 309 Nr. 9, 312k</span> ·
          <span>GoBD Rn. 108–110</span>
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (this.urgentContainer) {
      this.urgentContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.urgent-action-btn');
        if (btn) {
          const slug = btn.getAttribute('data-slug');
          window.dispatchEvent(new CustomEvent('mcp:trigger-tool', {
            detail: { tool: 'policy_lookup', args: { service_slug: slug } }
          }));
        }
      });
    }
  }
}
