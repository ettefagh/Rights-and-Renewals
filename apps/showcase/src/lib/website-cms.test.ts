import { beforeEach, describe, expect, it, vi } from 'vitest';

const emdash = vi.hoisted(() => ({
  getEmDashCollection: vi.fn(), getEmDashEntry: vi.fn(), getRequestContext: vi.fn(),
  isSafeHref: vi.fn((href: unknown) => typeof href === 'string' && (href.startsWith('/') || href.startsWith('https://'))),
  runWithContext: vi.fn(async (_context: unknown, operation: () => Promise<unknown>) => operation()),
}));
vi.mock('emdash', () => emdash);
import { getPublishedWebsitePages, getWebsitePageForRender, validateWebsiteBlocks } from './website-cms.js';

const page = (id: string, status = 'published', sections: unknown[] = []) => ({ id: `pages/${id}`, status, data: { title: id, sections } });

describe('website CMS content', () => {
  beforeEach(() => {
    emdash.getEmDashCollection.mockReset(); emdash.getEmDashEntry.mockReset();
    emdash.getRequestContext.mockReset().mockReturnValue(null);
    emdash.runWithContext.mockReset().mockImplementation(async (_ctx: unknown, operation: () => Promise<unknown>) => operation());
  });

  it('validates text and links while preserving approved block order and stable keys', () => {
    expect(validateWebsiteBlocks([
      { _type: 'copy_section', _key: 'first', heading: 'First', body: 'Text' },
      { _type: 'cta', _key: 'second', cta_id: 'join', cta_label: 'Join', cta_url: 'javascript:alert(1)' },
      { _type: 'hero', _key: 'third', heading: 'Last' },
      { _type: 'raw_html', html: '<script>bad()</script>' },
    ])).toEqual([
      { _type: 'copy_section', _key: 'first', heading: 'First', body: 'Text' },
      { _type: 'hero', _key: 'third', heading: 'Last' },
    ]);
  });

  it('only requests published page records and filters returned drafts', async () => {
    emdash.getEmDashCollection.mockResolvedValue({ entries: [page('home'), page('draft', 'draft')], error: null });
    await expect(getPublishedWebsitePages()).resolves.toMatchObject([{ id: 'home' }]);
    expect(emdash.getEmDashCollection).toHaveBeenCalledWith('pages', { status: 'published' });
  });

  it('uses native EmDash entry preview only for the authorized render context', async () => {
    emdash.getEmDashEntry.mockResolvedValue({ entry: page('agent-setup', 'draft', [{ _type: 'hero', _key: 'h1', heading: 'Draft heading' }]), isPreview: true, error: null });
    await expect(getWebsitePageForRender('agent-setup')).resolves.toMatchObject({ isPreview: true, sections: [{ heading: 'Draft heading' }] });
    expect(emdash.getEmDashEntry).toHaveBeenCalledWith('pages', 'agent-setup');
  });
});
