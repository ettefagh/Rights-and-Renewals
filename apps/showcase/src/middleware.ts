import { defineMiddleware } from 'astro:middleware';

const SHOWCASE_MARKDOWN = `# Rights & Renewals (Showcase)

> Sovereign Consumer Rights, Subscription & Warranty Wallet with Brand Policy Wiki and Open MCP Server.

## Features & Capabilities
- **Brand Policy Wiki**: Verified BGB §§ 437, 438, 477 warranty terms & § 312k cancellation rules for top 20 brands.
- **Model Context Protocol (MCP)**: Native JSON-RPC 2.0 endpoints for AI agents.
- **Agent Discovery**: API Catalog (RFC 9727), OAuth Protected Resource Metadata (RFC 9728), ARD AI Catalog, and WebMCP tools.

## Discovery Resources
- API Catalog: \`/.well-known/api-catalog\`
- MCP Server Card: \`/.well-known/mcp/server-card.json\`
- OAuth Metadata: \`/.well-known/oauth-protected-resource\`
- Agent Skills: \`/.well-known/agent-skills/index.json\`
- Agent Registration: \`/auth.md\`
`;

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
