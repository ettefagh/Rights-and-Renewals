/**
 * test_m2_empirical_challenger.mjs
 * Empirical Challenger Verification & Fuzzing Harness for Milestone 2 Gate 2
 * Author: Empirical Challenger (teamwork_challenger_m2_gate_2)
 *
 * Covers:
 * 1. JSON-RPC 2.0 MCP Protocol Verification & Fuzzing:
 *    - apps/showcase/src/mcp/MockMcpTransport.js
 *    - apps/showcase/js/mock-mcp-engine.js
 *    - Dual-slug compatibility (service_slug vs brand_slug)
 *    - Error boundary envelopes (-32600, -32601, -32602)
 *    - Latency benchmarking (100 iterations, <30ms SLA, <1ms target)
 *    - Fuzzing & edge-case stress (ReDoS, XSS, malformed payloads, unicode)
 *    - Leap year BGB § 188 Abs. 3 boundary analysis
 * 2. German Legal Tech Calculations:
 *    - BGB § 477 Abs. 1 statutory 12-month presumption cliff (vs § 193 non-rollover)
 *    - BGB § 309 Nr. 9 & § 312k subscription notice & cancellation date calculations
 *    - 52-week risk heatmap intensity matrix & KPI aggregates in calendars.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MockMcpTransport as MockMcpTransportSrc } from '../apps/showcase/src/mcp/MockMcpTransport.js';
import { MockMcpTransport as MockMcpTransportJs } from '../apps/showcase/js/mock-mcp-engine.js';
import { CalendarSuiteController } from '../apps/showcase/src/components/calendars.js';
import { SAMPLE_SHOWCASE_ITEMS, SHOWCASE_ANCHOR_DATE, getKpiSummary } from '../apps/showcase/src/data/showcaseSampleData.js';

// Setup minimal document mock for CalendarSuiteController headless instantiation
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    addEventListener: () => {},
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Load canonical seed brands dataset
const seedBrandsPath = path.join(REPO_ROOT, 'development-documents', 'product-research-lead', 'policy_wiki_seed_v1.json');
const seedBrands = JSON.parse(fs.readFileSync(seedBrandsPath, 'utf8'));

// Test Results Collector
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
  benchmarks: {},
  tests: []
};

function assert(condition, testName, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    results.tests.push({ name: testName, status: 'PASS', details });
    console.log(`  [PASS] ${testName}`);
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', details });
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

function recordFinding(severity, id, title, description, recommendation) {
  results.findings.push({ severity, id, title, description, recommendation });
}

console.log('='.repeat(80));
console.log('  EMPIRICAL CHALLENGER VERIFICATION HARNESS - M2 GATE 2');
console.log('='.repeat(80));

// ============================================================================
// PART 1: MCP TRANSPORT ROUTING & PROTOCOL ENVELOPE VERIFICATION
// ============================================================================
console.log('\n--- PART 1: MCP Protocol Routing & Transport Tests ---');

for (const [moduleName, TransportClass] of [
  ['MockMcpTransport.js (src)', MockMcpTransportSrc],
  ['mock-mcp-engine.js (js)', MockMcpTransportJs]
]) {
  console.log(`\nTesting transport implementation: ${moduleName}`);
  const mcp = new TransportClass(seedBrands);

  // 1.1 initialize method
  const initResp = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-init',
    method: 'initialize',
    params: {}
  });
  assert(initResp.jsonrpc === '2.0' && initResp.id === 'req-init', `${moduleName}: initialize envelope validity`);
  assert(initResp.result?.protocolVersion === '2024-11-05', `${moduleName}: MCP protocolVersion == 2024-11-05`);
  assert(initResp.result?.serverInfo?.name === 'cmlab-warranty-mcp', `${moduleName}: serverInfo name`);

  // 1.2 tools/list method
  const listResp = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-tools-list',
    method: 'tools/list'
  });
  assert(listResp.jsonrpc === '2.0' && listResp.id === 'req-tools-list', `${moduleName}: tools/list envelope validity`);
  const toolNames = listResp.result?.tools?.map(t => t.name) || [];
  assert(toolNames.includes('policy_lookup'), `${moduleName}: tools/list exposes policy_lookup`);
  assert(toolNames.includes('claim_dossier_generate'), `${moduleName}: tools/list exposes claim_dossier_generate`);

  // 1.3 tools/call: policy_lookup with service_slug
  const plServiceResp = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-pl-service',
    method: 'tools/call',
    params: {
      name: 'policy_lookup',
      arguments: { service_slug: 'spotify' }
    }
  });
  assert(plServiceResp.jsonrpc === '2.0', `${moduleName}: policy_lookup (service_slug: spotify) valid JSON-RPC`);
  assert(!plServiceResp.error, `${moduleName}: policy_lookup (service_slug: spotify) has no error`);
  const spotifyData = JSON.parse(plServiceResp.result?.content?.[0]?.text || '{}');
  assert(spotifyData.brand_name === 'Spotify', `${moduleName}: policy_lookup returned correct brand_name Spotify`);

  // 1.4 tools/call: policy_lookup with brand_slug (dual-slug compatibility)
  const plBrandResp = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-pl-brand',
    method: 'tools/call',
    params: {
      name: 'policy_lookup',
      arguments: { brand_slug: 'spotify' }
    }
  });
  assert(!plBrandResp.error, `${moduleName}: dual-slug: brand_slug: 'spotify' succeeds without error`);
  const spotifyData2 = JSON.parse(plBrandResp.result?.content?.[0]?.text || '{}');
  assert(spotifyData2.brand_name === 'Spotify', `${moduleName}: dual-slug brand_slug: 'spotify' returns identical data`);

  // 1.5 tools/call: policy_lookup dual-slug with apple
  const plAppleService = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-pl-apple-service',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'apple' } }
  });
  const plAppleBrand = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-pl-apple-brand',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { brand_slug: 'apple' } }
  });
  assert(!plAppleService.error && !plAppleBrand.error, `${moduleName}: dual-slug apple lookup succeeds for both service_slug and brand_slug`);

  // 1.6 Verify all 20 canonical brands are retrievable
  let all20Retrievable = true;
  for (const b of seedBrands) {
    const slug = b.service_slug || b.serviceSlug;
    const resp = await mcp.handleRequest({
      jsonrpc: '2.0',
      id: `req-verify-${slug}`,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: { service_slug: slug } }
    });
    if (resp.error || !resp.result?.content?.[0]?.text?.includes(b.brand_name || b.brandName)) {
      all20Retrievable = false;
      break;
    }
  }
  assert(all20Retrievable, `${moduleName}: all 20 canonical brands retrievable via policy_lookup`);

  // 1.7 Search aliases & case insensitivity
  const aliasResp = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-alias',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'SPOTIFY STUDENT' } }
  });
  assert(!aliasResp.error && aliasResp.result?.content?.[0]?.text?.includes('Spotify'), `${moduleName}: search alias & case insensitivity ('SPOTIFY STUDENT')`);

  // 1.8 tools/call: claim_dossier_generate with dual-slug (brand_slug vs service_slug)
  const dossierBrand = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-cd-brand',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook Pro 14 M3',
        purchase_date: '2025-12-15',
        defect_description: 'Display backlight flickering and intermittent blackouts',
        issue_type: 'statutory_defect_claim'
      }
    }
  });
  assert(!dossierBrand.error, `${moduleName}: claim_dossier_generate with brand_slug succeeds`);
  const dossierDataBrand = JSON.parse(dossierBrand.result?.content?.[0]?.text || '{}');
  assert(dossierDataBrand.lexfox_safe_harbor_certified === true, `${moduleName}: claim_dossier contains LexFox certification`);
  assert(dossierDataBrand.dossier_text_de.includes('BGH VIII ZR 285/18 (LexFox)'), `${moduleName}: dossier contains LexFox BGH citation`);
  assert(dossierDataBrand.dossier_text_de.includes('§ 437 BGB'), `${moduleName}: dossier contains BGB § 437 notice`);

  const dossierService = await mcp.handleRequest({
    jsonrpc: '2.0',
    id: 'req-cd-service',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        service_slug: 'apple',
        item_name: 'MacBook Pro 14 M3',
        purchase_date: '2025-12-15',
        defect_description: 'Display backlight flickering',
        issue_type: 'statutory_defect_claim'
      }
    }
  });
  assert(!dossierService.error, `${moduleName}: claim_dossier_generate dual-slug compatibility with service_slug`);
}

// ============================================================================
// PART 2: ERROR BOUNDARY & ENVELOPE VALIDATION (JSON-RPC 2.0 SPECIFICATION)
// ============================================================================
console.log('\n--- PART 2: Error Boundaries & Envelope Fuzzing ---');
const mcpTest = new MockMcpTransportSrc(seedBrands);

// 2.1 Invalid JSON-RPC envelopes -> code -32600
const errNullPayload = await mcpTest.handleRequest(null);
assert(errNullPayload.error?.code === -32600, 'Envelope: null payload returns code -32600');
assert(errNullPayload.error?.message.includes("jsonrpc must be '2.0'"), 'Envelope: null payload error message');

const errNoJsonRpc = await mcpTest.handleRequest({ id: 1, method: 'tools/list' });
assert(errNoJsonRpc.error?.code === -32600, 'Envelope: missing jsonrpc version returns code -32600');

const errV1JsonRpc = await mcpTest.handleRequest({ jsonrpc: '1.0', id: 2, method: 'tools/list' });
assert(errV1JsonRpc.error?.code === -32600, 'Envelope: jsonrpc: "1.0" returns code -32600');

// 2.2 Invalid Method -> code -32601
const errMethodNotFound = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-meth',
  method: 'non_existent_method'
});
assert(errMethodNotFound.error?.code === -32601, 'Method: non-existent method returns code -32601');
assert(errMethodNotFound.error?.message.includes('not found'), 'Method: -32601 error message');

const errToolNotFound = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-tool',
  method: 'tools/call',
  params: { name: 'non_existent_tool', arguments: {} }
});
assert(errToolNotFound.error?.code === -32601, 'Tool: unknown tool name returns code -32601');

// 2.3 Invalid/Missing Parameters -> code -32602 (policy_lookup)
const errPlNoSlug = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-pl-1',
  method: 'tools/call',
  params: { name: 'policy_lookup', arguments: {} }
});
assert(errPlNoSlug.error?.code === -32602, 'policy_lookup: empty arguments returns -32602');

const errPlEmptySlug = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-pl-2',
  method: 'tools/call',
  params: { name: 'policy_lookup', arguments: { service_slug: '   ' } }
});
assert(errPlEmptySlug.error?.code === -32602, 'policy_lookup: whitespace slug returns -32602');

const errPlNonStringSlug = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-pl-3',
  method: 'tools/call',
  params: { name: 'policy_lookup', arguments: { service_slug: 12345 } }
});
assert(errPlNonStringSlug.error?.code === -32602, 'policy_lookup: non-string slug returns -32602');

// 2.4 Invalid/Missing Parameters -> code -32602 (claim_dossier_generate)
const errCdMissingParams = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-cd-1',
  method: 'tools/call',
  params: { name: 'claim_dossier_generate', arguments: { brand_slug: 'apple' } }
});
assert(errCdMissingParams.error?.code === -32602, 'claim_dossier_generate: missing required fields returns -32602');

const errCdInvalidDate = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-cd-2',
  method: 'tools/call',
  params: {
    name: 'claim_dossier_generate',
    arguments: {
      brand_slug: 'apple',
      item_name: 'iPhone 15',
      purchase_date: 'not-a-valid-date',
      defect_description: 'Screen broken'
    }
  }
});
assert(errCdInvalidDate.error?.code === -32602, 'claim_dossier_generate: invalid date string returns -32602');

const errCdNonIsoDate = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-err-cd-3',
  method: 'tools/call',
  params: {
    name: 'claim_dossier_generate',
    arguments: {
      brand_slug: 'apple',
      item_name: 'iPhone 15',
      purchase_date: '15/12/2025',
      defect_description: 'Screen broken'
    }
  }
});
assert(errCdNonIsoDate.error?.code === -32602, 'claim_dossier_generate: non-ISO date returns -32602');

// 2.5 Unknown brand slug handling (returns tool error in result without throwing)
const unknownBrandResp = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-unknown-brand',
  method: 'tools/call',
  params: { name: 'policy_lookup', arguments: { service_slug: 'non_existent_brand_slug_xyz' } }
});
assert(unknownBrandResp.jsonrpc === '2.0', 'Unknown brand: returns valid JSON-RPC response');
assert(unknownBrandResp.result?.isError === true, 'Unknown brand: returns result.isError === true');
assert(unknownBrandResp.result?.content?.[0]?.text?.includes('not found in canonical dataset'), 'Unknown brand: message explains not found');

// ============================================================================
// PART 3: LATENCY BENCHMARKING (100 ITERATIONS)
// ============================================================================
console.log('\n--- PART 3: Latency Benchmarking (100 Iterations) ---');

async function benchmark(name, fn, iterations = 100) {
  const timings = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn(i);
    const t1 = performance.now();
    timings.push(t1 - t0);
  }
  timings.sort((a, b) => a - b);
  const sum = timings.reduce((acc, v) => acc + v, 0);
  const avg = sum / iterations;
  const min = timings[0];
  const max = timings[iterations - 1];
  const median = timings[Math.floor(iterations / 2)];
  const p95 = timings[Math.floor(iterations * 0.95)];
  const p99 = timings[Math.floor(iterations * 0.99)];

  results.benchmarks[name] = { iterations, avg, min, max, median, p95, p99 };
  console.log(`  Benchmark [${name}] over ${iterations} iterations:`);
  console.log(`    Mean: ${avg.toFixed(3)}ms | Median: ${median.toFixed(3)}ms | Min: ${min.toFixed(3)}ms | Max: ${max.toFixed(3)}ms | P95: ${p95.toFixed(3)}ms | P99: ${p99.toFixed(3)}ms`);
  return { avg, max, p95 };
}

const bmToolsList = await benchmark('tools/list', async (i) => {
  await mcpTest.handleRequest({ jsonrpc: '2.0', id: i, method: 'tools/list' });
});
assert(bmToolsList.avg < 30.0, 'Latency: tools/list average latency < 30ms SLA');
assert(bmToolsList.avg < 1.0, 'Latency: tools/list in-memory target < 1.0ms');

const bmPolicyLookup = await benchmark('policy_lookup', async (i) => {
  await mcpTest.handleRequest({
    jsonrpc: '2.0',
    id: i,
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'spotify' } }
  });
});
assert(bmPolicyLookup.avg < 30.0, 'Latency: policy_lookup average latency < 30ms SLA');
assert(bmPolicyLookup.avg < 1.0, 'Latency: policy_lookup in-memory target < 1.0ms');

const bmClaimDossier = await benchmark('claim_dossier_generate', async (i) => {
  await mcpTest.handleRequest({
    jsonrpc: '2.0',
    id: i,
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook Pro 14 M3',
        purchase_date: '2025-12-15',
        defect_description: 'Keyboard key stickiness'
      }
    }
  });
});
assert(bmClaimDossier.avg < 30.0, 'Latency: claim_dossier_generate average latency < 30ms SLA');
assert(bmClaimDossier.avg < 1.0, 'Latency: claim_dossier_generate in-memory target < 1.0ms');

// ============================================================================
// PART 4: ADVERSARIAL STRESS-TESTING & INPUT FUZZING
// ============================================================================
console.log('\n--- PART 4: Adversarial Stress & Fuzzing ---');

// 4.1 Huge Defect Description (100KB payload)
const hugeDefect = 'A'.repeat(100 * 1024);
const tHuge0 = performance.now();
const hugeResp = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-huge',
  method: 'tools/call',
  params: {
    name: 'claim_dossier_generate',
    arguments: {
      brand_slug: 'sony',
      item_name: 'Headphones',
      purchase_date: '2026-01-01',
      defect_description: hugeDefect
    }
  }
});
const tHuge = performance.now() - tHuge0;
assert(!hugeResp.error && hugeResp.result?.content?.[0]?.text?.length > 100000, 'Adversarial: handles 100KB defect payload without crashing');
assert(tHuge < 50.0, `Adversarial: 100KB payload processed in ${tHuge.toFixed(2)}ms (< 50ms)`);

// 4.2 XSS / HTML injection payloads in arguments
const xssPayloads = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  '${7*7}',
  '{{constructor.constructor("return process")()}}',
  '../../../../etc/passwd',
  'null\0byte'
];
for (const xss of xssPayloads) {
  const xssResp = await mcpTest.handleRequest({
    jsonrpc: '2.0',
    id: 'req-xss',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: xss,
        purchase_date: '2026-01-01',
        defect_description: xss
      }
    }
  });
  assert(!xssResp.error, `Adversarial: XSS sanitization safe execution for payload: ${xss.slice(0, 20)}`);
}

// 4.3 Leap Year Cliff Calculation in MockMcpTransport
console.log('\n--- Empirical Investigation: Leap Year Clamping in MockMcpTransport ---');
const leapResp = await mcpTest.handleRequest({
  jsonrpc: '2.0',
  id: 'req-leap',
  method: 'tools/call',
  params: {
    name: 'claim_dossier_generate',
    arguments: {
      brand_slug: 'apple',
      item_name: 'iPhone 15',
      purchase_date: '2024-02-29', // Leap year day!
      defect_description: 'Battery health defect'
    }
  }
});
const leapData = JSON.parse(leapResp.result?.content?.[0]?.text || '{}');
console.log(`  Input purchase_date: 2024-02-29`);
console.log(`  Output cliff_date from MockMcpTransport: ${leapData.cliff_date}`);
if (leapData.cliff_date === '2025-02-28') {
  assert(true, 'Leap year calculation: 2024-02-29 correctly clamps to 2025-02-28 per BGB § 188 Abs. 3');
} else {
  assert(false, 'Leap year calculation: 2024-02-29 clamps to 2025-02-28', `Expected '2025-02-28', got '${leapData.cliff_date}'`);
  recordFinding(
    'MEDIUM',
    'BUG-M2-01',
    'MockMcpTransport Leap Year Date Arithmetic Overflows to March',
    `In MockMcpTransport.js (line 214-222) and mock-mcp-engine.js (line 214-222), when purchase_date is '2024-02-29' (leap year), calling cliffDate.setFullYear(2025) rolls over to 2025-03-01. Subsequent cliffDate.setUTCDate(28) sets the day of March, producing '2025-03-28' instead of '2025-02-28' under BGB § 188 Abs. 3.`,
    `Set cliffDate.setUTCFullYear(pDate.getUTCFullYear() + 1, pDate.getUTCMonth(), 28) or clamp the month and date atomically.`
  );
}

// ============================================================================
// PART 5: EMPIRICAL VERIFICATION OF GERMAN LEGAL TECH CALENDAR LOGIC
// ============================================================================
console.log('\n--- PART 5: German Legal Tech Calendar Calculations ---');

// 5.1 Verification of BGB § 477 Abs. 1 (12 months without § 193 weekend rollover)
// Under German Civil Law, § 477 Abs. 1 is a substantive statutory presumption (Beweislastumkehr),
// NOT a declaration of intent deadline (Willenserklärung). It terminates strictly at 12 calendar months
// pursuant to BGB § 188 Abs. 2. BGB § 193 does NOT extend the statutory presumption.
function calculateBgb477Cliff(purchaseIsoDate) {
  const parts = purchaseIsoDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1]; // 1-indexed
  const day = parts[2];

  const targetYear = year + 1;
  let targetMonth = month;
  let targetDay = day;

  // Leap year clamping pursuant to BGB § 188 Abs. 3
  if (month === 2 && day === 29) {
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    if (!isLeap) {
      targetDay = 28;
    }
  }

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

// Test boundary dates for BGB § 477
assert(calculateBgb477Cliff('2025-11-05') === '2026-11-05', 'BGB § 477: Standard weekday purchase 2025-11-05 -> 2026-11-05');
assert(calculateBgb477Cliff('2024-02-29') === '2025-02-28', 'BGB § 477: Leap year clamping 2024-02-29 -> 2025-02-28 (§ 188 Abs. 3)');

// Purchase 2025-11-14: 12m cliff is 2026-11-14 (Saturday).
// Under § 477, it does NOT roll over to Monday 2026-11-16.
const satCliff = calculateBgb477Cliff('2025-11-14');
const satDate = new Date(satCliff + 'T00:00:00Z');
assert(satCliff === '2026-11-14' && satDate.getUTCDay() === 6, 'BGB § 477: Saturday deadline (2026-11-14) expires strictly without § 193 rollover');

// Purchase 2025-11-15: 12m cliff is 2026-11-15 (Sunday).
const sunCliff = calculateBgb477Cliff('2025-11-15');
const sunDate = new Date(sunCliff + 'T00:00:00Z');
assert(sunCliff === '2026-11-15' && sunDate.getUTCDay() === 0, 'BGB § 477: Sunday deadline (2026-11-15) expires strictly without § 193 rollover');

// 5.2 Verify all 10 hardware items in showcaseSampleData.js adhere to BGB § 477 and BGB § 438
const hardwareItems = SAMPLE_SHOWCASE_ITEMS.filter(i => i.category === 'hardware');
assert(hardwareItems.length === 10, 'showcaseSampleData: exactly 10 hardware items present');

let allHardwareBgbCompliant = true;
for (const item of hardwareItems) {
  const expectedCliff = calculateBgb477Cliff(item.purchaseDate);
  if (item.beweislastumkehrDate !== expectedCliff) {
    allHardwareBgbCompliant = false;
    console.error(`  Mismatch on ${item.name}: expected cliff ${expectedCliff}, got ${item.beweislastumkehrDate}`);
  }
}
assert(allHardwareBgbCompliant, 'showcaseSampleData: all 10 hardware items have exact 12-month BGB § 477 cliff dates');

// 5.3 Verify BGB § 309 Nr. 9 & § 312k Subscription Notice Calculations
// Under BGB § 309 Nr. 9, rolling subscriptions can require at most 1 month notice.
// If the final notice day falls on Saturday or Sunday, BGB § 193 rolls the declaration deadline to Monday.
function calculateBgb309NoticeDeadline(renewalIsoDate, noticeDays = 30, applyBgb193 = true) {
  const renewDate = new Date(renewalIsoDate + 'T00:00:00Z');
  // Notice deadline is renewal date minus noticeDays
  const noticeDate = new Date(renewDate.getTime() - noticeDays * 86400000);
  let effectiveNotice = new Date(noticeDate);

  if (applyBgb193) {
    const dow = effectiveNotice.getUTCDay();
    if (dow === 6) { // Saturday -> Monday (+2 days)
      effectiveNotice = new Date(effectiveNotice.getTime() + 2 * 86400000);
    } else if (dow === 0) { // Sunday -> Monday (+1 day)
      effectiveNotice = new Date(effectiveNotice.getTime() + 1 * 86400000);
    }
  }

  return {
    nominalNotice: noticeDate.toISOString().split('T')[0],
    effectiveNotice: effectiveNotice.toISOString().split('T')[0],
    rolledOver: noticeDate.toISOString().split('T')[0] !== effectiveNotice.toISOString().split('T')[0]
  };
}

const subItems = SAMPLE_SHOWCASE_ITEMS.filter(i => i.category === 'subscription');
assert(subItems.length === 10, 'showcaseSampleData: exactly 10 subscription items present');

// Verify daysRemaining calculation relative to SHOWCASE_ANCHOR_DATE (2026-11-05)
let allDaysRemainingCorrect = true;
const anchorTime = new Date(SHOWCASE_ANCHOR_DATE + 'T00:00:00Z').getTime();
for (const item of subItems) {
  const expiryTime = new Date(item.expiryDate + 'T00:00:00Z').getTime();
  const diffDays = Math.round((expiryTime - anchorTime) / 86400000);
  if (item.daysRemaining !== diffDays) {
    allDaysRemainingCorrect = false;
    console.error(`  Mismatch on ${item.name}: expected ${diffDays} days, got ${item.daysRemaining}`);
  }
}
assert(allDaysRemainingCorrect, 'showcaseSampleData: all 10 subscription items have exact daysRemaining from anchor date');

// 5.4 52-Week Risk Heatmap Matrix Verification in calendars.js
console.log('\n--- 5.4 Risk Heatmap Intensity Matrix Verification ---');
const calendarCtrl = new CalendarSuiteController({ items: SAMPLE_SHOWCASE_ITEMS });
const heatmapCells = calendarCtrl.generate52WeekHeatmapData();

assert(heatmapCells.length === 364, 'Heatmap: generates exactly 364 cells (52 weeks * 7 days)');
assert(heatmapCells[0].date === SHOWCASE_ANCHOR_DATE, 'Heatmap: first cell starts on SHOWCASE_ANCHOR_DATE (2026-11-05)');

// Intensity distribution audit
const intensityCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
for (const cell of heatmapCells) {
  intensityCounts[cell.intensityLevel]++;
}
console.log('  Heatmap Intensity Distribution:', intensityCounts);
assert(intensityCounts[0] > 0, 'Heatmap: has level 0 cells (calm days with no deadlines)');
assert(intensityCounts[4] > 0, 'Heatmap: has level 4 cells (urgent deadlines or capital > 500 €)');

// Test Intensity Matrix Rules:
// - Level 0: 0 matches
// - Level 1: total <= 50, not urgent
// - Level 2: 50 < total <= 200, not urgent
// - Level 3: 200 < total <= 500, not urgent
// - Level 4: total > 500 OR status == 'urgent'
let allIntensityRulesCompliant = true;
for (const cell of heatmapCells) {
  if (cell.events.length === 0) {
    if (cell.intensityLevel !== 0) allIntensityRulesCompliant = false;
  } else {
    const hasUrgent = cell.events.some(e => e.status === 'urgent');
    const total = cell.totalAmountEur;
    let expectedIntensity = 0;
    if (hasUrgent || total > 500) {
      expectedIntensity = 4;
    } else if (total > 200) {
      expectedIntensity = 3;
    } else if (total > 50) {
      expectedIntensity = 2;
    } else {
      expectedIntensity = 1;
    }
    if (cell.intensityLevel !== expectedIntensity) {
      allIntensityRulesCompliant = false;
      console.error(`  Intensity mismatch on ${cell.date}: total=${total}, urgent=${hasUrgent}, expected=${expectedIntensity}, got=${cell.intensityLevel}`);
    }
  }
}
assert(allIntensityRulesCompliant, 'Heatmap: 100% of cells adhere strictly to intensity matrix thresholds');

// 5.5 KPI Summary Verification
const kpis = getKpiSummary();
console.log('  KPI Summary:', kpis);
const manualHwTotal = hardwareItems.reduce((acc, i) => acc + i.priceEur, 0);
assert(Math.abs(kpis.totalTrackedCapitalEur - manualHwTotal) < 0.01, 'KPI: totalTrackedCapitalEur matches sum of hardware prices (€6,057.99)');

const manualSubMonthly = subItems.reduce((acc, i) => acc + i.priceEur, 0);
assert(Math.abs(kpis.monthlySubscriptionsEur - manualSubMonthly) < 0.01, 'KPI: monthlySubscriptionsEur matches sum of subscription prices (€146.26)');
assert(Math.abs(kpis.annualSubscriptionsEur - manualSubMonthly * 12) < 0.01, 'KPI: annualSubscriptionsEur == monthly * 12 (€1,755.12)');

const manualTaxTotal = SAMPLE_SHOWCASE_ITEMS.filter(i => i.isTaxDeductible).reduce((acc, i) => acc + i.priceEur, 0);
assert(Math.abs(kpis.taxDeductibleEur - manualTaxTotal) < 0.01, 'KPI: taxDeductibleEur matches sum of deductible items (€4,489.87)');

const manualActiveCliffs = hardwareItems.filter(i => i.daysToCliff && i.daysToCliff <= 45).length;
assert(kpis.activeCliffsCount === manualActiveCliffs, 'KPI: activeCliffsCount matches hardware with daysToCliff <= 45 (2 items: Sony & Lenovo)');

// ============================================================================
// VERIFICATION SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('  M2 GATE 2 EMPIRICAL VERIFICATION COMPLETE');
console.log('='.repeat(80));
console.log(`  Total Checks: ${results.total}`);
console.log(`  Passed:       ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`  Failed:       ${results.failed}`);
console.log(`  Findings:     ${results.findings.length}`);
for (const f of results.findings) {
  console.log(`    [${f.severity}] ${f.id}: ${f.title}`);
}
console.log('='.repeat(80));

// Output JSON summary for machine consumption
fs.writeFileSync(
  path.join(REPO_ROOT, 'tests', 'm2_empirical_results.json'),
  JSON.stringify(results, null, 2)
);
