import type { APIRoute } from 'astro';
import { resolvePublishedPlanProjection, parsePolicyContext } from '../../../lib/policy-graph-cms.js';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const plan = url.searchParams.get('plan')?.trim();
  if (!plan || plan.length > 160) return json({ error: 'A plan identifier is required.' }, 400);
  let context;
  try { context = parsePolicyContext(url.searchParams); }
  catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid request context.' }, 400); }
  try {
    return json(await resolvePublishedPlanProjection(plan, context));
  } catch (error) {
    console.error('[policy-plan-api] Published plan read failed.', error);
    return json({ error: 'Published plan information is temporarily unavailable.' }, 503);
  }
};
