import { readFile, writeFile } from 'node:fs/promises';

// Resource identifiers are configuration, never credentials. No provisioning or deployment.
const databaseId = process.env.ISSUE37_D1_ID;
const sessionId = process.env.ISSUE37_SESSION_ID;
if (!/^[a-f0-9-]{36}$/.test(databaseId ?? '') || !/^[a-f0-9]{32}$/.test(sessionId ?? '')) {
  throw new Error('Set ISSUE37_D1_ID and ISSUE37_SESSION_ID to the newly created isolated resource IDs.');
}
const baseline = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const excluded = JSON.stringify(baseline);
if (excluded.includes(databaseId) || excluded.includes(sessionId)) throw new Error('Refusing production or issue35 resource reuse.');
const config = {
  ...baseline,
  name: 'rightsandrenewals-showcase-issue37-preview',
  vars: {
    EMDASH_SITE_URL: 'https://rightsandrenewals-showcase-issue37-preview.padarhava.workers.dev',
    PUBLIC_EVENTS_ENABLED: 'false',
    CMLAB_PREVIEW_EDITORIAL_LOCK: 'true',
  },
  d1_databases: [{ binding: 'DB', database_name: 'rightsandrenewals-issue37-preview', database_id: databaseId }],
  r2_buckets: [{ binding: 'MEDIA', bucket_name: 'rightsandrenewals-issue37-preview-media' }],
  kv_namespaces: [{ binding: 'SESSION', id: sessionId }],
};
delete config.previews;
await writeFile(new URL('../wrangler.issue37-preview.jsonc', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
process.stdout.write('Prepared isolated issue37 configuration; build with CMLAB_ISSUE37_PREVIEW=true. No deployment performed.\n');
