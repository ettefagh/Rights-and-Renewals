import { afterEach, describe, expect, it, vi } from 'vitest';

const projection = vi.hoisted(() => ({ resolvePublishedPlanProjection: vi.fn() }));
const catalog = vi.hoisted(() => ({ readPublishedPlanCatalog: vi.fn() }));
vi.mock('emdash/middleware', () => ({ withEmDashRuntime: vi.fn() }));
vi.mock('emdash/internal/plugins/host', () => ({ PluginStorageRepository: class {} }));
vi.mock('../../../lib/published-plan-api.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../lib/published-plan-api.js')>(),
  ...catalog,
}));
vi.mock('../../../lib/policy-graph-cms.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../lib/policy-graph-cms.js')>(),
  ...projection,
}));

import { GET, OPTIONS } from './plans.js';

function context(url: string, headers?: HeadersInit) {
  const request = new Request(url, headers ? { headers } : undefined);
  return { request, url: new URL(url) } as Parameters<typeof GET>[0];
}

describe('public plan API', () => {
  afterEach(() => vi.resetAllMocks());

  it('returns bounded published catalog summaries for explicit discovery', async () => {
    const items = [{ id: '01PLAN', slug: 'student-monthly', title: 'Student Monthly', summary: 'Monthly plan.' }];
    catalog.readPublishedPlanCatalog.mockResolvedValue(items);
    const response = await GET(context('https://site.test/api/emdash/plans?limit=50', {
      Origin: 'https://rightsandrenewals-app.pages.dev',
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ schemaVersion: 1, items });
    expect(catalog.readPublishedPlanCatalog).toHaveBeenCalledWith(50);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://rightsandrenewals-app.pages.dev');
    expect(response.headers.get('vary')).toBe('Origin');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('returns the exact shared published projection for a bounded context', async () => {
    const body = { schemaVersion: 1, plan: 'demo', context: { country: 'DE' }, applicability: 'needs_information', findings: [] };
    projection.resolvePublishedPlanProjection.mockResolvedValue(body);
    const response = await GET(context('https://site.test/api/emdash/plans?plan=demo&country=DE'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(projection.resolvePublishedPlanProjection).toHaveBeenCalledWith('demo', { country: 'DE' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects malformed, duplicate, and unbounded request context before reading the catalog', async () => {
    const malformed = await GET(context('https://site.test/api/emdash/plans?plan=demo&contractDate=2026-02-31'));
    const duplicate = await GET(context('https://site.test/api/emdash/plans?plan=demo&country=DE&country=US'));
    const oversized = await GET(context(`https://site.test/api/emdash/plans?plan=${'x'.repeat(161)}`));
    const invalidLimit = await GET(context('https://site.test/api/emdash/plans?limit=51'));
    const emptyPlan = await GET(context('https://site.test/api/emdash/plans?plan=%20'));
    const extraField = await GET(context('https://site.test/api/emdash/plans?limit=50&email=student%40example.test'));
    expect(malformed.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(invalidLimit.status).toBe(400);
    expect(emptyPlan.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(projection.resolvePublishedPlanProjection).not.toHaveBeenCalled();
    expect(catalog.readPublishedPlanCatalog).not.toHaveBeenCalled();
  });

  it('rejects unlisted Origins without emitting allow-origin headers or reading plans', async () => {
    const response = await GET(context('https://site.test/api/emdash/plans?limit=50', { Origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('vary')).toBe('Origin');
    expect(catalog.readPublishedPlanCatalog).not.toHaveBeenCalled();
    expect(projection.resolvePublishedPlanProjection).not.toHaveBeenCalled();
  });

  it('answers exact-origin GET preflights and rejects unapproved methods or headers', async () => {
    const approved = await OPTIONS(context('https://site.test/api/emdash/plans', {
      Origin: 'https://rightsandrenewals-app.pages.dev',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'accept, content-type',
    }));
    expect(approved.status).toBe(204);
    expect(approved.headers.get('access-control-allow-origin')).toBe('https://rightsandrenewals-app.pages.dev');
    expect(approved.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
    expect(approved.headers.get('access-control-allow-headers')).toBe('Accept, Content-Type');
    expect(approved.headers.get('access-control-allow-credentials')).toBeNull();

    const wrongMethod = await OPTIONS(context('https://site.test/api/emdash/plans', {
      Origin: 'https://rightsandrenewals-app.pages.dev', 'Access-Control-Request-Method': 'POST',
    }));
    const wrongHeader = await OPTIONS(context('https://site.test/api/emdash/plans', {
      Origin: 'https://rightsandrenewals-app.pages.dev', 'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    }));
    const wrongOrigin = await OPTIONS(context('https://site.test/api/emdash/plans', {
      Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'GET',
    }));
    expect(wrongMethod.status).toBe(405);
    expect(wrongHeader.status).toBe(403);
    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.headers.get('access-control-allow-origin')).toBeNull();
  });
});
