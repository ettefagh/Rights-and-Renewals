import type { PolicyWikiEntry } from '@cmlab/core';

type ClaimArgs = Record<string, unknown>;

type ClaimResult = { value: Record<string, unknown> } | { error: string };

const isPlainDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const dateDe = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;

export function generateClaimDossier(args: ClaimArgs, brands: ReadonlyMap<string, PolicyWikiEntry>, now = new Date()): ClaimResult {
  const issueType = args.issue_type === undefined ? 'statutory_defect_claim' : args.issue_type;
  if (issueType !== 'statutory_defect_claim' && issueType !== 'contract_cancellation') {
    return { error: 'issue_type must be statutory_defect_claim or contract_cancellation' };
  }
  for (const key of ['brand_slug', 'service_slug', 'item_name', 'contract_name', 'contract_reference', 'purchase_date', 'defect_description'] as const) {
    if (args[key] !== undefined && typeof args[key] !== 'string') return { error: `${key} must be a string` };
  }

  const rawSlug = args.brand_slug ?? args.service_slug;
  if (!isText(rawSlug)) return { error: 'brand_slug or service_slug is required' };
  const slug = rawSlug.trim().toLowerCase();
  const brand = brands.get(slug);
  const brandName = brand?.brandName || slug.charAt(0).toUpperCase() + slug.slice(1);
  if (issueType === 'contract_cancellation') {
    const contractName = args.contract_name ?? args.item_name;
    if (!isText(contractName)) return { error: 'contract_name or item_name is required' };
    const reference = isText(args.contract_reference) ? args.contract_reference.trim() : undefined;
    const dossier = [
      'ORDENTLICHE KÜNDIGUNG EINES VERBRAUCHERVERTRAGS', '',
      `Anbieter: ${brandName}`, `Vertrag: ${contractName.trim()}`,
      ...(reference ? [`Vertragsreferenz: ${reference}`] : []), '',
      `Hiermit kündige ich den oben bezeichneten Vertrag ordentlich zum nächstmöglichen vertraglich zulässigen Zeitpunkt. Bitte bestätigen Sie mir den Eingang dieser Kündigung und den Beendigungszeitpunkt in Textform.`, '',
      '§ 312k BGB regelt unter seinen gesetzlichen Voraussetzungen die Kündigungsschaltfläche im elektronischen Geschäftsverkehr und die Bestätigung einer Kündigung.', '',
      'Dieses Schreiben erklärt eine gewöhnliche ordentliche Kündigung zum nächstmöglichen vertraglich zulässigen Zeitpunkt. Bitte prüfen Sie Vertragsdaten und Kündigungsfrist.', '',
      'Automatisiert erstellt; keine Rechtsberatung.'
    ].join('\n');
    return {
      value: {
        valid: true,
        status: 'draft',
        issue_type: issueType,
        brand_name: brandName,
        contract_name: contractName.trim(),
        ...(reference ? { contract_reference: reference } : {}),
        statutory_basis: [],
        source_scope: '§ 312k concerns the online cancellation process for covered contracts. The contract and applicable law determine the ordinary notice period and effective date.',
        sources: [{ title: 'BGB § 312k — online cancellation', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }],
        dossier_text_de: dossier,
      },
    };
  }

  if (!isText(args.item_name)) return { error: 'item_name is required for statutory_defect_claim' };
  if (!isText(args.purchase_date) || !isPlainDate(args.purchase_date)) return { error: 'purchase_date must be a valid ISO 8601 calendar date (YYYY-MM-DD)' };
  if (!isText(args.defect_description)) return { error: 'defect_description is required for statutory_defect_claim' };

  const purchaseDateStr = args.purchase_date;
  const defectDesc = args.defect_description.trim();
  const pDate = new Date(`${purchaseDateStr}T00:00:00Z`);
  const targetYear = pDate.getUTCFullYear() + 1;
  const cliffDate = new Date(pDate);
  if (pDate.getUTCMonth() === 1 && pDate.getUTCDate() === 29) {
    const leap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    cliffDate.setUTCFullYear(targetYear, 1, leap ? 29 : 28);
  } else cliffDate.setUTCFullYear(targetYear);
  const isWithinCliff = now.getTime() <= cliffDate.getTime();
  const legalClause = isWithinCliff
    ? 'Die Vermutung nach § 477 Abs. 1 BGB kann greifen, wenn sich der Mangel innerhalb eines Jahres seit Gefahrübergang zeigt und die übrigen Voraussetzungen erfüllt sind.'
    : 'Die regelmäßige Frist für Mängelansprüche bei Waren beträgt nach § 438 Abs. 1 Nr. 3 BGB zwei Jahre ab Ablieferung. Bitte prüfen Sie die Frist und welche Nachweise erforderlich sind.';
  const dossier = [
    'MÄNGELRÜGE GEMÄSS § 437 BGB', '', `Gegenstand: ${args.item_name.trim()} (${brandName})`,
    `Kaufdatum: ${dateDe(pDate)}`, `Datum der Mängelanzeige: ${dateDe(now)}`, '',
    'Mangelbeschreibung:', defectDesc, '', 'Rechtliche Grundlage:', legalClause, '',
    'Aufforderung zur Nacherfüllung:',
    'Hiermit fordere ich Sie auf, binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Neulieferung oder Nachbesserung (§ 439 Abs. 1 BGB) zu veranlassen.', '',
    'Bitte ergänzen Sie vor dem Versand das Datum der Ablieferung und den Zeitpunkt, zu dem sich der Mangel erstmals gezeigt hat.', '',
    '--------------------------------------------------------------------------------',
    'Automatisiert erstellt; keine Rechtsberatung.'
  ].join('\n');
  return {
    value: {
      valid: true,
      status: 'draft',
      issue_type: issueType,
      item_name: args.item_name.trim(),
      brand_name: brandName,
      statutory_basis: ['BGB § 434', 'BGB § 437', 'BGB § 438', 'BGB § 439', 'BGB § 477'],
      burden_of_proof: isWithinCliff ? 'seller' : 'consumer',
      cliff_date: cliffDate.toISOString().split('T')[0],
      timing_note: 'Estimate from purchase date. Actual delivery and first appearance of the defect determine whether § 477 applies.',
      dossier_text_de: dossier,
      lexfox_safe_harbor_certified: false,
    },
  };
}

const slugFields = { anyOf: [{ required: ['brand_slug'] }, { required: ['service_slug'] }] };
export const claimDossierDescription = 'Draft a German goods-defect notice or an ordinary contract cancellation. The draft requires review before sending.';
export const claimDossierInputSchema = {
  type: 'object',
  properties: {
    brand_slug: { type: 'string', minLength: 1, description: 'Brand or provider identifier' },
    service_slug: { type: 'string', minLength: 1, description: 'Alias for brand_slug' },
    item_name: { type: 'string', minLength: 1, description: 'Product name, or a legacy alias for contract_name' },
    contract_name: { type: 'string', minLength: 1, description: 'Name of the contract to cancel' },
    contract_reference: { type: 'string', description: 'Optional contract reference' },
    purchase_date: { type: 'string', format: 'date', description: 'Purchase date for a goods-defect notice' },
    defect_description: { type: 'string', minLength: 1, description: 'Factual defect description for a goods-defect notice' },
    issue_type: {
      type: 'string',
      enum: ['statutory_defect_claim', 'contract_cancellation'],
      default: 'statutory_defect_claim',
    },
  },
  allOf: [
    slugFields,
    {
      if: { required: ['issue_type'], properties: { issue_type: { const: 'contract_cancellation' } } },
      then: { anyOf: [{ required: ['contract_name'] }, { required: ['item_name'] }] },
      else: { required: ['item_name', 'purchase_date', 'defect_description'] },
    },
  ],
};
