import { defineMiddleware } from 'astro:middleware';

const SHOWCASE_MARKDOWN = `# Rights & Renewals

Save receipts on your device and track the dates that matter for purchases and subscriptions in Germany.

- [Open the wallet](https://rightsandrenewals-app.pages.dev/) to save a purchase, see upcoming dates, or prepare a notice draft.
- [Browse the Policy Wiki](/wiki) for brand cancellation and warranty information.
- [Try the MCP Playground](/#mcp-playground) with sample policy lookups and notice drafts.
- [Set up your agent](/agent-setup) to connect to the public JSON-RPC endpoint at \`/api/mcp\`.

## Discovery Resources
- API Catalog: \`/.well-known/api-catalog\`
- MCP Server Card: \`/.well-known/mcp/server-card.json\`
- OAuth Metadata: \`/.well-known/oauth-protected-resource\`
- Agent Skills: \`/.well-known/agent-skills/index.json\`
- Agent Registration: \`/auth.md\`
`;

export const onRequest = defineMiddleware(async (context, next) => {
  // Capture Cloudflare Workers / Pages runtime bindings into globalThis.__CF_ENV__
  const cfEnv = (context.locals as any)?.runtime?.env;
  if (cfEnv) {
    if (!(globalThis as any).__CF_ENV__) {
      (globalThis as any).__CF_ENV__ = {};
    }
    Object.assign((globalThis as any).__CF_ENV__, cfEnv);
  }

  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get('Accept') || '';

  // Content negotiation for AI agents requesting Markdown
  if ((url.pathname === '/' || url.pathname === '/index.html') && accept.includes('text/markdown')) {
    let prefersMarkdown = true;
    if (accept.includes('text/html')) {
      let qMd = 1.0;
      let qHtml = 1.0;
      for (const part of accept.split(',')) {
        const p = part.trim();
        if (p.startsWith('text/markdown')) {
          const m = p.match(/q=([0-9.]+)/);
          if (m) qMd = parseFloat(m[1]);
        } else if (p.startsWith('text/html')) {
          const m = p.match(/q=([0-9.]+)/);
          if (m) qHtml = parseFloat(m[1]);
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
