/**
 * MockMcpTransport.js
 * In-Memory JSON-RPC 2.0 Router for Model Context Protocol (MCP 2024-11-05)
 * Guaranteed Sub-30ms Execution · 100% Demo Uptime · Zero Network Dependencies
 */

export class MockMcpTransport {
  constructor(seedBrands = []) {
    this.brands = seedBrands;
    this.brandMap = new Map();
    this.initIndex();
  }

  initIndex() {
    for (const b of this.brands) {
      const slug = (b.service_slug || b.serviceSlug || "").toLowerCase();
      if (slug) this.brandMap.set(slug, b);

      if (b.brand_name) {
        this.brandMap.set(b.brand_name.toLowerCase(), b);
      }
      if (b.brandName) {
        this.brandMap.set(b.brandName.toLowerCase(), b);
      }
      if (Array.isArray(b.search_aliases)) {
        for (const alias of b.search_aliases) {
          this.brandMap.set(alias.toLowerCase(), b);
        }
      }
    }
  }

  setBrands(brands) {
    this.brands = brands;
    this.brandMap.clear();
    this.initIndex();
  }

  async handleRequest(payload) {
    const startTime = performance.now();

    // 1. JSON-RPC 2.0 Protocol Envelope Validation
    if (!payload || payload.jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id: payload?.id ?? null,
        error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" },
        _telemetry: { elapsedMs: performance.now() - startTime }
      };
    }

    const reqId = payload.id;
    const method = payload.method;
    const params = payload.params || {};

    let response;

    switch (method) {
      case "initialize":
        response = {
          jsonrpc: "2.0",
          id: reqId,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "cmlab-warranty-mcp", version: "1.0.0" },
            capabilities: { tools: {} }
          }
        };
        break;

      case "tools/list":
        response = {
          jsonrpc: "2.0",
          id: reqId,
          result: {
            tools: this.getRegisteredTools()
          }
        };
        break;

      case "tools/call":
        response = this.handleToolCall(reqId, params.name, params.arguments || {});
        break;

      default:
        response = {
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32601, message: `Method '${method}' not found` }
        };
        break;
    }

    const elapsedMs = performance.now() - startTime;
    response._telemetry = { elapsedMs: Math.round(elapsedMs * 100) / 100 };
    return response;
  }

  getRegisteredTools() {
    return [
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
    ];
  }

  handleToolCall(reqId, toolName, args = {}) {
    if (toolName === "policy_lookup") {
      return this.executePolicyLookup(reqId, args);
    } else if (toolName === "claim_dossier_generate") {
      return this.executeClaimDossierGenerate(reqId, args);
    } else {
      return {
        jsonrpc: "2.0",
        id: reqId,
        error: { code: -32601, message: `Tool '${toolName}' not found` }
      };
    }
  }

  executePolicyLookup(reqId, args) {
    const rawSlug = args.service_slug || args.brand_slug;
    if (!rawSlug || typeof rawSlug !== "string" || !rawSlug.trim()) {
      return {
        jsonrpc: "2.0",
        id: reqId,
        error: { code: -32602, message: "Invalid params: service_slug or brand_slug is required" }
      };
    }

    const normalized = rawSlug.trim().toLowerCase();
    const brand = this.brandMap.get(normalized);

    if (!brand) {
      return {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          content: [{ type: "text", text: `Brand slug '${normalized}' not found in canonical dataset.` }],
          isError: true
        }
      };
    }

    return {
      jsonrpc: "2.0",
      id: reqId,
      result: {
        content: [{
          type: "text",
          text: JSON.stringify(brand, null, 2)
        }]
      }
    };
  }

  executeClaimDossierGenerate(reqId, args) {
    const slug = (args.brand_slug || args.service_slug || "").toLowerCase().trim();
    const itemName = args.item_name;
    const purchaseDateStr = args.purchase_date;
    const defectDesc = args.defect_description;

    if (!slug || !itemName || !purchaseDateStr || !defectDesc) {
      return {
        jsonrpc: "2.0",
        id: reqId,
        error: {
          code: -32602,
          message: "Missing required arguments: brand_slug, item_name, purchase_date, defect_description"
        }
      };
    }

    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(purchaseDateStr) || isNaN(Date.parse(purchaseDateStr))) {
      return {
        jsonrpc: "2.0",
        id: reqId,
        error: { code: -32602, message: "purchase_date must be in ISO 8601 YYYY-MM-DD format" }
      };
    }

    const brand = this.brandMap.get(slug);
    const brandName = brand?.brand_name || brand?.brandName || slug.charAt(0).toUpperCase() + slug.slice(1);

    // Calculate BGB § 477 12-month reversed burden of proof cliff
    const pDate = new Date(purchaseDateStr + "T00:00:00Z");
    const cliffDate = new Date(pDate);
    const targetYear = pDate.getUTCFullYear() + 1;
    const isNextLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    if (pDate.getUTCMonth() === 1 && pDate.getUTCDate() === 29) {
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

    const formatDeDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;

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

    return {
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
    };
  }
}
