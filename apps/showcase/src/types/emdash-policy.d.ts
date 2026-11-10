import type { CmsPolicyFields } from '../lib/policy-cms.js';

declare module 'emdash' {
  interface EmDashCollections {
    brand_policies: CmsPolicyFields;
  }
}

export {};
