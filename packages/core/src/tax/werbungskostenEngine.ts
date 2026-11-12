/**
 * werbungskostenEngine.ts - German Income Tax Engine (§ 9 EStG, BMF 22.02.2022, BFH GrS 1/06)
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import type { WalletItem, TaxCategory } from '../types/contracts.js';

export type StudentTaxRegime = 'WERBUNGSKOSTEN_N' | 'SONDERAUSGABEN';

export type WriteOffType =
  | 'SOFORTABSCHREIBUNG_1_JAHR'
  | 'GWG_SOFORTABSCHREIBUNG'
  | 'LINEARE_AFA_MEHRJAEHRIG';

export interface TaxCalculationResult {
  itemId: string;
  isDeductible: boolean;
  taxCategory: TaxCategory;
  grossPriceEur: number;
  workUsagePercent: number; // 0-100
  effectiveDeductiblePercent: number; // 0, u, or 100 (BFH GrS 1/06)
  deductibleAmountEur: number;
  writeOffType: WriteOffType;
  sofortabschreibungEligible: boolean;
  statutoryBasis: string;
  legalBasis: string;
  fiscalYear: number;
  hasProof: boolean;
  receiptSha256?: string | undefined;
}

export interface AnnualTaxSummary {
  fiscalYear: number;
  regime: StudentTaxRegime;
  totalGrossEur: number;
  totalDeductibleEur: number;
  lumpSumThresholdEur: number; // 1230.00 EUR (Arbeitnehmer-Pauschbetrag)
  exceedsLumpSum: boolean;
  differenceFromLumpSumEur: number;
  lossCarryforwardEligible: boolean; // true for WERBUNGSKOSTEN_N
  items: TaxCalculationResult[];
  safeHarborDisclaimer: string;
}

export const STBERG_SAFE_HARBOR_DE =
  'Steuerrechtlicher Hinweis (§§ 2, 3, 5 StBerG): „Warranty & Subscription Wallet“ dient ausschließlich als ' +
  'technisches Organisations- und Belegarchivierungswerkzeug zur Vorbereitung Ihrer persönlichen Unterlagen. ' +
  'Die dargestellten Kategorisierungen (z. B. Werbungskosten nach § 9 EStG, Sonderausgaben nach § 10 Abs. 1 Nr. 7 EStG ' +
  'sowie Hinweise auf das BMF-Schreiben vom 22.02.2022, BStBl I 2022 S. 187) stellen allgemeine unverbindliche ' +
  'Gesetzesinformationen dar und begründen keine geschäftsmäßige Hilfeleistung in Steuersachen oder individuelle ' +
  'Steuerberatung gemäß §§ 2, 3, 5 Steuerberatungsgesetz (StBerG).';

export const STBERG_SAFE_HARBOR_EN =
  'Tax Regulatory Notice (§§ 2, 3, 5 StBerG): "Warranty & Subscription Wallet" operates strictly as a ' +
  'technical receipt organization and archiving utility for personal record preparation. All category tags provide ' +
  'general statutory reference information only and do not constitute individualized tax advice or commercial assistance ' +
  'in tax matters under §§ 2, 3, 5 of the German Tax Advisory Act (Steuerberatungsgesetz — StBerG).';

/**
 * Checks whether an item qualifies for BMF 22.02.2022 1-year immediate write-off (100% in purchase year).
 */
export function isBmf2022SofortabschreibungEligible(
  category?: TaxCategory,
  title = '',
  priceGrossEur = 0
): { eligible: boolean; writeOffType: WriteOffType; statutoryBasis: string } {
  const normTitle = title.toLowerCase();

  // Software is 100% immediate under BMF 22.02.2022 Rn. 5
  if (category === 'software_saas') {
    return {
      eligible: true,
      writeOffType: 'SOFORTABSCHREIBUNG_1_JAHR',
      statutoryBasis:
        '§ 9 Abs. 1 S. 3 Nr. 6 EStG i.V.m. BMF 22.02.2022 Rn. 5 (Anwendersoftware)',
    };
  }

  // Fachliteratur is 100% immediate under § 9 Abs. 1 S. 3 Nr. 6 EStG
  if (category === 'fachliteratur') {
    return {
      eligible: true,
      writeOffType: 'SOFORTABSCHREIBUNG_1_JAHR',
      statutoryBasis: '§ 9 Abs. 1 S. 3 Nr. 6 EStG (Fachliteratur)',
    };
  }

  // Check computer hardware under BMF 22.02.2022 Rn. 3
  const isComputerHardware =
    /\b(notebook|laptop|macbook|thinkpad|desktop|pc|computer|tablet|ipad|galaxy tab|monitor|display|dock|hub|tastatur|keyboard|maus|mouse|headset|kopfh|audio|printer|drucker|scanner|ssd|speicher|festplatte)\b/i.test(
      normTitle
    );

  const isExcludedFromBmf =
    /\b(smartphone|iphone|galaxy s\d|pixel \d|schreibtisch|desk|stuhl|chair|b\u00fcrostuhl)\b/i.test(
      normTitle
    );

  if (category === 'arbeitsmittel' && isComputerHardware && !isExcludedFromBmf) {
    return {
      eligible: true,
      writeOffType: 'SOFORTABSCHREIBUNG_1_JAHR',
      statutoryBasis:
        '§ 9 Abs. 1 S. 3 Nr. 6 EStG i.V.m. BMF 22.02.2022 (BStBl I S. 187)',
    };
  }

  // Excluded or non-PC items: check €952 gross (€800 net) GWG threshold (§ 6 Abs. 2 EStG)
  if (priceGrossEur <= 952.0) {
    return {
      eligible: true,
      writeOffType: 'GWG_SOFORTABSCHREIBUNG',
      statutoryBasis:
        '§ 9 Abs. 1 S. 3 Nr. 7 i.V.m. § 6 Abs. 2 EStG (GWG bis 800 EUR netto)',
    };
  }

  // Multi-year AfA required
  return {
    eligible: false,
    writeOffType: 'LINEARE_AFA_MEHRJAEHRIG',
    statutoryBasis: '§ 9 Abs. 1 S. 3 Nr. 7 i.V.m. § 7 Abs. 1 EStG (lineare AfA)',
  };
}

/**
 * Calculates Werbungskosten tax deductibility for a single WalletItem under § 9 EStG and BFH GrS 1/06.
 */
export function calculateWerbungskosten(item: WalletItem): TaxCalculationResult {
  const isDeductible = Boolean(item.isTaxDeductible);
  const taxCategory = item.taxCategory ?? 'arbeitsmittel';
  const grossPriceEur = item.priceGrossEur ?? 0;
  const rawUsage = item.beruflicheNutzungProzent ?? 50;
  const workUsagePercent = Math.max(0, Math.min(100, rawUsage));
  const fiscalYear = parseInt(item.purchaseDate.split('-')[0] ?? '1970', 10);

  if (!isDeductible) {
    return {
      itemId: item.id,
      isDeductible: false,
      taxCategory,
      grossPriceEur,
      workUsagePercent: 0,
      effectiveDeductiblePercent: 0,
      deductibleAmountEur: 0,
      writeOffType: 'SOFORTABSCHREIBUNG_1_JAHR',
      sofortabschreibungEligible: false,
      statutoryBasis: 'Nicht als steuerlich abzugsfähig markiert',
      legalBasis: 'Nicht als steuerlich abzugsfähig markiert',
      fiscalYear,
      hasProof: Boolean(item.hasProofOfPurchase),
      receiptSha256: item.receiptSha256,
    };
  }

  // BFH GrS 1/06 3-Tier Split
  let effectivePercent = 0;
  if (workUsagePercent >= 90) {
    effectivePercent = 100; // >=90% => 100% (private co-use <=10% disregarded)
  } else if (workUsagePercent >= 10) {
    effectivePercent = workUsagePercent; // 10-89% => pro-rata
  } else {
    effectivePercent = 0; // <10% => non-deductible
  }

  const deductibleAmountEur =
    Math.round(((grossPriceEur * effectivePercent) / 100) * 100) / 100;
  const { eligible, writeOffType, statutoryBasis } =
    isBmf2022SofortabschreibungEligible(
      taxCategory,
      item.title,
      grossPriceEur
    );

  return {
    itemId: item.id,
    isDeductible: true,
    taxCategory,
    grossPriceEur,
    workUsagePercent,
    effectiveDeductiblePercent: effectivePercent,
    deductibleAmountEur,
    writeOffType,
    sofortabschreibungEligible: eligible,
    statutoryBasis,
    legalBasis: statutoryBasis,
    fiscalYear,
    hasProof: Boolean(item.hasProofOfPurchase),
    receiptSha256: item.receiptSha256,
  };
}

/**
 * Calculates annual tax summary across an array of items for a given fiscal year.
 */
export function calculateAnnualTaxSummary(
  items: WalletItem[],
  fiscalYear: number,
  regime: StudentTaxRegime = 'WERBUNGSKOSTEN_N'
): AnnualTaxSummary {
  const filtered = items.filter((item) => {
    const year = parseInt(item.purchaseDate.split('-')[0] ?? '1970', 10);
    return year === fiscalYear && item.isTaxDeductible;
  });

  const results = filtered.map(calculateWerbungskosten);
  const totalGrossEur = results.reduce((acc, r) => acc + r.grossPriceEur, 0);
  const totalDeductibleEur = results.reduce(
    (acc, r) => acc + r.deductibleAmountEur,
    0
  );
  const lumpSum = 1230.0; // Arbeitnehmer-Pauschbetrag

  return {
    fiscalYear,
    regime,
    totalGrossEur: Math.round(totalGrossEur * 100) / 100,
    totalDeductibleEur: Math.round(totalDeductibleEur * 100) / 100,
    lumpSumThresholdEur: lumpSum,
    exceedsLumpSum: totalDeductibleEur > lumpSum,
    differenceFromLumpSumEur:
      Math.round((totalDeductibleEur - lumpSum) * 100) / 100,
    lossCarryforwardEligible: regime === 'WERBUNGSKOSTEN_N',
    items: results,
    safeHarborDisclaimer: STBERG_SAFE_HARBOR_DE,
  };
}
