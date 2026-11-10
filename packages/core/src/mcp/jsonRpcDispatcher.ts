/**
 * packages/core/src/mcp/jsonRpcDispatcher.ts
 * Stateless JSON-RPC 2.0 MCP Dispatcher for CM-LAB Sovereign Consumer Rights Wallet
 * Exposes 4 Authoritative Read-Only Knowledge Tools (<200ms SLA, Zod -32602)
 */

import { z } from 'zod';
import type { PolicyWikiEntry } from '../types/contracts.js';
import { policySeedData } from '../data/policyWikiSeed.js';
import { getPolicyScope } from './policyScope.js';

// ============================================================================
// 1. JSON-RPC 2.0 & MCP Standard Type Definitions
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result: T;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

export type JsonRpcResponse<T = unknown> =
  | JsonRpcSuccessResponse<T>
  | JsonRpcErrorResponse;

export interface McpToolContent {
  type: 'text';
  text: string;
}

export interface McpToolCallResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ============================================================================
// 2. Strict Zod Input Schemas (.strict() enforces -32602 on extraneous params)
// ============================================================================

export const PolicyLookupInputSchema = z
  .object({
    service_slug: z.string().min(1).toLowerCase().trim(),
    category: z.enum(['hardware', 'subscription']),
    jurisdiction: z.enum(['DE', 'EU']).default('DE'),
  })
  .strict();

export type PolicyLookupInput = z.infer<typeof PolicyLookupInputSchema>;

export const StatutoryLawLookupInputSchema = z
  .object({
    statute_section: z.enum([
      '434',
      '437',
      '438',
      '439',
      '475e',
      '477',
      '309_nr_9',
      '312g',
      '312k',
      '355',
    ]),
    language: z.enum(['de', 'en']).default('de'),
  })
  .strict();

export type StatutoryLawLookupInput = z.infer<
  typeof StatutoryLawLookupInputSchema
>;

export const SubscriptionCategoryRulesInputSchema = z
  .object({
    contract_category: z.enum([
      'generic',
      'gym_fitness',
      'streaming_media',
      'saas_software',
      'telecom_mobile_internet',
      'press_news_subscription',
      'energy_utility',
    ]),
    contract_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const parsed = Date.parse(`${value}T00:00:00Z`);
        return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
      }, 'Must be a real calendar date')
      .optional(),
  })
  .strict();

export type SubscriptionCategoryRulesInput = z.infer<
  typeof SubscriptionCategoryRulesInputSchema
>;

export const TaxDeductibilityCheckInputSchema = z
  .object({
    asset_name: z.string().min(1),
    asset_category: z.enum([
      'computer_hardware',
      'peripherals',
      'software_saas',
      'subscription',
      'hardware',
      'acquired_business_software',
      'academic_literature',
      'smartphone',
      'office_furniture',
    ]),
    gross_price_eur: z.number().positive(),
    taxpayer_status: z
      .enum([
        'master_zweitstudium',
        'werkstudent_employee',
        'bachelor_erststudium',
      ])
      .default('werkstudent_employee'),
    academic_usage_percent: z.number().min(0).max(100).optional(),
  })
  .strict();

export type TaxDeductibilityCheckInput = z.infer<
  typeof TaxDeductibilityCheckInputSchema
>;

// ============================================================================
// 3. BGB references: scoped excerpts, summaries, and official source links
// ============================================================================

interface StatuteData {
  section: string;
  title: string;
  effectiveDate: string;
  durationMonths?: number;
  statutoryTextDe: string;
  statutoryTextEn: string;
  legalSummaryDe: string;
  legalSummaryEn: string;
  statutoryBasis: string[];
}

const STATUTES_REGISTRY: Record<string, StatuteData> = {
  '434': {
    section: 'BGB § 434',
    title: 'Sachmangel',
    effectiveDate: '2022-01-01 (EU-Warenkauf-Richtlinie 2019/771)',
    statutoryTextDe:
      'Die Sache ist frei von Sachmängeln, wenn sie bei Gefahrübergang den subjektiven Anforderungen, den objektiven Anforderungen und den Montageanforderungen dieser Vorschrift entspricht.',
    statutoryTextEn:
      'The thing is free from material defects if, at the time the risk passes, it complies with the subjective requirements, the objective requirements, and the installation requirements of this section.',
    legalSummaryDe:
      'Definiert den Sachmangel nach neuem Schuldrecht: Eine Ware ist mangelhaft, wenn sie nicht die vereinbarte Beschaffenheit aufweist, sich nicht für die gewöhnliche Verwendung eignet oder mangelhafte Montage-/Bedienungsanleitungen vorliegen.',
    legalSummaryEn:
      'Defines product defects under post-2022 German law: a product is defective if it deviates from agreed specs, fails objective durability standards, or lacks proper assembly instructions.',
    statutoryBasis: ['BGB § 434 Abs. 1–4', 'EU-Richtlinie 2019/771'],
  },
  '437': {
    section: 'BGB § 437',
    title: 'Rechte des Käufers bei Mängeln',
    effectiveDate: '2022-01-01',
    statutoryTextDe:
      'Ist die Sache mangelhaft, kann der Käufer, wenn die Voraussetzungen der folgenden Vorschriften vorliegen und soweit nicht ein anderes bestimmt ist, 1. nach § 439 Nacherfüllung verlangen, 2. nach den §§ 440, 323 und 326 Abs. 5 von dem Vertrag zurücktreten oder nach § 441 den Kaufpreis mindern und 3. nach den §§ 440, 280, 281, 283 und 311a Schadensersatz oder nach § 284 Ersatz vergeblicher Aufwendungen verlangen.',
    statutoryTextEn:
      'If the thing is defective, the buyer may, provided the conditions in the following provisions are met and unless otherwise provided, 1. demand subsequent performance under § 439, 2. rescind the contract under §§ 440, 323 and 326(5) or reduce the purchase price under § 441, and 3. claim damages or compensation for futile expenses.',
    legalSummaryDe:
      'Zentraler Rechtsbehelfskatalog: Der Käufer hat primär Anspruch auf Nacherfüllung (Reparatur oder Neulieferung gem. § 439). Erst nach Fristablauf oder Fehlschlag greifen Rücktritt, Minderung und Schadensersatz.',
    legalSummaryEn:
      'Primary legal remedy catalogue against seller: primary claim to remedy (repair or replacement under § 439). Secondary claims: rescission, price reduction, or damages.',
    statutoryBasis: ['BGB § 437 Nr. 1–3', 'BGB § 439', 'BGB § 440'],
  },
  '438': {
    section: 'BGB § 438 Abs. 1 Nr. 3',
    title: 'Verjährung der Mängelansprüche',
    effectiveDate: '2022-01-01',
    durationMonths: 24,
    statutoryTextDe:
      'Die in § 437 bezeichneten Ansprüche verjähren [...] im Übrigen in zwei Jahren. Die Verjährung beginnt bei Grundstücken mit der Übergabe, im Übrigen mit der Ablieferung der Sache.',
    statutoryTextEn:
      'The claims specified in § 437 become statute-barred [...] in two years. The limitation period begins with the delivery of the goods.',
    legalSummaryDe:
      'Gesetzliche Verjährungsfrist der Mängelhaftung beträgt 24 Monate ab Ablieferung der Ware. Im B2C-Verbrauchsgüterkauf ist eine Verkürzung vor Entstehung des Mangels unwirksam (§ 476 Abs. 1 BGB).',
    legalSummaryEn:
      'Statutory defect claims against the seller expire after 24 months from delivery. Contractual shortening prior to defect notification is void in consumer sales (§ 476 BGB).',
    statutoryBasis: ['BGB § 438 Abs. 1 Nr. 3', 'BGB § 476 Abs. 1'],
  },
  '439': {
    section: 'BGB § 439 Abs. 1 & 2',
    title: 'Nacherfüllung',
    effectiveDate: '2022-01-01',
    statutoryTextDe:
      'Der Käufer kann als Nacherfüllung nach seiner Wahl die Beseitigung des Mangels oder die Lieferung einer mangelfreien Sache verlangen. Der Verkäufer hat die zum Zwecke der Nacherfüllung erforderlichen Aufwendungen, insbesondere Transport-, Wege-, Arbeits- und Materialkosten zu tragen.',
    statutoryTextEn:
      'The buyer may, at their option, demand subsequent performance by remedying the defect or delivering goods free of defects. The seller must bear the expenses necessary for subsequent performance, in particular transport, travel, labor, and material costs.',
    legalSummaryDe:
      'Der Käufer wählt primär zwischen kostenloser Nachbesserung (Reparatur) oder Neulieferung. Der Verkäufer trägt 100% aller Transport-, Arbeits- und Materialkosten. Bei Neulieferung darf kein Nutzungsersatz gefordert werden (§ 475 Abs. 3 Satz 1 BGB).',
    legalSummaryEn:
      'The buyer holds primary choice between free repair or replacement. The seller bears 100% of transport, labor, and material costs. No usage compensation may be demanded for replacement units (§ 475(3) BGB).',
    statutoryBasis: ['BGB § 439 Abs. 1 & 2', 'BGB § 475 Abs. 3 Satz 1'],
  },
  '475e': {
    section: 'BGB § 475e Abs. 1 & 3',
    title: 'Sonderbestimmungen für die Verjährung',
    effectiveDate: '2022-01-01',
    durationMonths: 4,
    statutoryTextDe:
      'Hat sich ein Mangel innerhalb der Verjährungsfrist gezeigt, tritt die Verjährung nicht vor dem Ablauf von vier Monaten nach dem Zeitpunkt ein, in dem sich der Mangel erstmals gezeigt hat. Hat der Verbraucher die Ware zur Nacherfüllung [...] übergeben, tritt die Verjährung [...] nicht vor dem Ablauf von zwei Monaten nach dem Zeitpunkt ein, in dem die nachgebesserte oder ersetzte Ware übergeben wurde.',
    statutoryTextEn:
      'If a defect becomes apparent within the limitation period, the limitation shall not expire before the end of four months after the defect first became apparent. If the consumer handed over the goods for subsequent performance, the limitation period shall not expire before two months after the repaired or replaced goods were delivered.',
    legalSummaryDe:
      '4-monatige Ablaufhemmung: Zeigt sich ein Mangel kurz vor Ende der 24 Monate, verjährt der Anspruch frühestens 4 Monate nach Mangelanzeige. Nach Rückgabe reparierter/ersetzter Ware gilt eine 2-monatige Mindestablaufhemmung.',
    legalSummaryEn:
      '4-month suspension of limitation if defect appears near month 24; 2-month suspension after repaired/replaced goods are handed back to the consumer.',
    statutoryBasis: ['BGB § 475e Abs. 1', 'BGB § 475e Abs. 3'],
  },
  '477': {
    section: 'BGB § 477 Abs. 1 und 2',
    title: 'Beweislastumkehr',
    effectiveDate: '2022-01-01 (EU 2019/771)',
    durationMonths: 12,
    statutoryTextDe:
      'Auszug aus § 477 Abs. 1 BGB: Zeigt sich innerhalb eines Jahres seit Gefahrübergang ein von den Anforderungen nach § 434 oder § 475b abweichender Zustand der Ware, so wird vermutet, dass die Ware bereits bei Gefahrübergang mangelhaft war, es sei denn, diese Vermutung ist mit der Art der Ware oder des mangelhaften Zustands unvereinbar. Bei Waren mit digitalen Elementen gilt für dauerhaft bereitzustellende digitale Elemente zusätzlich die gesonderte Vermutung nach Absatz 2 (während der Bereitstellungsdauer oder innerhalb von zwei Jahren seit Gefahrübergang).',
    statutoryTextEn:
      'Unofficial translation of the relevant rule: If, within one year after risk passes, a condition of the goods deviating from the requirements in §§ 434 or 475b becomes apparent, it is presumed that the goods were already defective when risk passed, unless this presumption is incompatible with the nature of the goods or the defective condition. For goods with digital elements subject to continuous supply, subsection (2) provides a separate presumption during the supply period or within two years after risk passes.',
    legalSummaryDe:
      'Bei einem Verbrauchsgüterkauf wird für einen Zustand, der innerhalb eines Jahres ab Gefahrübergang sichtbar wird, grundsätzlich vermutet, dass er schon bei Gefahrübergang vorlag. Das gilt nicht, wenn die Vermutung mit der Art der Ware oder des Mangels unvereinbar ist. Absatz 2 enthält eine eigene, bis zu zwei Jahre beziehungsweise an die Bereitstellungsdauer anknüpfende Regel für bestimmte digitale Elemente. Keine pauschale Aussage für jeden Kauf oder jede Art von Mangel.',
    legalSummaryEn:
      'For a consumer goods sale, a qualifying non-conformity that becomes apparent within one year after risk passes is generally presumed to have existed at that time. The presumption does not apply where incompatible with the nature of the goods or defect. Subsection (2) has a distinct rule for certain continuously supplied digital elements. This is not a blanket rule for every purchase or defect.',
    statutoryBasis: ['BGB § 477 Abs. 1 und 2', 'BGB §§ 434, 475b'],
  },
  '309_nr_9': {
    section: 'BGB § 309 Nr. 9 lit. b',
    title:
      'Laufzeit bei Dauerschuldverhältnissen (Gesetz für faire Verbraucherverträge)',
    effectiveDate: '2022-03-01',
    durationMonths: 1,
    statutoryTextDe:
      'In Allgemeinen Geschäftsbedingungen ist unwirksam [...] eine den anderen Vertragsteil bindende Bestimmung über eine stillschweigende Verlängerung des Vertragsverhältnisses, es sei denn, das Vertragsverhältnis wird nur auf unbestimmte Zeit verlängert und dem anderen Vertragsteil wird das Recht eingeräumt, das verlängerte Vertragsverhältnis mit einer Frist von höchstens einem Monat zu kündigen.',
    statutoryTextEn:
      'In standard business terms, a provision is ineffective regarding a tacit renewal of the contract, unless the contract is only renewed for an indefinite period and the other party is granted the right to terminate the renewed contract with a notice period not exceeding one month.',
    legalSummaryDe:
      'Stillschweigende automatische Vertragsverlängerungen (z. B. Fitnessstudio, Streaming, Zeitschriften) um feste Zeiträume (12 Monate) sind für Verträge ab dem 01.03.2022 unwirksam. Verträge verlängern sich nur unbefristet und sind jederzeit mit max. 1 Monat Kündigungsfrist kündbar.',
    legalSummaryEn:
      'Tacit 12-month auto-renewals in consumer contracts concluded after 01.03.2022 are void under German law. Rollover contracts extend indefinitely with a maximum 1-month rolling cancellation notice period.',
    statutoryBasis: [
      'BGB § 309 Nr. 9 lit. b & c',
      'Gesetz für faire Verbraucherverträge (BGBl. I 2021 S. 3433)',
    ],
  },
  '312g': {
    section: 'BGB § 312g Abs. 1',
    title: 'Widerrufsrecht bei Fernabsatzverträgen',
    effectiveDate: '2014-06-13',
    durationMonths: 0,
    statutoryTextDe:
      'Dem Verbraucher steht bei außerhalb von Geschäftsräumen geschlossenen Verträgen und bei Fernabsatzverträgen ein Widerrufsrecht gemäß § 355 zu.',
    statutoryTextEn:
      'The consumer has a right of withdrawal under § 355 for off-premises contracts and distance contracts.',
    legalSummaryDe:
      'Verbrauchern steht bei Online-Käufen und Fernabsatzverträgen ein 14-tägiges gesetzliches Widerrufsrecht ohne Angabe von Gründen zu.',
    legalSummaryEn:
      'Grants consumers a 14-day statutory right of withdrawal without stating reasons for distance and online contracts.',
    statutoryBasis: [
      'BGB § 312g Abs. 1',
      'BGB § 355',
      'EU-Verbraucherrechte-Richtlinie 2011/83/EU',
    ],
  },
  '312k': {
    section: 'BGB § 312k Abs. 1 & 6',
    title:
      'Kündigung von Verbraucherverträgen im elektronischen Geschäftsverkehr (Kündigungsbutton)',
    effectiveDate: '2022-07-01',
    statutoryTextDe:
      'Zusammenfassung, kein Vollzitat: § 312k gilt, wenn eine Website Verbrauchern den Abschluss eines entgeltlichen Dauerschuldverhältnisses im elektronischen Geschäftsverkehr ermöglicht. Absatz 1 enthält Ausnahmen für Verträge mit gesetzlich ausschließlich strengerer Kündigungsform sowie Finanzdienstleistungen. Werden die erforderlichen Schaltflächen und die Bestätigungsseite nicht entsprechend Absatz 1 und 2 bereitgestellt, kann der Verbraucher den erfassten Vertrag nach Absatz 6 jederzeit ohne Einhaltung einer Kündigungsfrist kündigen; die Möglichkeit der außerordentlichen Kündigung bleibt davon unberührt.',
    statutoryTextEn:
      'Summary, not a verbatim quotation: Section 312k applies where a website enables consumers to conclude a paid continuing contract in electronic commerce. Subsection (1) excludes contracts for which the law requires a form stricter than text form for termination, and financial services. Under subsection (6), if the required cancellation buttons and confirmation page are not provided in accordance with subsections (1) and (2), the consumer may terminate the covered contract at any time without a notice period; the separate right to extraordinary termination remains unaffected.',
    legalSummaryDe:
      'Das Kündigungsbutton-Regime gilt nur bei erfülltem Anwendungsbereich des Absatzes 1. Es gibt gesetzliche Ausnahmen. Werden die erforderlichen Schaltflächen und die Bestätigungsseite nicht entsprechend Absatz 1 und 2 bereitgestellt, gewährt Absatz 6 für den erfassten Vertrag eine Kündigung jederzeit ohne Kündigungsfrist. Dieses gesetzliche Kündigungsrecht ist von einer außerordentlichen Kündigung aus anderem Rechtsgrund zu unterscheiden; beides hängt von Anwendungsbereich und Tatsachen ab.',
    legalSummaryEn:
      'The online cancellation-button regime applies only when subsection (1) is satisfied and is subject to statutory exclusions. If the required buttons and confirmation page are not provided in accordance with subsections (1) and (2), subsection (6) permits termination of the covered contract at any time without a notice period. This statutory right is distinct from extraordinary termination on another legal ground; scope and facts must be assessed.',
    statutoryBasis: ['BGB § 312k Abs. 1, 2, 6', 'EGBGB Art. 229 § 60'],
  },
  '355': {
    section: 'BGB § 355 Abs. 1 & 2',
    title: 'Widerrufsrecht bei Verbraucherverträgen',
    effectiveDate: '2014-06-13',
    durationMonths: 0,
    statutoryTextDe:
      'Wird einem Verbraucher durch Gesetz ein Widerrufsrecht [...] eingeräumt, so sind der Verbraucher und der Unternehmer an ihre auf den Abschluss des Vertrags gerichteten Willenserklärungen nicht mehr gebunden, wenn der Verbraucher seine Willenserklärung fristgerecht widerrufen hat. Die Widerrufsfrist beträgt 14 Tage.',
    statutoryTextEn:
      'If a statutory right of withdrawal is granted to a consumer, the consumer and the business are no longer bound by their declarations of intent to conclude the contract if the consumer has withdrawn in time. The withdrawal period is 14 days.',
    legalSummaryDe:
      'Allgemeine Ausübung des Widerrufsrechts: Löst den Vertrag rückwirkend auf. Frist beträgt 14 Tage ab Belehrung bzw. Warenerhalt. Rückzahlung hat innerhalb von 14 Tagen zu erfolgen (§ 357 BGB).',
    legalSummaryEn:
      'General withdrawal provisions: releases parties from contractual obligations. The withdrawal period is 14 days, and full refund must be provided within 14 days (§ 357 BGB).',
    statutoryBasis: ['BGB § 355 Abs. 1 & 2', 'BGB § 357'],
  },
};

// ============================================================================
// 4. Tool Handlers
// ============================================================================

export function handlePolicyLookup(input: PolicyLookupInput) {
  const slug = input.service_slug.toLowerCase().trim();
  const found = policySeedData.find(
    (entry) =>
      entry.brandSlug.toLowerCase() === slug ||
      entry.searchAliases.some((alias) => alias.toLowerCase() === slug)
  );
  const category = found?.category ?? input.category;
  const isHardware = category === 'hardware';
  const scope = getPolicyScope(category, found);

  return {
    ...scope,
    service_slug: found?.brandSlug ?? slug,
    brand_name: found?.brandName ?? slug.charAt(0).toUpperCase() + slug.slice(1),
    category,
    jurisdiction: input.jurisdiction,
    cancellation_button_url: isHardware ? null : found?.cancellationUrl ?? null,
    escalation_rma_url: isHardware ? found?.cancellationUrl ?? null : null,
    notes: found
      ? scope.notes
      : `Brand '${slug}' is not in the curated Top 20 student brands list. ${scope.legal_scope}`,
  };
}

export function handleStatutoryLawLookup(input: StatutoryLawLookupInput) {
  const item = STATUTES_REGISTRY[input.statute_section];
  if (!item) {
    throw new Error(
      `Statute section '${input.statute_section}' not found in registry.`
    );
  }

  const isEn = input.language === 'en';
  return {
    section: item.section,
    title: item.title,
    effective_date: item.effectiveDate,
    duration_months: item.durationMonths,
    statutory_text: isEn ? item.statutoryTextEn : item.statutoryTextDe,
    legal_summary: isEn ? item.legalSummaryEn : item.legalSummaryDe,
    statutory_basis: item.statutoryBasis,
    language: input.language,
    source: `https://www.gesetze-im-internet.de/bgb/__${input.statute_section === '309_nr_9' ? '309' : input.statute_section}.html`,
    text_status: input.statute_section === '477' && input.language === 'de'
      ? 'official-source excerpt with scope summary'
      : 'summary or unofficial translation; consult official German text',
    scope_note: input.statute_section === '477'
      ? 'Consumer-goods sale only; subsection (1) is subject to the statutory incompatibility exception. Subsection (2) separately addresses continuously supplied digital elements in goods with digital elements.'
      : input.statute_section === '309_nr_9'
        ? 'Controls standard terms within its statutory scope; it is not a universal rule for every subscription clause or individually negotiated term.'
      : input.statute_section === '312k'
          ? 'Applies when a website enables consumers to conclude a covered paid continuing contract in electronic commerce. Subsection (1) excludes financial services and contracts for which the law requires a form stricter than text form for termination.'
          : 'This result is limited to the cited provision; applicability depends on the contract, facts, and any statutory exceptions.',
    ...(input.statute_section === '477' ? { source_checked_on: '2026-11-10' } : {}),
  };
}

export function handleSubscriptionCategoryRules(
  input: SubscriptionCategoryRulesInput
) {
  const hasDate = Boolean(input.contract_start_date);
  const isPreReform = hasDate && (input.contract_start_date as string) < '2022-03-01';
  const renewalRule = isPreReform
    ? 'The contract predates 01.03.2022. Under EGBGB Art. 229 § 60, the earlier version of § 309 applies; assess the clause, any later amendment, and the facts individually.'
    : hasDate
      ? 'For a contract concluded on or after 01.03.2022, standard terms within § 309 No. 9 scope may not bind the consumer for more than two years initially. Tacit renewal may only be indefinite and terminable at any time on no more than one month’s notice; a longer notice period before expiry is prohibited. This category does not establish that a particular term is within scope or effective.'
      : 'If the contract was concluded on or after 01.03.2022, standard terms within § 309 No. 9 scope may not bind the consumer for more than two years initially. Tacit renewal may only be indefinite and terminable at any time on no more than one month’s notice; a longer notice period before expiry is prohibited. Supply the conclusion date and assess the clause and scope before applying this rule.';

  return {
    category: input.contract_category,
    max_initial_term_months: input.contract_category === 'generic' ? null : 24,
    automatic_renewal_rule: renewalRule,
    max_cancellation_notice_period_days: null,
    cancellation_button_mandatory: null,
    governing_statutes: ['BGB § 309 Nr. 9', 'BGB § 312k'],
    dark_pattern_alert: 'This category lookup cannot determine whether a design or contract term violates the law. Assess the applicable statute, contract, interface and facts.',
    contract_start_date: input.contract_start_date ?? null,
    rule_scope: '§ 309 No. 9 governs specified standard terms for regularly recurring supplies or services; individual negotiation, statutory exclusions and the contract facts can change the result. § 312k concerns paid continuing contracts where a website enables consumers to conclude the contract in electronic commerce, subject to statutory exclusions. Under EGBGB Art. 229 § 60, § 312k duties also apply to obligations arising before 01.07.2022.',
    scope_note: 'The 24-month term cap and renewal restrictions are conditional on § 309 No. 9 applying to the standard term for regularly recurring goods or services. Individual negotiation, statutory exclusions and contract facts can change the result. § 312k concerns paid continuing contracts where a website enables consumers to conclude the contract in electronic commerce; subsection (1) excludes financial services and contracts for which law requires a stricter-than-text form for termination. EGBGB Art. 229 § 60 also applies § 312k duties to obligations arising before 01.07.2022.',
    ordinary_termination: 'Apply the contract and mandatory law to the facts. No individual termination date or entitlement is determined by this category lookup.',
    extraordinary_termination: 'No extraordinary termination entitlement is presumed. The § 312k(6) right to terminate at any time without notice is a distinct statutory remedy triggered when the required buttons and confirmation page are not provided in accordance with subsections (1) and (2); other extraordinary termination grounds require their own legal basis and facts.',
    sources: [
      { title: 'BGB § 309 No. 9 — standard terms', url: 'https://www.gesetze-im-internet.de/bgb/__309.html' },
      { title: 'BGB § 312k — online cancellation', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' },
      { title: 'EGBGB Art. 229 § 60 — transitional provision', url: 'https://www.gesetze-im-internet.de/bgbeg/art_229__60.html' },
    ],
  };
}

export function handleTaxDeductibilityCheck(
  input: TaxDeductibilityCheckInput
) {
  const sources = [
    { title: 'EStG § 9 — work-related expenses', url: 'https://www.gesetze-im-internet.de/estg/__9.html' },
    { title: 'BMF guidance of 22 February 2022 — scope of the one-year useful life', url: 'https://stberh.bundesfinanzministerium.de/esth/2022/C-Anhaenge/Anhang-01/V/anhang-1-V.html' },
  ];

  const usage = input.academic_usage_percent;
  const needsClassification = ['hardware', 'subscription', 'software_saas'].includes(input.asset_category);
  if (needsClassification || usage === undefined) {
    return {
      asset_name: input.asset_name,
      asset_category: input.asset_category,
      status: 'manual_review',
      is_deductible: false,
      governing_statute: '§ 9 Abs. 1 Satz 3 Nr. 6 EStG (Arbeitsmittel)',
      bmf_2022_eligible: false,
      bmf_decree_reference: null,
      depreciation_type: 'MANUAL_REVIEW',
      deductible_year: null,
      gross_price_eur: input.gross_price_eur,
      academic_usage_percent: input.academic_usage_percent ?? null,
      deductible_amount_eur: null,
      loss_carryforward_eligible: false,
      form_target: null,
      sources,
      review_reason: input.asset_category === 'hardware'
        ? 'Generic hardware does not identify a covered computer or peripheral. Check the asset type and documented work or study use.'
        : needsClassification
          ? 'A recurring subscription, including streaming or SaaS, does not establish an acquired software asset or a deductible work or study expense. Review the invoice, contract and documented use.'
          : 'Supply a documented work or study use percentage before estimating a deductible share.',
      notes:
        'Hinweis gem. §§ 2, 3, 5 StBerG: Dient ausschließlich der technischen Organisation und Belegdokumentation. Keine individuelle Steuerberatung oder geschäftsmäßige Hilfeleistung in Steuersachen.',
    };
  }

  let effectiveRatio = 0.0;
  let isDeductible = false;

  // BFH GrS 1/06 3-Tier Allocation
  if (usage >= 90) {
    effectiveRatio = 1.0;
    isDeductible = true;
  } else if (usage >= 10) {
    effectiveRatio = usage / 100.0;
    isDeductible = true;
  } else {
    effectiveRatio = 0.0;
    isDeductible = false;
  }

  const deductibleAmountEur =
    Math.round(input.gross_price_eur * effectiveRatio * 100) / 100;

  // BMF 22.02.2022 evaluation
  const isDigitalBmf = [
    'computer_hardware',
    'peripherals',
    'acquired_business_software',
  ].includes(input.asset_category);
  const isGwg = input.gross_price_eur <= 952.0;

  let bmf2022Eligible = false;
  let bmfDecreeReference: string | null = null;
  let depreciationType = 'LINEAR_STANDARD';
  let deductibleYear = 'Year of purchase in full';

  if (isDigitalBmf) {
    bmf2022Eligible = true;
    bmfDecreeReference =
      'BMF IV C 3 - S 2190/21/10002 :025 vom 22.02.2022 (BStBl I 2022 S. 187)';
    depreciationType = 'ONE_YEAR_USEFUL_LIFE_BMF';
    deductibleYear = 'One-year useful life under the BMF guidance; this does not itself establish an immediate deduction.';
  } else if (input.asset_category === 'academic_literature') {
    depreciationType = 'SOFORTABSCHREIBUNG_SOFORTAUFWAND';
    deductibleYear = 'Year of purchase in full (current operating expense)';
  } else if (input.asset_category === 'smartphone') {
    if (isGwg) {
      depreciationType = 'GWG_SOFORTABSCHREIBUNG';
      deductibleYear =
        'Year of purchase in full (§ 6 Abs. 2 EStG <= €952.00 gross)';
    } else {
      depreciationType = 'LINEAR_5_YEARS';
      deductibleYear =
        'Depreciated over 5 years pro-rata temporis (Amtliche AfA-Tabelle)';
    }
  } else if (input.asset_category === 'office_furniture') {
    if (isGwg) {
      depreciationType = 'GWG_SOFORTABSCHREIBUNG';
      deductibleYear =
        'Year of purchase in full (§ 6 Abs. 2 EStG <= €952.00 gross)';
    } else {
      depreciationType = 'LINEAR_13_YEARS';
      deductibleYear =
        'Depreciated over 13 years pro-rata temporis (Amtliche AfA-Tabelle)';
    }
  }

  // Taxpayer status determination
  const isMasterOrEmployee =
    input.taxpayer_status === 'master_zweitstudium' ||
    input.taxpayer_status === 'werkstudent_employee';
  const governingStatute = isMasterOrEmployee
    ? '§ 9 Abs. 1 Satz 3 Nr. 6 EStG (Werbungskosten)'
    : '§ 10 Abs. 1 Nr. 7 EStG (Sonderausgaben - max €6,000/yr)';

  const formTarget = isMasterOrEmployee
    ? 'Anlage N (Zeile 46-48 Arbeitsmittel)'
    : 'Anlage Sonderausgaben (Zeile 13-14 Ausbildungskosten)';

  const lossCarryforwardEligible =
    input.taxpayer_status === 'master_zweitstudium';

  return {
    asset_name: input.asset_name,
    asset_category: input.asset_category,
    status: 'review_required',
    is_deductible: isDeductible,
    governing_statute: governingStatute,
    bmf_2022_eligible: bmf2022Eligible,
    bmf_decree_reference: bmfDecreeReference,
    depreciation_type: depreciationType,
    deductible_year: deductibleYear,
    gross_price_eur: input.gross_price_eur,
    academic_usage_percent: input.academic_usage_percent ?? null,
    deductible_amount_eur: deductibleAmountEur,
    loss_carryforward_eligible: lossCarryforwardEligible,
    form_target: formTarget,
    sources,
    notes:
      'Hinweis gem. §§ 2, 3, 5 StBerG: Dient ausschließlich der technischen Organisation und Belegdokumentation. Keine individuelle Steuerberatung oder geschäftsmäßige Hilfeleistung in Steuersachen.',
  };
}

// ============================================================================
// 5. MCP Tool Definitions (JSON Schema Draft-07)
// ============================================================================

export function listMcpTools(): McpToolDefinition[] {
  return [
    {
      name: 'policy_lookup',
      description:
        'Look up cataloged German consumer policies and scoped statutory references for goods purchases or subscriptions.',
      inputSchema: {
        type: 'object',
        properties: {
          service_slug: {
            type: 'string',
            description:
              "Standardized lowercase brand identifier (e.g., 'apple', 'sony', 'spotify', 'fitx', 'adobe', 'mediamarkt').",
          },
          category: {
            type: 'string',
            enum: ['hardware', 'subscription'],
            description:
              'Target domain: physical hardware or recurring subscription.',
          },
          jurisdiction: {
            type: 'string',
            enum: ['DE', 'EU'],
            default: 'DE',
            description: 'Governing legal jurisdiction.',
          },
        },
        required: ['service_slug', 'category'],
        additionalProperties: false,
      },
    },
    {
      name: 'statutory_law_lookup',
      description:
      'Look up scoped German Civil Code (BGB) consumer-law excerpts and summaries with links to official statutory sources.',
      inputSchema: {
        type: 'object',
        properties: {
          statute_section: {
            type: 'string',
            enum: [
              '434',
              '437',
              '438',
              '439',
              '475e',
              '477',
              '309_nr_9',
              '312g',
              '312k',
              '355',
            ],
            description: 'Specific BGB section code to retrieve.',
          },
          language: {
            type: 'string',
            enum: ['de', 'en'],
            default: 'de',
            description: 'Output language for statutory analysis and summary.',
          },
        },
        required: ['statute_section'],
        additionalProperties: false,
      },
    },
    {
      name: 'subscription_category_rules',
      description:
        'Query statutory cancellation restrictions, maximum contract durations, and notice periods for consumer contracts under the German Fair Consumer Contracts Act (Gesetz für faire Verbraucherverträge / BGB § 309 Nr. 9 & § 312k).',
      inputSchema: {
        type: 'object',
        properties: {
          contract_category: {
            type: 'string',
            enum: [
              'generic',
              'gym_fitness',
              'streaming_media',
              'saas_software',
              'telecom_mobile_internet',
              'press_news_subscription',
              'energy_utility',
            ],
            description: 'Category of recurring consumer contract.',
          },
          contract_start_date: {
            type: 'string',
            format: 'date',
            description:
              'ISO 8601 contract conclusion date (YYYY-MM-DD); required to assess the § 309 No. 9 transition on 01.03.2022.',
          },
        },
        required: ['contract_category'],
        additionalProperties: false,
      },
    },
  ];
}

// ============================================================================
// 6. Primary Dispatcher Function: dispatchJsonRpc
// ============================================================================

export async function dispatchJsonRpc(
  request: unknown
): Promise<JsonRpcResponse> {
  // Validate request structure
  if (
    typeof request !== 'object' ||
    request === null ||
    (request as Record<string, unknown>).jsonrpc !== '2.0' ||
    typeof (request as Record<string, unknown>).method !== 'string'
  ) {
    return {
      jsonrpc: '2.0',
      id:
        ((request as Record<string, unknown>)?.id as
          | string
          | number
          | null) ?? null,
      error: {
        code: -32600,
        message:
          'Invalid Request: Object must be JSON-RPC 2.0 with a string method property.',
      },
    };
  }

  const req = request as JsonRpcRequest;
  const requestId = req.id ?? null;

  try {
    switch (req.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false,
              },
            },
            serverInfo: {
              name: 'cm-lab-mcp-server',
              version: '1.0.0',
            },
          },
        };
      }

      case 'notifications/initialized': {
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: { status: 'acknowledged' },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            tools: listMcpTools(),
          },
        };
      }

      case 'tools/call': {
        const params = req.params;
        if (!params || typeof params !== 'object') {
          return {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32602,
              message:
                'Invalid params: Expected object with "name" and "arguments".',
            },
          };
        }

        const toolName = params.name as string | undefined;
        const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

        if (!toolName || typeof toolName !== 'string') {
          return {
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32602,
              message: 'Invalid params: "name" must be a non-empty string.',
            },
          };
        }

        let toolResultData: unknown;

        switch (toolName) {
          case 'policy_lookup': {
            const parsed = PolicyLookupInputSchema.safeParse(toolArgs);
            if (!parsed.success) {
              return {
                jsonrpc: '2.0',
                id: requestId,
                error: {
                  code: -32602,
                  message: `Invalid params for policy_lookup: ${parsed.error.issues
                    .map((i) => `${i.path.join('.')}: ${i.message}`)
                    .join(', ')}`,
                  data: parsed.error.issues,
                },
              };
            }
            toolResultData = handlePolicyLookup(parsed.data);
            break;
          }

          case 'statutory_law_lookup': {
            const parsed = StatutoryLawLookupInputSchema.safeParse(toolArgs);
            if (!parsed.success) {
              return {
                jsonrpc: '2.0',
                id: requestId,
                error: {
                  code: -32602,
                  message: `Invalid params for statutory_law_lookup: ${parsed.error.issues
                    .map((i) => `${i.path.join('.')}: ${i.message}`)
                    .join(', ')}`,
                  data: parsed.error.issues,
                },
              };
            }
            toolResultData = handleStatutoryLawLookup(parsed.data);
            break;
          }

          case 'subscription_category_rules': {
            const parsed =
              SubscriptionCategoryRulesInputSchema.safeParse(toolArgs);
            if (!parsed.success) {
              return {
                jsonrpc: '2.0',
                id: requestId,
                error: {
                  code: -32602,
                  message: `Invalid params for subscription_category_rules: ${parsed.error.issues
                    .map((i) => `${i.path.join('.')}: ${i.message}`)
                    .join(', ')}`,
                  data: parsed.error.issues,
                },
              };
            }
            toolResultData = handleSubscriptionCategoryRules(parsed.data);
            break;
          }

          default: {
            return {
              jsonrpc: '2.0',
              id: requestId,
              error: {
                code: -32602,
                message: `Invalid params: Unknown tool "${toolName}". Supported tools: policy_lookup, statutory_law_lookup, subscription_category_rules.`,
              },
            };
          }
        }

        const mcpResult: McpToolCallResult = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResultData),
            },
          ],
          isError: false,
        };

        return {
          jsonrpc: '2.0',
          id: requestId,
          result: mcpResult,
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32601,
            message: `Method not found: "${req.method}". Supported methods: initialize, notifications/initialized, tools/list, tools/call.`,
          },
        };
      }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: 'Internal error while processing JSON-RPC request.',
        data: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
