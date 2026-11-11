#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const CONTRACT_PATH = new URL('../src/lib/editorial-proposals.ts', import.meta.url);
export const READINESS = Object.freeze({
  contractVersion: '1.0.0',
  pluginId: 'cmlab-editorial-proposals',
  requiredTokenScope: 'mcp:tools:cmlab-editorial-proposals',
  requiredRole: 'Contributor',
  capabilities: ['hooks.content-policy:register'],
  tools: ['propose_draft'],
  forbiddenOperations: ['approve', 'publish', 'schedule', 'content_update', 'schema_write'],
  connectionVerified: false,
  credentialIssued: false,
});

export function evaluateTokenScopes(scopes) {
  const set = new Set(scopes);
  const excessive = [...set].filter((scope) => scope !== READINESS.requiredTokenScope);
  return {
    allowed: set.has(READINESS.requiredTokenScope) && excessive.length === 0,
    missing: set.has(READINESS.requiredTokenScope) ? [] : [READINESS.requiredTokenScope],
    excessive,
  };
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href === import.meta.url) {
  const source = await readFile(CONTRACT_PATH, 'utf8');
  const result = {
    ...READINESS,
    contractPresent: source.includes("EDITORIAL_PROPOSAL_CONTRACT_VERSION = '1.0.0'"),
    deferredPrerequisites: [
      'Wire a host adapter that atomically creates idempotent drafts with authorId derived from the authenticated EmDash actor.',
      'Register the trusted plugin and additive editorial_proposals collection.',
      'Resolve native MCP OAuth/Access routing: the current email Access policy covers /_emdash/*; interoperability is unverified.',
      'Create a Contributor-scoped token with only mcp:tools:cmlab-editorial-proposals; verify native revocation.',
    ],
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
