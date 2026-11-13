import handler, { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';

export { PluginBridge };

const ORIGIN_TEMPLATED_ASSETS = [
  '/auth.md',
  '/robots.txt',
  '/sitemap.xml',
  '/agent-setup/prompt.md',
  '/.well-known/',
];

function usesOriginTemplate(pathname: string): boolean {
  return ORIGIN_TEMPLATED_ASSETS.some((path) =>
    path.endsWith('/') ? pathname.startsWith(path) : pathname === path,
  );
}

const workerFetch = handler.fetch;
if (!workerFetch) throw new Error('EmDash Worker handler does not export fetch.');

const fetchWithRequestOrigin: ExportedHandlerFetchHandler<Env> = async (request, env, context) => {
  const url = new URL(request.url);
  // A fresh isolated preview must not expose first-admin enrollment before Access
  // protection is established. Public published projections remain available.
  if ('CMLAB_PREVIEW_EDITORIAL_LOCK' in env && env.CMLAB_PREVIEW_EDITORIAL_LOCK === 'true'
    && (url.pathname === '/_emdash' || url.pathname.startsWith('/_emdash/'))) {
    return new Response('Editorial preview is locked pending protected administrator setup.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  const shouldTemplate = usesOriginTemplate(url.pathname);
  let assetRequest = request;

  if (shouldTemplate && request.method === 'GET') {
    const headers = new Headers(request.headers);
    headers.delete('if-none-match');
    headers.delete('if-modified-since');
    assetRequest = new Request(request, { headers }) as typeof request;
  }

  const response = await workerFetch(assetRequest, env, context);
  if (!shouldTemplate || request.method !== 'GET' || !response.ok) return response;

  const body = await response.clone().text();
  const renderedBody = body
    .replaceAll('{{ORIGIN}}', url.origin)
    .replaceAll('{{HOST}}', url.host);
  if (renderedBody === body) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control', 'public, max-age=300, s-maxage=3600');

  return new Response(renderedBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  fetch: fetchWithRequestOrigin,
  scheduled: createScheduledHandler(),
};
