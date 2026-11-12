/**
 * test_m2_adversarial_deep.mjs
 * Comprehensive Empirical Adversarial Verification for Milestone M2 Gate 2
 *
 * Targets:
 * 1. MockMcpTransport.js (apps/showcase/src/mcp/MockMcpTransport.js)
 * 2. mock-mcp-engine.js (apps/showcase/js/mock-mcp-engine.js)
 * 3. functions/api/mcp.ts (Cloudflare Pages Edge Function)
 *
 * Verifies:
 * - BGB § 188 Abs. 3 date clamping across century leap years:
 *   2024-02-29, 2020-02-29, 2000-02-29, 2100-02-28, 1900-02-28, 1600-02-29, 2400-02-29, 2096-02-29, 2104-02-29
 * - JSON-RPC 2.0 error handling for invalid ISO dates, unknown brands, and empty arguments
 * - Edge function native execution under Node.js (CORS, HTTP verbs, parse errors, envelope errors)
 * - Semantic date fuzzing and ECMAScript Date normalization analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { MockMcpTransport as MockMcpTransportSrc } from '../apps/showcase/src/mcp/MockMcpTransport.js';
import { MockMcpTransport as MockMcpTransportJs } from '../apps/showcase/js/mock-mcp-engine.js';
import { onRequest as edgeOnRequest } from '../apps/showcase/functions/api/mcp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const seedBrandsPath = path.join(REPO_ROOT, 'development-documents', 'product-research-lead', 'policy_wiki_seed_v1.json');
const seedBrands = JSON.parse(fs.readFileSync(seedBrandsPath, 'utf8'));

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function assert(condition, name, details = '') {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    testResults.failed++;
    testResults.failures.push({ name, details });
    console.error(`  [FAIL] ${name} — ${details}`);
  }
}

// Helper to invoke edge function with Request mock
async function callEdge(body, headers = {}, method = 'POST') {
  const req = new Request('http://localhost/api/mcp', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return await edgeOnRequest({ request: req });
}

console.log('='.repeat(80));
console.log('  DEEP EMPIRICAL ADVERSARIAL TEST HARNESS: M2 GATE 2');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: CENTURY LEAP YEAR & BGB § 188 ABS. 3 DATE CLAMPING
// ============================================================================
console.log('\n--- SUITE 1: Century Leap Year & BGB § 188 Abs. 3 Clamping ---');

const mcpSrc = new MockMcpTransportSrc(seedBrands);
const mcpJs = new MockMcpTransportJs(seedBrands);

const centuryCases = [
  { purchase: '2024-02-29', expectedCliff: '2025-02-28', note: 'Standard leap day purchase (2024)' },
  { purchase: '2020-02-29', expectedCliff: '2021-02-28', note: 'Prior leap day purchase (2020)' },
  { purchase: '2000-02-29', expectedCliff: '2001-02-28', note: 'Turn of millennium century leap day (2000 % 400 == 0)' },
  { purchase: '2100-02-28', expectedCliff: '2101-02-28', note: 'Non-leap century year boundary (2100 % 100 == 0, % 400 != 0)' },
  { purchase: '1900-02-28', expectedCliff: '1901-02-28', note: 'Non-leap century year boundary (1900 % 100 == 0, % 400 != 0)' },
  { purchase: '1600-02-29', expectedCliff: '1601-02-28', note: 'Early Gregorian century leap day (1600 % 400 == 0)' },
  { purchase: '2400-02-29', expectedCliff: '2401-02-28', note: 'Future quad-century leap day (2400 % 400 == 0)' },
  { purchase: '2096-02-29', expectedCliff: '2097-02-28', note: 'Last leap day before 2100 century skip' },
  { purchase: '2104-02-29', expectedCliff: '2105-02-28', note: 'First leap day after 2100 century skip' },
];

for (const c of centuryCases) {
  // Test MockMcpTransport.js (src)
  const respSrc = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: `leap-src-${c.purchase}`,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'Test Device',
        purchase_date: c.purchase,
        defect_description: 'Hardware defect'
      }
    }
  });
  const dataSrc = JSON.parse(respSrc.result?.content?.[0]?.text || '{}');
  assert(
    dataSrc.cliff_date === c.expectedCliff,
    `MockMcpTransport.js (src): ${c.purchase} -> ${c.expectedCliff} (${c.note})`,
    `Got ${dataSrc.cliff_date}`
  );

  // Test mock-mcp-engine.js (js)
  const respJs = await mcpJs.handleRequest({
    jsonrpc: '2.0',
    id: `leap-js-${c.purchase}`,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'Test Device',
        purchase_date: c.purchase,
        defect_description: 'Hardware defect'
      }
    }
  });
  const dataJs = JSON.parse(respJs.result?.content?.[0]?.text || '{}');
  assert(
    dataJs.cliff_date === c.expectedCliff,
    `mock-mcp-engine.js (js): ${c.purchase} -> ${c.expectedCliff} (${c.note})`,
    `Got ${dataJs.cliff_date}`
  );

  // Test functions/api/mcp.ts (edge)
  const edgeResp = await callEdge({
    jsonrpc: '2.0',
    id: `leap-edge-${c.purchase}`,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'Test Device',
        purchase_date: c.purchase,
        defect_description: 'Hardware defect'
      }
    }
  });
  assert(edgeResp.status === 200, `Edge HTTP status 200 for ${c.purchase}`);
  const edgeJson = await edgeResp.json();
  const dataEdge = JSON.parse(edgeJson.result?.content?.[0]?.text || '{}');
  assert(
    dataEdge.cliff_date === c.expectedCliff,
    `functions/api/mcp.ts (edge): ${c.purchase} -> ${c.expectedCliff} (${c.note})`,
    `Got ${dataEdge.cliff_date}`
  );
}

// ============================================================================
// SUITE 2: JSON-RPC 2.0 ERROR HANDLING FOR INVALID ISO DATES
// ============================================================================
console.log('\n--- SUITE 2: Invalid Date Error Handling (-32602) ---');

const invalidIsoDates = [
  '',
  '   ',
  'invalid-date',
  '2024/02/29',
  '29.02.2024',
  '29-02-2024',
  '2024-2-29',
  '2024-02-2',
  '2024-00-01',
  '2024-13-01',
  'tomorrow',
  null,
  123456
];

for (const invDate of invalidIsoDates) {
  const displayVal = typeof invDate === 'string' ? `"${invDate}"` : String(invDate);

  // Test MockMcpTransport.js
  const respSrc = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: 'err-date-src',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook',
        purchase_date: invDate,
        defect_description: 'Defect'
      }
    }
  });
  assert(
    respSrc.error?.code === -32602,
    `MockMcpTransport.js rejects invalid date ${displayVal} with code -32602`,
    `Got error: ${JSON.stringify(respSrc.error)}`
  );

  // Test mock-mcp-engine.js
  const respJs = await mcpJs.handleRequest({
    jsonrpc: '2.0',
    id: 'err-date-js',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook',
        purchase_date: invDate,
        defect_description: 'Defect'
      }
    }
  });
  assert(
    respJs.error?.code === -32602,
    `mock-mcp-engine.js rejects invalid date ${displayVal} with code -32602`,
    `Got error: ${JSON.stringify(respJs.error)}`
  );

  // Test functions/api/mcp.ts
  const edgeResp = await callEdge({
    jsonrpc: '2.0',
    id: 'err-date-edge',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook',
        purchase_date: invDate,
        defect_description: 'Defect'
      }
    }
  });
  const edgeJson = await edgeResp.json();
  assert(
    edgeJson.error?.code === -32602,
    `functions/api/mcp.ts rejects invalid date ${displayVal} with code -32602`,
    `Got error: ${JSON.stringify(edgeJson.error)}`
  );
}

// 2.2 Semantic Date Overflow Behavior Audit
console.log('\n--- 2.2 Semantic Date Overflow Behavior Audit ---');
const semanticOverflowDates = [
  { input: '2024-02-30', expectedNormalizedCliff: '2025-03-01', note: 'Feb 30 normalizes via ECMAScript to March 1' },
  { input: '2024-04-31', expectedNormalizedCliff: '2025-05-01', note: 'April 31 normalizes via ECMAScript to May 1' }
];

for (const sc of semanticOverflowDates) {
  const resp = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: 'sem-overflow',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'Device',
        purchase_date: sc.input,
        defect_description: 'Defect'
      }
    }
  });
  const data = JSON.parse(resp.result?.content?.[0]?.text || '{}');
  assert(
    data.cliff_date === sc.expectedNormalizedCliff,
    `Deterministic ECMAScript normalization for ${sc.input} -> ${data.cliff_date} (${sc.note})`
  );
}

// ============================================================================
// SUITE 3: UNKNOWN BRANDS & DUAL-SLUG RESOLUTION
// ============================================================================
console.log('\n--- SUITE 3: Unknown Brands & Dual-Slug Resolution ---');

const unknownSlugs = [
  'non_existent_brand_xyz_999',
  'some_random_vendor',
  'fakebrand404',
  'xyz-unregistered'
];

for (const slug of unknownSlugs) {
  // policy_lookup for unknown brand: returns valid JSON-RPC with result.isError === true
  // 1. MockMcpTransport.js
  const respSrc = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: `unk-pl-${slug}`,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: slug } }
  });
  assert(
    respSrc.jsonrpc === '2.0' && respSrc.result?.isError === true && !respSrc.error,
    `MockMcpTransport.js: policy_lookup('${slug}') returns result.isError === true`
  );

  // 2. mock-mcp-engine.js
  const respJs = await mcpJs.handleRequest({
    jsonrpc: '2.0',
    id: `unk-pl-js-${slug}`,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: slug } }
  });
  assert(
    respJs.jsonrpc === '2.0' && respJs.result?.isError === true && !respJs.error,
    `mock-mcp-engine.js: policy_lookup('${slug}') returns result.isError === true`
  );

  // 3. functions/api/mcp.ts
  const edgeResp = await callEdge({
    jsonrpc: '2.0',
    id: `unk-pl-edge-${slug}`,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: slug } }
  });
  const edgeJson = await edgeResp.json();
  assert(
    edgeJson.jsonrpc === '2.0' && edgeJson.result?.isError === true && !edgeJson.error,
    `functions/api/mcp.ts: policy_lookup('${slug}') returns result.isError === true`
  );

  // claim_dossier_generate with unknown brand: should succeed with capitalized fallback name
  const cdSrc = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: `unk-cd-src-${slug}`,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: slug,
        item_name: 'Generic Product',
        purchase_date: '2025-06-01',
        defect_description: 'Defective screen'
      }
    }
  });
  assert(!cdSrc.error && cdSrc.result?.content?.[0]?.text?.length > 0, `MockMcpTransport: claim_dossier handles unknown brand '${slug}' with fallback`);

  const cdEdge = await callEdge({
    jsonrpc: '2.0',
    id: `unk-cd-edge-${slug}`,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: slug,
        item_name: 'Generic Product',
        purchase_date: '2025-06-01',
        defect_description: 'Defective screen'
      }
    }
  });
  const cdEdgeJson = await cdEdge.json();
  assert(!cdEdgeJson.error && cdEdgeJson.result?.content?.[0]?.text?.length > 0, `functions/api/mcp.ts: claim_dossier handles unknown brand '${slug}' with fallback`);
}

// ============================================================================
// SUITE 4: EMPTY & MALFORMED ARGUMENTS
// ============================================================================
console.log('\n--- SUITE 4: Empty & Malformed Arguments ---');

const emptyArgScenarios = [
  { tool: 'policy_lookup', args: {}, desc: 'policy_lookup with empty arguments {}' },
  { tool: 'policy_lookup', args: { service_slug: '' }, desc: 'policy_lookup with empty service_slug' },
  { tool: 'policy_lookup', args: { service_slug: '   ' }, desc: 'policy_lookup with whitespace service_slug' },
  { tool: 'policy_lookup', args: { brand_slug: '' }, desc: 'policy_lookup with empty brand_slug' },
  { tool: 'claim_dossier_generate', args: {}, desc: 'claim_dossier_generate with empty arguments {}' },
  {
    tool: 'claim_dossier_generate',
    args: { brand_slug: 'apple' },
    desc: 'claim_dossier_generate missing 3 of 4 required args'
  },
  {
    tool: 'claim_dossier_generate',
    args: { brand_slug: 'apple', item_name: 'MacBook' },
    desc: 'claim_dossier_generate missing purchase_date & defect_description'
  },
  {
    tool: 'claim_dossier_generate',
    args: { brand_slug: 'apple', item_name: 'MacBook', purchase_date: '2025-01-01' },
    desc: 'claim_dossier_generate missing defect_description'
  }
];

for (const sc of emptyArgScenarios) {
  // Test MockMcpTransport.js
  const rSrc = await mcpSrc.handleRequest({
    jsonrpc: '2.0',
    id: 'empty-src',
    method: 'tools/call',
    params: { name: sc.tool, arguments: sc.args }
  });
  assert(rSrc.error?.code === -32602, `MockMcpTransport.js: ${sc.desc} returns -32602`);

  // Test mock-mcp-engine.js
  const rJs = await mcpJs.handleRequest({
    jsonrpc: '2.0',
    id: 'empty-js',
    method: 'tools/call',
    params: { name: sc.tool, arguments: sc.args }
  });
  assert(rJs.error?.code === -32602, `mock-mcp-engine.js: ${sc.desc} returns -32602`);

  // Test functions/api/mcp.ts
  const rEdge = await callEdge({
    jsonrpc: '2.0',
    id: 'empty-edge',
    method: 'tools/call',
    params: { name: sc.tool, arguments: sc.args }
  });
  const jEdge = await rEdge.json();
  assert(jEdge.error?.code === -32602, `functions/api/mcp.ts: ${sc.desc} returns -32602`);
}

// ============================================================================
// SUITE 5: EDGE FUNCTION NATIVE EXECUTION & HTTP COMPLIANCE
// ============================================================================
console.log('\n--- SUITE 5: Edge Function Native Execution (HTTP/CORS/JSON-RPC) ---');

// 5.1 HTTP OPTIONS preflight
const optReq = new Request('http://localhost/api/mcp', { method: 'OPTIONS' });
const optResp = await edgeOnRequest({ request: optReq });
assert(optResp.status === 204, 'Edge OPTIONS returns HTTP 204 No Content');
assert(optResp.headers.get('Access-Control-Allow-Origin') === '*', 'Edge OPTIONS has Access-Control-Allow-Origin: *');
assert(optResp.headers.get('Access-Control-Allow-Methods')?.includes('POST'), 'Edge OPTIONS allows POST');

// 5.2 HTTP GET rejection
const getReq = new Request('http://localhost/api/mcp', { method: 'GET' });
const getResp = await edgeOnRequest({ request: getReq });
assert(getResp.status === 405, 'Edge GET returns HTTP 405 Method Not Allowed');
const getJson = await getResp.json();
assert(getJson.error?.code === -32600, 'Edge GET returns JSON-RPC -32600');

// 5.3 Malformed JSON body in POST
const badJsonReq = new Request('http://localhost/api/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{ malformed json, no quotes }'
});
const badJsonResp = await edgeOnRequest({ request: badJsonReq });
assert(badJsonResp.status === 400, 'Edge malformed JSON returns HTTP 400');
const badJsonParsed = await badJsonResp.json();
assert(badJsonParsed.error?.code === -32700, 'Edge malformed JSON returns Parse Error -32700');

// 5.4 Invalid JSON-RPC envelopes
const invalidEnvelopes = [
  {},
  { id: 1 },
  { jsonrpc: '1.0', id: 2, method: 'tools/list' },
  { jsonrpc: '3.0', id: 3, method: 'tools/list' },
  { jsonrpc: '2.0', id: 4 } // missing method
];

for (const env of invalidEnvelopes) {
  const envResp = await callEdge(env);
  assert(envResp.status === 400, `Edge rejects envelope ${JSON.stringify(env)} with HTTP 400`);
  const envJson = await envResp.json();
  assert(envJson.error?.code === -32600, `Edge envelope error code is -32600`);
}

// 5.5 Unknown method
const unkMethResp = await callEdge({ jsonrpc: '2.0', id: 99, method: 'non_existent_method' });
const unkMethJson = await unkMethResp.json();
assert(unkMethJson.error?.code === -32601, 'Edge unknown method returns -32601');

// 5.6 Unknown tool
const unkToolResp = await callEdge({
  jsonrpc: '2.0',
  id: 100,
  method: 'tools/call',
  params: { name: 'non_existent_tool', arguments: {} }
});
const unkToolJson = await unkToolResp.json();
assert(unkToolJson.error?.code === -32601, 'Edge unknown tool returns -32601');

// 5.7 Initialize contract
const initResp = await callEdge({ jsonrpc: '2.0', id: 'init-1', method: 'initialize', params: {} });
const initJson = await initResp.json();
assert(initJson.result?.protocolVersion === '2024-11-05', 'Edge initialize protocolVersion === 2024-11-05');
assert(initJson.result?.serverInfo?.name === 'cmlab-warranty-mcp', 'Edge serverInfo.name === cmlab-warranty-mcp');

// 5.8 Tools/list contract
const listResp = await callEdge({ jsonrpc: '2.0', id: 'tl-1', method: 'tools/list' });
const listJson = await listResp.json();
const tools = listJson.result?.tools || [];
assert(tools.some(t => t.name === 'policy_lookup'), 'Edge tools/list exposes policy_lookup');
assert(tools.some(t => t.name === 'claim_dossier_generate'), 'Edge tools/list exposes claim_dossier_generate');

// ============================================================================
// SUITE 6: CONCURRENT STRESS & DETERMINISM VERIFICATION
// ============================================================================
console.log('\n--- SUITE 6: Concurrent Execution & Determinism Verification ---');

const CONCURRENT_CALLS = 50;
const promises = [];

for (let i = 0; i < CONCURRENT_CALLS; i++) {
  promises.push(
    callEdge({
      jsonrpc: '2.0',
      id: `stress-${i}`,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: `Device ${i}`,
          purchase_date: '2024-02-29',
          defect_description: `Defect ${i}`
        }
      }
    }).then(r => r.json())
  );
}

const stressResults = await Promise.all(promises);
let allPassedStress = true;
for (let i = 0; i < CONCURRENT_CALLS; i++) {
  const res = stressResults[i];
  const content = JSON.parse(res.result?.content?.[0]?.text || '{}');
  if (content.cliff_date !== '2025-02-28' || res.id !== `stress-${i}`) {
    allPassedStress = false;
  }
}
assert(allPassedStress, `Edge function handles ${CONCURRENT_CALLS} concurrent requests with 100% determinism`);

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('  EMPIRICAL ADVERSARIAL TEST SUMMARY');
console.log('='.repeat(80));
console.log(`  Total Checks: ${testResults.total}`);
console.log(`  Passed:       ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(1)}%)`);
console.log(`  Failed:       ${testResults.failed}`);
if (testResults.failures.length > 0) {
  console.log('  Failures:');
  for (const f of testResults.failures) {
    console.log(`    - ${f.name}: ${f.details}`);
  }
}
console.log('='.repeat(80));

process.exit(testResults.failed === 0 ? 0 : 1);
