import { definePlugin, getEmDashReferences, getRequestContext, runWithContext } from 'emdash';
import type { ContentHookEvent, ContentPolicyEvent, PluginContext, PluginDefinition } from 'emdash';
import { z } from 'astro/zod';
import type { ProtectedApproval } from './policy-graph.js';
import { sha256Json } from './policy-graph.js';

const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const REVIEWER_ROLE_LEVELS = new Set([40, 50]);
const REFERENCE_FIELDS = ['offer_version', 'rule_versions', 'evidence'] as const;
const REFERENCE_COLLECTIONS = {
  offer_version: 'policy_offer_versions',
  rule_versions: 'policy_rule_versions',
  evidence: 'policy_evidence',
} as const;
const IMMUTABLE_VERSION_COLLECTIONS = new Set(['policy_offer_versions', 'policy_rule_versions', 'policy_evidence']);
const REVIEWED_COLLECTIONS = new Set(['policy_assessments', ...IMMUTABLE_VERSION_COLLECTIONS]);
const approvalInputSchema = z.object({
  assessmentId: z.string().min(1).max(128),
  expectedRevision: z.string().min(1).max(128),
  expectedApprovalRevision: z.string().min(1).max(128).nullable(),
});

interface DependencySnapshot {
  id: string;
  revision: string;
  contentHash: string;
}

interface ReviewSourceSnapshot extends DependencySnapshot {
  collection: string;
  title: string;
  sourceUrl: string;
  statement: string;
}

interface ApprovalRecord extends ProtectedApproval {
  dependencies: DependencySnapshot[];
  assessmentFieldsHash: string;
  sourceRevision: string;
  auditId: string;
}

interface ContentVersion {
  item: {
    id: string;
    status: string;
    publishedAt?: string | null;
    liveRevisionId?: string | null;
    authorId?: string | null;
    data: Record<string, unknown>;
  };
  _rev: string;
}

function reject(reason: string) {
  return { cancel: true as const, reason };
}

function isStrictTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

async function gateVersionEdit(event: ContentHookEvent, ctx: PluginContext) {
  if (!IMMUTABLE_VERSION_COLLECTIONS.has(event.collection) || !event.id) return;
  try {
    if (!ctx.content?.getVersioned) throw new Error('EmDash content version API is unavailable.');
    const existing = await ctx.content.getVersioned(event.collection, event.id) as ContentVersion | null;
    if (!existing) throw new Error('The existing version could not be verified.');
    if (existing.item.status === 'published' || existing.item.liveRevisionId || existing.item.publishedAt) {
      throw new Error('Published policy versions and evidence are immutable; create a new version entry for changes.');
    }
  } catch (error) {
    throw new Error(error instanceof Error && error.message.includes('immutable')
      ? error.message
      : 'Version edit is blocked because its current EmDash revision cannot be verified.');
  }
}

async function relationIds(collection: string, id: string, field: string): Promise<string[]> {
  const current = getRequestContext();
  const { preview: _preview, ...base } = current ?? { editMode: false };
  const context = { ...base, editMode: true };
  return runWithContext(context, async () => {
    const ids: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 50; page += 1) {
      const result = await getEmDashReferences(collection, id, field, { limit: 100, ...(cursor ? { cursor } : {}) });
      if (result.error) throw result.error;
      ids.push(...result.entries.map((entry) => typeof entry.data?.id === 'string' ? entry.data.id : entry.id));
      if (!result.nextCursor) return ids;
      if (result.nextCursor === cursor) throw new Error('Relation pagination did not advance.');
      cursor = result.nextCursor;
    }
    throw new Error('Relation pagination exceeded the publication gate bound.');
  });
}

async function currentBinding(ctx: PluginContext, assessmentId: string) {
  if (!ctx.content?.getVersioned) throw new Error('EmDash content version API is unavailable.');
  const current = await ctx.content.getVersioned('policy_assessments', assessmentId) as ContentVersion | null;
  if (!current) throw new Error('Assessment no longer exists.');
  const reviewExpiresAt = current.item.data.review_expires_at;
  if (!isStrictTimestamp(reviewExpiresAt) || Date.parse(reviewExpiresAt) <= Date.now()) {
    throw new Error('Assessment review expiry is missing, invalid, or elapsed.');
  }

  const dependencies: DependencySnapshot[] = [];
  const sources: ReviewSourceSnapshot[] = [];
  const selected: Record<(typeof REFERENCE_FIELDS)[number], string[]> = {
    offer_version: [], rule_versions: [], evidence: [],
  };
  for (const field of REFERENCE_FIELDS) {
    const ids = await relationIds('policy_assessments', assessmentId, field);
    selected[field] = [...new Set(ids)].sort();
    for (const id of ids) {
      const collection = REFERENCE_COLLECTIONS[field];
      const version = await ctx.content.getVersioned(collection, id) as ContentVersion | null;
      if (!version || version.item.status !== 'published') throw new Error(`Referenced ${collection} entry ${id} is not published.`);
      const identity = version.item.data.version_key ?? version.item.data.stable_key;
      if (typeof identity !== 'string' || identity.trim() === '') throw new Error(`Referenced ${collection} entry ${id} has no stable version identity.`);
      const contentHash = await sha256Json(canonicalContent(version.item.data));
      dependencies.push({ id, revision: identity, contentHash });
      const data = version.item.data;
      const title = [data.title, data.label, data.version_key, data.stable_key, id]
        .find((value): value is string => typeof value === 'string' && value.trim() !== '')!;
      const statement = [data.terms_statement, data.statement, data.public_excerpt, data.excerpt]
        .find((value): value is string => typeof value === 'string' && value.trim() !== '') ?? '';
      sources.push({
        collection,
        id,
        title,
        revision: identity,
        sourceUrl: typeof data.source_url === 'string' ? data.source_url : '',
        statement,
        contentHash,
      });
    }
  }
  if (selected.offer_version.length !== 1 || selected.rule_versions.length === 0 || selected.evidence.length === 0) {
    throw new Error('Assessment must reference one offer version, at least one rule version, and published evidence.');
  }
  dependencies.sort((a, b) => a.id.localeCompare(b.id));
  const assessmentFieldsHash = await sha256Json({ data: canonicalAssessmentData(current.item.data), selected });
  return { current, dependencies, selected, assessmentFieldsHash, sources };
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

async function gateAssessmentPublish(
  event: ContentPolicyEvent,
  ctx: PluginContext,
) {
  if (IMMUTABLE_VERSION_COLLECTIONS.has(event.collection)) {
    const id = typeof event.content.id === 'string' ? event.content.id : '';
    if (!id || !ctx.content?.getVersioned) return reject('Version publication is blocked because its current EmDash revision cannot be verified.');
    try {
      const current = await ctx.content.getVersioned(event.collection, id) as ContentVersion | null;
      if (current?.item.status === 'published') return reject('Published policy versions and evidence are immutable; create a new version entry for changes.');
      // Fingerprints are derived from canonical content by readers and reviewers.
      // The optional revision_hash field is legacy/editor metadata, not authority.
      if (!current) return reject('Version publication is blocked because its current EmDash revision cannot be verified.');
    } catch {
      return reject('Version publication is blocked because its current EmDash revision cannot be verified.');
    }
    return;
  }
  if (event.collection !== 'policy_assessments') return;
  const id = typeof event.content.id === 'string' ? event.content.id : '';
  if (!id) return reject('Assessment publication is blocked because its EmDash content identity is missing.');
  try {
    const binding = await currentBinding(ctx, id);
    if (!ctx.storage.approvals) return reject('Assessment publication is blocked because protected review storage is unavailable.');
    const saved = await ctx.storage.approvals.get(id) as ApprovalRecord | null;
    if (!saved) return reject('Assessment publication is blocked until a reviewer approves this exact revision and its published dependencies.');
    const revisionMatches = saved.reviewerId !== binding.current.item.authorId
      && saved.sourceRevision === binding.current._rev
      && saved.assessmentRevision === binding.assessmentFieldsHash
      && saved.assessmentHash === binding.assessmentFieldsHash
      && saved.assessmentFieldsHash === binding.assessmentFieldsHash
      && JSON.stringify(saved.dependencies) === JSON.stringify(binding.dependencies)
      && saved.expiresAt > new Date().toISOString();
    if (!revisionMatches) return reject('Assessment approval is stale or does not match its current fields and dependency revisions. Submit it for human review again.');
  } catch (error) {
    ctx.log.error('Assessment publication gate could not verify its references.', { error: error instanceof Error ? error.message : 'unknown error' });
    return reject('Assessment publication is blocked because its current references and dependency revisions could not be verified.');
  }
}

const pluginDefinition = {
  id: 'cmlab-policy-graph-review',
  version: '1.0.0',
  capabilities: ['content:read', 'content:write', 'content:publish', 'hooks.content-policy:register'],
  storage: {
    approvals: { indexes: ['assessmentId'] },
    approval_audit: { indexes: ['assessmentId', 'reviewerId', 'approvedAt'] },
  },
  hooks: {
    'content:beforeSave': { handler: gateVersionEdit, errorPolicy: 'abort' },
    'content:beforePublish': gateAssessmentPublish,
    'content:beforeSchedule': async (event, ctx) => REVIEWED_COLLECTIONS.has(event.collection)
      ? reject(event.collection === 'policy_assessments'
        ? 'Policy assessments cannot be scheduled. Publish them only after an exact revision review.'
        : 'Policy versions and evidence cannot be scheduled. Publish them directly as immutable entries.')
      : undefined,
  },
  routes: {
    reviewAssessment: {
      permission: 'content:publish_any',
      methods: ['GET'],
      handler: async (route) => {
        if (!route.user?.id || !REVIEWER_ROLE_LEVELS.has(route.user.role)) throw new Error('An authenticated Editor or Admin reviewer is required.');
        const assessmentId = new URL(route.request.url).searchParams.get('assessmentId')?.trim();
        if (!assessmentId) throw new Error('assessmentId is required.');
        if (!route.storage.approvals) throw new Error('The protected review store is unavailable.');
        const binding = await currentBinding(route, assessmentId);
        const approval = await route.storage.approvals.getVersioned(assessmentId);
        return {
          assessmentId,
          expectedRevision: binding.current._rev,
          assessmentFieldsHash: binding.assessmentFieldsHash,
          assessment: binding.current.item.data,
          dependencies: binding.dependencies,
          sources: binding.sources,
          expectedApprovalRevision: approval?.revision ?? null,
          currentApproval: approval ? {
            reviewerId: (approval.value as ApprovalRecord).reviewerId,
            approvedAt: (approval.value as ApprovalRecord).approvedAt,
            expiresAt: (approval.value as ApprovalRecord).expiresAt,
            auditId: (approval.value as ApprovalRecord).auditId,
          } : null,
        };
      },
    },
    approveAssessment: {
      permission: 'content:publish_any',
      methods: ['POST'],
      input: approvalInputSchema,
      handler: async (route) => {
        const user = route.user;
        const parsed = approvalInputSchema.safeParse(route.input);
        if (!parsed.success) throw new Error('Assessment review input is invalid.');
        const input = parsed.data;
        if (!user?.id || !REVIEWER_ROLE_LEVELS.has(user.role)) throw new Error('An authenticated Editor or Admin reviewer is required.');
        const assessmentId = input.assessmentId;
        if (!route.content?.getVersioned || !route.storage.approvals || !route.storage.approval_audit) throw new Error('The review store is unavailable.');
        try {
          const binding = await currentBinding(route, assessmentId);
          if (binding.current._rev !== input.expectedRevision) throw new Error('Assessment revision changed; reload the review before approving.');
          if (binding.current.item.authorId === user.id) throw new Error('A proposal author cannot approve their own assessment.');
          const now = new Date();
          const approvalExpiry = Math.min(now.getTime() + REVIEW_WINDOW_MS, Date.parse(String(binding.current.item.data.review_expires_at)));
          const expiresAt = new Date(approvalExpiry).toISOString();
          const record: ApprovalRecord = {
            assessmentId,
            assessmentRevision: binding.assessmentFieldsHash,
            assessmentHash: binding.assessmentFieldsHash,
            assessmentFieldsHash: binding.assessmentFieldsHash,
            sourceRevision: binding.current._rev,
            auditId: crypto.randomUUID(),
            dependencies: binding.dependencies,
            reviewerId: user.id,
            approvedAt: now.toISOString(),
            expiresAt,
          };
          const audit = await route.storage.approval_audit.compareAndSet(record.auditId, null, record);
          if (!audit.applied) throw new Error('Could not create the immutable review audit record.');
          const result = await route.storage.approvals.compareAndSet(
            assessmentId,
            input.expectedApprovalRevision,
            record,
          );
          if (!result.applied) throw new Error('The review record changed; reload it before updating.');
          return { assessmentId, reviewerId: user.id, approvedAt: record.approvedAt, expiresAt };
        } catch (error) {
          route.log.error('Policy assessment review failed closed.', { error: error instanceof Error ? error.message : 'unknown error' });
          throw new Error('Review could not be completed because the assessment or one of its published dependencies changed or is unavailable.');
        }
      },
    },
  },
} satisfies PluginDefinition;

export function createPlugin(_options: Record<string, unknown> = {}) {
  return definePlugin(pluginDefinition);
}

export const policyGraphPlugin = createPlugin();

export const policyGraphPluginPublicationContract = {
  protectedApprovalStorage: 'EmDash plugin storage with compareAndSet expected revision',
  reviewRoute: 'authenticated content:publish_any permission, host-bound reviewer identity, author separation; human activity is not inferred',
  sensitiveCollection: 'policy_assessments',
  scheduledPublication: 'denied',
  limitation: 'Host wiring must register createPlugin as the native factory; public reads use the protected plugin storage repository.',
} as const;
