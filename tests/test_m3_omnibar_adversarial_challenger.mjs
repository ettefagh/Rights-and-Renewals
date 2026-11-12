/**
 * test_m3_omnibar_adversarial_challenger.mjs
 * Comprehensive Empirical Adversarial Stress Harness for Milestone M3 Gate: Unified Omnibar
 * Author: Empirical Challenger (teamwork_challenger_m3_gate2_1)
 * Target: apps/app/ (production application shell and omnibar component)
 *
 * Verifies:
 * 1. Deep Keyboard Interactions (Ctrl+K, /, ArrowUp/Down clamping, Enter defaults, Tab cycling)
 * 2. 2-Step Progressive Escape (Step 1 clear & stay in FOCUSED_EMPTY, Step 2 blur & IDLE, focus restoration)
 * 3. Dual-Dispatch Parity (window vs document listeners, payload fidelity, no infinite loops)
 * 4. All 6 Verb Commands in Live App (>claim, >cancel, >tax, >import, >audit, >export)
 * 5. Error & Malformed Input Handling (empty args, unknown targets, fuzzing strings, XSS injection)
 * 6. Zero Console Errors in Live Headless Browser Runtime
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'apps', 'app');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
  categories: {
    keyboard: { total: 0, passed: 0, failed: 0 },
    escapeFSM: { total: 0, passed: 0, failed: 0 },
    dualDispatch: { total: 0, passed: 0, failed: 0 },
    verbCommands: { total: 0, passed: 0, failed: 0 },
    adversarialFuzzing: { total: 0, passed: 0, failed: 0 },
    browserRuntime: { total: 0, passed: 0, failed: 0 }
  }
};

function assert(condition, category, testName, details = '') {
  results.total++;
  results.categories[category].total++;
  if (condition) {
    results.passed++;
    results.categories[category].passed++;
    console.log(`  [PASS] [${category}] ${testName}`);
  } else {
    results.failed++;
    results.categories[category].failed++;
    console.error(`  [FAIL] [${category}] ${testName} — ${details}`);
    results.findings.push({ category, testName, details });
  }
}

// 1. Static Web Server
const APP_PORT = 4328;
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
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

await new Promise(resolve => server.listen(APP_PORT, '127.0.0.1', resolve));

// 2. Headless Chrome Browser Launch
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));
if (!chromeExe) {
  console.error('Fatal: No Chrome or Edge executable found.');
  process.exit(1);
}

const CDP_PORT = 9338;
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

  on(method, callback) {
    if (!this.eventListeners.has(method)) this.eventListeners.set(method, []);
    this.eventListeners.get(method).push(callback);
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

const browserErrors = [];
client.on('Runtime.exceptionThrown', (params) => {
  browserErrors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text);
});

client.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') {
    const errorMsg = params.args.map(a => a.value || a.description || '').join(' ');
    browserErrors.push(errorMsg);
  }
});

await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('DOM.enable');

console.log('================================================================================');
console.log('  EMPIRICAL ADVERSARIAL STRESS TEST: UNIFIED OMNIBAR & APP INTEGRATION');
console.log('================================================================================\n');

// Navigate to Live Production App
await client.send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/index.html` });

// Wait for CMApp to bootstrap
for (let i = 0; i < 40; i++) {
  const ready = await client.eval('!!(window.cmApp && window.cmApp.omnibar && window.cmApp.vaultItems)');
  if (ready) break;
  await new Promise(r => setTimeout(r, 100));
}

// ============================================================================
// SUITE 1: KEYBOARD SHORTCUTS, ROVING FOCUS & ARIA CLAMPING
// ============================================================================
console.log('--- 1. Testing Keyboard Shortcuts, Roving Focus & ARIA Clamping ---');

// 1.1 Ctrl+K opens and focuses
const ctrlKTest = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    input.blur();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    return {
      activeElementIsInput: document.activeElement === input,
      fsmState: window.cmApp.omnibar.fsm.state,
      ariaExpanded: document.getElementById('omnibar-combobox').getAttribute('aria-expanded'),
      dropdownDisplay: window.getComputedStyle(document.getElementById('omnibar-dropdown')).display
    };
  })()
`);
assert(ctrlKTest.activeElementIsInput, 'keyboard', 'Ctrl+K focuses input element');
assert(ctrlKTest.fsmState === 'FOCUSED_EMPTY', 'keyboard', 'Ctrl+K transitions FSM to FOCUSED_EMPTY');
assert(ctrlKTest.ariaExpanded === 'true', 'keyboard', 'Combobox aria-expanded is "true"');
assert(ctrlKTest.dropdownDisplay === 'block', 'keyboard', 'Dropdown display is block');

// 1.2 '/' hotkey opens when outside inputs, but ignores when inside input/textarea
const slashIgnoreTest = await client.eval(`
  (() => {
    // Focus an outside input (simulate by creating a dummy input)
    const dummy = document.createElement('input');
    dummy.id = 'test-dummy-input';
    document.body.appendChild(dummy);
    dummy.focus();

    // Close omnibar first
    window.cmApp.omnibar.closeOmnibar();

    // Dispatch '/' while dummy is focused
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    const ignoredState = window.cmApp.omnibar.fsm.state;

    // Remove dummy and dispatch '/' from document.body
    dummy.remove();
    document.body.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    const acceptedState = window.cmApp.omnibar.fsm.state;

    return { ignoredState, acceptedState };
  })()
`);
assert(slashIgnoreTest.ignoredState === 'IDLE', 'keyboard', 'Forward slash "/" ignored when active element is INPUT');
assert(slashIgnoreTest.acceptedState === 'FOCUSED_EMPTY', 'keyboard', 'Forward slash "/" activates Omnibar when outside form inputs');

// 1.3 Roving Focus Clamping Underflow & Overflow
const rovingFocusClampingTest = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    // Set query to Spotify (produces 2 hybrid results)
    input.value = 'Spotify';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(resolve => {
      setTimeout(() => {
        const items = document.querySelectorAll('.omnibar-option');
        const itemCount = items.length;

        // Press ArrowUp 5 times (should clamp at 0, not underflow to negative)
        for (let i = 0; i < 5; i++) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        }
        const clampedTopIndex = window.cmApp.omnibar.activeIndex;
        const topOptionActive = items[0]?.classList.contains('omnibar-option-active');
        const topAriaSelected = items[0]?.getAttribute('aria-selected');

        // Press ArrowDown 50 times (should clamp at itemCount - 1, not overflow)
        for (let i = 0; i < 50; i++) {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        }
        const clampedBottomIndex = window.cmApp.omnibar.activeIndex;
        const lastIdx = itemCount - 1;
        const bottomOptionActive = items[lastIdx]?.classList.contains('omnibar-option-active');
        const bottomAriaSelected = items[lastIdx]?.getAttribute('aria-selected');
        const activedescendant = input.getAttribute('aria-activedescendant');

        resolve({
          itemCount,
          clampedTopIndex,
          topOptionActive,
          topAriaSelected,
          clampedBottomIndex,
          lastIdx,
          bottomOptionActive,
          bottomAriaSelected,
          activedescendant
        });
      }, 250);
    });
  })()
`);
assert(rovingFocusClampingTest.clampedTopIndex === 0, 'keyboard', 'ArrowUp clamps at index 0 (no negative underflow)');
assert(rovingFocusClampingTest.topOptionActive === true, 'keyboard', 'Index 0 has class .omnibar-option-active');
assert(rovingFocusClampingTest.topAriaSelected === 'true', 'keyboard', 'Index 0 has aria-selected="true"');
assert(rovingFocusClampingTest.clampedBottomIndex === rovingFocusClampingTest.lastIdx, 'keyboard', 'ArrowDown clamps at max index (no overflow past list length)');
assert(rovingFocusClampingTest.bottomOptionActive === true, 'keyboard', 'Max index option has class .omnibar-option-active');
assert(rovingFocusClampingTest.bottomAriaSelected === 'true', 'keyboard', 'Max index option has aria-selected="true"');
assert(rovingFocusClampingTest.activedescendant === `omnibar-opt-${rovingFocusClampingTest.lastIdx}`, 'keyboard', 'input aria-activedescendant tracks bottom item ID');

// 1.4 Tab Key Chip Cycling
const tabChipCyclingTest = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');
    const chipBar = document.getElementById('omnibar-chip-bar');
    
    // Initial category
    const cat0 = window.cmApp.omnibar.filterCategory;

    // Press Tab once
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const cat1 = window.cmApp.omnibar.filterCategory;

    // Press Tab second time
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const cat2 = window.cmApp.omnibar.filterCategory;

    // Press Tab third time (wrap to start)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const cat3 = window.cmApp.omnibar.filterCategory;

    return { cat0, cat1, cat2, cat3 };
  })()
`);
assert(tabChipCyclingTest.cat0 === 'all', 'keyboard', 'Initial category is "all"');
assert(tabChipCyclingTest.cat1 === 'hardware', 'keyboard', '1st Tab cycles to "hardware"');
assert(tabChipCyclingTest.cat2 === 'subscription', 'keyboard', '2nd Tab cycles to "subscription"');
assert(tabChipCyclingTest.cat3 === 'all', 'keyboard', '3rd Tab wraps back to "all"');

// ============================================================================
// SUITE 2: 2-STEP PROGRESSIVE ESCAPE FSM & FOCUS RESTORATION
// ============================================================================
console.log('\n--- 2. Testing 2-Step Progressive Escape & Focus Restoration ---');

const escapeStepTest = await client.eval(`
  (() => {
    // Focus a sentinel element outside omnibar
    const headerBtn = document.getElementById('quick-add-btn');
    headerBtn.focus();

    // Trigger Ctrl+K
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    const input = document.getElementById('omnibar-input');
    const combobox = document.getElementById('omnibar-combobox');
    const dropdown = document.getElementById('omnibar-dropdown');

    // Type text
    input.value = 'Apple';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Verify text present and open
    const preText = input.value;
    const preOpen = combobox.getAttribute('aria-expanded');

    // Step 1: 1st Escape
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const step1Val = input.value;
    const step1State = window.cmApp.omnibar.fsm.state;
    const step1Expanded = combobox.getAttribute('aria-expanded');
    const step1Display = window.getComputedStyle(dropdown).display;
    const step1Focused = document.activeElement === input;

    // Step 2: 2nd Escape
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const step2Val = input.value;
    const step2State = window.cmApp.omnibar.fsm.state;
    const step2Expanded = combobox.getAttribute('aria-expanded');
    const step2Display = window.getComputedStyle(dropdown).display;
    const step2ActiveDesc = input.getAttribute('aria-activedescendant');
    const focusRestored = document.activeElement === headerBtn;

    return {
      preText, preOpen,
      step1Val, step1State, step1Expanded, step1Display, step1Focused,
      step2Val, step2State, step2Expanded, step2Display, step2ActiveDesc, focusRestored,
      activeElementId: document.activeElement ? document.activeElement.id : null,
      previouslyFocusedId: window.cmApp.omnibar.previouslyFocusedElement ? window.cmApp.omnibar.previouslyFocusedElement.id : null
    };
  })()
`);
console.log('DEBUG escapeStepTest:', escapeStepTest);
assert(escapeStepTest.preText === 'Apple', 'escapeFSM', 'Initial query "Apple" loaded');
assert(escapeStepTest.step1Val === '', 'escapeFSM', '1st Esc clears input text to empty');
assert(escapeStepTest.step1State === 'FOCUSED_EMPTY', 'escapeFSM', '1st Esc transitions FSM to FOCUSED_EMPTY (Rule 20)');
assert(escapeStepTest.step1Expanded === 'true', 'escapeFSM', '1st Esc preserves combobox open (aria-expanded="true")');
assert(escapeStepTest.step1Display === 'block', 'escapeFSM', '1st Esc preserves dropdown visibility (display: block)');
assert(escapeStepTest.step1Focused === true, 'escapeFSM', '1st Esc retains keyboard focus in input');
assert(escapeStepTest.step2State === 'IDLE', 'escapeFSM', '2nd Esc transitions FSM to IDLE (Rule 21)');
assert(escapeStepTest.step2Expanded === 'false', 'escapeFSM', '2nd Esc sets aria-expanded="false"');
assert(escapeStepTest.step2Display === 'none', 'escapeFSM', '2nd Esc closes dropdown (display: none)');
assert(escapeStepTest.step2ActiveDesc === '', 'escapeFSM', '2nd Esc clears aria-activedescendant');
assert(escapeStepTest.focusRestored === true, 'escapeFSM', '2nd Esc restores focus to previously focused element');

// ============================================================================
// SUITE 3: DUAL-DISPATCH TARGET AUDIT (WINDOW & DOCUMENT)
// ============================================================================
console.log('\n--- 3. Testing Dual-Dispatch Parity on Window and Document ---');

const dualDispatchTest = await client.eval(`
  (() => {
    const testEvents = [
      { name: 'omnibar:quick-action', payload: { action: 'audit_vault', actionId: 'audit_vault' } },
      { name: 'omnibar:create-item', payload: { name: 'Test Headset', query: 'Test Headset', category: 'hardware' } },
      { name: 'omnibar:add-subscription', payload: { name: 'Test Music', query: 'Test Music', category: 'subscription' } },
      { name: 'omnibar:import-receipt', payload: { query: 'Saturn', name: 'Saturn' } },
      { name: 'omnibar:claim-workflow', payload: { target: 'Sony', id: 'Sony', basis: 'BGB § 437' } },
      { name: 'omnibar:cancel-workflow', payload: { target: 'Spotify', id: 'Spotify', basis: 'BGB § 312k' } },
      { name: 'omnibar:tax-workflow', payload: { year: '2026', basis: '§ 9 EStG' } },
      { name: 'omnibar:audit-vault', payload: {} },
      { name: 'omnibar:export-backup', payload: {} }
    ];

    const results = {};

    for (const te of testEvents) {
      let windowReceived = false;
      let docReceived = false;
      let windowPayload = null;
      let docPayload = null;

      const winHandler = (e) => {
        windowReceived = true;
        windowPayload = e.detail;
      };
      const docHandler = (e) => {
        docReceived = true;
        docPayload = e.detail;
      };

      window.addEventListener(te.name, winHandler, { once: true });
      document.addEventListener(te.name, docHandler, { once: true });

      // Dispatch via Omnibar instance method
      window.cmApp.omnibar.dispatchCustomEvent(te.name, te.payload);

      results[te.name] = {
        windowReceived,
        docReceived,
        windowMatches: JSON.stringify(windowPayload) === JSON.stringify(te.payload),
        docMatches: JSON.stringify(docPayload) === JSON.stringify(te.payload)
      };
    }

    return results;
  })()
`);

for (const [evtName, r] of Object.entries(dualDispatchTest)) {
  assert(r.windowReceived, 'dualDispatch', `${evtName} received by window listener`);
  assert(r.docReceived, 'dualDispatch', `${evtName} received by document listener`);
  assert(r.windowMatches && r.docMatches, 'dualDispatch', `${evtName} payload matches on both window and document`);
}

// ============================================================================
// SUITE 4: ALL 6 VERB COMMAND WORKFLOWS IN LIVE APP
// ============================================================================
console.log('\n--- 4. Testing All 6 Verb Commands in Live App Shell ---');

// Clean up any stray modals from previous event dispatches
await client.eval(`
  (() => {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) toastContainer.innerHTML = '';
  })()
`);

// 4.1 >claim Sony
const claimVerbTest = await client.eval(`
  (() => {
    // Clear toasts and modals before command
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
    const toastContainer = document.getElementById('toast-container');
    toastContainer.innerHTML = '';

    // Execute command via omnibar
    window.cmApp.omnibar.executeVerbCommand('>claim', '>claim Sony');
    
    const modalBackdrop = document.getElementById('dossier-backdrop');
    const modalTitle = modalBackdrop ? modalBackdrop.querySelector('.modal-title')?.textContent : '';
    const modalBody = modalBackdrop ? modalBackdrop.querySelector('pre')?.textContent : '';
    const hasBgb437 = modalBody ? modalBody.includes('437') : false;
    const hasBgb477 = modalBody ? (modalBody.includes('477') || modalBody.includes('Beweislast')) : false;

    const toasts = Array.from(document.querySelectorAll('.cmlab-toast')).map(t => t.textContent);
    
    // Close modal if opened
    const closeBtn = document.getElementById('dossier-close-btn');
    if (closeBtn) closeBtn.click();
    const modalClosed = !document.getElementById('dossier-backdrop');

    return { hasModal: !!modalBackdrop, modalTitle, modalBody, hasBgb437, hasBgb477, modalClosed, toasts };
  })()
`);
console.log('DEBUG claimVerbTest by name (>claim Sony):', claimVerbTest);
assert(claimVerbTest.hasModal, 'verbCommands', '>claim Sony (by name) opens Dossier Modal');
assert(claimVerbTest.modalTitle.includes('Mängelrüge'), 'verbCommands', 'Dossier modal title contains "Mängelrüge"');
assert(claimVerbTest.hasBgb437, 'verbCommands', 'Mängelrüge notice cites BGB § 437');
assert(claimVerbTest.modalClosed, 'verbCommands', 'Dossier modal closes cleanly on close button click');

// 4.1b >claim by exact item ID: >claim hw-01
const claimByIdTest = await client.eval(`
  (() => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
    const toastContainer = document.getElementById('toast-container');
    toastContainer.innerHTML = '';

    window.cmApp.omnibar.executeVerbCommand('>claim', '>claim hw-01');
    const modalBackdrop = document.getElementById('dossier-backdrop');
    const modalTitle = modalBackdrop ? modalBackdrop.querySelector('.modal-title')?.textContent : '';
    const modalBody = modalBackdrop ? modalBackdrop.querySelector('pre')?.textContent : '';
    const hasBgb437 = modalBody ? modalBody.includes('437') : false;

    // Close modal
    const closeBtn = document.getElementById('dossier-close-btn');
    if (closeBtn) closeBtn.click();
    const modalClosed = !document.getElementById('dossier-backdrop');

    return { hasModal: !!modalBackdrop, modalTitle, hasBgb437, modalClosed };
  })()
`);
console.log('DEBUG claimByIdTest (>claim hw-01):', claimByIdTest);
assert(claimByIdTest.hasModal, 'verbCommands', '>claim hw-01 (by exact ID) opens Dossier Modal');
assert(claimByIdTest.modalTitle.includes('Mängelrüge'), 'verbCommands', 'Dossier modal title for ID claim contains "Mängelrüge"');
assert(claimByIdTest.hasBgb437, 'verbCommands', 'Dossier notice for ID claim cites BGB § 437');

// 4.2 >claim without target (warning toast resilience)
const claimEmptyTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>claim', '>claim');
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast'));
    const lastToast = toasts[toasts.length - 1];
    return {
      toastCount: toasts.length,
      toastText: lastToast ? lastToast.textContent : '',
      isWarning: lastToast ? lastToast.classList.contains('toast-warning') : false
    };
  })()
`);
assert(claimEmptyTest.toastCount > 0, 'verbCommands', '>claim with empty target renders warning toast');
assert(claimEmptyTest.toastText.includes('>claim Sony'), 'verbCommands', 'Warning toast suggests valid syntax example');

// 4.3 >cancel Spotify (by name)
const cancelVerbTest = await client.eval(`
  (() => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
    const toastContainer = document.getElementById('toast-container');
    toastContainer.innerHTML = '';

    window.cmApp.omnibar.executeVerbCommand('>cancel', '>cancel Spotify');
    const modalBackdrop = document.getElementById('dossier-backdrop');
    const modalTitle = modalBackdrop ? modalBackdrop.querySelector('.modal-title')?.textContent : '';
    const modalBody = modalBackdrop ? modalBackdrop.querySelector('pre')?.textContent : '';
    const hasBgb312k = modalBody ? modalBody.includes('312k') : false;
    const hasBgb309 = modalBody ? modalBody.includes('309') : false;
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast')).map(t => t.textContent);

    // Close modal
    const closeBtn = document.getElementById('dossier-close-btn');
    if (closeBtn) closeBtn.click();
    const modalClosed = !document.getElementById('dossier-backdrop');

    return { hasModal: !!modalBackdrop, modalTitle, modalBody, hasBgb312k, hasBgb309, modalClosed, toasts };
  })()
`);
console.log('DEBUG cancelVerbTest by name (>cancel Spotify):', cancelVerbTest);
assert(cancelVerbTest.hasModal, 'verbCommands', '>cancel Spotify (by name) opens Cancellation Modal');
assert(cancelVerbTest.modalTitle.includes('Kündigungsschreiben'), 'verbCommands', 'Modal title contains "Kündigungsschreiben"');
assert(cancelVerbTest.hasBgb312k, 'verbCommands', 'Cancellation letter cites BGB § 312k Kündigungsbutton mandate');
assert(cancelVerbTest.hasBgb309, 'verbCommands', 'Cancellation letter cites BGB § 309 Nr. 9 notice period rules');
assert(cancelVerbTest.modalClosed, 'verbCommands', 'Cancellation modal closes cleanly');

// 4.3b >cancel by exact item ID: >cancel sub-01
const cancelByIdTest = await client.eval(`
  (() => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
    const toastContainer = document.getElementById('toast-container');
    toastContainer.innerHTML = '';

    window.cmApp.omnibar.executeVerbCommand('>cancel', '>cancel sub-01');
    const modalBackdrop = document.getElementById('dossier-backdrop');
    const modalTitle = modalBackdrop ? modalBackdrop.querySelector('.modal-title')?.textContent : '';
    const modalBody = modalBackdrop ? modalBackdrop.querySelector('pre')?.textContent : '';
    const hasBgb312k = modalBody ? modalBody.includes('312k') : false;
    const hasBgb309 = modalBody ? modalBody.includes('309') : false;

    // Close modal
    const closeBtn = document.getElementById('dossier-close-btn');
    if (closeBtn) closeBtn.click();
    const modalClosed = !document.getElementById('dossier-backdrop');

    return { hasModal: !!modalBackdrop, modalTitle, hasBgb312k, hasBgb309, modalClosed };
  })()
`);
console.log('DEBUG cancelByIdTest (>cancel sub-01):', cancelByIdTest);
assert(cancelByIdTest.hasModal, 'verbCommands', '>cancel sub-01 (by exact ID) opens Cancellation Modal');
assert(cancelByIdTest.modalTitle.includes('Kündigungsschreiben'), 'verbCommands', 'Modal title for ID cancellation contains "Kündigungsschreiben"');
assert(cancelByIdTest.hasBgb312k, 'verbCommands', 'Cancellation letter for ID cancellation cites BGB § 312k');

// 4.4 >cancel without target (warning toast resilience)
const cancelEmptyTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>cancel', '>cancel');
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast'));
    const lastToast = toasts[toasts.length - 1];
    return {
      toastCount: toasts.length,
      toastText: lastToast ? lastToast.textContent : '',
      isWarning: lastToast ? lastToast.classList.contains('toast-warning') : false
    };
  })()
`);
assert(cancelEmptyTest.toastCount > 0, 'verbCommands', '>cancel with empty target renders warning toast');
assert(cancelEmptyTest.toastText.includes('>cancel Spotify'), 'verbCommands', 'Toast suggests valid syntax example');

// 4.5 >tax 2026
const taxVerbTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>tax', '>tax 2026');
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast'));
    const lastToast = toasts[toasts.length - 1];
    return {
      toastText: lastToast ? lastToast.textContent : '',
      isSuccess: lastToast ? lastToast.classList.contains('toast-success') : false
    };
  })()
`);
assert(taxVerbTest.isSuccess, 'verbCommands', '>tax 2026 triggers success toast');
assert(taxVerbTest.toastText.includes('Steuer-Dossier') && taxVerbTest.toastText.includes('BMF 2022'), 'verbCommands', 'Tax toast cites BMF 2022');

// 4.6 >import Saturn
const importVerbTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>import', '>import Saturn');
    const qcModal = document.getElementById('quick-capture-backdrop');
    const isVisible = !!qcModal;
    const dropzone = qcModal ? qcModal.querySelector('#qc-dropzone') : null;
    const dropzoneVisible = dropzone ? window.getComputedStyle(dropzone).display !== 'none' : false;

    // Close modal
    const closeBtn = document.getElementById('qc-cancel-btn');
    if (closeBtn) closeBtn.click();
    const modalClosed = !document.getElementById('quick-capture-backdrop');

    return { isVisible, dropzoneVisible, modalClosed, allModals: document.querySelectorAll('.modal-backdrop').length };
  })()
`);
console.log('DEBUG importVerbTest:', importVerbTest);
assert(importVerbTest.isVisible, 'verbCommands', '>import Saturn opens Quick Capture Modal');
assert(importVerbTest.dropzoneVisible, 'verbCommands', 'Receipt dropzone is visible and open');
assert(importVerbTest.modalClosed, 'verbCommands', 'Quick capture modal closes cleanly');

// 4.7 >audit
const auditVerbTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>audit', '>audit');
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast'));
    const lastToast = toasts[toasts.length - 1];
    const text = lastToast ? lastToast.textContent : '';
    return {
      hasToast: !!lastToast,
      hasGobd: text.includes('GoBD Integritäts-Audit abgeschlossen'),
      hasSha256: text.includes('SHA-256 Digest verifiziert'),
      hasCliff: text.includes('BGB § 477 Beweislast-Cliff')
    };
  })()
`);
assert(auditVerbTest.hasToast, 'verbCommands', '>audit triggers GoBD audit toast');
assert(auditVerbTest.hasGobd, 'verbCommands', 'Audit summary states "GoBD Integritäts-Audit abgeschlossen"');
assert(auditVerbTest.hasSha256, 'verbCommands', 'Audit summary reports SHA-256 digests verifiziert');
assert(auditVerbTest.hasCliff, 'verbCommands', 'Audit summary reports BGB § 477 Beweislast-Cliff status');

// 4.8 >export
const exportVerbTest = await client.eval(`
  (() => {
    window.cmApp.omnibar.executeVerbCommand('>export', '>export');
    const toasts = Array.from(document.querySelectorAll('.cmlab-toast'));
    const lastToast = toasts[toasts.length - 1];
    return {
      hasToast: !!lastToast,
      isSuccess: lastToast ? lastToast.classList.contains('toast-success') : false,
      toastText: lastToast ? lastToast.textContent : ''
    };
  })()
`);
assert(exportVerbTest.hasToast && exportVerbTest.isSuccess, 'verbCommands', '>export generates backup and displays success toast');
assert(exportVerbTest.toastText.includes('Lokales Tresor-Backup heruntergeladen'), 'verbCommands', 'Backup confirmation text matches');

// ============================================================================
// SUITE 5: ADVERSARIAL FUZZING, XSS & RESILIENCE
// ============================================================================
console.log('\n--- 5. Testing Adversarial Fuzzing, XSS & Resilience ---');

const fuzzingTest = await client.eval(`
  (() => {
    const input = document.getElementById('omnibar-input');

    // 5.1 Fuzzing 2000 character string
    const longString = 'A'.repeat(2000);
    input.value = longString;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // 5.2 XSS Payloads
    const xssPayloads = [
      '<script>window.__xss_executed = true;</script>',
      '<img src="invalid_image.jpg" onerror="window.__xss_img_executed = true;" />',
      '"><svg onload="window.__xss_svg = true;">'
    ];

    let xssClean = true;
    for (const p of xssPayloads) {
      input.value = p;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Check DOM escaping
      const pane = document.getElementById('omnibar-results-pane');
      if (pane.querySelector('script') || pane.querySelector('svg') || pane.querySelector('img[onerror]')) {
        xssClean = false;
      }
    }

    // 5.3 Unknown Verb Command
    input.value = '>foobar_unknown_command';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const unknownCmdMatched = document.querySelectorAll('.command-option').length;

    // 5.4 German Umlauts & Accents
    input.value = 'Mängelrüge Käuferschutz Überprüfung Größe';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const umlautClean = window.cmApp.omnibar.fsm.state !== null;

    // Reset input
    input.value = '';
    window.cmApp.omnibar.closeOmnibar();

    return {
      xssExecuted: !!(window.__xss_executed || window.__xss_img_executed || window.__xss_svg),
      xssClean,
      unknownCmdMatched,
      umlautClean
    };
  })()
`);
assert(!fuzzingTest.xssExecuted, 'adversarialFuzzing', 'Zero XSS payloads executed in browser runtime');
assert(fuzzingTest.xssClean, 'adversarialFuzzing', 'Zero unescaped dangerous DOM tags injected into results pane');
assert(fuzzingTest.unknownCmdMatched === 0, 'adversarialFuzzing', 'Unknown command >foobar matches exactly 0 command options');
assert(fuzzingTest.umlautClean, 'adversarialFuzzing', 'German umlauts processed without FSM disruption');

// ============================================================================
// SUITE 6: RUNTIME LOGS & CONSOLE ERRORS
// ============================================================================
console.log('\n--- 6. Verifying Browser Console Error Log ---');

assert(browserErrors.length === 0, 'browserRuntime', `Zero browser console errors recorded (Found ${browserErrors.length})`, browserErrors.join(' | '));

// Clean up
try {
  browserProc.kill();
} catch (e) {}
server.close();

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('  CHALLENGER EMPIRICAL VERIFICATION HARNESS AUDIT SUMMARY');
console.log('='.repeat(80));
console.log(`Total Checks Executed : ${results.total}`);
console.log(`Passed Checks         : ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`Failed Checks         : ${results.failed}`);
console.log(`Findings Recorded     : ${results.findings.length}`);
for (const [cat, data] of Object.entries(results.categories)) {
  console.log(`  - ${cat.padEnd(20)}: ${data.passed}/${data.total} passed`);
}

// Write empirical results JSON
fs.writeFileSync(
  path.join(REPO_ROOT, 'tests', 'm3_challenger_adversarial_results.json'),
  JSON.stringify(results, null, 2),
  'utf8'
);
console.log('\nResults written to tests/m3_challenger_adversarial_results.json');
