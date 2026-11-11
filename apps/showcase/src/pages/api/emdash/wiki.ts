import type { APIRoute } from 'astro';
import { loadLearningContent } from '../../../lib/learning-cms.js';

const allowedOrigins = () => new Set([
  'https://rightsandrenewals-app.pages.dev',
  'http://localhost:4173', 'http://127.0.0.1:4173', 'http://localhost:3000', 'http://127.0.0.1:3000',
  ...(import.meta.env.PUBLIC_WIKI_CORS_ORIGINS ?? '').split(',').map((value: string) => value.trim()).filter(Boolean),
]);
const headersFor = (origin?: string) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60, s-maxage=300',
  Vary: 'Origin',
  ...(origin && allowedOrigins().has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
});

export const OPTIONS: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin') ?? undefined;
  if (origin && !allowedOrigins().has(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...headersFor(origin), 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } });
};

export const GET: APIRoute = async ({ request }) => {
  const origin = request.headers.get('Origin') ?? undefined;
  if (origin && !allowedOrigins().has(origin)) return new Response(JSON.stringify({ error: 'Origin is not allowed.' }), { status: 403, headers: headersFor() });
  try {
    const content = await loadLearningContent();
    return new Response(JSON.stringify(content), {
      status: 200,
      headers: headersFor(origin),
    });
  } catch (error) {
    console.error('[wiki-api] Unable to load published learning content.', error);
    return new Response(JSON.stringify({ error: 'Wiki content is temporarily unavailable.' }), {
      status: 503,
      headers: { ...headersFor(origin), 'Cache-Control': 'no-store' },
    });
  }
};
