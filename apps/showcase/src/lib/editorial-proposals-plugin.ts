import { definePlugin } from 'emdash';
import { z } from 'astro/zod';
import {
  EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  PROPOSAL_TARGET_ALLOWLIST,
  createEditorialProposalService,
  editorialProposalInputSchema,
  ProposalConflictError,
  type EditorialProposalHost,
  type ProposalDraft,
} from './editorial-proposals';
import { proposalQueueStorage } from '../../scripts/proposal-catalog.mjs';

type StorageRecord = {
  ownerId: string;
  createdAt: string;
  proposalState: 'pending';
  targetRevision: string | null;
  bodyDigest: string;
  payloadDigest: string;
  draft: ProposalDraft;
};

type StorageCollection = {
  get(id: string): Promise<StorageRecord | null>;
  compareAndSet(id: string, expectedRevision: string | null, data: StorageRecord): Promise<{ applied: boolean }>;
  query(options?: { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'>; limit?: number }): Promise<{ items: Array<{ id: string; data: StorageRecord }> }>;
};

type ProposalRuntime = {
  proposals?: StorageCollection;
  content?: {
    get(collection: string, id: string): Promise<{
      id: string; status: string; authorId?: string | null; liveRevisionId?: string | null;
      draftRevisionId?: string | null; scheduledAt?: string | null;
    } | null>;
  };
};

const digest = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const stablePayload = (value: z.infer<typeof editorialProposalInputSchema>) => JSON.stringify({
  contractVersion: value.contractVersion, title: value.title, body: value.body, kind: value.kind,
  targetCollection: value.targetCollection, targetId: value.targetId ?? null,
  expectedRevision: value.expectedRevision ?? null, idempotencyKey: value.idempotencyKey,
});
const keyFor = async (actorId: string, idempotencyKey: string) => `proposal-${await digest(`${actorId}\n${idempotencyKey}`)}`;

/** Trusted host adapter backed by EmDash's namespaced plugin storage and content read API. */
export function createEmDashEditorialProposalHost(runtime: ProposalRuntime): EditorialProposalHost {
  if (!runtime.proposals) throw new Error('EmDash proposal storage is unavailable');
  const storage = runtime.proposals;
  return {
    async createOwnedDraft({ actorId, data, idempotencyKey }) {
      const parsed = editorialProposalInputSchema.safeParse({
        contractVersion: EDITORIAL_PROPOSAL_CONTRACT_VERSION,
        title: data.title, body: data.body, kind: data.proposal_kind,
        targetCollection: data.target_collection, targetId: data.target_id ?? undefined,
        expectedRevision: data.expected_revision ?? undefined, idempotencyKey,
      });
      if (!parsed.success) throw new ProposalConflictError('Invalid normalized proposal');
      const proposal = parsed.data;
      let targetRevision: string | null = null;
      if (proposal.kind === 'revision_suggestion') {
        if (!runtime.content || !proposal.targetId || !proposal.expectedRevision) throw new ProposalConflictError('Target state unavailable');
        const target = await runtime.content.get(proposal.targetCollection, proposal.targetId);
        if (!target || target.scheduledAt || !['published', 'draft'].includes(target.status)) throw new ProposalConflictError('Target is missing, locked or stale');
        if (target.status === 'draft' && target.authorId !== actorId) throw new ProposalConflictError('Target is not owned by this contributor');
        targetRevision = target.status === 'published' ? target.liveRevisionId ?? null : target.draftRevisionId ?? null;
        if (!targetRevision || targetRevision !== proposal.expectedRevision) throw new ProposalConflictError('Target revision conflict');
      }
      const id = await keyFor(actorId, idempotencyKey);
      const payloadDigest = await digest(stablePayload(proposal));
      const bodyDigest = await digest(proposal.body);
      const draft: ProposalDraft = {
        id, ownerId: actorId, status: 'draft', revision: payloadDigest,
        proposal,
      };
      const record: StorageRecord = {
        ownerId: actorId, createdAt: new Date().toISOString(), proposalState: 'pending',
        targetRevision, bodyDigest, payloadDigest, draft,
      };
      const write = await storage.compareAndSet(id, null, record);
      if (write.applied) return { kind: 'created', draft };
      const existing = await storage.get(id);
      if (!existing || existing.ownerId !== actorId || existing.payloadDigest !== payloadDigest) {
        throw new ProposalConflictError('Idempotency key already belongs to a different proposal');
      }
      return { kind: 'replayed', draft: existing.draft };
    },
    async listOwnDrafts(actorId, limit) {
      const result = await storage.query({ where: { ownerId: actorId, proposalState: 'pending' }, orderBy: { createdAt: 'desc' }, limit: Math.min(50, limit) });
      return result.items.filter(({ data }) => data.ownerId === actorId).map(({ data }) => data.draft);
    },
    async listReviewerDrafts(limit) {
      const result = await storage.query({ where: { proposalState: 'pending' }, orderBy: { createdAt: 'desc' }, limit: Math.min(100, limit) });
      return result.items.filter(({ data }) => data.proposalState === 'pending').map(({ data }) => data.draft);
    },
  };
}

const listInput = z.object({ limit: z.number().int().min(1).max(100).optional() }).strict();

/** The factory intentionally accepts no injected host functions; Astro JSON options cannot carry trusted adapters. */
export function createPlugin(_options: Record<string, never> = {}) {
  const proposeOutput = z.object({
    ok: z.boolean(), code: z.string().optional(), kind: z.enum(['created', 'replayed']).optional(),
    draftId: z.string().optional(), revision: z.string().optional(), status: z.literal('draft').optional(),
  });
  return definePlugin({
    id: 'cmlab-editorial-proposals',
    version: EDITORIAL_PROPOSAL_CONTRACT_VERSION,
    capabilities: ['hooks.content-policy:register', 'content:read'],
    storage: proposalQueueStorage,
    hooks: {
      'content:beforePublish': async ({ collection }) => collection === 'editorial_proposals'
        ? { cancel: true, reason: 'Editorial proposals require human review and cannot be published.' } : undefined,
      'content:beforeSchedule': async ({ collection }) => collection === 'editorial_proposals'
        ? { cancel: true, reason: 'Editorial proposals cannot be scheduled.' } : undefined,
    },
    routes: {
      proposeDraft: {
        input: editorialProposalInputSchema,
        request: { body: 'json', maxBytes: 16000 },
        permission: 'content:create',
        handler: async ({ input, user, ...runtime }) => {
          const service = createEditorialProposalService(createEmDashEditorialProposalHost(runtime));
          const result = await service.propose(user ? { id: user.id, role: user.role } : undefined, input);
          if (!result.ok) return { ok: false, code: result.code };
          return { ok: true, kind: result.kind, draftId: result.draft.id, revision: result.draft.revision, status: 'draft' as const };
        },
      },
      listOwnDrafts: {
        input: listInput,
        request: { body: 'json', maxBytes: 256 },
        permission: 'content:create',
        handler: async ({ input, user, ...runtime }) => {
          if (!user) return { items: [] };
          const service = createEditorialProposalService(createEmDashEditorialProposalHost(runtime));
          return { items: await service.listOwn({ id: user.id, role: user.role }) };
        },
      },
      listReviewerDrafts: {
        input: listInput,
        request: { body: 'json', maxBytes: 256 },
        permission: 'content:read',
        handler: async ({ input, ...runtime }) => {
          const service = createEditorialProposalService(createEmDashEditorialProposalHost(runtime));
          return { items: await service.listForReviewer(input.limit ?? 50) };
        },
      },
    },
    mcp: {
      tools: {
        propose_draft: {
          description: 'Submit a bounded editorial proposal as an owned, private queue record for human review. Cannot approve, publish, schedule, or edit existing CMS content.',
          route: 'proposeDraft', input: editorialProposalInputSchema, output: proposeOutput, destructive: false,
        },
      },
    },
  });
}

export const editorialProposalPluginDescriptor = createPlugin();
export default createPlugin;
