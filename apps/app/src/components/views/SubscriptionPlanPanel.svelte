<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fetchPublishedPlanProjection, fetchPublishedPlans, type PlanApplicabilityState, type PublishedPlanProjection, type PublishedPlanSummary } from '../../lib/policy-plan-client';
  import { getShowcaseUrl } from '../../lib/showcase-url';

  interface Props {
    planId?: string | undefined;
    lookupEnabled?: boolean | undefined;
    editable?: boolean | undefined;
  }

  let { planId = $bindable(), lookupEnabled = true, editable = true }: Props = $props();
  let plans = $state.raw<PublishedPlanSummary[]>([]);
  let catalogStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let country = $state('');
  let contractDate = $state('');
  let channel = $state('');
  let projection = $state.raw<PublishedPlanProjection | null>(null);
  let lookupStatus = $state<'idle' | 'loading' | 'ready' | 'error' | 'expired'>('idle');
  let lookupRequest = 0;
  let reviewTimer: ReturnType<typeof setInterval> | undefined;

  onDestroy(() => {
    if (reviewTimer) clearInterval(reviewTimer);
  });

  function clearProjection() {
    lookupRequest += 1;
    projection = null;
    lookupStatus = 'idle';
    if (reviewTimer) clearInterval(reviewTimer);
    reviewTimer = undefined;
  }

  async function loadCatalog() {
    clearProjection();
    catalogStatus = 'loading';
    try {
      plans = await fetchPublishedPlans(getShowcaseUrl('/api/emdash/plans'));
      catalogStatus = 'ready';
    } catch {
      plans = [];
      catalogStatus = 'error';
    }
  }

  async function checkPlan() {
    if (!planId) return;
    clearProjection();
    const requestId = lookupRequest;
    lookupStatus = 'loading';
    try {
      const nextProjection = await fetchPublishedPlanProjection(
        getShowcaseUrl('/api/emdash/plans'),
        planId,
        {
          ...(country.trim() ? { country: country.trim().toUpperCase() } : {}),
          ...(contractDate ? { contractDate } : {}),
          ...(channel ? { channel: channel as 'web' | 'app' | 'phone' | 'in_person' | 'other' } : {}),
        },
      );
      if (requestId !== lookupRequest) return;
      projection = nextProjection;
      lookupStatus = 'ready';
      if (nextProjection.findings.length > 0) {
        reviewTimer = setInterval(() => {
          if (projection?.findings.some((finding) => Date.parse(finding.reviewExpiresAt) <= Date.now())) {
            clearProjection();
            lookupStatus = 'expired';
          }
        }, 5000);
      }
    } catch {
      if (requestId === lookupRequest) lookupStatus = 'error';
    }
  }

  function selectPlan(value: string) {
    clearProjection();
    planId = value || undefined;
  }

  function clearForContextChange() {
    if (lookupStatus !== 'idle') clearProjection();
  }

  function findingLabel(state: string): string {
    const labels: Record<string, string> = {
      no_issue_identified: 'No issue identified in the reviewed terms',
      missing_required_disclosure: 'Missing required disclosure',
      implementation_gap: 'Implementation gap',
      possible_conflict: 'Possible conflict',
      unresolved: 'Unresolved',
      not_assessed: 'Not assessed',
    };
    return labels[state] ?? 'Review status unavailable';
  }

  function resultMessage(state: PlanApplicabilityState, reason?: string, truncated = false): string {
    if (truncated) return 'The published result is incomplete. Findings are hidden until a complete result is available.';
    if (state === 'ambiguous' || reason === 'multiple_matching_offers' || reason === 'multiple_approved_assessments') {
      return 'The catalog result is ambiguous. No findings are shown.';
    }
    if (state === 'needs_information') return 'The published catalog needs more information for this context. No findings are shown.';
    if (state === 'not_applicable') return 'No published finding applies to this selected context.';
    return 'No current protected findings are published for this plan and context.';
  }
</script>

<section class="plan-panel" aria-label="Published subscription plan lookup">
  {#if editable}
    <div class="plan-heading">
      <div>
        <p class="plan-eyebrow">Optional published lookup</p>
        <h3>Link the exact plan</h3>
        <p class="plan-note">Choose a plan from the published catalog. Provider names do not select a plan for you.</p>
      </div>
      <button type="button" class="plan-load" onclick={loadCatalog} disabled={catalogStatus === 'loading'}>
        {catalogStatus === 'loading' ? 'Loading…' : catalogStatus === 'ready' ? 'Refresh plans' : 'Browse plans'}
      </button>
    </div>
  {:else if planId}
    <p class="plan-eyebrow">Linked catalog plan</p>
    <p class="plan-summary">Plan identifier: {planId}. Change the link in Edit.</p>
  {/if}

  {#if editable && catalogStatus === 'error'}
    <p class="plan-status" role="status">The published plan catalog is unavailable. Your wallet entry remains available offline.</p>
  {:else if editable && catalogStatus === 'ready'}
    <label class="plan-field">
      <span>Published plan</span>
      <select value={planId ?? ''} onchange={(event) => selectPlan(event.currentTarget.value)}>
        <option value="">No catalog plan selected</option>
        {#each plans as plan (plan.id)}
          <option value={plan.id}>{plan.title}</option>
        {/each}
      </select>
    </label>
    {#if planId}
      {@const selectedPlan = plans.find((plan) => plan.id === planId)}
      {#if selectedPlan?.summary}
        <p class="plan-summary">{selectedPlan.summary}</p>
      {/if}
    {/if}
    {#if plans.length === 0}
      <p class="plan-status" role="status">No published plans are currently available in the catalog.</p>
    {/if}
  {/if}

  {#if lookupEnabled && planId}
    <div class="context-fields">
      <label class="plan-field country-field">
        <span>Country (optional)</span>
        <input bind:value={country} oninput={clearForContextChange} maxlength="2" autocomplete="country" placeholder="DE" />
      </label>
      <label class="plan-field">
        <span>Contract date (optional)</span>
        <input bind:value={contractDate} oninput={clearForContextChange} type="date" />
      </label>
      <label class="plan-field">
        <span>Signup channel (optional)</span>
        <select bind:value={channel} onchange={clearForContextChange}>
          <option value="">Not specified</option>
          <option value="web">Website</option>
          <option value="app">App</option>
          <option value="phone">Phone</option>
          <option value="in_person">In person</option>
          <option value="other">Other</option>
        </select>
      </label>
    </div>
    <button type="button" class="plan-check" onclick={checkPlan} disabled={lookupStatus === 'loading'}>
      {lookupStatus === 'loading' ? 'Checking published findings…' : 'Check published findings'}
    </button>

    {#if lookupStatus === 'error'}
      <p class="plan-status" role="status">The published lookup is unavailable or could not be validated. No findings are shown.</p>
    {:else if lookupStatus === 'expired'}
      <p class="plan-status" role="status">The review period has expired. Run a new lookup for current findings.</p>
    {:else if lookupStatus === 'ready' && projection}
      {#if projection.truncated || projection.applicability !== 'applicable' || projection.findings.length === 0}
        <p class="plan-status" role="status">{resultMessage(projection.applicability, projection.reason, projection.truncated)}</p>
      {:else}
        <ul class="plan-findings" aria-label="Current protected findings">
          {#each projection.findings as finding (`${finding.assessmentId}:${finding.ruleVersionId}`)}
            <li>
              <strong>{findingLabel(finding.findingState)}</strong>
              <span>{finding.rule.statement}</span>
              <span class="finding-review">Reviewed {new Date(finding.reviewedAt).toLocaleDateString()} · current through {new Date(finding.reviewExpiresAt).toLocaleDateString()}</span>
              <a href={finding.rule.sourceUrl} target="_blank" rel="noopener noreferrer">Published rule source</a>
            </li>
          {/each}
        </ul>
        <p class="plan-caveat">These are current protected catalog findings for the selected plan and context, not a decision about your individual contract or legal position.</p>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .plan-panel { display: grid; gap: 12px; padding: 16px; border: 1px solid #d9e3df; border-radius: 14px; background: #f7faf8; }
  .plan-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .plan-heading h3 { margin: 2px 0 4px; color: #203e37; font-size: 15px; }
  .plan-eyebrow { margin: 0; color: #55756b; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .plan-note, .plan-summary, .plan-status, .plan-caveat { margin: 0; color: #50655e; font-size: 12px; line-height: 1.5; }
  .plan-load, .plan-check { min-height: 40px; border: 1px solid #245a4b; border-radius: 9px; padding: 0 12px; background: #fff; color: #245a4b; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
  .plan-check { justify-self: start; background: #245a4b; color: #fff; }
  .plan-load:disabled, .plan-check:disabled { opacity: .6; cursor: wait; }
  .plan-field { display: grid; gap: 5px; min-width: 0; color: #405950; font-size: 11px; font-weight: 700; }
  .plan-field select, .plan-field input { width: 100%; min-height: 40px; border: 1px solid #bdcbc5; border-radius: 8px; padding: 0 10px; background: #fff; color: #233a33; font: inherit; font-size: 13px; }
  .context-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .plan-findings { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .plan-findings li { display: grid; gap: 5px; padding: 12px; border-left: 3px solid #d96b4b; border-radius: 8px; background: #fff; color: #405950; font-size: 12px; line-height: 1.45; }
  .plan-findings strong { color: #713b2d; font-size: 13px; }
  .plan-findings a { color: #17644f; font-weight: 700; }
  .finding-review { color: #60746c; font-size: 11px; }
  .plan-caveat { font-size: 11px; }
  @media (max-width: 620px) {
    .plan-heading { flex-direction: column; }
    .context-fields { grid-template-columns: 1fr; }
  }
</style>
