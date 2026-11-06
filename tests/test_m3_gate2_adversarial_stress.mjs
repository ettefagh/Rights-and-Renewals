/**
 * test_m3_gate2_adversarial_stress.mjs
 * Comprehensive Empirical Adversarial Stress Harness for Milestone M3 Gate 2 (apps/app/)
 * Author: Empirical Challenger (teamwork_challenger_m3_gate2_2)
 *
 * Exhaustively stress-tests:
 * 1. UrgentAttentionBanner edge cases, boundary conditions, and HTML escaping
 * 2. SpendSubscriptionRadar expired subscription exclusion & tax calculations
 * 3. MasterVaultLedger filtering, geometric status glyphs, and GoBD hashes
 * 4. ContextualItemDrawer, BGBTimelineService leap years / month-end capping, and GoBD crypto
 * 5. Headless Chromium CDP live app bootstrap, layout geometry (0px overflow at 320/375/414/768/1024px),
 *    and live user interaction simulation (drawer opening, ledger filtering, omnibar search)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { UrgentAttentionBanner, SpendSubscriptionRadar, MasterVaultLedger } from '../apps/app/js/components/widgets.js';
import { BGBTimelineService } from '../apps/app/js/services/bgbTimeline.js';
import { GoBDCryptoService } from '../apps/app/js/services/gobdCrypto.js';
import { INITIAL_VAULT_ITEMS } from '../apps/app/js/data/sampleItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'apps', 'app');

const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function check(section, condition, description, detail = '') {
  testStats.total++;
  if (condition) {
    testStats.passed++;
    console.log(`  ✓ [${section}] ${description}`);
  } else {
    testStats.failed++;
    const err = `[${section}] FAIL: ${description} ${detail ? '(' + detail + ')' : ''}`;
    testStats.failures.push(err);
    console.error(`  ✗ ${err}`);
  }
}

function mockElement() {
  const listeners = new Map();
  return {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (ev, fn) => {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    }
  };
}

console.log('='.repeat(80));
console.log('  MILESTONE M3 GATE 2: ADVERSARIAL STRESS & EMPIRICAL VERIFICATION');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: UrgentAttentionBanner ADVERSARIAL STRESS
// ============================================================================
console.log('\n--- SUITE 1: UrgentAttentionBanner Adversarial Stress & Boundaries ---');
{
  const container = mockElement();
  const banner = new UrgentAttentionBanner(container);

  // 1.1 Empty vault
  banner.update([]);
  check('UrgentBanner', container.innerHTML.includes('banner-safe'), 'Empty vault renders banner-safe');
  check('UrgentBanner', container.innerHTML.includes('🛡️'), 'Empty vault renders shield glyph');
  const alertsEmpty = banner.computeAlerts();
  check('UrgentBanner', alertsEmpty.urgentSubs.length === 0 && alertsEmpty.cliffWarnings.length === 0, 'Empty vault has 0 alerts');
  check('UrgentBanner', alertsEmpty.totalSpend === 0, 'Empty vault has 0 total spend');

  // 1.2 Boundary: subscription at 30 days vs 31 days
  banner.update([{ id: 's30', category: 'subscription', priceEur: 14.99, daysRemaining: 30 }]);
  const a30 = banner.computeAlerts();
  check('UrgentBanner', a30.urgentSubs.length === 1, 'Subscription at exactly 30 days is included');
  check('UrgentBanner', Math.abs(a30.totalSpend - 14.99) < 0.001, 'Subscription at 30 days spend counted');

  banner.update([{ id: 's31', category: 'subscription', priceEur: 14.99, daysRemaining: 31 }]);
  const a31 = banner.computeAlerts();
  check('UrgentBanner', a31.urgentSubs.length === 0, 'Subscription at 31 days is excluded');
  check('UrgentBanner', a31.totalSpend === 0, 'Subscription at 31 days spend is 0');

  // 1.3 Boundary: 7 days (critical red 🛑) vs 8 days (warning amber ⚠️)
  banner.update([{ id: 's7', category: 'subscription', priceEur: 9.99, daysRemaining: 7 }]);
  check('UrgentBanner', container.innerHTML.includes('banner-critical'), 'Subscription at 7 days gets banner-critical class');
  check('UrgentBanner', container.innerHTML.includes('🛑'), 'Subscription at 7 days renders critical glyph 🛑');
  check('UrgentBanner', container.innerHTML.includes('Fristablauf ≤ 7 Tage'), 'Subscription at 7 days displays label ≤ 7 Tage');

  banner.update([{ id: 's8', category: 'subscription', priceEur: 9.99, daysRemaining: 8 }]);
  check('UrgentBanner', container.innerHTML.includes('banner-warning'), 'Subscription at 8 days gets banner-warning class');
  check('UrgentBanner', container.innerHTML.includes('⚠️'), 'Subscription at 8 days renders warning glyph ⚠️');
  check('UrgentBanner', container.innerHTML.includes('Fristablauf ≤ 30 Tage'), 'Subscription at 8 days displays label ≤ 30 Tage');

  // 1.4 Boundary: Past due (daysRemaining <= 0)
  banner.update([{ id: 's0', category: 'subscription', priceEur: 5.0, daysRemaining: 0 }]);
  check('UrgentBanner', container.innerHTML.includes('banner-critical'), 'Subscription with daysRemaining=0 is critical');

  banner.update([{ id: 'sneg', category: 'subscription', priceEur: 5.0, daysRemaining: -3 }]);
  check('UrgentBanner', container.innerHTML.includes('banner-critical'), 'Subscription with daysRemaining < 0 is critical');

  // 1.5 Hardware cliff boundary: 45 days vs 46 days & burden of proof check
  banner.update([{ id: 'h45', category: 'hardware', priceEur: 899, daysToCliff: 45, isWithinReversedBurdenOfProof: true }]);
  const ah45 = banner.computeAlerts();
  check('UrgentBanner', ah45.cliffWarnings.length === 1, 'Hardware at 45 daysToCliff with active burden is included');

  banner.update([{ id: 'h46', category: 'hardware', priceEur: 899, daysToCliff: 46, isWithinReversedBurdenOfProof: true }]);
  const ah46 = banner.computeAlerts();
  check('UrgentBanner', ah46.cliffWarnings.length === 0, 'Hardware at 46 daysToCliff is excluded');

  banner.update([{ id: 'hFalse', category: 'hardware', priceEur: 899, daysToCliff: 10, isWithinReversedBurdenOfProof: false }]);
  const ahFalse = banner.computeAlerts();
  check('UrgentBanner', ahFalse.cliffWarnings.length === 0, 'Hardware with isWithinReversedBurdenOfProof=false is excluded');

  // 1.6 HTML Escaping & XSS Resistance
  banner.update([{ id: 'xss', category: 'subscription', name: '<script>alert("xss")</script>', priceEur: 10, daysRemaining: 5 }]);
  check('UrgentBanner', !container.innerHTML.includes('<script>'), 'Item name is escaped, no raw <script> tag');
  check('UrgentBanner', container.innerHTML.includes('&lt;script&gt;'), 'Item name contains properly escaped &lt;script&gt;');

  // 1.7 Action Button citing § 312k
  check('UrgentBanner', container.innerHTML.includes('btn-urgent-cancel'), 'Renders .btn-urgent-cancel action button');
  check('UrgentBanner', container.innerHTML.includes('§ 312k'), 'Action button specifically cites statutory § 312k');
}

// ============================================================================
// SUITE 2: SpendSubscriptionRadar EXPIRED EXCLUSION & FINANCIAL AUDITING
// ============================================================================
console.log('\n--- SUITE 2: SpendSubscriptionRadar Expired Exclusion & Calculations ---');
{
  const container = mockElement();
  const radar = new SpendSubscriptionRadar(container);

  // 2.1 Adversarial test: Expired subscriptions must NEVER be counted in cancellable savings
  const adversarialDataset = [
    // Active subscription nearing renewal (must be counted)
    { id: 'sub-active', category: 'subscription', priceEur: 12.99, status: 'urgent', daysRemaining: 14, isTaxDeductible: false },
    // Expired subscription (must NOT be counted even with daysRemaining <= 30)
    { id: 'sub-expired-1', category: 'subscription', priceEur: 9.99, status: 'expired', daysRemaining: 0, isTaxDeductible: false },
    { id: 'sub-expired-2', category: 'subscription', priceEur: 29.99, status: 'expired', daysRemaining: 5, isTaxDeductible: false },
    // Safe active subscription (renewal in 180d, not cancellable now)
    { id: 'sub-safe', category: 'subscription', priceEur: 7.99, status: 'protected', daysRemaining: 180, isTaxDeductible: true },
    // Active hardware
    { id: 'hw-active', category: 'hardware', priceEur: 1200.0, status: 'protected', isTaxDeductible: true },
    // Expired hardware
    { id: 'hw-expired', category: 'hardware', priceEur: 600.0, status: 'expired', isTaxDeductible: true }
  ];

  radar.update(adversarialDataset);
  const kpis = radar.calculateKpis();

  // Monthly run rate: only active subscriptions (12.99 + 7.99 = 20.98)
  check('SpendRadar', Math.abs(kpis.monthlyRunRate - 20.98) < 0.001, 'Monthly run-rate excludes expired subscriptions (20.98 €)',
    `Observed: ${kpis.monthlyRunRate}`);

  // Annual run rate: 20.98 * 12 = 251.76
  check('SpendRadar', Math.abs(kpis.annualRunRate - 251.76) < 0.001, 'Annual run-rate is monthly * 12 (251.76 €)',
    `Observed: ${kpis.annualRunRate}`);

  // Cancellable count: exactly 1 (only sub-active; sub-expired-1 and sub-expired-2 MUST BE EXCLUDED)
  check('SpendRadar', kpis.cancellableCount === 1, 'Cancellable subscriptions count excludes expired subscriptions (count = 1)',
    `Observed: ${kpis.cancellableCount}`);

  // Potential monthly savings: exactly 12.99 €
  check('SpendRadar', Math.abs(kpis.potentialMonthlySavings - 12.99) < 0.001, 'Potential monthly savings excludes expired (12.99 €)',
    `Observed: ${kpis.potentialMonthlySavings}`);

  // Total protected hardware capital: only active hardware (1200.0; hw-expired excluded)
  check('SpendRadar', Math.abs(kpis.totalProtectedCapital - 1200.0) < 0.001, 'Protected capital excludes expired hardware (1200.00 €)',
    `Observed: ${kpis.totalProtectedCapital}`);

  // Tax deductible total: all items with isTaxDeductible (sub-safe 7.99 + hw-active 1200.0 + hw-expired 600.0 = 1807.99)
  check('SpendRadar', Math.abs(kpis.taxDeductibleTotal - 1807.99) < 0.001, 'Tax deductible total sums isTaxDeductible items (1807.99 €)',
    `Observed: ${kpis.taxDeductibleTotal}`);

  // 2.2 Footnotes and export buttons in UI
  check('SpendRadar', container.innerHTML.includes('btn-export-tax'), 'Radar renders tax export button');
  check('SpendRadar', container.innerHTML.includes('§ 9 EStG'), 'Radar mentions § 9 EStG');
  check('SpendRadar', container.innerHTML.includes('BMF 2022 Sofortabschreibung'), 'Radar cites BMF 2022 Sofortabschreibung');
}

// ============================================================================
// SUITE 3: MasterVaultLedger FILTERING, SEARCH, GLYPHS & GOBD PROOFS
// ============================================================================
console.log('\n--- SUITE 3: MasterVaultLedger Filters, Search & Non-Color Cues ---');
{
  const container = mockElement();
  const ledger = new MasterVaultLedger(container);
  ledger.update(INITIAL_VAULT_ITEMS);

  // 3.1 Category filters
  ledger.setCategoryFilter('all');
  check('VaultLedger', ledger.getFilteredItems().length === 20, 'Filter "all" returns 20 items');

  ledger.setCategoryFilter('hardware');
  const hw = ledger.getFilteredItems();
  check('VaultLedger', hw.length === 10 && hw.every(i => i.category === 'hardware'), 'Filter "hardware" returns 10 hardware items');

  ledger.setCategoryFilter('subscription');
  const subs = ledger.getFilteredItems();
  check('VaultLedger', subs.length === 10 && subs.every(i => i.category === 'subscription'), 'Filter "subscription" returns 10 subscription items');

  ledger.setCategoryFilter('tax');
  const tax = ledger.getFilteredItems();
  check('VaultLedger', tax.length === 10 && tax.every(i => i.isTaxDeductible), 'Filter "tax" returns 10 tax-deductible items');

  ledger.setCategoryFilter('urgent');
  const urgent = ledger.getFilteredItems();
  check('VaultLedger', urgent.length > 0 && urgent.every(i => {
    const d = i.daysRemaining !== undefined ? i.daysRemaining : 999;
    const c = i.daysToCliff !== undefined ? i.daysToCliff : 999;
    return d <= 30 || (i.isWithinReversedBurdenOfProof && c <= 45);
  }), 'Filter "urgent" returns only items meeting urgency criteria');

  // 3.2 Search queries
  ledger.setCategoryFilter('all');
  ledger.searchQuery = 'apple';
  const appleSearch = ledger.getFilteredItems();
  check('VaultLedger', appleSearch.length >= 1 && appleSearch.some(i => i.name.includes('Apple') || i.merchant.includes('Apple')), 'Search "apple" finds Apple items');

  ledger.searchQuery = 'mcfit';
  const mcfitSearch = ledger.getFilteredItems();
  check('VaultLedger', mcfitSearch.length === 1 && mcfitSearch[0].id === 'sub-10', 'Search "mcfit" finds McFIT subscription');

  // 3.3 Status Pills & Non-Color Geometric Glyphs
  const testPills = [
    { status: 'urgent', glyph: '[🛑]', cls: 'pill-urgent' },
    { status: 'warning', glyph: '[!]', cls: 'pill-warning' },
    { status: 'protected', glyph: '[✓]', cls: 'pill-protected' },
    { status: 'expired', glyph: '[x]', cls: 'pill-expired' }
  ];
  for (const p of testPills) {
    const html = ledger.renderTableRow({ id: 'dummy', name: 'Dummy', status: p.status, priceEur: 10 });
    check('VaultLedger', html.includes(p.glyph), `Status pill for ${p.status} contains non-color glyph ${p.glyph}`);
    check('VaultLedger', html.includes(p.cls), `Status pill for ${p.status} contains CSS class ${p.cls}`);
  }

  // 3.4 GoBD SHA-256 Copy Button
  const itemWithHash = INITIAL_VAULT_ITEMS.find(i => i.receiptSha256);
  const rowHash = ledger.renderTableRow(itemWithHash);
  check('VaultLedger', rowHash.includes('btn-copy-hash'), 'Row with hash renders .btn-copy-hash');
  check('VaultLedger', rowHash.includes(itemWithHash.receiptSha256), 'Row with hash includes complete SHA-256 digest');
  check('VaultLedger', rowHash.includes(itemWithHash.receiptSha256.substring(0, 8) + '...'), 'Row truncates displayed hash to 8 chars');
}

// ============================================================================
// SUITE 4: ContextualItemDrawer, BGBTimelineService & GoBD Cryptography
// ============================================================================
console.log('\n--- SUITE 4: ContextualItemDrawer, BGB Timeline & GoBD Cryptography ---');
{
  // 4.1 BGB Timeline Milestone calculation & Leap Year / Month-End Capping
  const leapMilestones = BGBTimelineService.calculateMilestones('2024-02-29');
  check('BGBTimeline', leapMilestones.cliff_12m_beweislastumkehr === '2025-02-28', 'Leap year 2024-02-29 cliff is 2025-02-28 (§ 188 Abs. 3)');
  check('BGBTimeline', leapMilestones.expiry_24m_statutory === '2026-02-28', 'Leap year 2024-02-29 24m expiry is 2026-02-28');
  check('BGBTimeline', leapMilestones.ablaufhemmung_28m === '2026-06-28', 'Ablaufhemmung is 4 months past expiry (2026-06-28)');

  // 4.2 Month-end capping tests across months with 30 and 31 days
  const capChecks = [
    { start: '2025-01-31', m: 1, expected: '2025-02-28' },
    { start: '2025-03-31', m: 1, expected: '2025-04-30' },
    { start: '2025-05-31', m: 1, expected: '2025-06-30' },
    { start: '2025-08-31', m: 1, expected: '2025-09-30' },
    { start: '2025-10-31', m: 1, expected: '2025-11-30' }
  ];
  for (const c of capChecks) {
    const res = BGBTimelineService.formatIso(BGBTimelineService.addMonths(c.start, c.m));
    check('BGBTimeline', res === c.expected, `Month-end cap for ${c.start} + ${c.m}m = ${c.expected}`);
  }

  // 4.3 Burden of proof status evaluation
  const anchor = new Date('2026-03-01');
  const recentPurchase = new Date('2025-10-01'); // 5 months ago -> within 12m cliff
  const evalRecent = BGBTimelineService.evaluateStatus(recentPurchase, anchor);
  check('BGBTimeline', evalRecent.burden_of_proof === 'seller', 'Recent purchase has seller burden of proof (§ 477 Abs. 1)');

  const midPurchase = new Date('2024-10-01'); // 17 months ago -> between 12m and 24m
  const evalMid = BGBTimelineService.evaluateStatus(midPurchase, anchor);
  check('BGBTimeline', evalMid.burden_of_proof === 'consumer', 'Mid purchase has consumer burden of proof (§ 438 Abs. 1)');

  const oldPurchase = new Date('2023-10-01'); // 29 months ago -> expired
  const evalOld = BGBTimelineService.evaluateStatus(oldPurchase, anchor);
  check('BGBTimeline', evalOld.status === 'expired' && evalOld.burden_of_proof === 'expired', 'Old purchase has expired status');

  // 4.4 DIN 5008 Statutory Notice Generation (polymorphic signatures)
  // Test case 1: Defect within 12m cliff -> cites § 477 Abs. 1 presumption
  const noticeWithinCliff = BGBTimelineService.generateStatutoryNotice({
    brandName: 'Apple',
    itemName: 'MacBook Pro',
    purchaseDate: '2026-05-01',
    defectDate: '2026-08-01',
    defectDescription: 'Display flickers upon cold boot'
  });
  check('BGBTimeline', Boolean(noticeWithinCliff && noticeWithinCliff.fullNoticeText && noticeWithinCliff.dossier_text_de), 'generateStatutoryNotice with object param returns fullNoticeText');
  check('BGBTimeline', noticeWithinCliff.fullNoticeText.includes('MÄNGELRÜGE GEMÄSS § 437 BGB'), 'Statutory notice includes DIN title');
  check('BGBTimeline', noticeWithinCliff.fullNoticeText.includes('§ 477 Abs. 1 BGB'), 'Notice within 12m cites § 477 presumption');

  // Test case 2: Defect between 12m and 24m -> cites § 438 Abs. 1 Nr. 3 buyer proof
  const noticePastCliff = BGBTimelineService.generateStatutoryNotice({
    brandName: 'Apple',
    itemName: 'MacBook Pro',
    purchaseDate: '2024-12-01',
    defectDate: '2026-04-01',
    defectDescription: 'Keyboard key stuck'
  });
  check('BGBTimeline', noticePastCliff.fullNoticeText.includes('§ 438 Abs. 1 Nr. 3 BGB'), 'Notice past 12m cites § 438 24-month warranty');

  const noticePositional = BGBTimelineService.generateStatutoryNotice(
    { name: 'Sony WH-1000XM5', merchant: 'MediaMarkt', purchaseDate: '2026-01-15' },
    new Date('2026-01-15'),
    'Right speaker silent'
  );
  check('BGBTimeline', Boolean(noticePositional && noticePositional.fullNoticeText), 'generateStatutoryNotice with positional params returns fullNoticeText');

  // 4.5 GoBD Cryptographic Immutability & Tamper Resistance
  const receiptData = 'BINARY_RECEIPT_IMAGE_STREAM_SAMPLE_PAYLOAD_ABC_999';
  const meta = { brand: 'MediaMarkt', total: 399.00, date: '2025-11-20' };
  const h1 = await GoBDCryptoService.computeDigest(receiptData, meta);
  check('GoBDCrypto', typeof h1 === 'string' && h1.length === 64, 'GoBD digest is 64-char SHA-256 hex string');

  // Tamper resistance: 1 byte changed in receipt
  const hTamperedPayload = await GoBDCryptoService.computeDigest(receiptData + 'X', meta);
  check('GoBDCrypto', h1 !== hTamperedPayload, 'GoBD digest detects 1-byte payload modification');

  // Tamper resistance: 1 cent changed in metadata
  const hTamperedMeta = await GoBDCryptoService.computeDigest(receiptData, { ...meta, total: 399.01 });
  check('GoBDCrypto', h1 !== hTamperedMeta, 'GoBD digest detects 1-cent metadata modification');

  // Key order invariance in JSON serialization
  const metaReordered = { date: '2025-11-20', total: 399.00, brand: 'MediaMarkt' };
  const hReordered = await GoBDCryptoService.computeDigest(receiptData, metaReordered);
  check('GoBDCrypto', h1 === hReordered, 'GoBD digest is canonical and deterministic regardless of key order');

  // Method alias computeReceiptDigest
  const hAlias = await GoBDCryptoService.computeReceiptDigest(receiptData, meta);
  check('GoBDCrypto', h1 === hAlias, 'computeReceiptDigest method alias produces identical digest');
}

// ============================================================================
// SUITE 5: HEADLESS CHROMIUM LIVE RUNTIME & VIEWPORT GEOMETRY AUDIT
// ============================================================================
console.log('\n--- SUITE 5: Headless Chromium Runtime & Viewport Geometry Audit ---');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const TEST_PORT = 4399;
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let p = path.join(APP_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(p)) {
    const alt = path.join(REPO_ROOT, urlPath);
    if (fs.existsSync(alt)) p = alt;
  }
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    const ext = path.extname(p).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise(r => server.listen(TEST_PORT, '127.0.0.1', r));

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));

if (!chromeExe) {
  console.warn('Chromium executable not found; skipping headless browser layout pass.');
  server.close();
} else {
  const CDP_PORT = 9399;
  const browserProc = spawn(chromeExe, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) break;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }

  const target = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?http://127.0.0.1:${TEST_PORT}/index.html`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const consoleErrors = [];
  let msgId = 0;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const d = JSON.parse(event.data);
    if (d.id && callbacks.has(d.id)) {
      const { resolve, reject } = callbacks.get(d.id);
      callbacks.delete(d.id);
      if (d.error) reject(new Error(d.error.message));
      else resolve(d.result);
    } else if (d.method === 'Runtime.consoleAPICalled') {
      if (d.params.type === 'error') {
        const text = d.params.args.map(a => a.value || a.description).join(' ');
        consoleErrors.push(text);
      }
    } else if (d.method === 'Runtime.exceptionThrown') {
      const desc = d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text;
      consoleErrors.push(desc);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  // Wait for bootstrap and rendering
  await new Promise(r => setTimeout(r, 2200));

  // 5.1 Clean bootstrap check
  check('HeadlessRuntime', consoleErrors.length === 0, 'Modern App boots without console errors',
    consoleErrors.join('; '));

  const bootState = await evalJs(`(() => {
    return {
      hasCmApp: !!window.cmApp,
      vaultItemsCount: window.cmApp ? window.cmApp.vaultItems.length : 0,
      omnibarMounted: !!document.getElementById('omnibar-input'),
      urgentBannerMounted: !!document.querySelector('.urgent-banner'),
      radarMounted: !!document.querySelector('.radar-card'),
      ledgerMounted: !!document.querySelector('.ledger-card'),
      ledgerRowCount: document.querySelectorAll('.ledger-row').length
    };
  })()`);

  check('HeadlessRuntime', bootState.hasCmApp, 'window.cmApp is initialized');
  check('HeadlessRuntime', bootState.vaultItemsCount === 20, 'Vault loaded with 20 seed items');
  check('HeadlessRuntime', bootState.omnibarMounted, 'Omnibar input mounted in DOM');
  check('HeadlessRuntime', bootState.urgentBannerMounted, 'UrgentAttentionBanner mounted in DOM');
  check('HeadlessRuntime', bootState.radarMounted, 'SpendSubscriptionRadar mounted in DOM');
  check('HeadlessRuntime', bootState.ledgerMounted, 'MasterVaultLedger mounted in DOM');
  check('HeadlessRuntime', bootState.ledgerRowCount === 20, 'MasterVaultLedger displays 20 rows');

  // 5.2 Viewport Geometry across all target responsive widths: 320, 375, 414, 768, 1024
  const TEST_WIDTHS = [320, 375, 414, 768, 1024];
  for (const w of TEST_WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 800,
      deviceScaleFactor: 2,
      mobile: w < 768
    });
    await new Promise(r => setTimeout(r, 250));

    const geo = await evalJs(`(() => {
      const html = document.documentElement;
      const body = document.body;
      const winW = window.innerWidth;
      const hScroll = html.scrollWidth;
      const hClient = html.clientWidth;
      const bScroll = body.scrollWidth;
      const bClient = body.clientWidth;

      const delta = Math.max(0, hScroll - hClient, bScroll - bClient);

      // Check for uncontained elements protruding past winW
      let uncontained = 0;
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.classList.contains('drawer-container') && !el.classList.contains('open')) continue;
        if (el.closest('.drawer-container') && !el.closest('.drawer-container').classList.contains('open')) continue;
        const rect = el.getBoundingClientRect();
        if (rect.right > winW + 1.5 && rect.width > 0 && rect.height > 0) {
          const style = window.getComputedStyle(el);
          if (style.overflow !== 'hidden' && style.display !== 'none') {
            uncontained++;
          }
        }
      }

      return { delta, uncontained, winW, hScroll, hClient };
    })()`);

    check('ViewportGeometry', geo.delta === 0, `Viewport ${w}px horizontal scroll delta is 0px (delta=${geo.delta}px)`);
    check('ViewportGeometry', geo.uncontained === 0, `Viewport ${w}px has 0 uncontained overflowing elements (count=${geo.uncontained})`);
  }

  // 5.3 Live Drawer Interaction Test
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 100));

  const drawerOpenResult = await evalJs(`(async () => {
    const item = window.cmApp.vaultItems.find(i => i.id === 'hw-01');
    window.cmApp.drawer.open(item);
    // Allow requestAnimationFrame to execute
    await new Promise(r => setTimeout(r, 100));
    const drawerEl = document.querySelector('.drawer-container');
    const titleEl = document.getElementById('drawer-item-title');
    return {
      isOpen: window.cmApp.drawer.isOpen,
      hasOpenClass: drawerEl.classList.contains('open'),
      titleText: titleEl ? titleEl.textContent : '',
      hasTimelineZone: !!drawerEl.querySelector('.zone-timeline'),
      hasStatusCard: !!drawerEl.querySelector('.timeline-status-card'),
      ariaModal: drawerEl.getAttribute('aria-modal')
    };
  })()`);

  check('DrawerInteraction', drawerOpenResult.isOpen, 'Drawer opens via cmApp.drawer.open()');
  check('DrawerInteraction', drawerOpenResult.hasOpenClass, 'Drawer receives .open class');
  check('DrawerInteraction', drawerOpenResult.titleText.includes('Sony'), 'Drawer displays correct item title');
  check('DrawerInteraction', drawerOpenResult.hasTimelineZone && drawerOpenResult.hasStatusCard, 'Drawer renders BGB timeline zone & status card');
  check('DrawerInteraction', drawerOpenResult.ariaModal === 'true', 'Drawer has aria-modal="true"');

  // Close drawer
  const drawerCloseResult = await evalJs(`(async () => {
    window.cmApp.drawer.close();
    await new Promise(r => setTimeout(r, 350));
    return {
      isOpen: window.cmApp.drawer.isOpen,
      hasOpenClass: document.querySelector('.drawer-container').classList.contains('open')
    };
  })()`);
  check('DrawerInteraction', !drawerCloseResult.isOpen && !drawerCloseResult.hasOpenClass, 'Drawer closes cleanly');

  // 5.4 Live Ledger Category Filtering in DOM
  const filterHwCount = await evalJs(`(() => {
    window.cmApp.ledger.setCategoryFilter('hardware');
    return document.querySelectorAll('.ledger-row').length;
  })()`);
  check('LedgerDOM', filterHwCount === 10, 'Ledger DOM updates to 10 rows when filtered to "hardware"');

  const filterSubCount = await evalJs(`(() => {
    window.cmApp.ledger.setCategoryFilter('subscription');
    return document.querySelectorAll('.ledger-row').length;
  })()`);
  check('LedgerDOM', filterSubCount === 10, 'Ledger DOM updates to 10 rows when filtered to "subscription"');

  const filterResetCount = await evalJs(`(() => {
    window.cmApp.ledger.setCategoryFilter('all');
    return document.querySelectorAll('.ledger-row').length;
  })()`);
  check('LedgerDOM', filterResetCount === 20, 'Ledger DOM resets to 20 rows on "all" filter');

  // 5.5 Live Omnibar Interaction in DOM
  const omnibarQueryResult = await evalJs(`(async () => {
    const input = document.getElementById('omnibar-input');
    input.focus();
    input.value = 'Spotify';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));

    const dropdown = document.getElementById('omnibar-dropdown');
    const options = document.querySelectorAll('.omnibar-option');
    return {
      dropdownVisible: dropdown && dropdown.style.display !== 'none',
      optionsCount: options.length,
      hasSpotifyOption: Array.from(options).some(o => o.textContent.includes('Spotify'))
    };
  })()`);
  check('OmnibarDOM', omnibarQueryResult.dropdownVisible, 'Omnibar dropdown is visible on input');
  check('OmnibarDOM', omnibarQueryResult.optionsCount > 0, 'Omnibar renders options on query');
  check('OmnibarDOM', omnibarQueryResult.hasSpotifyOption, 'Omnibar displays Spotify match');

  // Clean teardown
  ws.close();
  browserProc.kill();
  server.close();
}

// ============================================================================
// FINAL SUMMARY & EXIT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('ADVERSARIAL STRESS TEST SUMMARY:');
console.log(`  Total Checks: ${testStats.total}`);
console.log(`  Passed:       ${testStats.passed} (${((testStats.passed / testStats.total) * 100).toFixed(1)}%)`);
console.log(`  Failed:       ${testStats.failed}`);
if (testStats.failed > 0) {
  console.log('\nFailures:');
  for (const f of testStats.failures) console.log(`  - ${f}`);
}
console.log('='.repeat(80));

process.exit(testStats.failed === 0 ? 0 : 1);
