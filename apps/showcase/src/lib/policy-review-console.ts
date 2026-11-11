import { definePlugin } from 'emdash';
import { fileURLToPath } from 'node:url';

export const policyReviewConsoleId = 'cmlab-policy-review-console';

export const policyReviewConsoleAdminEntry = fileURLToPath(new URL('../admin/index.tsx', import.meta.url)).replaceAll('\\', '/');

export function createPlugin() {
  return definePlugin({
    id: policyReviewConsoleId,
    version: '1.0.0',
    capabilities: ['content:read'],
    admin: {
      entry: policyReviewConsoleAdminEntry,
      pages: [{ path: '/review', label: 'Assessment review', icon: 'clipboard-text', group: 'Policy catalog' }],
    },
  });
}

export const policyReviewConsoleContract = {
  domainRoutes: ['reviewAssessment (GET)', 'approveAssessment (POST)'],
  approvalInput: ['assessmentId', 'expectedRevision', 'expectedApprovalRevision'],
  reviewerIdentity: 'derived by the domain route from the authenticated EmDash session; never submitted by the page',
  publication: 'separate native content editor action, guarded by cmlab-policy-graph-review',
} as const;
