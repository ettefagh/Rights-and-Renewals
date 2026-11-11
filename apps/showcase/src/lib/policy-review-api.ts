import { apiFetch, parseApiResponse } from 'emdash/plugin-utils';

export const REVIEW_COLLECTION = 'policy_assessments';
const DOMAIN_PLUGIN = 'cmlab-policy-graph-review';

export interface AssessmentSummary {
  id: string;
  slug?: string;
  status: string;
  authorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  data: Record<string, unknown>;
}

export interface ReviewState {
  assessmentId: string;
  expectedRevision: string;
  assessmentFieldsHash: string;
  assessment: Record<string, unknown>;
  dependencies: Array<{ id: string; revision: string; contentHash: string }>;
  sources: Array<{
    collection: string; id: string; title: string; revision: string;
    sourceUrl: string; statement: string; contentHash: string;
  }>;
  expectedApprovalRevision: string | null;
  currentApproval: null | { reviewerId: string; approvedAt: string; expiresAt: string; auditId: string };
}

export interface AssessmentContext {
  item: AssessmentSummary & { references?: Record<string, { entries?: Array<{ id: string; title?: string | null; slug?: string | null; status?: string }> }> };
  compare: { hasChanges: boolean; live: Record<string, unknown> | null; draft: Record<string, unknown> | null };
}

export function approvalRequestBody(state: ReviewState) {
  return {
    assessmentId: state.assessmentId,
    expectedRevision: state.expectedRevision,
    expectedApprovalRevision: state.expectedApprovalRevision,
  };
}

async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  return parseApiResponse<T>(await apiFetch(url, init), fallback);
}

export async function listAssessments(): Promise<AssessmentSummary[]> {
  const items: AssessmentSummary[] = [];
  let cursor = '';
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ status: 'all', limit: '100', ...(cursor ? { cursor } : {}) });
    const result = await request<{ items: AssessmentSummary[]; nextCursor?: string }>(
      `/_emdash/api/content/${REVIEW_COLLECTION}?${query}`, undefined, 'Could not load policy assessments.',
    );
    items.push(...result.items);
    if (!result.nextCursor) return [...new Map(items.map((item) => [item.id, item])).values()];
    if (result.nextCursor === cursor) throw new Error('Assessment list could not continue to the next page. Refresh and retry.');
    cursor = result.nextCursor;
  }
  throw new Error('There are too many assessments to load in one view. Refine the list in the content editor.');
}

export async function loadReviewState(assessmentId: string): Promise<ReviewState> {
  const query = new URLSearchParams({ assessmentId });
  return request(`/_emdash/api/plugins/${DOMAIN_PLUGIN}/reviewAssessment?${query}`, undefined, 'Could not load the review details.');
}

export async function loadAssessmentContext(assessmentId: string): Promise<AssessmentContext> {
  const collection = encodeURIComponent(REVIEW_COLLECTION);
  const id = encodeURIComponent(assessmentId);
  const [item, compare] = await Promise.all([
    request<{ item: AssessmentContext['item'] }>(`/_emdash/api/content/${collection}/${id}`, undefined, 'Could not load assessment context.'),
    request<AssessmentContext['compare']>(`/_emdash/api/content/${collection}/${id}/compare`, undefined, 'Could not load the revision comparison.'),
  ]);
  return { item: item.item, compare };
}

export async function approveExactRevision(state: ReviewState): Promise<{ assessmentId: string; reviewerId: string; approvedAt: string; expiresAt: string }> {
  return request(`/_emdash/api/plugins/${DOMAIN_PLUGIN}/approveAssessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(approvalRequestBody(state)),
  }, 'Review was refused. Reload the assessment and try again.');
}
