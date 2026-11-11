import { definePlugin } from 'emdash';

export const policyReviewConsoleId = 'cmlab-policy-review-console';

// Astro resolves the absolute build entry in astro.config.mjs. Keep the runtime
// manifest portable: workerd cannot resolve source file URLs from import.meta.url.
export const policyReviewConsoleAdminEntry = './src/admin/index.tsx';

export function createPlugin() {
  return definePlugin({
    id: policyReviewConsoleId,
    version: '1.0.0',
    capabilities: ['content:read'],
    admin: {
      entry: policyReviewConsoleAdminEntry,
      pages: [
        { path: '/review', label: 'Assessment review', icon: 'clipboard-text', group: 'Policy catalog' },
        { path: '/proposals', label: 'Editorial proposals', icon: 'inbox', group: 'Editorial' },
      ],
    },
  });
}

export const policyReviewConsoleContract = {
  domainRoutes: ['reviewAssessment (GET)', 'approveAssessment (POST)'],
  approvalInput: ['assessmentId', 'expectedRevision', 'expectedApprovalRevision'],
  reviewerIdentity: 'derived by the domain route from the authenticated EmDash session; never submitted by the page',
  publication: 'separate native content editor action, guarded by cmlab-policy-graph-review',
} as const;
