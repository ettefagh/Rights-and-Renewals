/**
 * tests/test_m3_empirical_challenger.mjs
 * Comprehensive Empirical Adversarial Verification Suite for Milestone M3 (Showcase, Wiki, MCP, Quality Gates)
 * Author: Empirical Challenger (challenger_m3_2)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Import showcase production built edge endpoint & Cloudflare pages function
import { page as mcpPage } from '../apps/showcase/dist/_worker.js/pages/api/mcp.astro.mjs';
const { POST: showcasePost, OPTIONS: showcaseOptions, ALL: showcaseAll } = mcpPage();
import { onRequest as pagesOnRequest } from '../apps/showcase/functions/api/mcp.ts';

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function assert(condition, name, details = '') {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    stats.failed++;
    stats.failures.push({ name, details });
    console.error(`  [FAIL] ${name} — ${details}`);
  }
}

// Mock Request helper for Astro API Route
function createAstroContext(body, method = 'POST', headers = {}) {
  const req = new Request('https://cm-lab.pages.dev/api/mcp', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
      ? (typeof body === 'string' ? body : JSON.stringify(body))
      : undefined
  });
  return { request: req };
}

async function runM3EmpiricalSuite() {
  console.log('='.repeat(80));
  console.log('  MILESTONE M3 EMPIRICAL ADVERSARIAL CHALLENGER SUITE');
  console.log('='.repeat(80));

  // ==========================================================================
  // SUITE 1: SHOWCASE LANDING PAGE DOM ARCHITECTURE & STATIC CONTRACTS
  // ==========================================================================
  console.log('\n--- SUITE 1: Landing Page DOM Element Contracts & Structure ---');
  const indexAstroPath = path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'pages', 'index.astro');
  assert(fs.existsSync(indexAstroPath), 'apps/showcase/src/pages/index.astro exists');
  const indexAstroContent = fs.readFileSync(indexAstroPath, 'utf8');

  // Verify mandatory DOM elements specified by challenger mandate
  const mandatoryElements = [
    { selector: '#mcp-playground', desc: 'Split-Screen MCP Protocol Playground root section' },
    { selector: '.mcp-console-panel', desc: 'MCP Protocol Console panel' },
    { selector: '#app-simulator-root', desc: 'Live App Simulator container' },
    { selector: '#showcase-omnibar-root', desc: 'Multi-Domain Omnibar Search container' },
    { selector: '#calendar-suite-root', desc: 'Triple Calendar Suite container' },
    { selector: '#spend-radar-widget', desc: 'Spend & Warranty Radar widget container' },
    { selector: '#gobd-feed-widget', desc: 'GoBD SHA-256 Receipt Feed widget container' },
    { selector: '#quick-connect-modal', desc: 'AI Agent Quick-Connect dialog' },
    { selector: '#header-connect-btn', desc: 'Header Agent Connect button' },
    { selector: '#theme-toggle-btn', desc: 'Theme toggle button' },
    { selector: '.hero-3d-scene-container', desc: 'Hero 3D Spatial Canvas wrapper' },
    { selector: '#safe-harbor-footer-root', desc: 'Safe-Harbor Legal Notice container' }
  ];

  for (const el of mandatoryElements) {
    const rawPattern = el.selector.startsWith('#')
      ? `id="${el.selector.slice(1)}"`
      : `class=".*${el.selector.slice(1)}.*"`;
    const regex = new RegExp(rawPattern);
    assert(regex.test(indexAstroContent), `DOM Element exists: ${el.selector} (${el.desc})`);
  }

  // ==========================================================================
  // SUITE 2: THRELTE 8 3D CANVAS & REDUCED-MOTION VECTOR FALLBACK
  // ==========================================================================
  console.log('\n--- SUITE 2: Threlte 8 3D Canvas Fallback & WebGL Context Loss ---');
  const scenePath = path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'components', '3d', 'ShowcaseVaultScene.svelte');
  const fallbackPath = path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'components', '3d', 'StaticVectorFallback.svelte');

  assert(fs.existsSync(scenePath), 'ShowcaseVaultScene.svelte exists');
  assert(fs.existsSync(fallbackPath), 'StaticVectorFallback.svelte exists');

  const sceneContent = fs.readFileSync(scenePath, 'utf8');
  const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');

  // Verify conditional rendering logic in ShowcaseVaultScene
  assert(
    sceneContent.includes('reducedMotion = false') && sceneContent.includes('hasContextLost = $state'),
    'ShowcaseVaultScene manages reducedMotion and hasContextLost reactive runes'
  );
  assert(
    sceneContent.includes('{#if !reducedMotion && !hasContextLost}') && sceneContent.includes('<StaticVectorFallback />'),
    'ShowcaseVaultScene falls back to StaticVectorFallback when reducedMotion or hasContextLost is true'
  );
  assert(
    sceneContent.includes('webglcontextlost') && sceneContent.includes('handleContextLost'),
    'ShowcaseVaultScene attaches webglcontextlost listener and transitions gracefully'
  );
  assert(
    sceneContent.includes('Math.min(window.devicePixelRatio || 1, 1.5)'),
    'ShowcaseVaultScene clamps DPR <= 1.5 to prevent GPU overload'
  );
  assert(
    sceneContent.includes('visibilitychange') && sceneContent.includes('isPageHidden'),
    'ShowcaseVaultScene monitors document visibility to freeze rendering loop on tab blur'
  );

  // Verify StaticVectorFallback SVG specifications
  assert(fallbackContent.includes('<svg class="fallback-svg"'), 'StaticVectorFallback renders vector SVG');
  assert(fallbackContent.includes('role="img"'), 'StaticVectorFallback sets role="img" for accessibility');
  assert(fallbackContent.includes('CM-LAB VAULT'), 'StaticVectorFallback includes titanium card brand text');
  assert(fallbackContent.includes('BGB'), 'StaticVectorFallback includes BGB gold seal chip');
  assert(fallbackContent.includes('12m · § 477'), 'StaticVectorFallback visualizes BGB § 477 12-month cliff');
  assert(fallbackContent.includes('24m · § 438'), 'StaticVectorFallback visualizes BGB § 438 24-month warranty expiry');
  assert(fallbackContent.includes('AES-GCM-256 · ZERO CLOUD PLAINTEXT'), 'StaticVectorFallback declares AES-GCM-256 zero cloud plaintext');

  // ==========================================================================
  // SUITE 3: STATIC BRAND POLICY WIKI PRERENDER AUDIT
  // ==========================================================================
  console.log('\n--- SUITE 3: Static Brand Policy Wiki Prerender Output Audit ---');
  const distWikiDir = path.join(REPO_ROOT, 'apps', 'showcase', 'dist', 'wiki');
  assert(fs.existsSync(distWikiDir), 'apps/showcase/dist/wiki directory exists in build output');

  const wikiIndexHtml = path.join(distWikiDir, 'index.html');
  assert(fs.existsSync(wikiIndexHtml), 'Static /wiki/index.html directory exists');
  const wikiIndexContent = fs.readFileSync(wikiIndexHtml, 'utf8');

  // Canonical 20 student brands
  const canonicalBrands = [
    'spotify', 'apple', 'mediamarkt', 'amazon', 'netflix', 'adobe', 'microsoft',
    'deutsche-bahn', 'github', 'jetbrains', 'youtube', 'saturn', 'otto',
    'mindfactory', 'notion', 'gymshark', 'mcfit', 'urban-sports-club', 'disney-plus', 'vodafone'
  ];

  assert(canonicalBrands.length === 20, 'Top 20 student brands list complete');

  for (const slug of canonicalBrands) {
    const brandHtmlPath = path.join(distWikiDir, slug, 'index.html');
    const brandExists = fs.existsSync(brandHtmlPath);
    assert(brandExists, `Static page generated: /wiki/${slug}/index.html`);

    if (brandExists) {
      const content = fs.readFileSync(brandHtmlPath, 'utf8');
      assert(content.length > 2500, `/wiki/${slug}/index.html has complete content (>2.5KB, actual: ${content.length} bytes)`);

      // Verify BGB citations
      const hasBgb = content.includes('BGB') && (content.includes('§ 438') || content.includes('§ 309') || content.includes('§ 312k') || content.includes('§ 477'));
      assert(hasBgb, `/wiki/${slug}/index.html contains statutory BGB citations`);

      // Verify LexFox safe harbor
      const hasLexFox = content.includes('BGH VIII ZR 285/18 (LexFox)') || content.includes('BGH, Urteil vom 27.11.2019 – VIII ZR 285/18') || content.includes('LexFox');
      assert(hasLexFox, `/wiki/${slug}/index.html contains LexFox safe-harbor notice`);

      // Verify deep links with hash fragments (preserves zero cloud plaintext)
      const hasDeepLink = content.includes(`https://app.cm-lab.pages.dev/#action=view&slug=${slug}`);
      assert(hasDeepLink, `/wiki/${slug}/index.html includes 1-tap deep link to sovereign wallet with hash fragment`);

      // Verify index page links to this brand
      assert(wikiIndexContent.includes(`/wiki/${slug}`), `Directory index /wiki links to /wiki/${slug}`);
    }
  }

  // ==========================================================================
  // SUITE 4: OPEN MCP SERVER ADVERSARIAL STRESS & PROTOCOL CONFORMANCE
  // ==========================================================================
  console.log('\n--- SUITE 4: Open MCP JSON-RPC 2.0 Server Adversarial Testing ---');

  // 4.1 CORS & OPTIONS
  const optionsCtx = createAstroContext(null, 'OPTIONS');
  const optRes = await showcaseOptions(optionsCtx);
  assert(optRes.status === 204, 'OPTIONS returns HTTP 204 No Content');
  assert(optRes.headers.get('Access-Control-Allow-Origin') === '*', 'OPTIONS header Access-Control-Allow-Origin is *');
  assert(optRes.headers.get('Access-Control-Allow-Methods').includes('POST'), 'OPTIONS header allows POST');

  // 4.2 Non-POST HTTP methods via ALL handler
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const allCtx = createAstroContext(null, method);
    const allRes = await showcaseAll(allCtx);
    assert(allRes.status === 405, `${method} returns HTTP 405 Method Not Allowed`);
    const allJson = await allRes.json();
    assert(allJson.error?.code === -32600, `${method} returns JSON-RPC error code -32600`);
  }

  // 4.3 Malformed JSON (Parse Error -32700)
  const parseCtx = createAstroContext('{ malformed json }', 'POST');
  const parseRes = await showcasePost(parseCtx);
  assert(parseRes.status === 400, 'Malformed JSON returns HTTP 400');
  const parseJson = await parseRes.json();
  assert(parseJson.error?.code === -32700, 'Malformed JSON returns code -32700 (Parse error)');

  // 4.4 Invalid Request Envelopes (-32600)
  const invalidEnvelopes = [
    {},
    { id: 1 },
    { jsonrpc: '1.0', id: 2, method: 'tools/list' },
    { jsonrpc: '3.0', id: 3, method: 'tools/list' },
    { jsonrpc: '2.0', id: 4 } // missing method
  ];
  for (let i = 0; i < invalidEnvelopes.length; i++) {
    const envCtx = createAstroContext(invalidEnvelopes[i], 'POST');
    const envRes = await showcasePost(envCtx);
    assert(envRes.status === 400, `Invalid envelope #${i + 1} returns HTTP 400`);
    const envJson = await envRes.json();
    assert(envJson.error?.code === -32600, `Invalid envelope #${i + 1} returns error code -32600`);
  }

  // 4.5 Unknown Method (-32601)
  const unkCtx = createAstroContext({ jsonrpc: '2.0', id: 'm1', method: 'non_existent_method' }, 'POST');
  const unkRes = await showcasePost(unkCtx);
  const unkJson = await unkRes.json();
  assert(unkJson.error?.code === -32601, 'Non-existent method returns error code -32601', `Received raw response: ${JSON.stringify(unkJson)}`);

  // 4.6 Initialize Protocol Call
  const initCtx = createAstroContext({ jsonrpc: '2.0', id: 'init-1', method: 'initialize' }, 'POST');
  const initRes = await showcasePost(initCtx);
  const initJson = await initRes.json();
  assert(initJson.result?.protocolVersion === '2024-11-05', 'initialize returns protocolVersion 2024-11-05');
  assert(initJson.result?.serverInfo?.name === 'cmlab-warranty-mcp', 'initialize returns serverInfo.name cmlab-warranty-mcp');

  // 4.7 Tools List
  const listCtx = createAstroContext({ jsonrpc: '2.0', id: 'list-1', method: 'tools/list' }, 'POST');
  const listRes = await showcasePost(listCtx);
  const listJson = await listRes.json();
  const toolNames = listJson.result?.tools?.map(t => t.name) || [];
  assert(toolNames.includes('policy_lookup'), 'tools/list includes policy_lookup');
  assert(toolNames.includes('claim_dossier_generate'), 'tools/list includes claim_dossier_generate');
  assert(toolNames.includes('statutory_law_lookup'), 'tools/list includes statutory_law_lookup');
  assert(toolNames.includes('subscription_category_rules'), 'tools/list includes subscription_category_rules');
  assert(toolNames.includes('tax_deductibility_check'), 'tools/list includes tax_deductibility_check');

  // 4.8 policy_lookup tool calls
  // Valid lookup with service_slug
  const p1Ctx = createAstroContext({
    jsonrpc: '2.0',
    id: 'p1',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'spotify' } }
  });
  const p1Res = await showcasePost(p1Ctx);
  const p1Json = await p1Res.json();
  assert(!p1Json.error, 'policy_lookup(service_slug: spotify) succeeds without error');
  const p1Data = JSON.parse(p1Json.result.content[0].text);
  assert(p1Data.brand_name === 'Spotify', 'policy_lookup returns Spotify metadata');
  assert(p1Data.cancellation_button_compliant === true, 'Spotify marked § 312k button compliant');

  // Dual-slug compatibility with brand_slug
  const p2Ctx = createAstroContext({
    jsonrpc: '2.0',
    id: 'p2',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { brand_slug: 'spotify' } }
  });
  const p2Res = await showcasePost(p2Ctx);
  const p2Json = await p2Res.json();
  const p2Data = JSON.parse(p2Json.result.content[0].text);
  assert(p2Data.brand_name === 'Spotify', 'policy_lookup with dual-slug brand_slug succeeds');

  // Alias resolution
  const p3Ctx = createAstroContext({
    jsonrpc: '2.0',
    id: 'p3',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'macbook' } }
  });
  const p3Res = await showcasePost(p3Ctx);
  const p3Json = await p3Res.json();
  const p3Data = JSON.parse(p3Json.result.content[0].text);
  assert(p3Data.brand_name === 'Apple', 'Alias "macbook" successfully resolves to brand Apple');

  // Invalid params rejection (-32602)
  const badPolicyArgs = [
    {},
    { service_slug: '' },
    { service_slug: '   ' },
    { brand_slug: '' },
    { brand_slug: 12345 }
  ];
  for (let i = 0; i < badPolicyArgs.length; i++) {
    const badCtx = createAstroContext({
      jsonrpc: '2.0',
      id: `bad-p-${i}`,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: badPolicyArgs[i] }
    });
    const badRes = await showcasePost(badCtx);
    const badJson = await badRes.json();
    assert(badJson.error?.code === -32602, `policy_lookup rejects bad params #${i + 1} with code -32602`);
  }

  // Unknown brand handling
  const unkBrandCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'unk-b',
    method: 'tools/call',
    params: { name: 'policy_lookup', arguments: { service_slug: 'unregistered-fake-brand-999' } }
  });
  const unkBrandRes = await showcasePost(unkBrandCtx);
  const unkBrandJson = await unkBrandRes.json();
  assert(unkBrandJson.result?.isError === true, 'Unknown brand returns result.isError === true without crashing');

  // 4.9 claim_dossier_generate tool calls
  // Valid claim dossier
  const c1Ctx = createAstroContext({
    jsonrpc: '2.0',
    id: 'c1',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'Apple MacBook Pro 16 M3 Max',
        purchase_date: '2026-01-15',
        defect_description: 'Kernel panic on external display connection'
      }
    }
  });
  const c1Res = await showcasePost(c1Ctx);
  const c1Json = await c1Res.json();
  assert(!c1Json.error, 'claim_dossier_generate succeeds');
  const c1Data = JSON.parse(c1Json.result.content[0].text);
  assert(c1Data.burden_of_proof === 'seller', 'Recent purchase within 12m places burden of proof on seller (§ 477 Abs. 1)');
  assert(c1Data.lexfox_safe_harbor_certified === true, 'Claim dossier is LexFox safe-harbor certified');
  assert(c1Data.dossier_text_de.includes('MÄNGELRÜGE GEMÄSS § 437 BGB'), 'Dossier text includes BGB § 437 header');
  assert(c1Data.dossier_text_de.includes('BGH VIII ZR 285/18 (LexFox)'), 'Dossier text embeds non-removable LexFox disclaimer');

  // Leap year boundary test: 2024-02-29 purchase cliff date
  const leapCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'leap-1',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'sony',
        item_name: 'Sony Headphones',
        purchase_date: '2024-02-29',
        defect_description: 'Driver rattle'
      }
    }
  });
  const leapRes = await showcasePost(leapCtx);
  const leapJson = await leapRes.json();
  const leapData = JSON.parse(leapJson.result.content[0].text);
  assert(leapData.cliff_date === '2025-02-28', 'Leap day 2024-02-29 correctly resolves to 2025-02-28 cliff (§ 188 Abs. 3 BGB)');

  // Missing and malformed arguments rejection (-32602)
  const badClaimArgs = [
    {},
    { brand_slug: 'apple' },
    { brand_slug: 'apple', item_name: 'MacBook' },
    { brand_slug: 'apple', item_name: 'MacBook', purchase_date: '2026-01-01' }, // missing defect_description
    { brand_slug: 'apple', item_name: 'MacBook', purchase_date: 'invalid-date', defect_description: 'crack' },
    { brand_slug: 'apple', item_name: 'MacBook', purchase_date: '15.01.2026', defect_description: 'crack' },
    { brand_slug: 'apple', item_name: 'MacBook', purchase_date: '2026/01/15', defect_description: 'crack' }
  ];
  for (let i = 0; i < badClaimArgs.length; i++) {
    const badCtx = createAstroContext({
      jsonrpc: '2.0',
      id: `bad-c-${i}`,
      method: 'tools/call',
      params: { name: 'claim_dossier_generate', arguments: badClaimArgs[i] }
    });
    const badRes = await showcasePost(badCtx);
    const badJson = await badRes.json();
    assert(badJson.error?.code === -32602, `claim_dossier_generate rejects invalid input #${i + 1} with -32602`);
  }

  // 4.10 Core-delegated tools
  // statutory_law_lookup
  const lawCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'law-1',
    method: 'tools/call',
    params: { name: 'statutory_law_lookup', arguments: { statute_section: '477' } }
  });
  const lawRes = await showcasePost(lawCtx);
  const lawJson = await lawRes.json();
  const hasLawResult = Boolean(lawJson && lawJson.result && Array.isArray(lawJson.result.content));
  assert(hasLawResult, 'statutory_law_lookup(477) returns valid JSON-RPC 2.0 result envelope', `Received raw response: ${JSON.stringify(lawJson)}`);
  if (hasLawResult) {
    const lawData = JSON.parse(lawJson.result.content[0].text);
    assert(lawData.statute_section === '§ 477 BGB' || lawData.statute_section?.includes('477'), 'Returns BGB § 477 summary');
  }

  // subscription_category_rules
  const subRuleCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'sub-1',
    method: 'tools/call',
    params: { name: 'subscription_category_rules', arguments: { subscription_type: 'streaming' } }
  });
  const subRuleRes = await showcasePost(subRuleCtx);
  const subRuleJson = await subRuleRes.json();
  const hasSubRuleResult = Boolean(subRuleJson && subRuleJson.result && Array.isArray(subRuleJson.result.content));
  assert(hasSubRuleResult, 'subscription_category_rules(streaming) returns valid JSON-RPC 2.0 result envelope', `Received raw response: ${JSON.stringify(subRuleJson)}`);
  if (hasSubRuleResult) {
    const subRuleData = JSON.parse(subRuleJson.result.content[0].text);
    assert(subRuleData.max_initial_term_months === 24, 'Streaming rules cite max 24 months initial term');
  }

  // tax_deductibility_check
  const taxCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'tax-1',
    method: 'tools/call',
    params: {
      name: 'tax_deductibility_check',
      arguments: {
        item_name: 'Dell Monitor UltraSharp 27',
        item_category: 'hardware',
        gross_price_eur: 450.00,
        professional_use_percent: 100,
        purchase_date: '2026-03-01'
      }
    }
  });
  const taxRes = await showcasePost(taxCtx);
  const taxJson = await taxRes.json();
  const hasTaxResult = Boolean(taxJson && taxJson.result && Array.isArray(taxJson.result.content));
  assert(hasTaxResult, 'tax_deductibility_check returns valid JSON-RPC 2.0 result envelope', `Received raw response: ${JSON.stringify(taxJson)}`);
  if (hasTaxResult) {
    const taxData = JSON.parse(taxJson.result.content[0].text);
    assert(taxData.is_deductible === true, 'Computer monitor is tax deductible');
    assert(taxData.write_off_method?.includes('Sofortabschreibung'), 'Digital hardware qualifies for 100% Sofortabschreibung under BMF 2022');
  }

  // 4.11 Adversarial Payloads & Injection Fuzzing
  console.log('\n--- SUITE 5: Adversarial Fuzzing, Injections & Edge Cases ---');
  const hostilePayloads = [
    { name: 'XSS script injection', payload: '<script>alert(document.cookie)</script>' },
    { name: 'XSS img onerror', payload: '"><img src=x onerror=alert(1)>' },
    { name: 'Template string evaluation', payload: '${process.exit(1)}' },
    { name: 'SQL injection string', payload: "'; DROP TABLE items; --" },
    { name: 'Directory traversal', payload: '../../../../../../windows/system32/cmd.exe' },
    { name: 'Null byte injection', payload: 'spotify\u0000admin' },
    { name: 'German umlauts & sharp s', payload: 'Mängelrüge & Kündigung für Maßanzug' },
    { name: 'Unicode symbols & emoji', payload: '🛡️ ⚖️ ⚡ 📱 🇩🇪' },
    { name: 'RTL override unicode', payload: '\u202Ereversed_text\u202C' }
  ];

  for (const { name: pName, payload } of hostilePayloads) {
    const fuzzedCtx = createAstroContext({
      jsonrpc: '2.0',
      id: `fuzz-${pName}`,
      method: 'tools/call',
      params: {
        name: 'claim_dossier_generate',
        arguments: {
          brand_slug: 'apple',
          item_name: payload,
          purchase_date: '2026-02-01',
          defect_description: payload
        }
      }
    });
    const fuzzedRes = await showcasePost(fuzzedCtx);
    assert(fuzzedRes.status === 200, `Hostile input [${pName}] processed safely without 500 crash`);
    const fuzzedJson = await fuzzedRes.json();
    assert(fuzzedJson.result?.content?.[0]?.text?.length > 0, `Hostile input [${pName}] produced valid output envelope`);
  }

  // Prototype pollution attempt
  const pollutionCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'pollution-1',
    method: 'tools/call',
    params: {
      name: 'policy_lookup',
      arguments: {
        service_slug: '__proto__',
        constructor: { prototype: { poll: true } }
      }
    }
  });
  const pollRes = await showcasePost(pollutionCtx);
  assert(pollRes.status === 200, 'Prototype pollution attempt does not crash server');
  assert(Object.prototype.poll === undefined, 'Global prototype was not polluted');

  // Gigantic payload (100KB defect description)
  const giantDescription = 'Defekt in Touchpad '.repeat(5000); // ~100KB
  const startGiant = performance.now();
  const giantCtx = createAstroContext({
    jsonrpc: '2.0',
    id: 'giant-1',
    method: 'tools/call',
    params: {
      name: 'claim_dossier_generate',
      arguments: {
        brand_slug: 'apple',
        item_name: 'MacBook Pro',
        purchase_date: '2026-01-10',
        defect_description: giantDescription
      }
    }
  });
  const giantRes = await showcasePost(giantCtx);
  const giantElapsed = performance.now() - startGiant;
  assert(giantRes.status === 200, '100KB defect payload handled cleanly');
  assert(giantElapsed < 100, `100KB defect processed in ${giantElapsed.toFixed(2)}ms (< 100ms)`);

  // Concurrent Execution Stress Test
  console.log('\n--- SUITE 6: Concurrent Execution Performance Benchmarking ---');
  const concurrencyLevel = 50;
  const concurrentPromises = [];
  const startConcurrent = performance.now();

  for (let i = 0; i < concurrencyLevel; i++) {
    const slug = canonicalBrands[i % canonicalBrands.length];
    const ctx = createAstroContext({
      jsonrpc: '2.0',
      id: `conc-${i}`,
      method: 'tools/call',
      params: { name: 'policy_lookup', arguments: { service_slug: slug } }
    });
    concurrentPromises.push(showcasePost(ctx));
  }

  const concurrentResults = await Promise.all(concurrentPromises);
  const totalConcurrentElapsed = performance.now() - startConcurrent;
  const avgLatency = totalConcurrentElapsed / concurrencyLevel;

  assert(concurrentResults.every(r => r.status === 200), `All ${concurrencyLevel} concurrent requests returned HTTP 200`);
  assert(avgLatency < 30, `Average concurrent latency ${avgLatency.toFixed(2)}ms meets < 30ms SLA`);
  console.log(`  [BENCHMARK] ${concurrencyLevel} concurrent requests executed in ${totalConcurrentElapsed.toFixed(2)}ms (avg: ${avgLatency.toFixed(2)}ms/req)`);

  // ==========================================================================
  // SUITE 7: SECURITY HEADERS & ZERO STUDENT ATTRIBUTION AUDIT
  // ==========================================================================
  console.log('\n--- SUITE 7: Security Headers & Attribution Audit ---');
  const headersPath = path.join(REPO_ROOT, 'apps', 'showcase', 'public', '_headers');
  assert(fs.existsSync(headersPath), 'apps/showcase/public/_headers exists');
  const headersContent = fs.readFileSync(headersPath, 'utf8');

  assert(headersContent.includes('Permissions-Policy: camera=(self)'), 'Declares Permissions-Policy: camera=(self)');
  assert(!headersContent.includes('Cross-Origin-Embedder-Policy: require-corp'), 'Strictly omits COEP: require-corp (Red Line 4)');
  assert(headersContent.includes('Strict-Transport-Security:'), 'Declares Strict-Transport-Security (HSTS)');

  // Student attribution audit across showcase source files
  const showcaseFiles = [
    indexAstroPath,
    scenePath,
    fallbackPath,
    path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'pages', 'api', 'mcp.ts'),
    path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'pages', 'wiki', '[slug].astro'),
    path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'pages', 'wiki', 'index.astro'),
    path.join(REPO_ROOT, 'apps', 'showcase', 'src', 'main.js')
  ];

  const forbiddenAttributionTerms = [
    'MojiRha', 'JeetKan', 'KhantLinHtut', 'Khant Lin Htut',
    'student name', 'matriculation', 'matrikelnummer', 'homework assignment'
  ];

  let attributionLeaks = 0;
  for (const f of showcaseFiles) {
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const term of forbiddenAttributionTerms) {
        if (txt.toLowerCase().includes(term.toLowerCase())) {
          console.error(`  [LEAK] Found attribution term "${term}" in ${path.relative(REPO_ROOT, f)}`);
          attributionLeaks++;
        }
      }
    }
  }
  assert(attributionLeaks === 0, 'Zero student names or personal homework attributions found in showcase source code');

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('  MILESTONE M3 CHALLENGER VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Total Checks: ${stats.total}`);
  console.log(`  Passed:       ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  Failed:       ${stats.failed}`);
  if (stats.failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of stats.failures) {
      console.log(`  - ${f.name}: ${f.details}`);
    }
  }
  console.log('='.repeat(80));

  // Write results to JSON artifact
  const resultsArtifact = {
    timestamp: new Date().toISOString(),
    milestone: 'M3',
    agent: 'challenger_m3_2',
    verdict: stats.failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES',
    stats,
    benchmark: {
      concurrencyLevel,
      totalConcurrentElapsedMs: totalConcurrentElapsed,
      avgLatencyMsPerReq: avgLatency
    }
  };

  fs.writeFileSync(
    path.join(REPO_ROOT, 'tests', 'm3_empirical_challenger_results.json'),
    JSON.stringify(resultsArtifact, null, 2)
  );

  return stats.failed === 0;
}

runM3EmpiricalSuite().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error in empirical test harness:', err);
  process.exit(1);
});
