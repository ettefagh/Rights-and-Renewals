import { EmDashClient } from 'emdash/client';
import { customHeadersInterceptor, parseHeadersFromEnv } from 'emdash/client/cf-access';
import { loadCanonicalPolicies, policyCollection, policyFields } from './policy-catalog.mjs';

const apply = process.argv.includes('--apply');
const baseUrl = process.env.EMDASH_URL;
if (!baseUrl) throw new Error('Set EMDASH_URL to the EmDash site before running this importer.');

const target = new URL(baseUrl);
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
if (target.protocol !== 'https:' && !(isLocal && target.protocol === 'http:')) {
  throw new Error('Remote EmDash URLs must use HTTPS; HTTP is allowed only on loopback.');
}
if (target.username || target.password || target.search || target.hash || target.pathname !== '/') {
  throw new Error('EMDASH_URL must be a site origin without credentials, path, query, or fragment.');
}

const token = process.env.EMDASH_TOKEN;
const customHeaders = parseHeadersFromEnv();
if (!isLocal && !token) {
  throw new Error('Set EMDASH_TOKEN to an EmDash API token before connecting to a remote site.');
}

const client = new EmDashClient({
  baseUrl: target.origin,
  ...(token ? { token } : {}),
  devBypass: isLocal && !token,
  interceptors: [customHeadersInterceptor(customHeaders)],
});

const canonicalEntries = await loadCanonicalPolicies();
const collections = await client.collections();
if (!collections.some((item) => item.slug === policyCollection.slug)) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} is missing. Complete the site's first setup from the checked-in seed before importing; this importer does not create or replace collection metadata.`,
  );
}

const detailedCollection = await client.collection(policyCollection.slug);
if (detailedCollection.urlPattern !== policyCollection.urlPattern || detailedCollection.titleField !== policyCollection.titleField) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} must use ${policyCollection.urlPattern} and title field ${policyCollection.titleField}. Review Content Types before importing.`,
  );
}
const missingSupport = policyCollection.supports.filter(
  (support) => !detailedCollection.supports.includes(support),
);
if (missingSupport.length > 0) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} is missing required capabilities: ${missingSupport.join(', ')}. Review Content Types before importing.`,
  );
}
if (detailedCollection.supports.includes('scheduling')) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} enables scheduled publishing. Remove the scheduling capability before importing policy content.`,
  );
}

const existingFields = new Map(detailedCollection.fields.map((field) => [field.slug, field]));
const expectedFieldSlugs = new Set(policyFields.map((field) => field.slug));
const unexpectedRequiredFields = detailedCollection.fields
  .filter((field) => field.required && !expectedFieldSlugs.has(field.slug))
  .map((field) => field.slug);
if (unexpectedRequiredFields.length > 0) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} has unexpected required fields that canonical records cannot populate: ${unexpectedRequiredFields.join(', ')}. Review Content Types before importing.`,
  );
}

for (const field of policyFields) {
  const existing = existingFields.get(field.slug);
  if (!existing) continue;

  if (existing.type !== field.type || existing.required !== Boolean(field.required)) {
    throw new Error(`EmDash field ${field.slug} has a type or required setting that differs from the checked-in policy model.`);
  }
  if (JSON.stringify(existing.validation ?? null) !== JSON.stringify(field.validation ?? null)) {
    throw new Error(`EmDash field ${field.slug} has different validation options. Review Content Types before importing.`);
  }
  if (Boolean(existing.searchable) !== Boolean(field.searchable)) {
    throw new Error(`EmDash field ${field.slug} has a different search setting. Review Content Types before importing.`);
  }
  if (field.defaultValue !== undefined && JSON.stringify(existing.defaultValue) !== JSON.stringify(field.defaultValue)) {
    throw new Error(`EmDash field ${field.slug} has a different default value. Review Content Types before importing.`);
  }
}

const existingItems = new Map();
for (const status of ['draft', 'published', 'archived', 'scheduled', 'pending', 'private', 'future']) {
  for await (const item of client.listAll(policyCollection.slug, { status, limit: 250 })) {
    if (item.slug) existingItems.set(item.slug, item.status || status);
  }
}

const canonicalSlugs = new Set(canonicalEntries.map(({ slug }) => slug));
const nonPublishedConflicts = [...existingItems]
  .filter(([slug, status]) => canonicalSlugs.has(slug) && status !== 'published')
  .map(([slug, status]) => `${slug} (${status})`);
if (nonPublishedConflicts.length > 0) {
  throw new Error(
    `Import stopped. Existing non-published canonical slugs require editorial review and were not modified: ${nonPublishedConflicts.join(', ')}.`,
  );
}

const missingRequiredFields = policyFields.filter(
  (field) => field.required && !existingFields.has(field.slug),
);
if (missingRequiredFields.length > 0 && existingItems.size > 0) {
  throw new Error(
    `Required policy fields are missing while ${existingItems.size} entries already exist. Add a reviewed data migration before changing this collection.`,
  );
}

for (const field of policyFields) {
  if (existingFields.has(field.slug)) continue;
  if (!apply) {
    process.stdout.write(`Would add field ${field.slug} (${field.type}).\n`);
    continue;
  }

  await client.createField(policyCollection.slug, field);
  existingFields.set(field.slug, field);
  process.stdout.write(`Added field ${field.slug}.\n`);
}

if (!apply) {
  const missingEntries = canonicalEntries.filter(({ slug }) => !existingItems.has(slug)).length;
  process.stdout.write(
    `Dry run: ${canonicalEntries.length - missingEntries} existing slugs will be preserved; ${missingEntries} entries can be imported. Re-run with --apply to write.\n`,
  );
  process.exit(0);
}

// Re-read the collection after schema changes before importing any content.
const currentCollection = await client.collection(policyCollection.slug);
if (currentCollection.supports.includes('scheduling')) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} enabled scheduled publishing during the import. No content was imported.`,
  );
}
const fieldMap = new Map(currentCollection.fields.map((field) => [field.slug, field]));
const currentUnexpectedRequiredFields = currentCollection.fields
  .filter((field) => field.required && !expectedFieldSlugs.has(field.slug))
  .map((field) => field.slug);
if (currentUnexpectedRequiredFields.length > 0) {
  throw new Error(
    `EmDash collection ${policyCollection.slug} has unexpected required fields that canonical records cannot populate: ${currentUnexpectedRequiredFields.join(', ')}. No content was imported.`,
  );
}

for (const field of policyFields) {
  const actual = fieldMap.get(field.slug);
  if (
    !actual ||
    actual.type !== field.type ||
    actual.required !== Boolean(field.required) ||
    JSON.stringify(actual.validation ?? null) !== JSON.stringify(field.validation ?? null) ||
    Boolean(actual.searchable) !== Boolean(field.searchable)
  ) {
    throw new Error(`EmDash field ${field.slug} does not match the checked-in policy model.`);
  }
}

let created = 0;
let skipped = 0;
for (const item of canonicalEntries) {
  if (existingItems.has(item.slug)) {
    skipped++;
    process.stdout.write(`Preserved ${item.slug} (${existingItems.get(item.slug)}).\n`);
    continue;
  }

  const draft = await client.create(policyCollection.slug, item);
  await client.publish(policyCollection.slug, draft.id);
  const published = await client.get(policyCollection.slug, draft.id);
  if (published.status !== 'published' || published.slug !== item.slug) {
    throw new Error(`EmDash did not confirm publication of ${item.slug}.`);
  }

  existingItems.set(item.slug, 'published');
  created++;
  process.stdout.write(`Published ${item.slug}.\n`);
}

const finalPublishedSlugs = new Set();
for await (const item of client.listAll(policyCollection.slug, { status: 'published', limit: 250 })) {
  if (item.slug) finalPublishedSlugs.add(item.slug);
}
const stillUnpublished = canonicalEntries
  .filter(({ slug }) => !finalPublishedSlugs.has(slug))
  .map(({ slug }) => slug);
if (stillUnpublished.length > 0) {
  throw new Error(
    `Import stopped. These canonical slugs are not confirmed published: ${stillUnpublished.join(', ')}.`,
  );
}

process.stdout.write(`Import complete: ${created} published, ${skipped} existing published entries preserved.\n`);
