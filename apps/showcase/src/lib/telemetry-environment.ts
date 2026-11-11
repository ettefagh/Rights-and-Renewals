import type { AnalyticsDataset, EventRateLimiter } from './telemetry';

export type TelemetryEnvironment = {
  PUBLIC_EVENTS_ENABLED?: string;
  PUBLIC_EVENTS_ORIGINS?: string;
  ANALYTICS?: AnalyticsDataset;
  PUBLIC_EVENTS_RATE_LIMITER?: EventRateLimiter;
};

function isDataset(value: unknown): value is AnalyticsDataset {
  return typeof value === 'object' && value !== null && 'writeDataPoint' in value
    && typeof value.writeDataPoint === 'function';
}

function isRateLimiter(value: unknown): value is EventRateLimiter {
  return typeof value === 'object' && value !== null && 'limit' in value
    && typeof value.limit === 'function';
}

/** Optional infrastructure is absent from generated Env until actually configured.
 * Validate it at the boundary rather than declaring bindings that do not exist.
 * Preserve binding receivers by passing the binding objects through unchanged.
 */
export function readTelemetryEnvironment(environment: object): TelemetryEnvironment {
  const enabled: unknown = Reflect.get(environment, 'PUBLIC_EVENTS_ENABLED');
  const origins: unknown = Reflect.get(environment, 'PUBLIC_EVENTS_ORIGINS');
  const dataset: unknown = Reflect.get(environment, 'ANALYTICS');
  const rateLimiter: unknown = Reflect.get(environment, 'PUBLIC_EVENTS_RATE_LIMITER');
  return {
    ...(typeof enabled === 'string' ? { PUBLIC_EVENTS_ENABLED: enabled } : {}),
    ...(typeof origins === 'string' ? { PUBLIC_EVENTS_ORIGINS: origins } : {}),
    ...(isDataset(dataset) ? { ANALYTICS: dataset } : {}),
    ...(isRateLimiter(rateLimiter) ? { PUBLIC_EVENTS_RATE_LIMITER: rateLimiter } : {}),
  };
}
