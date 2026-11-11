<script lang="ts">
  import type { WalletItem } from '@cmlab/core';
  import { formatFriendlyDate } from '../../utils/dateFormatters';

  interface Props {
    item: WalletItem;
  }

  let { item }: Props = $props();

  let milestones = $derived.by(() => {
    const purchase = new Date(item.purchaseDate || Date.now());
    const cliff12m = new Date(
      purchase.getFullYear() + 1,
      purchase.getMonth(),
      purchase.getDate()
    );
    const expiry24m = item.expiryDate
      ? new Date(item.expiryDate)
      : new Date(purchase.getFullYear() + 2, purchase.getMonth(), purchase.getDate());

    const formatIso = (d: Date) => d.toISOString().split('T')[0]!;

    const now = Date.now();
    const totalDuration = Math.max(1, expiry24m.getTime() - purchase.getTime());
    const elapsed = Math.max(0, Math.min(now - purchase.getTime(), totalDuration));
    const progressPercent = Math.round((elapsed / totalDuration) * 100);
    const remainingPercent = Math.max(4, 100 - progressPercent);

    const isPast12m = now >= cliff12m.getTime();

    return {
      purchaseDateIso: formatIso(purchase),
      cliff12mIso: formatIso(cliff12m),
      expiry24mIso: formatIso(expiry24m),
      purchaseDate: formatFriendlyDate(formatIso(purchase), 'short'),
      cliff12m: formatFriendlyDate(formatIso(cliff12m), 'short'),
      expiry24m: formatFriendlyDate(formatIso(expiry24m), 'short'),
      progressPercent,
      remainingPercent,
      isPast12m
    };
  });
</script>

<div class="timeline-container">
  <div class="timeline-meta-row">
    <span class="timeline-badge" class:warning={milestones.isPast12m}>
      <span class="status-dot" class:amber={milestones.isPast12m}></span>
      {milestones.isPast12m ? 'Standard 2-Year Warranty*' : 'Easy-Claim Period Active*'}
    </span>
    <span class="timeline-pct">{milestones.remainingPercent}% coverage left</span>
  </div>

  <!-- Coverage Lifespan Progress Track -->
  <div class="timeline-track">
    <div
      class="timeline-fill"
      class:amber={milestones.isPast12m}
      style:width="{milestones.remainingPercent}%"
    ></div>
    <!-- 12-Month Easy-Claim Marker at 50% -->
    <div class="cliff-marker" title="12-Month Easy-Claim Period* (§ 477 BGB)">
      <div class="marker-pin"></div>
      <span class="marker-tag">1-Yr Mark*</span>
    </div>
  </div>

  <!-- Dates are derived from the saved purchase and expiry dates. -->
  <ol class="milestone-nodes" aria-label="Purchase protection timeline">
    <li class="node-item">
      <span class="timeline-node" aria-hidden="true"></span>
      <span class="node-copy">
        <span class="node-label">Purchased</span>
        <time class="node-date" datetime={milestones.purchaseDateIso}>{milestones.purchaseDate}</time>
      </span>
    </li>
    <li class="node-item">
      <span class="timeline-node" aria-hidden="true"></span>
      <span class="node-copy">
        <span class="node-label">Proof rules change*</span>
        <time class="node-date" datetime={milestones.cliff12mIso}>{milestones.cliff12m}</time>
      </span>
    </li>
    <li class="node-item">
      <span class="timeline-node" aria-hidden="true"></span>
      <span class="node-copy">
        <span class="node-label">Warranty period ends*</span>
        <time class="node-date" datetime={milestones.expiry24mIso}>{milestones.expiry24m}</time>
      </span>
    </li>
  </ol>
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-pine-teal, #2F524C);
    background: #E9EFEF;
    padding: 3px 8px;
    border-radius: 9999px;
  }

  .timeline-badge.warning {
    color: #92400E;
    background: #FEF3C7;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #059669;
    display: inline-block;
  }

  .status-dot.amber {
    background: #D97706;
  }

  .timeline-pct {
    font-size: 11px;
    color: var(--color-ink-secondary, #475569);
    font-weight: 600;
  }

  .timeline-track {
    position: relative;
    height: 8px;
    border-radius: 9999px;
    background: #E2E8F0;
    overflow: visible;
    margin: 10px 0 8px 0;
  }

  .timeline-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, #059669 0%, #2F524C 100%);
    transition: width 300ms ease;
  }

  .timeline-fill.amber {
    background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
  }

  .cliff-marker {
    position: absolute;
    left: 50%;
    top: -4px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .marker-pin {
    width: 3px;
    height: 16px;
    background: #D96B4B;
    border-radius: 2px;
  }

  .marker-tag {
    font-size: 9px;
    font-weight: 700;
    color: #D96B4B;
    margin-top: 2px;
    white-space: nowrap;
  }

  .milestone-nodes {
    display: flex;
    flex-direction: column;
    gap: 0;
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }

  .node-item {
    position: relative;
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr);
    align-items: center;
    gap: 0 12px;
    min-height: 40px;
  }

  .node-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 24px;
    bottom: -16px;
    width: 2px;
    background: #b9d4ca;
  }

  .timeline-node {
    z-index: 1;
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-pine-teal, #126b56);
    border-radius: 50%;
    background: var(--color-card-white, #fff);
  }

  .node-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  .node-label {
    color: var(--color-ink-primary, #10201d);
    font-size: 13px;
    font-weight: 650;
  }

  .node-date {
    color: var(--color-ink-secondary, #475569);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  @media (max-width: 420px) {
    .node-copy { align-items: flex-start; flex-direction: column; gap: 1px; padding-block: 5px; }
  }
</style>