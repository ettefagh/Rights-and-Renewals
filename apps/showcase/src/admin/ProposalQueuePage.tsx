import * as React from 'react';
import { listPendingProposals, proposalTargetHref } from '../lib/proposal-queue-api.js';
import type { ProposalDraft } from '../lib/editorial-proposals.js';

function kindLabel(kind: ProposalDraft['proposal']['kind']): string {
  return kind === 'new_draft' ? 'New draft proposal' : 'Revision suggestion';
}

export function ProposalQueuePage() {
  const [proposals, setProposals] = React.useState<ProposalDraft[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProposals(await listPendingProposals());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load editorial proposals.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className="space-y-6" aria-labelledby="proposal-queue-title">
      <header className="space-y-2">
        <h1 id="proposal-queue-title" className="text-2xl font-semibold">Editorial proposal queue</h1>
        <p>Review up to 50 pending proposals submitted for human consideration. A proposal does not change CMS content; make any accepted change separately in the native editor.</p>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh proposals'}
        </button>
      </header>

      {error && <p role="alert">{error}</p>}
      {loading && <p role="status" aria-live="polite">Loading pending proposals…</p>}
      {!loading && !error && proposals.length === 0 && <p>No pending proposals are available for review.</p>}

      {!loading && proposals.length > 0 && (
        <section aria-labelledby="pending-proposals-heading" className="space-y-4">
          <h2 id="pending-proposals-heading" className="text-xl font-semibold">Pending proposals ({proposals.length})</h2>
          <ol className="space-y-4">
            {proposals.map((entry) => {
              const targetHref = proposalTargetHref(entry.proposal);
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
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </main>
  );
}
