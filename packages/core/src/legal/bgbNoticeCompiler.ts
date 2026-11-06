/**
 * bgbNoticeCompiler.ts - Deterministic Statutory Notice Compiler (BGB §§ 187, 188, 193)
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import type {
  WalletItem,
  LegalTemplateId,
  ItemCategory,
} from '../types/contracts.js';
import { addDays, addMonthsCalendar } from '../alerts/AlertScheduler.js';

export type NoticeLanguage = 'de' | 'en';
export type RemedyChoice = 'repair' | 'replacement' | 'unspecified';
export type NoticeIssueType =
  | 'defect_claim'
  | 'contract_cancellation'
  | 'cooling_off_revocation';

export interface ConsumerParty {
  name?: string;
  fullName?: string;
  address: string;
  email: string;
}

export interface MerchantParty {
  name: string;
  contactEndpoint?: string;
  address?: string;
  email?: string;
}

export interface NoticeCompilationParams {
  item?: WalletItem;
  templateId?: LegalTemplateId; // Auto-selected if omitted
  language?: NoticeLanguage; // Default 'de'
  consumer: ConsumerParty;
  merchant: MerchantParty;
  itemName?: string;
  purchaseDate?: string; // YYYY-MM-DD
  priceEur?: number;
  contractOrSerialNumber?: string;
  defectDescription?: string;
  preferredRemedy?: RemedyChoice; // Default 'unspecified'
  hasProofOfPurchase?: boolean;
  receiptSha256?: string;
  proofType?: string; // Default: 'Kaufbeleg'
  noticeDate?: string; // Default today in Europe/Berlin
  category?: ItemCategory;
  cancellationButtonCompliant?: boolean; // Default true
  issueType?: NoticeIssueType;
}

export interface CompiledLegalNotice {
  templateId: LegalTemplateId;
  language: NoticeLanguage;
  title: string;
  subject: string;
  text: string; // Notice text in selected language with safe-harbor footer
  textDe: string; // German notice text with safe-harbor footer
  textEn: string; // English notice text with safe-harbor footer
  noticeDate: string;
  remedyDeadlineDate?: string | undefined;
  statutoryBasis: string[];
  safeHarborDisclaimer: string;
  receiptSha256?: string | undefined;
}

export const LEXFOX_SAFE_HARBOR_DE =
  'Rechtlicher Hinweis (Legal-Tech Safe Harbor): Dieses Schreiben wurde durch das Software-Werkzeug ' +
  '„Warranty & Subscription Wallet“ rein schematisch und deterministisch anhand der vom Nutzer eingegebenen Sachverhaltsdaten ' +
  'erstellt. Es handelt sich um ein technisches Dokumentations- und Formulierungswerkzeug im Sinne der Rechtsprechung ' +
  'des Bundesgerichtshofs (BGH, Urteil vom 27.11.2019 – VIII ZR 285/18) und stellt keine individuelle Rechtsberatung ' +
  'oder Rechtsdienstleistung gemäß §§ 2, 3 RDG (Rechtsdienstleistungsgesetz) dar.';

export const LEXFOX_SAFE_HARBOR_EN =
  'Regulatory Notice (Legal-Tech Safe Harbor): This document was compiled deterministically from ' +
  'user-supplied factual inputs by the "Warranty & Subscription Wallet" organizational software tool in accordance ' +
  'with German Federal Court of Justice jurisprudence (BGH VIII ZR 285/18). It does not constitute individualized legal ' +
  'assessment or legal advice under §§ 2, 3 of the German Legal Services Act (RDG).';

/**
 * Computes Easter Sunday for a given year using Anonymous Gregorian algorithm.
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Checks whether an ISO date string is a German nationwide public holiday.
 */
export function isGermanPublicHoliday(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] ?? '1970', 10);
  const m = parseInt(parts[1] ?? '01', 10);
  const d = parseInt(parts[2] ?? '01', 10);

  // Fixed holidays
  if (m === 1 && d === 1) return true; // Neujahr
  if (m === 5 && d === 1) return true; // Tag der Arbeit
  if (m === 10 && d === 3) return true; // Tag der Deutschen Einheit
  if (m === 12 && d === 25) return true; // 1. Weihnachtstag
  if (m === 12 && d === 26) return true; // 2. Weihnachtstag

  // Movable holidays based on Easter
  const easter = getEasterSunday(y);
  const easterDate = new Date(Date.UTC(y, easter.month - 1, easter.day));

  const offsetMatch = (days: number) => {
    const target = new Date(easterDate.getTime() + days * 86400000);
    return target.getUTCMonth() + 1 === m && target.getUTCDate() === d;
  };

  if (offsetMatch(-2)) return true; // Karfreitag (Good Friday)
  if (offsetMatch(1)) return true; // Ostermontag (Easter Monday)
  if (offsetMatch(39)) return true; // Christi Himmelfahrt (Ascension)
  if (offsetMatch(50)) return true; // Pfingstmontag (Whit Monday)

  return false;
}

/**
 * Checks whether an ISO date string is a Werktag under BGB § 193 (Mon-Fri and not holiday).
 */
export function isWerktag(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] ?? '1970', 10);
  const m = parseInt(parts[1] ?? '01', 10);
  const d = parseInt(parts[2] ?? '01', 10);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Sunday or Saturday
  return !isGermanPublicHoliday(dateStr);
}

/**
 * Rolls date forward to the next Werktag under BGB § 193.
 */
export function rollForwardWerktag(dateStr: string): string {
  let current = dateStr;
  while (!isWerktag(current)) {
    current = addDays(current, 1);
  }
  return current;
}

/**
 * Calculates statutory cure deadline: noticeDate + 14 calendar days, rolled forward under BGB § 193.
 */
export function calculateRemedyDeadline(
  noticeDateStr: string,
  calendarDays = 14
): string {
  const rawTarget = addDays(noticeDateStr, calendarDays);
  return rollForwardWerktag(rawTarget);
}

/**
 * Selects template deterministically based on category, elapsed months, and cancellation compliance.
 */
export function selectTemplate(params: NoticeCompilationParams): LegalTemplateId {
  if (params.templateId) return params.templateId;

  const category = params.item?.category ?? params.category ?? 'hardware';
  const noticeDate =
    params.noticeDate ?? new Date().toISOString().split('T')[0]!;
  const purchaseDate =
    params.item?.purchaseDate ?? params.purchaseDate ?? noticeDate;

  if (category === 'subscription') {
    if (params.issueType === 'cooling_off_revocation') return 'T5';
    // Check if within 14 days cooling-off period
    const d14 = addDays(purchaseDate, 14);
    if (noticeDate <= d14 && params.issueType !== 'contract_cancellation') {
      return 'T5';
    }
    if (params.cancellationButtonCompliant === false) return 'T4';
    return 'T3';
  }

  // Hardware: check 12-month cutoff (BGB § 477 Abs. 1)
  const d477 = addMonthsCalendar(purchaseDate, 12);
  if (noticeDate <= d477) {
    return 'T1';
  }
  return 'T2';
}

function getTemplateDefinition(templateId: LegalTemplateId): {
  title: string;
  subjectDe: string;
  subjectEn: string;
  bodyTemplateDe: string;
  bodyTemplateEn: string;
  statutoryBasis: string[];
} {
  switch (templateId) {
    case 'T1':
      return {
        title:
          'GESETZLICHE MÄNGELRÜGE & AUFFORDERUNG ZUR NACHERFÜLLUNG (§§ 437 Nr. 1, 439, 477 Abs. 1 BGB)',
        subjectDe:
          'Gesetzliche Mängelanzeige und Aufforderung zur Nacherfüllung gem. §§ 434, 437 Nr. 1, 439 BGB',
        subjectEn:
          'Statutory Warranty Notice of Non-Conformity (Mängelrüge) pursuant to §§ 434, 437 No. 1, 439 BGB',
        bodyTemplateDe: `# GESETZLICHE MÄNGELRÜGE & AUFFORDERUNG ZUR NACHERFÜLLUNG (§§ 437 Nr. 1, 439, 477 Abs. 1 BGB)

**Absender (Käufer / Verbraucher):**
{{consumer_full_name}}
{{consumer_address}}
E-Mail: {{consumer_email}}

**Empfänger (Verkäufer / Vertragshändler):**
{{merchant_name}}
Einreichungskanal / RMA-Endpunkt: {{merchant_contact_endpoint}}

**Datum:** {{notice_date}}
**Betreff:** Gesetzliche Mängelanzeige und Aufforderung zur Nacherfüllung gem. §§ 434, 437 Nr. 1, 439 BGB
**Kaufgegenstand:** {{item_name}}
**Kauf- / Lieferdatum:** {{purchase_date}} · **Kaufpreis:** {{price_eur}}
**Seriennummer / Bestell- bzw. Vertragsreferenz:** {{contract_or_serial_number}}

Sehr geehrte Damen und Herren,

am {{purchase_date}} habe ich bei Ihnen als Verbraucher (§ 13 BGB) den oben bezeichneten Kaufgegenstand **{{item_name}}** erworben. An der Kaufsache ist folgender Sachmangel im Sinne des § 434 BGB aufgetreten:

> {{defect_description}}

### 1. Gesetzliche Beweislastumkehr zugunsten des Verbrauchers (§ 477 Abs. 1 BGB)
Da sich der oben beschriebene Mangel innerhalb von **zwölf Monaten** seit Gefahrübergang gezeigt hat, greift die gesetzliche Vermutung des **§ 477 Abs. 1 Satz 1 BGB** (in Umsetzung der EU-Warenkauf-Richtlinie (EU) 2019/771). Es wird kraft Gesetzes vermutet, dass die Ware bereits im Zeitpunkt des Gefahrübergangs mangelhaft war. Eine Beweislast meinerseits für die Ursächlichkeit bei Übergabe besteht nicht.

### 2. Ausübung des Käufer-Wahlrechts auf kostenfreie Nacherfüllung (§ 439 Abs. 1–4, § 475 Abs. 3 BGB)
Hiermit mache ich meine gesetzlichen Gewährleistungsrechte unmittelbar gegenüber Ihnen als Verkäufer geltend (etwaige freiwillige Herstellergarantien nach § 443 BGB lassen Ihre gesetzliche Einstandspflicht gem. § 479 Abs. 1 BGB unberührt). Gemäß **§ 439 Abs. 1 BGB** wähle ich als Art der Nacherfüllung:
**{{preferred_remedy_de}}**.

Ich fordere Sie auf, die Nacherfüllung unverzüglich, spätestens jedoch bis zum **{{remedy_deadline_date}}** (14 Kalendertage), vollständig durchzuführen. Gemäß **§ 439 Abs. 2 BGB** haben Sie sämtliche zum Zwecke der Nacherfüllung erforderlichen Aufwendungen – insbesondere **Transport-, Versand-, Wege-, Arbeits- und Materialkosten** – zu tragen; bitte stellen Sie mir hierfür umgehend ein kostenfreies Rücksendeetikett zur Verfügung. Im Falle einer Ersatzlieferung schulde ich gem. **§ 475 Abs. 3 Satz 1 BGB** keinen Nutzungsersatz.

### 3. Kaufnachweis & Ablaufhemmung (§ 475e BGB)
{{proof_block_de}}
Vorsorglich weise ich auf den Eintritt der gesetzlichen Ablaufhemmung gem. **§ 475e Abs. 1 und Abs. 3 BGB** hin. Sollte die Nacherfüllung nicht fristgerecht erfolgen oder fehlschlagen, behalte ich mir ausdrücklich die Ausübung meiner weitergehenden gesetzlichen Rechte auf Rücktritt vom Kaufvertrag (§§ 437 Nr. 2, 323, 475d BGB), Kaufpreisminderung (§ 441 BGB) sowie Schadensersatz (§§ 437 Nr. 3, 280 BGB) vor.

Mit freundlichen Grüßen

{{consumer_full_name}}`,
        bodyTemplateEn: `# FORMAL STATUTORY NOTICE OF DEFECT & DEMAND FOR CURE (GERMAN BGB §§ 437(1), 439, 477(1))

**Sender (Buyer / Consumer):** {{consumer_full_name}}, {{consumer_address}} · Email: {{consumer_email}}
**Recipient (Seller / Merchant):** {{merchant_name}} ({{merchant_contact_endpoint}})
**Date:** {{notice_date}}
**Subject:** Statutory Warranty Notice of Non-Conformity (Mängelrüge) pursuant to §§ 434, 437 No. 1, 439 BGB
**Item:** {{item_name}} · **Purchase Date:** {{purchase_date}} · **Price:** {{price_eur}}
**Serial / Order Reference:** {{contract_or_serial_number}}

Dear Sir or Madam,

On {{purchase_date}}, I purchased **{{item_name}}** from you as a consumer (§ 13 BGB). The item exhibits the following material non-conformity within the meaning of § 434 BGB:

> {{defect_description}}

### 1. Statutory 12-Month Reversed Burden of Proof (§ 477(1) BGB / EU Directive 2019/771)
Because this defect manifested within **12 months** of delivery, **§ 477(1) sentence 1 BGB** establishes the statutory presumption that the goods were already defective at the time of delivery. The consumer bears no burden of proving the root cause existed at handover.

### 2. Buyer's Primary Choice of Free Cure (§ 439(1)–(4), § 475(3) BGB)
I hereby assert my mandatory statutory warranty rights directly against you as the seller (any voluntary manufacturer guarantee under § 443 BGB does not limit seller liability pursuant to § 479(1) BGB). Exercising my statutory election under **§ 439(1) BGB**, I request: **{{preferred_remedy_en}}**.

Please complete supplementary performance no later than **{{remedy_deadline_date}}** (14 calendar days). Pursuant to **§ 439(2) BGB**, you bear 100% of all necessary transport, return shipping, labor, and material costs; please provide a prepaid return label immediately. In the event of replacement, no compensation for prior use is owed (**§ 475(3) sentence 1 BGB**).

### 3. Proof of Purchase & Suspension of Expiry (§ 475e BGB)
{{proof_block_en}}
Take notice that statutory suspension of limitation applies under **§ 475e(1) and (3) BGB**. Should cure not be completed within the stated period, I reserve my statutory rights to contract rescission/refund (§§ 437 No. 2, 323, 475d BGB), price reduction (§ 441 BGB), and damages (§ 280 BGB).

Sincerely,
{{consumer_full_name}}`,
        statutoryBasis: [
          'BGB § 434',
          'BGB § 437 Nr. 1',
          'BGB § 439',
          'BGB § 475 Abs. 3',
          'BGB § 475e',
          'BGB § 477 Abs. 1',
        ],
      };

    case 'T2':
      return {
        title:
          'GESETZLICHE MÄNGELRÜGE INNERHALB DER 24-MONATIGEN GEWÄHRLEISTUNGSFRIST (§§ 437, 438 Abs. 1 Nr. 3, 475e BGB)',
        subjectDe:
          'Gesetzliche Mängelanzeige gem. §§ 434, 437 Nr. 1, 438 Abs. 1 Nr. 3, 439 BGB sowie Ablaufhemmung gem. § 475e BGB',
        subjectEn:
          'Statutory Defect Claim within 24-Month Warranty Window (§ 438(1) No. 3 BGB) & Suspension of Expiry (§ 475e BGB)',
        bodyTemplateDe: `# GESETZLICHE MÄNGELRÜGE INNERHALB DER 24-MONATIGEN GEWÄHRLEISTUNGSFRIST (§§ 437, 438 Abs. 1 Nr. 3, 475e BGB)

**Absender (Käufer / Verbraucher):**
{{consumer_full_name}}
{{consumer_address}}
E-Mail: {{consumer_email}}

**Empfänger (Verkäufer / Vertragshändler):**
{{merchant_name}}
Einreichungskanal / RMA-Endpunkt: {{merchant_contact_endpoint}}

**Datum:** {{notice_date}}
**Betreff:** Gesetzliche Mängelanzeige gem. §§ 434, 437 Nr. 1, 438 Abs. 1 Nr. 3, 439 BGB sowie Ablaufhemmung gem. § 475e BGB
**Kaufgegenstand:** {{item_name}}
**Kauf- / Lieferdatum:** {{purchase_date}} · **Kaufpreis:** {{price_eur}}
**Seriennummer / Bestell- bzw. Vertragsreferenz:** {{contract_or_serial_number}}

Sehr geehrte Damen und Herren,

am {{purchase_date}} habe ich bei Ihnen als Verbraucher (§ 13 BGB) den Kaufgegenstand **{{item_name}}** erworben. Innerhalb der laufenden **24-monatigen gesetzlichen Verjährungsfrist gem. § 438 Abs. 1 Nr. 3 BGB** ist an dem Gerät folgender Sachmangel im Sinne des § 434 Abs. 1 und Abs. 3 BGB (Abweichung von der objektiven Beschaffenheits- und Haltbarkeitserwartung) zutage getreten:

> {{defect_description}}

### 1. Sachmangelanlage & Unzulässigkeit eines Verweises auf abgelaufene Herstellergarantien
Das Gerät wurde ausschließlich bestimmungsgemäß und pfleglich genutzt; äußere Gewalteinwirkung, Sturz- oder Flüssigkeitsschäden liegen nicht vor, sodass der Ausfall auf einen bereits bei Gefahrübergang angelegten Material-, Fertigungs- oder Konstruktionsmangel zurückzuführen ist. Ich weise vorsorglich darauf hin, dass ein etwaiger Ablauf einer 12-monatigen freiwilligen Herstellergarantie (§ 443 BGB) Ihre zwingende 24-monatige gesetzliche Verkäuferhaftung gem. **§§ 437, 438 Abs. 1 Nr. 3, 476 Abs. 1 BGB** in keiner Weise verkürzt.

### 2. Gesetzliche Ablaufhemmung (§ 475e Abs. 1 und Abs. 3 BGB)
Da sich der Mangel innerhalb der regulären Verjährungsfrist gezeigt hat, tritt gemäß **§ 475e Abs. 1 BGB** eine gesetzliche Ablaufhemmung ein: Die Verjährung tritt keinesfalls vor Ablauf von **vier Monaten** nach dem Zeitpunkt ein, in dem sich der Mangel erstmals gezeigt hat. Übergebe ich Ihnen die Ware zur Prüfung oder Nacherfüllung, ist die Verjährung darüber hinaus gem. **§ 475e Abs. 3 BGB** bis zum Ablauf von zwei Monaten nach Rückgabe der geprüften oder nachgebesserten Sache gehemmt.

### 3. Aufforderung zur kostenfreien Nacherfüllung (§ 439 Abs. 1 und Abs. 2 BGB)
Gemäß **§ 439 Abs. 1 BGB** fordere ich Sie auf, bis spätestens zum **{{remedy_deadline_date}}** (14 Kalendertage) folgende Nacherfüllung vorzunehmen:
**{{preferred_remedy_de}}**.
Sämtliche Versand-, Transport-, Arbeits- und Materialkosten gehen gem. **§ 439 Abs. 2 BGB** zu Ihren Lasten; bitte übersenden Sie mir ein kostenfreies Rücksendeetikett.

### 4. Kaufnachweis & Vorbehalt weiterer Rechte
{{proof_block_de}}
Für den Fall des fruchtlosen Fristablaufs oder der endgültigen Verweigerung behalte ich mir Rücktritt (§§ 437 Nr. 2, 323, 475d BGB) und Minderung (§ 441 BGB) ausdrücklich vor.

Mit freundlichen Grüßen

{{consumer_full_name}}`,
        bodyTemplateEn: `# FORMAL STATUTORY NOTICE OF DEFECT WITHIN 24-MONTH LIMITATION PERIOD (BGB §§ 437, 438(1) No. 3, 475e)

**Sender (Buyer / Consumer):** {{consumer_full_name}}, {{consumer_address}} · Email: {{consumer_email}}
**Recipient (Seller / Merchant):** {{merchant_name}} ({{merchant_contact_endpoint}})
**Date:** {{notice_date}}
**Subject:** Statutory Defect Claim within 24-Month Warranty Window (§ 438(1) No. 3 BGB) & Suspension of Expiry (§ 475e BGB)
**Item:** {{item_name}} · **Purchase Date:** {{purchase_date}} · **Price:** {{price_eur}}
**Serial / Order Reference:** {{contract_or_serial_number}}

Dear Sir or Madam,

On {{purchase_date}}, I purchased **{{item_name}}** from you as a consumer (§ 13 BGB). Within the mandatory **24-month statutory limitation period under § 438(1) No. 3 BGB**, the following non-conformity in materials, workmanship, and objective durability (§ 434(1), (3) BGB) has manifested:

> {{defect_description}}

### 1. Inherent Defect & Non-Waivable Seller Liability
The device has been operated strictly within normal intended usage without external impact, drop, or liquid damage, indicating a latent manufacturing or component defect present at delivery. Please note that expiry of any voluntary 12-month manufacturer guarantee (§ 443 BGB) does not shorten your mandatory 24-month statutory seller liability (**§§ 437, 438(1) No. 3, 476(1) BGB**).

### 2. Statutory 4-Month Suspension of Expiry (§ 475e(1) & (3) BGB)
Because this defect manifested during the statutory limitation period, **§ 475e(1) BGB** suspends expiry such that limitation cannot occur earlier than **4 months** after initial manifestation. Furthermore, upon handover for inspection or repair, expiry remains suspended until **2 months** after return of the goods (**§ 475e(3) BGB**).

### 3. Demand for Free Supplementary Performance (§ 439(1) & (2) BGB)
Pursuant to **§ 439(1) BGB**, I demand completion of cure no later than **{{remedy_deadline_date}}** (14 calendar days) via: **{{preferred_remedy_en}}**. Under **§ 439(2) BGB**, all shipping, labor, and material costs are borne by you as seller; please issue a prepaid return label.

### 4. Proof of Purchase & Reservation of Remedies
{{proof_block_en}}
Should you fail to cure within the deadline, I reserve my statutory rights to contract rescission (§§ 437 No. 2, 323, 475d BGB) and price reduction (§ 441 BGB).

Sincerely,
{{consumer_full_name}}`,
        statutoryBasis: [
          'BGB § 434',
          'BGB § 437 Nr. 1',
          'BGB § 438 Abs. 1 Nr. 3',
          'BGB § 439',
          'BGB § 475e Abs. 1 & 3',
          'BGB § 476 Abs. 1',
        ],
      };

    case 'T3':
      return {
        title:
          'ORDENTLICHE VERTRAGSKÜNDIGUNG EINES DAUERSCHULDVERHÄLTNISSES (§ 309 Nr. 9 BGB)',
        subjectDe:
          'Fristgerechte Kündigung meines Abonnements / Vertrages „{{item_name}}“',
        subjectEn:
          'Formal Termination of Subscription / Membership "{{item_name}}"',
        bodyTemplateDe: `# ORDENTLICHE VERTRAGSKÜNDIGUNG EINES DAUERSCHULDVERHÄLTNISSES (§ 309 Nr. 9 BGB)

**Absender (Verbraucher):**
{{consumer_full_name}}
{{consumer_address}}
Registrierte Konto-E-Mail: {{consumer_email}}

**Empfänger (Vertragspartner / Diensteanbieter):**
{{merchant_name}}
Kündigungsportal / Kontakt: {{merchant_contact_endpoint}}

**Datum:** {{notice_date}}
**Betreff:** Fristgerechte Kündigung meines Abonnements / Vertrages „{{item_name}}“
**Kunden- / Vertragsnummer:** {{contract_or_serial_number}} · **Vertragsbeginn:** {{purchase_date}}

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen bestehenden Vertrag über **{{item_name}}** (Vertrags- bzw. Kontoreferenz: **{{contract_or_serial_number}}**) ordentlich und fristgerecht zum **nächstmöglichen gesetzlichen bzw. vertraglichen Beendigungszeitpunkt**.

### 1. Gesetzliche Höchstkündigungsfrist (§ 309 Nr. 9 BGB – Gesetz für faire Verbraucherverträge)
Für den Fall, dass sich der Vertrag nach Ablauf einer etwaigen Mindestvertragslaufzeit stillschweigend verlängert hat, mache ich von meinem gesetzlichen Recht gemäß **§ 309 Nr. 9 Buchstabe b und c BGB** Gebrauch, das Vertragsverhältnis jederzeit mit einer Frist von **höchstens einem Monat** zu kündigen. Entgegenstehende AGB-Klauseln über längere Verlängerungszeiträume oder Strafgebühren nach Ablauf der Erstlaufzeit sind gesetzlich unwirksam (§§ 307, 309 Nr. 9 BGB). Ergänzender Hinweis: {{defect_description}}

### 2. Widerruf der Einzugsermächtigung & Bestätigungspflicht (§ 312k Abs. 4 BGB)
Mit Wirksamwerden der Vertragsbeendigung widerrufe ich hiermit vorsorglich ein erteiltes SEPA-Lastschriftmandat bzw. die Berechtigung zur wiederkehrenden Belastung meines hinterlegten Zahlungsmittels (Kreditkarte / PayPal / App-Billing).

Bitte übermitteln Sie mir unverzüglich eine **Kündigungsbestätigung in Textform auf einem dauerhaften Datenträger** (E-Mail genügt, vgl. § 312k Abs. 4 BGB) unter ausdrücklicher Angabe des genauen Vertragsende-Datums. Von telefonischen oder schriftlichen Rückgewinnungsversuchen bitte ich abzusehen.

Mit freundlichen Grüßen

{{consumer_full_name}}`,
        bodyTemplateEn: `# FORMAL ORDINARY SUBSCRIPTION CANCELLATION NOTICE (GERMAN BGB § 309 No. 9)

**Sender (Consumer):** {{consumer_full_name}}, {{consumer_address}} · Account Email: {{consumer_email}}
**Recipient (Service Provider):** {{merchant_name}} ({{merchant_contact_endpoint}})
**Date:** {{notice_date}}
**Subject:** Formal Termination of Subscription / Membership "{{item_name}}"
**Contract / Account ID:** {{contract_or_serial_number}} · **Commencement Date:** {{purchase_date}}

Dear Sir or Madam,

I hereby formally terminate my subscription / membership contract for **{{item_name}}** (Reference: **{{contract_or_serial_number}}**) effective at the **earliest permissible statutory or contractual termination date**.

### 1. Maximum 1-Month Rolling Notice Period (§ 309 No. 9 BGB — Fair Consumer Contracts Act)
Where any initial commitment period has elapsed, I invoke my mandatory statutory right under **§ 309 No. 9(b) and (c) BGB** to terminate tacitly extended consumer contracts at any time subject to a **maximum notice period of one (1) month**. Any standard-form clauses imposing silent multi-month/annual lock-ins or post-initial-term early termination penalties are void under §§ 307, 309 No. 9 BGB. Note: {{defect_description}}

### 2. Revocation of Payment Mandate & Durable Confirmation (§ 312k(4) BGB)
Effective upon contract end, I revoke any SEPA direct-debit mandate or recurring billing authorization on file. Please send prompt written confirmation on a durable medium (email) specifying the exact termination effective date (§ 312k(4) BGB), and refrain from retention marketing contact.

Sincerely,
{{consumer_full_name}}`,
        statutoryBasis: [
          'BGB § 309 Nr. 9 lit. b & c',
          'BGB § 312k Abs. 4',
          'BGB § 307',
        ],
      };

    case 'T4':
      return {
        title:
          'AUSSERORDENTLICHE FRISTLOSE KÜNDIGUNG GEMÄSS § 312k Abs. 6 BGB (HILFSWEISE ORDENTLICHE KÜNDIGUNG)',
        subjectDe:
          'Sofortige fristlose Kündigung meines Vertrages „{{item_name}}“ gem. § 312k Abs. 6 BGB wegen Verstoßes gegen die Kündigungsbutton-Pflicht',
        subjectEn:
          'Immediate Termination Without Notice of "{{item_name}}" pursuant to § 312k(6) BGB (Non-Compliant Online Cancellation Button)',
        bodyTemplateDe: `# AUSSERORDENTLICHE FRISTLOSE KÜNDIGUNG GEMÄSS § 312k Abs. 6 BGB (HILFSWEISE ORDENTLICHE KÜNDIGUNG)

**Absender (Verbraucher):**
{{consumer_full_name}}
{{consumer_address}}
Registrierte Konto-E-Mail: {{consumer_email}}

**Empfänger (Vertragspartner / Diensteanbieter):**
{{merchant_name}}
Kontaktkanal: {{merchant_contact_endpoint}}

**Datum:** {{notice_date}}
**Betreff:** Sofortige fristlose Kündigung meines Vertrages „{{item_name}}“ gem. § 312k Abs. 6 BGB wegen Verstoßes gegen die Kündigungsbutton-Pflicht
**Kunden- / Vertragsnummer:** {{contract_or_serial_number}} · **Vertragsbeginn:** {{purchase_date}}

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen im elektronischen Geschäftsverkehr begründeten Verbrauchervertrag über **{{item_name}}** (Vertragsreferenz: **{{contract_or_serial_number}}**) **außerordentlich und fristlos mit sofortiger Wirkung gemäß § 312k Abs. 6 BGB**, hilfsweise ordentlich zum nächstmöglichen Zeitpunkt gem. § 309 Nr. 9 BGB.

### 1. Gesetzliches Recht zur jederzeitigen fristlosen Kündigung (§ 312k Abs. 1, 2 und 6 BGB)
Gemäß **§ 312k Abs. 1 und Abs. 2 BGB** sind Unternehmer, die auf einer Website den Abschluss von Verbraucherverträgen über Dauerschuldverhältnisse im elektronischen Geschäftsverkehr ermöglichen, gesetzlich verpflichtet, eine ständig verfügbare, unmittelbar und leicht zugängliche zweistufige Kündigungsschaltfläche (*„Verträge hier kündigen“* → Bestätigungsseite mit *„jetzt kündigen“* ohne vorgeschaltete Login-Hürde oder irreführende Dark Patterns) sowie eine sofortige elektronische Eingangsbestätigung auf dauerhaftem Datenträger (§ 312k Abs. 4 BGB) vorzuhalten.

Festgestellter Verstoß auf Ihrer Online-Präsenz am {{notice_date}}:
> {{defect_description}}

Da mir keine den zwingenden Vorgaben des § 312k Abs. 2 bis 4 BGB entsprechende Schaltfläche und Bestätigungsseite zur Verfügung gestellt wurde, bin ich gemäß **§ 312k Abs. 6 Satz 1 BGB** gesetzlich berechtigt, den Vertrag **jederzeit und ohne Einhaltung einer Kündigungsfrist** mit sofortiger Wirkung zu beenden.

### 2. Zahlungseinstellung, anteilige Rückerstattung & SEPA-Widerruf
Das Vertragsverhältnis endet mit Zugang dieses Schreibens am **{{notice_date}}**. Etwaige für den Zeitraum nach Zugang dieses Schreibens im Voraus eingezogene Entgelte sind unverzüglich anteilig auf mein ursprüngliches Zahlungsmittel zurückzuerstatten (§ 812 Abs. 1 BGB). Sämtliche Einzugsermächtigungen und wiederkehrenden Abbuchungsbefugnisse widerrufe ich hiermit mit sofortiger Wirkung. Bitte bestätigen Sie mir die sofortige Vertragsbeendigung binnen **7 Kalendertagen** in Textform.

Mit freundlichen Grüßen

{{consumer_full_name}}`,
        bodyTemplateEn: `# EXTRAORDINARY IMMEDIATE CONTRACT TERMINATION WITHOUT NOTICE (GERMAN BGB § 312k(6))

**Sender (Consumer):** {{consumer_full_name}}, {{consumer_address}} · Account Email: {{consumer_email}}
**Recipient (Service Provider):** {{merchant_name}} ({{merchant_contact_endpoint}})
**Date:** {{notice_date}}
**Subject:** Immediate Termination Without Notice of "{{item_name}}" pursuant to § 312k(6) BGB (Non-Compliant Online Cancellation Button)
**Contract / Account ID:** {{contract_or_serial_number}} · **Commencement Date:** {{purchase_date}}

Dear Sir or Madam,

I hereby terminate my e-commerce consumer subscription contract for **{{item_name}}** (Reference: **{{contract_or_serial_number}}**) **extraordinarily and with immediate effect without notice pursuant to § 312k(6) BGB**, and in the alternative ordinarily to the earliest lawful date under § 309 No. 9 BGB.

### 1. Statutory Right to Immediate Termination Without Notice (§ 312k(1), (2), and (6) BGB)
Under **§ 312k(1)–(4) BGB**, traders offering recurring consumer contracts online must provide a continuously available, directly and easily accessible two-step online cancellation button (*"Verträge hier kündigen"* → *"jetzt kündigen"*, accessible without mandatory login walls or obstructive dark patterns) plus immediate durable electronic confirmation.

Documented non-compliance observed on {{notice_date}}:
> {{defect_description}}

Because you failed to provide a compliant cancellation button and confirmation workflow under § 312k(2)–(4) BGB, **§ 312k(6) sentence 1 BGB** grants me the mandatory statutory right to terminate this contract **at any time without observing any notice period**.

### 2. Immediate Billing Cessation & Prorated Refund
This contract terminates immediately upon receipt on **{{notice_date}}**. Any fees pre-collected for periods following today must be refunded pro rata immediately (§ 812(1) BGB), and all recurring payment/SEPA mandates are revoked immediately. Please confirm immediate termination in text form within **7 calendar days**.

Sincerely,
{{consumer_full_name}}`,
        statutoryBasis: [
          'BGB § 312k Abs. 1, 2, 4, 6',
          'BGB § 309 Nr. 9',
          'BGB § 812 Abs. 1',
        ],
      };

    case 'T5':
      return {
        title:
          'GESETZLICHER WIDERRUF EINES FERNABSATZVERTRAGES (§§ 312g Abs. 1, 355 BGB)',
        subjectDe:
          'Ausübung des gesetzlichen 14-tägigen Widerrufsrechts gem. §§ 312g, 355 BGB für „{{item_name}}“',
        subjectEn:
          'Exercise of 14-Day Statutory Right of Withdrawal (Widerruf) under §§ 312g, 355 BGB for "{{item_name}}"',
        bodyTemplateDe: `# GESETZLICHER WIDERRUF EINES FERNABSATZVERTRAGES (§§ 312g Abs. 1, 355 BGB)

**Absender (Verbraucher):**
{{consumer_full_name}}
{{consumer_address}}
E-Mail: {{consumer_email}}

**Empfänger (Unternehmer):**
{{merchant_name}}
Widerrufskontakt: {{merchant_contact_endpoint}}

**Datum:** {{notice_date}}
**Betreff:** Ausübung des gesetzlichen 14-tägigen Widerrufsrechts gem. §§ 312g, 355 BGB für „{{item_name}}“
**Bestell- / Vertragsnummer:** {{contract_or_serial_number}} · **Vertragsschluss- / Lieferdatum:** {{purchase_date}}

Sehr geehrte Damen und Herren,

hiermit widerrufe ich den von mir abgeschlossenen Fernabsatzvertrag über den Kauf der Ware bzw. die Erbringung der Dienstleistung **{{item_name}}** (Vertragsreferenz: **{{contract_or_serial_number}}**, abgeschlossen/geliefert am **{{purchase_date}}**, Betrag: **{{price_eur}}**) fristgerecht gemäß **§§ 312g Abs. 1, 355 Abs. 1 und Abs. 2 BGB** (Anmerkung: {{defect_description}}).

Zur Wahrung der 14-tägigen Widerrufsfrist genügt gemäß **§ 355 Abs. 1 Satz 5 BGB** die rechtzeitige Absendung dieser Erklärung. Ich fordere Sie gemäß **§ 357 Abs. 1 und Abs. 3 BGB** auf, mir sämtliche geleisteten Zahlungen (einschließlich etwaiger Standard-Hinsendekosten) unverzüglich und spätestens binnen **14 Kalendertagen** ab Zugang dieser Widerrufserklärung über dasselbe Zahlungsmittel zurückzuerstatten, das bei der ursprünglichen Transaktion eingesetzt wurde. Bitte bestätigen Sie mir den Eingang dieses Widerrufs kurzfristig per E-Mail.

Mit freundlichen Grüßen

{{consumer_full_name}}`,
        bodyTemplateEn: `# STATUTORY 14-DAY DISTANCE CONTRACT REVOCATION (GERMAN BGB §§ 312g(1), 355)

**Sender (Consumer):** {{consumer_full_name}}, {{consumer_address}} · Email: {{consumer_email}}
**Recipient (Trader):** {{merchant_name}} ({{merchant_contact_endpoint}})
**Date:** {{notice_date}}
**Subject:** Exercise of 14-Day Statutory Right of Withdrawal (Widerruf) under §§ 312g, 355 BGB for "{{item_name}}"
**Order / Contract ID:** {{contract_or_serial_number}} · **Conclusion / Delivery Date:** {{purchase_date}}

Dear Sir or Madam,

I hereby exercise my statutory right of withdrawal and revoke the distance contract concluded for **{{item_name}}** (Reference: **{{contract_or_serial_number}}**, dated **{{purchase_date}}**, amount: **{{price_eur}}**) within the 14-day statutory cooling-off period pursuant to **§§ 312g(1), 355(1) and (2) BGB** (Note: {{defect_description}}).

Timely dispatch of this declaration suffices to meet the 14-day deadline (**§ 355(1) sentence 5 BGB**). Pursuant to **§ 357(1) and (3) BGB**, please refund all payments received (including standard outbound delivery charges, if applicable) promptly and no later than **14 calendar days** from receipt of this revocation using the original payment method. Please confirm receipt via email.

Sincerely,
{{consumer_full_name}}`,
        statutoryBasis: [
          'BGB § 312g Abs. 1',
          'BGB § 355 Abs. 1 & 2',
          'BGB § 357 Abs. 1 & 3',
        ],
      };
  }
}

/**
 * Compiles a deterministic statutory notice under BGB templates T1-T5.
 */
export function compileBgbNotice(
  params: NoticeCompilationParams
): CompiledLegalNotice {
  const language = params.language ?? 'de';
  const templateId = selectTemplate(params);
  const noticeDate =
    params.noticeDate ?? new Date().toISOString().split('T')[0]!;
  const remedyDeadlineDate = calculateRemedyDeadline(noticeDate, 14);

  const safeHarbor =
    language === 'de' ? LEXFOX_SAFE_HARBOR_DE : LEXFOX_SAFE_HARBOR_EN;

  // Extract common fields (handling item object or flat params)
  const itemName = params.item?.title ?? params.itemName ?? 'Kaufgegenstand';
  const purchaseDate =
    params.item?.purchaseDate ?? params.purchaseDate ?? noticeDate;
  const priceEur = params.item?.priceGrossEur ?? params.priceEur;
  const consumerName =
    params.consumer.fullName ?? params.consumer.name ?? 'Verbraucher';

  // Remedy strings
  const preferredRemedy = params.preferredRemedy ?? 'unspecified';
  const preferredRemedyDe =
    preferredRemedy === 'replacement'
      ? 'Lieferung einer mangelfreien neuen Sache (Nachlieferung gem. § 439 Abs. 1 Alt. 2 BGB)'
      : preferredRemedy === 'repair'
      ? 'Beseitigung des Mangels durch fachgerechte Reparatur (Nachbesserung gem. § 439 Abs. 1 Alt. 1 BGB)'
      : 'mangelfreie Ersatzlieferung (Nachlieferung) oder fachgerechte Reparatur (Nachbesserung gem. § 439 Abs. 1 BGB)';

  const preferredRemedyEn =
    preferredRemedy === 'replacement'
      ? 'delivery of a defect-free replacement unit (Nachlieferung pursuant to § 439(1) alt. 2 BGB)'
      : preferredRemedy === 'repair'
      ? 'remedy of the defect through professional repair (Nachbesserung pursuant to § 439(1) alt. 1 BGB)'
      : 'replacement with a defect-free unit or professional repair (pursuant to § 439(1) BGB)';

  // Proof blocks
  const hasProof =
    params.item?.hasProofOfPurchase ?? params.hasProofOfPurchase ?? false;
  const sha256 = params.item?.receiptSha256 ?? params.receiptSha256;
  const proofType = params.proofType ?? 'Kaufbeleg';

  let proofBlockDe = '';
  let proofBlockEn = '';
  if (hasProof) {
    proofBlockDe = `Der Nachweis des Vertragsschlusses ist durch den beigefügten Beleg (${proofType}) dokumentiert (Kryptografischer Integritäts-Prüfwert SHA-256: ${
      sha256 ?? 'erfasst'
    }).`;
    proofBlockEn = `Proof of contract conclusion is documented via the attached record (${proofType}, cryptographic integrity digest SHA-256: ${
      sha256 ?? 'recorded'
    }).`;
  } else {
    proofBlockDe =
      'Beweismittel-Hinweis (§ 286 ZPO): Ein physischer Thermopapier-Kassenbon ist für die gesetzliche Sachmängelhaftung nach §§ 437 ff. BGB rechtlich nicht zwingend erforderlich. Der Kaufnachweis erfolgt durch beigefügten Kontoauszug / Kartenabrechnung / elektronische Bestellbestätigung bzw. benannten Zeugenbeweis.';
    proofBlockEn =
      'Evidentiary Notice (§ 286 ZPO): Under German civil law, a physical cash register slip is not legally required to assert statutory warranty rights under §§ 437 et seq. BGB. Proof of purchase is established via attached bank/card statement, electronic order confirmation, or witness testimony.';
  }

  // Common slots
  const slots: Record<string, string> = {
    consumer_full_name: consumerName,
    consumer_address: params.consumer.address,
    consumer_email: params.consumer.email,
    merchant_name: params.merchant.name,
    merchant_contact_endpoint:
      params.merchant.contactEndpoint ??
      params.merchant.email ??
      '[Kundendienst / Portal]',
    item_name: itemName,
    purchase_date: purchaseDate,
    notice_date: noticeDate,
    remedy_deadline_date: remedyDeadlineDate,
    price_eur:
      priceEur !== undefined ? `${priceEur.toFixed(2)} EUR` : 'lt. Kaufbeleg',
    contract_or_serial_number:
      params.contractOrSerialNumber ?? 'N/A (siehe Kaufnachweis)',
    defect_description:
      params.defectDescription ??
      (templateId === 'T4'
        ? 'Fehlender gesetzlicher Kündigungsbutton gem. § 312k BGB'
        : 'Erhebliche Funktionsbeeinträchtigung im Normalbetrieb'),
    preferred_remedy_de: preferredRemedyDe,
    preferred_remedy_en: preferredRemedyEn,
    proof_block_de: proofBlockDe,
    proof_block_en: proofBlockEn,
    receipt_sha256: sha256 ?? 'Nicht hinterlegt (§ 286 ZPO Alternativnachweis)',
  };

  const {
    title,
    subjectDe,
    subjectEn,
    bodyTemplateDe,
    bodyTemplateEn,
    statutoryBasis,
  } = getTemplateDefinition(templateId);

  let rawDe = bodyTemplateDe;
  let rawEn = bodyTemplateEn;
  for (const [key, value] of Object.entries(slots)) {
    rawDe = rawDe.replaceAll(`{{${key}}}`, value);
    rawEn = rawEn.replaceAll(`{{${key}}}`, value);
  }

  const textDe = `${rawDe.trim()}\n\n---\n*${LEXFOX_SAFE_HARBOR_DE}*`;
  const textEn = `${rawEn.trim()}\n\n---\n*${LEXFOX_SAFE_HARBOR_EN}*`;

  const text = language === 'de' ? textDe : textEn;
  const subject = language === 'de' ? subjectDe : subjectEn;

  return {
    templateId,
    language,
    title,
    subject,
    text,
    textDe,
    textEn,
    noticeDate,
    remedyDeadlineDate:
      templateId === 'T1' || templateId === 'T2'
        ? remedyDeadlineDate
        : undefined,
    statutoryBasis,
    safeHarborDisclaimer: safeHarbor,
    receiptSha256: sha256,
  };
}
