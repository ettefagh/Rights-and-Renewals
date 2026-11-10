import { defineMiddleware } from 'astro:middleware';

function getShowcaseMarkdown(origin: string): string {
  return `# Rights & Renewals (Showcase)

> Sovereign Consumer Rights, Subscription & Warranty Wallet with Brand Policy Wiki and Open MCP Server.

## Features & Capabilities
- **Brand Policy Wiki**: Verified BGB §§ 437, 438, 477 warranty terms & § 312k cancellation rules for top 20 brands.
- **Model Context Protocol (MCP)**: Public, read-only JSON-RPC tools over Streamable HTTP at ${origin}/api/mcp.
- **Agent Discovery**: API Catalog (RFC 9727), ARD AI Catalog, MCP Server Card, and Agent Skills.

## Discovery Resources
- API Catalog: \`/.well-known/api-catalog\`
- MCP Server Card: \`/.well-known/mcp/server-card.json\`
- Agent Skills: \`/.well-known/agent-skills/index.json\`
- Service details: \`/auth.md\`
- Setup guide: \`/agent-setup\`
`;
}

export const onRequest = defineMiddleware(async (context, next) => {
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
          if (m?.[1]) qMd = parseFloat(m[1]);
        } else if (p.startsWith('text/html')) {
          const m = p.match(/q=([0-9.]+)/);
          if (m?.[1]) qHtml = parseFloat(m[1]);
        }
      }
      if (qHtml > qMd) prefersMarkdown = false;
    }

    if (prefersMarkdown) {
      return new Response(getShowcaseMarkdown(url.origin), {
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
