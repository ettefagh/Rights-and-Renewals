/**
 * tests/test_m3_recheck_deep_empirical.mjs
 * Deep Empirical Recheck Harness for M3 Remediation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Import built showcase SSR endpoint
const astroMcpModule = await import('../apps/showcase/dist/_worker.js/pages/api/mcp.astro.mjs');
const astroPage = astroMcpModule.page();
const astroPost = astroPage.POST;

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function check(condition, desc, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${desc}`);
  } else {
    failures.push({ desc, details });
    console.error(`  [FAIL] ${desc} :: ${details}`);
  }
}

async function callMcp(body) {
  const req = new Request('https://showcase.cmlab.pages.dev/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const res = await astroPost({ request: req });
  const rawText = await res.text();
  let json;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    json = null;
  }
  return { status: res.status, rawText, json };
}

async function run() {
  console.log('='.repeat(80));
  console.log('  STARTING DEEP EMPIRICAL ADVERSARIAL RECHECK FOR M3 REMEDIATION');
  console.log('='.repeat(80));

  // --------------------------------------------------------------------------
  // MANDATE 2.1: Full, non-empty JSON-RPC 2.0 payloads on valid calls
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: Full, valid JSON-RPC 2.0 payloads (never empty {}) ---');
  
  // 1a. statutory_law_lookup
  const lawRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-law-477',
    method: 'tools/call',
    params: {
      name: 'statutory_law_lookup',
      arguments: { statute_section: '477' },
    },
  });
  check(lawRes.status === 200, 'statutory_law_lookup returns HTTP 200', `Got ${lawRes.status}`);
  check(lawRes.rawText !== '{}', 'statutory_law_lookup response is NOT empty string "{}"', `Got ${lawRes.rawText}`);
  check(lawRes.json && lawRes.json.jsonrpc === '2.0', 'statutory_law_lookup returns jsonrpc 2.0');
  check(lawRes.json && lawRes.json.id === 'test-law-477', 'statutory_law_lookup echoes request id');
  check(lawRes.json && !lawRes.json.error, 'statutory_law_lookup has no error field');
  check(lawRes.json && lawRes.json.result && Array.isArray(lawRes.json.result.content), 'statutory_law_lookup returns content array');
  const lawContent = lawRes.json?.result?.content?.[0]?.text;
  check(typeof lawContent === 'string' && lawContent.length > 50, 'statutory_law_lookup content[0].text is substantial string');
  const lawParsed = JSON.parse(lawContent || '{}');
  check(lawParsed.statute_section?.includes('477'), 'statutory_law_lookup contains section 477 in text', lawParsed.statute_section);

  // 1b. subscription_category_rules
  const subRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-sub-streaming',
    method: 'tools/call',
    params: {
      name: 'subscription_category_rules',
      arguments: { subscription_type: 'streaming' },
    },
  });
  check(subRes.status === 200, 'subscription_category_rules returns HTTP 200', `Got ${subRes.status}`);
  check(subRes.rawText !== '{}', 'subscription_category_rules response is NOT empty string "{}"', `Got ${subRes.rawText}`);
  check(subRes.json && subRes.json.jsonrpc === '2.0', 'subscription_category_rules returns jsonrpc 2.0');
  check(subRes.json && subRes.json.id === 'test-sub-streaming', 'subscription_category_rules echoes request id');
  check(subRes.json && !subRes.json.error, 'subscription_category_rules has no error field');
  const subContent = subRes.json?.result?.content?.[0]?.text;
  check(typeof subContent === 'string' && subContent.length > 50, 'subscription_category_rules content[0].text is substantial string');
  const subParsed = JSON.parse(subContent || '{}');
  check(subParsed.max_initial_term_months === 24, 'subscription_category_rules includes max_initial_term_months === 24');

  // 1c. tax_deductibility_check
  const taxRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-tax-laptop',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Dell XPS 15',
        item_category: 'hardware',
        gross_price_eur: 1450.0,
        professional_use_percent: 80,
      },
    },
  });
  check(taxRes.status === 200, 'tax_deductibility_check returns HTTP 200', `Got ${taxRes.status}`);
  check(taxRes.rawText !== '{}', 'tax_deductibility_check response is NOT empty string "{}"', `Got ${taxRes.rawText}`);
  check(taxRes.json && taxRes.json.jsonrpc === '2.0', 'tax_deductibility_check returns jsonrpc 2.0');
  check(taxRes.json && taxRes.json.id === 'test-tax-laptop', 'tax_deductibility_check echoes request id');
  check(taxRes.json && !taxRes.json.error, 'tax_deductibility_check has no error field');
  const taxContent = taxRes.json?.result?.content?.[0]?.text;
  check(typeof taxContent === 'string' && taxContent.length > 50, 'tax_deductibility_check content[0].text is substantial string');
  const taxParsed = JSON.parse(taxContent || '{}');
  check(taxParsed.isDeductible === true || taxParsed.is_deductible === true, 'tax_deductibility_check marks laptop deductible');
  check(taxParsed.write_off_method?.includes('Sofortabschreibung'), 'tax_deductibility_check write_off_method contains Sofortabschreibung');
  check(taxParsed.deductibleAmountEur === 1160.0 || taxParsed.deductible_amount_eur === 1160.0, 'tax_deductibility_check calculates 80% pro-rata (1160 EUR)');

  // --------------------------------------------------------------------------
  // MANDATE 2.2: Negative prices, invalid sections, or unknown categories return code -32602
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Negative prices, invalid sections, unknown categories return code -32602 ---');

  // 2a. Negative price
  const negPriceRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-neg-price',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Monitor',
        item_category: 'hardware',
        gross_price_eur: -150.0,
        professional_use_percent: 50,
      },
    },
  });
  check(negPriceRes.json?.error?.code === -32602, 'Negative price rejected with code -32602', `Got ${JSON.stringify(negPriceRes.json?.error)}`);

  // 2b. Zero price
  const zeroPriceRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-zero-price',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Monitor',
        item_category: 'hardware',
        gross_price_eur: 0,
        professional_use_percent: 50,
      },
    },
  });
  check(zeroPriceRes.json?.error?.code === -32602, 'Zero price rejected with code -32602', `Got ${JSON.stringify(zeroPriceRes.json?.error)}`);

  // 2c. Invalid statute section
  const invSectionRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-inv-section',
    method: 'tools/call',
    params: {
      name: 'statutory_law_lookup',
      arguments: { statute_section: '9999_fake' },
    },
  });
  check(invSectionRes.json?.error?.code === -32602, 'Invalid statute section rejected with code -32602', `Got ${JSON.stringify(invSectionRes.json?.error)}`);

  // 2d. Missing statute section
  const emptySectionRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-empty-section',
    method: 'tools/call',
    params: {
      name: 'statutory_law_lookup',
      arguments: {},
    },
  });
  check(emptySectionRes.json?.error?.code === -32602, 'Missing statute section rejected with code -32602', `Got ${JSON.stringify(emptySectionRes.json?.error)}`);

  // 2e. Unknown subscription category
  const unkCatRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-unk-cat',
    method: 'tools/call',
    params: {
      name: 'subscription_category_rules',
      arguments: { subscription_type: 'interstellar_warp_drive' },
    },
  });
  check(unkCatRes.json?.error?.code === -32602, 'Unknown subscription category rejected with code -32602', `Got ${JSON.stringify(unkCatRes.json?.error)}`);

  // 2f. Empty subscription arguments
  const emptySubRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-empty-sub',
    method: 'tools/call',
    params: {
      name: 'subscription_category_rules',
      arguments: {},
    },
  });
  check(emptySubRes.json?.error?.code === -32602, 'Empty subscription arguments rejected with code -32602', `Got ${JSON.stringify(emptySubRes.json?.error)}`);

  // 2g. Out-of-bounds usage percentage (>100%)
  const outBoundsUsageRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-usage-150',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Laptop',
        item_category: 'hardware',
        gross_price_eur: 500,
        professional_use_percent: 150,
      },
    },
  });
  check(outBoundsUsageRes.json?.error?.code === -32602, 'Usage > 100% rejected with code -32602', `Got ${JSON.stringify(outBoundsUsageRes.json?.error)}`);

  // 2h. Negative usage percentage (<0%)
  const negUsageRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-neg-usage',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Laptop',
        item_category: 'hardware',
        gross_price_eur: 500,
        professional_use_percent: -10,
      },
    },
  });
  check(negUsageRes.json?.error?.code === -32602, 'Usage < 0% rejected with code -32602', `Got ${JSON.stringify(negUsageRes.json?.error)}`);

  // --------------------------------------------------------------------------
  // MANDATE 2.3: Unknown RPC methods return code -32601
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Unknown RPC methods return code -32601 ---');

  // 3a. Completely unknown method
  const unkMethodRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-unk-method',
    method: 'super_secret_quantum_method',
    params: {},
  });
  check(unkMethodRes.rawText !== '{}', 'Unknown method response is NOT empty string "{}"', `Got ${unkMethodRes.rawText}`);
  check(unkMethodRes.json?.error?.code === -32601, 'Unknown RPC method returns code -32601', `Got ${JSON.stringify(unkMethodRes.json?.error)}`);

  // 3b. Unknown tool in tools/call
  const unkToolRes = await callMcp({
    jsonrpc: '2.0',
    id: 'test-unk-tool',
    method: 'tools/call',
    params: {
      name: 'non_existent_tool_xyz',
      arguments: {},
    },
  });
  check(unkToolRes.rawText !== '{}', 'Unknown tool response is NOT empty string "{}"', `Got ${unkToolRes.rawText}`);
  check(unkToolRes.json?.error?.code === -32601, 'Unknown tool in tools/call returns code -32601', `Got ${JSON.stringify(unkToolRes.json?.error)}`);

  // --------------------------------------------------------------------------
  // MANDATE 2.4: Zero student names or personal attributions exist anywhere in code, commits, or issue tracker
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Zero student names or personal attributions ---');

  // Search patterns for student names / team members / homework markers
  // Common names from coursework/SRH/etc:
  const studentPatterns = [
    'Mohamad',
    'Ettefagh',
    'Sina',
    'Matrikelnummer',
    'Matrikel',
    'Student ID',
    'Student Name',
    'Author: [A-Z]',
  ];

  // Check git commit log
  let gitLog = '';
  try {
    gitLog = execSync('git log --format="%s %b %an %ae" -n 50', { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e) {
    gitLog = '';
  }

  // Check for student names in git authors / subjects
  const bannedKeywords = [
    'mohamad',
    'sina',
    'matrikel',
  ];

  let logViolations = 0;
  for (const kw of bannedKeywords) {
    if (gitLog.toLowerCase().includes(kw)) {
      console.warn(`[GIT LOG WARNING] Found keyword '${kw}' in recent git log`);
      logViolations++;
    }
  }
  check(logViolations === 0, 'Zero banned student keywords in recent git log messages/authors');

  // Audit codebase (apps/ and packages/) for student attribution markers
  let codeViolations = [];
  const searchDirs = ['apps', 'packages'];
  for (const dir of searchDirs) {
    const fullDir = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    function scanDir(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.astro') continue;
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) {
          scanDir(p);
        } else if (entry.isFile() && (p.endsWith('.ts') || p.endsWith('.svelte') || p.endsWith('.astro') || p.endsWith('.json'))) {
          const content = fs.readFileSync(p, 'utf8');
          for (const kw of bannedKeywords) {
            if (content.toLowerCase().includes(kw)) {
              codeViolations.push({ file: p, keyword: kw });
            }
          }
        }
      }
    }
    scanDir(fullDir);
  }
  check(codeViolations.length === 0, 'Zero student names or attributions in apps/ and packages/ source files', JSON.stringify(codeViolations));

  // Check issues if issues directory or files exist
  const issueFiles = [];
  const issuesDir = path.join(REPO_ROOT, 'issues');
  if (fs.existsSync(issuesDir)) {
    const entries = fs.readdirSync(issuesDir);
    for (const file of entries) {
      if (file.endsWith('.md') || file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(issuesDir, file), 'utf8');
        for (const kw of bannedKeywords) {
          if (content.toLowerCase().includes(kw)) {
            issueFiles.push({ file, keyword: kw });
          }
        }
      }
    }
  }
  check(issueFiles.length === 0, 'Zero student names in local issue tracker files', JSON.stringify(issueFiles));

  console.log('='.repeat(80));
  console.log(`  DEEP EMPIRICAL RECHECK RESULTS: ${passedChecks}/${totalChecks} PASSED (${failures.length} FAILED)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
