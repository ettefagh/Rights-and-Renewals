import { writeFile } from 'node:fs/promises';
import { EmDashClient } from 'emdash/client';
import { customHeadersInterceptor, parseHeadersFromEnv } from 'emdash/client/cf-access';

const value = process.env.EMDASH_URL;
if (!value) throw new Error('Set EMDASH_URL to the EmDash instance used for schema type generation.');
const url = new URL(value);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('Remote EmDash URLs require HTTPS.');
if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('EMDASH_URL must be a site origin.');
const token = process.env.EMDASH_TOKEN;
if (!local && !token) throw new Error('Set EMDASH_TOKEN before reading a remote schema.');
const client = new EmDashClient({ baseUrl: url.origin, ...(token ? { token } : {}), devBypass: local && !token, interceptors: [customHeadersInterceptor(parseHeadersFromEnv())] });
const result = await client.schemaTypes();
await writeFile(new URL('../.emdash/types.ts', import.meta.url), result, 'utf8');
process.stdout.write('Generated .emdash/types.ts from the configured EmDash schema.\n');
