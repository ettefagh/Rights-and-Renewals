import * as React from 'react';
import { listPendingProposals, proposalTargetHref, resolveProposal } from '../lib/proposal-queue-api.js';
import type { ProposalQueueItem, ProposalQueuePage, ProposalResolutionAction } from '../lib/editorial-proposals.js';

function kindLabel(kind: ProposalQueueItem['proposal']['kind']): string {
  return kind === 'new_draft' ? 'New draft proposal' : 'Revision suggestion';
}

export function ProposalQueuePage() {
  const [page, setPage] = React.useState<ProposalQueuePage>({ items: [], hasMore: false });
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      setPage(await listPendingProposals());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load editorial proposals.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = React.useCallback(async () => {
    if (!page.cursor || loading) return;
    setLoading(true);
    setError('');
    try {
      const next = await listPendingProposals({ cursor: page.cursor });
      setPage((current) => ({ ...next, items: [...current.items, ...next.items] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more proposals.');
    } finally {
      setLoading(false);
    }
  }, [loading, page.cursor]);

  const resolve = React.useCallback(async (entry: ProposalQueueItem, action: ProposalResolutionAction, appliedTargetId?: string, appliedTargetRevision?: string) => {
    setBusyId(entry.id);
    setError('');
    setNotice('');
    try {
      await resolveProposal(entry.id, {
        action,
        expectedStorageRevision: entry.storageRevision,
        ...(action === 'applied' && appliedTargetId && appliedTargetRevision ? { appliedTargetId, appliedTargetRevision } : {}),
      });
      setPage((current) => ({ ...current, items: current.items.filter((item) => item.id !== entry.id) }));
      setNotice(action === 'applied'
        ? 'Applied attestation recorded with the reviewer supplied target ID and revision. CMS content was not changed by this action.'
        : `Proposal marked ${action}. CMS content was not changed by this action.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the proposal.');
    } finally {
      setBusyId('');
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className="space-y-6" aria-labelledby="proposal-queue-title">
      <header className="space-y-2">
        <h1 id="proposal-queue-title" className="text-2xl font-semibold">Editorial proposal queue</h1>
        <p>Review pending proposals submitted for human consideration. Rejecting, archiving, or recording an applied attestation updates only this queue; it never changes CMS content.</p>
        <button type="button" onClick={() => void refresh()} disabled={loading || Boolean(busyId)}>
          {loading ? 'Refreshing…' : 'Refresh proposals'}
        </button>
      </header>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" aria-live="polite">{notice}</p>}
      {loading && <p role="status" aria-live="polite">Loading pending proposals…</p>}
      {!loading && !error && page.items.length === 0 && <p>No pending proposals are available for review.</p>}

      {page.items.length > 0 && (
        <section aria-labelledby="pending-proposals-heading" className="space-y-4">
          <h2 id="pending-proposals-heading" className="text-xl font-semibold">Pending proposals ({page.items.length})</h2>
          <ol className="space-y-4">
            {page.items.map((entry) => {
              const targetHref = proposalTargetHref(entry.proposal);
              const busy = busyId === entry.id;
              return (
                <li key={entry.id} className="space-y-3 border-b pb-4">
                  <h3 className="text-lg font-semibold">{entry.proposal.title}</h3>
                  <p><strong>Type:</strong> {kindLabel(entry.proposal.kind)}</p>
                  <p><strong>Submitted by:</strong> {entry.ownerId}</p>
                  <p><strong>Target collection:</strong> {entry.proposal.targetCollection}</p>
                  {targetHref ? (
                    <p><strong>Target entry:</strong> <a href={targetHref}>{entry.proposal.targetId}</a></p>
                  ) : (
                    <p><strong>Target entry:</strong> None; this proposes a new draft.</p>
                  )}
                  {entry.proposal.expectedRevision && (
                    <p><strong>Target revision at submission:</strong> <code>{entry.proposal.expectedRevision}</code></p>
                  )}
                  <div>
                    <h4 className="font-semibold">Proposed content</h4>
                    <p className="whitespace-pre-wrap">{entry.proposal.body}</p>
                  </div>
                  <p className="text-sm">Queue record: {entry.id} · Draft only · Human review required</p>
                  <ResolutionControls entry={entry} disabled={busy || Boolean(busyId)} onResolve={resolve} />
                </li>
              );
            })}
          </ol>
          {page.hasMore && <button type="button" onClick={() => void loadMore()} disabled={loading || Boolean(busyId)}>
            {loading ? 'Loading…' : 'Load more proposals'}
          </button>}
        </section>
      )}
    </main>
  );
}

function ResolutionControls({
  entry,
  disabled,
  onResolve,
}: {
  entry: ProposalQueueItem;
  disabled: boolean;
  onResolve: (entry: ProposalQueueItem, action: ProposalResolutionAction, targetId?: string, targetRevision?: string) => Promise<void>;
}) {
  const [targetId, setTargetId] = React.useState(entry.proposal.targetId ?? '');
  const [targetRevision, setTargetRevision] = React.useState('');
  const [open, setOpen] = React.useState(false);
  return (
    <fieldset disabled={disabled} className="space-y-3 border p-3">
      <legend className="font-semibold">Record review outcome</legend>
      <button type="button" onClick={() => void onResolve(entry, 'rejected')}>Reject proposal</button>{' '}
      <button type="button" onClick={() => void onResolve(entry, 'archived')}>Archive proposal</button>{' '}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}>Record as applied</button>
      ) : (
        <div className="space-y-2">
          <p>Confirm that a human separately made this change in the native editor. This records an attestation only.</p>
          <label className="block">Applied target ID
            <input className="ml-2 border px-2" value={targetId} onChange={(event) => setTargetId(event.currentTarget.value)} required />
          </label>
          <label className="block">Applied target revision
            <input className="ml-2 border px-2" value={targetRevision} onChange={(event) => setTargetRevision(event.currentTarget.value)} required />
          </label>
          <button type="button" disabled={!targetId.trim() || !targetRevision.trim()} onClick={() => void onResolve(entry, 'applied', targetId.trim(), targetRevision.trim())}>
            Save applied attestation
          </button>{' '}
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
    </fieldset>
  );
}
