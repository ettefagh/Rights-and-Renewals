import { getPublishedPolicies } from './policy-cms';
import { readPublishedPlanSummaries } from './policy-graph-cms';
import { loadLearningContent } from './learning-cms';
import { getPublishedWebsitePages } from './website-cms';
import type { PublishedEventRegistry } from './telemetry';

const MAX_IDS = 500;
export const telemetryRevision = async (value: unknown) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return `sha256-${[...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};
const safeId = (prefix: string, id: string) => `${prefix}:${id}`;

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
    const pageId = `page:${page.id}`;
    const revision = await telemetryRevision({ title: page.title, description: page.description ?? '', sections: page.sections });
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

  const addEntity = async (pageId: string, kind: string, id: string, content: unknown) => {
    const entityId = safeId(kind, id);
    entityIds.add(entityId);
    const revision = await telemetryRevision(content);
    revisions.add(revision);
    entityRevisions[entityId] = revision;
    pageChildren[pageId]?.entities.push(entityId);
  };
  const wikiPage = 'page:wiki';
  // Wiki routes are served by the site even when no editable CMS page exists.
  pageIds.add(wikiPage);
  pageRevisions[wikiPage] = await telemetryRevision({ route: '/wiki', title: 'Policy Wiki' });
  revisions.add(pageRevisions[wikiPage]);
  pageChildren[wikiPage] = { blocks: [], ctas: [], entities: [] };
  for (const policy of policies) {
    await addEntity(wikiPage, 'policy', policy.brandSlug, policy);
    const policyPage = `page:policy:${policy.brandSlug}`;
    const revision = entityRevisions[`policy:${policy.brandSlug}`]!;
    pageIds.add(policyPage);
    pageRevisions[policyPage] = revision;
    pageChildren[policyPage] = { blocks: [], ctas: [], entities: [`policy:${policy.brandSlug}`] };
  }
  for (const law of learning.laws) await addEntity(wikiPage, 'law', law.id, law);
  for (const term of learning.glossary) await addEntity(wikiPage, 'glossary', term.id, term);
  for (const quiz of learning.quizzes) await addEntity(wikiPage, 'quiz', quiz.id, quiz);

  const providers = [...new Set(policies.filter((policy) => policy.category === 'subscription').map((policy) => policy.brandSlug))].slice(0, MAX_IDS);
  const planLists = await Promise.all(providers.map((provider) => readPublishedPlanSummaries(provider, 12)));
  const plans = planLists.flat();
  if (plans.length > MAX_IDS) throw new Error('Published plan telemetry registry exceeds its bounded capacity');
  for (const plan of plans) {
    const routePageId = `page:plan:${plan.id}`;
    pageIds.add(routePageId);
    const revision = await telemetryRevision(plan);
    pageRevisions[routePageId] = revision;
    revisions.add(revision);
    pageChildren[routePageId] = { blocks: [], ctas: [], entities: [safeId('plan', plan.id)] };
    entityIds.add(safeId('plan', plan.id));
    revisions.add(revision);
    entityRevisions[safeId('plan', plan.id)] = revision;
  }

  if ([pageIds, entityIds, blockIds, ctaIds, revisions].some((set) => set.size > MAX_IDS)) {
    throw new Error('Published telemetry registry exceeds its bounded capacity');
  }
  return { pageIds, entityIds, blockIds, ctaIds, revisions, pageChildren, pageRevisions, entityRevisions };
}
