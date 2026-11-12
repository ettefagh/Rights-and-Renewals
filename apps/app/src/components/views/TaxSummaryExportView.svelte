<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import {
    calculateAnnualTaxSummary,
    generateElsterCsv,
    STBERG_SAFE_HARBOR_DE,
    type AnnualTaxSummary
  } from '@cmlab/core';
  import {
    Download,
    Receipt,
    Info,
    ArrowLeft,
    CheckCircle2
  } from 'lucide-svelte';

  const taxYear = 2026;

  let summary = $derived.by<AnnualTaxSummary>(() => {
    return calculateAnnualTaxSummary(walletStore.taxDeductibleItems, taxYear);
  });

  let lineItems = $derived.by(() => {
    return summary.items.map((res) => {
      const orig = walletStore.taxDeductibleItems.find((i) => i.id === res.itemId);
      return {
        id: res.itemId,
        title: orig?.title ?? 'Unknown',
        taxCategory: res.taxCategory,
        purchaseDate: orig?.purchaseDate ?? `${taxYear}-01-01`,
        priceGrossEur: res.grossPriceEur,
        beruflicheNutzungProzent: res.workUsagePercent,
        deductibleEur: res.deductibleAmountEur,
        isSofortabschreibung: res.sofortabschreibungEligible,
      };
    });
  });

  let sofortabschreibungTotalEur = $derived.by(() => {
    return summary.items
      .filter((i) => i.sofortabschreibungEligible)
      .reduce((acc, i) => acc + i.deductibleAmountEur, 0);
  });

  function downloadCsv() {
    const csvContent = generateElsterCsv(walletStore.taxDeductibleItems, taxYear);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ELSTER-Werbungskosten-${taxYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

<div class="tax-view">
  <div class="view-header">
    <button
      type="button"
      class="back-btn"
      onclick={() => walletStore.setView('dashboard')}
    >
      <ArrowLeft size={16} />
      <span>Back</span>
    </button>
    <div class="header-titles">
      <h2 class="page-title">§ 9 EStG Werbungskosten & ELSTER Tax Summary</h2>
      <p class="page-subtitle">
        Tax year {taxYear} • 100% 1-year digital Sofortabschreibung per BMF 22.02.2022 & GWG &le;€952 gross.
      </p>
    </div>
  </div>

  <!-- Summary Metric Banner -->
  <div class="metrics-banner">
    <div class="metric-block">
      <span class="m-label">Total Deductible Werbungskosten</span>
      <span class="m-val text-pine">€{summary.totalDeductibleEur.toFixed(2)}</span>
    </div>
    <div class="metric-block">
      <span class="m-label">1-Year Sofortabschreibung (BMF 2022)</span>
      <span class="m-val">€{sofortabschreibungTotalEur.toFixed(2)}</span>
    </div>
    <div class="metric-block">
      <span class="m-label">Tax Eligible Items</span>
      <span class="m-val">{lineItems.length}</span>
    </div>
  </div>

  <!-- Breakdown Table -->
  <div class="table-card">
    <div class="table-header-bar">
      <div class="title-wrap">
        <Receipt size={18} />
        <h3 class="table-title">Tax Year {taxYear} Expense Ledger (Anlage N)</h3>
      </div>
      <button
        type="button"
        class="csv-export-btn"
        onclick={downloadCsv}
        disabled={lineItems.length === 0}
      >
        <Download size={16} />
        <span>Download ELSTER CSV Export</span>
      </button>
    </div>

    {#if lineItems.length === 0}
      <div class="empty-state">
        <p>No tax-deductible items registered yet. Mark hardware or software as tax-deductible during capture.</p>
      </div>
    {:else}
      <div class="table-responsive">
        <table class="tax-table">
          <thead>
            <tr>
              <th>Item / Service</th>
              <th>Category</th>
              <th>Purchase Date</th>
              <th>Gross Price</th>
              <th>Professional Use</th>
              <th>Deductible {taxYear}</th>
              <th>AfA Rule</th>
            </tr>
          </thead>
          <tbody>
            {#each lineItems as row}
              <tr>
                <td class="font-semibold">{row.title}</td>
                <td><span class="tax-badge">{row.taxCategory}</span></td>
                <td>{row.purchaseDate}</td>
                <td>€{row.priceGrossEur.toFixed(2)}</td>
                <td>{row.beruflicheNutzungProzent}%</td>
                <td class="font-bold text-pine">€{row.deductibleEur.toFixed(2)}</td>
                <td>
                  <span class="rule-badge" class:sofort={row.isSofortabschreibung}>
                    {row.isSofortabschreibung ? '100% Sofort (BMF 2022)' : 'Linear AfA'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Non-Removable § 2 StBerG Safe-Harbor Footer -->
  <footer class="stberg-safe-harbor-footer">
    <div class="footer-title">
      <Info size={14} />
      <strong>Gesetzlicher Hinweis gem. § 2 Steuerberatungsgesetz (StBerG):</strong>
    </div>
    <p class="footer-text">{STBERG_SAFE_HARBOR_DE}</p>
  </footer>
</div>

<style>
  .tax-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .view-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    font-size: var(--font-size-xs, 12px);
    font-weight: 500;
    cursor: pointer;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
  }

  .page-title {
    margin: 0;
    font-size: var(--font-size-xl, 20px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .page-subtitle {
    margin: 2px 0 0;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .metrics-banner {
    display: flex;
    gap: var(--space-8, 32px);
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
  }

  .metric-block {
    display: flex;
    flex-direction: column;
  }

  .m-label {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-ink-secondary, #475569);
  }

  .m-val {
    font-size: var(--font-size-2xl, 24px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  :global(.text-pine) {
    color: var(--color-pine-teal, #2F524C);
  }

  .table-card {
    background: #FFFFFF;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .table-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-pine-teal, #2F524C);
  }

  .table-title {
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .csv-export-btn {
    height: 38px;
    border-radius: var(--radius-md, 12px);
    background: var(--color-pine-teal, #2F524C);
    color: #FFFFFF;
    border: none;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    cursor: pointer;
  }

  .csv-export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .table-responsive {
    overflow-x: auto;
  }

  .tax-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm, 14px);
    text-align: left;
  }

  .tax-table th {
    padding: 10px 12px;
    border-bottom: 2px solid var(--color-border-subtle, #E2E8F0);
    color: var(--color-ink-secondary, #475569);
    font-size: 12px;
    font-weight: 600;
  }

  .tax-table td {
    padding: 12px;
    border-bottom: 1px solid var(--color-border-subtle, #E2E8F0);
    color: var(--color-ink-primary, #0F172A);
  }

  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }

  .tax-badge {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-surface-subtle, #F1F5F9);
    font-size: 11px;
    text-transform: uppercase;
  }

  .rule-badge {
    padding: 2px 8px;
    border-radius: 4px;
    background: #F1F5F9;
    font-size: 11px;
    font-weight: 600;
  }

  .rule-badge.sofort {
    background: #DCFCE7;
    color: #065F46;
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: var(--color-ink-secondary, #475569);
    font-size: var(--font-size-sm, 14px);
  }

  /* Non-Removable § 2 StBerG Safe-Harbor Footer */
  .stberg-safe-harbor-footer {
    border-top: 2px solid var(--color-border-subtle, #E2E8F0);
    background: #FAFBFB;
    padding: 12px 16px;
    border-radius: 8px;
  }

  .footer-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-ink-primary, #0F172A);
    margin-bottom: 4px;
  }

  .footer-text {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: var(--color-ink-secondary, #475569);
  }
</style>
