import { afterEach, describe, expect, it, vi } from 'vitest';
import { listPendingProposals, proposalTargetHref } from './proposal-queue-api.js';
import { EDITORIAL_PROPOSAL_CONTRACT_VERSION, type EditorialProposalInput } from './editorial-proposals.js';

const proposal: EditorialProposalInput = {
  contractVersion: EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  title: 'Update service page',
  body: 'Add the updated opening hours.',
  kind: 'revision_suggestion',
  targetCollection: 'pages',
  targetId: 'service_page-1',
  expectedRevision: 'revision-4',
  idempotencyKey: 'proposal-retry-key-000001',
};

afterEach(() => vi.unstubAllGlobals());

describe('proposal queue API', () => {
  it('uses the private reviewer route and unwraps the EmDash data response', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('X-EmDash-Request')).toBe('1');
      expect(JSON.parse(String(init?.body))).toEqual({ limit: 50 });
      return new Response(JSON.stringify({ success: true, data: { items: [
        { id: 'draft-1', ownerId: 'editorial-author-2', status: 'draft', revision: 'digest-1', proposal },
      ] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetch);

    await expect(listPendingProposals()).resolves.toMatchObject([
      { id: 'draft-1', ownerId: 'editorial-author-2', status: 'draft', proposal },
    ]);
    expect(String(fetch.mock.calls[0]?.[0])).toBe('/_emdash/api/plugins/cmlab-editorial-proposals/listReviewerDrafts');
  });

  it('rejects malformed queue records rather than rendering them as proposals', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { items: [{ id: 'bad' }] } }), { status: 200 })));
    await expect(listPendingProposals()).rejects.toThrow('invalid record');
  });

  it('links only allowlisted collection targets with safe encoded IDs', () => {
    expect(proposalTargetHref(proposal)).toBe('/_emdash/admin/content/pages/service_page-1');
    expect(proposalTargetHref({ ...proposal, targetId: 'id with spaces' })).toBeNull();
    expect(proposalTargetHref({ ...proposal, targetCollection: 'admin_users' as never })).toBeNull();
  });
});
