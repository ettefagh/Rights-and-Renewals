import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const source = await read('../wrangler.issue37-preview.jsonc');
const artifact = await read('../dist/server/wrangler.json');
assert.equal(artifact.name, 'rightsandrenewals-showcase-issue37-preview');
assert.equal(artifact.vars?.CMLAB_PREVIEW_EDITORIAL_LOCK, 'true', 'Built artifact must lock fresh editorial setup. Rebuild after config changes.');
assert.equal(artifact.vars?.PUBLIC_EVENTS_ENABLED, source.vars.PUBLIC_EVENTS_ENABLED);
assert.equal(artifact.vars?.PUBLIC_EVENTS_ORIGINS, source.vars.PUBLIC_EVENTS_ORIGINS);
assert.equal(artifact.vars?.EMDASH_SITE_URL, source.vars.EMDASH_SITE_URL);
for (const key of ['d1_databases', 'r2_buckets', 'kv_namespaces']) {
  assert.equal(artifact[key]?.length, 1, `Unexpected ${key} bindings`);
  for (const [field, expected] of Object.entries(source[key][0])) {
    assert.equal(artifact[key][0][field], expected, `Wrong built ${key}.${field}`);
  }
}
assert.deepEqual(artifact.analytics_engine_datasets, source.analytics_engine_datasets);
assert.deepEqual(artifact.ratelimits, source.ratelimits);
console.log('Verified issue37 artifact target, isolated storage, editorial lock and explicit analytics configuration.');
