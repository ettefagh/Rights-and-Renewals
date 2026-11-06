import { describe, it, expect } from 'vitest';
import {
  calculateWerbungskosten,
  calculateAnnualTaxSummary,
  isBmf2022SofortabschreibungEligible,
  STBERG_SAFE_HARBOR_DE,
  STBERG_SAFE_HARBOR_EN,
} from '../src/tax/werbungskostenEngine.js';
import {
  generateElsterCsv,
  formatGermanNumber,
  escapeCsvField,
} from '../src/tax/elsterCsvCompiler.js';
import type { WalletItem } from '../src/types/contracts.js';

describe('werbungskostenEngine & elsterCsvCompiler - BMF 2022 & BFH GrS 1/06', () => {
  const baseHardwareItem: WalletItem = {
    id: 'item-pc',
    title: 'ThinkPad T14 Laptop',
    category: 'hardware',
    brandSlug: 'lenovo',
    merchantOrProvider: 'CampusPoint',
    purchaseDate: '2026-10-15',
    expiryDate: '2028-10-15',
    priceGrossEur: 1200.0,
    isTaxDeductible: true,
    taxCategory: 'arbeitsmittel',
    beruflicheNutzungProzent: 50,
    status: 'active',
    searchTokens: ['thinkpad'],
    hasProofOfPurchase: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('TAX-01 & TAX-06: evaluates BMF 2022 100% write-off and 50% pro-rata allocation', () => {
    const result = calculateWerbungskosten(baseHardwareItem);
    expect(result.sofortabschreibungEligible).toBe(true);
    expect(result.writeOffType).toBe('SOFORTABSCHREIBUNG_1_JAHR');
    expect(result.deductibleAmountEur).toBe(600.0);
    expect(result.legalBasis).toContain('BMF 22.02.2022');
  });

  it('TAX-02: evaluates software 100% immediate write-off under BMF 2022 Rn. 5', () => {
    const softwareItem: WalletItem = {
      ...baseHardwareItem,
      id: 'item-sw',
      title: 'JetBrains All Products Pack',
      taxCategory: 'software_saas',
      priceGrossEur: 249.0,
      beruflicheNutzungProzent: 100,
    };
    const result = calculateWerbungskosten(softwareItem);
    expect(result.sofortabschreibungEligible).toBe(true);
    expect(result.deductibleAmountEur).toBe(249.0);
    expect(result.statutoryBasis).toContain('Anwendersoftware');
  });

  it('TAX-03: evaluates smartphone GWG threshold (€952 gross ceiling)', () => {
    const cheapPhone = isBmf2022SofortabschreibungEligible(
      'arbeitsmittel',
      'iPhone 13 mini',
      850.0
    );
    expect(cheapPhone.eligible).toBe(true);
    expect(cheapPhone.writeOffType).toBe('GWG_SOFORTABSCHREIBUNG');

    const expensivePhone = isBmf2022SofortabschreibungEligible(
      'arbeitsmittel',
      'iPhone 16 Pro Max',
      1449.0
    );
    expect(expensivePhone.eligible).toBe(false);
    expect(expensivePhone.writeOffType).toBe('LINEARE_AFA_MEHRJAEHRIG');
  });

  it('TAX-04: evaluates office furniture GWG threshold', () => {
    const cheapDesk = isBmf2022SofortabschreibungEligible(
      'arbeitsmittel',
      'IKEA Schreibtisch',
      450.0
    );
    expect(cheapDesk.eligible).toBe(true);
    expect(cheapDesk.writeOffType).toBe('GWG_SOFORTABSCHREIBUNG');

    const expensiveDesk = isBmf2022SofortabschreibungEligible(
      'arbeitsmittel',
      'Ergonomischer Bürostuhl Premium',
      1200.0
    );
    expect(expensiveDesk.eligible).toBe(false);
    expect(expensiveDesk.writeOffType).toBe('LINEARE_AFA_MEHRJAEHRIG');
  });

  it('TAX-05: applies 100% deduction when professional use is >= 90% per BFH GrS 1/06', () => {
    const monitorItem: WalletItem = {
      ...baseHardwareItem,
      id: 'item-mon',
      title: 'LG UltraWide 29" Monitor',
      priceGrossEur: 249.0,
      beruflicheNutzungProzent: 90,
    };

    const result = calculateWerbungskosten(monitorItem);
    expect(result.effectiveDeductiblePercent).toBe(100);
    expect(result.deductibleAmountEur).toBe(249.0); // 100%
  });

  it('TAX-07: applies 0% deduction when professional use is < 10% per BFH GrS 1/06', () => {
    const casualItem: WalletItem = {
      ...baseHardwareItem,
      id: 'item-game',
      priceGrossEur: 1000.0,
      beruflicheNutzungProzent: 8,
    };

    const result = calculateWerbungskosten(casualItem);
    expect(result.effectiveDeductiblePercent).toBe(0);
    expect(result.deductibleAmountEur).toBe(0.0);
  });

  it('evaluates non-deductible items cleanly', () => {
    const nonDeductibleItem: WalletItem = {
      ...baseHardwareItem,
      isTaxDeductible: false,
    };
    const result = calculateWerbungskosten(nonDeductibleItem);
    expect(result.isDeductible).toBe(false);
    expect(result.deductibleAmountEur).toBe(0);
  });

  it('TAX-08 & TAX-09: computes annual tax summary and lump sum exceedance', () => {
    const items: WalletItem[] = [
      {
        ...baseHardwareItem,
        id: 'item-1',
        priceGrossEur: 2000.0,
        beruflicheNutzungProzent: 100, // €2000
      },
    ];

    const summaryMaster = calculateAnnualTaxSummary(
      items,
      2026,
      'WERBUNGSKOSTEN_N'
    );
    expect(summaryMaster.totalGrossEur).toBe(2000.0);
    expect(summaryMaster.totalDeductibleEur).toBe(2000.0);
    expect(summaryMaster.exceedsLumpSum).toBe(true); // > €1230
    expect(summaryMaster.lossCarryforwardEligible).toBe(true);
    expect(summaryMaster.differenceFromLumpSumEur).toBe(770.0);
    expect(summaryMaster.safeHarborDisclaimer).toBe(STBERG_SAFE_HARBOR_DE);

    const summaryBachelor = calculateAnnualTaxSummary(
      items,
      2026,
      'SONDERAUSGABEN'
    );
    expect(summaryBachelor.lossCarryforwardEligible).toBe(false);
  });

  it('TAX-10, TAX-11 & TAX-12: generates ELSTER CSV with UTF-8 BOM, semicolons, German commas, and safe harbor', () => {
    const items: WalletItem[] = [
      {
        ...baseHardwareItem,
        id: '1',
        title: 'Sony WH-1000XM4 Headset',
        priceGrossEur: 279.0,
        beruflicheNutzungProzent: 50,
        receiptSha256: '8f4b2c9a',
      },
    ];

    const csv = generateElsterCsv(items, 2026);
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    expect(csv).toContain(
      'Position;Kaufdatum;Bezeichnung_Arbeitsmittel;Haendler_Anbieter'
    );
    expect(csv).toContain('139,50'); // German comma decimal
    expect(csv).toContain('Steuerrechtlicher Hinweis (§§ 2, 3, 5 StBerG)');
  });

  it('escapes CSV fields properly', () => {
    expect(escapeCsvField('normal text')).toBe('normal text');
    expect(escapeCsvField('semi;colon')).toBe('"semi;colon"');
    expect(escapeCsvField('quote "test"')).toBe('"quote ""test"""');
    expect(formatGermanNumber(1234.56)).toBe('1234,56');
  });
});
