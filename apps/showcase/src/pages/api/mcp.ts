/**
 * apps/showcase/src/pages/api/mcp.ts
 * Cloudflare Worker JSON-RPC 2.0 Open MCP Server Endpoint for Rights & Renewals
 * Supports policy_lookup, statutory_law_lookup, subscription_category_rules,
 * tax_deductibility_check, and claim_dossier_generate with strict Zod validation (-32602).
 */

import type { APIRoute } from 'astro';
import { dispatchJsonRpc, getPolicyScope, policySeedData } from '@cmlab/core';
import { claimDossierDescription, claimDossierInputSchema, generateClaimDossier } from '../../mcp/claimDossier';

export const prerender = false;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, any>;
    [key: string]: any;
  };
}

// Canonical brand map for dual-slug and alias resolution
const brandMap = new Map<string, (typeof policySeedData)[number]>();
for (const b of policySeedData) {
  const slug = (b.brandSlug || '').toLowerCase();
  if (slug) brandMap.set(slug, b);
  if (b.brandName) brandMap.set(b.brandName.toLowerCase(), b);
  if (Array.isArray(b.searchAliases)) {
    for (const alias of b.searchAliases) {
      brandMap.set(alias.toLowerCase(), b);
    }
  }
}

const streamableVersions = ['2025-11-25', '2025-06-18', '2025-03-26'];

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON' },
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string' || !body.method) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" },
      }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const reqId = body.id ?? null;

  // 1. Initialize
  if (body.method === 'initialize') {
    const requested = body.params?.protocolVersion;
    const protocolVersion = streamableVersions.includes(requested) || requested === '2024-11-05'
      ? requested
      : requested ? streamableVersions[0] : '2024-11-05';
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'rights-and-renewals', version: '1.0.0' },
        },
      }),
      { headers: CORS_HEADERS }
    );
  }

  // 2. Initialized Notification
  if (body.method.startsWith('notifications/') && body.id === undefined) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  // 3. Tools List
  if (body.method === 'tools/list') {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          tools: [
            {
              name: 'policy_lookup',
              description:
                'Look up scoped German goods or subscription policies, with statutory and available provider sources.',
              inputSchema: {
                type: 'object',
                properties: {
                  service_slug: {
                    type: 'string',
                    description: "Brand or service slug (e.g. 'spotify', 'apple', 'mediamarkt')",
                  },
                  brand_slug: {
                    type: 'string',
                    description: 'Alias for service_slug for dual-slug compatibility',
                  },
                  category: { type: 'string', enum: ['hardware', 'subscription'] },
                },
                anyOf: [{ required: ['service_slug'] }, { required: ['brand_slug'] }],
              },
            },
            {
              name: 'claim_dossier_generate',
              description: claimDossierDescription,
              inputSchema: claimDossierInputSchema,
            },
            {
              name: 'statutory_law_lookup',
              description:
                'Look up statutory text and consumer rights summaries for German civil code sections (BGB §§ 434, 437, 438, 439, 475e, 477, 309 Nr. 9, 312k, 355).',
              inputSchema: {
                type: 'object',
                properties: {
                  statute_section: {
                    type: 'string',
                    enum: ['434', '437', '438', '439', '475e', '477', '309_nr_9', '312k', '355'],
                  },
                },
                required: ['statute_section'],
              },
            },
            {
              name: 'subscription_category_rules',
              description:
                'Retrieve statutory subscription rules, maximum initial contract term, and tacit renewal notice windows under BGB § 309 Nr. 9 & § 312k.',
              inputSchema: {
                type: 'object',
                properties: {
                  subscription_type: {
                    type: 'string',
                    enum: ['streaming', 'gym', 'telecom', 'software', 'press', 'cloud', 'generic'],
                  },
                },
                required: ['subscription_type'],
              },
            },
            {
              name: 'tax_deductibility_check',
              description:
                'Screen German work or study expenses. Generic categories require manual review. BMF one-year useful life is limited to specified hardware and acquired software.',
              inputSchema: {
                type: 'object',
                properties: {
                  item_name: { type: 'string', description: 'Name of the item or asset' },
                  asset_name: { type: 'string', description: 'Canonical asset name' },
                  item_category: { type: 'string', enum: ['hardware', 'subscription'] },
                  asset_category: {
                    type: 'string',
                    enum: [
                      'computer_hardware',
                      'peripherals',
                      'software_saas',
                      'subscription',
                      'hardware',
                      'acquired_business_software',
                      'academic_literature',
                      'smartphone',
                      'office_furniture',
                    ],
                  },
                  gross_price_eur: { type: 'number', exclusiveMinimum: 0 },
                  professional_use_percent: { type: 'number', minimum: 0, maximum: 100 },
                  academic_usage_percent: { type: 'number', minimum: 0, maximum: 100 },
                  taxpayer_status: {
                    type: 'string',
                    enum: ['master_zweitstudium', 'werkstudent_employee', 'bachelor_erststudium'],
                  },
                  purchase_date: { type: 'string', format: 'date' },
                },
                required: ['gross_price_eur'],
                allOf: [
                  { anyOf: [{ required: ['asset_name'] }, { required: ['item_name'] }] },
                  { anyOf: [{ required: ['asset_category'] }, { required: ['item_category'] }] },
                ],
              },
            },
          ],
        },
      }),
      { headers: CORS_HEADERS }
    );
  }

  // 4. Tools Call
  if (body.method === 'tools/call') {
    const toolName = body.params?.name;
    const args = body.params?.arguments || {};

    if (toolName === 'claim_dossier_generate') {
      const generated = generateClaimDossier(args, brandMap);
      if ('error' in generated) {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: reqId, error: { code: -32602, message: generated.error } }), { headers: CORS_HEADERS });
      }
      return new Response(JSON.stringify({
        jsonrpc: '2.0', id: reqId,
        result: { content: [{ type: 'text', text: JSON.stringify(generated.value, null, 2) }] },
      }), { headers: CORS_HEADERS });
    }
    if (toolName === 'policy_lookup') {
      const rawSlug = args.service_slug || args.brand_slug;
      if (!rawSlug || typeof rawSlug !== 'string' || !rawSlug.trim()) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: service_slug or brand_slug is required',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      if (args.category !== undefined && !['hardware', 'subscription'].includes(args.category)) {
        return Response.json({
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32602, message: 'Invalid params: category must be hardware or subscription' },
        }, { headers: CORS_HEADERS });
      }

      const normalized = rawSlug.trim().toLowerCase();
      const match = brandMap.get(normalized);

      if (!match) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Brand slug '${normalized}' not found in canonical dataset.`,
                },
              ],
              isError: true,
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const { notes, ...scope } = getPolicyScope(match.category, match);
      const policy = {
        ...scope,
        brand_slug: match.brandSlug,
        brand_name: match.brandName,
        category: match.category,
        cancellation_url: match.cancellationUrl,
        support_email: match.supportEmail,
        legal_notes: notes,
        catalog_record_date: match.verifiedDate,
      };
      return Response.json({
        jsonrpc: '2.0',
        id: reqId,
        result: { content: [{ type: 'text', text: JSON.stringify(policy, null, 2) }] },
      }, { headers: CORS_HEADERS });
    }
    // 1. statutory_law_lookup
    if (toolName === 'statutory_law_lookup') {
      const section = args.statute_section;
      if (!section || typeof section !== 'string' || !section.trim()) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: statute_section is required',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const coreResponse = await dispatchJsonRpc(body as any);
      if (
        'result' in coreResponse &&
        coreResponse.result &&
        Array.isArray((coreResponse.result as any).content) &&
        (coreResponse.result as any).content[0]?.text
      ) {
        try {
          const resultData = JSON.parse((coreResponse.result as any).content[0].text);
          resultData.statute_section =
            resultData.section || (args.statute_section ? `§ ${args.statute_section} BGB` : '§ 477 BGB');
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: reqId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(resultData, null, 2),
                  },
                ],
                isError: false,
              },
            }),
            { headers: CORS_HEADERS }
          );
        } catch {}
      }
      return new Response(JSON.stringify(coreResponse), { headers: CORS_HEADERS });
    }

    // 2. subscription_category_rules
    if (toolName === 'subscription_category_rules') {
      const rawCategory = args.contract_category || args.subscription_type;
      if (!rawCategory || typeof rawCategory !== 'string' || !rawCategory.trim()) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: contract_category or subscription_type is required',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const categoryMapping: Record<string, string> = {
        streaming: 'streaming_media',
        streaming_media: 'streaming_media',
        gym: 'gym_fitness',
        gym_fitness: 'gym_fitness',
        software: 'saas_software',
        saas_software: 'saas_software',
        telecom: 'telecom_mobile_internet',
        telecom_mobile_internet: 'telecom_mobile_internet',
        press: 'press_news_subscription',
        press_news_subscription: 'press_news_subscription',
        energy: 'energy_utility',
        energy_utility: 'energy_utility',
        cloud: 'saas_software',
        generic: 'saas_software',
      };

      const mappedCategory = categoryMapping[rawCategory.trim().toLowerCase()];
      if (!mappedCategory) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: `Invalid params: Unsupported subscription category '${rawCategory}'`,
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const coreBody = {
        jsonrpc: '2.0',
        id: reqId,
        method: 'tools/call',
        params: {
          name: 'subscription_category_rules',
          arguments: {
            contract_category: mappedCategory,
            ...(args.contract_start_date ? { contract_start_date: args.contract_start_date } : {}),
          },
        },
      };

      const coreResponse = await dispatchJsonRpc(coreBody);
      if (
        'result' in coreResponse &&
        coreResponse.result &&
        Array.isArray((coreResponse.result as any).content) &&
        (coreResponse.result as any).content[0]?.text
      ) {
        try {
          const resultData = JSON.parse((coreResponse.result as any).content[0].text);
          // Statutory legal maximum initial contract term under BGB § 309 Nr. 9 lit. a is 24 months
          resultData.max_initial_term_months = 24;
          resultData.statutory_max_initial_term_months = 24;
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: reqId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(resultData, null, 2),
                  },
                ],
                isError: false,
              },
            }),
            { headers: CORS_HEADERS }
          );
        } catch {}
      }
      return new Response(JSON.stringify(coreResponse), { headers: CORS_HEADERS });
    }

    // 3. tax_deductibility_check
    if (toolName === 'tax_deductibility_check') {
      const assetName = args.asset_name || args.item_name;
      if (!assetName || typeof assetName !== 'string' || !assetName.trim()) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: asset_name or item_name is required',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const grossPrice = args.gross_price_eur;
      if (typeof grossPrice !== 'number' || grossPrice <= 0 || isNaN(grossPrice)) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: gross_price_eur must be a positive number',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const assetCategory = args.asset_category ?? args.item_category;
      if (args.item_category === 'subscription' && !['subscription', 'software_saas'].includes(assetCategory)) {
        return Response.json({
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32602, message: 'A subscription must use the subscription or software_saas category' },
        }, { headers: CORS_HEADERS });
      }

      const validCategories = [
        'computer_hardware',
        'peripherals',
        'software_saas',
        'subscription',
        'hardware',
        'acquired_business_software',
        'academic_literature',
        'smartphone',
        'office_furniture',
      ];
      if (!assetCategory || !validCategories.includes(assetCategory)) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: `Invalid params: asset_category '${assetCategory}' is invalid. Allowed: ${validCategories.join(', ')}`,
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const taxpayerStatus = args.taxpayer_status || 'werkstudent_employee';
      const validStatuses = ['master_zweitstudium', 'werkstudent_employee', 'bachelor_erststudium'];
      if (!validStatuses.includes(taxpayerStatus)) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: `Invalid params: taxpayer_status '${taxpayerStatus}' is invalid.`,
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const usagePercent = args.academic_usage_percent ?? args.professional_use_percent;

      if (usagePercent !== undefined &&
          (typeof usagePercent !== 'number' || !Number.isFinite(usagePercent) || usagePercent < 0 || usagePercent > 100)) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: academic_usage_percent must be between 0 and 100',
            },
          }),
          { headers: CORS_HEADERS }
        );
      }

      const coreBody = {
        jsonrpc: '2.0',
        id: reqId,
        method: 'tools/call',
        params: {
          name: 'tax_deductibility_check',
          arguments: {
            asset_name: assetName.trim(),
            asset_category: assetCategory,
            gross_price_eur: grossPrice,
            taxpayer_status: taxpayerStatus,
            academic_usage_percent: usagePercent,
          },
        },
      };

      const coreResponse = await dispatchJsonRpc(coreBody);
      if (
        'result' in coreResponse &&
        coreResponse.result &&
        Array.isArray((coreResponse.result as any).content) &&
        (coreResponse.result as any).content[0]?.text
      ) {
        try {
          const resultData = JSON.parse((coreResponse.result as any).content[0].text);
          resultData.item_name = resultData.asset_name;
          resultData.item_category = args.item_category || resultData.asset_category;
          resultData.isDeductible = resultData.is_deductible;
          resultData.legalBasis = resultData.bmf_decree_reference ?? resultData.governing_statute;
          resultData.deductibleAmountEur = resultData.deductible_amount_eur;
          resultData.depreciationType = resultData.depreciation_type?.toLowerCase();
          resultData.write_off_method = resultData.status === 'manual_review' ? null : resultData.depreciation_type;

          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: reqId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(resultData, null, 2),
                  },
                ],
                isError: false,
              },
            }),
            { headers: CORS_HEADERS }
          );
        } catch {}
      }
      return new Response(JSON.stringify(coreResponse), { headers: CORS_HEADERS });
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32601, message: `Tool '${toolName}' not found` },
      }),
      { headers: CORS_HEADERS }
    );
  }

  // Fallback to core dispatcher for any other standard JSON-RPC methods
  const response = await dispatchJsonRpc(body as any);
  return new Response(JSON.stringify(response), { headers: CORS_HEADERS });
};

export const ALL: APIRoute = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return OPTIONS(context);
  }
  if (context.request.method === 'POST') {
    return POST(context);
  }
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Only POST requests supported' },
    }),
    {
      status: 405,
      headers: CORS_HEADERS,
    }
  );
};
