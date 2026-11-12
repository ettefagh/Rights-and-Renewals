/**
 * test_m2_greenfield_empirical.mjs
 * Comprehensive Empirical Adversarial Verification Harness for Milestone M2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Import session utilities from compiled Astro bundle
import {
  g as generatePin,
  a as getPinExpiration,
  c as createPinHash,
  b as constantTimeEqual,
  d as createSessionToken,
  e as createIcalToken,
  v as verifyIcalToken,
  f as createBackupBaseSecret
} from '../apps/app/dist/_worker.js/chunks/session_CEhSQQAV.mjs';

// Import theme engine
import {
  BUILTIN_THEME_PRESETS,
  setThemeMode,
  applyCustomDesignTokens,
  resetCustomDesignTokens,
  parseCustomDesignTokens
} from '../packages/design-tokens/themeEngine.ts';

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

console.log('='.repeat(80));
console.log('  MILESTONE M2 GREENFIELD EMPIRICAL CHALLENGER VERIFICATION');
console.log('='.repeat(80));

// ============================================================================
// PART 1: EMAIL AUTH & SESSION VERIFICATION
// ============================================================================
console.log('\n--- PART 1: Email Auth & Session Verification ---');

// 1.1 constantTimeEqual
assert(constantTimeEqual('abcdef123456', 'abcdef123456') === true, 'constantTimeEqual: identical ASCII strings');
assert(constantTimeEqual('', '') === true, 'constantTimeEqual: empty strings');
assert(constantTimeEqual('abcdef', 'abcdeg') === false, 'constantTimeEqual: single-bit character mismatch');
assert(constantTimeEqual('abcdef', 'abcdefg') === false, 'constantTimeEqual: different length strings');
assert(constantTimeEqual('student@srh.de', 'STUDENT@SRH.DE') === false, 'constantTimeEqual: case difference');
assert(constantTimeEqual('über-münchen-123', 'über-münchen-123') === true, 'constantTimeEqual: UTF-8 characters');

// 1.2 generatePin: 500 iterations for format and bounds
let pinFormatOk = true;
let pinBoundsOk = true;
for (let i = 0; i < 500; i++) {
  const pin = generatePin();
  if (!/^\d{6}$/.test(pin)) pinFormatOk = false;
  const num = parseInt(pin, 10);
  if (num < 0 || num > 999999) pinBoundsOk = false;
}
assert(pinFormatOk, 'generatePin: 500 consecutive pins match /^\\d{6}$/ exactly');
assert(pinBoundsOk, 'generatePin: 500 consecutive pins within range [0, 999999]');

// 1.3 createPinHash sensitivity & normalization
const email1 = 'student@srh.de';
const emailUpper = 'STUDENT@SRH.DE';
const email2 = 'other@srh.de';
const pinA = '123456';
const pinB = '123457';
const exp = Date.now() + 600000;

const hash1 = await createPinHash(email1, pinA, exp);
const hashUpper = await createPinHash(emailUpper, pinA, exp);
const hashDiffEmail = await createPinHash(email2, pinA, exp);
const hashDiffPin = await createPinHash(email1, pinB, exp);
const hashDiffExp = await createPinHash(email1, pinA, exp + 1000);

assert(hash1 === hashUpper, 'createPinHash: case insensitive (normalizes email to lowercase)');
assert(hash1 !== hashDiffEmail, 'createPinHash: different email produces completely different hash');
assert(hash1 !== hashDiffPin, 'createPinHash: 1-digit change produces completely different hash');
assert(hash1 !== hashDiffExp, 'createPinHash: expiration change produces completely different hash');
assert(/^[A-Za-z0-9_-]+$/.test(hash1), 'createPinHash: produces URL-safe base64 string');

// 1.4 createIcalToken and verifyIcalToken
const icalToken = await createIcalToken(email1);
assert(typeof icalToken === 'string' && icalToken.split('.').length === 3, 'createIcalToken: produces valid 3-part JWT');
const verifiedEmail = await verifyIcalToken(icalToken);
assert(verifiedEmail === email1, 'verifyIcalToken: successfully validates signed token');

const tamperedToken = icalToken.slice(0, -4) + 'abcd';
const verifiedTampered = await verifyIcalToken(tamperedToken);
assert(verifiedTampered === null, 'verifyIcalToken: rejects tampered token with null');

const emptyTokenVerified = await verifyIcalToken('');
assert(emptyTokenVerified === null, 'verifyIcalToken: rejects empty token with null');

// 1.5 createBackupBaseSecret
const secret1 = await createBackupBaseSecret(email1);
const secretUpper = await createBackupBaseSecret(emailUpper);
const secret2 = await createBackupBaseSecret(email2);
assert(secret1 === secretUpper, 'createBackupBaseSecret: deterministic and case-insensitive');
assert(secret1 !== secret2, 'createBackupBaseSecret: unique per email address');
assert(/^[A-Za-z0-9_-]+$/.test(secret1), 'createBackupBaseSecret: URL-safe base64 format');

// ============================================================================
// PART 2: DUAL RFC 5545 ICAL ENDPOINTS INSPECTION
// ============================================================================
console.log('\n--- PART 2: Dual RFC 5545 iCal Endpoints Inspection ---');

const subEndpointPath = path.join(REPO_ROOT, 'apps', 'app', 'src', 'pages', 'api', 'ical', 'subscriptions', '[token].ts');
const warEndpointPath = path.join(REPO_ROOT, 'apps', 'app', 'src', 'pages', 'api', 'ical', 'warranties', '[token].ts');

assert(fs.existsSync(subEndpointPath), 'apps/app/src/pages/api/ical/subscriptions/[token].ts exists');
assert(fs.existsSync(warEndpointPath), 'apps/app/src/pages/api/ical/warranties/[token].ts exists');

const subCode = fs.readFileSync(subEndpointPath, 'utf8');
const warCode = fs.readFileSync(warEndpointPath, 'utf8');

assert(subCode.includes("'Content-Type': 'text/calendar; charset=utf-8'"), 'Subscriptions Endpoint: returns Content-Type text/calendar; charset=utf-8');
assert(subCode.includes('generateSubscriptionsIcal'), 'Subscriptions Endpoint: invokes generateSubscriptionsIcal');
assert(subCode.includes('verifyIcalToken'), 'Subscriptions Endpoint: validates ical security tokens');

assert(warCode.includes("'Content-Type': 'text/calendar; charset=utf-8'"), 'Warranties Endpoint: returns Content-Type text/calendar; charset=utf-8');
assert(warCode.includes('generateWarrantiesIcal'), 'Warranties Endpoint: invokes generateWarrantiesIcal');
assert(warCode.includes('verifyIcalToken'), 'Warranties Endpoint: validates ical security tokens');

// ============================================================================
// PART 3: THEME ENGINE & CUSTOM DESIGN TOKEN PRESETS
// ============================================================================
console.log('\n--- PART 3: Theme Engine & Custom Design Token Presets ---');

assert(typeof BUILTIN_THEME_PRESETS === 'object', 'BUILTIN_THEME_PRESETS is exported');
assert('pine-coral' in BUILTIN_THEME_PRESETS, 'BUILTIN_THEME_PRESETS contains pine-coral');
assert('srh-copper' in BUILTIN_THEME_PRESETS, 'BUILTIN_THEME_PRESETS contains srh-copper');
assert('nordic-fjord' in BUILTIN_THEME_PRESETS, 'BUILTIN_THEME_PRESETS contains nordic-fjord');

// Mock DOM & localStorage for themeEngine
let mockHtmlAttributes = {};
let mockCssVars = {};
globalThis.document = {
  documentElement: {
    setAttribute: (attr, val) => { mockHtmlAttributes[attr] = val; },
    removeAttribute: (attr) => { delete mockHtmlAttributes[attr]; },
    getAttribute: (attr) => mockHtmlAttributes[attr],
    style: {
      setProperty: (prop, val) => { mockCssVars[prop] = val; },
      removeProperty: (prop) => { delete mockCssVars[prop]; }
    }
  }
};
globalThis.localStorage = {
  store: {},
  setItem: (k, v) => { globalThis.localStorage.store[k] = v; },
  getItem: (k) => globalThis.localStorage.store[k] ?? null,
  removeItem: (k) => { delete globalThis.localStorage.store[k]; }
};

setThemeMode('dark');
assert(mockHtmlAttributes['data-theme'] === 'dark', 'setThemeMode("dark"): sets data-theme="dark"');
assert(globalThis.localStorage.getItem('cmlab_theme_mode') === 'dark', 'setThemeMode("dark"): persists to localStorage');

setThemeMode('light');
assert(mockHtmlAttributes['data-theme'] === 'light', 'setThemeMode("light"): sets data-theme="light"');

setThemeMode('system');
assert(mockHtmlAttributes['data-theme'] === undefined, 'setThemeMode("system"): removes explicit data-theme');

// Test custom preset application
const copperPreset = BUILTIN_THEME_PRESETS['srh-copper'];
applyCustomDesignTokens(copperPreset.tokens);
assert(Object.keys(mockCssVars).length > 0, 'applyCustomDesignTokens: injects CSS custom properties');
assert(mockCssVars['--custom-brand-primary'] === '#C12D00', 'applyCustomDesignTokens: correct primary color token injected');

resetCustomDesignTokens();
assert(Object.keys(mockCssVars).length === 0, 'resetCustomDesignTokens: cleans up custom properties');

// Test W3C DTCG JSON parser
const dtcgJson = {
  color: {
    brand: {
      primary: { $value: '#2F524C', $type: 'color' }
    }
  }
};
const parsed = parseCustomDesignTokens(dtcgJson);
assert(parsed['--color-brand-primary'] === '#2F524C', 'parseCustomDesignTokens: converts nested W3C DTCG node to CSS variable');

// ============================================================================
// PART 4: MOBILE SAFARI CAMERA & SECURITY HEADERS
// ============================================================================
console.log('\n--- PART 4: Mobile Safari Camera & Security Headers ---');

const headersPath = path.join(REPO_ROOT, 'apps', 'app', 'public', '_headers');
assert(fs.existsSync(headersPath), 'apps/app/public/_headers exists');

const headersContent = fs.readFileSync(headersPath, 'utf8');
assert(headersContent.includes('Permissions-Policy: camera=(self)'), 'public/_headers: Permissions-Policy allows camera=(self)');
assert(!headersContent.includes('require-corp'), 'public/_headers: Omits Cross-Origin-Embedder-Policy: require-corp (Mobile Safari canvas protection)');

// ============================================================================
// PART 5: ONBOARDING & STATIC VECTOR FALLBACK
// ============================================================================
console.log('\n--- PART 5: Onboarding & Static Vector Fallback ---');

const onboardingPath = path.join(REPO_ROOT, 'apps', 'app', 'src', 'components', 'onboarding', 'OnboardingModal.svelte');
const fallbackPath = path.join(REPO_ROOT, 'apps', 'app', 'src', 'components', '3d', 'StaticVectorFallback.svelte');

assert(fs.existsSync(onboardingPath), 'OnboardingModal.svelte exists');
assert(fs.existsSync(fallbackPath), 'StaticVectorFallback.svelte exists');

const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');
assert(onboardingContent.includes('cmlab_onboarding_completed'), 'OnboardingModal: references cmlab_onboarding_completed in localStorage');
assert(onboardingContent.includes('prefers-reduced-motion'), 'OnboardingModal: queries prefers-reduced-motion media query');
assert(onboardingContent.includes('<StaticVectorFallback'), 'OnboardingModal: conditionally renders StaticVectorFallback');

const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
assert(fallbackContent.includes('fallback-svg'), 'StaticVectorFallback: renders SVG graphics');
assert(fallbackContent.includes('role="img"'), 'StaticVectorFallback: has role="img" accessibility tag');
assert(fallbackContent.includes('BGB'), 'StaticVectorFallback: displays BGB statutory protections');

// ============================================================================
// PART 6: ZERO STUDENT ATTRIBUTION CHECK
// ============================================================================
console.log('\n--- PART 6: Zero Student Attribution Check ---');

const studentNames = ['Khant', 'Jeet', 'Moji'];
let studentAttributionFound = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.astro'].includes(entry.name)) {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.svelte') || entry.name.endsWith('.astro'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const name of studentNames) {
        if (content.toLowerCase().includes(name.toLowerCase())) {
          console.error(`Attribution leak found in ${fullPath}: ${name}`);
          studentAttributionFound = true;
        }
      }
    }
  }
}

scanDir(path.join(REPO_ROOT, 'apps', 'app', 'src'));
assert(!studentAttributionFound, 'Zero Student Attribution: no personal student names exist in apps/app/src');

console.log('\n' + '='.repeat(80));
console.log(`  SUMMARY: ${testResults.passed}/${testResults.total} tests passed (${Math.round((testResults.passed / testResults.total) * 100)}%)`);
console.log('='.repeat(80));

if (testResults.failed > 0) {
  process.exit(1);
}
