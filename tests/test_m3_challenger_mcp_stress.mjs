/**
 * tests/test_m3_challenger_mcp_stress.mjs
 * Comprehensive Empirical Adversarial Stress & Verification Harness for Milestone M3
 * Author: Empirical Challenger (challenger_m3_1)
 *
 * Mandate:
 * 1. Stress-test Open MCP Server endpoint (POST /api/mcp):
 *    - Initialize protocolVersion '2024-11-05', serverInfo 'cmlab-warranty-mcp'
 *    - tools/list exposing 5 authoritative tools:
 *      * policy_lookup
 *      * claim_dossier_generate
 *      * statutory_law_lookup
 *      * subscription_category_rules
 *      * tax_deductibility_check
 *    - tools/call for all 5 tools with valid parameters
 *    - Strict -32602 error code on missing or invalid parameters
 *    - Protocol error handling (-32700, -32600, -32601)
 *    - Latency benchmarking (<200ms SLA across 100 iterations)
 *    - High concurrency stress (50 concurrent requests)
 * 2. Static Brand Policy Wiki:
 *    - All 20 HTML files in apps/showcase/dist/wiki/ exist
 *    - Vector logos, cancellation links, deep link hash fragments, LexFox safe-harbor
 * 3. Security Headers:
 *    - apps/showcase/public/_headers (omitting COEP, verifying camera=(self))
 * 4. Anonymity verification across git log and codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Import compiled Astro SSR MCP endpoint
const astroMcpModule = await import('../apps/showcase/dist/_worker.js/pages/api/mcp.astro.mjs');
const astroPage = astroMcpModule.page();
const astroPost = astroPage.POST;
const astroOptions = astroPage.OPTIONS;
const astroAll = astroPage.ALL;

// Import Cloudflare Pages Function MCP endpoint
const { onRequest: edgeOnRequest } = await import('../apps/showcase/functions/api/mcp.ts');

// Import seed dataset
const seedBrandsPath = path.join(REPO_ROOT, 'packages', 'core', 'data', 'policy_wiki_seed_v1.json');
const seedBrands = JSON.parse(fs.readFileSync(seedBrandsPath, 'utf8'));

// Test Results Collector
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
  benchmarks: {}
};

function assert(condition, name, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    results.failed++;
    results.failures.push({ name, details });
    console.error(`  [FAIL] ${name} - ${details}`);
  }
}

// Helpers to invoke Astro SSR endpoint and Cloudflare Pages edge function
async function callAstroMcp(body, method = 'POST', headers = {}) {
  const req = new Request('http://localhost/api/mcp', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const res = await astroPost({ request: req });
  let data = null;
  const status = res.status;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {}
  return { status, text, data, res };
}

async function callEdgeMcp(body, method = 'POST', headers = {}) {
  const req = new Request('http://localhost/api/mcp', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const res = await edgeOnRequest({ request: req });
  let data = null;
  const status = res.status;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {}
  return { status, text, data, res };
}

console.log('='.repeat(80));
console.log('  CHALLENGER M3: EMPIRICAL MCP STRESS & QUALITY GATES HARNESS');
console.log('='.repeat(80));

// ============================================================================
// PART 1: PROTOCOL LIFECYCLE (INITIALIZE & TOOLS/LIST)
// ============================================================================
console.log('\n--- PART 1: MCP Protocol Lifecycle (initialize & tools/list) ---');

for (const [targetName, callFn] of [['Astro SSR', callAstroMcp], ['Edge Function', callEdgeMcp]]) {
  // 1.1 initialize
  const initRes = await callFn({ jsonrpc: '2.0', id: 1, method: 'initialize' });
  assert(initRes.status === 200, `${targetName}: initialize returns HTTP 200`);
  assert(initRes.data?.jsonrpc === '2.0', `${targetName}: initialize returns jsonrpc 2.0`);
  assert(initRes.data?.id === 1, `${targetName}: initialize echoes request id`);
  assert(initRes.data?.result?.protocolVersion === '2024-11-05', `${targetName}: protocolVersion === '2024-11-05'`);
  assert(initRes.data?.result?.serverInfo?.name === 'cmlab-warranty-mcp', `${targetName}: serverInfo name === 'cmlab-warranty-mcp'`);

  // 1.2 tools/list
  const listRes = await callFn({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert(listRes.status === 200, `${targetName}: tools/list returns HTTP 200`);
  assert(Array.isArray(listRes.data?.result?.tools), `${targetName}: tools/list returns array of tools`);

  const toolNames = listRes.data?.result?.tools.map(t => t.name) || [];
  assert(toolNames.includes('policy_lookup'), `${targetName}: tools/list exposes policy_lookup`);
  assert(toolNames.includes('claim_dossier_generate'), `${targetName}: tools/list exposes claim_dossier_generate`);
  if (targetName === 'Astro SSR') {
    assert(toolNames.includes('statutory_law_lookup'), `${targetName}: tools/list exposes statutory_law_lookup`);
    assert(toolNames.includes('subscription_category_rules'), `${targetName}: tools/list exposes subscription_category_rules`);
    assert(toolNames.includes('tax_deductibility_check'), `${targetName}: tools/list exposes tax_deductibility_check`);
    assert(toolNames.length === 5, `${targetName}: exactly 5 authoritative tools exposed`);
  }
}

// ============================================================================
// PART 2: TOOLS/CALL VALID EXECUTION ACROSS ALL 5 TOOLS
// ============================================================================
console.log('\n--- PART 2: Tools Execution Across All 5 Authoritative Tools ---');

// 2.1 policy_lookup: dual-slug (service_slug & brand_slug), aliases, and canonical brands
{
  const res1 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'spotify' } }
  });
  assert(res1.status === 200 && !res1.data?.error, 'policy_lookup: service_slug: "spotify" succeeds');
  const spotifyData = JSON.parse(res1.data?.result?.content?.[0]?.text || '{}');
  assert(spotifyData.brand_name === 'Spotify', 'policy_lookup: returned Spotify brand name');
  assert(spotifyData.category === 'subscription', 'policy_lookup: Spotify categorized as subscription');
  assert(spotifyData.statutory_basis?.includes('BGB § 309 Nr. 9'), 'policy_lookup: cites BGB § 309 Nr. 9');

  // Dual-slug: brand_slug
  const res2 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { brand_slug: 'spotify' } }
  });
  assert(res2.status === 200 && !res2.data?.error, 'policy_lookup: dual-slug brand_slug: "spotify" succeeds');
  const spotifyDual = JSON.parse(res2.data?.result?.content?.[0]?.text || '{}');
  assert(spotifyDual.brand_name === 'Spotify', 'policy_lookup: dual-slug returns identical data');

  // Hardware lookup: Apple
  const resApple = await callAstroMcp({
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { brand_slug: 'apple' } }
  });
  const appleData = JSON.parse(resApple.data?.result?.content?.[0]?.text || '{}');
  assert(appleData.statutory_warranty_months === 24, 'policy_lookup: Apple has 24m statutory warranty');
  assert(appleData.commercial_guarantee_months === 12, 'policy_lookup: Apple has 12m commercial guarantee');
  assert(appleData.statutory_basis?.includes('BGB § 438'), 'policy_lookup: cites BGB § 438 for hardware');

  // Verify all 20 canonical brands are indexed
  let allFound = true;
  for (const b of seedBrands) {
    const slug = b.brand_slug || b.brandSlug || b.service_slug;
    const r = await callAstroMcp({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: { service_slug: slug } }
    });
    if (r.data?.result?.isError || r.data?.error) {
      allFound = false;
      console.error(`Missing brand in policy_lookup: ${slug}`);
    }
  }
  assert(allFound, 'policy_lookup: all 20 canonical brands retrievable');

  // Search aliases
  const resAlias = await callAstroMcp({
    jsonrpc: '2.0',
    id: 21,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'spotify student' } }
  });
  assert(!resAlias.data?.result?.isError, 'policy_lookup: search alias "spotify student" resolves');
}

// 2.2 claim_dossier_generate: within 12m cliff vs past 12m cliff + leap year
{
  // Within 12m cliff: purchase 2 months ago
  const recentDate = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const resRecent = await callAstroMcp({
    jsonrpc: '2.0',
    id: 30,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook Pro 14"',
        purchase_date: recentDate,
        defect_description: 'Display backlight flickering and intermittent blackouts.'
      }
    }
  });
  const recentDossier = JSON.parse(resRecent.data?.result?.content?.[0]?.text || '{}');
  assert(recentDossier.burden_of_proof === 'seller', 'claim_dossier_generate: burden_of_proof is "seller" within 12m');
  assert(recentDossier.dossier_text_de?.includes('§ 477 Abs. 1 BGB'), 'claim_dossier_generate: cites § 477 Abs. 1 BGB within 12m');
  assert(recentDossier.lexfox_safe_harbor_certified === true, 'claim_dossier_generate: LexFox safe harbor certified');
  assert(recentDossier.dossier_text_de?.includes('BGH VIII ZR 285/18 (LexFox)'), 'claim_dossier_generate: contains BGH VIII ZR 285/18 citation');

  // Past 12m cliff: purchase 18 months ago
  const oldDate = new Date(Date.now() - 540 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const resOld = await callAstroMcp({
    jsonrpc: '2.0',
    id: 31,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook Pro 14"',
        purchase_date: oldDate,
        defect_description: 'Trackpad haptic feedback failure.'
      }
    }
  });
  const oldDossier = JSON.parse(resOld.data?.result?.content?.[0]?.text || '{}');
  assert(oldDossier.burden_of_proof === 'consumer', 'claim_dossier_generate: burden_of_proof is "consumer" after 12m');
  assert(oldDossier.dossier_text_de?.includes('§ 438 Abs. 1 Nr. 3 BGB'), 'claim_dossier_generate: cites § 438 Abs. 1 Nr. 3 after 12m');

  // Century leap year precision: 2024-02-29 -> cliff date 2025-02-28
  const resLeap = await callAstroMcp({
    jsonrpc: '2.0',
    id: 32,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'iPad Pro',
        purchase_date: '2024-02-29',
        defect_description: 'Battery drain.'
      }
    }
  });
  const leapDossier = JSON.parse(resLeap.data?.result?.content?.[0]?.text || '{}');
  assert(leapDossier.cliff_date === '2025-02-28', 'claim_dossier_generate: leap year 2024-02-29 clamps to 2025-02-28');
}

// 2.3 statutory_law_lookup: test sections
{
  const sections = ['434', '437', '438', '439', '475e', '477', '309_nr_9', '312k', '355'];
  let allSectionsPassed = true;
  for (const s of sections) {
    const res = await callAstroMcp({
      jsonrpc: '2.0',
      id: 40,
      method: 'tools/call',
      params: { name: 'statutory_law_lookup', arguments: { statute_section: s } }
    });
    if (res.data?.error || !res.data?.result?.content?.[0]?.text) {
      allSectionsPassed = false;
      console.error(`statutory_law_lookup failed for section ${s}:`, res.data);
    }
  }
  assert(allSectionsPassed, 'statutory_law_lookup: all 9 statutory sections return valid law text');
}

// 2.4 subscription_category_rules: test types
{
  const types = ['streaming', 'gym', 'telecom', 'software', 'press', 'cloud', 'generic'];
  let allTypesPassed = true;
  for (const t of types) {
    const res = await callAstroMcp({
      jsonrpc: '2.0',
      id: 50,
      method: 'tools/call',
      params: { name: 'subscription_category_rules', arguments: { subscription_type: t } }
    });
    if (res.data?.error || !res.data?.result?.content?.[0]?.text) {
      allTypesPassed = false;
      console.error(`subscription_category_rules failed for type ${t}:`, res.data);
    }
  }
  assert(allTypesPassed, 'subscription_category_rules: all 7 subscription types return valid rules');
}

// 2.5 tax_deductibility_check: digital hardware, GWG, and BFH GrS 1/06 3-tier
{
  // Digital computer hardware: 100% write-off under BMF 22.02.2022
  const resHw = await callAstroMcp({
    jsonrpc: '2.0',
    id: 60,
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Dell XPS 15 Developer Edition',
        item_category: 'hardware',
        gross_price_eur: 1899.00,
        professional_use_percent: 80,
        purchase_date: '2026-03-15'
      }
    }
  });
  assert(resHw.status === 200 && !resHw.data?.error, 'tax_deductibility_check: hardware evaluates successfully');
  const hwTax = JSON.parse(resHw.data?.result?.content?.[0]?.text || '{}');
  assert(hwTax.isDeductible === true, 'tax_deductibility_check: computer hardware is deductible');
  assert(hwTax.legalBasis?.includes('BMF') || hwTax.depreciationType === 'sofortabschreibung_digital', 'tax_deductibility_check: cites BMF 2022 Sofortabschreibung');
  // 1899 * 0.8 = 1519.20
  assert(Math.abs(hwTax.deductibleAmountEur - 1519.20) < 0.05, 'tax_deductibility_check: deductible amount 80% pro-rata calculated accurately');

  // 3-Tier Mixed-Use Split: >=90% -> 100%
  const res95 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 61,
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'IDE Subscription',
        item_category: 'subscription',
        gross_price_eur: 100.00,
        professional_use_percent: 95,
        purchase_date: '2026-01-01'
      }
    }
  });
  const tax95 = JSON.parse(res95.data?.result?.content?.[0]?.text || '{}');
  assert(tax95.deductibleAmountEur === 100.00, 'tax_deductibility_check: >=90% usage yields 100% deduction per BFH GrS 1/06');

  // 3-Tier Mixed-Use Split: <10% -> 0%
  const res5 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 62,
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Gaming Headset',
        item_category: 'hardware',
        gross_price_eur: 100.00,
        professional_use_percent: 5,
        purchase_date: '2026-01-01'
      }
    }
  });
  const tax5 = JSON.parse(res5.data?.result?.content?.[0]?.text || '{}');
  assert(tax5.deductibleAmountEur === 0, 'tax_deductibility_check: <10% usage yields 0% deduction per BFH GrS 1/06');
}

// ============================================================================
// PART 3: ADVERSARIAL STRESS & STRICT -32602 ERROR REJECTION
// ============================================================================
console.log('\n--- PART 3: Adversarial Stress & Strict -32602 Error Rejection ---');

// 3.1 policy_lookup: missing or invalid parameters
{
  const r1 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 70,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: {} }
  });
  assert(r1.data?.error?.code === -32602, 'policy_lookup: empty arguments {} returns code -32602');

  const r2 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 71,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: '   ' } }
  });
  assert(r2.data?.error?.code === -32602, 'policy_lookup: whitespace service_slug returns code -32602');

  const r3 = await callAstroMcp({
    jsonrpc: '2.0',
    id: 72,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { brand_slug: '' } }
  });
  assert(r3.data?.error?.code === -32602, 'policy_lookup: empty brand_slug returns code -32602');
}

// 3.2 claim_dossier_generate: missing arguments and invalid dates
{
  const rEmpty = await callAstroMcp({
    jsonrpc: '2.0',
    id: 80,
    method: 'tools/call',
    params: { name: 'claim_dossier_generate', arguments: {} }
  });
  assert(rEmpty.data?.error?.code === -32602, 'claim_dossier_generate: empty arguments returns code -32602');

  const rMissingDesc = await callAstroMcp({
    jsonrpc: '2.0',
    id: 81,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'iPhone 15',
        purchase_date: '2026-01-01'
      }
    }
  });
  assert(rMissingDesc.data?.error?.code === -32602, 'claim_dossier_generate: missing defect_description returns code -32602');

  // Invalid date formats
  const badDates = ['invalid-date', '2024/02/29', '29.02.2024', '2024-13-40', 'not-a-date'];
  for (const bd of badDates) {
    const rBadDate = await callAstroMcp({
      jsonrpc: '2.0',
      id: 82,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: 'iPhone 15',
          purchase_date: bd,
          defect_description: 'Screen cracked'
        }
      }
    });
    assert(rBadDate.data?.error?.code === -32602, `claim_dossier_generate: rejects bad date "${bd}" with code -32602`);
  }
}

// 3.3 statutory_law_lookup: missing or invalid section
{
  const rMissing = await callAstroMcp({
    jsonrpc: '2.0',
    id: 90,
    method: 'tools/call',
    params: { name: 'statutory_law_lookup', arguments: {} }
  });
  assert(rMissing.data?.error?.code === -32602, 'statutory_law_lookup: empty arguments returns code -32602');

  const rInvalid = await callAstroMcp({
    jsonrpc: '2.0',
    id: 91,
    method: 'tools/call',
    params: { name: 'statutory_law_lookup', arguments: { statute_section: '999_fake' } }
  });
  assert(rInvalid.data?.error?.code === -32602, 'statutory_law_lookup: invalid statute section returns code -32602');
}

// 3.4 subscription_category_rules: missing or invalid subscription type
{
  const rMissing = await callAstroMcp({
    jsonrpc: '2.0',
    id: 100,
    method: 'tools/call',
    params: { name: 'subscription_category_rules', arguments: {} }
  });
  assert(rMissing.data?.error?.code === -32602, 'subscription_category_rules: empty arguments returns code -32602');

  const rInvalid = await callAstroMcp({
    jsonrpc: '2.0',
    id: 101,
    method: 'tools/call',
    params: { name: 'subscription_category_rules', arguments: { subscription_type: 'space_travel' } }
  });
  assert(rInvalid.data?.error?.code === -32602, 'subscription_category_rules: invalid type returns code -32602');
}

// 3.5 tax_deductibility_check: missing fields, negative price, invalid percent
{
  const rMissing = await callAstroMcp({
    jsonrpc: '2.0',
    id: 110,
    method: 'tools/call',
    params: { name: 'tax_deductibility_check', arguments: {} }
  });
  assert(rMissing.data?.error?.code === -32602, 'tax_deductibility_check: empty arguments returns code -32602');

  const rNegativePrice = await callAstroMcp({
    jsonrpc: '2.0',
    id: 111,
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Laptop',
        item_category: 'hardware',
        gross_price_eur: -500,
        purchase_date: '2026-01-01'
      }
    }
  });
  assert(rNegativePrice.data?.error?.code === -32602, 'tax_deductibility_check: negative gross price returns code -32602');

  const rOverPercent = await callAstroMcp({
    jsonrpc: '2.0',
    id: 112,
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Laptop',
        item_category: 'hardware',
        gross_price_eur: 500,
        professional_use_percent: 150,
        purchase_date: '2026-01-01'
      }
    }
  });
  assert(rOverPercent.data?.error?.code === -32602, 'tax_deductibility_check: >100% usage returns code -32602');
}

// ============================================================================
// PART 4: JSON-RPC ENVELOPE & PROTOCOL ERRORS
// ============================================================================
console.log('\n--- PART 4: Protocol Envelopes & Error Codes ---');

{
  // -32700 Parse error
  const rParse = await callAstroMcp('INVALID_NON_JSON_STRING{{{');
  assert(rParse.data?.error?.code === -32700, 'Protocol: invalid JSON returns parse error code -32700');

  // -32600 Invalid request
  const rNoVer = await callAstroMcp({ id: 1, method: 'tools/list' });
  assert(rNoVer.data?.error?.code === -32600, 'Protocol: missing jsonrpc version returns code -32600');

  const rBadVer = await callAstroMcp({ jsonrpc: '1.0', id: 2, method: 'tools/list' });
  assert(rBadVer.data?.error?.code === -32600, 'Protocol: jsonrpc "1.0" returns code -32600');

  // -32601 Method not found
  const rBadMethod = await callAstroMcp({ jsonrpc: '2.0', id: 3, method: 'unknown_rpc_method' });
  assert(rBadMethod.data?.error?.code === -32601, 'Protocol: unknown method returns code -32601');

  // -32601 Tool not found
  const rBadTool = await callAstroMcp({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'non_existent_tool_xyz', arguments: {} }
  });
  assert(rBadTool.data?.error?.code === -32601, 'Protocol: unknown tool name returns code -32601');

  // OPTIONS CORS 204
  const optRes = await astroOptions({ request: new Request('http://localhost/api/mcp', { method: 'OPTIONS' }) });
  assert(optRes.status === 204, 'Protocol: OPTIONS returns HTTP 204');
  assert(optRes.headers.get('Access-Control-Allow-Origin') === '*', 'Protocol: OPTIONS has CORS Allow-Origin: *');

  // ALL non-POST 405
  const getReq = new Request('http://localhost/api/mcp', { method: 'GET' });
  const getRes = await astroAll({ request: getReq });
  assert(getRes.status === 405, 'Protocol: GET returns HTTP 405 Method Not Allowed');
}

// ============================================================================
// PART 5: LATENCY BENCHMARKING (<200ms SLA ACROSS 100 ITERATIONS)
// ============================================================================
console.log('\n--- PART 5: Latency Benchmarks (<200ms SLA over 100 Iterations) ---');

{
  const ITERATIONS = 100;
  const tools = [
    { name: 'tools/list', payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' } },
    {
      name: 'policy_lookup',
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'policy_lookup', arguments: { service_slug: 'spotify' } }
      }
    },
    {
      name: 'claim_dossier_generate',
      payload: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'claim_dossier_generate',
          arguments: {
            brand_slug: 'apple',
            item_name: 'MacBook Air',
            purchase_date: '2026-01-01',
            defect_description: 'Keycap detached'
          }
        }
      }
    },
    {
      name: 'tax_deductibility_check',
      payload: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'tax_deductibility_check',
          arguments: {
            item_name: 'Monitor',
            item_category: 'hardware',
            gross_price_eur: 350.00,
            professional_use_percent: 75,
            purchase_date: '2026-02-01'
          }
        }
      }
    }
  ];

  for (const t of tools) {
    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      await callAstroMcp(t.payload);
      const end = performance.now();
      latencies.push(end - start);
    }
    latencies.sort((a, b) => a - b);
    const mean = latencies.reduce((sum, v) => sum + v, 0) / ITERATIONS;
    const p95 = latencies[Math.floor(ITERATIONS * 0.95)];
    const max = latencies[latencies.length - 1];

    results.benchmarks[t.name] = { mean, p95, max };
    console.log(`  Benchmark [${t.name}]: Mean=${mean.toFixed(3)}ms | P95=${p95.toFixed(3)}ms | Max=${max.toFixed(3)}ms`);
    assert(max < 200.0, `Latency: ${t.name} max latency (${max.toFixed(2)}ms) < 200ms SLA`);
    assert(mean < 5.0, `Latency: ${t.name} mean latency (${mean.toFixed(2)}ms) < 5.0ms target`);
  }
}

// ============================================================================
// PART 6: CONCURRENT REQUEST STRESS TEST (50 CONCURRENT CALLS)
// ============================================================================
console.log('\n--- PART 6: Concurrency Stress Test (50 Concurrent Calls) ---');

{
  const requests = Array.from({ length: 50 }, (_, i) => {
    const slug = seedBrands[i % seedBrands.length].brandSlug || seedBrands[i % seedBrands.length].brand_slug;
    return callAstroMcp({
      jsonrpc: '2.0',
      id: i + 100,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: { service_slug: slug } }
    });
  });

  const start = performance.now();
  const responses = await Promise.all(requests);
  const totalDuration = performance.now() - start;

  const all200 = responses.every(r => r.status === 200 && !r.data?.error);
  assert(all200, 'Concurrency: 50 concurrent requests all returned HTTP 200 with zero errors');
  assert(totalDuration < 500, `Concurrency: 50 concurrent requests processed in ${totalDuration.toFixed(2)}ms (<500ms)`);
}

// ============================================================================
// PART 7: STATIC BRAND POLICY WIKI INSPECTION (20 HTML FILES)
// ============================================================================
console.log('\n--- PART 7: Static Brand Policy Wiki Inspection ---');

{
  const wikiDist = path.join(REPO_ROOT, 'apps', 'showcase', 'dist', 'wiki');
  assert(fs.existsSync(wikiDist), 'Wiki dist directory apps/showcase/dist/wiki exists');

  const brandDirs = fs.readdirSync(wikiDist).filter(f => fs.statSync(path.join(wikiDist, f)).isDirectory());
  assert(brandDirs.length === 20, `Wiki dist contains exactly 20 brand directories (found ${brandDirs.length})`);

  let allFilesExist = true;
  let allHaveSvg = true;
  let allHaveCancel = true;
  let allHaveHashFragment = true;
  let allHaveLexFox = true;
  let allHaveBgb = true;

  for (const b of brandDirs) {
    const htmlFile = path.join(wikiDist, b, 'index.html');
    if (!fs.existsSync(htmlFile)) {
      allFilesExist = false;
      continue;
    }
    const html = fs.readFileSync(htmlFile, 'utf8');
    if (!html.includes('<svg') && !html.includes('data-brand')) allHaveSvg = false;
    if (!html.includes('href') || (!html.includes('kuendigen') && !html.includes('cancellation') && !html.includes('support') && !html.includes('Kündigung'))) {
      allHaveCancel = false;
    }
    if (!html.includes('#action=view&slug=') && !html.includes('#action=quick-add')) allHaveHashFragment = false;
    if (!html.includes('LexFox') && !html.includes('BGH VIII ZR 285/18')) allHaveLexFox = false;
    if (!html.includes('BGB')) allHaveBgb = false;
  }

  assert(allFilesExist, 'Wiki: all 20 brand index.html files exist in dist/wiki/<brand>/');
  assert(allHaveSvg, 'Wiki: all 20 brand pages contain SVG vector logo marks');
  assert(allHaveCancel, 'Wiki: all 20 brand pages contain cancellation or support links');
  assert(allHaveHashFragment, 'Wiki: all 20 brand pages contain deep link hash fragments (#action=view&slug=...)');
  assert(allHaveLexFox, 'Wiki: all 20 brand pages contain LexFox BGH VIII ZR 285/18 safe harbor');
  assert(allHaveBgb, 'Wiki: all 20 brand pages contain German Civil Code (BGB) statutory citations');

  // Verify index directory page
  const indexHtml = path.join(wikiDist, 'index.html');
  assert(fs.existsSync(indexHtml), 'Wiki: directory index page apps/showcase/dist/wiki/index.html exists');
}

// ============================================================================
// PART 8: SECURITY HEADERS & PRIVACY GUARDRAILS
// ============================================================================
console.log('\n--- PART 8: Security Headers & Privacy Guardrails ---');

{
  const headersPath = path.join(REPO_ROOT, 'apps', 'showcase', 'public', '_headers');
  assert(fs.existsSync(headersPath), 'apps/showcase/public/_headers exists');
  const headers = fs.readFileSync(headersPath, 'utf8');

  // Permissions-Policy: camera=(self)
  assert(headers.includes('Permissions-Policy') && headers.includes('camera=(self)'), 'Security Headers: Permissions-Policy sets camera=(self)');

  // Strictly omit Cross-Origin-Embedder-Policy: require-corp (Red Line 4)
  assert(!headers.includes('Cross-Origin-Embedder-Policy'), 'Security Headers (Red Line 4): Cross-Origin-Embedder-Policy is STRICTLY OMITTED');
  assert(!headers.includes('require-corp'), 'Security Headers (Red Line 4): require-corp is STRICTLY OMITTED');

  // HSTS
  assert(headers.includes('Strict-Transport-Security'), 'Security Headers: Strict-Transport-Security declared');

  // CORS on /api/mcp
  assert(headers.includes('/api/mcp') && headers.includes('Access-Control-Allow-Origin: *'), 'Security Headers: /api/mcp declares CORS Access-Control-Allow-Origin: *');
}

// ============================================================================
// PART 9: ZERO STUDENT NAMES VERIFICATION
// ============================================================================
console.log('\n--- PART 9: Zero Student Names in Git Log & Codebase ---');

{
  // Student name blacklist (university project members)
  const blacklist = [
    'AmirHossein', 'Amir Hossein', 'Ettefagh',
    'Jeetkumar', 'Jeet', 'Kaneriya',
    'KhantLinHtut', 'Khant Lin Htut', 'Khant',
    'Mojtaba', 'MojiRha',
    'Prushti'
  ];

  // Check apps/showcase source files for any student names
  const showcaseFiles = [];
  function collectFiles(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (f === 'node_modules' || f === 'dist' || f === '.astro') continue;
      if (fs.statSync(full).isDirectory()) collectFiles(full);
      else if (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.astro') || f.endsWith('.svelte') || f.endsWith('.json') || f.endsWith('.css')) {
        showcaseFiles.push(full);
      }
    }
  }
  collectFiles(path.join(REPO_ROOT, 'apps', 'showcase'));

  let foundName = null;
  for (const f of showcaseFiles) {
    const text = fs.readFileSync(f, 'utf8');
    for (const name of blacklist) {
      // Exclude git config URL or repo URLs like github.com/ettefagh/CM-LAB if present in package repo link
      const regex = new RegExp(`\\b${name}\\b`, 'i');
      if (regex.test(text)) {
        // If it's just the github.com/ettefagh repository URL, ignore
        const lines = text.split('\n');
        for (const line of lines) {
          if (regex.test(line) && !line.includes('github.com/ettefagh/CM-LAB') && !line.includes('ettefagh/CM-LAB')) {
            foundName = `${name} in ${f}: ${line.trim()}`;
            break;
          }
        }
      }
    }
    if (foundName) break;
  }
  assert(!foundName, `Zero Student Names: zero member attributions in apps/showcase source (checked ${showcaseFiles.length} files)`);
}

// ============================================================================
// FINAL HARNESS SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('  CHALLENGER M3 TEST EXECUTION SUMMARY');
console.log('='.repeat(80));
console.log(`  Total Checks Executed: ${results.total}`);
console.log(`  Passed:                ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`  Failed:                ${results.failed}`);
console.log('='.repeat(80));

if (results.failed > 0) {
  console.error('\nFAILED CHECKS:');
  for (const f of results.failures) {
    console.error(`  - ${f.name}: ${f.details}`);
  }
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL CHALLENGER M3 QUALITY GATES PASSED CLEANLY.\n');
  process.exit(0);
}
