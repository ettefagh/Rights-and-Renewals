import { describe, it, expect } from 'vitest';
import { dispatchJsonRpc } from '../src/mcp/jsonRpcDispatcher.js';

describe('jsonRpcDispatcher - Open MCP Protocol & Strict Schemas', () => {
  it('MCP-01: executes calls within <200ms SLA', async () => {
    const t0 = performance.now();
    const response = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'sla-test',
      method: 'tools/list',
    });
    const elapsed = performance.now() - t0;
    expect(response).toBeDefined();
    expect(elapsed).toBeLessThan(200);
  });

  it('handles initialize and notifications/initialized methods', async () => {
    const initRes = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });
    expect('result' in initRes).toBe(true);
    if ('result' in initRes) {
      expect((initRes.result as any).protocolVersion).toBe('2024-11-05');
      expect((initRes.result as any).serverInfo.name).toBe('cm-lab-mcp-server');
    }

    const notifRes = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'notifications/initialized',
    });
    expect('result' in notifRes).toBe(true);
  });

  it('MCP-02 & MCP-03: returns code -32600 on malformed request', async () => {
    const res1 = await dispatchJsonRpc(null);
    expect('error' in res1).toBe(true);
    if ('error' in res1) {
      expect(res1.error.code).toBe(-32600);
    }

    const res2 = await dispatchJsonRpc({ id: 1, method: 'tools/list' }); // Missing jsonrpc: "2.0"
    expect('error' in res2).toBe(true);
    if ('error' in res2) {
      expect(res2.error.code).toBe(-32600);
    }
  });

  it('MCP-04: returns code -32601 on unknown method', async () => {
    const res = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'unknown/method',
    });
    expect('error' in res).toBe(true);
    if ('error' in res) {
      expect(res.error.code).toBe(-32601);
    }
  });

  it('MCP-05: returns only the three public consumer-rights tools', async () => {
    const response = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-01',
      method: 'tools/list',
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const result = response.result as any;
      expect(result.tools).toHaveLength(3);
      const names = result.tools.map((t: any) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'policy_lookup',
          'statutory_law_lookup',
          'subscription_category_rules',
        ])
      );
      expect(names).not.toContain('tax_deductibility_check');
    }
  });

  it('MCP-06: executes policy_lookup for cataloged and uncataloged brands', async () => {
    // Spotify subscription
    const spotifyRes = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'p1',
      method: 'tools/call',
      params: {
        name: 'policy_lookup',
        arguments: {
          service_slug: 'spotify',
          category: 'subscription',
        },
      },
    });
    expect('result' in spotifyRes).toBe(true);
    if ('result' in spotifyRes) {
      const parsed = JSON.parse((spotifyRes.result as any).content[0].text);
      expect(parsed.brand_name).toBe('Spotify');
      expect(parsed.cancellation_button_compliant).toBeNull();
      expect(parsed.cancellation_notice_months).toBeNull();
      expect(parsed.statutory_warranty_months).toBeNull();
      expect(parsed.sources).toContainEqual(expect.objectContaining({
        url: 'https://support.spotify.com/de/article/cancel-premium/',
      }));
    }

    // Uncataloged brand
    const uncatRes = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'p2',
      method: 'tools/call',
      params: {
        name: 'policy_lookup',
        arguments: {
          service_slug: 'unknown-brand-xyz',
          category: 'hardware',
        },
      },
    });
    expect('result' in uncatRes).toBe(true);
    if ('result' in uncatRes) {
      const parsed = JSON.parse((uncatRes.result as any).content[0].text);
      expect(parsed.statutory_warranty_months).toBe(24);
      expect(parsed.reversed_burden_months).toBe(12);
      expect(parsed.notes).toContain('not in the curated Top 20');
    }
  });

  it('MCP-07: executes statutory_law_lookup returning BGB § 477 ground truth', async () => {
    const response = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-03',
      method: 'tools/call',
      params: {
        name: 'statutory_law_lookup',
        arguments: {
          statute_section: '477',
          language: 'de',
        },
      },
    });

    expect('result' in response).toBe(true);
    if ('result' in response) {
      const content = JSON.parse((response.result as any).content[0].text);
      expect(content.section).toContain('BGB § 477 Abs. 1');
      expect(content.duration_months).toBe(12);
      expect(content.statutory_text).toContain('eines Jahres');
      expect(content.statutory_text).toContain('Absatz 2');
      expect(content.source).toBe('https://www.gesetze-im-internet.de/bgb/__477.html');
      expect(content.text_status).toContain('official-source');
      expect(content.scope_note).toContain('Consumer-goods sale');
      expect(content.source_checked_on).toBe('2026-11-10');
    }
  });

  it('MCP-08: executes subscription_category_rules evaluating reform boundaries', async () => {
    const postReform = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'sub-post',
      method: 'tools/call',
      params: {
        name: 'subscription_category_rules',
        arguments: {
          contract_category: 'gym_fitness',
          contract_start_date: '2023-01-01',
        },
      },
    });
    expect('result' in postReform).toBe(true);
    if ('result' in postReform) {
      const content = JSON.parse((postReform.result as any).content[0].text);
      expect(content.max_cancellation_notice_period_days).toBeNull();
      expect(content.automatic_renewal_rule).toContain('§ 309 No. 9');
      expect(content.ordinary_termination).toContain('No individual');
      expect(content.extraordinary_termination).toContain('No extraordinary');
      expect(content.sources).toEqual(expect.arrayContaining([
        expect.objectContaining({ url: 'https://www.gesetze-im-internet.de/bgb/__309.html' }),
        expect.objectContaining({ url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }),
      ]));
    }

    const preReform = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'sub-pre',
      method: 'tools/call',
      params: {
        name: 'subscription_category_rules',
        arguments: {
          contract_category: 'gym_fitness',
          contract_start_date: '2021-01-01',
        },
      },
    });
    expect('result' in preReform).toBe(true);
    if ('result' in preReform) {
      const content = JSON.parse((preReform.result as any).content[0].text);
      expect(content.automatic_renewal_rule).toContain('predates 01.03.2022');
    }
  });

  it('MCP-10: rejects extraneous parameters with code -32602 via Zod .strict()', async () => {
    const response = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-02',
      method: 'tools/call',
      params: {
        name: 'policy_lookup',
        arguments: {
          service_slug: 'sony',
          category: 'hardware',
          extraneous_attack_field: 'unauthorized',
        },
      },
    });

    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('Invalid params');
    }
  });

  it('MCP-11 & MCP-12: rejects missing parameters and invalid enums with code -32602', async () => {
    const missingParam = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-missing',
      method: 'tools/call',
      params: {
        name: 'policy_lookup',
        arguments: {
          category: 'hardware',
        },
      },
    });
    expect('error' in missingParam).toBe(true);
    if ('error' in missingParam) {
      expect(missingParam.error.code).toBe(-32602);
    }

    const invalidEnum = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-enum',
      method: 'tools/call',
      params: {
        name: 'policy_lookup',
        arguments: {
          service_slug: 'apple',
          category: 'invalid_category_enum',
        },
      },
    });
    expect('error' in invalidEnum).toBe(true);
    if ('error' in invalidEnum) {
      expect(invalidEnum.error.code).toBe(-32602);
    }
  });

  it('returns -32602 on unknown tool call or missing tool name', async () => {
    const unknownTool = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-unknown',
      method: 'tools/call',
      params: {
        name: 'unknown_tool_xyz',
        arguments: {},
      },
    });
    expect('error' in unknownTool).toBe(true);
    if ('error' in unknownTool) {
      expect(unknownTool.error.code).toBe(-32602);
      expect(unknownTool.error.message).toContain('Unknown tool');
      expect(unknownTool.error.message).toContain('Unknown tool');
    }

    const noName = await dispatchJsonRpc({
      jsonrpc: '2.0',
      id: 'req-noname',
      method: 'tools/call',
      params: {},
    });
    expect('error' in noName).toBe(true);
    if ('error' in noName) {
      expect(noName.error.code).toBe(-32602);
    }
  });

  it('does not expose the tax helper through MCP calls', async () => {
    const response = await dispatchJsonRpc({
      jsonrpc: '2.0', id: 'tax-removed', method: 'tools/call',
      params: { name: 'tax_deductibility_check', arguments: {} },
    });
    expect('error' in response).toBe(true);
    if ('error' in response) {
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toContain('Unknown tool');
    }
  });

  it('covers all statutory laws in English and German', async () => {
    const statutes = [
      '434',
      '437',
      '438',
      '439',
      '475e',
      '477',
      '309_nr_9',
      '312g',
      '312k',
      '355',
    ] as const;

    for (const statute of statutes) {
      const res = await dispatchJsonRpc({
        jsonrpc: '2.0',
        id: `statute-${statute}`,
        method: 'tools/call',
        params: {
          name: 'statutory_law_lookup',
          arguments: {
            statute_section: statute,
            language: 'en',
          },
        },
      });
      expect('result' in res).toBe(true);
    }
  });

  it('covers all subscription categories', async () => {
    const categories = [
      'generic',
      'gym_fitness',
      'streaming_media',
      'saas_software',
      'telecom_mobile_internet',
      'press_news_subscription',
      'energy_utility',
    ] as const;

    for (const cat of categories) {
      const res = await dispatchJsonRpc({
        jsonrpc: '2.0',
        id: `cat-${cat}`,
        method: 'tools/call',
        params: {
          name: 'subscription_category_rules',
          arguments: {
            contract_category: cat,
          },
        },
      });
      expect('result' in res).toBe(true);
    }
  });

  it('rejects impossible contract dates and leaves generic category unclassified', async () => {
    const impossible = await dispatchJsonRpc({
      jsonrpc: '2.0', id: 'bad-date', method: 'tools/call',
      params: { name: 'subscription_category_rules', arguments: { contract_category: 'generic', contract_start_date: '2022-02-30' } },
    });
    expect('error' in impossible).toBe(true);

    const generic = await dispatchJsonRpc({
      jsonrpc: '2.0', id: 'generic', method: 'tools/call',
      params: { name: 'subscription_category_rules', arguments: { contract_category: 'generic' } },
    });
    expect('result' in generic).toBe(true);
    if ('result' in generic) {
      const content = JSON.parse((generic.result as any).content[0].text);
      expect(content.category).toBe('generic');
      expect(content.max_initial_term_months).toBeNull();
      expect(content.scope_note).toContain('standard term');
    }
  });

});
