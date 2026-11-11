import { describe, expect, it } from 'vitest';
import { learningContentFromWiki } from './learning-catalog.mjs';

describe('learning catalog starter projection', () => {
  it('preserves reviewed source IDs, answer keys, sources and a separate immutable content version', () => {
    const catalog = learningContentFromWiki({
      WIKI_AS_OF: '10 November 2026',
      wikiLawGuides: [{ id: 'law-one', title: 'Law one', jurisdiction: 'Germany', summary: 'Reviewed summary', takeaways: ['Read the terms'], sources: [{ label: 'Official law', url: 'https://example.test/law' }] }],
      wikiGlossary: [{ id: 'term-one', title: 'Term one', label: 'Label', description: 'Reviewed definition', sources: [] }],
      wikiQuizzes: [{ id: 'subscriptions', title: 'Subscriptions', description: 'Practice', questions: [{ id: 'q-one', prompt: 'Question?', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Because.', source: { label: 'Official law', url: 'https://example.test/law' } }] }],
    });

    expect(catalog.law_guides[0]).toMatchObject({ slug: 'law-one', stable_id: 'law-one', sources: [{ label: 'Official law' }] });
    expect(catalog.glossary_terms[0].slug).toBe('term-one');
    expect(catalog.quizzes[0]).toMatchObject({ slug: 'subscriptions', content_version: 'subscriptions-2026-11-10-v1', question_ids: [{ id: 'q-one' }] });
    expect(catalog.quiz_questions[0]).toMatchObject({ slug: 'q-one', correct_option_id: 'b', source_url: 'https://example.test/law' });
  });
});
