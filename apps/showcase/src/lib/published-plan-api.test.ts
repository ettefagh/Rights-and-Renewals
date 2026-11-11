import { afterEach, describe, expect, it, vi } from 'vitest';

const emdash = vi.hoisted(() => ({ getEmDashCollection: vi.fn() }));
vi.mock('emdash', () => ({ getEmDashCollection: emdash.getEmDashCollection }));
vi.mock('./policy-graph-cms.js', () => ({
  withPublicContext: (read: () => Promise<unknown>) => read(),
}));

import { getPlanApiAllowedOrigins, planApiCorsHeaders, readPublishedPlanCatalog } from './published-plan-api.js';

describe('published plan API helpers', () => {
  afterEach(() => vi.resetAllMocks());

  it('reads only published plan entries with a bounded query and removes duplicate IDs', async () => {
    emdash.getEmDashCollection.mockResolvedValue({
      entries: [
        { id: 'student-monthly', status: 'published', data: { id: '01PLAN', title: 'Student Monthly', summary: 'Monthly plan.' } },
        { id: 'draft-plan', status: 'draft', data: { id: '02DRAFT', title: 'Draft plan' } },
        { id: 'second-slug', status: 'published', data: { id: '01PLAN', title: 'Duplicate plan' } },
      ],
    });
    await expect(readPublishedPlanCatalog(500)).resolves.toEqual([
      { id: '01PLAN', slug: 'student-monthly', title: 'Student Monthly', summary: 'Monthly plan.' },
    ]);
    expect(emdash.getEmDashCollection).toHaveBeenCalledWith('policy_plans', { status: 'published', limit: 50 });
  });

  it('keeps configured CORS origins exact and rejects wildcard, public HTTP, and path entries', () => {
    const origins = getPlanApiAllowedOrigins('https://trusted.example,*,http://public.example,https://path.example/wiki');
    expect(origins.has('https://rightsandrenewals-app.pages.dev')).toBe(true);
    expect(origins.has('https://trusted.example')).toBe(true);
    expect(origins.has('*')).toBe(false);
    expect(origins.has('http://public.example')).toBe(false);
    expect(origins.has('https://path.example')).toBe(false);
    expect(origins.has('https://unlisted.example')).toBe(false);
  });

  it('echoes only an exact allowed Origin and never enables credentialed CORS', () => {
    const allowed = new Set(['https://wallet.example']);
    const headers = planApiCorsHeaders('https://wallet.example', allowed);
    const deniedHeaders = planApiCorsHeaders('https://wallet.example.attacker.example', allowed);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://wallet.example');
    expect(headers.Vary).toBe('Origin');
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect(deniedHeaders['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
