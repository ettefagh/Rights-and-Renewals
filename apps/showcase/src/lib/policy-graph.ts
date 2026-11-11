export type ApplicabilityState = 'applicable' | 'not_applicable' | 'needs_information' | 'ambiguous';
export type TermsState = 'found' | 'not_found' | 'unclear' | 'not_assessed';
export type FindingState =
  | 'no_issue_identified'
  | 'missing_required_disclosure'
  | 'implementation_gap'
  | 'possible_conflict'
  | 'unresolved'
  | 'not_assessed';
export type PublicationState = 'published' | 'draft' | 'archived';

export interface PolicyContext {
  country?: string;
  contractDate?: string;
  channel?: string;
  customerKind?: 'consumer' | 'business';
}

export interface Applicability {
  country?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  channel?: string | null;
  customerKind?: 'consumer' | 'business' | null;
}

export interface VersionedPolicySource {
  id: string;
  versionKey: string;
  revisionHash: string;
  publicationState: PublicationState;
  applicability: Applicability;
  sourceUrl: string;
  sourcePublishedAt?: string | null;
  observedAt: string;
  statement: string;
}

export interface PolicyAssessment {
  id: string;
  revision: string;
  revisionHash: string;
  publicationState: 'published';
  offerVersionId: string;
  ruleVersionIds: string[];
  dependencies?: Array<{ id: string; revision: string; contentHash: string }>;
  evidence: Array<{ id: string; revisionHash: string; publicationState: PublicationState; publicExcerpt?: string }>;
  applicability: Applicability;
  termsStatement: string;
  productObservation: string;
  applicabilityState: ApplicabilityState;
  termsState: TermsState;
  findingState: FindingState;
  reviewedAt: string;
  reviewExpiresAt: string;
}

export interface ProtectedApproval {
  assessmentId: string;
  assessmentRevision: string;
  assessmentHash: string;
  dependencies: Array<{ id: string; revision: string; contentHash: string }>;
  reviewerId: string;
  approvedAt: string;
  expiresAt: string;
}

export interface PolicyGraphInput {
  offerVersions: VersionedPolicySource[];
  ruleVersions: VersionedPolicySource[];
  assessments: PolicyAssessment[];
  approvals?: ProtectedApproval[];
  now?: string;
}

export interface PolicyPlanResult {
  applicability: ApplicabilityState;
  reason?: 'missing_context' | 'no_matching_offer' | 'multiple_matching_offers' | 'no_approved_assessment' | 'multiple_approved_assessments' | 'no_matching_rule' | 'result_limit_exceeded';
  truncated?: boolean;
  offerVersion?: VersionedPolicySource;
  termsStatement?: string;
  productObservation?: string;
  findings: Array<{
    assessmentId: string;
    ruleVersionId: string;
    applicability: ApplicabilityState;
    termsState: TermsState;
    findingState: FindingState;
    reviewedAt: string;
    reviewExpiresAt: string;
    rule: VersionedPolicySource;
    evidence: PolicyAssessment['evidence'];
  }>;
}

function missingContext(scope: Applicability, context: PolicyContext): boolean {
  return (!!scope.country && !context.country)
    || (!!(scope.effectiveFrom || scope.effectiveTo) && !context.contractDate)
    || (!!scope.channel && !context.channel)
    || (!!scope.customerKind && !context.customerKind);
}

function validBoundary(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2}))?$/.test(value)) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(Date.parse(value)) && day.toISOString().slice(0, 10) === value.slice(0, 10);
}

function validTimestamp(value: unknown): value is string {
  return validBoundary(value) && value.includes('T');
}

function validApplicability(scope: Applicability): boolean {
  return (!scope.country || /^[A-Z]{2}$/i.test(scope.country))
    && (!scope.effectiveFrom || validBoundary(scope.effectiveFrom))
    && (!scope.effectiveTo || validBoundary(scope.effectiveTo))
    && (!scope.effectiveFrom || !scope.effectiveTo || Date.parse(scope.effectiveFrom) < Date.parse(scope.effectiveTo))
    && (!scope.channel || ['web', 'app', 'phone', 'in_person', 'other'].includes(scope.channel))
    && (!scope.customerKind || ['consumer', 'business'].includes(scope.customerKind));
}

function validContext(context: PolicyContext): boolean {
  return (!context.country || /^[A-Z]{2}$/i.test(context.country))
    && (!context.contractDate || validBoundary(context.contractDate))
    && (!context.channel || ['web', 'app', 'phone', 'in_person', 'other'].includes(context.channel))
    && (!context.customerKind || ['consumer', 'business'].includes(context.customerKind));
}

function validAssessment(assessment: PolicyAssessment): boolean {
  return ['applicable', 'not_applicable', 'needs_information', 'ambiguous'].includes(assessment.applicabilityState)
    && ['found', 'not_found', 'unclear', 'not_assessed'].includes(assessment.termsState)
    && ['no_issue_identified', 'missing_required_disclosure', 'implementation_gap', 'possible_conflict', 'unresolved', 'not_assessed'].includes(assessment.findingState)
    && validApplicability(assessment.applicability)
    && /^[a-f0-9]{64}$/i.test(assessment.revisionHash)
    && validTimestamp(assessment.reviewedAt)
    && validTimestamp(assessment.reviewExpiresAt);
}

function applies(scope: Applicability, context: PolicyContext): boolean {
  if (scope.country && context.country && scope.country.toUpperCase() !== context.country.toUpperCase()) return false;
  if (scope.channel && context.channel && scope.channel !== context.channel) return false;
  if (scope.customerKind && context.customerKind && scope.customerKind !== context.customerKind) return false;
  const contractTime = context.contractDate ? Date.parse(context.contractDate) : undefined;
  const fromTime = scope.effectiveFrom ? Date.parse(scope.effectiveFrom) : undefined;
  const toTime = scope.effectiveTo ? Date.parse(scope.effectiveTo) : undefined;
  if (contractTime !== undefined && Number.isFinite(fromTime) && fromTime !== undefined && contractTime < fromTime) return false;
  if (contractTime !== undefined && Number.isFinite(toTime) && toTime !== undefined && contractTime >= toTime) return false;
  return true;
}

function scopesMatch(left: Applicability, right: Applicability, context: PolicyContext): boolean {
  return applies(left, context) && applies(right, context);
}

export function approvalMatches(
  assessment: PolicyAssessment,
  dependencies: Array<{ id: string; revision: string; contentHash: string }>,
  approval: ProtectedApproval | undefined,
  now: string,
): boolean {
  if (!approval || assessment.publicationState !== 'published' || !validTimestamp(now)) return false;
  if (!Array.isArray(dependencies) || !dependencies.every((item) => item && item.id && item.revision && /^[a-f0-9]{64}$/i.test(item.contentHash))) return false;
  if (!Array.isArray(approval.dependencies) || !approval.dependencies.every((item) => item && typeof item.id === 'string' && item.id.length > 0 && typeof item.revision === 'string' && item.revision.length > 0 && /^[a-f0-9]{64}$/i.test(item.contentHash))) return false;
  if (approval.assessmentId !== assessment.id || approval.assessmentRevision !== assessment.revision) return false;
  if (approval.assessmentHash !== assessment.revisionHash || !validTimestamp(approval.expiresAt) || Date.parse(approval.expiresAt) <= Date.parse(now)) return false;
  if (!approval.reviewerId?.trim() || !validTimestamp(approval.approvedAt) || Date.parse(approval.approvedAt) > Date.parse(now)) return false;
  const sort = (items: typeof dependencies) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  const expected = JSON.stringify(sort(dependencies));
  const recorded = JSON.stringify(sort(approval.dependencies));
  return expected === recorded;
}

export function resolvePolicyPlan(
  input: PolicyGraphInput,
  context: PolicyContext,
): PolicyPlanResult {
  const now = input.now ?? new Date().toISOString();
  if (!validContext(context) || !validTimestamp(now)) return { applicability: 'needs_information', reason: 'missing_context', findings: [] };
  const publishedOffers = input.offerVersions.filter((item) => item.publicationState === 'published');
  if (publishedOffers.length === 0) return { applicability: 'needs_information', reason: 'no_matching_offer', findings: [] };
  const usableOffers = publishedOffers.filter((item) => validApplicability(item.applicability));
  const candidates = usableOffers.filter((item) => applies(item.applicability, context));
  if (candidates.length === 0) return { applicability: 'needs_information', reason: 'no_matching_offer', findings: [] };
  if (candidates.length > 1) return { applicability: 'ambiguous', reason: 'multiple_matching_offers', findings: [] };

  const offerVersion = candidates[0];
  if (!offerVersion) return { applicability: 'needs_information', reason: 'no_matching_offer', findings: [] };
  if (missingContext(offerVersion.applicability, context)) return { applicability: 'needs_information', reason: 'missing_context', offerVersion, findings: [] };
  const approved = input.assessments.filter((assessment) => {
    if (assessment.publicationState !== 'published' || assessment.offerVersionId !== offerVersion.id) return false;
    if (!validAssessment(assessment) || Date.parse(assessment.reviewExpiresAt) <= Date.parse(now) || assessment.evidence.length === 0 || !assessment.evidence.every((e) => e.publicationState === 'published' && /^[a-f0-9]{64}$/i.test(e.revisionHash))) return false;
    const approval = input.approvals?.find((item) => item.assessmentId === assessment.id);
    const dependencies = assessment.dependencies ?? [
      { id: offerVersion.id, revision: offerVersion.versionKey, contentHash: offerVersion.revisionHash },
      ...assessment.ruleVersionIds.map((id) => {
        const rule = input.ruleVersions.find((candidate) => candidate.id === id);
        return rule ? { id, revision: rule.versionKey, contentHash: rule.revisionHash } : { id, revision: '', contentHash: '' };
      }),
      ...assessment.evidence.map((e) => ({ id: e.id, revision: '', contentHash: e.revisionHash })),
    ];
    return approvalMatches(assessment, dependencies, approval, now);
  });

  if (approved.length === 0) {
    return { applicability: 'needs_information', reason: 'no_approved_assessment', offerVersion, termsStatement: offerVersion.statement, findings: [] };
  }
  if (approved.length === 0) return { applicability: 'needs_information', reason: 'no_approved_assessment', offerVersion, termsStatement: offerVersion.statement, findings: [] };
  const byRuleScope = new Map<string, Array<{ assessment: PolicyAssessment; rule: VersionedPolicySource }>>();
  for (const assessment of approved) {
    if (!scopesMatch(offerVersion.applicability, assessment.applicability, context)) continue;
    for (const id of assessment.ruleVersionIds) {
      const rule = input.ruleVersions.find((candidate) => candidate.id === id && candidate.publicationState === 'published');
      if (!rule || !validApplicability(rule.applicability) || missingContext(rule.applicability, context)) continue;
      if (!applies(rule.applicability, context)) continue;
      const scope = assessment.applicability;
      const scopeKey = JSON.stringify({
        country: scope.country?.toUpperCase() ?? null,
        effectiveFrom: scope.effectiveFrom ?? null,
        effectiveTo: scope.effectiveTo ?? null,
        channel: scope.channel ?? null,
        customerKind: scope.customerKind ?? null,
      });
      const key = `${id}\n${scopeKey}`;
      const matches = byRuleScope.get(key) ?? [];
      matches.push({ assessment, rule });
      byRuleScope.set(key, matches);
    }
  }
  const conflictSignature = ({ assessment }: { assessment: PolicyAssessment }) => JSON.stringify({
    applicability: assessment.applicabilityState,
    terms: assessment.termsState,
    finding: assessment.findingState,
    termsStatement: assessment.termsStatement,
    productObservation: assessment.productObservation,
  });
  const conflicting = [...byRuleScope.values()].some((matches) => new Set(matches.map(conflictSignature)).size > 1);
  if (conflicting) return { applicability: 'ambiguous', reason: 'multiple_approved_assessments', offerVersion, findings: [] };
  const findings = [...byRuleScope.values()].flatMap((matches) => matches.slice(0, 1).map(({ assessment, rule }) => ({
    assessmentId: assessment.id,
    ruleVersionId: rule.id,
    applicability: assessment.applicabilityState,
    termsState: assessment.termsState,
    findingState: assessment.findingState,
    reviewedAt: assessment.reviewedAt,
    reviewExpiresAt: assessment.reviewExpiresAt,
    rule,
    evidence: assessment.evidence.map(({ id, revisionHash, publicExcerpt }) => ({ id, revisionHash, publicationState: 'published' as const, ...(publicExcerpt ? { publicExcerpt } : {}) })),
  })));
  if (findings.length === 0) {
    const missingRuleContext = approved.some((assessment) => assessment.ruleVersionIds.some((id) => {
      const rule = input.ruleVersions.find((candidate) => candidate.id === id);
      return !!rule && validApplicability(rule.applicability) && missingContext(rule.applicability, context);
    }));
    return { applicability: missingRuleContext ? 'needs_information' : 'not_applicable', reason: missingRuleContext ? 'missing_context' : 'no_matching_rule', offerVersion, findings: [] };
  }
  const assessment = approved.find((candidate) => candidate.id === findings[0]?.assessmentId)!;
  const isTruncated = findings.length > 500;
  return {
    applicability: isTruncated ? 'needs_information' : findings.some((finding) => finding.applicability === 'ambiguous') ? 'ambiguous'
      : findings.some((finding) => finding.applicability === 'needs_information') ? 'needs_information'
      : findings.some((finding) => finding.applicability === 'applicable') ? 'applicable' : 'not_applicable',
    ...(isTruncated ? { reason: 'result_limit_exceeded' as const, truncated: true } : {}),
    offerVersion,
    termsStatement: assessment.termsStatement,
    productObservation: assessment.productObservation,
    findings: findings.slice(0, 500).sort((a, b) => a.ruleVersionId.localeCompare(b.ruleVersionId) || a.assessmentId.localeCompare(b.assessmentId)),
  };
}

export async function sha256Json(value: unknown): Promise<string> {
  const canonical = canonicalJson(value);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
