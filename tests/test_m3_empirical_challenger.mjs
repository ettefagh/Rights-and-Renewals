/**
 * test_m3_empirical_challenger.mjs
 * Empirical Challenger Verification & Stress Test Harness for Milestone 3 Gate (apps/app/)
 * Author: Empirical Challenger (teamwork_challenger_m3_2)
 *
 * Verifies:
 * 1. UrgentAttentionBanner: boundary days <= 30 (urgent cliff), <= 7 (imminent renewal), > 30 (not in banner)
 * 2. SpendSubscriptionRadar: sum calculation of monthly recurring expenses, annual liability, and tax deduction filtering
 * 3. MasterVaultLedger: category filtering, status pills, and GoBD SHA-256 copy functionality
 * 4. ContextualItemDrawer: 520px slide-over width, 24m statutory BGB timeline, GoBD receipt tamper detection, and cancellation CTA (BGB § 312k)
 * 5. Viewport geometry and DOM layout down to 320px/375px (0px horizontal overflow) via Headless Chromium CDP
 * 6. Application Bootstrap & Runtime Integrity
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { UrgentAttentionBanner, SpendSubscriptionRadar, MasterVaultLedger } from '../apps/app/js/components/widgets.js';
import { BGBTimelineService } from '../apps/app/js/services/bgbTimeline.js';
import { GoBDCryptoService } from '../apps/app/js/services/gobdCrypto.js';
import { INITIAL_VAULT_ITEMS, ANCHOR_DATE } from '../apps/app/js/data/sampleItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'apps', 'app');

// Results collector
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: [],
  categories: {
    urgentAttentionBanner: { total: 0, passed: 0, failed: 0 },
    spendSubscriptionRadar: { total: 0, passed: 0, failed: 0 },
    masterVaultLedger: { total: 0, passed: 0, failed: 0 },
    contextualItemDrawer: { total: 0, passed: 0, failed: 0 },
    viewportGeometryHeadless: { total: 0, passed: 0, failed: 0 },
    appBootstrapAndIntegrity: { total: 0, passed: 0, failed: 0 }
  },
  tests: []
};

function assert(category, condition, testName, details = '') {
  results.total++;
  results.categories[category].total++;
  if (condition) {
    results.passed++;
    results.categories[category].passed++;
    results.tests.push({ category, name: testName, status: 'PASS', details });
    console.log(`  [PASS] [${category}] ${testName}`);
  } else {
    results.failed++;
    results.categories[category].failed++;
    const errMsg = `[${category}] FAILED: ${testName} - ${details}`;
    results.findings.push(errMsg);
    results.tests.push({ category, name: testName, status: 'FAIL', details });
    console.error(`  [FAIL] [${category}] ${testName} - ${details}`);
  }
}

function createMockContainer() {
  const listeners = new Map();
  return {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (ev, cb) => {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(cb);
    }
  };
}

console.log('='.repeat(80));
console.log('  CM-LAB MILESTONE 3 GATE: EMPIRICAL CHALLENGER VERIFICATION HARNESS');
console.log('='.repeat(80));

// ============================================================================
// PART 1: UrgentAttentionBanner ADVERSARIAL STRESS & BOUNDARY TESTING
// ============================================================================
console.log('\n--- 1. Testing UrgentAttentionBanner Boundaries & Calculations ---');

{
  const container = createMockContainer();
  const banner = new UrgentAttentionBanner(container);

  // Boundary 1: Subscription with exactly daysRemaining = 30 (must be included)
  banner.update([
    { id: 'sub-30', category: 'subscription', name: 'Sub 30d', priceEur: 10.0, daysRemaining: 30 }
  ]);
  const alerts30 = banner.computeAlerts();
  assert('urgentAttentionBanner', alerts30.urgentSubs.length === 1, 'Subscription at exactly daysRemaining=30 is included in banner');
  assert('urgentAttentionBanner', alerts30.totalSpend === 10.0, 'Total spend includes daysRemaining=30 subscription');

  // Boundary 2: Subscription with daysRemaining = 31 (must NOT be in banner)
  banner.update([
    { id: 'sub-31', category: 'subscription', name: 'Sub 31d', priceEur: 10.0, daysRemaining: 31 }
  ]);
  const alerts31 = banner.computeAlerts();
  assert('urgentAttentionBanner', alerts31.urgentSubs.length === 0, 'Subscription at daysRemaining=31 is excluded from banner');
  assert('urgentAttentionBanner', alerts31.totalSpend === 0, 'Total spend is 0 when daysRemaining=31');

  // Boundary 3: Subscription with exactly daysRemaining = 7 (triggers critical red alert)
  banner.update([
    { id: 'sub-7', category: 'subscription', name: 'Sub 7d', priceEur: 15.0, daysRemaining: 7 }
  ]);
  const alerts7 = banner.computeAlerts();
  assert('urgentAttentionBanner', alerts7.urgentSubs.length === 1, 'Subscription at daysRemaining=7 is included in banner');
  assert('urgentAttentionBanner', container.innerHTML.includes('banner-critical'), 'Subscription at daysRemaining=7 receives banner-critical CSS class');
  assert('urgentAttentionBanner', container.innerHTML.includes('Fristablauf ≤ 7 Tage'), 'Urgency badge displays "Fristablauf ≤ 7 Tage"');
  assert('urgentAttentionBanner', container.innerHTML.includes('🛑'), 'Critical glyph 🛑 is rendered for daysRemaining=7');

  // Boundary 4: Subscription with daysRemaining = 8 (warning amber alert, NOT critical red)
  banner.update([
    { id: 'sub-8', category: 'subscription', name: 'Sub 8d', priceEur: 12.0, daysRemaining: 8 }
  ]);
  assert('urgentAttentionBanner', container.innerHTML.includes('banner-warning'), 'Subscription at daysRemaining=8 receives banner-warning CSS class');
  assert('urgentAttentionBanner', container.innerHTML.includes('Fristablauf ≤ 30 Tage'), 'Urgency badge displays "Fristablauf ≤ 30 Tage"');
  assert('urgentAttentionBanner', container.innerHTML.includes('⚠️'), 'Warning glyph ⚠️ is rendered for daysRemaining=8');

  // Boundary 5: Subscription with daysRemaining = 0 (renewal today, critical red)
  banner.update([
    { id: 'sub-0', category: 'subscription', name: 'Sub Today', priceEur: 9.99, daysRemaining: 0 }
  ]);
  assert('urgentAttentionBanner', container.innerHTML.includes('banner-critical'), 'Subscription at daysRemaining=0 receives banner-critical');

  // Boundary 6: Past due subscription with daysRemaining < 0 (e.g. -2)
  banner.update([
    { id: 'sub-past', category: 'subscription', name: 'Sub Overdue', priceEur: 8.50, daysRemaining: -2 }
  ]);
  const alertsPast = banner.computeAlerts();
  assert('urgentAttentionBanner', alertsPast.urgentSubs.length === 1, 'Overdue subscription with daysRemaining < 0 is captured');
  assert('urgentAttentionBanner', container.innerHTML.includes('banner-critical'), 'Overdue subscription receives banner-critical');

  // Boundary 7: Hardware at exactly daysToCliff = 45 with isWithinReversedBurdenOfProof = true
  banner.update([
    { id: 'hw-45', category: 'hardware', name: 'HW 45d', priceEur: 499.0, daysToCliff: 45, isWithinReversedBurdenOfProof: true }
  ]);
  const alertsHw45 = banner.computeAlerts();
  assert('urgentAttentionBanner', alertsHw45.cliffWarnings.length === 1, 'Hardware at daysToCliff=45 with active proof burden is included');

  // Boundary 8: Hardware at daysToCliff = 46 (excluded)
  banner.update([
    { id: 'hw-46', category: 'hardware', name: 'HW 46d', priceEur: 499.0, daysToCliff: 46, isWithinReversedBurdenOfProof: true }
  ]);
  const alertsHw46 = banner.computeAlerts();
  assert('urgentAttentionBanner', alertsHw46.cliffWarnings.length === 0, 'Hardware at daysToCliff=46 is excluded');

  // Boundary 9: Hardware at daysToCliff = 20 but isWithinReversedBurdenOfProof = false (consumer proof, excluded)
  banner.update([
    { id: 'hw-false', category: 'hardware', name: 'HW Expired Burden', priceEur: 300.0, daysToCliff: 20, isWithinReversedBurdenOfProof: false }
  ]);
  const alertsHwFalse = banner.computeAlerts();
  assert('urgentAttentionBanner', alertsHwFalse.cliffWarnings.length === 0, 'Hardware with isWithinReversedBurdenOfProof=false is excluded from cliff alerts');

  // Boundary 10: Empty vault or only safe items renders banner-safe
  banner.update([
    { id: 'safe-sub', category: 'subscription', name: 'Safe Sub', priceEur: 10.0, daysRemaining: 180 },
    { id: 'safe-hw', category: 'hardware', name: 'Safe HW', priceEur: 800.0, daysToCliff: 250, isWithinReversedBurdenOfProof: true }
  ]);
  assert('urgentAttentionBanner', container.innerHTML.includes('banner-safe'), 'Safe vault with no alerts renders banner-safe');
  assert('urgentAttentionBanner', container.innerHTML.includes('Alle Fristen gesichert'), 'Safe banner displays "Alle Fristen gesichert"');
  assert('urgentAttentionBanner', container.innerHTML.includes('🛡️'), 'Safe banner renders shield glyph 🛡️');

  // Boundary 11: Multi-item sorting: ensure urgent items are sorted ascending by daysRemaining
  banner.update([
    { id: 's20', category: 'subscription', name: 'Sub 20', priceEur: 10.0, daysRemaining: 20 },
    { id: 's3', category: 'subscription', name: 'Sub 3', priceEur: 5.0, daysRemaining: 3 },
    { id: 's12', category: 'subscription', name: 'Sub 12', priceEur: 8.0, daysRemaining: 12 }
  ]);
  const sortedAlerts = banner.computeAlerts();
  assert('urgentAttentionBanner', sortedAlerts.urgentSubs[0].id === 's3', 'Urgent subscriptions sorted ascending: s3 first');
  assert('urgentAttentionBanner', sortedAlerts.urgentSubs[1].id === 's12', 'Urgent subscriptions sorted ascending: s12 second');
  assert('urgentAttentionBanner', sortedAlerts.urgentSubs[2].id === 's20', 'Urgent subscriptions sorted ascending: s20 third');
  assert('urgentAttentionBanner', sortedAlerts.totalSpend === 23.0, 'Total spend correctly sums 10 + 5 + 8 = 23.0 €');

  // Boundary 12: Action button presence for subscription (BGB § 312k cancel button)
  assert('urgentAttentionBanner', container.innerHTML.includes('btn-urgent-cancel'), 'Banner renders .btn-urgent-cancel action button');
  assert('urgentAttentionBanner', container.innerHTML.includes('Kündigen via Online-Button (§ 312k)'), 'Button text cites statutory § 312k');
}

// ============================================================================
// PART 2: SpendSubscriptionRadar SUM CALCULATION & FILTERING
// ============================================================================
console.log('\n--- 2. Testing SpendSubscriptionRadar Calculations & Filters ---');

{
  const container = createMockContainer();
  const radar = new SpendSubscriptionRadar(container);

  // Scenario 1: Standard mix of hardware, subscriptions, and tax items
  const testItems = [
    { id: 'h1', category: 'hardware', priceEur: 1500.0, status: 'protected', isTaxDeductible: true },
    { id: 'h2', category: 'hardware', priceEur: 300.0, status: 'warning', isTaxDeductible: false },
    { id: 'h3', category: 'hardware', priceEur: 450.0, status: 'expired', isTaxDeductible: true }, // expired hardware
    { id: 's1', category: 'subscription', priceEur: 9.99, status: 'urgent', daysRemaining: 5, isTaxDeductible: false },
    { id: 's2', category: 'subscription', priceEur: 19.99, status: 'protected', daysRemaining: 120, isTaxDeductible: true },
    { id: 's3', category: 'subscription', priceEur: 5.00, status: 'expired', daysRemaining: 0, isTaxDeductible: false } // expired subscription
  ];

  radar.update(testItems);
  const kpis = radar.calculateKpis();

  // Test 1: Total protected capital (active hardware: 1500 + 300 = 1800.0; expired h3 excluded)
  assert('spendSubscriptionRadar', Math.abs(kpis.totalProtectedCapital - 1800.0) < 0.001, 'Protected hardware capital sums active hardware (1800.00 €)');

  // Test 2: Monthly run rate (active subscriptions: 9.99 + 19.99 = 29.98 €; expired s3 excluded)
  assert('spendSubscriptionRadar', Math.abs(kpis.monthlyRunRate - 29.98) < 0.001, 'Monthly run rate correctly sums active subscriptions (29.98 €)');

  // Test 3: Annual liability (monthly * 12 = 29.98 * 12 = 359.76 €)
  assert('spendSubscriptionRadar', Math.abs(kpis.annualRunRate - 359.76) < 0.001, 'Annual subscription liability equals monthly * 12 (359.76 €)');

  // Test 4: Tax deductible total (all items where isTaxDeductible=true: h1 1500 + h3 450 + s2 19.99 = 1969.99 €)
  assert('spendSubscriptionRadar', Math.abs(kpis.taxDeductibleTotal - 1969.99) < 0.001, 'Tax deductible total sums all isTaxDeductible items (1969.99 €)');

  // Test 5 (ADVERSARIAL STRESS): Assert that cancellable subscriptions filter out expired items
  const excludesExpiredFromCancellable = kpis.cancellableCount === 1;
  assert('spendSubscriptionRadar', excludesExpiredFromCancellable, 'Cancellable subscriptions must exclude already-expired subscriptions (status !== "expired")',
    `Observed cancellableCount=${kpis.cancellableCount} (s3 with status="expired" was included in cancellableSubs)`);

  // Test 6: Zero items edge case
  radar.update([]);
  const zeroKpis = radar.calculateKpis();
  assert('spendSubscriptionRadar', zeroKpis.totalProtectedCapital === 0, 'Zero items: totalProtectedCapital = 0');
  assert('spendSubscriptionRadar', zeroKpis.monthlyRunRate === 0, 'Zero items: monthlyRunRate = 0');
  assert('spendSubscriptionRadar', zeroKpis.annualRunRate === 0, 'Zero items: annualRunRate = 0');
  assert('spendSubscriptionRadar', zeroKpis.taxDeductibleTotal === 0, 'Zero items: taxDeductibleTotal = 0');

  // Test 7: Floating point precision stress test (many small decimals)
  const floatItems = Array.from({ length: 100 }, (_, idx) => ({
    id: `float-${idx}`,
    category: 'subscription',
    priceEur: 0.10,
    status: 'protected',
    daysRemaining: 15,
    isTaxDeductible: true
  }));
  radar.update(floatItems);
  const floatKpis = radar.calculateKpis();
  assert('spendSubscriptionRadar', Math.abs(floatKpis.monthlyRunRate - 10.0) < 0.001, '100 items of 0.10 € sum to exactly 10.00 €');
  assert('spendSubscriptionRadar', Math.abs(floatKpis.annualRunRate - 120.0) < 0.001, 'Annual liability sums to 120.00 €');

  // Test 8: Render validation (contains metric cells and tax export button)
  assert('spendSubscriptionRadar', container.innerHTML.includes('btn-export-tax'), 'Radar renders .btn-export-tax CSV button');
  assert('spendSubscriptionRadar', container.innerHTML.includes('Steuerabzugsfähig (§ 9 EStG)'), 'Radar includes § 9 EStG tax metric label');
  assert('spendSubscriptionRadar', container.innerHTML.includes('BMF 2022 Sofortabschreibung'), 'Radar includes BMF 2022 reference footnote');
}

// ============================================================================
// PART 3: MasterVaultLedger CATEGORY FILTERING, STATUS PILLS & GOBD COPY
// ============================================================================
console.log('\n--- 3. Testing MasterVaultLedger Filters, Status Pills & GoBD Hashes ---');

{
  const container = createMockContainer();
  const ledger = new MasterVaultLedger(container);

  ledger.update(INITIAL_VAULT_ITEMS);

  // Test 1: Category filter 'all'
  ledger.setCategoryFilter('all');
  const allItems = ledger.getFilteredItems();
  assert('masterVaultLedger', allItems.length === 20, 'Filter "all" returns all 20 seed items');

  // Test 2: Category filter 'hardware'
  ledger.setCategoryFilter('hardware');
  const hwItems = ledger.getFilteredItems();
  assert('masterVaultLedger', hwItems.length === 10, 'Filter "hardware" returns exactly 10 hardware items');
  assert('masterVaultLedger', hwItems.every(i => i.category === 'hardware'), 'All items in hardware filter have category === "hardware"');

  // Test 3: Category filter 'subscription'
  ledger.setCategoryFilter('subscription');
  const subItems = ledger.getFilteredItems();
  assert('masterVaultLedger', subItems.length === 10, 'Filter "subscription" returns exactly 10 subscription items');
  assert('masterVaultLedger', subItems.every(i => i.category === 'subscription'), 'All items in subscription filter have category === "subscription"');

  // Test 4: Category filter 'tax'
  ledger.setCategoryFilter('tax');
  const taxItems = ledger.getFilteredItems();
  const expectedTaxCount = INITIAL_VAULT_ITEMS.filter(i => i.isTaxDeductible).length;
  assert('masterVaultLedger', taxItems.length === expectedTaxCount, `Filter "tax" returns ${expectedTaxCount} items qualifying for § 9 EStG`);
  assert('masterVaultLedger', taxItems.every(i => i.isTaxDeductible), 'All items in tax filter have isTaxDeductible === true');

  // Test 5: Category filter 'urgent' (daysRemaining <= 30 or (within burden and daysToCliff <= 45))
  ledger.setCategoryFilter('urgent');
  const urgentItems = ledger.getFilteredItems();
  assert('masterVaultLedger', urgentItems.length > 0, 'Filter "urgent" returns active urgent items');
  assert('masterVaultLedger', urgentItems.every(i => {
    const d = i.daysRemaining !== undefined ? i.daysRemaining : 999;
    const c = i.daysToCliff !== undefined ? i.daysToCliff : 999;
    return d <= 30 || (i.isWithinReversedBurdenOfProof && c <= 45);
  }), 'All urgent items satisfy <= 30d or <= 45d cliff condition');

  // Test 6: Search query filtering by name
  ledger.setCategoryFilter('all');
  ledger.searchQuery = 'Spotify';
  const spotifySearch = ledger.getFilteredItems();
  assert('masterVaultLedger', spotifySearch.length === 1 && spotifySearch[0].id === 'sub-01', 'Search for "Spotify" returns Spotify Premium Student');

  // Test 7: Search query filtering by SHA-256 hash
  const sonyHw = INITIAL_VAULT_ITEMS.find(i => i.id === 'hw-01');
  ledger.searchQuery = sonyHw.receiptSha256.substring(0, 10);
  const hashSearch = ledger.getFilteredItems();
  assert('masterVaultLedger', hashSearch.length === 1 && hashSearch[0].id === 'hw-01', 'Search by partial SHA-256 hash finds matching hardware item');

  // Test 8: Non-color geometric glyph invariants across all 4 status pills
  const sampleStatuses = [
    { id: 't1', status: 'urgent', name: 'T1', daysRemaining: 3, priceEur: 10 },
    { id: 't2', status: 'warning', name: 'T2', daysToCliff: 25, priceEur: 10 },
    { id: 't3', status: 'protected', name: 'T3', daysRemaining: 200, priceEur: 10 },
    { id: 't4', status: 'expired', name: 'T4', daysRemaining: 0, priceEur: 10 }
  ];
  for (const s of sampleStatuses) {
    const rowHtml = ledger.renderTableRow(s);
    if (s.status === 'urgent') {
      assert('masterVaultLedger', rowHtml.includes('[🛑]'), 'Urgent status pill contains glyph [🛑]');
      assert('masterVaultLedger', rowHtml.includes('pill-urgent'), 'Urgent row contains class pill-urgent');
    } else if (s.status === 'warning') {
      assert('masterVaultLedger', rowHtml.includes('[!]'), 'Warning status pill contains glyph [!]');
      assert('masterVaultLedger', rowHtml.includes('pill-warning'), 'Warning row contains class pill-warning');
    } else if (s.status === 'protected') {
      assert('masterVaultLedger', rowHtml.includes('[✓]'), 'Protected status pill contains glyph [✓]');
      assert('masterVaultLedger', rowHtml.includes('pill-protected'), 'Protected row contains class pill-protected');
    } else if (s.status === 'expired') {
      assert('masterVaultLedger', rowHtml.includes('[x]'), 'Expired status pill contains glyph [x]');
      assert('masterVaultLedger', rowHtml.includes('pill-expired'), 'Expired row contains class pill-expired');
    }
  }

  // Test 9: GoBD SHA-256 Copy Button rendering
  const hwWithHash = INITIAL_VAULT_ITEMS.find(i => i.receiptSha256);
  const rowWithHash = ledger.renderTableRow(hwWithHash);
  assert('masterVaultLedger', rowWithHash.includes('btn-copy-hash'), 'Row with receiptSha256 renders .btn-copy-hash button');
  assert('masterVaultLedger', rowWithHash.includes(`data-hash="${hwWithHash.receiptSha256}"`), 'Copy button data-hash attribute contains full 64-char hash');
  assert('masterVaultLedger', rowWithHash.includes(hwWithHash.receiptSha256.substring(0, 8) + '...'), 'Displayed hash is truncated to 8 chars with ellipsis');

  const subWithoutHash = INITIAL_VAULT_ITEMS.find(i => !i.receiptSha256);
  const rowWithoutHash = ledger.renderTableRow(subWithoutHash);
  assert('masterVaultLedger', rowWithoutHash.includes('—'), 'Row without receiptSha256 displays em-dash placeholder "—"');
}

// ============================================================================
// PART 4: ContextualItemDrawer, BGB TIMELINE & GOBD TAMPER DETECTION
// ============================================================================
console.log('\n--- 4. Testing ContextualItemDrawer, BGB Timeline & GoBD Tamper Proof ---');

{
  // Test 1 (ADVERSARIAL STRESS): BGBTimelineService.calculateMilestones runtime execution check
  let milestonesWorked = false;
  let milestonesError = null;
  try {
    const m = BGBTimelineService.calculateMilestones('2024-02-29');
    milestonesWorked = Boolean(m);
  } catch (err) {
    milestonesError = err;
  }
  assert('contextualItemDrawer', milestonesWorked, 'BGBTimelineService.calculateMilestones executes without ReferenceError',
    milestonesError ? milestonesError.message : '');

  // Test 2: BGB § 188 Abs. 3 month-end date capping (addMonths logic directly)
  const addMonthCases = [
    { start: '2025-01-31', m: 1, expected: '2025-02-28' },
    { start: '2024-01-31', m: 1, expected: '2024-02-29' }, // leap year
    { start: '2025-03-31', m: 1, expected: '2025-04-30' },
    { start: '2025-05-31', m: 1, expected: '2025-06-30' },
    { start: '2025-08-31', m: 1, expected: '2025-09-30' },
    { start: '2025-10-31', m: 1, expected: '2025-11-30' }
  ];
  for (const c of addMonthCases) {
    const res = BGBTimelineService.formatIso(BGBTimelineService.addMonths(c.start, c.m));
    assert('contextualItemDrawer', res === c.expected, `addMonths("${c.start}", ${c.m}) = ${c.expected} (month-end cap)`);
  }

  // Test 3: GoBD Receipt Cryptographic Immutability & Tamper Detection
  const originalMetadata = { item_name: 'Apple MacBook Pro', price: 1899.0, purchase_date: '2025-06-20' };
  const authenticBlob = 'AUTHENTIC_ORIGINAL_RECEIPT_IMAGE_BINARY_DATA_XYZ_123';
  const digestOriginal = await GoBDCryptoService.computeDigest(authenticBlob, originalMetadata);

  assert('contextualItemDrawer', typeof digestOriginal === 'string' && digestOriginal.length === 64, 'GoBD pre-encryption digest produces 64-char hex SHA-256 string');

  // Tamper test 1: Flip 1 byte in receipt payload
  const tamperedBlob = 'AUTHENTIC_ORIGINAL_RECEIPT_IMAGE_BINARY_DATA_XYZ_124'; // last char changed
  const digestTamperedPayload = await GoBDCryptoService.computeDigest(tamperedBlob, originalMetadata);
  assert('contextualItemDrawer', digestOriginal !== digestTamperedPayload, 'GoBD tamper detection: 1-byte payload change alters digest');

  // Tamper test 2: Alter metadata (e.g. price change)
  const tamperedMeta = { ...originalMetadata, price: 1899.01 };
  const digestTamperedMeta = await GoBDCryptoService.computeDigest(authenticBlob, tamperedMeta);
  assert('contextualItemDrawer', digestOriginal !== digestTamperedMeta, 'GoBD tamper detection: 1-cent metadata change alters digest');

  // Test 4: Key order invariance in canonical JSON serialization
  const metaShuffled = { purchase_date: '2025-06-20', price: 1899.0, item_name: 'Apple MacBook Pro' };
  const digestShuffled = await GoBDCryptoService.computeDigest(authenticBlob, metaShuffled);
  assert('contextualItemDrawer', digestOriginal === digestShuffled, 'GoBD digest is canonical and deterministic regardless of metadata key insertion order');

  // Test 5 (ADVERSARIAL STRESS): Check GoBDCryptoService API contract consistency with app.js
  const hasComputeReceiptDigest = typeof GoBDCryptoService.computeReceiptDigest === 'function';
  assert('contextualItemDrawer', hasComputeReceiptDigest, 'GoBDCryptoService.computeReceiptDigest exists (called in app.js:631, 669)',
    'computeReceiptDigest is undefined on GoBDCryptoService (only computeDigest is defined)');

  // Test 6: CSS Contract verification for 520px slide-over drawer
  const widgetsCssPath = path.join(APP_DIR, 'styles', 'widgets.css');
  const widgetsCss = fs.readFileSync(widgetsCssPath, 'utf8');
  assert('contextualItemDrawer', widgetsCss.includes('max-width: 520px;'), 'styles/widgets.css specifies "max-width: 520px;" for drawer');
  assert('contextualItemDrawer', widgetsCss.includes('.drawer-container'), 'styles/widgets.css defines .drawer-container class');
  assert('contextualItemDrawer', widgetsCss.includes('transform: translateX(100%);'), 'Drawer starts off-canvas with translateX(100%)');
  assert('contextualItemDrawer', widgetsCss.includes('transform: translateX(0);'), 'Drawer slides in with translateX(0)');

  // Test 7: Subscription Cancellation CTA (BGB § 312k)
  const spotifySub = INITIAL_VAULT_ITEMS.find(i => i.id === 'sub-01');
  assert('contextualItemDrawer', spotifySub.cancellationUrl === 'https://www.spotify.com/account/subscription/cancel/', 'Spotify subscription specifies statutory cancellation URL');
  assert('contextualItemDrawer', spotifySub.bgbClauses.includes('BGB § 312k'), 'Spotify item references BGB § 312k statutory online cancellation button mandate');

  // Test 8 (ADVERSARIAL STRESS): Check statutory claim notice parameter signature consistency
  const sampleClaimItem = { id: 'hw-01', name: 'Sony WH-1000XM5', merchant: 'MediaMarkt', purchaseDate: '2025-12-15' };
  let claimNoticeWorksWithAppJsCall = false;
  let claimNoticeError = null;
  try {
    // app.js:715 calls generateStatutoryNotice(item, purchaseDate, defectDescription)
    const notice = BGBTimelineService.generateStatutoryNotice(sampleClaimItem, new Date(sampleClaimItem.purchaseDate), 'Mangel...');
    claimNoticeWorksWithAppJsCall = Boolean(notice && notice.fullNoticeText);
  } catch (err) {
    claimNoticeError = err;
  }
  assert('contextualItemDrawer', claimNoticeWorksWithAppJsCall, 'BGBTimelineService.generateStatutoryNotice matches app.js call signature and provides notice.fullNoticeText',
    claimNoticeError ? claimNoticeError.message : 'notice.fullNoticeText is undefined');
}

// ============================================================================
// PART 5: HEADLESS CHROMIUM VIEWPORT GEOMETRY & RUNTIME BOOTSTRAP FOR apps/app
// ============================================================================
console.log('\n--- 5. Testing Viewport Geometry & Bootstrap in Headless Chromium ---');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const APP_PORT = 4325;
const appServer = http.createServer((req, res) => {
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

await new Promise(resolve => appServer.listen(APP_PORT, '127.0.0.1', resolve));
console.log(`Local static server for apps/app running on http://127.0.0.1:${APP_PORT}`);

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));

if (!chromeExe) {
  console.warn('No Chromium binary found; skipping headless browser layout pass.');
  appServer.close();
} else {
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

  try {
    const cdpVersion = await waitForCDP();
    console.log(`Connected to headless browser: ${cdpVersion.Browser}`);

    const newTab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: 'PUT' })).json();
    const client = new CDPClient(newTab.webSocketDebuggerUrl);

    const consoleLogs = [];
    const exceptions = [];

    client.eventListeners.set('Runtime.consoleAPICalled', [
      (params) => consoleLogs.push({ type: params.type, text: params.args.map(a => a.value || a.description).join(' ') })
    ]);
    client.eventListeners.set('Runtime.exceptionThrown', [
      (params) => exceptions.push(params.exceptionDetails)
    ]);

    await client.send('Console.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}` });

    // Wait for full hydration
    await new Promise(r => setTimeout(r, 2500));

    // Test Bootstrap Health
    const bootError = consoleLogs.find(l => l.type === 'error' && l.text.includes('Fatal initialization error'));
    assert('appBootstrapAndIntegrity', !bootError, 'Modern App boots in browser without fatal initialization error',
      bootError ? bootError.text : 'App booted cleanly');

    // Test Viewport Geometry on 320px, 375px, 414px
    const TARGET_VIEWPORTS = [320, 375, 414, 768, 1024];

    for (const width of TARGET_VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 800,
        deviceScaleFactor: 2,
        mobile: width < 768
      });

      await new Promise(r => setTimeout(r, 250));

      const geometry = await client.eval(`(() => {
        const html = document.documentElement;
        const body = document.body;
        const winWidth = window.innerWidth;
        const htmlClient = html.clientWidth;
        const htmlScroll = html.scrollWidth;
        const bodyClient = body.clientWidth;
        const bodyScroll = body.scrollWidth;

        // Protrusion scan: detect elements with right > winWidth
        const overflowing = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (el.classList.contains('drawer-container') && !el.classList.contains('open')) continue;
          if (el.closest('.drawer-container') && !el.closest('.drawer-container').classList.contains('open')) continue;

          if (rect.right > winWidth + 1.5 && rect.width > 0 && rect.height > 0) {
            const style = window.getComputedStyle(el);
            if (style.overflow !== 'hidden' && style.display !== 'none') {
              overflowing.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                right: Math.round(rect.right),
                winWidth
              });
            }
          }
        }

        return {
          winWidth,
          htmlClient,
          htmlScroll,
          bodyClient,
          bodyScroll,
          hasHorizontalOverflow: htmlScroll > htmlClient || bodyScroll > bodyClient,
          overflowDelta: Math.max(0, htmlScroll - htmlClient, bodyScroll - bodyClient),
          overflowCount: overflowing.length
        };
      })()`);

      console.log(`  Viewport ${width}px: scrollDelta=${geometry.overflowDelta}px, uncontained=${geometry.overflowCount}`);
      assert('viewportGeometryHeadless', geometry.overflowDelta === 0, `Viewport ${width}px has 0px horizontal overflow (scrollDelta=${geometry.overflowDelta})`);
      assert('viewportGeometryHeadless', geometry.overflowCount === 0, `Viewport ${width}px has 0 uncontained overflowing elements`);
    }

  } catch (err) {
    console.error('Headless Chromium execution error:', err);
    assert('viewportGeometryHeadless', false, 'Headless Chromium execution completed without error', err.message);
  } finally {
    browserProc.kill();
    appServer.close();
  }
}

// ============================================================================
// FINAL SUMMARY & RESULTS PERSISTENCE
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log(`EMPIRICAL CHALLENGER AUDIT SUMMARY:`);
console.log(`  Total Checks: ${results.total}`);
console.log(`  Passed:       ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
console.log(`  Failed:       ${results.failed}`);
console.log(`  Findings:     ${results.findings.length}`);
for (const [cat, stats] of Object.entries(results.categories)) {
  console.log(`    - ${cat}: ${stats.passed}/${stats.total} passed`);
}
console.log('='.repeat(80));

const resultsFilePath = path.join(REPO_ROOT, 'tests', 'm3_empirical_results.json');
fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Detailed verification report saved to: ${resultsFilePath}`);

if (results.failed > 0) {
  console.error('\nFindings that require changes:');
  for (const f of results.findings) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log('\n✓ ALL EMPIRICAL CHALLENGER TESTS PASSED (100.0%). VERDICT: APPROVE.');
  process.exit(0);
}
