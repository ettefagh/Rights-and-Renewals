import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePolicyPlan, sha256Json } from './policy-graph.js';

const cms = vi.hoisted(() => ({
  getEmDashCollection: vi.fn(), getEmDashReferences: vi.fn(), getRequestContext: vi.fn(() => undefined), runWithContext: vi.fn((_context, callback) => callback()),
}));
const runtime = vi.hoisted(() => ({ withEmDashRuntime: vi.fn() }));
const store = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('emdash', () => cms);
vi.mock('emdash/middleware', () => runtime);
vi.mock('emdash/internal/plugins/host', () => ({ PluginStorageRepository: class { get = store.get; constructor(..._args: unknown[]) {} } }));

import { loadPublishedPlanGraph, readProtectedApprovals } from './policy-graph-cms.js';

const dbId = (id: string, data: Record<string, unknown>, status = 'published'): { id: string; data: Record<string, unknown>; status: string } => ({ id: `${id}-slug`, data: { id, ...data }, status });
const canonical = (data: Record<string, unknown>) => {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !['id', 'revision_hash', '_rev', 'slug', 'url', 'references', 'status', 'authorId', 'createdAt', 'updatedAt'].includes(key)));
};

describe('published policy CMS projection', () => {
  let approval: Record<string, unknown>;
  let entries: Record<string, ReturnType<typeof dbId>[]>;
  let links: Record<string, ReturnType<typeof dbId>[]>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const evidenceContent = { stable_key: 'evidence-v1', title: 'Hypothetical evidence', public_excerpt: 'Hypothetical evidence excerpt.' };
    const offerContent = { version_key: 'offer-v1', applicability_country: 'DE', applicability_contract_from: '2026-01-01', applicability_channel: 'web', applicability_customer: 'consumer', source_url: 'https://example.invalid/terms', observed_at: '2026-10-01T00:00:00Z', terms_statement: 'Hypothetical terms.' };
    const ruleContent = { version_key: 'rule-v1', applicability_country: 'DE', source_url: 'https://example.invalid/rule', observed_at: '2026-10-01T00:00:00Z', statement: 'Hypothetical rule.' };
    const assessmentContent = { applicability_country: 'DE', applicability_contract_from: '2026-01-01', applicability_channel: 'web', applicability_customer: 'consumer', terms_statement: 'Hypothetical assessment.', product_observation: 'Hypothetical observation.', applicability_state: 'applicable', terms_state: 'unclear', finding_state: 'unresolved', reviewed_at: '2026-10-02T00:00:00Z', review_expires_at: '2027-01-01T00:00:00Z' };
    const evidence = dbId('db-evidence', { ...evidenceContent, revision_hash: 'd'.repeat(64) });
    const offerVersion = dbId('db-offer-version', { ...offerContent, revision_hash: 'forged-editor-metadata' });
    const ruleVersion = dbId('db-rule-version', ruleContent);
    const assessment = dbId('db-assessment', assessmentContent);
    assessment.data.slug = 'query-metadata-slug';
    assessment.data.references = { offer_version: ['metadata-enriched'] };
    entries = {
      policy_plans: [dbId('db-plan', { stable_key: 'plan-key', title: 'Hypothetical plan', summary: 'A test fixture.' })],
      policy_offers: [dbId('db-offer', { stable_key: 'offer-key', title: 'Hypothetical offer' })],
      policy_offer_versions: [offerVersion], policy_rule_versions: [ruleVersion],
      policy_assessments: [assessment],
    };
    const ref = (item: ReturnType<typeof dbId>) => item;
    links = {
      'policy_offers|db-offer|plan': [ref(entries.policy_plans![0]!)],
      'policy_offer_versions|db-offer-version|offer': [ref(entries.policy_offers![0]!)],
      'policy_assessments|db-assessment|offer_version': [offerVersion],
      'policy_assessments|db-assessment|rule_versions': [ruleVersion],
      'policy_assessments|db-assessment|evidence': [evidence],
    };
    const selected = { offer_version: ['db-offer-version'], rule_versions: ['db-rule-version'], evidence: ['db-evidence'] };
    const assessmentHash = await sha256Json({ data: canonical(assessmentContent), selected });
    approval = {
      assessmentId: 'db-assessment', assessmentRevision: assessmentHash, assessmentHash,
      dependencies: [
        { id: 'db-evidence', revision: 'evidence-v1', contentHash: await sha256Json(evidenceContent) },
        { id: 'db-offer-version', revision: 'offer-v1', contentHash: await sha256Json(offerContent) },
        { id: 'db-rule-version', revision: 'rule-v1', contentHash: await sha256Json(ruleContent) },
      ], reviewerId: 'reviewer', approvedAt: '2026-10-03T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z',
    };
    cms.getEmDashCollection.mockImplementation(async (collection: string, options: { status?: string }) => ({ entries: (entries[collection] ?? []).filter((entry) => options?.status !== 'published' || entry.status === 'published'), hasMore: false }));
    cms.getEmDashReferences.mockImplementation(async (collection: string, id: string, field: string) => ({ entries: links[`${collection}|${id}|${field}`] ?? [], nextCursor: undefined }));
    runtime.withEmDashRuntime.mockImplementation(async (callback: (runtime: { db: string }) => unknown) => callback({ db: 'runtime-db' }));
    store.get.mockImplementation(async (id: string) => id === 'db-assessment' ? approval : null);
  });

  it('joins slug-shaped query metadata to ULID relations and emits protected approved findings', async () => {
    const graph = await loadPublishedPlanGraph('plan-key');
    const result = resolvePolicyPlan(graph, { country: 'DE', contractDate: '2026-10-01', channel: 'web', customerKind: 'consumer' });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ assessmentId: 'db-assessment', ruleVersionId: 'db-rule-version' });
    expect(graph.offerVersions[0]?.revisionHash).toBe(await sha256Json(canonical(entries.policy_offer_versions![0]!.data)));
    expect(graph.ruleVersions[0]?.revisionHash).toBe(await sha256Json(canonical(entries.policy_rule_versions![0]!.data)));
    expect(graph.assessments[0]?.evidence[0]?.revisionHash).toBe(await sha256Json(canonical(links['policy_assessments|db-assessment|evidence']![0]!.data)));
    expect(cms.getEmDashReferences).toHaveBeenCalledWith('policy_offers', 'db-offer', 'plan', expect.any(Object));
    expect(runtime.withEmDashRuntime).toHaveBeenCalledTimes(1);
  });

  it('reads only the bounded known approval keys from EmDash protected storage', async () => {
    const found = await readProtectedApprovals(['db-assessment', 'db-assessment', '', ...Array.from({ length: 6000 }, (_, i) => `other-${i}`)]);
    expect(found).toEqual([approval]);
    expect(store.get).toHaveBeenCalledTimes(500);
    expect(store.get).toHaveBeenCalledWith('db-assessment');
  });

  it('propagates relation query failures instead of returning an incomplete public graph', async () => {
    cms.getEmDashReferences.mockImplementationOnce(async () => ({ entries: [], error: new Error('relation store unavailable') }));
    await expect(loadPublishedPlanGraph('plan-key')).rejects.toThrow('relation store unavailable');
  });

  it('suppresses a protected finding when published source content changes without a new matching review', async () => {
    entries.policy_offer_versions![0]!.data.terms_statement = 'Changed published source content';
    const graph = await loadPublishedPlanGraph('plan-key');
    const result = resolvePolicyPlan(graph, { country: 'DE', contractDate: '2026-10-01', channel: 'web', customerKind: 'consumer' });
    expect(result.findings).toEqual([]);
    expect(result.applicability).toBe('needs_information');
  });
});
