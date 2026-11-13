import type { APIRoute } from 'astro';
import { resolvePublishedPlanProjection, parsePolicyContext } from '../../../lib/policy-graph-cms.js';
import { MAX_PUBLISHED_PLAN_RESULTS, planApiCorsHeaders, planApiOptionsResponse, readPublishedPlanCatalog } from '../../../lib/published-plan-api.js';

export const prerender = false;

function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...planApiCorsHeaders(origin),
    },
  });
}

export const OPTIONS: APIRoute = async ({ request }) => planApiOptionsResponse(request);

export const GET: APIRoute = async ({ request, url }) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = planApiCorsHeaders(origin)['Access-Control-Allow-Origin'];
  if (origin && typeof allowedOrigin !== 'string') return json({ error: 'Origin is not allowed.' }, 403);

  const plans = url.searchParams.getAll('plan');
  const limits = url.searchParams.getAll('limit');
  if (plans.length > 1 || limits.length > 1 || (plans.length > 0 && limits.length > 0)) {
    return json({ error: 'Supply one plan identifier or one discovery limit.' }, 400, origin);
  }

  const hasPlan = plans.length === 1;
  const plan = plans[0]?.trim();
  if (hasPlan && !plan) return json({ error: 'A plan identifier must not be empty.' }, 400, origin);
  const allowedParams = new Set(hasPlan ? ['plan', 'country', 'contractDate', 'channel', 'customerKind'] : ['limit']);
  if ([...url.searchParams.keys()].some((key) => !allowedParams.has(key))) {
    return json({ error: 'The request contains an unsupported query parameter.' }, 400, origin);
  }

  if (!hasPlan) {
    const rawLimit = limits[0];
    const limit = rawLimit === undefined ? MAX_PUBLISHED_PLAN_RESULTS : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PUBLISHED_PLAN_RESULTS) {
      return json({ error: `limit must be an integer from 1 to ${MAX_PUBLISHED_PLAN_RESULTS}.` }, 400, origin);
    }
    try {
      return json({ schemaVersion: 1, items: await readPublishedPlanCatalog(limit) }, 200, origin);
    } catch (error) {
      console.error('[policy-plan-api] Published plan catalog read failed.', error);
      return json({ error: 'Published plan catalog is temporarily unavailable.' }, 503, origin);
    }
  }
  if (!plan) return json({ error: 'A plan identifier is required.' }, 400, origin);
  if (plan.length > 160) return json({ error: 'The plan identifier is too long.' }, 400, origin);
  let context;
  try { context = parsePolicyContext(url.searchParams); }
  catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid request context.' }, 400, origin); }
  try {
    return json(await resolvePublishedPlanProjection(plan, context), 200, origin);
  } catch (error) {
    console.error('[policy-plan-api] Published plan read failed.', error);
    return json({ error: 'Published plan information is temporarily unavailable.' }, 503, origin);
  }
};
