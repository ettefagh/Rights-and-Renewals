import { describe, expect, it } from 'vitest';
import { evaluateTokenScopes, READINESS } from './agent-readiness.mjs';

describe('editorial agent readiness contract', () => {
  it('requires the plugin-specific scope and rejects broad grants', () => {
    expect(evaluateTokenScopes(['mcp:tools:cmlab-editorial-proposals']).allowed).toBe(true);
    expect(evaluateTokenScopes(['content:write']).allowed).toBe(false);
    expect(evaluateTokenScopes(['mcp:tools:cmlab-editorial-proposals', 'content:write']).allowed).toBe(false);
    expect(evaluateTokenScopes(['mcp:tools:cmlab-editorial-proposals', 'mcp:tools:other-plugin']).allowed).toBe(false);
  });
  it('keeps connection and credential issuance explicitly deferred', () => {
    expect(READINESS.connectionVerified).toBe(false);
    expect(READINESS.credentialIssued).toBe(false);
    expect(READINESS.tools).toEqual(['propose_draft']);
  });
});
