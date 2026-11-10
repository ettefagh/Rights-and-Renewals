import type { APIRoute } from 'astro';
import { computeSha256Hex } from '@cmlab/core';
import type { PolicyWikiEntry } from '@cmlab/core';
import { getPublishedPolicies } from '../../../lib/policy-cms';

export const prerender = false;

export interface EmDashPolicyRecord extends PolicyWikiEntry {
  agbSha256: string;
  freshnessStatus: 'verified_fresh' | 'review_due_soon' | 'stale_over_90d';
  daysSinceVerified: number;
  publicationState: 'published';
}

async function enrichPolicyRecord(entry: PolicyWikiEntry, now: number): Promise<EmDashPolicyRecord> {
  const canonicalString = `${entry.brandSlug}|${entry.statutoryWarrantyMonths}|${entry.commercialGuaranteeMonths}|${entry.cancellationNoticeMonths}|${entry.cancellationButtonCompliant}|${entry.cancellationUrl ?? ''}|${entry.legalNotes}`;
  const agbSha256 = await computeSha256Hex(new TextEncoder().encode(canonicalString));
  const verifiedMs = Date.parse(`${entry.verifiedDate}T00:00:00Z`);
  const daysSinceVerified = Math.floor((now - verifiedMs) / (1000 * 60 * 60 * 24));
  if (daysSinceVerified < 0) throw new Error(`Published policy '${entry.brandSlug}' has a future verification date.`);

  let freshnessStatus: EmDashPolicyRecord['freshnessStatus'] = 'verified_fresh';
  if (daysSinceVerified > 90) {
    freshnessStatus = 'stale_over_90d';
  } else if (daysSinceVerified > 60) {
    freshnessStatus = 'review_due_soon';
  }

  return { ...entry, agbSha256, freshnessStatus, daysSinceVerified, publicationState: 'published' };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryFilter = url.searchParams.get('category');
    const slugFilter = url.searchParams.get('slug')?.toLowerCase().trim();
    let policies = await getPublishedPolicies();

    if (categoryFilter === 'hardware' || categoryFilter === 'subscription') {
      policies = policies.filter((item) => item.category === categoryFilter);
    }
    if (slugFilter) policies = policies.filter((item) => item.brandSlug === slugFilter);

    const now = Date.now();
    const enriched = await Promise.all(policies.map((entry) => enrichPolicyRecord(entry, now)));
    const subscriptions = enriched.filter((entry) => entry.category === 'subscription');
    const compliant312kCount = subscriptions.filter((entry) => entry.cancellationButtonCompliant).length;

    return json({
      cms: 'EmDash CMS',
      app: 'Rights & Renewals',
      totalBrands: enriched.length,
      telemetrySummary: {
        freshCount: enriched.filter((entry) => entry.freshnessStatus === 'verified_fresh').length,
        staleCount: enriched.filter((entry) => entry.freshnessStatus === 'stale_over_90d').length,
        bgb312kComplianceRatio: `${compliant312kCount}/${subscriptions.length}`,
      },
      items: enriched,
    });
  } catch (error) {
    console.error('[policy-api] Failed to read published EmDash policy content.', error);
    return json({ error: 'Published policy content is temporarily unavailable.' }, 503);
  }
};
