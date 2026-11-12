/**
 * elsterCsvCompiler.ts - 12-Column ELSTER / WISO / Taxfix CSV Exporter
 * Semicolon delimited with UTF-8 BOM (\uFEFF) and StBerG Safe Harbor
 */

import type { WalletItem } from '../types/contracts.js';
import {
  calculateWerbungskosten,
  STBERG_SAFE_HARBOR_DE,
} from './werbungskostenEngine.js';

export function formatGermanNumber(num: number): string {
  return num.toFixed(2).replace('.', ',');
}

export function escapeCsvField(field: string): string {
  if (field.includes(';') || field.includes('"') || field.includes('\n')) {
    return `"${field.replaceAll('"', '""')}"`;
  }
  return field;
}

/**
 * Generates an ELSTER/WISO compatible CSV string with UTF-8 BOM (\uFEFF) and safe-harbor footer.
 */
export function generateElsterCsv(
  items: WalletItem[],
  fiscalYear: number
): string {
  const matchingItems = items.filter((item) => {
    const year = parseInt(item.purchaseDate.split('-')[0] ?? '1970', 10);
    return year === fiscalYear && item.isTaxDeductible;
  });

  const headers = [
    'Position',
    'Kaufdatum',
    'Bezeichnung_Arbeitsmittel',
    'Haendler_Anbieter',
    'Steuerkategorie_EStG',
    'Bruttopreis_EUR',
    'Beruflicher_Anteil_Prozent',
    'Abzugsfaehiger_Betrag_EUR',
    'Abschreibungsart',
    'Rechtsgrundlage',
    'Beleg_Vorhanden',
    'GoBD_Receipt_SHA256',
  ];

  const rows: string[] = [];
  rows.push(headers.join(';'));

  matchingItems.forEach((item, index) => {
    const calc = calculateWerbungskosten(item);
    const row = [
      (index + 1).toString(),
      escapeCsvField(item.purchaseDate),
      escapeCsvField(item.title),
      escapeCsvField(item.merchantOrProvider),
      escapeCsvField(calc.taxCategory),
      formatGermanNumber(calc.grossPriceEur),
      calc.workUsagePercent.toString(),
      formatGermanNumber(calc.deductibleAmountEur),
      escapeCsvField(calc.writeOffType),
      escapeCsvField(calc.statutoryBasis),
      calc.hasProof ? 'JA' : 'NEIN',
      calc.receiptSha256 ?? 'KEIN_BELEG',
    ];
    rows.push(row.join(';'));
  });

  // Append safe harbor notice as commented line or trailing metadata
  rows.push('');
  rows.push(`# ${escapeCsvField(STBERG_SAFE_HARBOR_DE)}`);

  // Prepend UTF-8 BOM (\uFEFF)
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}
