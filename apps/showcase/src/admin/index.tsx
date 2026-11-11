import type { ComponentType } from 'react';
import { PolicyReviewPage } from './PolicyReviewPage.js';
import { ProposalQueuePage } from './ProposalQueuePage.js';

// EmDash's admin registry consumes page components. Its PluginAdminExports
// declaration currently describes these values as JSX elements instead.
export const pages: Record<string, ComponentType> = {
  '/review': PolicyReviewPage,
  '/proposals': ProposalQueuePage,
};
