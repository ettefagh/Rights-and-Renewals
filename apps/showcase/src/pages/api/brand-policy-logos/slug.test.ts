import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  media: {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    status: 'ready',
    storageKey: '01ARZ3NDEKTSV4RRFFQ69G5FAV.png',
    mimeType: 'image/png',
    size: 4,
  } as Record<string, unknown> | null,
  publishedLogoId: '01ARZ3NDEKTSV4RRFFQ69G5FAV' as string | null,
  findById: vi.fn(),
  download: vi.fn(),
  getPublishedPolicyLogoMediaId: vi.fn(),
  requestContext: { db: {} as object },
}));

vi.mock('emdash/runtime', () => ({ getDb: async () => state.requestContext.db }));
vi.mock('emdash', async (importOriginal) => ({
  ...await importOriginal<typeof import('emdash')>(),
  getRequestContext: () => state.requestContext,
  MediaRepository: class {
    findById(id: string) { return state.findById(id); }
  },
}));
vi.mock('../../../lib/policy-cms.js', () => ({
  getPublishedPolicyLogoMediaId: state.getPublishedPolicyLogoMediaId,
}));

import { GET } from './[slug].js';

function context() {
  return {
    params: { slug: 'spotify' },
    locals: { emdash: { db: {}, storage: { download: state.download } } },
  } as never;
}

describe('published policy logo route', () => {
  beforeEach(() => {
    state.media = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      status: 'ready',
      storageKey: '01ARZ3NDEKTSV4RRFFQ69G5FAV.png',
      mimeType: 'image/png',
      size: 4,
    };
    state.publishedLogoId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    state.getPublishedPolicyLogoMediaId.mockReset().mockImplementation(async () => state.publishedLogoId);
    state.findById.mockReset().mockImplementation(async () => state.media);
    state.download.mockReset().mockResolvedValue({ body: new Response('logo').body, contentType: 'image/png', size: 4 });
  });

  it('does not look up or serve media when no published policy references it', async () => {
    state.publishedLogoId = null;

    const response = await GET(context());

    expect(response.status).toBe(404);
    expect(state.findById).not.toHaveBeenCalled();
    expect(state.download).not.toHaveBeenCalled();
  });

  it('returns not found for missing media rows and unsafe MIME types', async () => {
    state.media = null;
    expect((await GET(context())).status).toBe(404);
    expect(state.download).not.toHaveBeenCalled();

    state.media = { id: '01ARZ3NDEKTSV4RRFFQ69G5FAV', status: 'ready', mimeType: 'image/svg+xml', size: 4, storageKey: '01ARZ3NDEKTSV4RRFFQ69G5FAV.svg' };
    expect((await GET(context())).status).toBe(404);
    expect(state.download).not.toHaveBeenCalled();
  });

  it('streams bounded raster bytes with safe response headers', async () => {
    const response = await GET(context());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toContain('must-revalidate');
    expect(await response.text()).toBe('logo');
    expect(state.download).toHaveBeenCalledWith('01ARZ3NDEKTSV4RRFFQ69G5FAV.png');
  });

  it('rejects download MIME and size metadata that violates the public image policy', async () => {
    state.download.mockResolvedValue({ body: new Response('text').body, contentType: 'text/html', size: 4 });

    expect((await GET(context())).status).toBe(404);

    state.download.mockResolvedValue({ body: new Response('oversized').body, contentType: 'image/png', size: 2 * 1024 * 1024 + 1 });
    expect((await GET(context())).status).toBe(404);
  });
});
