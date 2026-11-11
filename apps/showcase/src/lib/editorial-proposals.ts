import { z } from 'astro/zod';

export const EDITORIAL_PROPOSAL_CONTRACT_VERSION = '1.0.0' as const;
export const EDITORIAL_PROPOSALS_COLLECTION = {
  slug: 'editorial_proposals',
  label: 'Agent proposals',
  labelSingular: 'Agent proposal',
  hidden: false,
  supports: ['drafts', 'revisions'],
  fields: [
    { slug: 'title', label: 'Title', type: 'string', required: true, validation: { maxLength: 160 } },
    { slug: 'body', label: 'Proposed content', type: 'text', required: true, validation: { maxLength: 12000 } },
    { slug: 'proposal_kind', label: 'Proposal kind', type: 'string', required: true, validation: { maxLength: 40 } },
    { slug: 'target_collection', label: 'Target collection', type: 'string', required: true, validation: { maxLength: 80 } },
    { slug: 'target_id', label: 'Target entry', type: 'string', required: false, validation: { maxLength: 80 } },
    { slug: 'expected_revision', label: 'Expected revision', type: 'string', required: false, validation: { maxLength: 128 } },
    { slug: 'idempotency_key', label: 'Idempotency key', type: 'string', required: true, validation: { maxLength: 96 } },
    { slug: 'proposal_state', label: 'Proposal state', type: 'string', required: true, validation: { maxLength: 12 } },
  ],
} as const;

export const PROPOSAL_COLLECTION_ALLOWLIST = ['pages', 'posts'] as const;
export const PROPOSAL_TARGET_ALLOWLIST = ['pages', 'posts', 'policy_assessments', 'law_guides', 'glossary_terms', 'quizzes', 'quiz_questions'] as const;
export const PROPOSAL_KIND_ALLOWLIST = ['new_draft', 'revision_suggestion'] as const;

const safeText = (max: number) => z.string().trim().min(1).max(max).refine(
  // This is editorial content (which can contain legal dates and statutory references),
  // not anonymous telemetry. Reject email addresses and phone-like strings with
  // an explicit international prefix; do not classify dates as contact details.
  (value) => !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value)
    && !/(?:^|[^\w])\+\d[\d ()-]{7,}\d(?:$|[^\w])/.test(value),
  'Contact details are not allowed in proposal text',
);

export const editorialProposalInputSchema = z.object({
  contractVersion: z.literal(EDITORIAL_PROPOSAL_CONTRACT_VERSION),
  title: safeText(160),
  body: safeText(12000),
  kind: z.enum(PROPOSAL_KIND_ALLOWLIST),
  targetCollection: z.enum(PROPOSAL_TARGET_ALLOWLIST),
  targetId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).optional(),
  expectedRevision: z.string().min(1).max(128).optional(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'new_draft' && (value.targetId || value.expectedRevision)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'New drafts cannot target or revise an existing entry' });
  }
  if (value.kind === 'revision_suggestion' && (!value.targetId || !value.expectedRevision)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Revision suggestions require targetId and expectedRevision' });
  }
});

export type EditorialProposalInput = z.infer<typeof editorialProposalInputSchema>;
export type ProposalActor = { id: string; role: number | string };
export type ProposalDraft = {
  id: string;
  ownerId: string;
  status: 'draft';
  revision: string;
  proposal: EditorialProposalInput;
};

export type ProposalState = 'pending' | 'rejected' | 'archived' | 'applied';
export type ProposalResolutionAction = Exclude<ProposalState, 'pending'>;
export type ProposalAuditEvent = {
  action: ProposalResolutionAction;
  actorId: string;
  occurredAt: string;
  targetId: string | null;
  targetRevision: string | null;
  note: string | null;
};
export type ProposalQueueItem = ProposalDraft & {
  proposalState: ProposalState;
  /** Opaque EmDash storage revision used for lifecycle compare-and-set. */
  storageRevision: string;
  audit: ProposalAuditEvent[];
};
export type ProposalQueuePage = { items: ProposalQueueItem[]; cursor?: string; hasMore: boolean };
export type ProposalResolutionInput = {
  action: ProposalResolutionAction;
  expectedStorageRevision: string;
  appliedTargetId?: string;
  appliedTargetRevision?: string;
  note?: string;
};

/** The host adapter must atomically deduplicate, set authorId from actorId, and create draft-only content. */
export interface EditorialProposalHost {
  createOwnedDraft(input: {
    collection: typeof EDITORIAL_PROPOSALS_COLLECTION.slug;
    actorId: string;
    data: Record<string, string | null>;
    idempotencyKey: string;
  }): Promise<{ kind: 'created' | 'replayed'; draft: ProposalDraft }>;
  listOwnDrafts(actorId: string, limit: number): Promise<ProposalDraft[]>;
  listReviewerDrafts(limit: number, cursor?: string): Promise<ProposalQueuePage>;
  resolveReviewerDraft(actorId: string, proposalId: string, input: ProposalResolutionInput): Promise<ProposalQueueItem | null>;
}

export type ProposalResult =
  | { ok: true; kind: 'created' | 'replayed'; draft: ProposalDraft }
  | { ok: false; code: 'unauthenticated' | 'role_denied' | 'host_adapter_unavailable' | 'invalid_input' | 'conflict' };

export class ProposalConflictError extends Error {
  constructor(message = 'Proposal revision or idempotency conflict') {
    super(message);
    this.name = 'ProposalConflictError';
  }
}

export function createEditorialProposalService(host?: EditorialProposalHost) {
  const isContributor = (role: number | string) => role === 20 || (typeof role === 'string' && role.toLowerCase() === 'contributor');
  const isReviewer = (role: number | string) => role === 40 || role === 50
    || (typeof role === 'string' && ['editor', 'admin'].includes(role.toLowerCase()));
  const sameProposal = (left: EditorialProposalInput, right: EditorialProposalInput) =>
    left.contractVersion === right.contractVersion && left.title === right.title && left.body === right.body
    && left.kind === right.kind && left.targetCollection === right.targetCollection
    && left.targetId === right.targetId && left.expectedRevision === right.expectedRevision
    && left.idempotencyKey === right.idempotencyKey;
  return {
    async propose(actor: ProposalActor | undefined, rawInput: unknown): Promise<ProposalResult> {
      if (!actor?.id) return { ok: false, code: 'unauthenticated' };
      if (!isContributor(actor.role)) return { ok: false, code: 'role_denied' };
      if (!host) return { ok: false, code: 'host_adapter_unavailable' };
      const parsed = editorialProposalInputSchema.safeParse(rawInput);
      if (!parsed.success) return { ok: false, code: 'invalid_input' };
      const proposal = parsed.data;
      try {
        const result = await host.createOwnedDraft({
          collection: EDITORIAL_PROPOSALS_COLLECTION.slug,
          actorId: actor.id,
          idempotencyKey: proposal.idempotencyKey,
          data: {
            title: proposal.title,
            body: proposal.body,
            proposal_kind: proposal.kind,
            target_collection: proposal.targetCollection,
            target_id: proposal.targetId ?? null,
            expected_revision: proposal.expectedRevision ?? null,
            idempotency_key: proposal.idempotencyKey,
            proposal_state: 'pending',
          },
        });
        if (result.draft.status !== 'draft' || result.draft.ownerId !== actor.id || !sameProposal(result.draft.proposal, proposal)) {
          return { ok: false, code: 'conflict' };
        }
        return { ok: true, ...result };
      } catch (error) {
        if (error instanceof ProposalConflictError) {
          return { ok: false, code: 'conflict' };
        }
        throw error;
      }
    },
    async listOwn(actor: ProposalActor | undefined): Promise<ProposalDraft[]> {
      if (!actor?.id || !host) return [];
      if (!isContributor(actor.role)) return [];
      return host.listOwnDrafts(actor.id, 50);
    },
    async listForReviewer(actor: ProposalActor | undefined, limit = 50, cursor?: string): Promise<ProposalQueuePage> {
      if (!actor?.id || !isReviewer(actor.role) || !host) return { items: [], hasMore: false };
      return host.listReviewerDrafts(Math.min(100, Math.max(1, Math.floor(limit))), cursor);
    },
    async resolveForReviewer(actor: ProposalActor | undefined, proposalId: string, input: ProposalResolutionInput) {
      if (!actor?.id) return { ok: false as const, code: 'unauthenticated' as const };
      if (!isReviewer(actor.role)) return { ok: false as const, code: 'role_denied' as const };
      if (!host) return { ok: false as const, code: 'host_adapter_unavailable' as const };
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(proposalId) || !input.expectedStorageRevision) {
        return { ok: false as const, code: 'invalid_input' as const };
      }
      if (input.action === 'applied' && (!input.appliedTargetId || !input.appliedTargetRevision)) {
        return { ok: false as const, code: 'invalid_input' as const };
      }
      if (input.action !== 'applied' && (input.appliedTargetId || input.appliedTargetRevision)) {
        return { ok: false as const, code: 'invalid_input' as const };
      }
      try {
        const item = await host.resolveReviewerDraft(actor.id, proposalId, input);
        return item ? { ok: true as const, item } : { ok: false as const, code: 'conflict' as const };
      } catch (error) {
        if (error instanceof ProposalConflictError) return { ok: false as const, code: 'conflict' as const };
        throw error;
      }
    },
  };
}

/** Add the dedicated, non-routable proposal collection without replacing seed content. */
export function addEditorialProposalsCollection<T extends { collections: unknown[] }>(seed: T): T {
  if (seed.collections.some((item) => typeof item === 'object' && item !== null && 'slug' in item && item.slug === EDITORIAL_PROPOSALS_COLLECTION.slug)) {
    return seed;
  }
  return { ...seed, collections: [...seed.collections, EDITORIAL_PROPOSALS_COLLECTION] };
}
