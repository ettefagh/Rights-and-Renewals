import type { APIRoute } from 'astro';
import { policySeedData } from '@cmlab/core';

export const prerender = false;

const headers = { 'Content-Type': 'text/markdown; charset=utf-8' };

const agentSetup = `# Rights & Renewals MCP

[Human view](/agent-setup)

Send JSON-RPC 2.0 requests with HTTP POST and a Content-Type of application/json.

- Endpoint: https://rightsandrenewals.pages.dev/api/mcp
- [MCP server card](/.well-known/mcp/server-card.json)
- [API catalog](/.well-known/api-catalog)

## Discover tools

\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
\`\`\`
`;

export const GET: APIRoute = ({ params }) => {
  const document = params.document;

  if (document === 'agent-setup.md') {
    return new Response(agentSetup, { headers });
  }

  if (document === 'wiki.md') {
    const entries = policySeedData.map(
      (brand) => `- [${brand.brandName}](/machine/wiki/${brand.brandSlug}.md) (${brand.category})`
    );
    return new Response([
      '# Policy Wiki',
      '',
      '[Human view](/wiki/) · [Public policy dataset (JSON)](/data/policy_wiki_seed_v1.json)',
      '',
      ...entries,
      '',
    ].join('\n'), { headers });
  }

  const slug = document?.match(/^wiki\/([a-z0-9-]+)\.md$/)?.[1];
  const brand = policySeedData.find((entry) => entry.brandSlug === slug);
  if (brand) {
    return new Response([
      `# ${brand.brandName} policy`,
      '',
      `[Human view](/wiki/${brand.brandSlug}) · [Markdown directory](/machine/wiki.md)`,
      '',
      `- Brand slug: ${brand.brandSlug}`,
      `- Category: ${brand.category}`,
      `- Recorded verification date: ${brand.verifiedDate}`,
      '',
      brand.legalNotes,
      '',
      '## Public policy record',
      '',
      '```json',
      JSON.stringify(brand, null, 2),
      '```',
      '',
    ].join('\n'), { headers });
  }

  return new Response('# Document not found\n', { status: 404, headers });
};
