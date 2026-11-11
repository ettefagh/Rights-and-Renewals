import { getEmDashCollection } from 'emdash';
import { getPublishedPolicies } from './policy-cms';
import { entryId, withPublicContext } from './policy-graph-cms';
import { loadLearningContent } from './learning-cms';
import { getPublishedWebsitePages } from './website-cms';
import type { PublishedEventRegistry } from './telemetry';
import {
  cmsPageTelemetryMetadata,
  fallbackPageTelemetryMetadata,
  planTelemetryMetadata,
  policyTelemetryMetadata,
  telemetryRevision,
  wikiTelemetryMetadata,
} from './telemetry-page-metadata';

const MAX_IDS = 500;
const PLAN_PAGE_SIZE = 100;
const safeId = (prefix: string, id: string) => `${prefix}:${id}`;

interface CmsPlanEntry {
  id: string;
  status?: string;
  data: Record<string, unknown>;
}

interface PublishedPlanSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

async function readPublishedPlanCatalog(): Promise<PublishedPlanSummary[]> {
  return withPublicContext(async () => {
    const plans: PublishedPlanSummary[] = [];
    const ids = new Set<string>();
    let cursor: string | undefined;

    for (let page = 0; page < Math.ceil(MAX_IDS / PLAN_PAGE_SIZE); page += 1) {
      const result = await getEmDashCollection('policy_plans', {
        status: 'published',
        limit: PLAN_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
      if (result.error) throw result.error;

      for (const raw of result.entries as CmsPlanEntry[]) {
        if (raw.status && raw.status !== 'published') continue;
        const id = entryId(raw);
        const slug = raw.id || String(raw.data.stable_key ?? id);
        if (ids.has(id)) throw new Error('Published plan catalog returned a duplicate ID.');
        ids.add(id);
        plans.push({
          id,
          slug,
          title: typeof raw.data.title === 'string' && raw.data.title ? raw.data.title
            : typeof raw.data.name === 'string' && raw.data.name ? raw.data.name : 'Untitled plan',
          summary: typeof raw.data.summary === 'string' ? raw.data.summary : '',
        });
        if (plans.length > MAX_IDS) throw new Error('Published plan telemetry registry exceeds its bounded capacity');
      }

      if (!result.hasMore) return plans;
      if (!result.nextCursor || result.nextCursor === cursor) throw new Error('Published plan telemetry catalog returned an invalid cursor.');
      if (page === Math.ceil(MAX_IDS / PLAN_PAGE_SIZE) - 1) throw new Error('Published plan telemetry registry exceeds its bounded capacity');
      cursor = result.nextCursor;
    }

    throw new Error('Published plan telemetry catalog exceeded its read bound.');
  });
}

export { telemetryRevision };

export async function buildPublishedEventRegistry(): Promise<PublishedEventRegistry> {
  const [pages, policies, learning] = await Promise.all([
    getPublishedWebsitePages(), getPublishedPolicies(), loadLearningContent(),
  ]);
  if (pages.length > MAX_IDS || policies.length > MAX_IDS || learning.laws.length + learning.glossary.length + learning.quizzes.length > MAX_IDS) {
    throw new Error('Published telemetry registry exceeds its bounded capacity');
  }

  const pageIds = new Set<string>();
  const entityIds = new Set<string>();
  const blockIds = new Set<string>();
  const ctaIds = new Set<string>();
  const revisions = new Set<string>();
  const pageChildren: Record<string, { blocks: string[]; ctas: string[]; entities: string[] }> = {};
  const pageRevisions: Record<string, string> = {};
  const entityRevisions: Record<string, string> = {};

  for (const page of pages) {
    const { pageId, revision } = await cmsPageTelemetryMetadata(page);
    pageIds.add(pageId);
    revisions.add(revision);
    pageRevisions[pageId] = revision;
    const children = { blocks: [] as string[], ctas: [] as string[], entities: [] as string[] };
    for (const section of page.sections) {
      if (!section._key) continue;
      const blockId = `block:${page.id}:${section._key}`;
      children.blocks.push(blockId);
      blockIds.add(blockId);
      if (typeof section.cta_id === 'string') {
        const ctaId = `cta:${page.id}:${section.cta_id}`;
        children.ctas.push(ctaId);
        ctaIds.add(ctaId);
      }
    }
    pageChildren[pageId] = children;
  }

  for (const id of ['home', 'agent-setup'] as const) {
    const fallback = await fallbackPageTelemetryMetadata(id);
    if (!pageIds.has(fallback.pageId)) {
      pageIds.add(fallback.pageId);
      revisions.add(fallback.revision);
      pageRevisions[fallback.pageId] = fallback.revision;
      pageChildren[fallback.pageId] = { blocks: [], ctas: [], entities: [] };
    }
    const actions = id === 'home' ? ['open-wallet', 'copy-curl'] : ['open-wallet', 'copy-prompt'];
    for (const action of actions) {
      const ctaId = `cta:${id}:${action}`;
      ctaIds.add(ctaId);
      if (!pageChildren[fallback.pageId]!.ctas.includes(ctaId)) pageChildren[fallback.pageId]!.ctas.push(ctaId);
    }
  }

  const addEntity = async (pageId: string, entityId: string, content: unknown, revision?: string) => {
    entityIds.add(entityId);
    const entityRevision = revision ?? await telemetryRevision(content);
    revisions.add(entityRevision);
    entityRevisions[entityId] = entityRevision;
    pageChildren[pageId]?.entities.push(entityId);
  };
  const wikiIdentity = await wikiTelemetryMetadata();
  const wikiPage = wikiIdentity.pageId;
  // Wiki routes are served by the site even when no editable CMS page exists.
  pageIds.add(wikiPage);
  pageRevisions[wikiPage] = wikiIdentity.revision;
  revisions.add(wikiIdentity.revision);
  pageChildren[wikiPage] = { blocks: [], ctas: [], entities: [] };
  for (const policy of policies) {
    const identity = await policyTelemetryMetadata(policy);
    await addEntity(wikiPage, identity.entityId, policy, identity.revision);
    pageIds.add(identity.pageId);
    pageRevisions[identity.pageId] = identity.revision;
    pageChildren[identity.pageId] = { blocks: [], ctas: [], entities: [identity.entityId] };
  }
  for (const law of learning.laws) await addEntity(wikiPage, safeId('law', law.id), law);
  for (const term of learning.glossary) await addEntity(wikiPage, safeId('glossary', term.id), term);
  for (const quiz of learning.quizzes) await addEntity(wikiPage, safeId('quiz', quiz.id), quiz);

  const plans = await readPublishedPlanCatalog();
  if (plans.length > MAX_IDS) throw new Error('Published plan telemetry registry exceeds its bounded capacity');
  for (const plan of plans) {
    const identity = await planTelemetryMetadata(plan);
    pageIds.add(identity.pageId);
    pageRevisions[identity.pageId] = identity.revision;
    revisions.add(identity.revision);
    pageChildren[identity.pageId] = { blocks: [], ctas: [], entities: [identity.entityId] };
    await addEntity(identity.pageId, identity.entityId, plan, identity.revision);
  }

  if ([pageIds, entityIds, blockIds, ctaIds, revisions].some((set) => set.size > MAX_IDS)) {
    throw new Error('Published telemetry registry exceeds its bounded capacity');
  }
  return { pageIds, entityIds, blockIds, ctaIds, revisions, pageChildren, pageRevisions, entityRevisions };
}
