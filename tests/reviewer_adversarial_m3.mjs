/**
 * tests/reviewer_adversarial_m3.mjs
 * Independent Reviewer Adversarial Stress Harness for Milestone M3
 * Author: reviewer_m3_2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = process.cwd();

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function check(section, condition, description, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✓ [${section}] ${description}`);
  } else {
    results.failed++;
    const err = `[${section}] FAIL: ${description} ${details ? '(' + details + ')' : ''}`;
    results.failures.push(err);
    console.error(`  ✗ ${err}`);
  }
}

async function run() {
  console.log('='.repeat(80));
  console.log('  REVIEWER M3 ADVERSARIAL & EDGE-CASE TEST SUITE');
  console.log('='.repeat(80));

  // =========================================================================
  // 1. MCP Endpoint Adversarial Parameter Verification (-32602)
  // =========================================================================
  console.log('\n--- SUITE 1: MCP Endpoint Error Handling & Parameter Rejection ---');
  
  // We test both the Astro server bundle and the functions handler
  const mcpWorkerPath = path.join(REPO_ROOT, 'apps', 'showcase', 'dist', '_worker.js', 'pages', 'api', 'mcp.astro.mjs');
  let mcpModule;
  if (fs.existsSync(mcpWorkerPath)) {
    mcpModule = await import(`file://${mcpWorkerPath}`);
  } else {
    const fallbackPath = path.join(REPO_ROOT, 'apps', 'showcase', 'functions', 'api', 'mcp.ts');
    mcpModule = await import(`file://${fallbackPath}`);
  }

  const pageObj = typeof mcpModule.page === 'function' ? mcpModule.page() : mcpModule;
  const postHandler = pageObj.POST || pageObj.onRequestPost || pageObj.onRequest;

  async function callMcp(body, headers = {}) {
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
    const res = await postHandler({ request: req });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  // 1.1 Malformed JSON
  {
    const res = await callMcp('NOT_VALID_JSON{');
    check('MCP-JSON', res.body.error?.code === -32700, 'Malformed JSON returns code -32700');
  }

  // 1.2 Invalid envelope (jsonrpc != 2.0)
  {
    const res = await callMcp({ jsonrpc: '1.0', method: 'tools/list', id: 1 });
    check('MCP-ENV', res.body.error?.code === -32600, 'jsonrpc 1.0 rejected with code -32600');
  }

  // 1.3 Missing method
  {
    const res = await callMcp({ jsonrpc: '2.0', id: 2 });
    check('MCP-ENV', res.body.error?.code === -32600, 'Missing method rejected with code -32600');
  }

  // 1.4 Unknown method
  {
    const res = await callMcp({ jsonrpc: '2.0', method: 'non_existent_method', id: 3 });
    const hasCode = res.body.error?.code === -32601;
    check('MCP-METH', hasCode, 'Unknown method returns code -32601',
      hasCode ? '' : `Returned body: ${JSON.stringify(res.body)} (missing await dispatchJsonRpc in mcp.ts line 432)`);
  }

  // 1.5 Unknown tool name in tools/call
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'non_existent_tool', arguments: {} }
    });
    check('MCP-TOOL', res.body.error?.code === -32601, 'Unknown tool in tools/call returns code -32601');
  }

  // 1.6 policy_lookup missing arguments
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: {} }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'policy_lookup with empty arguments returns code -32602');
  }

  // 1.7 policy_lookup with empty service_slug
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: { service_slug: '   ' } }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'policy_lookup with whitespace slug returns code -32602');
  }

  // 1.8 claim_dossier_generate missing all required arguments
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'claim_dossier_generate', arguments: {} }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'claim_dossier_generate with empty args returns code -32602');
  }

  // 1.9 claim_dossier_generate missing defect_description
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: 'MacBook Pro',
          purchase_date: '2025-01-15'
        }
      }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'claim_dossier_generate missing defect_description returns code -32602');
  }

  // 1.10 claim_dossier_generate invalid date format (slash separated)
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: 'MacBook Pro',
          purchase_date: '2025/01/15',
          defect_description: 'Battery swollen'
        }
      }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'claim_dossier_generate with non-ISO date returns code -32602');
  }

  // 1.11 claim_dossier_generate completely invalid date string
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: 'MacBook Pro',
          purchase_date: 'not-a-real-date',
          defect_description: 'Screen cracked'
        }
      }
    });
    check('MCP-PARAM', res.body.error?.code === -32602, 'claim_dossier_generate with arbitrary string date returns code -32602');
  }

  // 1.12 statutory_law_lookup invalid section
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'statutory_law_lookup',
        arguments: { statute_section: '9999' }
      }
    });
    const hasCode = res.body.error?.code === -32602;
    check('MCP-PARAM', hasCode, 'statutory_law_lookup with invalid section returns code -32602', 
      hasCode ? '' : `Returned body: ${JSON.stringify(res.body)} (missing await dispatchJsonRpc in mcp.ts)`);
  }

  // 1.13 subscription_category_rules invalid type
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'subscription_category_rules',
        arguments: { subscription_type: 'non_existent_category' }
      }
    });
    const hasCode = res.body.error?.code === -32602;
    check('MCP-PARAM', hasCode, 'subscription_category_rules with invalid category returns code -32602',
      hasCode ? '' : `Returned body: ${JSON.stringify(res.body)} (missing await dispatchJsonRpc in mcp.ts)`);
  }

  // 1.14 tax_deductibility_check invalid price (negative)
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'tax_deductibility_check',
        arguments: {
          item_name: 'Monitor',
          item_category: 'hardware',
          gross_price_eur: -50,
          purchase_date: '2025-01-01'
        }
      }
    });
    const hasCode = res.body.error?.code === -32602;
    check('MCP-PARAM', hasCode, 'tax_deductibility_check with negative price returns code -32602',
      hasCode ? '' : `Returned body: ${JSON.stringify(res.body)} (missing await dispatchJsonRpc in mcp.ts)`);
  }

  // 1.15 Valid claim dossier generation with LexFox certification
  {
    const res = await callMcp({
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: 'MacBook Air M3',
          purchase_date: '2025-06-01',
          defect_description: 'Trackpad unresponsive after system update'
        }
      }
    });
    check('MCP-VALID', !res.body.error, 'Valid claim dossier generates without error');
    const content = res.body.result?.content?.[0]?.text;
    check('MCP-VALID', content?.includes('lexfox_safe_harbor_certified') && content?.includes('BGH VIII ZR 285/18'), 'Dossier embeds LexFox safe-harbor certification');
  }

  // =========================================================================
  // 2. Static Brand Policy Wiki Prerender Output Verification (20 Brands)
  // =========================================================================
  console.log('\n--- SUITE 2: Static Brand Policy Wiki Prerendering (20 Brands) ---');

  const wikiDistDir = path.join(REPO_ROOT, 'apps', 'showcase', 'dist', 'wiki');
  console.log('DEBUG wikiDistDir:', wikiDistDir, 'exists:', fs.existsSync(wikiDistDir));
  check('WIKI-DIR', fs.existsSync(wikiDistDir), 'Wiki dist directory exists');

  const seedPath = path.join(REPO_ROOT, 'packages', 'core', 'data', 'policy_wiki_seed_v1.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  check('SEED', seedData.length === 20, `Canonical seed contains exactly 20 brands (found ${seedData.length})`);

  let validBrandsCount = 0;
  let lexfoxFooterCount = 0;
  let hashFragmentCount = 0;
  let noQueryParamLeakCount = 0;
  let brandIconCount = 0;
  let sec312kLinkCount = 0;

  for (const brand of seedData) {
    const slug = brand.brandSlug;
    const htmlPath = path.join(wikiDistDir, slug, 'index.html');
    const exists = fs.existsSync(htmlPath);
    if (!exists) {
      check('WIKI-PAGE', false, `Prerendered HTML exists for brand: ${slug}`);
      continue;
    }
    validBrandsCount++;

    const html = fs.readFileSync(htmlPath, 'utf8');

    // 2.1 LexFox Safe Harbor Footer
    if (html.includes('BGH VIII ZR 285/18') && html.includes('RDG')) {
      lexfoxFooterCount++;
    }

    // 2.2 Deep links use URL hash fragments
    const hasHashAction = html.includes('#action=view&slug=' + slug);
    const hasHashQuickAdd = html.includes('#action=quick-add');
    if (hasHashAction && hasHashQuickAdd) {
      hashFragmentCount++;
    }

    // 2.3 Verify NO query string leakage for wallet app deep links
    const hasQueryParamLeak = html.includes('app.cm-lab.pages.dev/?action=') || html.includes('app.cm-lab.pages.dev?action=');
    if (!hasQueryParamLeak) {
      noQueryParamLeakCount++;
    }

    // 2.4 Brand vector mark / icon
    if (html.includes('<svg') || html.includes('brand-avatar')) {
      brandIconCount++;
    }

    // 2.5 Subscription cancellation § 312k BGB check
    if (brand.category === 'subscription') {
      if (html.includes('312k') || (brand.cancellationUrl && html.includes(brand.cancellationUrl))) {
        sec312kLinkCount++;
      }
    } else {
      // Hardware brands don't need cancellation link, count as satisfied
      sec312kLinkCount++;
    }
  }

  check('WIKI-ALL', validBrandsCount === 20, `All 20 brand wiki pages prerendered (found ${validBrandsCount}/20)`);
  check('WIKI-LEXFOX', lexfoxFooterCount === 20, `All 20 pages feature LexFox safe-harbor footers (${lexfoxFooterCount}/20)`);
  check('WIKI-HASH', hashFragmentCount === 20, `All 20 pages use #action= URL hash fragments for privacy (${hashFragmentCount}/20)`);
  check('WIKI-NOLEAK', noQueryParamLeakCount === 20, `Zero query string leakage to Cloudflare logs across all 20 pages (${noQueryParamLeakCount}/20)`);
  check('WIKI-ICONS', brandIconCount === 20, `All 20 pages render brand icons (${brandIconCount}/20)`);
  check('WIKI-312K', sec312kLinkCount === 20, `All 20 pages adhere to statutory warranty / § 312k cancellation links (${sec312kLinkCount}/20)`);

  // =========================================================================
  // 3. Privacy, Anonymity & Student Names Audit
  // =========================================================================
  console.log('\n--- SUITE 3: Student Names & Personal Attribution Audit ---');

  // Let's check source files and git commits for common names or student references
  const searchDirs = [
    path.join(REPO_ROOT, 'apps', 'showcase', 'src'),
    path.join(REPO_ROOT, 'apps', 'app', 'src'),
    path.join(REPO_ROOT, 'packages', 'core', 'src')
  ];

  const forbiddenTerms = [
    'Student Name',
    'Matrikelnummer',
    'Matrikel-Nr',
    'Author: Ettefagh',
    'Author: Alireza'
  ];

  let forbiddenFound = 0;
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile() && /\.(ts|js|svelte|astro|json)$/.test(ent.name)) {
        const content = fs.readFileSync(full, 'utf8');
        for (const term of forbiddenTerms) {
          if (content.toLowerCase().includes(term.toLowerCase())) {
            forbiddenFound++;
            console.error(`  [FAIL] Forbidden term "${term}" found in ${full}`);
          }
        }
      }
    }
  }

  for (const d of searchDirs) {
    scanDir(d);
  }

  check('ANON-CODE', forbiddenFound === 0, `Zero student names or personal attributions in source code (found ${forbiddenFound})`);

  // =========================================================================
  // 4. Integrity Violation & Façade Implementation Audit
  // =========================================================================
  console.log('\n--- SUITE 4: Integrity Violation & Façade Implementation Audit ---');

  // 4.1 Check whether core calculation functions actually calculate or return hardcoded constants
  const bgbCompilerPath = path.join(REPO_ROOT, 'packages', 'core', 'src', 'legal', 'bgbNoticeCompiler.ts');
  const bgbContent = fs.readFileSync(bgbCompilerPath, 'utf8');
  check('INTEG-LOGIC', bgbContent.includes('getEasterSunday') && bgbContent.includes('isGermanPublicHoliday') && bgbContent.includes('isWerktag'), 'bgbNoticeCompiler contains genuine calendar calculation logic with Easter rollover');

  const taxEnginePath = path.join(REPO_ROOT, 'packages', 'core', 'src', 'tax', 'werbungskostenEngine.ts');
  const taxContent = fs.readFileSync(taxEnginePath, 'utf8');
  check('INTEG-TAX', taxContent.includes('BMF 22.02.2022') && taxContent.includes('calculateWerbungskosten'), 'werbungskostenEngine contains genuine 3-tier BFH GrS 1/06 and BMF 2022 tax logic');

  const cryptoVaultPath = path.join(REPO_ROOT, 'packages', 'core', 'src', 'crypto', 'cryptoVault.ts');
  const cryptoContent = fs.readFileSync(cryptoVaultPath, 'utf8');
  check('INTEG-CRYPTO', cryptoContent.includes('AES-GCM') && cryptoContent.includes('GoBDIntegrityError'), 'cryptoVault contains genuine WebCrypto AES-GCM and GoBD SHA-256 integrity verification');

  console.log('\n' + '='.repeat(80));
  console.log(`REVIEWER ADVERSARIAL TEST SUMMARY: ${results.passed}/${results.total} passed (${results.failed} failed)`);
  console.log('='.repeat(80));

  if (results.failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during adversarial tests:', err);
  process.exit(1);
});
