import { beforeEach, describe, expect, it, vi } from 'vitest';

const workerMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  scheduled: vi.fn(),
  createScheduledHandler: vi.fn(),
}));

vi.mock('@emdash-cms/cloudflare/worker', () => ({
  default: { fetch: workerMocks.fetch },
  createScheduledHandler: workerMocks.createScheduledHandler,
  PluginBridge: class PluginBridge {},
}));

import worker from './worker';

type WorkerFetch = NonNullable<typeof worker.fetch>;
const workerRequest = (url: string): Parameters<WorkerFetch>[0] => new Request(url) as Parameters<WorkerFetch>[0];

describe('preview editorial lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerMocks.createScheduledHandler.mockReturnValue(workerMocks.scheduled);
    workerMocks.fetch.mockImplementation(async () => new Response('EmDash handler response', { status: 200 }));
  });

  it.each([
    '/_emdash',
    '/_emdash/',
    '/_emdash/admin',
    '/_emdash/api/content/pages',
    '/_emdash/api/plugins/example/resolve',
    '/_emdash/mcp',
  ])('locks %s before reaching the EmDash handler when enabled', async (path) => {
    const request = workerRequest(`https://preview.example${path}?source=test`);
    const response = await worker.fetch!(request, { CMLAB_PREVIEW_EDITORIAL_LOCK: 'true' } as never, {} as never);

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('locked');
    expect(workerMocks.fetch).not.toHaveBeenCalled();
  });

  it('delegates public routes and paths outside the exact EmDash prefix even when the lock is enabled', async () => {
    for (const path of ['/', '/api/emdash/plans?limit=50', '/_emdashington/admin']) {
      const request = workerRequest(`https://preview.example${path}`);
      const response = await worker.fetch!(request, { CMLAB_PREVIEW_EDITORIAL_LOCK: 'true' } as never, {} as never);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('EmDash handler response');
    }
    expect(workerMocks.fetch).toHaveBeenCalledTimes(3);
  });

  it('leaves normal/default environments delegated to the production handler', async () => {
    const requests = [
      workerRequest('https://showcase.example/_emdash/admin'),
      workerRequest('https://showcase.example/api/emdash/plans?limit=50'),
    ];
    const envs = [{}, { CMLAB_PREVIEW_EDITORIAL_LOCK: 'false' }];

    for (const [index, request] of requests.entries()) {
      const response = await worker.fetch!(request, envs[index] as never, {} as never);
      expect(response.status).toBe(200);
    }
    expect(workerMocks.fetch).toHaveBeenCalledTimes(2);
  });
});
