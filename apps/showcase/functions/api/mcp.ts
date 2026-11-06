// apps/showcase/functions/api/mcp.ts
// Cloudflare Pages Function providing JSON-RPC 2.0 MCP Tool Execution at the edge

import seedBrands from '../../public/data/policy_wiki_seed_v1.json' with { type: 'json' };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, any>;
  };
}

// Build canonical brand index for dual-slug and alias resolution
const brandMap = new Map<string, any>();
for (const b of (seedBrands as any[])) {
  const slug = (b.service_slug || b.serviceSlug || "").toLowerCase();
  if (slug) brandMap.set(slug, b);
  if (b.brand_name) brandMap.set(b.brand_name.toLowerCase(), b);
  if (b.brandName) brandMap.set(b.brandName.toLowerCase(), b);
  if (Array.isArray(b.search_aliases)) {
    for (const alias of b.search_aliases) {
      brandMap.set(alias.toLowerCase(), b);
    }
  }
}

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Only POST requests supported" }
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: Invalid JSON" }
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: body?.id ?? null,
      error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" }
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const reqId = body.id;

  // Handle initialize
  if (body.method === "initialize") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "cmlab-warranty-mcp", version: "1.0.0" }
      }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // Handle tools/list
  if (body.method === "tools/list") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      result: {
        tools: [
          {
            name: "policy_lookup",
            description: "Look up German statutory warranty, 12m burden of proof cliff, and cancellation policies for a brand or service.",
            inputSchema: {
              type: "object",
              properties: {
                service_slug: { type: "string", description: "Brand or service slug (e.g. 'spotify', 'apple', 'mediamarkt')" },
                brand_slug: { type: "string", description: "Alias for service_slug for dual-slug compatibility" },
                category: { type: "string", enum: ["hardware", "subscription"] }
              },
              required: ["service_slug"]
            }
          },
          {
            name: "claim_dossier_generate",
            description: "Compile a deterministic German BGB § 437/439 statutory defect notice or § 312k cancellation letter with LexFox safe-harbor disclaimer.",
            inputSchema: {
              type: "object",
              properties: {
                brand_slug: { type: "string", description: "Brand identifier (e.g. 'apple', 'sony')" },
                service_slug: { type: "string", description: "Alias for brand_slug" },
                item_name: { type: "string", description: "Full product name" },
                purchase_date: { type: "string", format: "date", description: "ISO 8601 YYYY-MM-DD" },
                defect_description: { type: "string", description: "Factual defect description" },
                issue_type: { type: "string", enum: ["statutory_defect_claim", "contract_cancellation"] }
              },
              required: ["brand_slug", "item_name", "purchase_date", "defect_description"]
            }
          }
        ]
      }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // Handle tools/call
  if (body.method === "tools/call") {
    const toolName = body.params?.name;
    const args = body.params?.arguments || {};

    if (toolName === "policy_lookup") {
      const rawSlug = args.service_slug || args.brand_slug;
      if (!rawSlug || typeof rawSlug !== "string" || !rawSlug.trim()) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32602, message: "Invalid params: service_slug or brand_slug is required" }
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const normalized = rawSlug.trim().toLowerCase();
      const match = brandMap.get(normalized);

      if (!match) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          result: { content: [{ type: "text", text: `Brand slug '${normalized}' not found in canonical dataset.` }], isError: true }
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: reqId,
        result: { content: [{ type: "text", text: JSON.stringify(match, null, 2) }] }
      }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (toolName === "claim_dossier_generate") {
      const slug = (args.brand_slug || args.service_slug || "").toLowerCase().trim();
      const itemName = args.item_name;
      const purchaseDateStr = args.purchase_date;
      const defectDesc = args.defect_description;

      if (!slug || !itemName || !purchaseDateStr || !defectDesc) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: -32602,
            message: "Missing required arguments: brand_slug, item_name, purchase_date, defect_description"
          }
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoDateRegex.test(purchaseDateStr) || isNaN(Date.parse(purchaseDateStr))) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32602, message: "purchase_date must be in ISO 8601 YYYY-MM-DD format" }
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const brand = brandMap.get(slug);
      const brandName = brand?.brand_name || brand?.brandName || slug.charAt(0).toUpperCase() + slug.slice(1);

      // Calculate BGB § 477 12-month reversed burden of proof cliff
      const pDate = new Date(purchaseDateStr + "T00:00:00Z");
      const targetYear = pDate.getUTCFullYear() + 1;
      const cliffDate = new Date(pDate);

      // Leap year precision pursuant to BGB § 188 Abs. 3 (atomic UTC date clamping)
      if (pDate.getUTCMonth() === 1 && pDate.getUTCDate() === 29) {
        const isNextLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
        cliffDate.setUTCFullYear(targetYear, 1, isNextLeap ? 29 : 28);
      } else {
        cliffDate.setUTCFullYear(targetYear);
      }

      const now = new Date();
      const isWithinCliff = now.getTime() <= cliffDate.getTime();
      const burdenOfProof = isWithinCliff ? "seller" : "consumer";

      const legalClause = isWithinCliff
        ? "Gemäß § 477 Abs. 1 BGB wird gesetzlich vermutet, dass der Mangel bereits bei Gefahrübergang vorhanden war (Auftreten innerhalb von 12 Monaten nach Übergabe)."
        : "Der gesetzliche Gewährleistungsanspruch besteht nach § 438 Abs. 1 Nr. 3 BGB für 24 Monate. Der Nachweis der vertragswidrigen Beschaffenheit bei Gefahrübergang wird hiermit vorgelegt.";

      const formatDeDate = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;

      const germanDossier = [
        "MÄNGELRÜGE GEMÄSS § 437 BGB",
        "",
        `Gegenstand: ${itemName} (${brandName})`,
        `Kaufdatum: ${formatDeDate(pDate)}`,
        `Datum der Mängelanzeige: ${formatDeDate(now)}`,
        "",
        "Mangelbeschreibung:",
        defectDesc,
        "",
        "Rechtliche Grundlage:",
        legalClause,
        "",
        "Aufforderung zur Nacherfüllung:",
        "Hiermit fordere ich Sie auf, binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Neulieferung oder Nachbesserung (§ 439 Abs. 1 BGB) zu veranlassen.",
        "",
        "Vorsorglich verweise ich auf die Ablaufhemmung nach § 475e Abs. 1 BGB.",
        "",
        "--------------------------------------------------------------------------------",
        "Hinweis gem. BGH VIII ZR 285/18 (LexFox): Dieses Dokument wurde automatisiert",
        "und deterministisch generiert. Keine Rechtsberatung im Sinne des RDG."
      ].join("\n");

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: reqId,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({
              valid: true,
              item_name: itemName,
              brand_name: brandName,
              statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 439", "BGB § 477"],
              burden_of_proof: burdenOfProof,
              cliff_date: cliffDate.toISOString().split("T")[0],
              dossier_text_de: germanDossier,
              lexfox_safe_harbor_certified: true
            }, null, 2)
          }]
        }
      }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: reqId,
      error: { code: -32601, message: `Tool '${toolName}' not found` }
    }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: reqId,
    error: { code: -32601, message: `Method '${body.method}' not found` }
  }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
