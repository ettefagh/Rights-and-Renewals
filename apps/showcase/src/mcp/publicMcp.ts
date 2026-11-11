import {
  getPolicyScope,
  handleStatutoryLawLookup,
  handleSubscriptionCategoryRules,
  StatutoryLawLookupInputSchema,
  SubscriptionCategoryRulesInputSchema,
} from '@cmlab/core';
import type { PolicyWikiEntry } from '@cmlab/core';
import { getPublishedPolicies } from '../lib/policy-cms';
import { z } from 'zod';

const protocolVersions = ['2025-11-25', '2025-06-18', '2025-03-26'];
const serverVersion = '2.0.0';

const cors = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version',
  'Cache-Control': 'no-store',
  Vary: 'Origin',
};
const trustedOrigins = new Set([
  'https://rightsandrenewals-app.pages.dev',
]);

const subscriptionAliases = new Map([
  ['streaming', 'streaming_media'],
  ['gym', 'gym_fitness'],
  ['telecom', 'telecom_mobile_internet'],
  ['software', 'saas_software'],
  ['cloud', 'saas_software'],
  ['press', 'press_news_subscription'],
  ['energy', 'energy_utility'],
  ['generic', 'generic'],
]);

function buildBrandMap(policies: PolicyWikiEntry[]): Map<string, PolicyWikiEntry[]> {
  const brands = new Map<string, PolicyWikiEntry[]>();
  for (const brand of policies) {
    for (const alias of [brand.brandSlug, brand.brandName, ...brand.searchAliases]) {
      const key = alias.trim().toLowerCase();
      if (!key) continue;
      const matches = brands.get(key) ?? [];
      if (!matches.some((match) => match.brandSlug === brand.brandSlug)) {
        matches.push(brand);
      }
      brands.set(key, matches);
    }
  }
  return brands;
}

const nonempty = z.string().trim().min(1);
const category = z.enum(['hardware', 'subscription']);
const policyInput = z.object({
  service_slug: nonempty.optional(),
  brand_slug: nonempty.optional(),
  category: category.optional(),
}).strict().refine(input => input.service_slug || input.brand_slug, 'service_slug or brand_slug is required');
const subscriptionInput = z.object({
  subscription_type: nonempty.optional(),
  contract_category: nonempty.optional(),
  contract_start_date: nonempty.optional(),
}).strict().refine(input => input.subscription_type || input.contract_category, 'subscription_type or contract_category is required');

const string = { type: 'string' };
const nullableString = { type: ['string', 'null'] };
const nullableInteger = { type: ['integer', 'null'] };
const nullableBoolean = { type: ['boolean', 'null'] };
const stringArray = { type: 'array', items: string };
const sourceLinks = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    properties: { title: string, url: { type: 'string', format: 'uri' } },
    required: ['title', 'url'],
  },
};

function outputSchema(requiredProperties: Record<string, object>, optionalProperties: Record<string, object> = {}) {
  return {
    type: 'object',
    properties: { ...requiredProperties, ...optionalProperties },
    required: Object.keys(requiredProperties),
  };
}

export const publicMcpTools = [
  {
    name: 'policy_lookup',
    description: 'Look up cataloged German goods or subscription policies with statutory and available provider sources.',
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        service_slug: { ...string, minLength: 1 },
        brand_slug: { ...string, minLength: 1, description: 'Alias for service_slug' },
        category: { ...string, enum: category.options, description: 'Optional assertion of the catalog category' },
      },
      anyOf: [{ required: ['service_slug'] }, { required: ['brand_slug'] }],
      additionalProperties: false,
    },
    outputSchema: outputSchema({
      brand_slug: string,
      brand_name: string,
      category: { ...string, enum: category.options },
      jurisdiction: { ...string, const: 'DE' },
      statutory_warranty_months: nullableInteger,
      commercial_guarantee_months: nullableInteger,
      reversed_burden_months: nullableInteger,
      cancellation_notice_months: nullableInteger,
      cancellation_button_compliant: nullableBoolean,
      legal_scope: string,
      legal_notes: string,
      catalog_record_date: string,
      sources: sourceLinks,
    }, { cancellation_url: string, support_email: string }),
  },
  {
    name: 'statutory_law_lookup',
    description: 'Read a dated German Civil Code reference with an official source and scope notes.',
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        statute_section: { ...string, enum: StatutoryLawLookupInputSchema.shape.statute_section.options },
        language: { ...string, enum: ['de', 'en'], default: 'de' },
      },
      required: ['statute_section'],
      additionalProperties: false,
    },
    outputSchema: outputSchema({
      section: string,
      title: string,
      language: string,
      statutory_text: string,
      legal_summary: string,
      source: { ...string, format: 'uri' },
      scope_note: string,
      text_status: string,
    }, {
      statute_section: string,
      effective_date: nullableString,
      source_checked_on: { ...string, format: 'date' },
      duration_months: nullableInteger,
      statutory_basis: stringArray,
    }),
  },
  {
    name: 'subscription_category_rules',
    description: 'Explain when German standard-term and online cancellation rules may apply to consumer subscriptions.',
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        subscription_type: { ...string, enum: [...new Set([...subscriptionAliases.keys(), ...SubscriptionCategoryRulesInputSchema.shape.contract_category.options])] },
        contract_category: { ...string, enum: SubscriptionCategoryRulesInputSchema.shape.contract_category.options },
        contract_start_date: { ...string, format: 'date', description: 'Date the contract was concluded, if known' },
      },
      anyOf: [{ required: ['subscription_type'] }, { required: ['contract_category'] }],
      additionalProperties: false,
    },
    outputSchema: outputSchema({
      category: string,
      max_initial_term_months: nullableInteger,
      automatic_renewal_rule: string,
      max_cancellation_notice_period_days: nullableInteger,
      cancellation_button_mandatory: nullableBoolean,
      governing_statutes: stringArray,
      rule_scope: string,
      scope_note: string,
      ordinary_termination: string,
      extraordinary_termination: string,
      sources: sourceLinks,
    }, { contract_start_date: nullableString, dark_pattern_alert: string }),
  },
];

const rpcInput = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: nonempty,
  params: z.record(z.unknown()).optional(),
});
const toolCall = z.object({ name: nonempty, arguments: z.record(z.unknown()).optional() });

export async function handlePublicMcp(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin');
  const sameOrigin = new URL(request.url).origin;
  if (origin && origin !== sameOrigin && !trustedOrigins.has(origin)) {
    return new Response(null, { status: 403, headers: cors });
  }

  const headers = new Headers(cors);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  const error = (id: string | number | null, code: number, message: string, status = 200) =>
    Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { status, headers });

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const version = request.headers.get('MCP-Protocol-Version');
  if (version && !protocolVersions.includes(version)) {
    return error(null, -32600, 'Unsupported MCP-Protocol-Version', 400);
  }
  if (request.method !== 'POST') {
    headers.set('Allow', 'POST, OPTIONS');
    return error(null, -32600, 'Use POST for JSON-RPC. This endpoint does not open an SSE stream.', 405);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return error(null, -32700, 'Invalid JSON', 400);
  }
  const parsed = rpcInput.safeParse(raw);
  if (!parsed.success) return error(null, -32600, 'Invalid JSON-RPC request', 400);
  const { id, method, params } = parsed.data;
  if (id === undefined) return new Response(null, { status: 202, headers });

  const reply = (result: object) => Response.json({ jsonrpc: '2.0', id, result }, { headers });
  const toolResult = (data: object) => reply({
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    ...(version === '2025-03-26' ? {} : { structuredContent: data }),
  });
  const toolError = (message: string) =>
    reply({ content: [{ type: 'text', text: message }], isError: true });
  const invalidParams = (message: string) => error(id, -32602, message);

  if (method === 'initialize') {
    const requested = params?.protocolVersion;
    const protocolVersion = typeof requested === 'string' && protocolVersions.includes(requested)
      ? requested : protocolVersions[0];
    return reply({
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'rights-and-renewals', version: serverVersion },
    });
  }
  if (method === 'ping') return reply({});
  if (method === 'tools/list') {
    return reply({
      tools: version === '2025-03-26'
        ? publicMcpTools.map(({ outputSchema: _output, ...tool }) => tool)
        : publicMcpTools,
    });
  }
  if (method !== 'tools/call') return error(id, -32601, `Method '${method}' not found`);

  const call = toolCall.safeParse(params);
  if (!call.success) return invalidParams('A tool name and an optional arguments object are required');
  const { name, arguments: args = {} } = call.data;
  switch (name) {
    case 'policy_lookup': {
      const input = policyInput.safeParse(args);
      if (!input.success) return invalidParams(input.error.issues[0]?.message ?? 'Invalid policy lookup arguments.');
      const slug = (input.data.service_slug ?? input.data.brand_slug ?? '').toLowerCase();
      if (input.data.service_slug && input.data.brand_slug &&
          input.data.service_slug.toLowerCase() !== input.data.brand_slug.toLowerCase()) {
        return invalidParams('service_slug and brand_slug conflict');
      }
      let policies: PolicyWikiEntry[];
      try {
        policies = await getPublishedPolicies();
      } catch (error) {
        console.error('[mcp] Failed to read published EmDash policy content.', error);
        return toolError('Published policy content is temporarily unavailable.');
      }
      const matches = buildBrandMap(policies).get(slug) ?? [];
      if (matches.length === 0) return toolError(`Brand '${slug}' is not in the catalog`);
      if (matches.length > 1) {
        return toolError(`Brand reference '${slug}' is ambiguous. Use a canonical slug: ${matches.map((brand) => brand.brandSlug).join(', ')}`);
      }
      const brand = matches[0];
      if (!brand) return toolError(`Brand '${slug}' is not in the catalog`);
      if (input.data.category && input.data.category !== brand.category) {
        return invalidParams(`Catalog category for '${brand.brandSlug}' is ${brand.category}`);
      }
      const { notes, ...scope } = getPolicyScope(brand.category, brand);
      return toolResult({
        ...scope,
        brand_slug: brand.brandSlug,
        brand_name: brand.brandName,
        category: brand.category,
        jurisdiction: 'DE',
        cancellation_url: brand.cancellationUrl,
        support_email: brand.supportEmail,
        legal_notes: notes ?? scope.legal_scope,
        catalog_record_date: brand.verifiedDate,
      });
    }
    case 'statutory_law_lookup': {
      const input = StatutoryLawLookupInputSchema.safeParse(args);
      if (!input.success) return invalidParams(input.error.issues[0]?.message ?? 'Invalid statutory law lookup arguments.');
      const result = handleStatutoryLawLookup(input.data);
      return toolResult({ ...result, statute_section: result.section });
    }
    case 'subscription_category_rules': {
      const input = subscriptionInput.safeParse(args);
      if (!input.success) return invalidParams(input.error.issues[0]?.message ?? 'Invalid subscription rule arguments.');
      const { contract_category, subscription_type, contract_start_date } = input.data;
      const type = subscription_type?.toLowerCase();
      const alias = type && (subscriptionAliases.get(type) ?? type);
      if (contract_category && alias && contract_category !== alias) {
        return invalidParams('contract_category and subscription_type conflict');
      }
      const normalized = SubscriptionCategoryRulesInputSchema.safeParse({
        contract_category: contract_category ?? alias,
        contract_start_date,
      });
      if (!normalized.success) return invalidParams(normalized.error.issues[0]?.message ?? 'Invalid subscription rule arguments.');
      return toolResult(handleSubscriptionCategoryRules(normalized.data));
    }
    default:
      return error(id, -32602, `Unknown tool '${name}'`);
  }
}
