import { defineMiddleware } from 'astro:middleware';

import { SHOWCASE_MARKDOWN } from './data/showcase-markdown';

const rootDiscovery = '</.well-known/api-catalog>; rel="api-catalog", </auth.md>; rel="service-doc"';

export const onRequest = defineMiddleware(async (context, next) => {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get('Accept') || '';
  const isHome = url.pathname === '/' || url.pathname === '/index.html';

  const markdownRequested = url.searchParams.get('format') === 'markdown';

  // Content negotiation for AI agents requesting Markdown
  if (isHome && (markdownRequested || accept.includes('text/markdown'))) {
    let prefersMarkdown = true;
    if (!markdownRequested && accept.includes('text/html')) {
      let qMd = 1.0;
      let qHtml = 1.0;
      for (const part of accept.split(',')) {
        const p = part.trim();
        if (p.startsWith('text/markdown')) {
          const m = p.match(/q=([0-9.]+)/);
          if (m?.[1]) qMd = parseFloat(m[1]);
        } else if (p.startsWith('text/html')) {
          const m = p.match(/q=([0-9.]+)/);
          if (m?.[1]) qHtml = parseFloat(m[1]);
        }
      }
      if (qHtml > qMd) prefersMarkdown = false;
    }

    if (prefersMarkdown) {
      return new Response(SHOWCASE_MARKDOWN, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Link': rootDiscovery,
          'Access-Control-Allow-Origin': '*',
          'x-markdown-tokens': '180'
        }
      });
    }
  }

  const response = await next();
  const isPublicPage = isHome || /^(?:\/agent-setup|\/wiki|\/machine\/view)(?:\/|$)/.test(url.pathname);
  if (!isPublicPage || !response.headers.get('Content-Type')?.includes('text/html')) return response;

  const page = new Response(response.body, response);
  page.headers.set('X-Content-Type-Options', 'nosniff');
  page.headers.set('X-Frame-Options', 'DENY');
  page.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isHome) {
    if (!page.headers.get('Vary')?.split(',').some((value) => ['accept', '*'].includes(value.trim().toLowerCase()))) {
      page.headers.append('Vary', 'Accept');
    }
    page.headers.append('Link', rootDiscovery);
  }
  return page;
});
