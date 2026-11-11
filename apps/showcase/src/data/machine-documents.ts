import { getPublishedPolicies, getPublishedPolicy } from '../lib/policy-cms';

import { SHOWCASE_MARKDOWN } from './showcase-markdown';
import { getPublishedWebsitePages } from '../lib/website-cms';

const pageMarkdown = (page: { title: string; description?: string; sections: { _type: string; heading?: unknown; body?: unknown; cta_label?: unknown; cta_url?: unknown; items?: unknown; questions?: unknown }[] }) => {
  const lines = [`# ${page.title}`, '', ...(page.description ? [page.description, ''] : [])];
  for (const section of page.sections) {
    if (typeof section.heading === 'string') lines.push(`## ${section.heading}`, '');
    if (typeof section.body === 'string') lines.push(section.body, '');
    if (Array.isArray(section.items)) for (const item of section.items) if (item && typeof item === 'object' && 'title' in item && 'body' in item) lines.push(`- **${String(item.title)}**: ${String(item.body)}`);
    if (Array.isArray(section.questions)) for (const item of section.questions) if (item && typeof item === 'object' && 'question' in item && 'answer' in item) lines.push(`### ${String(item.question)}`, '', String(item.answer), '');
    if (typeof section.cta_label === 'string' && typeof section.cta_url === 'string') lines.push(`[${section.cta_label}](${section.cta_url})`, '');
  }
  return lines.join('\n').trim() + '\n';
};

const agentSetup = `# Rights & Renewals MCP

[Human view](/agent-setup)

Use Streamable HTTP. Send JSON-RPC 2.0 requests with HTTP POST and Content-Type application/json.

- Endpoint: /api/mcp on this origin
- [Agent setup recipes and verification prompt](/agent-setup/prompt.md)
- [MCP server card](/.well-known/mcp/server-card.json)
- [API catalog](/.well-known/api-catalog)

## Discover tools

Initialize the connection before listing tools. Then call policy_lookup with service_slug set to spotify to verify a read-only request.

\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
\`\`\`
`;

export async function getMachineDocument(document: string | undefined) {
  if (document === 'home') {
    const home = (await getPublishedWebsitePages()).find((page) => page.id === 'home');
    return { title: 'Rights & Renewals', humanHref: '/', rawHref: '/?format=markdown', markdown: SHOWCASE_MARKDOWN + (home ? `\n\n${pageMarkdown(home)}` : '') };
  }

  const pageSlug = document?.match(/^pages\/([a-z0-9-]+)\.md$/)?.[1];
  if (pageSlug) {
    const page = (await getPublishedWebsitePages()).find((item) => item.id === pageSlug);
    if (page) return { title: page.title, humanHref: `/${pageSlug}`, rawHref: `/machine/pages/${pageSlug}.md`, markdown: pageMarkdown(page) };
  }

  if (document === 'agent-setup.md') {
    const page = (await getPublishedWebsitePages()).find((item) => item.id === 'agent-setup');
    return { title: 'Agent setup', humanHref: '/agent-setup', rawHref: '/machine/agent-setup.md', markdown: agentSetup + (page ? `\n\n${pageMarkdown(page)}` : '') };
  }

  if (document === 'wiki.md') {
    const entries = (await getPublishedPolicies()).map(
      (brand) => `- [${brand.brandName}](/machine/wiki/${brand.brandSlug}.md) (${brand.category})`
    );
    const markdown = [
      '# Policy Wiki',
      '',
      '[Human view](/wiki/) · [Public policy dataset (JSON)](/api/emdash/policies)',
      '',
      ...entries,
      '',
    ].join('\n');
    return { title: 'Policy Wiki', humanHref: '/wiki/', rawHref: '/machine/wiki.md', markdown };
  }

  const slug = document?.match(/^wiki\/([a-z0-9-]+)\.md$/)?.[1];
  const brand = slug ? await getPublishedPolicy(slug) : null;
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
