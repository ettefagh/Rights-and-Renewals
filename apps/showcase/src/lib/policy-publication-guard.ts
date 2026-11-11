import type { SandboxedPlugin } from 'emdash/plugin';
import { validatePolicyVerifiedDate } from './policy-date.js';

export default {
  hooks: {
    'content:beforePublish': async (event) => {
      if (event.collection !== 'brand_policies') return;

      const contentData = event.content.data;
      const verifiedDate =
        typeof contentData === 'object' && contentData !== null && !Array.isArray(contentData)
          ? (contentData as Record<string, unknown>).verified_date
          : undefined;
      const validation = validatePolicyVerifiedDate(verifiedDate);

      if (!validation.valid) {
        return {
          cancel: true,
          reason: `A policy cannot be published because its verification date ${validation.reason}.`,
        };
      }
    },
  },
} satisfies SandboxedPlugin;
