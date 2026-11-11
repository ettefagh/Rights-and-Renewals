import { apiFetch, isRecord, parseApiResponse } from 'emdash/plugin-utils';
import {
  editorialProposalInputSchema,
  type EditorialProposalInput,
  type ProposalDraft,
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

export function proposalTargetHref(proposal: EditorialProposalInput): string | null {
  if (!proposal.targetId || !PROPOSAL_TARGETS.has(proposal.targetCollection)
    || !/^[A-Za-z0-9_-]{1,80}$/.test(proposal.targetId)) return null;
  return `/_emdash/admin/content/${encodeURIComponent(proposal.targetCollection)}/${encodeURIComponent(proposal.targetId)}`;
}

export async function listPendingProposals(): Promise<ProposalDraft[]> {
  const response = await apiFetch(`/_emdash/api/plugins/${PROPOSAL_PLUGIN}/listReviewerDrafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 50 }),
  });
  const result = await parseApiResponse<unknown>(response, 'Could not load editorial proposals.');
  if (!isRecord(result) || !Array.isArray(result.items)) {
    throw new Error('The proposal queue returned an invalid response. Refresh and retry.');
  }
  const drafts = result.items.map(parseDraft);
  if (drafts.some((draft) => draft === null)) {
    throw new Error('The proposal queue contains an invalid record. Ask an administrator to inspect it.');
  }
  return drafts as ProposalDraft[];
}
