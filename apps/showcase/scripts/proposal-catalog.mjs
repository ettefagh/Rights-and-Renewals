/** Node-readable proposal catalog shared by readiness, Astro integration and tests. */
export const proposalCollections = Object.freeze([
  'pages', 'posts', 'policy_assessments', 'law_guides', 'glossary_terms', 'quizzes', 'quiz_questions',
]);

export const proposalKinds = Object.freeze(['new_draft', 'revision_suggestion']);

export const proposalQueueStorage = Object.freeze({
  proposals: Object.freeze({ indexes: Object.freeze(['ownerId', 'createdAt', 'proposalState']) }),
});

export const proposalLimits = Object.freeze({
  title: 160,
  body: 12000,
  pageSize: 50,
  maxPageSize: 100,
  contractVersion: '1.0.0',
});
