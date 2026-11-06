import { describe, it, expect } from 'vitest';
import * as Core from '../src/index.js';

describe('packages/core - Barrel Exports (index.ts)', () => {
  it('re-exports all canonical classes, functions, and constants', () => {
    // 1. Crypto
    expect(typeof Core.generateVaultKey).toBe('function');
    expect(typeof Core.encryptReceiptBlob).toBe('function');
    expect(typeof Core.decryptReceiptBlob).toBe('function');
    expect(typeof Core.computeSha256Hex).toBe('function');
    expect(typeof Core.getOrCreateMasterKey).toBe('function');
    expect(typeof Core.bufferToHex).toBe('function');
    expect(typeof Core.hexToBytes).toBe('function');
    expect(Core.GoBDIntegrityError).toBeDefined();

    // 2. DB
    expect(Core.vaultDb).toBeDefined();
    expect(Core.WalletDatabase).toBeDefined();
    expect(typeof Core.saveWalletItemWithReceiptAndAlarms).toBe('function');
    expect(typeof Core.replaceOrDeleteReceiptAtomically).toBe('function');
    expect(typeof Core.deleteWalletItemCascade).toBe('function');
    expect(typeof Core.purgeOrphanReceiptBlobs).toBe('function');

    // 3. Search
    expect(Core.PrefixTrie).toBeDefined();

    // 4. Alerts
    expect(typeof Core.computeWallClockEpoch).toBe('function');
    expect(typeof Core.addDays).toBe('function');
    expect(typeof Core.subtractDays).toBe('function');
    expect(typeof Core.addMonthsCalendar).toBe('function');
    expect(typeof Core.computeAlertSchedule).toBe('function');

    // 5. Legal
    expect(Core.LEXFOX_SAFE_HARBOR_DE).toBeDefined();
    expect(Core.LEXFOX_SAFE_HARBOR_EN).toBeDefined();
    expect(typeof Core.isGermanPublicHoliday).toBe('function');
    expect(typeof Core.isWerktag).toBe('function');
    expect(typeof Core.rollForwardWerktag).toBe('function');
    expect(typeof Core.calculateRemedyDeadline).toBe('function');
    expect(typeof Core.selectTemplate).toBe('function');
    expect(typeof Core.compileBgbNotice).toBe('function');

    // 6. Tax
    expect(Core.STBERG_SAFE_HARBOR_DE).toBeDefined();
    expect(Core.STBERG_SAFE_HARBOR_EN).toBeDefined();
    expect(typeof Core.isBmf2022SofortabschreibungEligible).toBe('function');
    expect(typeof Core.calculateWerbungskosten).toBe('function');
    expect(typeof Core.calculateAnnualTaxSummary).toBe('function');
    expect(typeof Core.formatGermanNumber).toBe('function');
    expect(typeof Core.escapeCsvField).toBe('function');
    expect(typeof Core.generateElsterCsv).toBe('function');

    // 7. Media
    expect(typeof Core.compilePlaintextDossier).toBe('function');
    expect(typeof Core.compilePdfDossier).toBe('function');

    // 8. MCP
    expect(typeof Core.dispatchJsonRpc).toBe('function');
    expect(typeof Core.listMcpTools).toBe('function');
    expect(typeof Core.handlePolicyLookup).toBe('function');
    expect(typeof Core.handleStatutoryLawLookup).toBe('function');
    expect(typeof Core.handleSubscriptionCategoryRules).toBe('function');
    expect(typeof Core.handleTaxDeductibilityCheck).toBe('function');
    expect(Core.PolicyLookupInputSchema).toBeDefined();
    expect(Core.StatutoryLawLookupInputSchema).toBeDefined();
    expect(Core.SubscriptionCategoryRulesInputSchema).toBeDefined();
    expect(Core.TaxDeductibilityCheckInputSchema).toBeDefined();

    // 9. Telemetry
    expect(typeof Core.formatWaeEvent).toBe('function');
    expect(typeof Core.recordEdgeMetric).toBe('function');

    // 10. Data
    expect(Array.isArray(Core.policySeedData)).toBe(true);
    expect(Core.policySeedData.length).toBe(20);
  });
});
