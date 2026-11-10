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
        description: "Sample lookup for cataloged German goods or subscription policies.",
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
        name: "statutory_law_lookup",
        description: "Sample lookup for a dated German Civil Code reference.",
        inputSchema: { type: "object", properties: { statute_section: { type: "string" }, language: { type: "string", enum: ["de", "en"] } }, required: ["statute_section"] }
      },
      {
        name: "subscription_category_rules",
        description: "Sample explanation of German consumer subscription rules.",
        inputSchema: { type: "object", properties: { subscription_type: { type: "string" }, contract_category: { type: "string" }, contract_start_date: { type: "string", format: "date" } } }
      },
    ];
  }

  handleToolCall(reqId, toolName, args = {}) {
    if (toolName === "policy_lookup") {
      return this.executePolicyLookup(reqId, args);
    } else if (toolName === "statutory_law_lookup") {
      return this.executeSampleLookup(reqId, toolName, args, "Sample statutory reference. Check the official source and effective date before relying on it.");
    } else if (toolName === "subscription_category_rules") {
      return this.executeSampleLookup(reqId, toolName, args, "Sample subscription category guidance. Applicability depends on the contract and facts; verify before relying on it.");
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
          text: JSON.stringify({ sample: true, policy: brand }, null, 2)
        }]
      }
    };
  }

  executeSampleLookup(reqId, toolName, args, note) {
    return {
      jsonrpc: "2.0",
      id: reqId,
      result: { content: [{ type: "text", text: JSON.stringify({ sample: true, tool: toolName, arguments: args, note }, null, 2) }] }
    };
  }

}
