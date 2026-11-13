import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PolicyWikiEntry } from '@cmlab/core';
const planCms = vi.hoisted(() => ({ resolvePublishedPlanProjection: vi.fn() }));

const policyCms = vi.hoisted(() => ({ getPublishedPolicies: vi.fn() }));
const core = vi.hoisted(() => ({
  getPolicyScope: vi.fn(() => ({
    notes: 'Test scope.',
    legal_scope: 'Test scope.',
    sources: [],
  })),
  handleStatutoryLawLookup: vi.fn(),
  handleSubscriptionCategoryRules: vi.fn(),
  StatutoryLawLookupInputSchema: {
    shape: { statute_section: { options: ['437'] } },
  },
  SubscriptionCategoryRulesInputSchema: {
    shape: { contract_category: { options: ['streaming_media'] } },
  },
}));

vi.mock('../lib/policy-cms', () => policyCms);
vi.mock('../lib/policy-graph-cms.js', () => ({ parsePolicyContext: (params: URLSearchParams) => Object.fromEntries(params.entries()), ...planCms }));
vi.mock('@cmlab/core', () => core);

import { handlePublicMcp, publicMcpTools } from './publicMcp.js';

function policy(overrides: Partial<PolicyWikiEntry> = {}): PolicyWikiEntry {
  return {
    brandSlug: 'spotify',
    brandName: 'Spotify',
    category: 'subscription',
    statutoryWarrantyMonths: 0,
    commercialGuaranteeMonths: 0,
    cancellationNoticeMonths: 1,
    cancellationButtonCompliant: false,
    legalNotes: 'Test policy notes.',
    verifiedDate: '2026-11-10',
    searchAliases: ['spotify premium', 'music'],
    ...overrides,
  };
}

function callPolicyLookup(args: Record<string, unknown>): Request {
  return new Request('https://showcase.test/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-11-25',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: args },
    }),
  });
}

async function jsonResponse(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

describe('public MCP policy lookup', () => {
  beforeEach(() => {
    policyCms.getPublishedPolicies.mockReset();
  });

  it('resolves a brand slug or alias from published EmDash policy records', async () => {
    policyCms.getPublishedPolicies.mockResolvedValue([policy()]);

    const response = await handlePublicMcp(callPolicyLookup({ brand_slug: 'music' }));
    const payload = await jsonResponse(response);
    const result = payload.result as { structuredContent: Record<string, unknown> };

    expect(policyCms.getPublishedPolicies).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toMatchObject({
      brand_slug: 'spotify',
      brand_name: 'Spotify',
      category: 'subscription',
    });
  });

  it('returns an explicit error for ambiguous aliases', async () => {
    policyCms.getPublishedPolicies.mockResolvedValue([
      policy(),
      policy({
        brandSlug: 'another-service',
        brandName: 'Another Service',
        searchAliases: ['music'],
      }),
    ]);

    const response = await handlePublicMcp(callPolicyLookup({ service_slug: 'music' }));
    const payload = await jsonResponse(response);
    const result = payload.result as { isError: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('ambiguous');
    expect(result.content[0]?.text).toContain('spotify');
    expect(result.content[0]?.text).toContain('another-service');
  });

  it('advertises only read-only tools and does not expose write operations', async () => {
    const request = new Request('https://showcase.test/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'mcp-protocol-version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'tools/list' }),
    });

    const response = await handlePublicMcp(request);
    const payload = await jsonResponse(response);
    const result = payload.result as { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> };

    expect(result.tools.map((tool) => tool.name)).toEqual([
      'policy_lookup',
      'statutory_law_lookup',
      'subscription_category_rules',
      'plan_policy_lookup',
    ]);
    expect(result.tools.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
    expect(publicMcpTools.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
    expect(policyCms.getPublishedPolicies).not.toHaveBeenCalled();
  });

  it('returns the shared plan projection and rejects unknown arguments', async () => {
    const projection = { schemaVersion: 1, plan: 'demo-plan', context: {}, applicability: 'needs_information', findings: [] };
    planCms.resolvePublishedPlanProjection.mockResolvedValue(projection);
    const response = await handlePublicMcp(new Request('https://showcase.test/api/mcp', {
      method: 'POST', headers: { 'content-type': 'application/json', 'mcp-protocol-version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'plan_policy_lookup', arguments: { plan: 'demo-plan' } } }),
    }));
    expect(((await jsonResponse(response)).result as { structuredContent: unknown }).structuredContent).toEqual(projection);
    expect(planCms.resolvePublishedPlanProjection).toHaveBeenCalledWith('demo-plan', {});
    const malformed = await handlePublicMcp(new Request('https://showcase.test/api/mcp', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'plan_policy_lookup', arguments: { plan: 'x', debug: true } } }),
    }));
    expect((await jsonResponse(malformed)).error).toMatchObject({ code: -32602 });
  });
});
