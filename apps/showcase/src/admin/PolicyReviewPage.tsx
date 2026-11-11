import * as React from 'react';
import {
  approveExactRevision,
  listAssessments,
  loadAssessmentContext,
  loadReviewState,
  type AssessmentContext,
  type AssessmentSummary,
  type ReviewState,
} from '../lib/policy-review-api.js';

function dateLabel(value: unknown): string {
  if (typeof value !== 'string') return 'Not set';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function assessmentStatus(item: AssessmentSummary): string {
  const expiry = item.data.review_expires_at;
  if (typeof expiry !== 'string' || !Number.isFinite(Date.parse(expiry))) return 'Review date missing';
  if (Date.parse(expiry) <= Date.now()) return 'Review expired';
  return item.status === 'published' ? 'Published' : item.status === 'scheduled' ? 'Scheduled' : 'Draft';
}

function safeSourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function ReviewSources({ sources }: { sources: ReviewState['sources'] }) {
  return <section aria-labelledby="review-sources-title">
    <h3 id="review-sources-title" className="font-semibold">Linked published sources</h3>
    <p>These snapshots are the sources checked by the review service for this assessment.</p>
    {sources.length === 0 ? <p>Source snapshots are unavailable. Reload the review before approving.</p> : <ul className="space-y-4">
      {sources.map((source) => <li key={`${source.collection}:${source.id}`}>
        <h4><a href={`/_emdash/admin/content/${encodeURIComponent(source.collection)}/${encodeURIComponent(source.id)}`}>{source.title}</a></h4>
        <p>{source.collection === 'policy_offer_versions' ? 'Offer terms' : source.collection === 'policy_rule_versions' ? 'Applicable rule' : 'Evidence'} · Version {source.revision}</p>
        <p className="whitespace-pre-wrap">{source.statement || 'No excerpt is recorded. Open the source entry to inspect it.'}</p>
        {safeSourceUrl(source.sourceUrl) && <p><a href={safeSourceUrl(source.sourceUrl)} target="_blank" rel="noopener noreferrer">Open cited source</a></p>}
        <details><summary>Snapshot fingerprint</summary><code className="break-all">{source.contentHash}</code></details>
      </li>)}
    </ul>}
  </section>;
}

function displayValue(value: unknown): string {
  if (value === undefined) return 'Not present';
  if (value === null) return 'None';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function changedFields(context: AssessmentContext) {
  const live = context.compare.live ?? {};
  const draft = context.compare.draft ?? {};
  const keys = new Set([...Object.keys(live), ...Object.keys(draft)]);
  return [...keys].filter((key) => JSON.stringify(live[key]) !== JSON.stringify(draft[key]));
}

function currentReviewStatus(state: ReviewState | null): string {
  if (!state?.currentApproval) return 'Review needed';
  return Date.parse(state.currentApproval.expiresAt) > Date.now() ? 'Review record exists' : 'Review expired';
}

export function PolicyReviewPage() {
  const [assessments, setAssessments] = React.useState<AssessmentSummary[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [state, setState] = React.useState<ReviewState | null>(null);
  const [context, setContext] = React.useState<AssessmentContext | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const selectionRequest = React.useRef(0);

  const refreshList = React.useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      setAssessments(await listAssessments());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load assessments.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => { void refreshList(); }, [refreshList]);

  const selectAssessment = React.useCallback(async (id: string) => {
    const requestId = ++selectionRequest.current;
    setSelectedId(id);
    setState(null);
    setContext(null);
    setConfirmed(false);
    setNotice('');
    setError('');
    if (!id) return;
    setLoadingDetails(true);
    try {
      const [review, details] = await Promise.all([loadReviewState(id), loadAssessmentContext(id)]);
      if (requestId !== selectionRequest.current) return;
      setState(review);
      setContext(details);
    } catch (cause) {
      if (requestId !== selectionRequest.current) return;
      setError(cause instanceof Error ? cause.message : 'Could not load the selected assessment.');
    } finally {
      if (requestId === selectionRequest.current) setLoadingDetails(false);
    }
  }, []);

  const reloadSelected = async () => {
    await refreshList();
    if (selectedId) await selectAssessment(selectedId);
  };

  const approve = async () => {
    if (!state || !confirmed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await approveExactRevision(state);
      setConfirmed(false);
      await refreshList();
      await selectAssessment(state.assessmentId);
      setNotice(`Review recorded at ${dateLabel(result.approvedAt)}. This did not publish the assessment.`);
    } catch (cause) {
      setError(cause instanceof Error
        ? `The review was refused: ${cause.message} Reload the review details before retrying.`
        : 'The review was refused. Reload the review details before retrying.');
    } finally {
      setSaving(false);
    }
  };

  const reviewDate = state?.assessment.review_expires_at;
  const reviewDateTimestamp = typeof reviewDate === 'string' ? Date.parse(reviewDate) : Number.NaN;
  const reviewUnavailable = !Number.isFinite(reviewDateTimestamp) || reviewDateTimestamp <= Date.now();
  const selectedItem = assessments.find((item) => item.id === selectedId);
  const editorHref = selectedId ? `/_emdash/admin/content/policy_assessments/${encodeURIComponent(selectedId)}` : '';

  return (
    <section className="space-y-6" aria-labelledby="policy-review-title">
      <header className="space-y-2">
        <h1 id="policy-review-title" className="text-2xl font-semibold">Policy assessment review</h1>
        <p>Check the assessment, its linked offer and sources, and the current review period. A review records a decision for this exact revision; publishing remains a separate step in the content editor.</p>
        <button type="button" onClick={() => void reloadSelected()} disabled={loadingList || loadingDetails || saving}>
          Refresh assessments
        </button>
      </header>

      {error && <p role="alert" className="text-kumo-danger">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <section aria-labelledby="assessments-heading" className="space-y-3">
        <h2 id="assessments-heading" className="text-xl font-semibold">Assessments</h2>
        {loadingList ? <p role="status" aria-live="polite">Loading assessments…</p> : assessments.length === 0 ? <p>No assessments are available to review yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Policy assessments and review status</caption>
              <thead><tr><th scope="col">Assessment</th><th scope="col">Offer</th><th scope="col">Finding</th><th scope="col">Content</th><th scope="col">Review</th><th scope="col">Review period ends</th></tr></thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <th scope="row"><button type="button" aria-pressed={selectedId === item.id} disabled={saving} onClick={() => void selectAssessment(item.id)}>{String(item.data.title ?? item.slug ?? item.id)}</button></th>
                    <td>{String(item.data.offer_label ?? item.data.offer_version_label ?? 'Open to inspect')}</td>
                    <td>{String(item.data.finding_state ?? 'Not stated')}</td>
                    <td>{assessmentStatus(item)}</td>
                    <td>{selectedId === item.id && state ? currentReviewStatus(state) : 'Select to check'}</td>
                    <td>{dateLabel(item.data.review_expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedId && <section aria-labelledby="review-details-heading" className="space-y-4">
        <h2 id="review-details-heading" className="text-xl font-semibold">Selected assessment</h2>
        {loadingDetails ? <p role="status" aria-live="polite">Loading exact revision and linked sources…</p> : state && context ? <>
          <p><strong>Content status:</strong> {assessmentStatus(selectedItem ?? { id: selectedId, status: context.item.status, data: state.assessment })}</p>
          <p><strong>Review period:</strong> {dateLabel(state.assessment.reviewed_at)} through {dateLabel(state.assessment.review_expires_at)}{reviewUnavailable ? ' · unavailable or expired; request a fresh assessment review' : ''}</p>
          <ReviewSources sources={state.sources ?? []} />
          {state.currentApproval && <p role="status">A review record exists through {dateLabel(state.currentApproval.expiresAt)}. The server checks whether it still matches this assessment and its linked sources.</p>}
          <details>
            <summary>Review details and revision comparison</summary>
            <h3 className="mt-3 font-semibold">Assessment details</h3>
            <dl>{Object.entries(state.assessment).filter(([key]) => !['revision_hash', 'offer_version', 'rule_versions', 'evidence'].includes(key)).map(([key, value]) => <React.Fragment key={key}><dt className="font-medium">{key.replaceAll('_', ' ')}</dt><dd>{typeof value === 'string' ? value : JSON.stringify(value)}</dd></React.Fragment>)}</dl>
            <h3 className="mt-3 font-semibold">Linked evidence revisions</h3>
            {state.dependencies.length ? <ul>{state.dependencies.map((dependency) => <li key={dependency.id}>{dependency.id} · {dependency.revision}</li>)}</ul> : <p>No linked revisions were returned.</p>}
            <h3 className="mt-3 font-semibold">Content revision comparison</h3>
            {!context.compare.hasChanges ? <p>No pending draft changes are recorded against the published version.</p> : changedFields(context).length ? <div className="overflow-x-auto"><table className="w-full text-left"><caption>Fields that differ between the published version and current draft</caption><thead><tr><th scope="col">Field</th><th scope="col">Published</th><th scope="col">Draft</th></tr></thead><tbody>{changedFields(context).map((key) => <tr key={key}><th scope="row">{key === '_references' ? 'Linked entries' : key.replaceAll('_', ' ')}</th><td>{key === '_references' ? 'Open the content editor to review linked entries' : displayValue(context.compare.live?.[key])}</td><td>{key === '_references' ? 'Open the content editor to review linked entries' : displayValue(context.compare.draft?.[key])}</td></tr>)}</tbody></table></div> : <p>The current draft differs from the published version only in linked entries. Review the linked offer and sources above and use the native content editor for details.</p>}
          </details>
          <p><a href={editorHref}>Open assessment in the native content editor</a></p>
          <fieldset className="space-y-2" disabled={saving || reviewUnavailable || !state.sources?.length}>
            <legend className="font-semibold">Record a review</legend>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} />
              <span>I reviewed this assessment and its linked published sources for the revision shown above.</span>
            </label>
            <button type="button" disabled={!confirmed || saving || !state} onClick={() => void approve()}>
              {saving ? 'Recording review…' : 'Confirm review of this revision'}
            </button>
          </fieldset>
          <p>Approval checks reviewer permissions, author separation, and whether the assessment and linked sources have changed. Publishing must be completed separately in the native content editor.</p>
        </> : !loadingDetails && <p>Select an assessment to load its review details.</p>}
      </section>}
    </section>
  );
}
