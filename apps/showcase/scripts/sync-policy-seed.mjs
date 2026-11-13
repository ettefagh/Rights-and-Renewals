import { readFile, writeFile } from 'node:fs/promises';
import { validateSeed } from 'emdash/seed';
import { loadCanonicalPolicies, policyCollection } from './policy-catalog.mjs';

const seedUrl = new URL('../seed/seed.json', import.meta.url);
const seed = JSON.parse(await readFile(seedUrl, 'utf8'));
const policies = await loadCanonicalPolicies();

seed.collections ??= [];
const policyCollectionIndex = seed.collections.findIndex((collection) => collection.slug === policyCollection.slug);
if (policyCollectionIndex < 0) {
  seed.collections.push(policyCollection);
} else {
  seed.collections[policyCollectionIndex] = policyCollection;
}

seed.content ??= {};
delete seed.content['brand-policies'];
seed.content[policyCollection.slug] = policies.map(({ slug, data }) => ({
  id: `policy-${slug}`,
  slug,
  status: 'published',
  data,
}));

const validation = validateSeed(seed);
if (!validation.valid) throw new Error(validation.errors.join('\n'));

await writeFile(seedUrl, `${JSON.stringify(seed, null, '\t')}\n`, 'utf8');
process.stdout.write(`Updated ${policyCollection.slug} seed schema and ${policies.length} starter entries.\n`);
