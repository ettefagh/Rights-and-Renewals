import { describe, expect, it } from 'vitest';
import { isPublicMeasurementAvailable, readTelemetryEnvironment } from './telemetry-environment';
import { createTelemetryHandler } from './telemetry';

const published = { pageIds: new Set(['home']), entityIds: new Set<string>(), blockIds: new Set<string>(), ctaIds: new Set<string>(), revisions: new Set<string>() };

describe('optional telemetry infrastructure', () => {
  it('offers consent only for an enabled, fully bound deployment and its exact allowed origin', () => {
    const environment = readTelemetryEnvironment({ PUBLIC_EVENTS_ENABLED: 'true', PUBLIC_EVENTS_ORIGINS: 'https://example.test', ANALYTICS: { writeDataPoint() {} }, PUBLIC_EVENTS_RATE_LIMITER: { async limit() { return { success: true }; } } });
    expect(isPublicMeasurementAvailable(environment, 'https://example.test')).toBe(true);
    expect(isPublicMeasurementAvailable(environment, 'https://other.test')).toBe(false);
    expect(isPublicMeasurementAvailable({ ...environment, PUBLIC_EVENTS_ENABLED: 'false' }, 'https://example.test')).toBe(false);
    const { ANALYTICS: _dataset, ...withoutDataset } = environment;
    const { PUBLIC_EVENTS_RATE_LIMITER: _limiter, ...withoutLimiter } = environment;
    expect(isPublicMeasurementAvailable(withoutDataset, 'https://example.test')).toBe(false);
    expect(isPublicMeasurementAvailable(withoutLimiter, 'https://example.test')).toBe(false);
  });
  it('keeps an unconfigured generated environment disabled', () => {
    const environment = readTelemetryEnvironment({ DB: {}, EMDASH_SITE_URL: 'https://example.test' });
    expect(environment.PUBLIC_EVENTS_ENABLED).toBeUndefined();
    expect(environment.ANALYTICS).toBeUndefined();
    expect(environment.PUBLIC_EVENTS_RATE_LIMITER).toBeUndefined();
  });

  it('rejects malformed optional bindings and fails closed when enabled', async () => {
    const environment = readTelemetryEnvironment({ PUBLIC_EVENTS_ENABLED: 'true', PUBLIC_EVENTS_ORIGINS: 123, ANALYTICS: { writeDataPoint: true }, PUBLIC_EVENTS_RATE_LIMITER: 'limit' });
    expect(environment.PUBLIC_EVENTS_ORIGINS).toBeUndefined();
    const response = await createTelemetryHandler({ enabled: environment.PUBLIC_EVENTS_ENABLED === 'true', allowedOrigins: new Set(), published, dataset: environment.ANALYTICS, rateLimiter: environment.PUBLIC_EVENTS_RATE_LIMITER })(new Request('https://example.test/api/events'));
    expect(response.status).toBe(503);
  });

  it('preserves native binding receivers when accepting an event', async () => {
    const dataset = { writes: 0, writeDataPoint() { this.writes += 1; } };
    const limiter = { calls: 0, async limit() { this.calls += 1; return { success: true }; } };
    const environment = readTelemetryEnvironment({ PUBLIC_EVENTS_ENABLED: 'true', ANALYTICS: dataset, PUBLIC_EVENTS_RATE_LIMITER: limiter });
    const response = await createTelemetryHandler({ enabled: true, allowedOrigins: new Set(['https://example.test']), published, dataset: environment.ANALYTICS, rateLimiter: environment.PUBLIC_EVENTS_RATE_LIMITER })(new Request('https://example.test/api/events', {
      method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'page_view', pageId: 'home', consent: true }),
    }));
    expect(response.status).toBe(202);
    expect(dataset.writes).toBe(1);
    expect(limiter.calls).toBe(1);
  });
});
