import { getEmDashCollection, getEmDashReferences, getRequestContext, runWithContext } from 'emdash';
import { PluginStorageRepository } from 'emdash/internal/plugins/host';
import { withEmDashRuntime } from 'emdash/middleware';
import { resolvePolicyPlan, sha256Json, type PolicyAssessment, type PolicyContext, type PolicyGraphInput, type VersionedPolicySource } from './policy-graph.js';
import type { ProtectedApproval } from './policy-graph.js';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const MAX_ASSESSMENTS = 500;
const MAX_RULES_PER_ASSESSMENT = 50;
const MAX_EVIDENCE_PER_ASSESSMENT = 50;

interface CmsEntry {
  id: string;
  data: Record<string, unknown>;
  status?: string;
}

interface RefEntry extends CmsEntry {}

export interface PublishedPlanSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

export function withPublicContext<T>(read: () => Promise<T>): Promise<T> {
  const current = getRequestContext();
  if (!current) return read();
  const { preview: _preview, ...publicContext } = current;
  return runWithContext({ ...publicContext, editMode: false }, read);
}

function targetId(value: RefEntry | undefined): string | undefined {
  return value ? entryId(value) : undefined;
}

/** EmDash query `id` may be the slug; `data.id` is the stable database ULID. */
export function entryId(value: CmsEntry): string {
  return typeof value.data?.id === 'string' && value.data.id ? value.data.id : value.id;
}

function entrySlug(value: CmsEntry): string | undefined {
  return typeof value.id === 'string' && value.id ? value.id : undefined;
}

function canonicalContent(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => ![
    'id', 'revision_hash', '_rev', 'slug', 'url', 'references', 'status', 'authorId', 'createdAt', 'updatedAt',
  ].includes(key)));
}

function canonicalAssessmentData(data: Record<string, unknown>): Record<string, unknown> {
  const content = canonicalContent(data);
  delete content.offer_version;
  delete content.rule_versions;
  delete content.evidence;
  return content;
}

function asString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function nullableString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value ? value : null;
}

function listedReferences(entry: CmsEntry, field: string): RefEntry[] {
  const references = (entry as CmsEntry & { references?: Record<string, { entries?: RefEntry[] }> }).references;
  return references?.[field]?.entries ?? [];
}

async function publishedEntries(collection: string): Promise<CmsEntry[]> {
  return withPublicContext(async () => {
    const all: CmsEntry[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await getEmDashCollection(collection, { status: 'published', limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
      if (result.error) throw result.error;
      all.push(...(result.entries as CmsEntry[]));
      if (!result.hasMore) return all;
      if (!result.nextCursor || result.nextCursor === cursor) throw new Error(`Published ${collection} pagination returned an invalid cursor.`);
      cursor = result.nextCursor;
    }
    throw new Error(`Published ${collection} exceeded the ${MAX_PAGES}-page read bound.`);
  });
}

async function references(entry: CmsEntry, collection: string, field: string): Promise<RefEntry[]> {
  return withPublicContext(async () => {
    const all: RefEntry[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await getEmDashReferences(collection, entryId(entry), field, { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
      if (result.error) throw result.error;
      all.push(...(result.entries as RefEntry[]));
      if (!result.nextCursor) return all;
      if (result.nextCursor === cursor) throw new Error(`Published ${collection}.${field} pagination returned an invalid cursor.`);
      cursor = result.nextCursor;
    }
    throw new Error(`Published ${collection}.${field} exceeded the ${MAX_PAGES}-page read bound.`);
  });
}

async function mapSource(entry: CmsEntry, data: Record<string, unknown>): Promise<VersionedPolicySource> {
  return {
    id: entryId(entry),
    versionKey: asString(data, 'version_key'),
    revisionHash: await sha256Json(sourceHashData(data)),
    publicationState: 'published',
    applicability: {
      country: nullableString(data, 'applicability_country'),
      effectiveFrom: nullableString(data, 'effective_from'),
      effectiveTo: nullableString(data, 'effective_to'),
      channel: nullableString(data, 'applicability_channel'),
      customerKind: nullableString(data, 'applicability_customer') as 'consumer' | 'business' | null,
    },
    sourceUrl: asString(data, 'source_url'),
    sourcePublishedAt: nullableString(data, 'source_published_at'),
    observedAt: asString(data, 'observed_at'),
    statement: asString(data, 'terms_statement') || asString(data, 'statement'),
  };
}

function sourceHashData(data: Record<string, unknown>): Record<string, unknown> {
  return canonicalContent(data);
}

function isUsableSource(source: VersionedPolicySource): boolean {
  return !!source.id && !!source.versionKey && /^[a-f0-9]{64}$/i.test(source.revisionHash)
    && !!source.sourceUrl && !!source.observedAt && !!source.statement;
}

export async function loadPublishedPlanGraph(planId: string): Promise<PolicyGraphInput> {
  return withPublicContext(async () => {
    const plans = await publishedEntries('policy_plans');
    const plan = plans.find((entry) => entrySlug(entry) === planId || entry.data.stable_key === planId || entryId(entry) === planId);
    if (!plan) return { offerVersions: [], ruleVersions: [], assessments: [], now: new Date().toISOString() };

    const offers = await publishedEntries('policy_offers');
    const planOffers: CmsEntry[] = [];
    for (const offer of offers) {
      const planRefs = await references(offer, 'policy_offers', 'plan');
      if (planRefs.some((ref) => targetId(ref) === entryId(plan))) planOffers.push(offer);
    }
    const offerIds = new Set(planOffers.map(entryId));
    const versionEntries = await publishedEntries('policy_offer_versions');
    const offerVersions: VersionedPolicySource[] = [];
    for (const version of versionEntries) {
      const parents = await references(version, 'policy_offer_versions', 'offer');
      if (!parents.some((parent) => offerIds.has(targetId(parent) ?? ''))) continue;
      const source = await mapSource(version, version.data);
      if (isUsableSource(source)) offerVersions.push(source);
    }

    const ruleEntries = await publishedEntries('policy_rule_versions');
    const ruleVersions: VersionedPolicySource[] = [];
    for (const entry of ruleEntries) {
      const source = await mapSource(entry, entry.data);
      if (isUsableSource(source)) ruleVersions.push(source);
    }
    const assessmentEntries = await publishedEntries('policy_assessments');
    const assessments: PolicyAssessment[] = [];
    for (const entry of assessmentEntries) {
      if (assessments.length >= MAX_ASSESSMENTS) break;
      const data = entry.data;
      const offerRefs = await references(entry, 'policy_assessments', 'offer_version');
      if (!offerRefs.some((ref) => offerVersions.some((offer) => offer.id === targetId(ref)))) continue;
      const ruleRefs = await references(entry, 'policy_assessments', 'rule_versions');
      const evidenceRefs = await references(entry, 'policy_assessments', 'evidence');
      if (offerRefs.length !== 1 || ruleRefs.length === 0 || ruleRefs.length > MAX_RULES_PER_ASSESSMENT || evidenceRefs.length === 0 || evidenceRefs.length > MAX_EVIDENCE_PER_ASSESSMENT) continue;
      const selected = {
        offer_version: [...new Set(offerRefs.map((ref) => targetId(ref) ?? ''))].sort(),
        rule_versions: [...new Set(ruleRefs.map((ref) => targetId(ref) ?? ''))].sort(),
        evidence: [...new Set(evidenceRefs.map((ref) => targetId(ref) ?? ''))].sort(),
      };
      const dependencies = [
        ...offerRefs.map((ref) => ({ id: targetId(ref) ?? '', revision: asString(ref.data, 'version_key'), contentHash: '' })),
        ...ruleRefs.map((ref) => ({ id: targetId(ref) ?? '', revision: asString(ref.data, 'version_key'), contentHash: '' })),
        ...evidenceRefs.map((ref) => ({ id: targetId(ref) ?? '', revision: asString(ref.data, 'stable_key'), contentHash: '' })),
      ];
      for (const dep of dependencies) {
        const referenced = [...offerRefs, ...ruleRefs, ...evidenceRefs].find((ref) => targetId(ref) === dep.id);
        if (!referenced) throw new Error('Assessment dependency reference disappeared during publication read.');
        dep.contentHash = await sha256Json(canonicalContent(referenced.data));
      }
      dependencies.sort((a, b) => a.id.localeCompare(b.id));
      const assessmentFieldsHash = await sha256Json({ data: canonicalAssessmentData(data), selected });
      const publicEvidence = await Promise.all(evidenceRefs.map(async (evidence) => ({
        id: targetId(evidence) ?? '',
        revisionHash: await sha256Json(canonicalContent(evidence.data)),
        publicationState: 'published' as const,
        ...(typeof evidence.data.public_excerpt === 'string' ? { publicExcerpt: evidence.data.public_excerpt } : {}),
      })));
      assessments.push({
        id: entryId(entry),
        revision: assessmentFieldsHash,
        revisionHash: assessmentFieldsHash,
        publicationState: 'published',
        offerVersionId: targetId(offerRefs[0]) ?? '',
        ruleVersionIds: ruleRefs.map((rule) => targetId(rule) ?? ''),
        dependencies,
        evidence: publicEvidence,
        applicability: {
          country: nullableString(data, 'applicability_country'),
          effectiveFrom: nullableString(data, 'applicability_contract_from'),
          effectiveTo: nullableString(data, 'applicability_contract_to'),
          channel: nullableString(data, 'applicability_channel'),
          customerKind: nullableString(data, 'applicability_customer') as 'consumer' | 'business' | null,
        },
        termsStatement: asString(data, 'terms_statement'),
        productObservation: asString(data, 'product_observation'),
        applicabilityState: asString(data, 'applicability_state') as PolicyAssessment['applicabilityState'],
        termsState: asString(data, 'terms_state') as PolicyAssessment['termsState'],
        findingState: asString(data, 'finding_state') as PolicyAssessment['findingState'],
        reviewedAt: asString(data, 'reviewed_at'),
        reviewExpiresAt: asString(data, 'review_expires_at'),
      });
    }
    const approvals = await readProtectedApprovals(assessments.map((assessment) => assessment.id));
    return { offerVersions, ruleVersions, assessments, approvals, now: new Date().toISOString() };
  });
}

export async function loadPublishedPlanSummary(planId: string): Promise<PublishedPlanSummary | null> {
  const plans = await publishedEntries('policy_plans');
  const plan = plans.find((entry) => entrySlug(entry) === planId || entry.data.stable_key === planId || entryId(entry) === planId);
  if (!plan) return null;
  return {
    id: entryId(plan), slug: entrySlug(plan) ?? String(plan.data.stable_key ?? entryId(plan)),
    title: asString(plan.data, 'title') || asString(plan.data, 'name') || 'Untitled plan',
    summary: asString(plan.data, 'summary'),
  };
}

/** Bounded catalog reader for existing provider/brand pages; returns only real published plan records. */
export async function readPublishedPlanSummaries(providerKey: string, limit = 12): Promise<Array<PublishedPlanSummary & { href: string }>> {
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 24)) : 12;
  const plans = await publishedEntries('policy_plans');
  const summaries: Array<PublishedPlanSummary & { href: string }> = [];
  for (const plan of plans) {
    const serviceRefs = await references(plan, 'policy_plans', 'service');
    let belongs = false;
    for (const service of serviceRefs) {
      const providerRefs = await references(service, 'provider_services', 'provider');
      if (providerRefs.some((provider) => provider.data.stable_key === providerKey || provider.id === providerKey || entryId(provider) === providerKey)) {
        belongs = true;
        break;
      }
    }
    if (!belongs) continue;
    const slug = entrySlug(plan) ?? String(plan.data.stable_key ?? entryId(plan));
    summaries.push({
      id: entryId(plan), slug,
      title: asString(plan.data, 'title') || asString(plan.data, 'name') || 'Untitled plan',
      summary: asString(plan.data, 'summary'), href: `/wiki/plans/${encodeURIComponent(slug)}`,
    });
    if (summaries.length >= safeLimit) break;
  }
  return summaries;
}

export async function resolvePublishedPlanProjection(planId: string, context: PolicyContext) {
  const graph = await loadPublishedPlanGraph(planId);
  const result = resolvePolicyPlan(graph, context);
  return { schemaVersion: 1 as const, plan: planId, context, ...result };
}

const APPROVAL_PLUGIN_ID = 'cmlab-policy-graph-review';

/** Reads only protected plugin approval storage; request data can never supply approvals. */
export async function readProtectedApprovals(assessmentIds: string[]): Promise<ProtectedApproval[]> {
  const boundedIds = [...new Set(assessmentIds.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 500);
  if (boundedIds.length === 0) return [];
  return withEmDashRuntime(async (runtime) => {
    const repository = new PluginStorageRepository<ProtectedApproval>(runtime.db, APPROVAL_PLUGIN_ID, 'approvals', ['assessmentId']);
    const records = await Promise.all(boundedIds.map((id) => repository.get(id)));
    return records.filter((record): record is ProtectedApproval => !!record
      && typeof record.assessmentId === 'string'
      && typeof record.assessmentRevision === 'string'
      && typeof record.assessmentHash === 'string'
      && typeof record.reviewerId === 'string'
      && typeof record.approvedAt === 'string'
      && typeof record.expiresAt === 'string'
      && Array.isArray(record.dependencies)
      && record.dependencies.every((item) => item && typeof item.id === 'string' && typeof item.revision === 'string' && typeof item.contentHash === 'string'));
  });
}

export function parsePolicyContext(params: URLSearchParams): PolicyContext {
  for (const key of ['country', 'contractDate', 'channel', 'customerKind']) {
    if (params.getAll(key).length > 1) throw new TypeError(`${key} may be supplied only once.`);
  }
  const country = params.get('country')?.trim().toUpperCase();
  const contractDate = params.get('contractDate')?.trim();
  const channel = params.get('channel')?.trim();
  const customerKind = params.get('customerKind')?.trim();
  if (country && !/^[A-Z]{2}$/.test(country)) throw new TypeError('country must be a two-letter country code.');
  if (contractDate && !validIsoDateOrDateTime(contractDate)) throw new TypeError('contractDate must be a valid ISO date or datetime.');
  if (channel && !['web', 'app', 'phone', 'in_person', 'other'].includes(channel)) throw new TypeError('channel is not supported.');
  if (customerKind && !['consumer', 'business'].includes(customerKind)) throw new TypeError('customerKind must be consumer or business.');
  return {
    ...(country ? { country } : {}),
    ...(contractDate ? { contractDate } : {}),
    ...(channel ? { channel } : {}),
    ...(customerKind ? { customerKind: customerKind as 'consumer' | 'business' } : {}),
  };
}

function validIsoDateOrDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2}))?$/.test(value)) return false;
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isFinite(Date.parse(value)) && date.toISOString().slice(0, 10) === datePart;
}
