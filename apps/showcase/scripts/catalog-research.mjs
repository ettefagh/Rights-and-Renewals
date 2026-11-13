import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateSeed } from 'emdash/seed';
import { editorialCollections, editorialRelations } from './editorial-catalog.mjs';

const observedOn = '2026-11-11';
const source = (id, title, url, sourceKind, summary, limitation = null) => ({
  id, title, url, sourceKind, observedOn, summary, ...(limitation ? { limitation } : {}),
});

const sources = [
  source('netflix-de-plans', 'Netflix Germany plan comparison', 'https://www.netflix.com/de-de/browse/genre/81683021', 'product_observation', 'The Germany page lists Standard with ads at EUR 6.99/month (1080p), Standard at EUR 15.99/month (1080p, no ads), and Premium at EUR 21.99/month (4K/HDR, 3D audio, no ads).'),
  source('netflix-billing', 'Netflix registration help', 'https://help.netflix.com/de/node/112419', 'official_guidance', 'Netflix states that membership fees are charged monthly on the registration day.', 'General help-center guidance; signup and billing can depend on account/payment partner.'),
  source('icloud-de-plans', 'Apple Germany iCloud+ plans', 'https://www.apple.com/de/icloud/', 'product_observation', 'The Germany page lists 50 GB EUR 0.99/month, 200 GB EUR 2.99/month, 2 TB EUR 9.99/month, 6 TB EUR 29.99/month, and 12 TB EUR 59.99/month.'),
  source('bgb-312k', 'German Civil Code section 312k', 'https://www.gesetze-im-internet.de/bgb/__312k.html', 'official_law', 'Section 312k sets cancellation-button and confirmation-flow duties for qualifying paid continuing contracts that consumers can conclude through a website; paragraph 6 provides a no-notice cancellation consequence when required controls are unavailable.', 'General statutory text only. Coverage, exemptions, facts, and any provider-specific compliance require separate review.'),
];

const record = (collection, slug, data, sourceIds) => ({
  collection,
  id: `${collection}-${slug}`,
  slug,
  status: 'draft',
  observedOn,
  sourceIds,
  data,
});

const entries = [];
const edges = [];
function add(collection, slug, data, sourceIds) {
  entries.push(record(collection, slug, data, sourceIds));
  return slug;
}
function edge(relation, parentCollection, parentSlug, childCollection, childSlug) {
  edges.push({ relation, parent: { collection: parentCollection, slug: parentSlug }, child: { collection: childCollection, slug: childSlug } });
}

const providerTargets = {
  netflix: { collection: 'policy_providers', slug: 'netflix', id: 'policy_providers-netflix' },
  apple: { collection: 'policy_providers', slug: 'apple', id: 'policy_providers-apple' },
};
const services = [
  { provider: 'netflix', slug: 'netflix-streaming', title: 'Netflix streaming', summary: 'Subscription streaming service; Germany plan prices observed on 2026-11-11.' },
  { provider: 'apple', slug: 'icloud-plus', title: 'Apple iCloud+', summary: 'Cloud storage subscription; Germany plan prices observed on 2026-11-11.' },
];
for (const service of services) {
  add('policy_services', service.slug, { title: service.title, summary: service.summary, stable_key: `service:${service.slug}` }, service.provider === 'netflix' ? ['netflix-de-plans'] : ['icloud-de-plans']);
  edge('provider_services', 'policy_providers', service.provider, 'policy_services', service.slug);
}

const plans = [
  { service: 'netflix-streaming', slug: 'netflix-standard-with-ads', title: 'Standard with ads', price: '6.99', details: 'EUR 6.99 per month; 1080p; advertising is included.' },
  { service: 'netflix-streaming', slug: 'netflix-standard', title: 'Standard', price: '15.99', details: 'EUR 15.99 per month; 1080p; no ads.' },
  { service: 'netflix-streaming', slug: 'netflix-premium', title: 'Premium', price: '21.99', details: 'EUR 21.99 per month; 4K and HDR; 3D audio; no ads.' },
  { service: 'icloud-plus', slug: 'icloud-50gb', title: 'iCloud+ 50 GB', price: '0.99', details: 'EUR 0.99 per month; 50 GB storage.' },
  { service: 'icloud-plus', slug: 'icloud-200gb', title: 'iCloud+ 200 GB', price: '2.99', details: 'EUR 2.99 per month; 200 GB storage.' },
  { service: 'icloud-plus', slug: 'icloud-2tb', title: 'iCloud+ 2 TB', price: '9.99', details: 'EUR 9.99 per month; 2 TB storage.' },
  { service: 'icloud-plus', slug: 'icloud-6tb', title: 'iCloud+ 6 TB', price: '29.99', details: 'EUR 29.99 per month; 6 TB storage.' },
  { service: 'icloud-plus', slug: 'icloud-12tb', title: 'iCloud+ 12 TB', price: '59.99', details: 'EUR 59.99 per month; 12 TB storage.' },
];
for (const plan of plans) {
  const provider = plan.service === 'netflix-streaming' ? 'netflix' : 'apple';
  const sourceIds = [provider === 'netflix' ? 'netflix-de-plans' : 'icloud-de-plans'];
  add('policy_plans', plan.slug, { title: plan.title, summary: plan.details, stable_key: `plan:${plan.slug}` }, sourceIds);
  edge('service_plans', 'policy_services', plan.service, 'policy_plans', plan.slug);
  const offerSlug = `${plan.slug}-monthly-de`;
  add('policy_offers', offerSlug, { title: `${plan.title} — Germany monthly price`, summary: plan.details, stable_key: `offer:${offerSlug}`, offer_key: `${provider}:de:${plan.slug}:monthly` }, sourceIds);
  edge('plan_offers', 'policy_plans', plan.slug, 'policy_offers', offerSlug);
  const versionSlug = `${offerSlug}-observed-2026-11-11`;
  add('policy_offer_versions', versionSlug, {
    title: `Observed ${observedOn}`,
    version_key: `offer-version:${versionSlug}`,
    offer: offerSlug,
    terms_statement: `${plan.details} Observed on ${observedOn}. This is a source-backed price observation, not a complete contract-terms summary.`,
    source_url: sources.find(({ id }) => id === sourceIds[0]).url,
    observed_at: `${observedOn}T00:00:00.000Z`,
    applicability_country: 'DE',
    applicability_customer: 'consumer',
  }, sourceIds);
  edge('offer_versions', 'policy_offers', offerSlug, 'policy_offer_versions', versionSlug);
}

add('policy_rules', 'bgb-312k-online-cancellation', {
  title: 'BGB section 312k online cancellation requirements',
  summary: 'General statutory rule for qualifying paid continuing contracts consumers can conclude through a website; applicability is not assessed for any provider.',
  stable_key: 'rule:bgb-312k-online-cancellation',
  rule_key: 'DE:BGB:312k',
  official_source_url: 'https://www.gesetze-im-internet.de/bgb/__312k.html',
}, ['bgb-312k']);
add('policy_rule_versions', 'bgb-312k-online-cancellation-observed-2026-11-11', {
  title: 'BGB § 312k text observed 2026-11-11',
  version_key: 'rule-version:DE:BGB:312k:2026-11-11',
  rule: 'bgb-312k-online-cancellation',
  statement: 'For qualifying paid continuing contracts that consumers can conclude through a website, § 312k requires a continuously available, easily accessible cancellation button and confirmation flow. If the required controls are not provided, paragraph 6 allows cancellation at any time without a notice period. This records the statutory text only and does not determine coverage or compliance for a particular contract.',
  source_url: 'https://www.gesetze-im-internet.de/bgb/__312k.html',
  observed_at: `${observedOn}T00:00:00.000Z`,
  applicability_country: 'DE',
  applicability_customer: 'consumer',
}, ['bgb-312k']);
edge('rule_versions', 'policy_rules', 'bgb-312k-online-cancellation', 'policy_rule_versions', 'bgb-312k-online-cancellation-observed-2026-11-11');

for (const item of sources) {
  add('policy_evidence', item.id, {
    title: item.title,
    stable_key: `evidence:${item.id}`,
    evidence_kind: item.sourceKind,
    public_excerpt: item.summary,
    internal_notes: item.limitation ?? 'Observed from the official source on 2026-11-11; this is source evidence, not an assessment.',
    source_url: item.url,
    observed_at: `${observedOn}T00:00:00.000Z`,
  }, [item.id]);
}

export function buildCatalogResearch() {
  return {
    artifactVersion: 1,
    status: 'draft',
    observedOn,
    purpose: 'Source-backed draft catalog research. Not approved for import or publication; no provider assessment is included.',
    sources,
    entries,
    relations: edges,
  };
}

export async function validateCatalogResearch(catalog = buildCatalogResearch()) {
  const errors = [];
  const sourceIds = new Set(catalog.sources?.map(({ id }) => id));
  const relations = new Map(editorialRelations.map((item) => [item.slug, item]));
  const byEntry = new Map();
  const seedUrl = new URL('../seed/seed.json', import.meta.url);
  const seed = JSON.parse(await readFile(seedUrl, 'utf8'));
  for (const entry of catalog.entries ?? []) {
    if (entry.status !== 'draft') errors.push(`${entry.collection}/${entry.slug} must remain draft.`);
    if (entry.observedOn !== catalog.observedOn) errors.push(`${entry.collection}/${entry.slug} is missing the catalog observation date.`);
    if (!Array.isArray(entry.sourceIds) || entry.sourceIds.length === 0 || entry.sourceIds.some((id) => !sourceIds.has(id))) errors.push(`${entry.collection}/${entry.slug} must cite known source IDs.`);
    const collection = editorialCollections.find(({ slug }) => slug === entry.collection);
    if (!collection) { errors.push(`Unknown editorial collection ${entry.collection}.`); continue; }
    const fields = new Set(collection.fields.map(({ slug }) => slug));
    for (const key of Object.keys(entry.data ?? {})) if (!fields.has(key)) errors.push(`${entry.collection}/${entry.slug} has unknown schema field ${key}.`);
    if (byEntry.has(`${entry.collection}/${entry.slug}`)) errors.push(`Duplicate entry ${entry.collection}/${entry.slug}.`);
    byEntry.set(`${entry.collection}/${entry.slug}`, entry);
    const existing = (seed.content?.[entry.collection] ?? []).find(({ slug }) => slug === entry.slug);
    if (existing) errors.push(`Draft slug already exists in active seed: ${entry.collection}/${entry.slug}.`);
    if (entry.collection === 'policy_assessments') errors.push('This research artifact must not contain assessments.');
    (seed.content[entry.collection] ??= []).push({ id: entry.id, slug: entry.slug, status: 'draft', data: entry.data });
  }
  for (const item of catalog.sources ?? []) {
    try { const url = new URL(item.url); if (url.protocol !== 'https:') errors.push(`Source ${item.id} must use HTTPS.`); } catch { errors.push(`Source ${item.id} has an invalid URL.`); }
    if (item.observedOn !== catalog.observedOn) errors.push(`Source ${item.id} is missing the catalog observation date.`);
  }
  for (const edgeItem of catalog.relations ?? []) {
    const definition = relations.get(edgeItem.relation);
    if (!definition) { errors.push(`Unknown relation ${edgeItem.relation}.`); continue; }
    if (edgeItem.parent.collection !== definition.parentCollection || edgeItem.child.collection !== definition.childCollection) errors.push(`Relation ${edgeItem.relation} does not match its editorial schema endpoints.`);
    for (const endpoint of [edgeItem.parent, edgeItem.child]) {
      const isExternalProvider = endpoint.collection === 'policy_providers' && seed.content.policy_providers?.some(({ slug }) => slug === endpoint.slug);
      if (!isExternalProvider && !byEntry.has(`${endpoint.collection}/${endpoint.slug}`)) errors.push(`Missing relation endpoint ${endpoint.collection}/${endpoint.slug}.`);
    }
  }
  const result = validateSeed(seed);
  if (!result.valid) errors.push(...result.errors);
  return { valid: errors.length === 0, errors };
}

const artifactUrl = new URL('../seed/catalog-research-2026-11-11.json', import.meta.url);
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--write')) {
    await writeFile(artifactUrl, `${JSON.stringify(buildCatalogResearch(), null, 2)}\n`, 'utf8');
  }
  const catalog = JSON.parse(await readFile(artifactUrl, 'utf8'));
  const validation = await validateCatalogResearch(catalog);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  process.stdout.write(`Valid draft research catalog: ${catalog.entries.length} entries, ${catalog.relations.length} relations, ${catalog.sources.length} cited sources. No import performed.\n`);
}
