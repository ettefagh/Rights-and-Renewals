import type { PluginAdminExports } from 'emdash';
import { PolicyReviewPage } from './PolicyReviewPage.js';

export const pages: PluginAdminExports['pages'] = {
  '/review': PolicyReviewPage,
};
