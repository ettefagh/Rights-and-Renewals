import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPublishedPlanProjection, fetchPublishedPlans, type PolicyPlanContext, type PublishedPlanProjection } from '../../../app/src/lib/policy-plan-client.js';

const rule = {
  id: 'rule-v1', versionKey: 'rule-version-1', revisionHash: 'a'.repeat(64), publicationState: 'published',
  applicability: { country: 'DE', effectiveFrom: null, effectiveTo: null, channel: null, customerKind: null },
  sourceUrl: 'https://example.org/terms', observedAt: '2026-11-01T00:00:00Z', statement: 'A published rule.',
};

const currentProjection = (): PublishedPlanProjection => ({
  schemaVersion: 1,
  plan: 'plan-student',
  context: { country: 'DE' },
  applicability: 'applicable',
  findings: [{
    assessmentId: 'assessment-v1', ruleVersionId: 'rule-v1', applicability: 'applicable', termsState: 'found',
    findingState: 'missing_required_disclosure', reviewedAt: '2026-11-01T00:00:00Z',
    reviewExpiresAt: '2027-01-01T00:00:00Z', rule,
    evidence: [{ id: 'evidence-v1', revisionHash: 'b'.repeat(64), publicationState: 'published', publicExcerpt: 'Published excerpt.' }],
  }],
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('published plan client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads a bounded public catalog and refuses duplicate plan ids', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      schemaVersion: 1,
      items: [{ id: 'plan-student', slug: 'student', title: 'Student plan', summary: '' }],
    }));
    const plans = await fetchPublishedPlans('https://showcase.example/api/emdash/plans', { fetcher });
    expect(plans).toEqual([{ id: 'plan-student', slug: 'student', title: 'Student plan', summary: '' }]);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get('limit')).toBe('50');
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store' });

    fetcher.mockResolvedValueOnce(jsonResponse({ schemaVersion: 1, items: [plans[0], plans[0]] }));
    await expect(fetchPublishedPlans('https://showcase.example/api/emdash/plans', { fetcher })).rejects.toThrow('Invalid published plan catalog');
    await expect(fetchPublishedPlans('http://untrusted.example/api/emdash/plans', { fetcher })).rejects.toThrow('Published plan endpoint is invalid');
    await expect(fetchPublishedPlans('https://showcase.example/other', { fetcher })).rejects.toThrow('Published plan endpoint is invalid');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('requests only an explicitly selected plan and the selected public context', async () => {
    const projection = currentProjection();
    const selectedContext: PolicyPlanContext = {
      country: 'DE', contractDate: '2026-10-01', channel: 'web',
    };
    projection.context = selectedContext;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(projection));
    await expect(fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', selectedContext, { fetcher }))
      .resolves.toMatchObject({ plan: 'plan-student', findings: [{ findingState: 'missing_required_disclosure' }] });
    const [url, init] = fetcher.mock.calls[0]!;
    const params = new URL(String(url)).searchParams;
    expect(Object.fromEntries(params)).toEqual({ plan: 'plan-student', country: 'DE', contractDate: '2026-10-01', channel: 'web' });
    expect(init).toMatchObject({ credentials: 'omit', cache: 'no-store' });

    await expect(fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', selectedContext, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ...projection, plan: 'another-plan' })),
    }))
      .rejects.toThrow('Invalid or out-of-date published plan projection');
  });

  it('rejects expired, malformed, and unapproved shaped findings instead of returning flags', async () => {
    const expired = currentProjection();
    expired.findings[0]!.reviewExpiresAt = '2026-01-01T00:00:00Z';
    await expect(fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', { country: 'DE' }, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(expired)),
    })).rejects.toThrow('Invalid or out-of-date published plan projection');

    const invalid = currentProjection();
    invalid.findings[0]!.findingState = 'compliant' as PublishedPlanProjection['findings'][number]['findingState'];
    await expect(fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', { country: 'DE' }, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(invalid)),
    })).rejects.toThrow('Invalid or out-of-date published plan projection');
  });

  it('does not send context fields outside the user-selected allowlist', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(currentProjection()));
    await fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', {
      country: 'DE',
    }, { fetcher });
    expect(new URL(String(fetcher.mock.calls[0]![0])).searchParams.toString()).toBe('plan=plan-student&country=DE');

    await expect(fetchPublishedPlanProjection('https://showcase.example/api/emdash/plans', 'plan-student', {
      country: 'DE', email: 'student@example.test',
    } as unknown as PolicyPlanContext, { fetcher })).rejects.toThrow('Invalid published plan lookup context');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
