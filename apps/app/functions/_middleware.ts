/**
 * Cloudflare Pages Middleware for Markdown for Agents Content Negotiation
 * Reference: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 */
const APP_MARKDOWN = `# Rights & Renewals Sovereign App

> Offline-first, encrypted consumer rights vault, warranty countdown tracker, and § 312k cancellation generator.

## Core Capabilities
- **Encrypted Local Vault**: Client-side AES-GCM-256 storage for purchase receipts and warranties.
- **Statutory Deadlines**: 12-month Beweislastumkehr (§ 477 Abs. 1 BGB) & 24-month Gewährleistung (§ 438 BGB).
- **Dual-Rail Cancellation**: Deterministic DIN 5008 PDF dossier compilation and verified cancellation button links (§ 312k BGB).
- **WebMCP Integration**: In-browser tools \`vault_lookup\` and \`notice_generate\` exposed via \`document.modelContext\`.

## Discovery Resources
- API Catalog: \`/.well-known/api-catalog\`
- MCP Server Card: \`/.well-known/mcp/server-card.json\`
- OAuth Metadata: \`/.well-known/oauth-protected-resource\`
- Agent Registration: \`/auth.md\`
`;

export async function onRequest(context: any) {
  const request = context.request;
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  // Content negotiation for AI agents requesting Markdown
  if ((url.pathname === "/" || url.pathname === "/index.html") && accept.includes("text/markdown")) {
    return new Response(APP_MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept",
        "Link": '</.well-known/api-catalog>; rel="api-catalog", </auth.md>; rel="service-doc"',
        "Access-Control-Allow-Origin": "*",
        "x-markdown-tokens": "195"
      }
    });
  }

  // Pass-through for standard requests
  return await context.next();
}
