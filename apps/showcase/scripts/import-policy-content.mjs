import { EmDashClient } from 'emdash/client';
import { customHeadersInterceptor, parseHeadersFromEnv } from 'emdash/client/cf-access';
import { loadCanonicalPolicies, policyCollection, policyFields } from './policy-catalog.mjs';
import { runPolicyImport } from './policy-importer.mjs';

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
await runPolicyImport({
  client,
  canonicalEntries,
  policyCollection,
  policyFields,
  apply,
  log: (message) => process.stdout.write(message),
});
