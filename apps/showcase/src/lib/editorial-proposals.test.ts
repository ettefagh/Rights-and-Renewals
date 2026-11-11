import { describe, expect, it, vi } from 'vitest';
import { PluginStorageRepository } from 'emdash';
import { proposalQueueStorage } from '../../scripts/proposal-catalog.mjs';
import {
  EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  addEditorialProposalsCollection,
  createEditorialProposalService,
  ProposalConflictError,
  type EditorialProposalHost,
} from './editorial-proposals';
import { createPlugin } from './editorial-proposals-plugin';

const actor = { id: 'user-contributor-1', role: 'contributor' };
const valid = {
  contractVersion: EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  title: 'Update service page',
  body: 'Please add the verified opening hours section.',
  kind: 'new_draft',
  targetCollection: 'pages',
  idempotencyKey: 'proposal-retry-key-000001',
} as const;

describe('editorial proposal service', () => {
  it('creates an EmDash native plugin with one narrow proposal tool and publication guards', async () => {
    const plugin = createPlugin();
    expect(Object.keys(plugin.mcp?.tools ?? {})).toEqual(['propose_draft']);
    expect(plugin.capabilities).toEqual(['hooks.content-policy:register', 'content:read']);
    expect(plugin.hooks['content:beforePublish']).toBeDefined();
    expect(plugin.hooks['content:beforeSchedule']).toBeDefined();
    expect(await plugin.hooks['content:beforePublish']!.handler({ collection: 'editorial_proposals' } as never, {} as never))
      .toMatchObject({ cancel: true });
    expect(await plugin.hooks['content:beforeSchedule']!.handler({ collection: 'editorial_proposals' } as never, {} as never))
      .toMatchObject({ cancel: true });
    expect(Object.keys(plugin.routes)).toEqual(['proposeDraft', 'listOwnDrafts', 'listReviewerDrafts']);
  });

  it('requires a host-authenticated contributor and fails closed without the ownership adapter', async () => {
    const service = createEditorialProposalService();
    expect(await service.propose(undefined, valid)).toEqual({ ok: false, code: 'unauthenticated' });
    expect(await service.propose({ id: 'admin', role: 'admin' }, valid)).toEqual({ ok: false, code: 'role_denied' });
    expect(await service.propose({ id: actor.id, role: 40 }, valid)).toEqual({ ok: false, code: 'role_denied' });
    expect(await service.propose({ id: actor.id, role: 20 }, valid)).toMatchObject({ ok: false, code: 'host_adapter_unavailable' });
    expect(await service.propose(actor, valid)).toEqual({ ok: false, code: 'host_adapter_unavailable' });
  });

  it('strictly rejects injected ownership, author, status, publication and approval fields', async () => {
    const createOwnedDraft = vi.fn();
    const host = { createOwnedDraft, listOwnDrafts: vi.fn() } as unknown as EditorialProposalHost;
    const service = createEditorialProposalService(host);
    for (const injection of [
      { authorId: 'attacker' }, { ownerId: 'attacker' }, { status: 'published' },
      { approved: true }, { approval: true }, { actorId: 'attacker' },
    ]) {
      expect(await service.propose(actor, { ...valid, ...injection })).toEqual({ ok: false, code: 'invalid_input' });
    }
    expect(createOwnedDraft).not.toHaveBeenCalled();
  });

  it('sets owner only from host identity and rejects adapter ownership/status violations', async () => {
    const createOwnedDraft = vi.fn(async (input) => ({
      kind: 'created' as const,
      draft: { id: 'draft-1', ownerId: input.actorId, status: 'draft' as const, revision: 'r1', proposal: valid },
    }));
    const service = createEditorialProposalService({ createOwnedDraft, listOwnDrafts: vi.fn() } as unknown as EditorialProposalHost);
    expect(await service.propose(actor, valid)).toMatchObject({ ok: true, draft: { ownerId: actor.id, status: 'draft' } });
    expect(createOwnedDraft).toHaveBeenCalledWith(expect.objectContaining({ actorId: actor.id, collection: 'editorial_proposals' }));

    const compromised = createEditorialProposalService({
      createOwnedDraft: async () => ({ kind: 'created', draft: { id: 'x', ownerId: 'other', status: 'published', revision: 'r1', proposal: valid } }),
      listOwnDrafts: vi.fn(),
    } as unknown as EditorialProposalHost);
    expect(await compromised.propose(actor, valid)).toEqual({ ok: false, code: 'conflict' });
  });

  it('delegates atomic retry handling and maps lock/revision conflicts without retrying', async () => {
    const createOwnedDraft = vi.fn()
      .mockResolvedValueOnce({ kind: 'created', draft: { id: 'draft-1', ownerId: actor.id, status: 'draft', revision: 'r1', proposal: valid } })
      .mockResolvedValueOnce({ kind: 'replayed', draft: { id: 'draft-1', ownerId: actor.id, status: 'draft', revision: 'r1', proposal: valid } })
      .mockRejectedValueOnce(new ProposalConflictError('revision conflict'));
    const service = createEditorialProposalService({ createOwnedDraft, listOwnDrafts: vi.fn() } as unknown as EditorialProposalHost);
    expect((await service.propose(actor, valid)).ok).toBe(true);
    expect(await service.propose(actor, valid)).toMatchObject({ ok: true, kind: 'replayed' });
    expect(await service.propose(actor, valid)).toEqual({ ok: false, code: 'conflict' });
    expect(createOwnedDraft).toHaveBeenCalledTimes(3);
  });

  it('does not let revision suggestions omit the expected revision or target id', async () => {
    const service = createEditorialProposalService({
      createOwnedDraft: vi.fn(), listOwnDrafts: vi.fn(), listReviewerDrafts: vi.fn(),
    });
    expect(await service.propose(actor, { ...valid, kind: 'revision_suggestion' })).toEqual({ ok: false, code: 'invalid_input' });
  });

  it('restricts the shared reviewer queue to authenticated editors and admins', async () => {
    const listReviewerDrafts = vi.fn(async () => []);
    const service = createEditorialProposalService({
      createOwnedDraft: vi.fn(), listOwnDrafts: vi.fn(), listReviewerDrafts,
    });
    expect(await service.listForReviewer(actor)).toEqual([]);
    expect(await service.listForReviewer(undefined)).toEqual([]);
    expect(listReviewerDrafts).not.toHaveBeenCalled();
    await service.listForReviewer({ id: 'editor-1', role: 40 });
    await service.listForReviewer({ id: 'admin-1', role: 'admin' });
    expect(listReviewerDrafts).toHaveBeenCalledTimes(2);
  });

  it('uses EmDash route context storage for draft-only proposal persistence', async () => {
    const compareAndSet = vi.fn(async () => ({ applied: true }));
    const plugin = createPlugin();
    const response = await plugin.routes.proposeDraft!.handler({
      input: valid,
      user: actor,
      storage: { proposals: { compareAndSet, get: vi.fn(), query: vi.fn() } },
    } as never);
    expect(response).toMatchObject({ ok: true, status: 'draft' });
    expect(compareAndSet).toHaveBeenCalledWith(expect.stringMatching(/^proposal-/), null, expect.objectContaining({
      ownerId: actor.id,
      proposalState: 'pending',
      draft: expect.objectContaining({ ownerId: actor.id, status: 'draft' }),
    }));
  });

  it('declares every indexed field used by both native proposal queue queries', async () => {
    const repository = new PluginStorageRepository(
      {
        getExecutor: () => ({ adapter: {} }),
        selectFrom: () => { throw new Error('native storage query reached database'); },
      } as never,
      'cmlab-editorial-proposals',
      'proposals',
      proposalQueueStorage.proposals.indexes,
    );

    await expect(repository.query({
      where: { ownerId: actor.id, proposalState: 'pending' },
      orderBy: { createdAt: 'desc' },
      limit: 50,
    })).rejects.toThrow('native storage query reached database');
    await expect(repository.query({
      where: { proposalState: 'pending' },
      orderBy: { createdAt: 'desc' },
      limit: 100,
    })).rejects.toThrow('native storage query reached database');
  });

  it('adds its collection without replacing existing collections or duplicating it', () => {
    const seed = { collections: [{ slug: 'pages' }] };
    const once = addEditorialProposalsCollection(seed);
    expect(once.collections).toHaveLength(2);
    expect(addEditorialProposalsCollection(once)).toBe(once);
  });
});
