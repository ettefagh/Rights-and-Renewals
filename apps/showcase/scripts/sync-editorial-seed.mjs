import { readFile, writeFile } from 'node:fs/promises';
import { validateSeed } from 'emdash/seed';
import { editorialCollections, editorialRelations, providerIdentityEntries } from './editorial-catalog.mjs';
import { learningCollections, learningRelations, learningContentFromWiki } from './learning-catalog.mjs';
import { websiteCollections, websiteRelations, websiteBlockTypes, websiteContent } from './website-catalog.mjs';

const seedUrl = new URL('../seed/seed.json', import.meta.url);
const wikiUrl = new URL('../../app/src/components/views/wikiContent.ts', import.meta.url);
const brandsUrl = new URL('../public/data/policy_wiki_seed_v1.json', import.meta.url);
const seed = JSON.parse(await readFile(seedUrl, 'utf8'));
const wiki = await import(wikiUrl.href);
const brands = JSON.parse(await readFile(brandsUrl, 'utf8'));
const additions = [...editorialCollections, ...learningCollections];
const bySlug = new Map(seed.collections.map((item) => [item.slug, item]));
for (const addition of [...websiteCollections, ...additions]) {
  const current = bySlug.get(addition.slug);
  if (!current) { seed.collections.push(addition); bySlug.set(addition.slug, addition); continue; }
  const fields = new Map(current.fields.map((field) => [field.slug, field]));
  for (const field of addition.fields) if (!fields.has(field.slug)) current.fields.push(field);
  current.supports = [...new Set([...current.supports, ...addition.supports])];
  for (const key of ['label', 'labelSingular', 'urlPattern', 'group', 'icon']) if (addition[key]) current[key] = addition[key];
}
const brandPolicies = bySlug.get('brand_policies');
if (brandPolicies) {
  brandPolicies.group = 'Policy catalog';
  brandPolicies.icon = 'shield-check';
}
for (const collection of additions) {
  const current = bySlug.get(collection.slug);
  for (const field of collection.fields) {
    if (field.slug !== 'revision_hash') continue;
    const existing = current.fields.find((item) => item.slug === field.slug);
    if (existing && existing.type === 'string') {
      existing.required = false;
      existing.label = field.label;
    }
  }
}
seed.relations = [...new Map([...(seed.relations ?? []), ...editorialRelations, ...learningRelations, ...websiteRelations].map((item) => [item.slug, item])).values()];
seed.blockTypes = [...new Map([...(seed.blockTypes ?? []), ...websiteBlockTypes].map((item) => [item.slug, item])).values()];
seed.content ??= {};
const providerEntries = new Map((seed.content.policy_providers ?? []).map((item) => [item.slug, item]));
for (const item of providerIdentityEntries(brands)) if (!providerEntries.has(item.slug)) providerEntries.set(item.slug, item);
seed.content.policy_providers = [...providerEntries.values()];
for (const [collection, items] of Object.entries(learningContentFromWiki(wiki))) {
  const existing = new Map((seed.content[collection] ?? []).map((item) => [item.slug, item]));
  for (const item of items) if (!existing.has(item.slug)) existing.set(item.slug, { id: `${collection}-${item.slug}`, slug: item.slug, status: 'published', data: item });
  seed.content[collection] = [...existing.values()];
}
for (const [collection, items] of Object.entries(websiteContent)) {
  const existing = new Map((seed.content[collection] ?? []).map((item) => [item.slug, item]));
  for (const item of items) if (!existing.has(item.slug)) existing.set(item.slug, { id: `page-${item.slug}`, slug: item.slug, status: 'published', data: item });
  seed.content[collection] = [...existing.values()];
}
for (const slug of ['policy_providers', 'policy_services', 'policy_plans', 'policy_offers', 'policy_offer_versions', 'policy_rules', 'policy_rule_versions', 'policy_evidence', 'policy_assessments']) seed.content[slug] ??= [];
const validation = validateSeed(seed);
if (!validation.valid) throw new Error(validation.errors.join('\n'));
await writeFile(seedUrl, `${JSON.stringify(seed, null, '\t')}\n`, 'utf8');
process.stdout.write(`Aggregated ${seed.collections.length} collections, ${seed.relations.length} relations, ${Object.values(seed.content).reduce((n, entries) => n + entries.length, 0)} starter entries.\n`);
