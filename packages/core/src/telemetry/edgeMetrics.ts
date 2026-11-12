/**
 * packages/core/src/telemetry/edgeMetrics.ts
 * Privacy-First Cloudflare Workers Analytics Engine (WAE) Telemetry Writer
 * Zero PII, Anonymous Operational Metrics (GDPR Art. 25, Red Line 2)
 */

export interface TelemetryEvent {
  endpoint: '/api/mcp' | '/wiki';
  method?: string; // e.g. "policy_lookup", "statutory_law_lookup", "tools/list"
  brandSlug?: string; // e.g. "spotify", "apple", "mediamarkt", or "none"
  statusCode: number; // HTTP status or JSON-RPC error code (e.g. 200, 400, 404, 500, -32602)
  latencyMs: number; // Execution latency in ms
  requestBytes: number; // Request body byte count
  responseBytes: number; // Response body byte count
}

export interface WaeDataPoint {
  blobs: string[]; // Up to 20 strings (max 512 bytes each)
  doubles: number[]; // Up to 20 numeric metrics
  indexes: string[]; // Index string for partitioned grouping
}

export interface AnalyticsEngineDataset {
  writeDataPoint(point: WaeDataPoint): void;
}

export interface CloudflareEnvWithAnalytics {
  CMLAB_ANALYTICS?: AnalyticsEngineDataset;
}

/**
 * Strips any potential PII and formats a clean WaeDataPoint for Cloudflare Analytics Engine.
 */
export function formatWaeEvent(event: TelemetryEvent): WaeDataPoint {
  // Normalize and sanitize values (strictly no IP, no names, no emails, no prices, no tokens)
  const endpoint = event.endpoint === '/wiki' ? '/wiki' : '/api/mcp';
  const method = event.method
    ? event.method.replace(/[^a-zA-Z0-9_\-\/]/g, '').slice(0, 64)
    : 'GET';
  const brandSlug = event.brandSlug
    ? event.brandSlug
        .toLowerCase()
        .replace(/[^a-z0-9\-]/g, '')
        .slice(0, 64)
    : 'none';
  const statusStr = Math.trunc(event.statusCode).toString();

  const latency = Math.max(0, Math.round(event.latencyMs * 100) / 100);
  const reqBytes = Math.max(0, Math.trunc(event.requestBytes));
  const resBytes = Math.max(0, Math.trunc(event.responseBytes));

  return {
    blobs: [endpoint, method || 'GET', brandSlug || 'none', statusStr],
    doubles: [latency, reqBytes, resBytes],
    indexes: [brandSlug !== 'none' ? brandSlug : endpoint],
  };
}

/**
 * Safely writes a metric point to the Cloudflare Workers Analytics Engine binding.
 * Fails gracefully and returns false if the binding is missing (e.g., local dev or unit tests).
 */
export function recordEdgeMetric(
  env: CloudflareEnvWithAnalytics | undefined | null,
  event: TelemetryEvent
): boolean {
  if (
    !env ||
    !env.CMLAB_ANALYTICS ||
    typeof env.CMLAB_ANALYTICS.writeDataPoint !== 'function'
  ) {
    return false;
  }

  try {
    const dataPoint = formatWaeEvent(event);
    env.CMLAB_ANALYTICS.writeDataPoint(dataPoint);
    return true;
  } catch (err) {
    // Suppress telemetry errors to preserve 100% endpoint availability
    console.error('[edgeMetrics] Failed to write WAE data point:', err);
    return false;
  }
}
