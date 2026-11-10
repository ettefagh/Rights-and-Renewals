import { policySeedData } from '@cmlab/core';

import { SHOWCASE_MARKDOWN } from './showcase-markdown';

const agentSetup = `# Rights & Renewals MCP

[Human view](/agent-setup)

Use Streamable HTTP. Send JSON-RPC 2.0 requests with HTTP POST and Content-Type application/json.

- Endpoint: https://rightsandrenewals.pages.dev/api/mcp
- [Agent setup recipes and verification prompt](/agent-setup/prompt.md)
- [MCP server card](/.well-known/mcp/server-card.json)
- [API catalog](/.well-known/api-catalog)

## Discover tools

Initialize the connection before listing tools. Then call policy_lookup with service_slug set to spotify to verify a read-only request.

\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
\`\`\`
`;

export function getMachineDocument(document: string | undefined) {
  if (document === 'home') {
    return { title: 'Rights & Renewals', humanHref: '/', rawHref: '/?format=markdown', markdown: SHOWCASE_MARKDOWN };
  }

  if (document === 'agent-setup.md') {
    return { title: 'Agent setup', humanHref: '/agent-setup', rawHref: '/machine/agent-setup.md', markdown: agentSetup };
  }

  if (document === 'wiki.md') {
    const entries = policySeedData.map(
      (brand) => `- [${brand.brandName}](/machine/wiki/${brand.brandSlug}.md) (${brand.category})`
    );
    const markdown = [
      '# Policy Wiki',
      '',
      '[Human view](/wiki/) · [Public policy dataset (JSON)](/data/policy_wiki_seed_v1.json)',
      '',
      ...entries,
      '',
    ].join('\n');
    return { title: 'Policy Wiki', humanHref: '/wiki/', rawHref: '/machine/wiki.md', markdown };
  }

  const slug = document?.match(/^wiki\/([a-z0-9-]+)\.md$/)?.[1];
  const brand = policySeedData.find((entry) => entry.brandSlug === slug);
  if (brand) {
    const markdown = [
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
    ].join('\n');
    return {
      title: brand.brandName + ' policy',
      humanHref: '/wiki/' + brand.brandSlug,
      rawHref: '/machine/wiki/' + brand.brandSlug + '.md',
      markdown,
    };
  }
}
