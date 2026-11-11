import { beforeEach, describe, expect, it, vi } from 'vitest';

const emdash = vi.hoisted(() => ({
  definePlugin: vi.fn((definition: unknown) => definition), getEmDashReferences: vi.fn(),
  getRequestContext: vi.fn(() => undefined), runWithContext: vi.fn((_ctx, callback) => callback()),
}));
vi.mock('emdash', () => emdash);
vi.mock('astro/zod', async () => await import('zod'));

import { createPlugin } from './policy-graph-plugin.js';
import { sha256Json } from './policy-graph.js';

const assessmentId = '01ASSESSMENT';
const referenceIds = {
  offer_version: ['01OFFER'], rule_versions: ['01RULE'], evidence: ['01EVIDENCE'],
};
const versions = new Map<string, any>([
  ['policy_assessments:01ASSESSMENT', { item: { id: assessmentId, status: 'draft', authorId: 'author', data: { id: assessmentId, review_expires_at: '2027-01-01T00:00:00Z', terms_statement: 'review me' } }, _rev: 'rev-7' }],
  ['policy_offer_versions:01OFFER', { item: { id: '01OFFER', status: 'published', data: { version_key: 'offer-v1', label: 'Offer' } }, _rev: 'offer-rev' }],
  ['policy_rule_versions:01RULE', { item: { id: '01RULE', status: 'published', data: { version_key: 'rule-v1', label: 'Rule' } }, _rev: 'rule-rev' }],
  ['policy_evidence:01EVIDENCE', { item: { id: '01EVIDENCE', status: 'published', data: { stable_key: 'evidence-v1', excerpt: 'Evidence' } }, _rev: 'evidence-rev' }],
]);

function fakeContext() {
  emdash.getEmDashReferences.mockImplementation(async (_collection: string, _id: string, field: keyof typeof referenceIds) => ({
    entries: referenceIds[field].map((id) => ({ id: `${id}-slug`, data: { id } })), nextCursor: undefined,
  }));
  return {
    content: { getVersioned: vi.fn(async (collection: string, id: string) => versions.get(`${collection}:${id}`) ?? null) },
    storage: {
      approvals: { get: vi.fn(async () => null), getVersioned: vi.fn(async () => null), compareAndSet: vi.fn(async () => ({ applied: true, revision: 'approval-r1' })) },
      approval_audit: { compareAndSet: vi.fn(async () => ({ applied: true, revision: 'audit-r1' })) },
    },
    log: { error: vi.fn() },
  };
}

describe('native policy review plugin', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exports an Astro native createPlugin factory and registers publication/scheduling gates', () => {
    const plugin = createPlugin();
    expect(emdash.definePlugin).toHaveBeenCalled();
    expect(plugin).toMatchObject({
      id: 'cmlab-policy-graph-review',
      hooks: { 'content:beforeSave': expect.any(Function), 'content:beforePublish': expect.any(Function), 'content:beforeSchedule': expect.any(Function) },
      routes: { reviewAssessment: { permission: 'content:publish_any' }, approveAssessment: { permission: 'content:publish_any' } },
    });
  });

  it('re-reads current draft relation edges and blocks publication without matching protected approval', async () => {
    const plugin = createPlugin() as unknown as { hooks: Record<string, (event: unknown, context: unknown) => Promise<unknown>> };
    const ctx = fakeContext();
    const result = await plugin.hooks['content:beforePublish']!({ collection: 'policy_assessments', content: { id: assessmentId } }, ctx);
    expect(emdash.getEmDashReferences).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ cancel: true });
  });

  it('allows publication for a current protected approval whose canonical relation and content hashes match', async () => {
    const plugin = createPlugin() as unknown as { hooks: Record<string, (event: unknown, context: unknown) => Promise<unknown>> };
    const ctx = fakeContext();
    const assessment = versions.get('policy_assessments:01ASSESSMENT')!;
    const clean = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).filter(([key]) => !['id', 'revision_hash', '_rev', 'slug', 'url', 'references', 'status', 'authorId', 'createdAt', 'updatedAt'].includes(key)));
    const selected = { offer_version: ['01OFFER'], rule_versions: ['01RULE'], evidence: ['01EVIDENCE'] };
    const assessmentHash = await sha256Json({ data: clean(assessment.item.data), selected });
    const dependency = async (collection: string, id: string, revision: string) => ({
      id, revision, contentHash: await sha256Json(clean(versions.get(`${collection}:${id}`)!.item.data)),
    });
    const dependencies = [
      await dependency('policy_offer_versions', '01OFFER', 'offer-v1'),
      await dependency('policy_rule_versions', '01RULE', 'rule-v1'),
      await dependency('policy_evidence', '01EVIDENCE', 'evidence-v1'),
    ].sort((a, b) => a.id.localeCompare(b.id));
    (ctx.storage.approvals.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      assessmentId, assessmentRevision: assessmentHash, assessmentHash, assessmentFieldsHash: assessmentHash,
      sourceRevision: assessment._rev, dependencies, reviewerId: 'independent-reviewer',
      approvedAt: '2026-11-01T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z',
    });
    expect(await plugin.hooks['content:beforePublish']!({ collection: 'policy_assessments', content: { id: assessmentId } }, ctx)).toBeUndefined();
  });

  it('blocks edits to already published rule versions so their identity stays immutable', async () => {
    const plugin = createPlugin() as unknown as { hooks: Record<string, (event: unknown, context: unknown) => Promise<unknown>> };
    const result = await plugin.hooks['content:beforeSave']!({ collection: 'policy_rule_versions', id: '01RULE', content: {} }, fakeContext());
    expect(result).toMatchObject({ cancel: true });
  });

  it('fails closed when a newly selected dependency is unpublished or a relation read errors', async () => {
    const plugin = createPlugin() as unknown as { hooks: Record<string, (event: unknown, context: unknown) => Promise<unknown>> };
    const ctx = fakeContext();
    const draftRule = versions.get('policy_rule_versions:01RULE')!;
    versions.set('policy_rule_versions:01RULE', { ...draftRule, item: { ...draftRule.item, status: 'draft' } });
    const rejected = await plugin.hooks['content:beforePublish']!({ collection: 'policy_assessments', content: { id: assessmentId } }, ctx);
    expect(rejected).toMatchObject({ cancel: true });
    expect(ctx.storage.approvals.get).not.toHaveBeenCalled();
    versions.set('policy_rule_versions:01RULE', draftRule);
    emdash.getEmDashReferences.mockImplementationOnce(async () => ({ entries: [], error: new Error('edge read failed') }));
    expect(await plugin.hooks['content:beforePublish']!({ collection: 'policy_assessments', content: { id: assessmentId } }, ctx)).toMatchObject({ cancel: true });
  });

  it('rejects author self-review and uses conditional protected writes for an independent reviewer', async () => {
    const plugin = createPlugin() as unknown as { routes: Record<string, { handler: (route: any) => Promise<any> }> };
    const ctx = fakeContext();
    const base = { ...ctx, request: new Request('https://cms.test/review?assessmentId=01ASSESSMENT'), user: { id: 'author' }, input: {} };
    await expect(plugin.routes.approveAssessment!.handler({ ...base, input: { assessmentId, expectedRevision: 'rev-7', expectedApprovalRevision: null } })).rejects.toThrow('Review could not be completed');
    const route = { ...base, user: { id: 'independent-reviewer' }, input: { assessmentId, expectedRevision: 'rev-7', expectedApprovalRevision: null } };
    const result = await plugin.routes.approveAssessment!.handler(route);
    expect(result.reviewerId).toBe('independent-reviewer');
    expect(ctx.storage.approval_audit.compareAndSet).toHaveBeenCalledWith(expect.any(String), null, expect.objectContaining({ reviewerId: 'independent-reviewer' }));
    expect(ctx.storage.approvals.compareAndSet).toHaveBeenCalledWith(assessmentId, null, expect.objectContaining({ reviewerId: 'independent-reviewer' }));
  });
});
