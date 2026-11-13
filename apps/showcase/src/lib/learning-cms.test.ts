import { beforeEach, describe, expect, it, vi } from 'vitest';

const emdash = vi.hoisted(() => ({
  getEmDashCollection: vi.fn(), getRequestContext: vi.fn(), isSafeHref: vi.fn((href: unknown) => typeof href === 'string' && href.startsWith('https://')),
  runWithContext: vi.fn(async (_context: unknown, operation: () => Promise<unknown>) => operation()),
}));
vi.mock('emdash', () => emdash);
vi.mock('./policy-cms.js', () => ({ getPublishedPolicies: vi.fn(async () => [{ brandSlug: 'spotify' }]) }));
import { getPublishedPolicies } from './policy-cms.js';
import { loadLearningContent } from './learning-cms.js';

const entry = (collection: string, slug: string, data: Record<string, unknown>, status = 'published') => ({ id: `${collection}/${slug}`, status, data });
const reviewed_on = '2026-11-10T00:00:00Z';
const guide = entry('law_guides', 'consumer-rights', { stable_id: 'consumer-rights', title: 'Consumer rights', jurisdiction: 'Germany', summary: 'Reviewed summary.', takeaways: [{ text: 'Check the contract.' }], sources: [{ label: 'BGB', url: 'https://www.gesetze-im-internet.de/bgb/' }], reviewed_on });
const quiz = entry('quizzes', 'subscriptions', { stable_id: 'subscriptions', content_version: 'subscriptions-v1', title: 'Subscriptions', description: 'Practice concepts.', question_ids: [{ id: 'q-one' }], reviewed_on });
const question = entry('quiz_questions', 'q-one', { stable_id: 'q-one', quiz_id: 'subscriptions', order: 0, prompt: 'What does cancellation do?', options: [{ id: 'a', label: 'Ends a contract' }, { id: 'b', label: 'Reverses any payment' }], correct_option_id: 'a', explanation: 'It ends a contract for the future.', source_label: 'BGB', source_url: 'https://www.gesetze-im-internet.de/bgb/', reviewed_on });

describe('public learning projection', () => {
  beforeEach(() => {
    emdash.getRequestContext.mockReset().mockReturnValue({ editMode: true, preview: { collection: 'quizzes', id: 'subscriptions' } });
    emdash.getEmDashCollection.mockReset().mockImplementation(async (collection: string, filter: { status: string }) => ({
      entries: (({ law_guides: [guide], glossary_terms: [], quizzes: [quiz], quiz_questions: [question, entry('quiz_questions', 'q-draft', {}, 'draft')] } as Record<string, unknown[]>)[collection] ?? [])
        .filter((candidate: unknown) => (candidate as { status: string }).status === filter.status), error: null,
    }));
  });

  it('strips preview context, preserves question order and emits the legacy policy projection', async () => {
    const result = await loadLearningContent();
    expect(emdash.getEmDashCollection).toHaveBeenCalledTimes(4);
    expect(emdash.getEmDashCollection).toHaveBeenCalledWith('quiz_questions', { status: 'published' });
    expect(emdash.runWithContext).toHaveBeenCalledWith({ editMode: false }, expect.any(Function));
    expect(result).toMatchObject({ schemaVersion: 1, laws: [{ id: 'consumer-rights' }], quizzes: [{ id: 'subscriptions', contentVersion: 'subscriptions-v1', questions: [{ id: 'q-one' }] }], policies: [{ brandSlug: 'spotify' }] });
    expect(getPublishedPolicies).toHaveBeenCalledTimes(1);
  });

  it('skips a quiz whose published projection depends on a missing or unpublished question', async () => {
    emdash.getEmDashCollection.mockImplementation(async (collection: string, filter: { status: string }) => ({
      entries: (({ law_guides: [], glossary_terms: [], quizzes: [entry('quizzes', 'subscriptions', { stable_id: 'subscriptions', content_version: 'subscriptions-v1', title: 'Subscriptions', description: 'Practice concepts.', question_ids: [{ id: 'q-one' }, { id: 'q-draft' }], reviewed_on })], quiz_questions: [question] } as Record<string, unknown[]>)[collection] ?? [])
        .filter((candidate: unknown) => (candidate as { status: string }).status === filter.status), error: null,
    }));
    const result = await loadLearningContent();
    expect(result.quizzes).toEqual([]);
  });

  it('drops a malformed question when its answer key does not resolve', async () => {
    emdash.getEmDashCollection.mockImplementation(async (collection: string) => ({
      entries: collection === 'quizzes'
        ? [entry('quizzes', 'subscriptions', { stable_id: 'subscriptions', content_version: 'subscriptions-v1', title: 'Subscriptions', description: 'Practice concepts.', question_ids: [{ id: 'q-bad' }], reviewed_on })]
        : collection === 'quiz_questions'
          ? [entry('quiz_questions', 'q-bad', { ...question.data, stable_id: 'q-bad', correct_option_id: 'missing' })]
          : [], error: null,
    }));
    const result = await loadLearningContent();
    expect(result.quizzes).toEqual([]);
  });
});
