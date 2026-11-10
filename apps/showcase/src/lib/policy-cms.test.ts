import { beforeEach, describe, expect, it, vi } from 'vitest';

const emdash = vi.hoisted(() => ({
  getEmDashCollection: vi.fn(),
  getEmDashEntry: vi.fn(),
  getRequestContext: vi.fn(),
  isSafeHref: vi.fn((href: unknown) => typeof href === 'string' && href.startsWith('https://')),
  runWithContext: vi.fn(async (_context: unknown, operation: () => Promise<unknown>) => operation()),
}));

vi.mock('emdash', () => emdash);

import { getPublishedPolicies, POLICY_COLLECTION } from './policy-cms.js';

function policyEntry(slug: string, overrides: Record<string, unknown> = {}, status = 'published') {
  return {
    id: `${POLICY_COLLECTION}/${slug}`,
    status,
    data: {
      title: slug[0]?.toUpperCase() + slug.slice(1),
      category: 'subscription',
      statutory_warranty_months: 0,
      commercial_guarantee_months: 0,
      cancellation_notice_months: 1,
      cancellation_button_compliant: false,
      legal_notes: 'Reviewed test record.',
      verified_date: '2026-11-10T00:00:00Z',
      search_aliases: [{ alias: `${slug} premium` }],
      ...overrides,
    },
  };
}

describe('getPublishedPolicies', () => {
  beforeEach(() => {
    emdash.getEmDashCollection.mockReset();
    emdash.getEmDashEntry.mockReset();
    emdash.getRequestContext.mockReset().mockReturnValue(null);
    emdash.runWithContext
      .mockReset()
      .mockImplementation(async (_context: unknown, operation: () => Promise<unknown>) => operation());
    emdash.isSafeHref.mockReset().mockImplementation((href: unknown) =>
      typeof href === 'string' && href.startsWith('https://'),
    );
  });

  it('requests only published records and excludes drafts returned by the provider', async () => {
    const candidates = [
      policyEntry('spotify'),
      policyEntry('draft-brand', {}, 'draft'),
    ];
    emdash.getEmDashCollection.mockImplementation(async (_collection: string, query: { status: string }) => ({
      entries: candidates.filter((candidate) => candidate.status === query.status),
      error: null,
    }));

    const policies = await getPublishedPolicies();

    expect(emdash.getEmDashCollection).toHaveBeenCalledWith(POLICY_COLLECTION, { status: 'published' });
    expect(policies.map((policy) => policy.brandSlug)).toEqual(['spotify']);
  });

  it('removes preview and edit mode from public collection reads', async () => {
    emdash.getRequestContext.mockReturnValue({
      editMode: true,
      preview: { token: 'editor-preview' },
      actor: 'editor',
    });
    emdash.getEmDashCollection.mockResolvedValue({ entries: [policyEntry('spotify')], error: null });

    await getPublishedPolicies();

    expect(emdash.runWithContext).toHaveBeenCalledTimes(1);
    expect(emdash.runWithContext).toHaveBeenCalledWith(
      { editMode: false, actor: 'editor' },
      expect.any(Function),
    );
  });

  it('skips malformed and future-dated entries without discarding valid records', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    emdash.getEmDashCollection.mockResolvedValue({
      entries: [
        policyEntry('spotify'),
        policyEntry('bad-category', { category: 'unknown' }),
        policyEntry('future-brand', { verified_date: '2999-01-01T00:00:00Z' }),
      ],
      error: null,
    });

    const policies = await getPublishedPolicies();

    expect(policies.map((policy) => policy.brandSlug)).toEqual(['spotify']);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('does not create a draft-visible context when the request has no editor preview', async () => {
    emdash.getEmDashCollection.mockResolvedValue({ entries: [policyEntry('spotify')], error: null });

    await getPublishedPolicies();

    expect(emdash.runWithContext).not.toHaveBeenCalled();
  });
});
