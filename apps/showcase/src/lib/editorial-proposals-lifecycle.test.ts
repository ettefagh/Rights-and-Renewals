import { describe, expect, it, vi } from 'vitest';
import {
  createEmDashEditorialProposalHost,
} from './editorial-proposals-plugin';
import {
  EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  type ProposalAuditEvent,
  type ProposalDraft,
  type ProposalState,
} from './editorial-proposals';

const proposal = {
  contractVersion: EDITORIAL_PROPOSAL_CONTRACT_VERSION,
  title: 'Update opening hours',
  body: 'Add the verified opening hours.',
  kind: 'new_draft',
  targetCollection: 'pages',
  idempotencyKey: 'proposal-lifecycle-key-001',
} as const;

type TestRecord = {
  ownerId: string;
  createdAt: string;
  proposalState: ProposalState;
  targetRevision: string | null;
  bodyDigest: string;
  payloadDigest: string;
  draft: ProposalDraft;
  audit: ProposalAuditEvent[];
};

function record(): TestRecord {
  const draft: ProposalDraft = {
    id: 'proposal-1', ownerId: 'contributor-1', status: 'draft',
    revision: 'payload-revision', proposal,
  };
  return {
    ownerId: draft.ownerId,
    createdAt: '2026-11-11T10:00:00.000Z',
    proposalState: 'pending',
    targetRevision: null,
    bodyDigest: 'body-digest',
    payloadDigest: 'payload-digest',
    draft,
    audit: [],
  };
}

function runtime(storage: Record<string, unknown>) {
  return { storage: { proposals: storage } } as never;
}

describe('EmDash editorial proposal lifecycle host', () => {
  it('passes the opaque storage revision unchanged to compare-and-set', async () => {
    const revision = 'opaque:version/07?token=a-b_c';
    const compareAndSet = vi.fn(async () => ({ applied: true, revision: 'next-revision' }));
    const host = createEmDashEditorialProposalHost(runtime({
      getVersioned: vi.fn(async () => ({ value: record(), revision })), compareAndSet,
    }));
    await host.resolveReviewerDraft('editor-1', 'proposal-1', {
      action: 'rejected', expectedStorageRevision: revision,
    });
    expect(compareAndSet).toHaveBeenCalledWith('proposal-1', revision, expect.any(Object));
  });

  it('conflicts on stale revision or non-pending state without writing', async () => {
    for (const versioned of [
      { value: record(), revision: 'current' },
      { value: { ...record(), proposalState: 'archived' }, revision: 'expected' },
    ]) {
      const compareAndSet = vi.fn();
      const host = createEmDashEditorialProposalHost(runtime({
        getVersioned: vi.fn(async () => versioned), compareAndSet,
      }));
      expect(await host.resolveReviewerDraft('editor-1', 'proposal-1', {
        action: 'rejected', expectedStorageRevision: 'expected',
      })).toBeNull();
      expect(compareAndSet).not.toHaveBeenCalled();
    }
  });

  it('allows one concurrent resolution and preserves the winning actor audit', async () => {
    let current = record();
    let revision = 'revision-1';
    const compareAndSet = vi.fn(async (_id: string, expected: string | null, next: TestRecord) => {
      if (expected !== revision) return { applied: false };
      current = next;
      revision = 'revision-2';
      return { applied: true, revision };
    });
    const host = createEmDashEditorialProposalHost(runtime({
      getVersioned: vi.fn(async () => ({ value: current, revision })), compareAndSet,
    }));
    const outcomes = await Promise.all([
      host.resolveReviewerDraft('editor-a', 'proposal-1', { action: 'rejected', expectedStorageRevision: 'revision-1' }),
      host.resolveReviewerDraft('editor-b', 'proposal-1', { action: 'archived', expectedStorageRevision: 'revision-1' }),
    ]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(current.audit).toHaveLength(1);
    expect(['editor-a', 'editor-b']).toContain(current.audit[0]?.actorId);
    expect(compareAndSet).toHaveBeenCalledTimes(2);
  });

  it('records explicit applied target metadata without changing draft or proposal payload', async () => {
    const original = record();
    const compareAndSet = vi.fn(async (_id: string, _expected: string | null, _data: TestRecord) => ({ applied: true, revision: 'revision-2' }));
    const host = createEmDashEditorialProposalHost(runtime({
      getVersioned: vi.fn(async () => ({ value: original, revision: 'revision-1' })), compareAndSet,
    }));
    const result = await host.resolveReviewerDraft('editor-1', 'proposal-1', {
      action: 'applied', expectedStorageRevision: 'revision-1',
      appliedTargetId: 'page-9', appliedTargetRevision: 'content-rev-22',
    });
    const next = compareAndSet.mock.calls[0]?.[2];
    expect(next?.audit[0]).toMatchObject({ actorId: 'editor-1', action: 'applied', targetId: 'page-9', targetRevision: 'content-rev-22' });
    expect(next?.draft).toEqual(original.draft);
    expect(result).toMatchObject({ proposalState: 'applied', storageRevision: 'revision-2', proposal: original.draft.proposal });
  });

  it('forwards opaque reviewer cursors and page metadata', async () => {
    const cursor = 'next::cursor/+opaque';
    const query = vi.fn(async () => ({ items: [], cursor, hasMore: true }));
    const host = createEmDashEditorialProposalHost(runtime({ query }));
    expect(await host.listReviewerDrafts(20, 'previous::cursor/+opaque')).toEqual({ items: [], cursor, hasMore: true });
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'previous::cursor/+opaque' }));
  });
});
