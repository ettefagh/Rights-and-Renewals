import type { SandboxedPlugin } from 'emdash/plugin';
import { validatePolicyVerifiedDate } from './policy-date.js';

const REVIEW_DATED_COLLECTIONS = new Set(['law_guides', 'glossary_terms', 'quizzes', 'quiz_questions']);

export default {
  hooks: {
    'content:beforePublish': async (event) => {
      const reviewDated = REVIEW_DATED_COLLECTIONS.has(event.collection);
      if (event.collection !== 'brand_policies' && !reviewDated) return;

      const contentData = event.content.data;
      const dateField = reviewDated ? 'reviewed_on' : 'verified_date';
      const verifiedDate =
        typeof contentData === 'object' && contentData !== null && !Array.isArray(contentData)
          ? (contentData as Record<string, unknown>)[dateField]
          : undefined;
      const validation = validatePolicyVerifiedDate(verifiedDate);

      if (!validation.valid) {
        const reason = 'reason' in validation ? validation.reason : 'is invalid';
        return {
          cancel: true,
          reason: reviewDated
            ? `This learning item cannot be published because its review date ${reason}.`
            : `A policy cannot be published because its verification date ${reason}.`,
        };
      }
    },
  },
} satisfies SandboxedPlugin;
