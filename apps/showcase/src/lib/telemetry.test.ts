import { describe, expect, it, vi } from 'vitest';
import {
  MAX_EVENT_BODY_BYTES,
  createTelemetryHandler,
  isBoundedPublishedRegistry,
  validatePublicEvent,
  type AnalyticsDataset,
  type EventRateLimiter,
  type PublishedEventRegistry,
} from './telemetry';

const published: PublishedEventRegistry = {
  pageIds: new Set(['home']), entityIds: new Set(['wiki-rights']), blockIds: new Set(['hero-main']),
  ctaIds: new Set(['open-guide']), revisions: new Set(['rev-12']),
};
const dataset: AnalyticsDataset = { writeDataPoint: vi.fn() };
const rateLimiter: EventRateLimiter = { limit: vi.fn(async () => ({ success: true })) };
const handler = (extra: Partial<Parameters<typeof createTelemetryHandler>[0]> = {}) => createTelemetryHandler({
  enabled: true, allowedOrigins: new Set(['https://example.test']), published, dataset, rateLimiter, ...extra,
});
const request = (body: unknown, init: RequestInit = {}) => new Request('https://example.test/api/events', {
  method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' },
  body: JSON.stringify(body), ...init,
});
const event = { name: 'page_view', pageId: 'home', consent: true };

describe('public telemetry', () => {
  it('returns disabled without touching rate limiter or dataset', async () => {
    const response = await handler({ enabled: false })(request(event));
    expect(response.status).toBe(404);
    expect(dataset.writeDataPoint).not.toHaveBeenCalled();
  });

  it('fails closed when enabled without Analytics Engine or native rate limiting bindings', async () => {
    expect((await handler({ dataset: undefined })(request(event))).status).toBe(503);
    expect((await handler({ rateLimiter: undefined })(request(event))).status).toBe(503);
  });

  it('rejects unknown events, PII-shaped keys/text and missing consent', () => {
    for (const invalid of [
      { ...event, email: 'a@example.test' }, { ...event, accountId: 'user-1' },
      { ...event, searchText: 'refund my subscription' }, { ...event, name: 'login' },
      { ...event, consent: false }, { ...event, url: 'https://example.test/x' },
    ]) expect(validatePublicEvent(invalid, published).accepted).toBe(false);
  });

  it('rejects fake or stale published IDs and invalid high-cardinality registries', () => {
    expect(validatePublicEvent({ ...event, pageId: 'made-up-page' }, published)).toMatchObject({ accepted: false, reason: 'unknown_page' });
    expect(isBoundedPublishedRegistry({ ...published, blockIds: new Set(Array.from({ length: 501 }, (_, i) => `block-${i}`)) })).toBe(false);
  });

  it('rejects wrong content type and origin and rate limits without writing', async () => {
    expect((await handler()(request(event, { headers: { origin: 'https://bad.test', 'content-type': 'application/json' } }))).status).toBe(403);
    expect((await handler()(request(event, { headers: { origin: 'https://example.test', 'content-type': 'text/plain' } }))).status).toBe(415);
    const limited = handler({ rateLimiter: { limit: vi.fn(async () => ({ success: false })) } });
    expect((await limited(request(event))).status).toBe(429);
    expect(dataset.writeDataPoint).not.toHaveBeenCalled();
  });

  it('enforces the streamed byte limit and does not ingest oversized requests', async () => {
    const oversized = new Request('https://example.test/api/events', {
      method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({ ...event, extra: 'x'.repeat(MAX_EVENT_BODY_BYTES + 1) }),
    });
    expect((await handler()(oversized)).status).toBe(413);
    expect(dataset.writeDataPoint).not.toHaveBeenCalled();
  });

  it('writes only allowlisted aggregate dimensions after consent and rate check', async () => {
    const response = await handler()(request({ ...event, entityId: 'wiki-rights', revision: 'rev-12' }));
    expect(response.status).toBe(202);
    expect(rateLimiter.limit).toHaveBeenCalledWith({ key: 'public-editorial-events' });
    expect(dataset.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['page_view'], blobs: ['page_view', 'home', 'wiki-rights', '', '', 'rev-12'], doubles: [1],
    });
  });

  it('does not expose exceptions or log request metadata when binding calls fail', async () => {
    const broken = handler({ dataset: { writeDataPoint: () => { throw new Error('sensitive token=never-return-this'); } } });
    const response = await broken(request(event));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('never-return-this');
  });
});
