import { defineMiddleware } from 'astro:middleware';

import { SHOWCASE_MARKDOWN } from './data/showcase-markdown';

export const onRequest = defineMiddleware(async (context, next) => {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get('Accept') || '';

  const markdownRequested = url.searchParams.get('format') === 'markdown';

  // Content negotiation for AI agents requesting Markdown
  if ((url.pathname === '/' || url.pathname === '/index.html') && (markdownRequested || accept.includes('text/markdown'))) {
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
          'Link': '</.well-known/api-catalog>; rel="api-catalog", </auth.md>; rel="service-doc"',
          'Access-Control-Allow-Origin': '*',
          'x-markdown-tokens': '180'
        }
      });
    }
  }

  return next();
});
