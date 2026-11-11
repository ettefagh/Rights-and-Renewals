import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completionFor,
  completionPoints,
  fetchPublishedWiki,
  migrateQuizProgress,
  parsePublishedWiki,
  type PublishedWiki
} from '../../../app/src/lib/wiki-cms-client';

const source = { label: 'Official law', url: 'https://example.org/law' };
const payload = (): PublishedWiki => ({
  schemaVersion: 1,
  asOf: '2026-11-11T10:00:00.000Z',
  laws: [{ id: 'consumer-law', jurisdiction: 'Germany', title: 'Consumer law', summary: 'Plain language summary', takeaways: ['Check the contract'], sources: [source] }],
  glossary: [{ id: 'withdrawal', title: 'Withdrawal', label: 'Germany', description: 'A plain language term', sources: [source] }],
  quizzes: [{ id: 'subscriptions', contentVersion: '2', title: 'Subscriptions', description: 'A short quiz', questions: [{ id: 'q-one', prompt: 'Which source applies?', options: [{ id: 'a', label: 'Official law' }, { id: 'b', label: 'A guess' }], correctOptionId: 'a', explanation: 'Use the official source.', source }] }],
  policies: []
});

afterEach(() => vi.useRealTimers());

describe('published Wiki client', () => {
  it('accepts a valid published envelope and authoritative empty withdrawals', () => {
    expect(parsePublishedWiki(payload()).laws).toHaveLength(1);
    const withdrawn = { ...payload(), laws: [], glossary: [], quizzes: [], policies: [] };
    expect(parsePublishedWiki(withdrawn)).toMatchObject({ laws: [], glossary: [], quizzes: [], policies: [] });
  });

  it('loads an empty published snapshot without restoring bundled entries', async () => {
    const withdrawn = { ...payload(), laws: [], glossary: [], quizzes: [], policies: [] };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(withdrawn), { status: 200 })) as typeof fetch;
    const loaded = await fetchPublishedWiki('https://showcase.example/api/emdash/wiki', fetcher);
    expect(loaded).toMatchObject({ laws: [], glossary: [], quizzes: [], policies: [] });
  });

  it('rejects malformed structure, duplicate IDs and unsafe links', () => {
    expect(() => parsePublishedWiki({ ...payload(), schemaVersion: 2 })).toThrow();
    expect(() => parsePublishedWiki({ ...payload(), unexpected: '<script>not rendered</script>' })).toThrow();
    expect(() => parsePublishedWiki({ ...payload(), laws: [payload().laws[0], payload().laws[0]] })).toThrow(/duplicate/i);
    const dangerousLaw = payload();
    dangerousLaw.laws[0]!.sources[0]!.url = 'javascript:alert(1)';
    expect(() => parsePublishedWiki(dangerousLaw)).toThrow(/entry/i);
    const dangerousPolicy = payload();
    dangerousPolicy.policies = [{ brandSlug: 'brand', brandName: 'Brand', category: 'hardware', statutoryWarrantyMonths: 24, commercialGuaranteeMonths: 0, cancellationNoticeMonths: 0, cancellationButtonCompliant: true, cancellationUrl: 'http://unsafe.example/', legalNotes: '', verifiedDate: '2026-11-11', searchAliases: [] }];
    expect(() => parsePublishedWiki(dangerousPolicy)).toThrow(/entry/i);
  });

  it('omits credentials and falls back on network or HTTP failures', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.credentials).toBe('omit');
      return new Response('unavailable', { status: 503 });
    }) as typeof fetch;
    await expect(fetchPublishedWiki('https://showcase.example/api/emdash/wiki', fetcher)).rejects.toThrow(/503/);
    await expect(fetchPublishedWiki(null, fetcher)).rejects.toThrow(/not configured/);
    const offline = vi.fn(async () => { throw new TypeError('offline'); }) as typeof fetch;
    await expect(fetchPublishedWiki('https://showcase.example/api/emdash/wiki', offline)).rejects.toThrow('offline');
  });

  it('aborts a stalled request at the configured timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })) as typeof fetch;
    const pending = fetchPublishedWiki('https://showcase.example/api/emdash/wiki', fetcher, 15);
    const rejection = expect(pending).rejects.toThrow(/aborted/i);
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
  });

  it('stops reading a chunked response after the byte limit', async () => {
    const oversized = new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(512_001)));
        controller.close();
      }
    }));
    const fetcher = vi.fn(async () => oversized) as typeof fetch;
    await expect(fetchPublishedWiki('https://showcase.example/api/emdash/wiki', fetcher)).rejects.toThrow(/too large/i);
  });

  it('migrates completed legacy IDs and preserves points when content version changes', () => {
    const progress = migrateQuizProgress({ version: 1, scores: { subscriptions: 3, warranties: null } });
    expect(completionPoints(progress)).toBe(1);
    expect(completionFor(progress, 'subscriptions')).toEqual({ score: 3, contentVersion: 'bundled-quiz-v1' });
    expect(completionFor(progress, 'subscriptions')?.contentVersion).not.toBe(payload().quizzes[0]?.contentVersion);
    expect(completionPoints(migrateQuizProgress(progress))).toBe(1);
  });
});
