import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createPlugin, policyReviewConsoleAdminEntry } from './policy-review-console';

describe('portable native review console', () => {
  it('keeps source file resolution in the build configuration, outside Worker startup', () => {
    const source = readFileSync(new URL('./policy-review-console.ts', import.meta.url), 'utf8');
    expect(source).not.toContain("from 'node:url'");
    expect(source).not.toMatch(/new URL\(/);
    expect(policyReviewConsoleAdminEntry).toBe('./src/admin/index.tsx');
    const plugin = createPlugin();
    expect(plugin.admin?.pages.map((page) => page.path)).toEqual(['/review', '/proposals']);
  });
});
