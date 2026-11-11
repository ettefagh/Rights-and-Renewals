export interface PublishedPlanSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

export type PlanApplicabilityState = 'applicable' | 'not_applicable' | 'needs_information' | 'ambiguous';
export type PlanTermsState = 'found' | 'not_found' | 'unclear' | 'not_assessed';
export type PlanFindingState =
  | 'no_issue_identified'
  | 'missing_required_disclosure'
  | 'implementation_gap'
  | 'possible_conflict'
  | 'unresolved'
  | 'not_assessed';

export interface PolicyPlanContext {
  country?: string;
  contractDate?: string;
  channel?: 'web' | 'app' | 'phone' | 'in_person' | 'other';
}

export interface PublishedPlanFinding {
  assessmentId: string;
  ruleVersionId: string;
  applicability: PlanApplicabilityState;
  termsState: PlanTermsState;
  findingState: PlanFindingState;
  reviewedAt: string;
  reviewExpiresAt: string;
  rule: { id: string; statement: string; sourceUrl: string };
  evidence: Array<{ id: string; revisionHash: string; publicationState: 'published'; publicExcerpt?: string }>;
}

export interface PublishedPlanProjection {
  schemaVersion: 1;
  plan: string;
  context: PolicyPlanContext;
  applicability: PlanApplicabilityState;
  reason?: string;
  truncated?: boolean;
  offerVersion?: { id: string; versionKey: string; statement: string };
  termsStatement?: string;
  productObservation?: string;
  findings: PublishedPlanFinding[];
}

export interface PlanLookupOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

const MAX_BODY_BYTES = 512_000;
const MAX_PLANS = 50;
const MAX_FINDINGS = 500;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const APPLICABILITY = new Set<PlanApplicabilityState>(['applicable', 'not_applicable', 'needs_information', 'ambiguous']);
const TERMS = new Set<PlanTermsState>(['found', 'not_found', 'unclear', 'not_assessed']);
const FINDING = new Set<PlanFindingState>([
  'no_issue_identified', 'missing_required_disclosure', 'implementation_gap', 'possible_conflict', 'unresolved', 'not_assessed',
]);

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  const keys = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => keys.has(key));
}

function text(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || !!value.trim());
}

function timestamp(value: unknown): value is string {
  return text(value, 80) && value.includes('T') && Number.isFinite(Date.parse(value));
}

function safeSourceUrl(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function planEndpoint(value: string | null): URL {
  if (!value) throw new Error('Published plan endpoint is not configured');
  let endpoint: URL;
  try { endpoint = new URL(value); }
  catch { throw new Error('Published plan endpoint is invalid'); }
  const localHost = endpoint.hostname === 'localhost' || endpoint.hostname.endsWith('.localhost')
    || endpoint.hostname === '127.0.0.1' || endpoint.hostname === '[::1]';
  if ((endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && localHost))
    || endpoint.username || endpoint.password || endpoint.pathname !== '/api/emdash/plans'
    || endpoint.search || endpoint.hash) throw new Error('Published plan endpoint is invalid');
  return endpoint;
}

function validSummary(value: unknown): value is PublishedPlanSummary {
  return record(value) && hasExactKeys(value, ['id', 'slug', 'title', 'summary'])
    && text(value.id, 160) && ID.test(value.id)
    && text(value.slug, 160) && ID.test(value.slug)
    && text(value.title, 240) && text(value.summary, 1600, true);
}

function validPlanCatalog(value: unknown): value is { schemaVersion: 1; items: PublishedPlanSummary[] } {
  return record(value) && hasExactKeys(value, ['schemaVersion', 'items']) && value.schemaVersion === 1
    && Array.isArray(value.items) && value.items.length <= MAX_PLANS && value.items.every(validSummary)
    && new Set(value.items.map((item) => item.id)).size === value.items.length;
}

function validContext(value: unknown): value is PolicyPlanContext {
  if (!record(value) || !hasExactKeys(value, [], ['country', 'contractDate', 'channel'])) return false;
  if (value.country !== undefined && (typeof value.country !== 'string' || !/^[A-Z]{2}$/.test(value.country))) return false;
  if (value.contractDate !== undefined && (typeof value.contractDate !== 'string' || !validDate(value.contractDate))) return false;
  return value.channel === undefined || ['web', 'app', 'phone', 'in_person', 'other'].includes(String(value.channel));
}

function sameContext(left: PolicyPlanContext, right: PolicyPlanContext): boolean {
  return ['country', 'contractDate', 'channel'].every((key) => left[key as keyof PolicyPlanContext] === right[key as keyof PolicyPlanContext]);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2}))?$/.test(value)) return false;
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isFinite(Date.parse(value)) && date.toISOString().slice(0, 10) === datePart;
}

function validRule(value: unknown): value is PublishedPlanFinding['rule'] {
  return record(value) && hasExactKeys(value, ['id', 'versionKey', 'revisionHash', 'publicationState', 'applicability', 'sourceUrl', 'observedAt', 'statement'], ['sourcePublishedAt'])
    && text(value.id, 160) && ID.test(value.id)
    && text(value.versionKey, 160)
    && typeof value.revisionHash === 'string' && /^[a-f0-9]{64}$/i.test(value.revisionHash)
    && value.publicationState === 'published'
    && record(value.applicability)
    && safeSourceUrl(value.sourceUrl)
    && timestamp(value.observedAt)
    && (value.sourcePublishedAt === undefined || value.sourcePublishedAt === null || timestamp(value.sourcePublishedAt))
    && text(value.statement, 4000, true);
}

function validEvidence(value: unknown): value is PublishedPlanFinding['evidence'][number] {
  return record(value) && hasExactKeys(value, ['id', 'revisionHash', 'publicationState'], ['publicExcerpt'])
    && text(value.id, 160) && ID.test(value.id)
    && typeof value.revisionHash === 'string' && /^[a-f0-9]{64}$/i.test(value.revisionHash)
    && value.publicationState === 'published'
    && (value.publicExcerpt === undefined || text(value.publicExcerpt, 1000, true));
}

function validFinding(value: unknown, now: number): value is PublishedPlanFinding {
  if (!record(value) || !hasExactKeys(value, ['assessmentId', 'ruleVersionId', 'applicability', 'termsState', 'findingState', 'reviewedAt', 'reviewExpiresAt', 'rule', 'evidence'])) return false;
  return text(value.assessmentId, 160) && ID.test(value.assessmentId)
    && text(value.ruleVersionId, 160) && ID.test(value.ruleVersionId)
    && APPLICABILITY.has(value.applicability as PlanApplicabilityState)
    && TERMS.has(value.termsState as PlanTermsState)
    && FINDING.has(value.findingState as PlanFindingState)
    && timestamp(value.reviewedAt) && Date.parse(value.reviewedAt) <= now
    && timestamp(value.reviewExpiresAt) && Date.parse(value.reviewExpiresAt) > now
    && validRule(value.rule)
    && value.rule.id === value.ruleVersionId
    && Array.isArray(value.evidence) && value.evidence.length > 0 && value.evidence.length <= 50 && value.evidence.every(validEvidence);
}

function validProjection(value: unknown, requestedPlanId: string, expectedContext: PolicyPlanContext, now: number): value is PublishedPlanProjection {
  if (!record(value) || !hasExactKeys(value, ['schemaVersion', 'plan', 'context', 'applicability', 'findings'], ['reason', 'truncated', 'offerVersion', 'termsStatement', 'productObservation'])) return false;
  if (value.schemaVersion !== 1 || value.plan !== requestedPlanId || !validContext(value.context)
    || !sameContext(value.context, expectedContext)
    || !APPLICABILITY.has(value.applicability as PlanApplicabilityState)
    || (value.reason !== undefined && !text(value.reason, 80))
    || (value.truncated !== undefined && typeof value.truncated !== 'boolean')
    || (value.termsStatement !== undefined && !text(value.termsStatement, 4000, true))
    || (value.productObservation !== undefined && !text(value.productObservation, 4000, true))) return false;
  if (value.offerVersion !== undefined) {
    const offer = value.offerVersion;
    if (!record(offer) || !hasExactKeys(offer, ['id', 'versionKey', 'revisionHash', 'publicationState', 'applicability', 'sourceUrl', 'observedAt', 'statement'], ['sourcePublishedAt'])
      || !text(offer.id, 160) || !ID.test(offer.id) || !text(offer.versionKey, 160)
      || typeof offer.revisionHash !== 'string' || !/^[a-f0-9]{64}$/i.test(offer.revisionHash)
      || offer.publicationState !== 'published' || !record(offer.applicability) || !safeSourceUrl(offer.sourceUrl)
      || !timestamp(offer.observedAt) || !text(offer.statement, 4000, true)) return false;
  }
  return Array.isArray(value.findings) && value.findings.length <= MAX_FINDINGS && value.findings.every((finding) => validFinding(finding, now));
}

async function readJson(url: string, options: PlanLookupOptions = {}): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Published plan request failed (${response.status})`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BODY_BYTES) throw new Error('Published plan response is too large');
    const reader = response.body?.getReader();
    let body = '';
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new Error('Published plan response is too large');
          }
          body += decoder.decode(value, { stream: true });
          if (body.length > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new Error('Published plan response is too large');
          }
        }
        body += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    } else {
      body = await response.text();
    }
    if (body.length > MAX_BODY_BYTES) throw new Error('Published plan response is too large');
    try { return JSON.parse(body) as unknown; }
    catch { throw new Error('Published plan response is not valid JSON'); }
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublishedPlans(url: string | null, options: PlanLookupOptions = {}): Promise<PublishedPlanSummary[]> {
  const endpoint = planEndpoint(url);
  endpoint.searchParams.set('limit', String(MAX_PLANS));
  const value = await readJson(endpoint.toString(), options);
  if (!validPlanCatalog(value)) throw new Error('Invalid published plan catalog');
  return value.items;
}

export async function fetchPublishedPlanProjection(
  url: string | null,
  planId: string,
  context: PolicyPlanContext = {},
  options: PlanLookupOptions = {},
): Promise<PublishedPlanProjection> {
  if (!text(planId, 160) || !ID.test(planId)) throw new Error('A valid published plan identifier is required');
  if (!validContext(context)) throw new Error('Invalid published plan lookup context');
  const endpoint = planEndpoint(url);
  endpoint.searchParams.set('plan', planId);
  if (context.country) endpoint.searchParams.set('country', context.country);
  if (context.contractDate) endpoint.searchParams.set('contractDate', context.contractDate);
  if (context.channel) endpoint.searchParams.set('channel', context.channel);
  const now = Date.now();
  const value = await readJson(endpoint.toString(), options);
  if (!validProjection(value, planId, context, now)) throw new Error('Invalid or out-of-date published plan projection');
  return value;
}
