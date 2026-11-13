import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
vi.mock('emdash/middleware', () => ({ withEmDashRuntime: vi.fn() }));
vi.mock('emdash/internal/plugins/host', () => ({ PluginStorageRepository: class {} }));
import { getRequestContext, runWithContext } from 'emdash';
import { withPublicContext } from './policy-graph-cms.js';
import { approvalMatches, resolvePolicyPlan, type PolicyAssessment, type PolicyGraphInput, type ProtectedApproval, type VersionedPolicySource } from './policy-graph.js';

const offer: VersionedPolicySource = {
  id: 'offer-version-a', versionKey: 'offer-v1', revisionHash: 'a'.repeat(64), publicationState: 'published',
  applicability: { country: 'DE', effectiveFrom: '2026-01-01', channel: 'web', customerKind: 'consumer' },
  sourceUrl: 'https://example.invalid/terms', observedAt: '2026-10-01T00:00:00Z', statement: 'Hypothetical terms statement.',
};
const rule: VersionedPolicySource = {
  id: 'rule-version-a', versionKey: 'rule-v1', revisionHash: 'b'.repeat(64), publicationState: 'published',
  applicability: { country: 'DE' }, sourceUrl: 'https://example.invalid/rule', observedAt: '2026-10-01T00:00:00Z', statement: 'Hypothetical rule statement.',
};
const assessment: PolicyAssessment = {
  id: 'assessment-a', revision: 'r7', revisionHash: 'c'.repeat(64), publicationState: 'published',
  offerVersionId: offer.id, ruleVersionIds: [rule.id],
  dependencies: [
    { id: offer.id, revision: offer.versionKey, contentHash: offer.revisionHash },
    { id: rule.id, revision: rule.versionKey, contentHash: rule.revisionHash },
    { id: 'evidence-a', revision: 'evidence-v1', contentHash: 'd'.repeat(64) },
  ],
  evidence: [{ id: 'evidence-a', revisionHash: 'd'.repeat(64), publicationState: 'published', publicExcerpt: 'Hypothetical evidence.' }],
  applicability: { country: 'DE', effectiveFrom: '2026-01-01', channel: 'web', customerKind: 'consumer' },
  termsStatement: 'Hypothetical statement.', productObservation: 'Hypothetical observation.',
  applicabilityState: 'applicable', termsState: 'unclear', findingState: 'unresolved',
  reviewedAt: '2026-10-01T00:00:00Z', reviewExpiresAt: '2027-01-01T00:00:00Z',
};
const context = { country: 'DE', contractDate: '2026-10-01', channel: 'web', customerKind: 'consumer' as const };
const dependencies = [
  { id: offer.id, revision: offer.versionKey, contentHash: offer.revisionHash },
  { id: rule.id, revision: rule.versionKey, contentHash: rule.revisionHash },
  { id: 'evidence-a', revision: 'evidence-v1', contentHash: 'd'.repeat(64) },
];
const approval: ProtectedApproval = {
  assessmentId: assessment.id, assessmentRevision: assessment.revision, assessmentHash: assessment.revisionHash,
  dependencies, reviewerId: 'human-reviewer', approvedAt: '2026-10-02T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z',
};
const input = (overrides: Partial<PolicyGraphInput> = {}): PolicyGraphInput => ({
  offerVersions: [offer], ruleVersions: [rule], assessments: [assessment], approvals: [approval],
  now: '2026-11-01T00:00:00Z', ...overrides,
});

describe('published policy graph', () => {
  it('does not surface a finding when protected approval is absent or forged', () => {
    expect(resolvePolicyPlan(input({ approvals: [] }), context).findings).toEqual([]);
    const forged = { ...approval, assessmentHash: 'f'.repeat(64) };
    expect(resolvePolicyPlan(input({ approvals: [forged] }), context).findings).toEqual([]);
  });

  it('rejects expired approval and changed dependency revisions or hashes', () => {
    expect(approvalMatches(assessment, dependencies, { ...approval, expiresAt: '2026-10-31T00:00:00Z' }, '2026-11-01T00:00:00Z')).toBe(false);
    expect(approvalMatches(assessment, [...dependencies, { id: 'new-evidence', revision: 'r1', contentHash: 'e'.repeat(64) }], approval, '2026-11-01T00:00:00Z')).toBe(false);
    expect(approvalMatches(assessment, [{ id: offer.id, revision: offer.versionKey, contentHash: 'f'.repeat(64) }, ...dependencies.slice(1)], approval, '2026-11-01T00:00:00Z')).toBe(false);
  });

  it('does not return an assessment that references unpublished evidence', () => {
    const draftEvidence = { ...assessment, evidence: [{ id: 'evidence-a', revisionHash: 'd'.repeat(64), publicationState: 'draft' as const, publicExcerpt: 'Must stay private.' }] };
    expect(resolvePolicyPlan(input({ assessments: [draftEvidence] }), context).findings).toEqual([]);
  });

  it('keeps unpublished offer versions out of preview-context public results', () => {
    const result = resolvePolicyPlan(input({ offerVersions: [{ ...offer, publicationState: 'draft' }] }), context);
    expect(result.applicability).toBe('needs_information');
    expect(result.offerVersion).toBeUndefined();
    expect(result.findings).toEqual([]);
  });

  it('forces public relation reads out of preview and edit mode', async () => {
    const observed = await runWithContext({ editMode: true, preview: { collection: 'policy_assessments', id: 'assessment-a' } }, () =>
      withPublicContext(async () => getRequestContext()),
    );
    expect(observed?.editMode).toBe(false);
    expect(observed?.preview).toBeUndefined();
  });

  it('returns ambiguity when more than one published offer version fits the requested context', () => {
    const result = resolvePolicyPlan(input({ offerVersions: [offer, { ...offer, id: 'offer-version-b', versionKey: 'offer-v2' }] }), context);
    expect(result.applicability).toBe('ambiguous');
    expect(result.reason).toBe('multiple_matching_offers');
    expect(result.findings).toEqual([]);
  });

  it('requires explicit context and returns descriptive finding states without a compliance boolean', () => {
    const missing = resolvePolicyPlan(input(), { country: 'DE' });
    expect(missing.applicability).toBe('needs_information');
    const result = resolvePolicyPlan(input(), context);
    expect(result.findings[0]).toMatchObject({ termsState: 'unclear', findingState: 'unresolved' });
    expect(result.findings[0]).not.toHaveProperty('compliant');
  });

  it('returns the approved, scoped finding with exact public evidence fields', () => {
    const result = resolvePolicyPlan(input(), context);
    expect(result.applicability).toBe('applicable');
    expect(result.findings[0]).toMatchObject({
      assessmentId: assessment.id,
      ruleVersionId: rule.id,
      findingState: 'unresolved',
      evidence: [{ id: 'evidence-a', publicExcerpt: 'Hypothetical evidence.' }],
    });
    expect(result.findings[0]?.evidence[0]).not.toHaveProperty('internalNotes');
  });

  it('merges independently approved findings for different rules on one offer', () => {
    const secondRule: VersionedPolicySource = { ...rule, id: 'rule-version-b', versionKey: 'rule-v2' };
    const secondAssessment: PolicyAssessment = {
      ...assessment, id: 'assessment-b', revision: 'r8', revisionHash: 'e'.repeat(64), ruleVersionIds: [secondRule.id],
    };
    const secondDependencies = [
      dependencies[0]!,
      { id: secondRule.id, revision: secondRule.versionKey, contentHash: secondRule.revisionHash },
      dependencies[2]!,
    ];
    const boundSecondAssessment = { ...secondAssessment, dependencies: secondDependencies };
    const secondApproval: ProtectedApproval = {
      assessmentId: secondAssessment.id, assessmentRevision: secondAssessment.revision,
      assessmentHash: secondAssessment.revisionHash, dependencies: secondDependencies,
      reviewerId: 'another-reviewer', approvedAt: approval.approvedAt, expiresAt: approval.expiresAt,
    };
    const result = resolvePolicyPlan(input({
      ruleVersions: [rule, secondRule], assessments: [assessment, boundSecondAssessment], approvals: [approval, secondApproval],
    }), context);
    expect(result.applicability).toBe('applicable');
    expect(result.findings.map((finding) => finding.ruleVersionId).sort()).toEqual([rule.id, secondRule.id].sort());
  });

  it('returns ambiguity only for duplicate approved findings on the same offer and rule', () => {
    const duplicate: PolicyAssessment = { ...assessment, id: 'assessment-duplicate', revision: 'r9', revisionHash: 'f'.repeat(64), findingState: 'possible_conflict' };
    const duplicateApproval: ProtectedApproval = {
      ...approval, assessmentId: duplicate.id, assessmentRevision: duplicate.revision, assessmentHash: duplicate.revisionHash,
    };
    const result = resolvePolicyPlan(input({ assessments: [assessment, duplicate], approvals: [approval, duplicateApproval] }), context);
    expect(result.applicability).toBe('ambiguous');
    expect(result.reason).toBe('multiple_approved_assessments');
    expect(result.findings).toEqual([]);
  });

  it('does not let unrelated offer scopes require omitted optional context', () => {
    const result = resolvePolicyPlan(input({ offerVersions: [{ ...offer, applicability: { country: 'DE' } }, {
      ...offer, id: 'unrelated-offer', applicability: { country: 'US', channel: 'phone', customerKind: 'business' },
    }], assessments: [] }), { country: 'DE', contractDate: '2026-10-01' });
    expect(result.applicability).toBe('needs_information');
    expect(result.reason).toBe('no_approved_assessment');
    expect(result.offerVersion?.id).toBe(offer.id);
  });

  it('treats malformed review timestamps and rule enums as unreviewed', () => {
    expect(resolvePolicyPlan(input({ assessments: [{ ...assessment, reviewedAt: 'not-a-date' }] }), context).findings).toEqual([]);
    expect(resolvePolicyPlan(input({ assessments: [{ ...assessment, findingState: 'made_up' as PolicyAssessment['findingState'] }] }), context).findings).toEqual([]);
  });

  it('does not claim an unknown or unassessed plan has no applicable rules', () => {
    expect(resolvePolicyPlan(input({ offerVersions: [], assessments: [] }), context).applicability).toBe('needs_information');
    expect(resolvePolicyPlan(input({ assessments: [] }), context).applicability).toBe('needs_information');
  });

  it('caps public findings and marks an incomplete projection as needing information', () => {
    const rules = Array.from({ length: 501 }, (_, index) => ({ ...rule, id: `rule-${index}`, versionKey: `v-${index}` }));
    const wideDependencies = [
      dependencies[0]!, ...rules.map((item) => ({ id: item.id, revision: item.versionKey, contentHash: item.revisionHash })), dependencies[2]!,
    ];
    const wideAssessment = { ...assessment, ruleVersionIds: rules.map((item) => item.id), dependencies: wideDependencies };
    const wideApproval = { ...approval, dependencies: wideDependencies };
    const result = resolvePolicyPlan(input({ ruleVersions: rules, assessments: [wideAssessment], approvals: [wideApproval] }), context);
    expect(result.findings).toHaveLength(500);
    expect(result.truncated).toBe(true);
    expect(result.reason).toBe('result_limit_exceeded');
    expect(result.applicability).toBe('needs_information');
  });
});
