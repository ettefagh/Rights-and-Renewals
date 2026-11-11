<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { policySeedData, getPolicyScope, type PolicyWikiEntry } from '@cmlab/core';
  import { ArrowLeft, BookOpen, Building2, ExternalLink, Search, Sparkles } from 'lucide-svelte';
  import BrandLogo from '../BrandLogo.svelte';
  import { getShowcaseUrl } from '../../lib/showcase-url';
  import {
    completionFor,
    completionPoints,
    fetchPublishedWiki,
    migrateQuizProgress,
    type PublishedQuiz,
    type PublishedWiki,
    type QuizProgress
  } from '../../lib/wiki-cms-client';
  import {
    WIKI_AS_OF,
    wikiGlossary,
    wikiLawGuides,
    wikiQuizzes
  } from './wikiContent';

  type WikiSection = 'rules' | 'archive' | 'quizzes';
  type UiQuiz = PublishedQuiz;

  interface Props {
    selectedCompanySlug?: string | null;
  }

  let { selectedCompanySlug = $bindable<string | null>(null) }: Props = $props();

  const sections: { id: WikiSection; label: string }[] = [
    { id: 'rules', label: 'Rules & Laws' },
    { id: 'archive', label: 'Company Archive' },
    { id: 'quizzes', label: 'Quick Quizzes' }
  ];

  const QUIZ_STORAGE_KEY = 'rights-renewals-wiki-quiz-v1';
  const bundledQuizzes: UiQuiz[] = wikiQuizzes.map((quiz) => ({
    ...quiz,
    contentVersion: 'bundled-quiz-v1',
    questions: quiz.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
      source: { ...question.source }
    }))
  }));

  function emptyQuizProgress(): QuizProgress {
    return { version: 2, completed: {} };
  }

  function loadQuizProgress() {
    try {
      if (typeof localStorage === 'undefined') return { progress: emptyQuizProgress(), available: false };
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return { progress: emptyQuizProgress(), available: true };

      return { progress: migrateQuizProgress(JSON.parse(raw)), available: true };
    } catch {
      return { progress: emptyQuizProgress(), available: false };
    }
  }

  const initialProgress = loadQuizProgress();
  let quizProgress = $state(initialProgress.progress);
  let canSaveQuizProgress = $state(initialProgress.available);
  let publishedWiki = $state<PublishedWiki | null>(null);
  let wikiStatus = $state<'loading' | 'published' | 'offline'>('loading');
  onMount(() => {
    void fetchPublishedWiki(getShowcaseUrl('/api/emdash/wiki'))
      .then((content) => {
        publishedWiki = content;
        wikiStatus = 'published';
      })
      .catch(() => {
        wikiStatus = 'offline';
      });
  });
  let lawGuides = $derived(publishedWiki ? publishedWiki.laws : wikiLawGuides);
  let glossaryItems = $derived(publishedWiki ? publishedWiki.glossary : wikiGlossary);
  let quizzes: UiQuiz[] = $derived(publishedWiki ? publishedWiki.quizzes : bundledQuizzes);
  let policyEntries = $derived(publishedWiki ? publishedWiki.policies : policySeedData);
  let companies = $derived(policyEntries.map((entry) => ({ entry, scope: getPolicyScope(entry.category, entry) })));
  let displayedAsOf = $derived(publishedWiki ? formatSnapshotDate(publishedWiki.asOf) : WIKI_AS_OF);
  function formatSnapshotDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  }
  let requestedSection = $state<WikiSection>(selectedCompanySlug ? 'archive' : 'rules');
  let activeSection = $derived(selectedCompanySlug ? 'archive' : requestedSection);
  let companyQuery = $state('');
  let lastCompanySlug: string | null = null;
  let detailBackButton = $state<HTMLButtonElement | null>(null);

  let visibleCompanies = $derived.by(() => {
    const query = companyQuery.trim().toLocaleLowerCase('en-US');
    if (!query) return companies;

    return companies.filter(({ entry }) => {
      const searchable = [entry.brandName, entry.brandSlug, entry.category, ...entry.searchAliases]
        .join(' ')
        .toLocaleLowerCase('en-US');
      return searchable.includes(query);
    });
  });

  let selectedCompany = $derived(
    companies.find(({ entry }) => entry.brandSlug === selectedCompanySlug) ?? null
  );
  let earnedPoints = $derived(completionPoints(quizProgress));

  let activeQuizId = $state<string | null>(null);
  let questionIndex = $state(0);
  let quizAnswers = $state<Record<number, string>>({});
  let selectedAnswer = $state<string | null>(null);
  let quizResult = $state<{ score: number; pointsAwarded: number; replay: boolean } | null>(null);

  let activeQuiz = $derived(quizzes.find((quiz) => quiz.id === activeQuizId) ?? null);
  let currentQuestion = $derived(activeQuiz?.questions[questionIndex] ?? null);
  let selectedOption = $derived(
    currentQuestion?.options.find((option) => option.id === selectedAnswer) ?? null
  );

  function selectSection(section: WikiSection) {
    requestedSection = section;
    if (section !== 'archive') selectedCompanySlug = null;
  }

  function openCompany(entry: PolicyWikiEntry) {
    lastCompanySlug = entry.brandSlug;
    selectedCompanySlug = entry.brandSlug;
    void tick().then(() => detailBackButton?.focus());
  }

  function closeCompany() {
    selectedCompanySlug = null;
    void tick().then(() => {
      if (typeof document === 'undefined') return;
      const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-testid^="wiki-company-"]'))
        .find((button) => button.getAttribute('data-testid') === `wiki-company-${lastCompanySlug}`);
      const search = document.querySelector<HTMLInputElement>('[data-testid="wiki-company-search"]');
      (trigger ?? search)?.focus();
    });
  }

  function handleWikiKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && selectedCompany) {
      event.preventDefault();
      closeCompany();
    }
  }

  function persistQuizProgress() {
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizProgress));
      canSaveQuizProgress = true;
    } catch {
      canSaveQuizProgress = false;
    }
  }

  function startQuiz(quizId: string) {
    requestedSection = 'quizzes';
    activeQuizId = quizId;
    questionIndex = 0;
    quizAnswers = {};
    selectedAnswer = null;
    quizResult = null;
  }

  function backToQuizzes() {
    activeQuizId = null;
    questionIndex = 0;
    quizAnswers = {};
    selectedAnswer = null;
    quizResult = null;
  }

  function submitAnswer() {
    const quiz = activeQuiz;
    const question = currentQuestion;
    if (!quiz || !question || !selectedAnswer) return;

    const answers = { ...quizAnswers, [questionIndex]: selectedAnswer };
    quizAnswers = answers;

    if (questionIndex + 1 < quiz.questions.length) {
      questionIndex += 1;
      selectedAnswer = null;
      return;
    }

    const score = quiz.questions.reduce(
      (total, current, index) => total + (answers[index] === current.correctOptionId ? 1 : 0),
      0
    );
    const replay = Boolean(completionFor(quizProgress, quiz.id));
    const pointsAwarded = replay ? 0 : 1;

    if (!replay) {
      quizProgress = { ...quizProgress, completed: { ...quizProgress.completed, [quiz.id]: { score, contentVersion: quiz.contentVersion } } };
      persistQuizProgress();
    }

    quizResult = { score, pointsAwarded, replay };
  }

  function quizCompletionLabel(quiz: UiQuiz) {
    const completion = completionFor(quizProgress, quiz.id);
    if (!completion) return 'Not completed';
    const updated = completion.contentVersion !== quiz.contentVersion;
    return `Completed · ${completion.score} correct${updated ? ' · content updated; points preserved' : ''}`;
  }
</script>

<svelte:window onkeydown={handleWikiKeydown} />

<section class="wiki-page" data-testid="wiki-view" aria-labelledby="wiki-title">
  <header class="wiki-heading">
    <div>
      <p class="wiki-eyebrow">Rights & Renewals · on this device</p>
      <h1 id="wiki-title">Consumer rights, explained</h1>
      <p class="wiki-intro">Clear, sourced guidance for subscriptions, purchases and receipts.</p>
    </div>
    <div class="wiki-updated" role="status" data-testid="wiki-source-status">
      <BookOpen size={18} aria-hidden="true" />
      <span>{wikiStatus === 'published'
        ? `Published CMS snapshot · ${displayedAsOf}`
        : wikiStatus === 'loading'
          ? 'Loading published guidance · bundled copy available'
          : `Bundled offline copy · sources reviewed ${WIKI_AS_OF}`}</span>
    </div>
  </header>

  <nav class="wiki-section-nav" aria-label="Wiki sections" data-testid="wiki-section-nav">
    {#each sections as section (section.id)}
      <button
        type="button"
        class:active={activeSection === section.id}
        aria-pressed={activeSection === section.id}
        data-testid={`wiki-section-tab-${section.id}`}
        onclick={() => selectSection(section.id)}
      >{section.label}</button>
    {/each}
  </nav>

  {#if activeSection === 'rules'}
    <section class="wiki-section" data-testid="wiki-rules" aria-labelledby="wiki-rules-title">
      <div class="section-intro">
        <div>
          <p class="wiki-eyebrow">Jurisdiction matters</p>
          <h2 id="wiki-rules-title">Rules & Laws</h2>
        </div>
        <p>German rules are identified as Germany. EU rules are labelled separately; national implementation and contract facts can change the result.</p>
      </div>

      <div class="law-guide-grid">
        {#each lawGuides as guide (guide.id)}
          <article class="law-guide">
            <p class="jurisdiction-label">{guide.jurisdiction}</p>
            <h3>{guide.title}</h3>
            <p class="guide-summary">{guide.summary}</p>
            <ul>
              {#each guide.takeaways as takeaway, index (`${guide.id}-${index}`)}
                <li>{takeaway}</li>
              {/each}
            </ul>
            <div class="source-links" aria-label={`Official sources for ${guide.title}`}>
              {#each guide.sources as source (source.url)}
                <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={13} aria-hidden="true" /></a>
              {/each}
            </div>
          </article>
        {/each}
        {#if lawGuides.length === 0}
          <p class="wiki-empty" data-testid="wiki-laws-empty">No published law guides are currently available.</p>
        {/if}
      </div>

      <section class="consumer-glossary" aria-labelledby="consumer-glossary-title">
        <div class="section-intro glossary-heading">
          <div>
            <p class="wiki-eyebrow">A few terms worth knowing</p>
            <h2 id="consumer-glossary-title">Consumer Rights Glossary</h2>
          </div>
          <p>Plain-language notes from the app. Follow the official sources for the rule that applies to your situation.</p>
        </div>
        <div class="glossary-grid">
          {#each glossaryItems as item (item.id)}
            <article class="glossary-entry" data-testid={`wiki-glossary-${item.id}`}>
              <p class="jurisdiction-label">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {#if item.sources.length > 0}
                <div class="source-links" aria-label={`Official sources for ${item.title}`}>
                  {#each item.sources as source (source.url)}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={13} aria-hidden="true" /></a>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
          {#if glossaryItems.length === 0}
            <p class="wiki-empty" data-testid="wiki-glossary-empty">No published glossary entries are currently available.</p>
          {/if}
        </div>
        <p class="wiki-disclaimer">General information only, not advice for an individual case. The linked legislation and applicable contract control.</p>
      </section>
    </section>
  {:else if activeSection === 'archive'}
    <section class="wiki-section" data-testid="wiki-archive" aria-labelledby="wiki-archive-title">
      <div class="section-intro archive-intro">
        <div>
          <p class="wiki-eyebrow">{publishedWiki ? 'Published company catalog' : 'Bundled company catalog'}</p>
          <h2 id="wiki-archive-title">Company Archive</h2>
        </div>
        <p>Search all {companies.length} cataloged companies. Statutory rights and provider terms are kept separate.</p>
      </div>

      <div class="archive-search-wrap">
        <label for="wiki-company-search">Search companies</label>
        <div class="archive-search">
          <Search size={18} aria-hidden="true" />
          <input
            id="wiki-company-search"
            type="search"
            placeholder="Company or product name"
            autocomplete="off"
            bind:value={companyQuery}
            data-testid="wiki-company-search"
          />
        </div>
        <p class="archive-count" aria-live="polite">{visibleCompanies.length} of {companies.length} companies</p>
      </div>

      {#if selectedCompany}
        {@const entry = selectedCompany.entry}
        {@const scope = selectedCompany.scope}
        <section class="company-detail" aria-labelledby="company-detail-title" data-testid={`wiki-company-detail-${entry.brandSlug}`}>
          <button
            type="button"
            class="back-button"
            bind:this={detailBackButton}
            onclick={closeCompany}
            data-testid="wiki-company-back"
          ><ArrowLeft size={17} aria-hidden="true" /> Back to archive</button>

          <div class="company-detail-heading">
            <BrandLogo slug={entry.brandSlug} brandName={entry.brandName} size={52} decorative class="company-mark large" />
            <div>
              <p class="jurisdiction-label">{entry.category === 'subscription' ? 'Subscription' : 'Consumer goods'}</p>
              <h3 id="company-detail-title">{entry.brandName}</h3>
            </div>
          </div>

          <div class="scope-panel">
            <h4>Statutory scope</h4>
            <p>{scope.legal_scope}</p>
            <div class="statute-pills">
              {#each scope.statutory_basis as statute (statute)}<span>{statute}</span>{/each}
            </div>
          </div>

          {#if scope.notes}
            <p class="provider-note">{scope.notes}</p>
          {:else if entry.category === 'subscription'}
            <p class="provider-note">Check your contract and billing provider for the cancellation procedure and effective date. Plan-specific terms are not asserted by this guide.</p>
          {:else}
            <p class="provider-note">A commercial guarantee is separate from statutory seller rights. Check the product and purchase-country terms; this guide does not assert a company-specific guarantee period.</p>
          {/if}

          <p class="catalog-date">Catalog record date: {entry.verifiedDate}. This is the bundled record date, not a fresh check of current provider terms.</p>

          <div class="company-policy-boundary">
            <strong>Company-specific policy</strong>
            <p>This catalog entry does not establish your plan, seller, billing route, current notice period or product guarantee. Check the terms tied to your account or purchase.</p>
          </div>

          {#if entry.cancellationUrl}
            <a class="catalog-action-link" href={entry.cancellationUrl} target="_blank" rel="noopener noreferrer">
              Open provider page <ExternalLink size={15} aria-hidden="true" />
            </a>
            <p class="link-caveat">Catalog link only. Confirm that it matches your plan and billing provider.</p>
          {/if}

          <div class="company-sources">
            <h4>Sources</h4>
            <div class="source-links">
              {#each scope.sources as source (source.url)}
                <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13} aria-hidden="true" /></a>
              {/each}
            </div>
          </div>
        </section>
      {:else}
        <div class="company-list" data-testid="wiki-company-list">
          {#each visibleCompanies as company (company.entry.brandSlug)}
            <button
              type="button"
              class="company-row"
              data-testid={`wiki-company-${company.entry.brandSlug}`}
              onclick={() => openCompany(company.entry)}
            >
              <BrandLogo slug={company.entry.brandSlug} brandName={company.entry.brandName} size={40} decorative class="company-mark" />
              <span class="company-copy">
                <strong>{company.entry.brandName}</strong>
                <span>{company.entry.category === 'subscription' ? 'Subscription' : 'Consumer goods'}</span>
              </span>
              <span class="company-arrow" aria-hidden="true">›</span>
            </button>
          {/each}
          {#if visibleCompanies.length === 0}
            <div class="archive-empty" data-testid="wiki-company-no-results">
              <Building2 size={22} aria-hidden="true" />
              <h3>{companies.length === 0 ? 'No published company entries' : 'No companies found'}</h3>
              <p>{companies.length === 0 ? 'There are no company entries in the current published snapshot.' : 'Try a company name or one of its product aliases.'}</p>
            </div>
          {/if}
        </div>
      {/if}
    </section>
  {:else}
    <section class="wiki-section" data-testid="wiki-quizzes" aria-labelledby="wiki-quizzes-title">
      <div class="section-intro quiz-intro">
        <div>
          <p class="wiki-eyebrow">Learn by doing</p>
          <h2 id="wiki-quizzes-title">Quick Quizzes</h2>
        </div>
        <p>Short, practical quizzes. Your progress and first-completion points are saved on this device.</p>
      </div>

      <div class="quiz-score-strip" aria-live="polite" role="status" data-testid="wiki-quiz-total-points">
        <Sparkles size={17} aria-hidden="true" />
        <strong>{earnedPoints} completion points earned</strong>
        <span>{canSaveQuizProgress ? 'Saved on this device' : 'Local storage is unavailable; progress may not persist'}</span>
      </div>

      {#if activeQuiz && quizResult}
        <section class="quiz-panel quiz-result" aria-labelledby="quiz-result-title" data-testid={`wiki-quiz-result-${activeQuiz.id}`}>
          <p class="jurisdiction-label">{activeQuiz.title}</p>
          <h3 id="quiz-result-title">You scored {quizResult.score} of {activeQuiz.questions.length} questions</h3>
          {#if quizResult.replay}
            <p>You earned no additional points on this replay. Each quiz awards points only on its first completed run.</p>
          {:else}
            <p>You earned {quizResult.pointsAwarded} completion point for finishing this quiz.</p>
          {/if}
          <p class="saved-score">Total: {earnedPoints} completion points. {canSaveQuizProgress ? 'Your completion is saved on this device.' : 'Browser storage is unavailable, so this completion may not persist.'}</p>
          <div class="quiz-result-actions">
            <button type="button" class="quiz-primary" onclick={() => startQuiz(activeQuiz.id)}>Play again</button>
            <button type="button" class="quiz-secondary" onclick={backToQuizzes}>All quizzes</button>
          </div>
        </section>
      {:else if activeQuiz && currentQuestion}
        <section class="quiz-panel" aria-labelledby="current-quiz-title" data-testid={`wiki-quiz-${activeQuiz.id}`}>
          <button type="button" class="back-button" onclick={backToQuizzes}><ArrowLeft size={17} aria-hidden="true" /> All quizzes</button>
          <div class="quiz-question-heading">
            <div>
              <p class="jurisdiction-label">{activeQuiz.title}</p>
              <h3 id="current-quiz-title">{currentQuestion.prompt}</h3>
            </div>
            <span class="question-number">{questionIndex + 1} / {activeQuiz.questions.length}</span>
          </div>

          <fieldset class="quiz-options">
            <legend>Choose one answer</legend>
            {#each currentQuestion.options as option (option.id)}
              <label class="quiz-option" class:selected={selectedAnswer === option.id}>
                <input type="radio" name={`quiz-${activeQuiz.id}-${currentQuestion.id}`} value={option.id} bind:group={selectedAnswer} />
                <span class="option-letter" aria-hidden="true">{option.id.toUpperCase()}</span>
                <span>{option.label}</span>
              </label>
            {/each}
          </fieldset>

          {#if selectedOption}
            <div class="quiz-feedback" role="status" aria-live="polite" class:correct={selectedOption.id === currentQuestion.correctOptionId}>
              <strong>{selectedOption.id === currentQuestion.correctOptionId ? 'Correct.' : 'Not quite.'}</strong>
              <span>{currentQuestion.explanation}</span>
              <a href={currentQuestion.source.url} target="_blank" rel="noopener noreferrer">Read {currentQuestion.source.label}<ExternalLink size={13} aria-hidden="true" /></a>
            </div>
          {/if}

          <div class="quiz-navigation">
            <span>Question {questionIndex + 1} of {activeQuiz.questions.length}</span>
            <button type="button" class="quiz-primary" disabled={!selectedAnswer} onclick={submitAnswer}>
              {questionIndex + 1 === activeQuiz.questions.length ? 'Finish quiz' : 'Continue'}
            </button>
          </div>
        </section>
      {:else}
        <div class="quiz-card-grid" data-testid="wiki-quiz-list">
          {#each quizzes as quiz (quiz.id)}
            <article class="quiz-card" data-testid={`wiki-quiz-card-${quiz.id}`}>
              <p class="jurisdiction-label">{quiz.questions.length} questions · choose from the answers</p>
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
              <div class="quiz-card-footer">
                <span>{quizCompletionLabel(quiz)}</span>
                <button type="button" class="quiz-primary" data-testid={`wiki-quiz-start-${quiz.id}`} onclick={() => startQuiz(quiz.id)}>
                  {completionFor(quizProgress, quiz.id) ? 'Replay quiz' : 'Start quiz'}
                </button>
              </div>
            </article>
          {/each}
          {#if quizzes.length === 0}
            <p class="wiki-empty" data-testid="wiki-quizzes-empty">No published quizzes are currently available. Your saved completions remain on this device.</p>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
</section>

<style>
  .wiki-page { width: 100%; display: flex; flex-direction: column; gap: 20px; padding: 4px 0 28px; color: var(--color-text-primary, #15211e); }
  .wiki-heading, .section-intro, .company-detail-heading, .quiz-question-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
  .wiki-heading { align-items: center; padding: 18px 2px 4px; }
  .wiki-eyebrow, .jurisdiction-label { margin: 0 0 7px; color: #58716a; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .wiki-heading h1, .section-intro h2, .company-detail-heading h3, .quiz-question-heading h3, .law-guide h3, .glossary-entry h3, .quiz-card h3, .quiz-result h3 { margin: 0; color: var(--color-text-primary, #15211e); letter-spacing: -.025em; }
  .wiki-heading h1 { font-size: clamp(26px, 3vw, 36px); line-height: 1.12; }
  .wiki-intro { margin: 9px 0 0; color: #596863; font-size: 15px; }
  .wiki-updated { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; padding: 11px 13px; border: 1px solid #dce6e1; border-radius: 999px; background: #fff; color: #476158; font-size: 12px; font-weight: 650; }
  .wiki-updated :global(svg) { color: #16735a; }
  .wiki-section-nav { display: flex; align-items: center; gap: 6px; padding: 5px; border: 1px solid #dce6e1; border-radius: 18px; background: #eaf0ed; width: fit-content; max-width: 100%; }
  .wiki-section-nav button { min-height: 48px; padding: 0 18px; border: 0; border-radius: 13px; background: transparent; color: #40534d; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .wiki-section-nav button.active { background: #fff; color: #145640; box-shadow: 0 2px 8px rgba(31, 62, 50, .1); }
  .wiki-section-nav button:focus-visible, .company-row:focus-visible, .back-button:focus-visible, .quiz-primary:focus-visible, .quiz-secondary:focus-visible, .catalog-action-link:focus-visible, .source-links a:focus-visible { outline: 3px solid #17775e; outline-offset: 2px; }
  .wiki-section { display: flex; flex-direction: column; gap: 18px; }
  .wiki-empty { margin: 0; padding: 18px; border: 1px dashed #cbd9d2; border-radius: 14px; color: #63766e; font-size: 13px; line-height: 1.5; }
  .section-intro { align-items: flex-end; margin: 2px 2px 0; }
  .section-intro h2 { font-size: 25px; line-height: 1.15; }
  .section-intro > p { max-width: 610px; margin: 0; color: #596863; font-size: 13px; line-height: 1.55; }
  .law-guide-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .law-guide, .glossary-entry, .quiz-card, .quiz-panel, .scope-panel { min-width: 0; border: 1px solid #dfe8e4; border-radius: 18px; background: #fff; box-shadow: 0 5px 18px rgba(25, 53, 44, .035); }
  .law-guide { display: flex; flex-direction: column; align-items: flex-start; padding: 20px; }
  .law-guide h3, .glossary-entry h3, .quiz-card h3 { font-size: 18px; line-height: 1.25; }
  .guide-summary { margin: 10px 0 0; color: #4b5c56; font-size: 13px; line-height: 1.55; }
  .law-guide ul { display: grid; gap: 8px; margin: 13px 0 17px; padding-left: 18px; color: #32433d; font-size: 13px; line-height: 1.5; }
  .law-guide li::marker { color: #16735a; }
  .source-links { display: flex; flex-wrap: wrap; gap: 7px; margin-top: auto; }
  .source-links a { display: inline-flex; align-items: center; gap: 5px; min-height: 36px; padding: 6px 9px; border: 1px solid #dbe7e2; border-radius: 10px; color: #145640; background: #f5f9f7; font-size: 11px; font-weight: 700; text-decoration: none; }
  .source-links a:hover { border-color: #a8c8bb; background: #edf6f1; }
  .consumer-glossary { display: flex; flex-direction: column; gap: 13px; margin-top: 10px; padding-top: 20px; border-top: 1px solid #dce6e1; }
  .glossary-heading { margin-bottom: 2px; }
  .glossary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .glossary-entry { display: flex; flex-direction: column; align-items: flex-start; padding: 18px; }
  .glossary-entry > p:not(.jurisdiction-label) { margin: 10px 0 17px; color: #4b5c56; font-size: 13px; line-height: 1.55; }
  .wiki-disclaimer { margin: 0; color: #697a74; font-size: 11px; line-height: 1.5; }
  .archive-intro { margin-bottom: 2px; }
  .archive-search-wrap { max-width: 660px; }
  .archive-search-wrap > label { display: block; margin-bottom: 7px; color: #334a42; font-size: 12px; font-weight: 750; }
  .archive-search { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 14px; border: 1px solid #d3e0da; border-radius: 14px; background: #fff; color: #547068; }
  .archive-search:focus-within { border-color: #31806a; box-shadow: 0 0 0 3px rgba(49, 128, 106, .12); }
  .archive-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #15211e; font: inherit; font-size: 14px; }
  .archive-count { margin: 7px 0 0; color: #708078; font-size: 11px; }
  .company-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .company-row { display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 66px; padding: 10px 13px; border: 1px solid #dfe8e4; border-radius: 15px; background: #fff; color: inherit; text-align: left; font: inherit; cursor: pointer; transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
  .company-row:hover { border-color: #afcabe; box-shadow: 0 4px 12px rgba(25, 53, 44, .07); transform: translateY(-1px); }
  :global(.company-mark) { flex-basis: 40px; }
  :global(.company-mark.large) { flex-basis: 52px; }
  .company-copy { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
  .company-copy strong { overflow: hidden; color: #1c2e28; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
  .company-copy span { color: #708078; font-size: 11px; }
  .company-arrow { color: #537368; font-size: 25px; line-height: 1; }
  .archive-empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 40px 18px; border: 1px dashed #cbd9d2; border-radius: 16px; color: #63766e; text-align: center; }
  .archive-empty h3 { margin: 3px 0 0; color: #263a33; font-size: 16px; }
  .archive-empty p { margin: 0; font-size: 13px; }
  .company-detail { display: flex; flex-direction: column; gap: 15px; max-width: 900px; padding: 20px; border: 1px solid #dfe8e4; border-radius: 20px; background: #fff; }
  .back-button { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; min-height: 44px; padding: 0 11px; border: 1px solid #dce7e2; border-radius: 11px; background: #f8fbf9; color: #315349; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .company-detail-heading { justify-content: flex-start; align-items: center; gap: 13px; margin: 2px 0 4px; }
  .company-detail-heading .jurisdiction-label { margin-bottom: 4px; }
  .company-detail-heading h3 { font-size: 25px; }
  .scope-panel { padding: 17px; border-radius: 15px; background: #f6faf8; box-shadow: none; }
  .scope-panel h4, .company-sources h4 { margin: 0 0 7px; color: #263a33; font-size: 14px; }
  .scope-panel p, .provider-note, .company-policy-boundary p, .link-caveat { margin: 0; color: #4b5c56; font-size: 13px; line-height: 1.55; }
  .statute-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
  .statute-pills span { padding: 5px 8px; border: 1px solid #d8e5de; border-radius: 999px; background: #fff; color: #416258; font-size: 10px; font-weight: 750; }
  .provider-note { padding: 13px 15px; border-left: 3px solid #7db19c; border-radius: 0 11px 11px 0; background: #f4f8f5; }
  .catalog-date { margin: -8px 0 0; color: #76867e; font-size: 11px; line-height: 1.45; }
  .company-policy-boundary { padding: 13px 15px; border: 1px solid #e7e0ca; border-radius: 12px; background: #fbf9f1; }
  .company-policy-boundary strong { display: block; margin-bottom: 4px; color: #4b442d; font-size: 12px; }
  .catalog-action-link { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; min-height: 46px; padding: 0 14px; border-radius: 11px; background: #17644f; color: #fff; font-size: 12px; font-weight: 750; text-decoration: none; }
  .catalog-action-link:hover { background: #0f503d; }
  .link-caveat { margin-top: -10px; color: #728078; font-size: 11px; }
  .company-sources { padding-top: 3px; }
  .quiz-intro { margin-bottom: 1px; }
  .quiz-score-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; min-height: 50px; padding: 11px 14px; border: 1px solid #dce7e2; border-radius: 14px; background: #f5f9f7; color: #355b4d; }
  .quiz-score-strip :global(svg) { color: #1a7457; }
  .quiz-score-strip strong { font-size: 13px; }
  .quiz-score-strip span { margin-left: auto; color: #6c7c75; font-size: 11px; }
  .quiz-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .quiz-card { display: flex; flex-direction: column; align-items: flex-start; padding: 20px; }
  .quiz-card > p:not(.jurisdiction-label) { margin: 9px 0 18px; color: #55665f; font-size: 13px; line-height: 1.5; }
  .quiz-card-footer { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; margin-top: auto; padding-top: 13px; border-top: 1px solid #e7eeea; }
  .quiz-card-footer span { color: #6b7c75; font-size: 11px; }
  .quiz-panel { display: flex; flex-direction: column; gap: 17px; padding: clamp(18px, 3vw, 28px); }
  .quiz-question-heading { align-items: flex-start; }
  .quiz-question-heading h3 { max-width: 740px; font-size: clamp(19px, 2.2vw, 24px); line-height: 1.35; }
  .question-number { flex: 0 0 auto; padding: 7px 10px; border: 1px solid #dce7e2; border-radius: 999px; color: #416258; font-size: 11px; font-weight: 750; }
  .quiz-options { display: grid; gap: 8px; min-width: 0; margin: 0; padding: 0; border: 0; }
  .quiz-options legend { margin-bottom: 7px; color: #596b63; font-size: 12px; font-weight: 700; }
  .quiz-option { display: flex; align-items: center; gap: 11px; min-height: 56px; padding: 9px 12px; border: 1px solid #dce7e2; border-radius: 13px; background: #fff; color: #2f4039; font-size: 13px; line-height: 1.4; cursor: pointer; }
  .quiz-option.selected { border-color: #4a9979; background: #f0f8f3; box-shadow: 0 0 0 2px rgba(74, 153, 121, .12); }
  .quiz-option input { flex: 0 0 auto; width: 18px; height: 18px; accent-color: #17644f; }
  .option-letter { display: grid; place-items: center; flex: 0 0 27px; width: 27px; height: 27px; border-radius: 9px; background: #edf3ef; color: #48665a; font-size: 11px; font-weight: 800; }
  .quiz-feedback { display: grid; gap: 5px; padding: 13px 15px; border: 1px solid #ead6c8; border-radius: 12px; background: #fff8f3; color: #624335; font-size: 13px; line-height: 1.5; }
  .quiz-feedback.correct { border-color: #cfe4d6; background: #f2f9f4; color: #305a44; }
  .quiz-feedback a { display: inline-flex; align-items: center; gap: 5px; width: fit-content; margin-top: 3px; color: #145640; font-size: 11px; font-weight: 750; }
  .quiz-navigation { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 6px; }
  .quiz-navigation > span { color: #6a7c73; font-size: 11px; }
  .quiz-primary, .quiz-secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 17px; border: 1px solid transparent; border-radius: 12px; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
  .quiz-primary { background: #17644f; color: #fff; }
  .quiz-primary:hover:not(:disabled) { background: #0f503d; }
  .quiz-primary:disabled { background: #aebdb5; cursor: not-allowed; }
  .quiz-secondary { border-color: #dce7e2; background: #fff; color: #355b4d; }
  .quiz-result { max-width: 760px; padding: clamp(20px, 4vw, 34px); }
  .quiz-result h3 { font-size: 25px; }
  .quiz-result > p:not(.jurisdiction-label) { margin: 0; color: #4c5d56; font-size: 14px; line-height: 1.5; }
  .quiz-result .saved-score { color: #315b4c; font-weight: 700; }
  .quiz-result-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 4px; }
  @media (max-width: 900px) {
    .glossary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .company-list { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .wiki-page { gap: 15px; padding-top: 0; }
    .wiki-heading { align-items: flex-start; flex-direction: column; gap: 11px; padding-top: 8px; }
    .wiki-heading h1 { font-size: 27px; }
    .wiki-intro { font-size: 13px; line-height: 1.45; }
    .wiki-updated { min-height: 38px; padding: 7px 10px; font-size: 10px; }
    .wiki-section-nav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; gap: 3px; border-radius: 15px; }
    .wiki-section-nav button { min-height: 48px; padding: 5px 4px; border-radius: 11px; font-size: 10px; white-space: normal; }
    .section-intro { align-items: flex-start; flex-direction: column; gap: 8px; }
    .section-intro h2 { font-size: 22px; }
    .section-intro > p { font-size: 12px; }
    .law-guide-grid, .glossary-grid, .quiz-card-grid { grid-template-columns: 1fr; }
    .law-guide, .glossary-entry, .quiz-card { padding: 16px; }
    .company-detail { padding: 14px; }
    .company-detail-heading h3 { font-size: 22px; }
    .quiz-score-strip { align-items: flex-start; }
    .quiz-score-strip span { width: 100%; margin-left: 26px; }
    .quiz-question-heading { flex-direction: column; gap: 10px; }
    .quiz-option { min-height: 58px; }
    .quiz-navigation { align-items: stretch; }
    .quiz-navigation .quiz-primary { min-width: 130px; }
  }
</style>
