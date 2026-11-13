import { apiFetch, isRecord, parseApiResponse } from 'emdash/plugin-utils';
import {
  editorialProposalInputSchema,
  type EditorialProposalInput,
  type ProposalDraft,
  type ProposalQueueItem,
  type ProposalQueuePage,
  type ProposalResolutionInput,
} from './editorial-proposals.js';

const PROPOSAL_PLUGIN = 'cmlab-editorial-proposals';
const PROPOSAL_TARGETS = new Set([
  'pages', 'posts', 'policy_assessments', 'law_guides', 'glossary_terms', 'quizzes', 'quiz_questions',
]);

function parseDraft(value: unknown): ProposalDraft | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.ownerId !== 'string'
    || value.status !== 'draft' || typeof value.revision !== 'string') return null;
  const proposal = editorialProposalInputSchema.safeParse(value.proposal);
  if (!proposal.success) return null;
  return { id: value.id, ownerId: value.ownerId, status: 'draft', revision: value.revision, proposal: proposal.data };
}

function parseQueueItem(value: unknown): ProposalQueueItem | null {
  const draft = parseDraft(value);
  if (!draft || !isRecord(value) || typeof value.storageRevision !== 'string'
    || !['pending', 'rejected', 'archived', 'applied'].includes(String(value.proposalState))
    || !Array.isArray(value.audit)) return null;
  const audit = value.audit.filter((event) => isRecord(event)
    && ['rejected', 'archived', 'applied'].includes(String(event.action))
    && typeof event.actorId === 'string' && typeof event.occurredAt === 'string'
    && (event.targetId === null || typeof event.targetId === 'string')
    && (event.targetRevision === null || typeof event.targetRevision === 'string')
    && (event.note === null || typeof event.note === 'string'));
  if (audit.length !== value.audit.length) return null;
  const proposalState = value.proposalState as ProposalQueueItem['proposalState'];
  if ((proposalState === 'pending' && audit.length !== 0)
    || (proposalState !== 'pending' && (audit.length !== 1 || audit[0]?.action !== proposalState))) return null;
  return {
    ...draft,
    proposalState,
    storageRevision: value.storageRevision,
    audit: audit as ProposalQueueItem['audit'],
  };
}

export function proposalTargetHref(proposal: EditorialProposalInput): string | null {
  if (!proposal.targetId || !PROPOSAL_TARGETS.has(proposal.targetCollection)
    || !/^[A-Za-z0-9_-]{1,80}$/.test(proposal.targetId)) return null;
  return `/_emdash/admin/content/${encodeURIComponent(proposal.targetCollection)}/${encodeURIComponent(proposal.targetId)}`;
}

export async function listPendingProposals(options: { limit?: number; cursor?: string } = {}): Promise<ProposalQueuePage> {
  const { limit = 50, cursor } = options;
  const response = await apiFetch(`/_emdash/api/plugins/${PROPOSAL_PLUGIN}/listReviewerDrafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit, ...(cursor ? { cursor } : {}) }),
  });
  const result = await parseApiResponse<unknown>(response, 'Could not load editorial proposals.');
  if (!isRecord(result) || !Array.isArray(result.items)) {
    throw new Error('The proposal queue returned an invalid response. Refresh and retry.');
  }
  const items = result.items.map(parseQueueItem);
  if (items.some((item) => item === null) || typeof result.hasMore !== 'boolean'
    || (result.cursor !== undefined && typeof result.cursor !== 'string')) {
    throw new Error('The proposal queue contains an invalid record. Ask an administrator to inspect it.');
  }
  return {
    items: items as ProposalQueueItem[],
    ...(typeof result.cursor === 'string' ? { cursor: result.cursor } : {}),
    hasMore: result.hasMore,
  };
}

export async function resolveProposal(proposalId: string, input: ProposalResolutionInput): Promise<ProposalQueueItem> {
  const response = await apiFetch(`/_emdash/api/plugins/${PROPOSAL_PLUGIN}/resolveProposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, ...input }),
  });
  const result = await parseApiResponse<unknown>(response, 'Could not update this proposal. Refresh and retry.');
  if (!isRecord(result) || result.ok !== true) {
    if (isRecord(result) && result.code === 'conflict') throw new Error('This proposal changed while you were reviewing it. Refresh the queue and retry.');
    throw new Error('The proposal could not be updated. Refresh and retry.');
  }
  const item = parseQueueItem(result.item);
  if (!item) throw new Error('The proposal update returned an invalid record. Ask an administrator to inspect it.');
  return item;
}
