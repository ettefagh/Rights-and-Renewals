<script lang="ts">
  import type { WalletItem } from '@cmlab/core';

  interface Props {
    item: WalletItem;
  }

  let { item }: Props = $props();

  // Compute timeline milestone dates
  let milestones = $derived.by(() => {
    const purchase = new Date(item.purchaseDate || Date.now());
    const cliff12m = new Date(purchase);
    cliff12m.setMonth(purchase.getMonth() + 12);

    const expiry24m = new Date(purchase);
    expiry24m.setMonth(purchase.getMonth() + 24);

    const formatIso = (d: Date) => d.toISOString().split('T')[0]!;

    const now = Date.now();
    const totalDuration = expiry24m.getTime() - purchase.getTime();
    const elapsed = Math.max(0, Math.min(now - purchase.getTime(), totalDuration));
    const progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

    const isPast12m = now >= cliff12m.getTime();

    return {
      purchaseDate: formatIso(purchase),
      cliff12m: formatIso(cliff12m),
      expiry24m: formatIso(expiry24m),
      progressPercent,
      isPast12m
    };
  });
</script>

<div class="timeline-container">
  <div class="timeline-meta-row">
    <span class="timeline-badge" class:warning={milestones.isPast12m}>
      {milestones.isPast12m ? '⚠️ Past § 477 Presumption Shift' : '🛡️ Active Seller Burden (§ 477 BGB)'}
    </span>
    <span class="timeline-pct">{Math.round(milestones.progressPercent)}% of 24m</span>
  </div>

  <!-- Linear Track -->
  <div class="timeline-track">
    <div class="timeline-fill" style:width="{milestones.progressPercent}%"></div>
    <!-- 12-Month Cliff Marker at 50% -->
    <div class="cliff-marker" title="12-Month Beweislastumkehr Cliff (§ 477 BGB)">
      <div class="marker-pin"></div>
      <span class="marker-tag">12m Cliff</span>
    </div>
  </div>

  <!-- Milestone Nodes -->
  <div class="milestone-nodes">
    <div class="node-item">
      <span class="node-label">Purchase</span>
      <span class="node-date">{milestones.purchaseDate}</span>
    </div>
    <div class="node-item center">
      <span class="node-label">§ 477 BGB Cliff</span>
      <span class="node-date">{milestones.cliff12m}</span>
    </div>
    <div class="node-item end">
      <span class="node-label">24m Expiry</span>
      <span class="node-date">{milestones.expiry24m}</span>
    </div>
  </div>
</div>

<style>
  .timeline-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
    padding: var(--space-3, 12px);
    background: var(--color-surface-subtle, #F8FAFC);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 12px);
  }

  .timeline-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .timeline-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .timeline-badge.warning {
    color: #92400E;
    background: #FEF3C7;
  }

  .timeline-pct {
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
    font-weight: 500;
  }

  .timeline-track {
    position: relative;
    height: 8px;
    border-radius: 9999px;
    background: #E2E8F0;
    overflow: visible;
    margin: 8px 0;
  }

  .timeline-fill {
    height: 100%;
    border-radius: 9999px;
    background: var(--color-pine-teal, #2F524C);
    transition: width 300ms ease;
  }

  .cliff-marker {
    position: absolute;
    left: 50%;
    top: -4px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }

  .marker-pin {
    width: 3px;
    height: 16px;
    background: var(--color-warning-amber, #D97706);
    border-radius: 2px;
  }

  .marker-tag {
    font-size: 9px;
    font-weight: 700;
    color: var(--color-warning-amber, #D97706);
    white-space: nowrap;
    margin-top: 2px;
  }

  .milestone-nodes {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }

  .node-item {
    display: flex;
    flex-direction: column;
  }

  .node-item.center {
    align-items: center;
  }

  .node-item.end {
    align-items: flex-end;
  }

  .node-label {
    font-weight: 600;
    color: var(--color-ink-primary, #0F172A);
  }

  .node-date {
    color: var(--color-ink-secondary, #475569);
  }
</style>
