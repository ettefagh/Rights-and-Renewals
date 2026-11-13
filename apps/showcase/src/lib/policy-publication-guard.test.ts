import { afterEach, describe, expect, it, vi } from 'vitest';
import guard from './policy-publication-guard.js';

const beforePublish = guard.hooks['content:beforePublish'] as (event: unknown) => Promise<unknown>;

describe('central editorial publication date policy', () => {
  afterEach(() => vi.useRealTimers());

  it.each(['law_guides', 'glossary_terms', 'quizzes', 'quiz_questions'])('requires a valid non-future review date for %s', async (collection) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T12:00:00.000Z'));
    const event = (reviewed_on: unknown) => ({ collection, content: { data: { reviewed_on } } });
    expect(await beforePublish(event('2026-11-11T11:00:00.000Z'))).toBeUndefined();
    expect(await beforePublish(event(undefined))).toMatchObject({ cancel: true });
    expect(await beforePublish(event('2026-11-12T00:00:00.000Z'))).toMatchObject({ cancel: true });
    expect(await beforePublish(event('2026-02-30T00:00:00.000Z'))).toMatchObject({ cancel: true });
    expect(await beforePublish(event('yesterday'))).toMatchObject({ cancel: true });
  });

  it('preserves the brand policy verified-date check and ignores unrelated collections', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T12:00:00.000Z'));
    expect(await beforePublish({ collection: 'brand_policies', content: { data: { verified_date: '2026-11-12T00:00:00.000Z' } } })).toMatchObject({ cancel: true });
    expect(await beforePublish({ collection: 'pages', content: { data: {} } })).toBeUndefined();
  });
});
