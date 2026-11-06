/**
 * test_m3_omnibar_empirical.mjs
 * Empirical Challenger Verification & Stress Harness for Milestone M3 Gate: Unified Omnibar
 * Author: Empirical Challenger (teamwork_challenger_m3_1)
 * Target: apps/app/js/components/omnibar.js & integration with apps/app/js/app.js
 *
 * Requirements:
 * 1. Test all 8 states (IDLE, FOCUSED_EMPTY, QUERYING, VAULT_MATCHES, WIKI_MATCHES,
 *    HYBRID_MATCHES, NO_MATCH_SUGGESTION, COMMAND_MODE) and transition rules.
 * 2. Test keyboard interactions: Ctrl+K, /, 2-step Escape, ArrowUp/ArrowDown with
 *    wrap clamping and scrollIntoView, and Enter.
 * 3. Test dual search matching: wiki brand queries, vault queries, hybrid queries,
 *    and zero-match fallback suggestions.
 * 4. Test verb commands: >claim, >cancel, >tax, >import, >audit, >export.
 * 5. Deep architectural and event dispatch contracts between omnibar.js and app.js.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import {
  OmnibarFSM,
  OmnibarSearchEngine,
  OmnibarState,
  UnifiedOmnibarComponent
} from '../apps/app/js/components/omnibar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'apps', 'app');

// Load canonical seed brands dataset
const seedBrandsPath = path.join(APP_DIR, 'data', 'policy_wiki_seed_v1.json');
const seedBrands = JSON.parse(fs.readFileSync(seedBrandsPath, 'utf8'));

// Sample vault items for search testing
const sampleVaultItems = [
  {
    id: 'v101',
    name: 'Apple MacBook Pro 14" M3',
    merchant: 'Apple Store Kurfürstendamm',
    category: 'hardware',
    purchaseDate: '2025-11-01',
    expiryDate: '2027-11-01',
    priceEur: 1999.00,
    status: 'protected',
    searchTokens: ['laptop', 'notebook', 'macbook', 'apple', 'm3'],
    receiptSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'v102',
    name: 'Spotify Premium Student',
    merchant: 'Spotify AB',
    category: 'subscription',
    purchaseDate: '2026-01-01',
    expiryDate: '2026-11-08',
    priceEur: 5.99,
    status: 'urgent',
    searchTokens: ['music', 'streaming', 'audio', 'spotify']
  },
  {
    id: 'v103',
    name: 'Sony WH-1000XM5',
    merchant: 'MediaMarkt Berlin-Alexanderplatz',
    category: 'hardware',
    purchaseDate: '2025-08-15',
    expiryDate: '2027-08-15',
    priceEur: 349.99,
    status: 'protected',
    searchTokens: ['headphones', 'anc', 'bluetooth', 'sony', 'audio']
  },
  {
    id: 'v104',
    name: 'FitX Fitnessstudio Vertrag',
    merchant: 'FitX Deutschland GmbH',
    category: 'subscription',
    purchaseDate: '2024-03-01',
    expiryDate: '2026-11-15',
    priceEur: 29.00,
    status: 'warning',
    searchTokens: ['gym', 'fitness', 'workout', 'fitx']
  }
];

// Test Results Collector
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
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
console.log('  CM-LAB MILESTONE M3 GATE — UNIFIED OMNIBAR EMPIRICAL CHALLENGER');
console.log('='.repeat(80));

// ============================================================================
// PART 1: FORMAL 8-STATE FSM & SEARCH ENGINE UNIT TESTS
// ============================================================================
console.log('\n--- PART 1: Formal 8-State Omnibar FSM Unit Verification ---');

// 1.1 State Definitions
assert(Object.keys(OmnibarState).length === 8, 'OmnibarState defines exactly 8 states');
assert(OmnibarState.IDLE === 'IDLE', 'OmnibarState has IDLE');
assert(OmnibarState.FOCUSED_EMPTY === 'FOCUSED_EMPTY', 'OmnibarState has FOCUSED_EMPTY');
assert(OmnibarState.QUERYING === 'QUERYING', 'OmnibarState has QUERYING');
assert(OmnibarState.VAULT_MATCHES === 'VAULT_MATCHES', 'OmnibarState has VAULT_MATCHES');
assert(OmnibarState.WIKI_MATCHES === 'WIKI_MATCHES', 'OmnibarState has WIKI_MATCHES');
assert(OmnibarState.HYBRID_MATCHES === 'HYBRID_MATCHES', 'OmnibarState has HYBRID_MATCHES');
assert(OmnibarState.NO_MATCH_SUGGESTION === 'NO_MATCH_SUGGESTION', 'OmnibarState has NO_MATCH_SUGGESTION');
assert(OmnibarState.COMMAND_MODE === 'COMMAND_MODE', 'OmnibarState has COMMAND_MODE');

// 1.2 Illegal State Guards
const fsm = new OmnibarFSM();
assert(fsm.state === OmnibarState.IDLE, 'Initial FSM state is IDLE');

let threwIllegal = false;
try {
  fsm.transitionTo('NON_EXISTENT_STATE');
} catch (e) {
  threwIllegal = true;
}
assert(threwIllegal, 'FSM rejects illegal state transition with Error');

// 1.3 State Transitions & Rule Recording
fsm.transitionTo(OmnibarState.FOCUSED_EMPTY, 1);
assert(fsm.state === OmnibarState.FOCUSED_EMPTY, 'Transition to FOCUSED_EMPTY (Rule 1)');
assert(fsm.executedRules.has(1), 'Executed rule 1 recorded in executedRules set');
assert(fsm.history.length === 2 && fsm.history[1] === OmnibarState.FOCUSED_EMPTY, 'History records transition');

fsm.transitionTo(OmnibarState.QUERYING, 3);
assert(fsm.state === OmnibarState.QUERYING, 'Transition to QUERYING (Rule 3)');

fsm.transitionTo(OmnibarState.WIKI_MATCHES, 8);
assert(fsm.state === OmnibarState.WIKI_MATCHES, 'Transition to WIKI_MATCHES (Rule 8)');

fsm.transitionTo(OmnibarState.FOCUSED_EMPTY, 20);
assert(fsm.state === OmnibarState.FOCUSED_EMPTY, 'Transition back to FOCUSED_EMPTY on Esc 1 (Rule 20)');

fsm.transitionTo(OmnibarState.IDLE, 21);
assert(fsm.state === OmnibarState.IDLE, 'Transition back to IDLE on Esc 2 (Rule 21)');

fsm.reset();
assert(fsm.state === OmnibarState.IDLE, 'FSM reset restores IDLE');
assert(fsm.history.length === 1 && fsm.executedRules.size === 0, 'FSM reset clears history and rules');

// ============================================================================
// PART 2: DUAL-INDEX SEARCH ENGINE VERIFICATION
// ============================================================================
console.log('\n--- PART 2: Dual-Index Search Engine Matching ---');

const engine = new OmnibarSearchEngine(seedBrands, sampleVaultItems);

// 2.1 Wiki Brand Queries
const resNetflix = engine.search('Netflix');
assert(resNetflix.wikiMatches.length >= 1, 'Search "Netflix" finds wiki brand match');
assert(resNetflix.vaultMatches.length === 0, 'Search "Netflix" has 0 vault matches');
assert(resNetflix.wikiMatches[0].brand_name === 'Netflix', 'Matches brand_name "Netflix"');

const resSlug = engine.search('apple');
assert(resSlug.wikiMatches.some(b => (b.service_slug || b.serviceSlug) === 'apple'), 'Search by service_slug "apple"');

const resAlias = engine.search('streaming');
assert(resAlias.wikiMatches.some(b => b.brand_name === 'Spotify'), 'Search by search_alias "streaming" matches Spotify');

const resStatute = engine.search('312k');
assert(resStatute.wikiMatches.length >= 1, 'Search by statutory basis "312k" returns BGB § 312k brands');

// 2.2 Vault Queries
const resMacBook = engine.search('MacBook');
assert(resMacBook.vaultMatches.length >= 1, 'Search "MacBook" finds saved vault item');
assert(resMacBook.vaultMatches[0].id === 'v101', 'Matches vault item v101');

const resMerchant = engine.search('MediaMarkt');
assert(resMerchant.vaultMatches.some(it => it.id === 'v103'), 'Search by merchant "MediaMarkt" finds Sony item');

// 2.3 Hybrid Queries
const resSpotify = engine.search('Spotify');
assert(resSpotify.wikiMatches.length >= 1, 'Search "Spotify" has wiki matches');
assert(resSpotify.vaultMatches.length >= 1, 'Search "Spotify" has vault matches');
assert(resSpotify.wikiMatches.length >= 1 && resSpotify.vaultMatches.length >= 1, 'Search "Spotify" produces HYBRID matches');

// 2.4 Zero Match Fallback
const resZero = engine.search('Unobtainium X9000 Rare');
assert(resZero.wikiMatches.length === 0, 'Zero-match query has 0 wiki matches');
assert(resZero.vaultMatches.length === 0, 'Zero-match query has 0 vault matches');

// 2.5 Empty and Boundary Queries
const resEmpty = engine.search('');
assert(resEmpty.wikiMatches.length === 0 && resEmpty.vaultMatches.length === 0, 'Empty query returns empty results');

const resSpaces = engine.search('   ');
assert(resSpaces.wikiMatches.length === 0 && resSpaces.vaultMatches.length === 0, 'Whitespace query returns empty results');

// 2.6 Category Filtering
const resHwOnly = engine.search('Spotify', 'hardware');
assert(resHwOnly.wikiMatches.length === 0, 'Category filter "hardware" excludes subscription wiki');
assert(resHwOnly.vaultMatches.length === 0, 'Category filter "hardware" excludes subscription vault');

const resSubOnly = engine.search('Spotify', 'subscription');
assert(resSubOnly.wikiMatches.length >= 1, 'Category filter "subscription" includes Spotify wiki');
assert(resSubOnly.vaultMatches.length >= 1, 'Category filter "subscription" includes Spotify vault item');

// ============================================================================
// PART 3: HEADLESS CHROMIUM OMNIBAR COMPONENT INTERACTION & KEYBOARD TESTS
// ============================================================================
console.log('\n--- PART 3: Headless Chromium Standalone Omnibar Component Tests ---');

// 3.1 Start static HTTP server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const STANDALONE_OMNIBAR_HTML = `<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
  <meta charset="utf-8">
  <title>Omnibar Standalone Test Harness</title>
  <link rel="stylesheet" href="./styles/tokens.css">
  <link rel="stylesheet" href="./styles/app.css">
  <link rel="stylesheet" href="./styles/omnibar.css">
</head>
<body class="app-shell" style="padding: 24px;">
  <button id="focus-sentinel" type="button">Outside Button</button>
  <header role="banner" id="app-header">
    <div id="omnibar-root"></div>
  </header>
  <script type="module">
    import { UnifiedOmnibarComponent } from './js/components/omnibar.js';
    import { INITIAL_VAULT_ITEMS } from './js/data/sampleItems.js';

    fetch('./data/policy_wiki_seed_v1.json')
      .then(r => r.json())
      .then(brands => {
        window.omnibarInstance = new UnifiedOmnibarComponent({
          mountTarget: document.getElementById('omnibar-root'),
          wikiBrands: brands,
          vaultItems: INITIAL_VAULT_ITEMS
        });
        window.omnibarReady = true;
      });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/standalone-omnibar.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(STANDALONE_OMNIBAR_HTML);
    return;
  }

  let filePath = path.join(APP_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) {
    const altPath = path.join(REPO_ROOT, urlPath);
    if (fs.existsSync(altPath)) filePath = altPath;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + urlPath);
  }
});

const APP_PORT = 4326;
await new Promise(resolve => server.listen(APP_PORT, '127.0.0.1', resolve));

// 3.2 Launch Headless Chrome
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));
const CDP_PORT = 9336;

const browserProc = spawn(chromeExe, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-extensions',
  'about:blank'
], { stdio: 'ignore' });

async function waitForCDP(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timeout waiting for CDP');
}

await waitForCDP();

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.eventListeners = new Map();

    this.ready = new Promise(resolve => {
      this.ws.addEventListener('open', resolve);
    });

    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method && this.eventListeners.has(msg.method)) {
        for (const cb of this.eventListeners.get(msg.method)) cb(msg.params);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const msgId = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

const newTab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: 'PUT' })).json();
const client = new CDPClient(newTab.webSocketDebuggerUrl);

await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('DOM.enable');

// Navigate to standalone Omnibar harness
await client.send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/standalone-omnibar.html` });

// Wait for omnibarReady
for (let i = 0; i < 30; i++) {
  const isReady = await client.eval('window.omnibarReady === true');
  if (isReady) break;
  await new Promise(r => setTimeout(r, 100));
}

// 3.3 Combobox DOM Structure & Initial State (Rule 1 / WAI-ARIA)
const initDom = await client.eval(`
  (() => {
    const combobox = document.getElementById('omnibar-combobox');
    const input = document.getElementById('omnibar-input');
    const dropdown = document.getElementById('omnibar-dropdown');
    return {
      hasCombobox: !!combobox,
      role: combobox?.getAttribute('role'),
      ariaExpanded: combobox?.getAttribute('aria-expanded'),
      ariaHasPopup: combobox?.getAttribute('aria-haspopup'),
      ariaControls: combobox?.getAttribute('aria-controls'),
      hasInput: !!input,
      inputRole: input?.getAttribute('aria-autocomplete'),
      hasDropdown: !!dropdown,
      dropdownRole: dropdown?.getAttribute('role'),
      dropdownDisplay: dropdown ? window.getComputedStyle(dropdown).display : null,
      fsmState: window.omnibarInstance.fsm.state
    };
  })()
`);

assert(initDom.hasCombobox, 'Omnibar combobox root exists');
assert(initDom.role === 'combobox', 'Combobox has role="combobox" (WAI-ARIA 1.3)');
assert(initDom.ariaExpanded === 'false', 'Initial combobox aria-expanded is "false"');
assert(initDom.ariaHasPopup === 'listbox', 'Combobox has aria-haspopup="listbox"');
assert(initDom.ariaControls === 'omnibar-dropdown', 'Combobox aria-controls points to "omnibar-dropdown"');
assert(initDom.dropdownDisplay === 'none', 'Initial dropdown is hidden (display: none)');
assert(initDom.fsmState === 'IDLE', 'Initial FSM state is IDLE');

// 3.4 Keyboard Shortcut: Ctrl+K
console.log('\n--- Testing Keyboard Shortcut: Ctrl+K ---');
await client.eval(`
  (() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 150));

const ctrlKRes = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    const combobox = document.getElementById('omnibar-combobox');
    const dropdown = document.getElementById('omnibar-dropdown');
    const quickBtns = document.querySelectorAll('.omnibar-quick-btn');
    const recentItems = document.querySelectorAll('.omnibar-recent-item');
    return {
      isFocused: document.activeElement === input,
      ariaExpanded: combobox.getAttribute('aria-expanded'),
      dropdownDisplay: window.getComputedStyle(dropdown).display,
      fsmState: window.omnibarInstance.fsm.state,
      quickBtnsCount: quickBtns.length,
      recentItemsCount: recentItems.length
    };
  })()
`);

assert(ctrlKRes.isFocused, 'Ctrl+K focuses the input');
assert(ctrlKRes.fsmState === 'FOCUSED_EMPTY', 'Ctrl+K transitions FSM to FOCUSED_EMPTY (Rule 1)');
assert(ctrlKRes.ariaExpanded === 'true', 'Combobox aria-expanded becomes "true"');
assert(ctrlKRes.dropdownDisplay === 'block', 'Dropdown displays block');
assert(ctrlKRes.quickBtnsCount >= 4, `FOCUSED_EMPTY renders quick action buttons (${ctrlKRes.quickBtnsCount})`);
assert(ctrlKRes.recentItemsCount >= 3, `FOCUSED_EMPTY renders recent activity items (${ctrlKRes.recentItemsCount})`);

// 3.5 Keyboard Shortcut: 2-Step Escape
console.log('\n--- Testing 2-Step Escape Interaction ---');

// Type a search query
await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.value = 'Spotify';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
// Wait for 150ms debounce
await new Promise(r => setTimeout(r, 250));

const postSearchState = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    return {
      val: input.value,
      fsmState: window.omnibarInstance.fsm.state,
      optionsCount: document.querySelectorAll('.omnibar-option').length
    };
  })()
`);
assert(postSearchState.val === 'Spotify', 'Input value is "Spotify"');
assert(postSearchState.fsmState === 'HYBRID_MATCHES' || postSearchState.fsmState === 'WIKI_MATCHES', `FSM resolved to match state: ${postSearchState.fsmState}`);
assert(postSearchState.optionsCount > 0, `Results rendered options (${postSearchState.optionsCount})`);

// Press 1st Escape (should clear query, return to FOCUSED_EMPTY, remain open)
await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 100));

const esc1State = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    const combobox = document.getElementById('omnibar-combobox');
    const dropdown = document.getElementById('omnibar-dropdown');
    return {
      val: input.value,
      fsmState: window.omnibarInstance.fsm.state,
      ariaExpanded: combobox.getAttribute('aria-expanded'),
      dropdownDisplay: window.getComputedStyle(dropdown).display,
      quickBtnsCount: document.querySelectorAll('.omnibar-quick-btn').length
    };
  })()
`);

assert(esc1State.val === '', '1st Esc clears input text');
assert(esc1State.fsmState === 'FOCUSED_EMPTY', '1st Esc transitions FSM to FOCUSED_EMPTY (Rule 20)');
assert(esc1State.ariaExpanded === 'true', '1st Esc keeps combobox open (aria-expanded="true")');
assert(esc1State.dropdownDisplay === 'block', '1st Esc keeps dropdown visible');
assert(esc1State.quickBtnsCount >= 4, '1st Esc restores quick action buttons');

// Press 2nd Escape (should close dropdown, return to IDLE, blur input)
await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 100));

const esc2State = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    const combobox = document.getElementById('omnibar-combobox');
    const dropdown = document.getElementById('omnibar-dropdown');
    return {
      fsmState: window.omnibarInstance.fsm.state,
      ariaExpanded: combobox.getAttribute('aria-expanded'),
      dropdownDisplay: window.getComputedStyle(dropdown).display,
      isFocused: document.activeElement === input
    };
  })()
`);

assert(esc2State.fsmState === 'IDLE', '2nd Esc transitions FSM to IDLE (Rule 21)');
assert(esc2State.ariaExpanded === 'false', '2nd Esc sets aria-expanded="false"');
assert(esc2State.dropdownDisplay === 'none', '2nd Esc closes dropdown (display: none)');
assert(!esc2State.isFocused, '2nd Esc blurs the input');

// 3.6 Keyboard Shortcut: '/' Forward Slash
console.log('\n--- Testing Keyboard Shortcut: / Forward Slash ---');
await client.eval(`
  (() => {
    document.getElementById('focus-sentinel').focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 100));

const slashState = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    return {
      isFocused: document.activeElement === input,
      fsmState: window.omnibarInstance.fsm.state
    };
  })()
`);

assert(slashState.isFocused, 'Forward slash "/" focuses the input');
assert(slashState.fsmState === 'FOCUSED_EMPTY', 'Forward slash "/" opens dropdown to FOCUSED_EMPTY');

// 3.7 Keyboard Arrow Navigation & Wrap Clamping
console.log('\n--- Testing Keyboard ArrowUp / ArrowDown Navigation & Clamping ---');

// Search for 'Apple' to get multiple items
await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.value = 'Apple';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 250));

const arrowNavResults = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    const items = document.querySelectorAll('.omnibar-option');
    const log = [];

    // Press ArrowDown 1 time
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const active1 = document.querySelector('.omnibar-option-active');
    log.push({
      step: 'down1',
      id: active1 ? active1.id : null,
      ariaSelected: active1 ? active1.getAttribute('aria-selected') : null,
      ariaDescendant: input.getAttribute('aria-activedescendant')
    });

    // Press ArrowDown 20 times (more than items count) to test clamping at bottom
    for (let i = 0; i < 20; i++) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    const activeBottom = document.querySelector('.omnibar-option-active');
    const lastItem = items[items.length - 1];
    log.push({
      step: 'downClamped',
      isLast: activeBottom === lastItem,
      lastId: lastItem.id,
      activeId: activeBottom ? activeBottom.id : null
    });

    // Press ArrowUp 1 time from bottom
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    const activeUp1 = document.querySelector('.omnibar-option-active');
    log.push({
      step: 'up1',
      isSecondLast: activeUp1 === items[items.length - 2]
    });

    // Press ArrowUp 20 times to test clamping at top (index 0)
    for (let i = 0; i < 20; i++) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    }
    const activeTop = document.querySelector('.omnibar-option-active');
    log.push({
      step: 'upClamped',
      isFirst: activeTop === items[0],
      firstId: items[0].id,
      activeId: activeTop ? activeTop.id : null
    });

    return log;
  })()
`);

assert(arrowNavResults[0].id === 'omnibar-opt-0', '1st ArrowDown highlights first option (omnibar-opt-0)');
assert(arrowNavResults[0].ariaSelected === 'true', 'Highlighted option has aria-selected="true"');
assert(arrowNavResults[0].ariaDescendant === 'omnibar-opt-0', 'input aria-activedescendant updated to omnibar-opt-0');
assert(arrowNavResults[1].isLast, 'ArrowDown clamps to bottom of list (no index overflow)');
assert(arrowNavResults[2].isSecondLast, 'ArrowUp moves backward through option list');
assert(arrowNavResults[3].isFirst, 'ArrowUp clamps to index 0 at top of list (no negative underflow)');

// 3.8 Zero-Match Fallback & XSS Resilience
console.log('\n--- Testing Zero-Match Fallback & XSS Injection Resilience ---');

const xssPayload = '<img src=x onerror=alert("XSS")>';
await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.value = ${JSON.stringify(xssPayload)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await new Promise(r => setTimeout(r, 250));

const noMatchData = await client.eval(`
  (() => {
    const pane = document.getElementById('omnibar-results-pane');
    const rawHtml = pane.innerHTML;
    const cards = document.querySelectorAll('.omnibar-suggestion-card');
    const actions = Array.from(cards).map(c => c.getAttribute('data-action'));
    const unescapedTags = pane.querySelectorAll('img[onerror]');

    return {
      fsmState: window.omnibarInstance.fsm.state,
      cardsCount: cards.length,
      actions,
      hasInjectedImgTag: unescapedTags.length > 0,
      containsEscapedLt: rawHtml.includes('&lt;img')
    };
  })()
`);

assert(noMatchData.fsmState === 'NO_MATCH_SUGGESTION', 'Zero-match query transitions FSM to NO_MATCH_SUGGESTION (Rule 10)');
assert(noMatchData.cardsCount === 4, `NO_MATCH_SUGGESTION renders exactly 4 recovery cards (${noMatchData.cardsCount})`);
assert(noMatchData.actions.includes('create_warranty'), 'Recovery card 1: create_warranty');
assert(noMatchData.actions.includes('add_subscription'), 'Recovery card 2: add_subscription');
assert(noMatchData.actions.includes('import_receipt'), 'Recovery card 3: import_receipt');
assert(noMatchData.actions.includes('search_wiki'), 'Recovery card 4: search_wiki');
assert(!noMatchData.hasInjectedImgTag, 'XSS security check: no unescaped <img> element in DOM');
assert(noMatchData.containsEscapedLt, 'XSS security check: HTML tags escaped (&lt;img)');

// 3.9 Command Mode Verbs Execution
console.log('\n--- Testing Command Mode & Verb Dispatches ---');

const verbTests = [
  { input: '>claim Sony WH-1000XM5', expectedVerb: '>claim', expectedArg: 'Sony WH-1000XM5' },
  { input: '>cancel Spotify', expectedVerb: '>cancel', expectedArg: 'Spotify' },
  { input: '>tax 2026', expectedVerb: '>tax', expectedArg: '2026' },
  { input: '>import Saturn', expectedVerb: '>import', expectedArg: 'Saturn' },
  { input: '>audit', expectedVerb: '>audit', expectedArg: '' },
  { input: '>export', expectedVerb: '>export', expectedArg: '' }
];

for (const vt of verbTests) {
  const cmdResult = await client.eval(`
    (() => {
      let dispatched = null;
      const handler = (e) => { dispatched = e.detail; };
      window.addEventListener('omnibar:execute-command', handler, { once: true });

      const input = document.getElementById('omnibar-input');
      input.value = ${JSON.stringify(vt.input)};
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Press Enter to execute command
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      window.removeEventListener('omnibar:execute-command', handler);
      return {
        dispatched,
        fsmState: window.omnibarInstance.fsm.state
      };
    })()
  `);

  assert(cmdResult.dispatched !== null, `Command "${vt.input}" dispatches "omnibar:execute-command"`);
  if (cmdResult.dispatched) {
    assert(cmdResult.dispatched.verb === vt.expectedVerb, `Dispatches verb "${vt.expectedVerb}"`);
    assert(cmdResult.dispatched.args === vt.expectedArg, `Dispatches parsed args "${vt.expectedArg}"`);
  }
  assert(cmdResult.fsmState === 'IDLE', `Command execution closes Omnibar and returns to IDLE (Rule 19)`);
}

// ============================================================================
// PART 4: EMPIRICAL INTEGRATION AUDIT: APPS/APP/INDEX.HTML BOOTSTRAP & EVENTS
// ============================================================================
console.log('\n--- PART 4: Empirical Integration Audit: apps/app/ Runtime & Architecture ---');

// 4.1 Test loading the real apps/app/index.html in Chrome
const appTab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: 'PUT' })).json();
const appClient = new CDPClient(appTab.webSocketDebuggerUrl);

await appClient.send('Page.enable');
await appClient.send('Runtime.enable');

const appConsoleErrors = [];
appClient.eventListeners.set('Runtime.consoleAPICalled', [
  (params) => {
    if (params.type === 'error') {
      const msg = params.args?.map(a => a.value || a.description).join(' ');
      appConsoleErrors.push(msg);
    }
  }
]);

await appClient.send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/` });
await new Promise(r => setTimeout(r, 1500));

const appAudit = await appClient.eval(`
  (() => {
    return {
      hasCmApp: !!window.cmApp,
      hasOmnibar: !!(window.cmApp && window.cmApp.omnibar),
      omnibarContainerExists: !!document.getElementById('omnibar-container')
    };
  })()
`);

if (appConsoleErrors.length > 0 || !appAudit.hasOmnibar) {
  for (const err of appConsoleErrors) {
    console.error(`  [FATAL BOOTSTRAP ERROR]: ${err}`);
  }
  recordFinding(
    'CRITICAL',
    'FINDING-M3-APP-BOOTSTRAP-CRASH',
    'Runtime bootstrap crash in apps/app/js/app.js prevents entire app & Omnibar from mounting',
    `During page load in Chromium, CMApp.init() crashes on line 48 with "TypeError: this.db.seedIfEmpty is not a function". Additionally, apps/app/js/app.js calls this.db.getItems() (line 98) and this.db.saveItem() (lines 203, 696), but VaultDB in vaultDb.js defines getAllItems() and addItem(), with no seedIfEmpty() method. As a result, line 57 (this.mountOmnibar()) is never reached, leaving the Omnibar unmounted in the production app shell.`,
    'Implement seedIfEmpty(), getItems() (alias to getAllItems()), and saveItem() (alias to addItem/updateItem) on VaultDB in apps/app/js/db/vaultDb.js.'
  );
}
assert(appConsoleErrors.length === 0, 'Production application loads in browser with zero console errors', `Found errors: ${appConsoleErrors.join(' | ')}`);
assert(appAudit.hasOmnibar, 'Production application successfully mounts Unified Omnibar instance (window.cmApp.omnibar)', 'Omnibar instance is null; never mounted');
assert(appAudit.omnibarContainerExists, 'Omnibar DOM elements mounted in production app shell (#omnibar-container)', '#omnibar-container missing from DOM');

// 4.2 Audit Event Propagation: window.dispatchEvent vs document.addEventListener
const eventPropagationAudit = await client.eval(`
  (() => {
    let windowHeard = false;
    let documentHeard = false;

    window.addEventListener('test:omnibar-event', () => { windowHeard = true; }, { once: true });
    document.addEventListener('test:omnibar-event', () => { documentHeard = true; }, { once: true });

    window.dispatchEvent(new CustomEvent('test:omnibar-event', { detail: { test: true }, bubbles: true }));

    return { windowHeard, documentHeard };
  })()
`);

if (!eventPropagationAudit.documentHeard) {
  recordFinding(
    'HIGH',
    'FINDING-M3-EVENT-TARGET-DISCONNECT',
    'Custom events dispatched by Omnibar on `window` are never heard by `document` listeners in app.js',
    'omnibar.js line 929 dispatches all custom events via window.dispatchEvent(new CustomEvent(eventName, ...)). However, apps/app/js/app.js binds all listeners on document (e.g. lines 223, 230, 236, 242, 247, 256: document.addEventListener("omnibar:..."). In W3C DOM Level 3 Events, events dispatched on window do not bubble downward to document. Thus, drawer opens, item creation, and verb workflows dispatched by the Omnibar never trigger the app orchestrator handlers.',
    'Align event target: either dispatch on document in omnibar.js (document.dispatchEvent) or attach listeners to window in app.js (window.addEventListener).'
  );
}
assert(eventPropagationAudit.documentHeard, 'Events dispatched via window.dispatchEvent bubble to document listeners', 'document.addEventListener did NOT receive event dispatched on window');

// 4.3 Audit Event Names & Payload Property Alignment
const appJsRaw = fs.readFileSync(path.join(APP_DIR, 'js', 'app.js'), 'utf8');

// Audit omnibar:audit-workflow vs omnibar:audit-vault
if (appJsRaw.includes("document.addEventListener('omnibar:audit-vault'") && !appJsRaw.includes("omnibar:audit-workflow")) {
  recordFinding(
    'MEDIUM',
    'FINDING-M3-EVENT-NAME-MISMATCH-AUDIT',
    'Event name mismatch for >audit verb: "omnibar:audit-workflow" vs "omnibar:audit-vault"',
    'omnibar.js line 912 dispatches "omnibar:audit-workflow", but app.js line 272 listens for "omnibar:audit-vault". The >audit command will never trigger the audit workflow in app.js.',
    'Update app.js line 272 to listen for "omnibar:audit-workflow".'
  );
}

// Audit quick action event: omnibar:quick-action vs omnibar:action
if (appJsRaw.includes("document.addEventListener('omnibar:action'") && !appJsRaw.includes("omnibar:quick-action")) {
  recordFinding(
    'MEDIUM',
    'FINDING-M3-EVENT-NAME-MISMATCH-ACTION',
    'Event name mismatch for Quick Actions: "omnibar:quick-action" vs "omnibar:action"',
    'omnibar.js line 833 dispatches "omnibar:quick-action" with { action: act }, while app.js line 280 listens for "omnibar:action" and expects e.detail.actionId. Clicking quick action chips in FOCUSED_EMPTY never triggers actions in app.js.',
    'Update app.js to listen for "omnibar:quick-action" and inspect e.detail.action.'
  );
}

// Audit create-item and add-subscription payload property
if (appJsRaw.includes("const query = (e.detail && e.detail.query) || '';")) {
  recordFinding(
    'MEDIUM',
    'FINDING-M3-PAYLOAD-PROP-MISMATCH',
    'Payload property mismatch for create suggestion: e.detail.name vs e.detail.query',
    'omnibar.js lines 844 and 847 dispatch { name: query, category: ... }, but app.js lines 231 and 237 look for e.detail.query. Consequently, query is undefined, and the Quick Capture modal opens with an empty name ("") instead of the query typed by the user.',
    'Update app.js lines 231 and 237 to read `const query = e.detail?.query || e.detail?.name || "";`.'
  );
}

// Audit >claim and >cancel payload property
if (appJsRaw.includes("const itemId = e.detail?.itemId || (e.detail?.item && e.detail.item.id);")) {
  recordFinding(
    'MEDIUM',
    'FINDING-M3-CLAIM-CANCEL-TARGET-MISMATCH',
    'Verb commands >claim and >cancel do not pass itemId; app.js fails to resolve target item',
    'omnibar.js lines 900 and 903 pass { target: args, basis: ... }, where args is a string (e.g. "Sony"). app.js lines 248 and 257 check e.detail?.itemId, which is always undefined, causing the app to show a warning toast and never initiate the claim or cancellation workflow.',
    'Update app.js claim/cancel handlers to search vaultItems for matching target name or ID.'
  );
}

// 4.4 Audit Active Descendant in Command Mode
const activeDescendantAudit = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.value = '>';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const activeItem = document.querySelector('.omnibar-option-active');
    const ariaActive = input.getAttribute('aria-activedescendant');
    return {
      hasActiveItemClass: !!activeItem,
      ariaActive
    };
  })()
`);

if (!activeDescendantAudit.hasActiveItemClass || !activeDescendantAudit.ariaActive) {
  recordFinding(
    'LOW',
    'FINDING-M3-COMMAND-MODE-ACTIVE-DESCENDANT',
    'Command mode initial active item lacks .omnibar-option-active class; aria-activedescendant is empty',
    'In omnibar.js line 723, renderCommandMode() sets this.activeIndex = 0 and calls this.updateActiveDescendant(). However, the HTML template sets aria-selected="true" on the first option but does not add the .omnibar-option-active class. Because updateActiveDescendant() looks for .omnibar-option-active, it fails to find an element and resets aria-activedescendant to "".',
    'In renderCommandMode, add class "omnibar-option-active" to the first option or call this.updateActiveItemVisuals(items).'
  );
}
assert(activeDescendantAudit.hasActiveItemClass, 'Command mode first item has .omnibar-option-active class');
assert(activeDescendantAudit.ariaActive === 'omnibar-opt-0', 'Command mode input has aria-activedescendant="omnibar-opt-0"');

// Clean up browser & server
try {
  browserProc.kill();
} catch (e) {}
server.close();

// ============================================================================
// SUMMARY & FINDINGS REPORT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('  EMPIRICAL CHALLENGER VERIFICATION SUMMARY — UNIFIED OMNIBAR (M3)');
console.log('='.repeat(80));
console.log(`Total Checks Executed : ${results.total}`);
console.log(`Passed Checks         : ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`Failed Checks         : ${results.failed}`);
console.log(`Findings Recorded     : ${results.findings.length}`);

for (const f of results.findings) {
  console.log(`\n[${f.severity}] ${f.id}: ${f.title}`);
  console.log(`  Description   : ${f.description}`);
  console.log(`  Recommendation: ${f.recommendation}`);
}

// Save json report
fs.writeFileSync(
  path.join(REPO_ROOT, 'tests', 'm3_omnibar_empirical_results.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);

console.log('\nResults written to tests/m3_omnibar_empirical_results.json');
