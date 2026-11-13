import { describe, expect, it } from 'vitest';
import { approvalRequestBody, type ReviewState } from './policy-review-api.js';

const state: ReviewState = {
  assessmentId: 'assessment-a',
  expectedRevision: 'emdash-revision-4',
  assessmentFieldsHash: 'server-returned-provenance',
  assessment: { title: 'Assessment' },
  dependencies: [{ id: 'evidence-a', revision: 'evidence-v2', contentHash: 'server-hash' }],
  sources: [],
  expectedApprovalRevision: 'approval-revision-2',
  currentApproval: null,
};

describe('policy review request shapes', () => {
  it('sends only the exact assessment and approval revisions required by the review route', () => {
    expect(approvalRequestBody(state)).toEqual({
      assessmentId: 'assessment-a',
      expectedRevision: 'emdash-revision-4',
      expectedApprovalRevision: 'approval-revision-2',
    });
    expect(approvalRequestBody(state)).not.toHaveProperty('reviewerId');
    expect(approvalRequestBody(state)).not.toHaveProperty('approved');
  });

  it('keeps the empty approval revision as null for first approval', () => {
    expect(approvalRequestBody({ ...state, expectedApprovalRevision: null })).toMatchObject({ expectedApprovalRevision: null });
  });
});
