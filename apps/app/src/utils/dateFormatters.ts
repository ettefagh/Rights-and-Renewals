import type { WalletItem, BillingCycle } from '@cmlab/core';

export const CONCURRENCY_WEIGHT: Record<BillingCycle, number> = {
  daily: 1,
  weekly: 2,
  monthly: 3,
  quarterly: 4,
  yearly: 5,
};

export const CONCURRENCY_SHORT_SUFFIX: Record<BillingCycle, string> = {
  daily: '/ day',
  weekly: '/ wk',
  monthly: '/ mo',
  quarterly: '/ qtr',
  yearly: '/ yr',
};

export const CONCURRENCY_BADGE_LABEL: Record<BillingCycle, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Converts '2026-07-07' -> 'July 7th, 2026' (long) or 'Jul 7, 2026' (short)
 */
export function formatFriendlyDate(
  isoDateStr: string | undefined | null,
  style: 'long' | 'short' = 'long'
): string {
  if (!isoDateStr) return '—';
  const clean = isoDateStr.split('T')[0]!;
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDateStr;
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return isoDateStr;

  if (style === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const ordinal = getOrdinalSuffix(day);
  return `${monthName} ${day}${ordinal}, ${year}`;
}

/**
 * Friendly relative badge for remaining warranty or upcoming renewal
 */
export function formatRelativeRemaining(
  isoDateStr: string | undefined | null,
  mode: 'renewal' | 'warranty' = 'warranty'
): {
  label: string;
  tone: 'urgent' | 'warning' | 'healthy';
  days: number;
} {
  if (!isoDateStr) return { label: '—', tone: 'healthy', days: 999 };
  const target = new Date(isoDateStr).getTime();
  const now = Date.now();
  const days = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { label: `${Math.abs(days)}d overdue`, tone: 'urgent', days };
  }
  if (days === 0) {
    return { label: mode === 'renewal' ? 'Today' : 'Ends today', tone: 'urgent', days };
  }
  if (days === 1) {
    return { label: mode === 'renewal' ? 'Tomorrow' : '1 day left', tone: 'urgent', days };
  }
  if (days <= 30) {
    const tone = days <= 7 ? 'urgent' : 'warning';
    return {
      label: mode === 'renewal' ? `in ${days}d` : `${days}d left`,
      tone,
      days,
    };
  }
  const months = Math.round(days / 30.4375);
  if (months < 12) {
    const tone = months <= 3 ? 'warning' : 'healthy';
    return {
      label: mode === 'renewal' ? `in ${months} mos` : `${months} mos left`,
      tone,
      days,
    };
  }
  const yrs = Math.floor(months / 12);
  const remMos = months % 12;
  const label = remMos > 0 ? `${yrs}y ${remMos}m left` : `${yrs} yr${yrs > 1 ? 's' : ''} left`;
  return { label, tone: 'healthy', days };
}

/**
 * Computes warranty lifespan battery remaining % and Easy-Claim Period* (§ 477 BGB 12m) status
 */
export function computeCoverageProgress(
  purchaseDateStr: string | undefined,
  expiryDateStr: string | undefined
): {
  pctRemaining: number;
  pctElapsed: number;
  isWithinEasyClaim12m: boolean;
  remainingLabel: string;
  tone: 'healthy' | 'warning' | 'urgent';
} {
  const now = Date.now();
  const purchase = purchaseDateStr ? new Date(purchaseDateStr).getTime() : now;
  const expiry = expiryDateStr
    ? new Date(expiryDateStr).getTime()
    : purchase + 730 * 24 * 60 * 60 * 1000;

  const totalDuration = Math.max(1, expiry - purchase);
  const elapsed = Math.max(0, Math.min(now - purchase, totalDuration));
  const pctElapsed = Math.round((elapsed / totalDuration) * 100);
  const pctRemaining = Math.max(4, 100 - pctElapsed);

  const daysSincePurchase = Math.floor((now - purchase) / (1000 * 60 * 60 * 24));
  const isWithinEasyClaim12m = daysSincePurchase <= 365;

  const rel = formatRelativeRemaining(expiryDateStr, 'warranty');

  let tone: 'healthy' | 'warning' | 'urgent' = 'healthy';
  if (rel.days <= 30 || pctRemaining <= 15) {
    tone = 'urgent';
  } else if (!isWithinEasyClaim12m || pctRemaining <= 50) {
    tone = 'warning';
  }

  return {
    pctRemaining,
    pctElapsed,
    isWithinEasyClaim12m,
    remainingLabel: rel.label,
    tone,
  };
}

/**
 * Determines billing concurrency ('daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')
 */
export function getSubscriptionConcurrency(item: WalletItem): BillingCycle {
  if (item.billingCycle && item.billingCycle in CONCURRENCY_WEIGHT) {
    return item.billingCycle;
  }
  const text = `${item.title} ${item.notes || ''} ${(item.searchTokens || []).join(' ')}`.toLowerCase();
  if (text.includes('daily') || text.includes('täglich') || text.includes('day pass')) return 'daily';
  if (text.includes('weekly') || text.includes('wöchentlich') || text.includes('week')) return 'weekly';
  if (text.includes('quarter') || text.includes('quartal')) return 'quarterly';
  if (text.includes('year') || text.includes('annual') || text.includes('jährlich')) return 'yearly';
  return 'monthly';
}

/**
 * Normalizes a subscription price to its monthly equivalent (€/mo)
 */
export function computeMonthlyNormalizedPrice(item: WalletItem): number {
  if (item.category !== 'subscription' || item.status === 'cancelled') return 0;
  const price = item.priceGrossEur || 0;
  const cycle = getSubscriptionConcurrency(item);
  switch (cycle) {
    case 'daily':
      return price * 30.4375;
    case 'weekly':
      return price * 4.345;
    case 'monthly':
      return price;
    case 'quarterly':
      return price / 3;
    case 'yearly':
      return price / 12;
  }
}

/**
 * Sorts subscriptions strictly by concurrency frequency (daily -> weekly -> monthly -> quarterly -> yearly)
 * and then by gross price descending (highest cost first).
 */
export function sortSubscriptionsByConcurrencyAndPrice(items: WalletItem[]): WalletItem[] {
  return [...items]
    .filter((i) => i.category === 'subscription')
    .sort((a, b) => {
      const cycleA = getSubscriptionConcurrency(a);
      const cycleB = getSubscriptionConcurrency(b);
      const weightDiff = CONCURRENCY_WEIGHT[cycleA] - CONCURRENCY_WEIGHT[cycleB];
      if (weightDiff !== 0) return weightDiff;
      return (b.priceGrossEur || 0) - (a.priceGrossEur || 0);
    });
}
