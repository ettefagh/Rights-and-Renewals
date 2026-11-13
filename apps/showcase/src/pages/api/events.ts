import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { createTelemetryHandler, type PublishedEventRegistry } from '../../lib/telemetry';
import { readTelemetryEnvironment, type TelemetryEnvironment } from '../../lib/telemetry-environment';
import { buildPublishedEventRegistry } from '../../lib/telemetry-registry';

export type { TelemetryEnvironment } from '../../lib/telemetry-environment';

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
  const environment = readTelemetryEnvironment(env);
  if (environment.PUBLIC_EVENTS_ENABLED !== 'true') {
    return createTelemetryHandler(createTelemetryConfig(environment, emptyRegistry(), false))(request);
  }
  let registry: PublishedEventRegistry;
  try {
    registry = await buildPublishedEventRegistry();
  } catch {
    registry = emptyRegistry();
    return createTelemetryHandler(createTelemetryConfig(environment, registry, false))(request);
  }
  return createTelemetryHandler(createTelemetryConfig(environment, registry))(request);
};
