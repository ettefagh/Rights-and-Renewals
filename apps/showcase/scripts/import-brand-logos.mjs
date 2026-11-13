import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { EmDashClient } from 'emdash/client';
import { customHeadersInterceptor, parseHeadersFromEnv } from 'emdash/client/cf-access';
import { loadBrandLogoAssets } from './brand-logo-assets.mjs';
import { runBrandLogoImport } from './brand-logo-importer.mjs';

const apply = process.argv.includes('--apply');
const publishLogoOnly = process.argv.includes('--publish-logo-only');
const skipConflictingDrafts = process.argv.includes('--skip-conflicting-drafts');
if (publishLogoOnly && !apply) throw new Error('--publish-logo-only requires --apply.');
const baseUrl = process.env.EMDASH_URL;
if (!baseUrl) throw new Error('Set EMDASH_URL to the EmDash site before running this importer.');

const target = new URL(baseUrl);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
if (target.protocol !== 'https:' && !(local && target.protocol === 'http:')) {
  throw new Error('Remote EmDash URLs must use HTTPS; HTTP is allowed only on loopback.');
}
if (target.username || target.password || target.search || target.hash || target.pathname !== '/') {
  throw new Error('EMDASH_URL must be a site origin without credentials, path, query, or fragment.');
}

const configDir = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, 'emdash')
  : join(homedir(), '.config', 'emdash');
const credentialPath = join(configDir, 'auth.json');
const credentialKey = target.origin;
let stored = null;
try {
  const store = JSON.parse(await readFile(credentialPath, 'utf8'));
  stored = store[credentialKey] ?? null;
} catch (error) {
  if (error?.code !== 'ENOENT') throw new Error('Unable to read saved EmDash credentials.');
}

const token = process.env.EMDASH_TOKEN || (
  stored && new Date(stored.expiresAt) > new Date() ? stored.accessToken : undefined
);
if (!local && !token && !stored?.refreshToken) {
  throw new Error('Set EMDASH_TOKEN or complete `emdash login` for this EmDash origin before connecting.');
}

const customHeaders = { ...(stored?.customHeaders ?? {}), ...parseHeadersFromEnv() };
const interceptors = Object.keys(customHeaders).length ? [customHeadersInterceptor(customHeaders)] : [];
const client = new EmDashClient({
  baseUrl: target.origin,
  ...(token ? { token } : stored?.accessToken ? { token: stored.accessToken } : {}),
  ...(stored?.refreshToken ? {
    refreshToken: stored.refreshToken,
    onTokenRefresh: async (accessToken, expiresIn) => {
      const store = JSON.parse(await readFile(credentialPath, 'utf8'));
      store[credentialKey] = {
        ...stored,
        accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
      await mkdir(configDir, { recursive: true, mode: 0o700 });
      await writeFile(credentialPath, JSON.stringify(store, null, '\t'), { encoding: 'utf8', mode: 0o600 });
    },
  } : {}),
  devBypass: local && !token && !stored?.accessToken,
  interceptors,
});

const entries = await loadBrandLogoAssets();
await runBrandLogoImport({
  client,
  entries,
  apply,
  publishLogoOnly,
  skipConflictingDrafts,
  log: (message) => process.stdout.write(message),
});
