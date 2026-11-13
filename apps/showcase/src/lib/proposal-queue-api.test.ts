import { afterEach, describe, expect, it, vi } from 'vitest';
import { listPendingProposals, proposalTargetHref, resolveProposal } from './proposal-queue-api.js';
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
        { id: 'draft-1', ownerId: 'editorial-author-2', status: 'draft', revision: 'digest-1', proposal,
          proposalState: 'pending', storageRevision: 'storage-revision-1', audit: [] },
      ], hasMore: true, cursor: 'opaque-next-page' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetch);

    await expect(listPendingProposals()).resolves.toMatchObject({
      items: [{ id: 'draft-1', ownerId: 'editorial-author-2', status: 'draft', proposal,
        proposalState: 'pending', storageRevision: 'storage-revision-1' }],
      hasMore: true, cursor: 'opaque-next-page',
    });
    expect(String(fetch.mock.calls[0]?.[0])).toBe('/_emdash/api/plugins/cmlab-editorial-proposals/listReviewerDrafts');
  });

  it('rejects malformed queue records rather than rendering them as proposals', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { items: [{ id: 'bad' }], hasMore: false } }), { status: 200 })));
    await expect(listPendingProposals()).rejects.toThrow('invalid record');
  });

  it('sends cursor pagination and reports lifecycle CAS conflicts', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: {
      ok: false, code: 'conflict',
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(listPendingProposals({ cursor: 'opaque-cursor' })).rejects.toThrow('invalid response');
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ limit: 50, cursor: 'opaque-cursor' });

    await expect(resolveProposal('proposal-1', {
      action: 'rejected', expectedStorageRevision: 'stale-revision',
    })).rejects.toThrow('changed while you were reviewing');
    expect(String(fetch.mock.calls[1]?.[0])).toBe('/_emdash/api/plugins/cmlab-editorial-proposals/resolveProposal');
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
      proposalId: 'proposal-1', action: 'rejected', expectedStorageRevision: 'stale-revision',
    });
  });

  it('links only allowlisted collection targets with safe encoded IDs', () => {
    expect(proposalTargetHref(proposal)).toBe('/_emdash/admin/content/pages/service_page-1');
    expect(proposalTargetHref({ ...proposal, targetId: 'id with spaces' })).toBeNull();
    expect(proposalTargetHref({ ...proposal, targetCollection: 'admin_users' as never })).toBeNull();
  });
});
