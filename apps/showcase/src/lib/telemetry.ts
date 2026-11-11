import { z } from 'astro/zod';

export const PUBLIC_EVENT_NAMES = ['page_view', 'block_view', 'cta_click', 'policy_open', 'plan_select'] as const;
export const MAX_EVENT_BODY_BYTES = 4096;
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/);

export const publicEventSchema = z.object({
  name: z.enum(PUBLIC_EVENT_NAMES),
  consent: z.literal(true),
  pageId: identifier.optional(),
  entityId: identifier.optional(),
  blockId: identifier.optional(),
  ctaId: identifier.optional(),
  revision: identifier.optional(),
}).strict().superRefine((event, ctx) => {
  if (!event.pageId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pageId required' });
  if (event.name === 'block_view' && (!event.pageId || !event.blockId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pageId and blockId required' });
  if (event.name === 'cta_click' && (!event.pageId || !event.ctaId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pageId and ctaId required' });
});

export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PublishedEventRegistry = {
  pageIds: ReadonlySet<string>;
  entityIds: ReadonlySet<string>;
  blockIds: ReadonlySet<string>;
  ctaIds: ReadonlySet<string>;
  revisions: ReadonlySet<string>;
  pageChildren?: Readonly<Record<string, { blocks: readonly string[]; ctas: readonly string[]; entities: readonly string[] }>>;
  pageRevisions?: Readonly<Record<string, string>>;
  entityRevisions?: Readonly<Record<string, string>>;
};
export interface AnalyticsDataset {
  writeDataPoint(point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void;
}
export interface EventRateLimiter { limit(options: { key: string }): Promise<{ success: boolean }>; }
export type TelemetryConfig = {
  enabled: boolean;
  registryAvailable?: boolean;
  allowedOrigins: ReadonlySet<string>;
  published: PublishedEventRegistry;
  dataset?: AnalyticsDataset | undefined;
  rateLimiter?: EventRateLimiter | undefined;
};

export type TelemetryDecision = { accepted: true; event: PublicEvent } | { accepted: false; status: number; reason: string };

export function isBoundedPublishedRegistry(registry: PublishedEventRegistry): boolean {
  return [registry.pageIds, registry.entityIds, registry.blockIds, registry.ctaIds, registry.revisions]
    .every((ids) => ids.size <= 500 && [...ids].every((id) => identifier.safeParse(id).success));
}

export function validatePublicEvent(raw: unknown, registry: PublishedEventRegistry): TelemetryDecision {
  const parsed = publicEventSchema.safeParse(raw);
  if (!parsed.success) return { accepted: false, status: 400, reason: 'invalid_event' };
  const event = parsed.data;
  if (event.pageId && !registry.pageIds.has(event.pageId)) return { accepted: false, status: 400, reason: 'unknown_page' };
  if (event.entityId && !registry.entityIds.has(event.entityId)) return { accepted: false, status: 400, reason: 'unknown_entity' };
  if (event.blockId && !registry.blockIds.has(event.blockId)) return { accepted: false, status: 400, reason: 'unknown_block' };
  if (event.ctaId && !registry.ctaIds.has(event.ctaId)) return { accepted: false, status: 400, reason: 'unknown_cta' };
  if (event.revision && !registry.revisions.has(event.revision)) return { accepted: false, status: 400, reason: 'unknown_revision' };
  if (registry.pageChildren) {
    const children = registry.pageChildren[event.pageId!];
    if (event.name === 'block_view' && (!children || !children.blocks.includes(event.blockId!))) return { accepted: false, status: 400, reason: 'block_parent_mismatch' };
    if (event.name === 'cta_click' && (!children || !children.ctas.includes(event.ctaId!))) return { accepted: false, status: 400, reason: 'cta_parent_mismatch' };
    if ((event.name === 'policy_open' || event.name === 'plan_select') && (!event.entityId || !children?.entities.includes(event.entityId))) return { accepted: false, status: 400, reason: 'entity_parent_mismatch' };
    if (event.name === 'policy_open' && !event.entityId?.startsWith('policy:')) return { accepted: false, status: 400, reason: 'invalid_policy' };
    if (event.name === 'plan_select' && !event.entityId?.startsWith('plan:')) return { accepted: false, status: 400, reason: 'invalid_plan' };
    if (event.name === 'page_view' && (!event.revision || registry.pageRevisions?.[event.pageId!] !== event.revision)) return { accepted: false, status: 400, reason: 'page_revision_mismatch' };
    if (event.name === 'policy_open' || event.name === 'plan_select') {
      if (!event.revision || registry.entityRevisions?.[event.entityId!] !== event.revision) return { accepted: false, status: 400, reason: 'entity_revision_mismatch' };
    }
    if (event.name === 'block_view' || event.name === 'cta_click') {
      if (!event.revision || registry.pageRevisions?.[event.pageId!] !== event.revision) return { accepted: false, status: 400, reason: 'page_revision_mismatch' };
    }
  }
  return { accepted: true, event };
}

export function writeAggregateEvent(dataset: AnalyticsDataset, event: PublicEvent): void {
  // These fields are a closed taxonomy. No request metadata, text, or identity enters the dataset.
  const dimensions = [event.name, event.pageId ?? '', event.entityId ?? '', event.blockId ?? '', event.ctaId ?? '', event.revision ?? ''];
  dataset.writeDataPoint({ indexes: [event.name], blobs: dimensions, doubles: [1] });
}

async function readBoundedBody(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_EVENT_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export function createTelemetryHandler(config: TelemetryConfig) {
  return async function handle(request: Request): Promise<Response> {
    if (!config.enabled) return jsonResponse(404, { error: 'not_configured' });
    if (!config.dataset || !config.rateLimiter) return jsonResponse(503, { error: 'telemetry_unavailable' });
    if (config.registryAvailable === false || !isBoundedPublishedRegistry(config.published)) return jsonResponse(503, { error: 'registry_unavailable' });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });
    if (((request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '') !== 'application/json') {
      return jsonResponse(415, { error: 'unsupported_content_type' });
    }
    const origin = request.headers.get('origin');
    if (!origin || !config.allowedOrigins.has(origin)) return jsonResponse(403, { error: 'origin_denied' });
    const length = Number(request.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_EVENT_BODY_BYTES) return jsonResponse(413, { error: 'body_too_large' });
    const bytes = await readBoundedBody(request);
    if (!bytes) return jsonResponse(413, { error: 'body_too_large_or_unreadable' });
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { return jsonResponse(400, { error: 'invalid_json' }); }
    const decision = validatePublicEvent(raw, config.published);
    if (!decision.accepted) return jsonResponse(decision.status, { error: decision.reason });
    let allowance: { success: boolean };
    try {
      // Global, non-identifying key. Cloudflare's binding is approximate per location.
      allowance = await config.rateLimiter.limit({ key: 'public-editorial-events' });
    } catch {
      return jsonResponse(503, { error: 'rate_limit_unavailable' });
    }
    if (!allowance.success) return jsonResponse(429, { error: 'rate_limited' });
    try { writeAggregateEvent(config.dataset, decision.event); } catch { return jsonResponse(503, { error: 'event_write_failed' }); }
    return jsonResponse(202, { accepted: true });
  };
}
