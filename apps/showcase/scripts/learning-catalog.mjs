const text = (slug, label, maxLength, required = true) => ({ slug, label, type: 'text', required, validation: { maxLength } });
const string = (slug, label, maxLength, required = true) => ({ slug, label, type: 'string', required, validation: { maxLength } });
const url = (slug, label) => ({ slug, label, type: 'url', required: true });
const repeater = (slug, label, subFields, maxItems = 30) => ({ slug, label, type: 'repeater', validation: { minItems: 0, maxItems, subFields } });
const sourceFields = [string('label', 'Source label', 180), url('url', 'Official source URL')];

export const learningCollections = [
  { slug: 'law_guides', label: 'Law guides', labelSingular: 'Law guide', group: 'Learning', icon: 'book-open', supports: ['drafts', 'revisions', 'preview', 'search'], fields: [string('stable_id', 'Stable guide ID', 100), string('title', 'Title', 180), string('jurisdiction', 'Jurisdiction', 180), text('summary', 'Summary', 2400), repeater('takeaways', 'Takeaways', [text('text', 'Takeaway', 1000)], 20), repeater('sources', 'Official sources', sourceFields, 30), { slug: 'reviewed_on', label: 'Reviewed on', type: 'datetime', required: true }] },
  { slug: 'glossary_terms', label: 'Glossary', labelSingular: 'Glossary term', group: 'Learning', icon: 'book-open', supports: ['drafts', 'revisions', 'preview', 'search'], fields: [string('stable_id', 'Stable term ID', 100), string('title', 'Term', 180), string('label', 'Short label', 180), text('description', 'Description', 2400), repeater('sources', 'Official sources', sourceFields, 30), { slug: 'reviewed_on', label: 'Reviewed on', type: 'datetime', required: true }] },
  { slug: 'quizzes', label: 'Learning quizzes', labelSingular: 'Learning quiz', group: 'Learning', icon: 'graduation-cap', supports: ['drafts', 'revisions', 'preview'], fields: [string('stable_id', 'Stable quiz ID', 100), string('content_version', 'Immutable content version', 120), string('title', 'Title', 180), text('description', 'Description', 1200), repeater('question_ids', 'Ordered question IDs', [string('id', 'Stable question ID', 120)], 20), { slug: 'reviewed_on', label: 'Reviewed on', type: 'datetime', required: true }] },
  { slug: 'quiz_questions', label: 'Quiz questions', labelSingular: 'Quiz question', group: 'Learning', icon: 'question', supports: ['drafts', 'revisions', 'preview'], fields: [string('stable_id', 'Stable question ID', 120), string('quiz_id', 'Quiz ID', 100), { slug: 'quiz_reference', label: 'Quiz', type: 'reference', validation: { relation: 'quiz_questions' } }, { slug: 'order', label: 'Order', type: 'integer', required: true, validation: { min: 0, max: 19 } }, text('prompt', 'Prompt', 1200), repeater('options', 'Answer choices', [string('id', 'Stable answer ID', 20), text('label', 'Answer label', 500)], 8), string('correct_option_id', 'Correct answer ID', 20), text('explanation', 'Explanation', 1800), string('source_label', 'Source label', 180), url('source_url', 'Official source URL'), { slug: 'source_law_guide', label: 'Related law guide', type: 'reference', validation: { relation: 'quiz_question_law_guide' } }, { slug: 'reviewed_on', label: 'Reviewed on', type: 'datetime', required: true }] },
];

export const learningRelations = [
  { slug: 'quiz_questions', parentCollection: 'quizzes', childCollection: 'quiz_questions', parentLabel: 'Quizzes', parentLabelSingular: 'Quiz', childLabel: 'Questions', childLabelSingular: 'Question' },
  { slug: 'quiz_question_law_guide', parentCollection: 'law_guides', childCollection: 'quiz_questions', parentLabel: 'Law guides', parentLabelSingular: 'Law guide', childLabel: 'Questions', childLabelSingular: 'Question' },
];

export function learningContentFromWiki(wiki) {
  if (!wiki || !Array.isArray(wiki.wikiLawGuides) || !Array.isArray(wiki.wikiGlossary) || !Array.isArray(wiki.wikiQuizzes)) {
    throw new TypeError('Expected the existing wikiContent exports.');
  }
  const asOf = wiki.WIKI_AS_OF || '10 November 2026';
  const reviewedOn = new Date(`${asOf} 00:00:00 UTC`).toISOString();
  const lawGuides = wiki.wikiLawGuides.map((guide) => ({
    slug: guide.id, stable_id: guide.id, title: guide.title, jurisdiction: guide.jurisdiction, summary: guide.summary,
    takeaways: guide.takeaways.map((text) => ({ text })), sources: guide.sources.map(({ label, url }) => ({ label, url })), reviewed_on: reviewedOn,
  }));
  const glossaryTerms = wiki.wikiGlossary.map((term) => ({
    slug: term.id, stable_id: term.id, title: term.title, label: term.label, description: term.description,
    sources: term.sources.map(({ label, url }) => ({ label, url })), reviewed_on: reviewedOn,
  }));
  const quizzes = wiki.wikiQuizzes.map((quiz) => ({
    slug: quiz.id, stable_id: quiz.id, content_version: `${quiz.id}-2026-11-10-v1`, title: quiz.title, description: quiz.description,
    question_ids: quiz.questions.map(({ id }) => ({ id })), reviewed_on: reviewedOn,
  }));
  const questions = wiki.wikiQuizzes.flatMap((quiz) => quiz.questions.map((question, order) => ({
    slug: question.id, stable_id: question.id, quiz_id: quiz.id, order, prompt: question.prompt,
    options: question.options.map(({ id, label }) => ({ id, label })), correct_option_id: question.correctOptionId,
    explanation: question.explanation, source_label: question.source.label, source_url: question.source.url, reviewed_on: reviewedOn,
  })));
  return { law_guides: lawGuides, glossary_terms: glossaryTerms, quizzes, quiz_questions: questions };
}

export const learningContent = {};
