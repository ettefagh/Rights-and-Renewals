import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { createTelemetryHandler, type AnalyticsDataset, type EventRateLimiter, type PublishedEventRegistry } from '../../lib/telemetry';
import { buildPublishedEventRegistry } from '../../lib/telemetry-registry';

export type TelemetryEnvironment = {
  PUBLIC_EVENTS_ENABLED?: string;
  PUBLIC_EVENTS_ORIGINS?: string;
  ANALYTICS?: AnalyticsDataset;
  PUBLIC_EVENTS_RATE_LIMITER?: EventRateLimiter;
};

const emptyRegistry = (): PublishedEventRegistry => ({
  pageIds: new Set(), entityIds: new Set(), blockIds: new Set(), ctaIds: new Set(), revisions: new Set(),
});
const boundedSet = (source: string | undefined, max = 10): Set<string> => {
  if (!source || source.length > 2048) return new Set();
  const values = source.split(',').map((value) => value.trim()).filter(Boolean);
  if (values.length > max) return new Set();
  return new Set(values.filter((value) => {
    try { const origin = new URL(value); return origin.origin === value && ['https:', 'http:'].includes(origin.protocol); }
    catch { return false; }
  }));
};

/** Exported adapter keeps environment wiring independently testable. */
export function createTelemetryConfig(environment: TelemetryEnvironment, published: PublishedEventRegistry, registryAvailable = true) {
  return {
    enabled: environment.PUBLIC_EVENTS_ENABLED === 'true',
    registryAvailable,
    allowedOrigins: boundedSet(environment.PUBLIC_EVENTS_ORIGINS),
    published,
    dataset: environment.ANALYTICS,
    rateLimiter: environment.PUBLIC_EVENTS_RATE_LIMITER,
  };
}

export const POST: APIRoute = async ({ request }) => {
  if (env.PUBLIC_EVENTS_ENABLED !== 'true') {
    return createTelemetryHandler(createTelemetryConfig(env, emptyRegistry(), false))(request);
  }
  let registry: PublishedEventRegistry;
  try {
    registry = await buildPublishedEventRegistry();
  } catch {
    registry = emptyRegistry();
    return createTelemetryHandler(createTelemetryConfig(env, registry, false))(request);
  }
  return createTelemetryHandler(createTelemetryConfig(env, registry))(request);
};
