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
- **Browser-local WebMCP demos**: \`vault_lookup\` and \`notice_generate\` register through \`document.modelContext\` when the browser supports it. They do not access local vault records or call a remote service.

## Wallet API routes
- \`POST /api/auth/request-pin\`: Starts the wallet PIN challenge flow.
- \`POST /api/auth/verify-pin\`: Verifies a PIN challenge and establishes the wallet session.
- \`GET /api/calendar/subscriptions.ics\` and \`GET /api/calendar/warranties.ics\`: Public sample iCalendar feeds.
- \`GET /api/ical/subscriptions/{token}\` and \`GET /api/ical/warranties/{token}\`: Tokenized iCalendar feed routes. Current handlers return sample entries, not private browser vault records.

## Service boundary
This Pages wallet does not host remote MCP, OAuth authorize/token/JWKS, client-registration, or health endpoints. Remote policy MCP discovery and policy agent skills belong to the separate showcase service; use its own discovery documents to locate those resources. The wallet does not provide remote vault read or write access.

## Wallet discovery resources
- API Catalog: \`/.well-known/api-catalog\`
- API Guide: \`/auth.md\`
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
        "x-markdown-tokens": "230"
      }
    });
  }

  // Pass-through for standard requests
  return await context.next();
}
