import { describe, expect, it } from 'vitest';
import { fetchPublishedWiki } from '../../../app/src/lib/wiki-cms-client.js';

const policy = {
  brandSlug: 'spotify',
  brandName: 'Spotify',
  category: 'subscription',
  statutoryWarrantyMonths: 0,
  commercialGuaranteeMonths: 0,
  cancellationNoticeMonths: 1,
  cancellationButtonCompliant: false,
  legalNotes: '',
  verifiedDate: '2026-11-10',
  searchAliases: ['Spotify'],
};

function responseWithLogoUrl(logoUrl: string) {
  const body = JSON.stringify({
    schemaVersion: 1,
    asOf: '2026-11-10T00:00:00Z',
    laws: [],
    glossary: [],
    quizzes: [],
    policies: [{ ...policy, logoUrl }],
  });
  return {
    ok: true,
    url: 'https://showcase.example.test/api/emdash/wiki',
    headers: new Headers({ 'content-length': String(body.length) }),
    body: null,
    text: async () => body,
  } as Response;
}

describe('published Wiki CMS client logo URLs', () => {
  it('resolves public relative logo routes against the showcase origin', async () => {
    const wiki = await fetchPublishedWiki('https://showcase.example.test/api/emdash/wiki', async () => responseWithLogoUrl('/api/brand-policy-logos/spotify'));

    expect(wiki.policies[0]?.logoUrl).toBe('https://showcase.example.test/api/brand-policy-logos/spotify');
  });

  it('rejects the protected native media route', async () => {
    await expect(fetchPublishedWiki('https://showcase.example.test/api/emdash/wiki', async () => responseWithLogoUrl('/_emdash/api/media/file/01ABC_logo.png')))
      .rejects.toThrow('Invalid Wiki policies entry');
  });
});
