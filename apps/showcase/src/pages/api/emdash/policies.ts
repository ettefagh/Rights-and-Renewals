import type { APIRoute } from 'astro';
import { policySeedData, computeSha256Hex } from '@cmlab/core';
import type { PolicyWikiEntry } from '@cmlab/core';

export const prerender = false;

export interface EmDashPolicyRecord extends PolicyWikiEntry {
  agbSha256: string;
  freshnessStatus: 'verified_fresh' | 'review_due_soon' | 'stale_over_90d';
  daysSinceVerified: number;
  publicationState: 'published' | 'in_review' | 'draft';
}

// In-memory edge overlay for live interactive EmDash editorial updates during session
const runtimeOverrides = new Map<string, Partial<EmDashPolicyRecord>>();

async function enrichPolicyRecord(entry: PolicyWikiEntry): Promise<EmDashPolicyRecord> {
  const override = runtimeOverrides.get(entry.brandSlug) ?? {};
  const merged: PolicyWikiEntry = { ...entry, ...override };

  const canonicalString = `${merged.brandSlug}|${merged.statutoryWarrantyMonths}|${merged.commercialGuaranteeMonths}|${merged.cancellationNoticeMonths}|${merged.cancellationButtonCompliant}|${merged.cancellationUrl ?? ''}|${merged.legalNotes}`;
  const bytes = new TextEncoder().encode(canonicalString);
  const agbSha256 = await computeSha256Hex(bytes);

  const verifiedMs = Date.parse(merged.verifiedDate || '2026-10-15');
  const nowMs = Date.parse('2026-11-07T00:00:00Z');
  const daysSinceVerified = Math.max(0, Math.floor((nowMs - verifiedMs) / (1000 * 60 * 60 * 24)));

  let freshnessStatus: EmDashPolicyRecord['freshnessStatus'] = 'verified_fresh';
  if (daysSinceVerified > 90) {
    freshnessStatus = 'stale_over_90d';
  } else if (daysSinceVerified > 60) {
    freshnessStatus = 'review_due_soon';
  }

  return {
    ...merged,
    agbSha256,
    freshnessStatus,
    daysSinceVerified,
    publicationState: (override.publicationState as EmDashPolicyRecord['publicationState']) ?? 'published',
  };
}

export const GET: APIRoute = async ({ url }) => {
  const categoryFilter = url.searchParams.get('category');
  const slugFilter = url.searchParams.get('slug')?.toLowerCase().trim();

  let list = policySeedData;
  if (categoryFilter === 'hardware' || categoryFilter === 'subscription') {
    list = list.filter((item) => item.category === categoryFilter);
  }
  if (slugFilter) {
    list = list.filter((item) => item.brandSlug === slugFilter);
  }

  const enriched = await Promise.all(list.map(enrichPolicyRecord));
  const compliant312kCount = enriched.filter(
    (e) => e.category === 'subscription' && e.cancellationButtonCompliant
  ).length;
  const totalSubscriptions = enriched.filter((e) => e.category === 'subscription').length;

  return new Response(
    JSON.stringify({
      cms: 'EmDash Policy & Telemetry Engine v1.0',
      app: 'Rights & Renewals',
      totalBrands: enriched.length,
      telemetrySummary: {
        freshCount: enriched.filter((e) => e.freshnessStatus === 'verified_fresh').length,
        staleCount: enriched.filter((e) => e.freshnessStatus === 'stale_over_90d').length,
        bgb312kComplianceRatio: `${compliant312kCount}/${totalSubscriptions}`,
      },
      items: enriched,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const brandSlug = String(body.brandSlug ?? '')
      .trim()
      .toLowerCase();

    if (!brandSlug || !/^[a-z0-9-]+$/.test(brandSlug)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Valid lowercase brandSlug is required.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existing = policySeedData.find((b) => b.brandSlug === brandSlug);
    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: `Brand slug '${brandSlug}' not found in canonical catalog.` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const patch: Partial<EmDashPolicyRecord> = {
      ...(typeof body.legalNotes === 'string' && body.legalNotes.trim()
        ? { legalNotes: body.legalNotes.trim() }
        : {}),
      ...(typeof body.cancellationUrl === 'string' && body.cancellationUrl.trim()
        ? { cancellationUrl: body.cancellationUrl.trim() }
        : {}),
      ...(typeof body.cancellationButtonCompliant === 'boolean'
        ? { cancellationButtonCompliant: body.cancellationButtonCompliant }
        : {}),
      ...(typeof body.publicationState === 'string' &&
      ['published', 'in_review', 'draft'].includes(body.publicationState)
        ? { publicationState: body.publicationState as EmDashPolicyRecord['publicationState'] }
        : {}),
      verifiedDate: new Date().toISOString().split('T')[0]!,
    };

    runtimeOverrides.set(brandSlug, { ...(runtimeOverrides.get(brandSlug) ?? {}), ...patch });
    const updatedRecord = await enrichPolicyRecord(existing);

    return new Response(
      JSON.stringify({
        ok: true,
        message: `EmDash policy record for '${updatedRecord.brandName}' updated and re-hashed.`,
        item: updatedRecord,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid JSON payload',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
