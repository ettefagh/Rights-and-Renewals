import { afterEach, describe, expect, it, vi } from 'vitest';

const projection = vi.hoisted(() => ({ resolvePublishedPlanProjection: vi.fn() }));
vi.mock('emdash/middleware', () => ({ withEmDashRuntime: vi.fn() }));
vi.mock('emdash/internal/plugins/host', () => ({ PluginStorageRepository: class {} }));
vi.mock('../../../lib/policy-graph-cms.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../lib/policy-graph-cms.js')>(),
  ...projection,
}));

import { GET } from './plans.js';

function context(url: string) {
  return { url: new URL(url) } as Parameters<typeof GET>[0];
}

describe('public plan API', () => {
  afterEach(() => vi.clearAllMocks());

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
    expect(malformed.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(projection.resolvePublishedPlanProjection).not.toHaveBeenCalled();
  });
});
