import { describe, expect, it, vi } from 'vitest';
vi.mock('emdash', () => ({ getEmDashCollection: async () => ({ entries: [] }) }));
vi.mock('./policy-cms', () => ({ getPublishedPolicies: async () => [] }));
vi.mock('./policy-graph-cms', () => ({ entryId: (entry: { id: string }) => entry.id, withPublicContext: (read: () => unknown) => read() }));
vi.mock('./learning-cms', () => ({ loadLearningContent: async () => ({ laws: [], glossary: [], quizzes: [] }) }));
vi.mock('./website-cms', () => ({ getPublishedWebsitePages: async () => [] }));
import { buildPublishedEventRegistry } from './telemetry-registry';
import { validatePublicEvent } from './telemetry';

describe('published static page action registry', () => {
  it('accepts real template actions without CMS content and rejects wrong parents', async () => {
    const registry = await buildPublishedEventRegistry();
    for (const [pageId, ctaId] of [['page:home', 'cta:home:open-wallet'], ['page:home', 'cta:home:copy-curl'], ['page:agent-setup', 'cta:agent-setup:copy-prompt']]) {
      expect(validatePublicEvent({ name: 'cta_click', consent: true, pageId, ctaId, revision: registry.pageRevisions?.[pageId!] }, registry)).toMatchObject({ accepted: true });
    }
    expect(validatePublicEvent({ name: 'cta_click', consent: true, pageId: 'page:home', ctaId: 'cta:agent-setup:copy-prompt', revision: registry.pageRevisions?.['page:home'] }, registry)).toMatchObject({ accepted: false, reason: 'cta_parent_mismatch' });
  });
});
