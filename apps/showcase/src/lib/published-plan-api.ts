import { getEmDashCollection } from 'emdash';
import { withPublicContext } from './policy-graph-cms.js';

export const MAX_PUBLISHED_PLAN_RESULTS = 50;
const PAGE_SIZE = 50;

interface CmsPlanEntry {
  id: string;
  status?: string;
  data?: Record<string, unknown>;
}

export interface PublicPlanSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

function stringField(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === 'string' ? data[key] as string : '';
}

function planSummary(entry: CmsPlanEntry): PublicPlanSummary | null {
  if (!entry || typeof entry.id !== 'string' || !entry.id || (entry.status && entry.status !== 'published')) return null;
  const data = entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data) ? entry.data : {};
  const id = typeof data.id === 'string' && data.id ? data.id : entry.id;
  const slug = entry.id || stringField(data, 'stable_key') || id;
  if (!id || !slug) return null;
  return {
    id,
    slug,
    title: stringField(data, 'title') || stringField(data, 'name') || 'Untitled plan',
    summary: stringField(data, 'summary'),
  };
}

/** Reads a bounded public projection of published plan records, with preview context disabled. */
export async function readPublishedPlanCatalog(limit = MAX_PUBLISHED_PLAN_RESULTS): Promise<PublicPlanSummary[]> {
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, MAX_PUBLISHED_PLAN_RESULTS)) : MAX_PUBLISHED_PLAN_RESULTS;
  return withPublicContext(async () => {
    const result = await getEmDashCollection('policy_plans', { status: 'published', limit: PAGE_SIZE });
    if (result.error) throw result.error;
    const entries = (result.entries as CmsPlanEntry[]).slice(0, safeLimit);
    const summaries: PublicPlanSummary[] = [];
    const ids = new Set<string>();
    for (const entry of entries) {
      const summary = planSummary(entry);
      if (!summary || ids.has(summary.id)) continue;
      ids.add(summary.id);
      summaries.push(summary);
    }
    return summaries;
  });
}

function configuredOrigins(value: string): Set<string> {
  const origins = new Set<string>();
  for (const candidate of value.split(',')) {
    const raw = candidate.trim();
    if (!raw || raw === '*') continue;
    try {
      const url = new URL(raw);
      const hostname = url.hostname.toLowerCase();
      const localHost = hostname === 'localhost' || hostname.endsWith('.localhost')
        || hostname === '127.0.0.1' || hostname === '[::1]';
      const protocolAllowed = url.protocol === 'https:' || (url.protocol === 'http:' && localHost);
      if (!protocolAllowed || url.username || url.password || url.pathname !== '/' || url.search || url.hash) continue;
      origins.add(url.origin);
    } catch {
      // Invalid configured origins are ignored; wildcard and path patterns are never accepted.
    }
  }
  return origins;
}

export function getPlanApiAllowedOrigins(configured = import.meta.env.PUBLIC_WIKI_CORS_ORIGINS ?? ''): ReadonlySet<string> {
  return new Set([
    'https://rightsandrenewals-app.pages.dev',
    'http://localhost:4173', 'http://127.0.0.1:4173', 'http://localhost:3000', 'http://127.0.0.1:3000',
    ...configuredOrigins(configured),
  ]);
}

export function planApiCorsHeaders(origin: string | null, allowedOrigins = getPlanApiAllowedOrigins()): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
}

export function planApiOptionsResponse(
  request: Request,
  allowedOrigins = getPlanApiAllowedOrigins(),
): Response {
  const origin = request.headers.get('Origin');
  const baseHeaders = planApiCorsHeaders(origin, allowedOrigins);
  if (origin && !allowedOrigins.has(origin)) return new Response(null, { status: 403, headers: baseHeaders });

  const requestedMethod = request.headers.get('Access-Control-Request-Method');
  if (requestedMethod && requestedMethod.toUpperCase() !== 'GET') return new Response(null, { status: 405, headers: baseHeaders });
  const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') ?? '')
    .split(',').map((header) => header.trim().toLowerCase()).filter(Boolean);
  if (requestedHeaders.some((header) => !['accept', 'content-type'].includes(header))) {
    return new Response(null, { status: 403, headers: baseHeaders });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...baseHeaders,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}
