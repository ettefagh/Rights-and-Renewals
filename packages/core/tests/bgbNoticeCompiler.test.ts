import { describe, it, expect } from 'vitest';
import {
  compileBgbNotice,
  isWerktag,
  isGermanPublicHoliday,
  rollForwardWerktag,
  calculateRemedyDeadline,
  LEXFOX_SAFE_HARBOR_DE,
  LEXFOX_SAFE_HARBOR_EN,
} from '../src/legal/bgbNoticeCompiler.js';
import {
  compilePlaintextDossier,
  compilePdfDossier,
} from '../src/media/pdfDossierCompiler.js';
import type { WalletItem } from '../src/types/contracts.js';

describe('bgbNoticeCompiler - Calendar Math & Verbatim Templates', () => {
  const mockItem: WalletItem = {
    id: 'item-001',
    title: 'Sony WH-1000XM4',
    category: 'hardware',
    brandSlug: 'sony',
    merchantOrProvider: 'Saturn Electro-Handelsgesellschaft mbH',
    purchaseDate: '2026-03-15',
    expiryDate: '2028-03-15',
    priceGrossEur: 279.0,
    isTaxDeductible: false,
    status: 'active',
    searchTokens: ['sony'],
    hasProofOfPurchase: true,
    receiptSha256:
      '8f4b2c9a71d3e04b55c82a1940f71b6e9d04c2a183f5e6b7c8d9e0f1a2b3c4d5',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const consumer = {
    fullName: 'Lukas Weber',
    address: 'Ernst-Reuter-Platz 10, 10587 Berlin',
    email: 'lukas.weber@stud.srh-campus-berlin.de',
  };

  it('BGB-03 & BGB-04: verifies Werktag rolls and 14-day cure deadline under § 193 BGB', () => {
    // 2026-08-15 is Saturday, 2026-08-16 is Sunday -> roll forward to Monday 2026-08-17
    expect(isWerktag('2026-08-15')).toBe(false);
    expect(isWerktag('2026-08-16')).toBe(false);
    expect(isWerktag('2026-08-17')).toBe(true);
    expect(rollForwardWerktag('2026-08-15')).toBe('2026-08-17');

    // German public holiday: Neujahr (Jan 1)
    expect(isGermanPublicHoliday('2026-01-01')).toBe(true);
    expect(isWerktag('2026-01-01')).toBe(false);

    // 14 calendar days from Wednesday 2026-11-04 is Wednesday 2026-11-18
    const deadline = calculateRemedyDeadline('2026-11-04', 14);
    expect(deadline).toBe('2026-11-18');
  });

  it('BGB-05: selects Template 1 and compiles verbatim BGB § 477 Abs. 1 within 12 months', () => {
    const notice = compileBgbNotice({
      item: mockItem,
      consumer,
      merchant: { name: 'Saturn Electro-Handelsgesellschaft mbH' },
      noticeDate: '2026-10-15', // 7 months after purchase
      defectDescription: 'Linker Ohrhörer lädt nicht mehr.',
      preferredRemedy: 'replacement',
    });

    expect(notice.templateId).toBe('T1');
    expect(notice.textDe).toContain(
      'Beweislastumkehr zugunsten des Verbrauchers (§ 477 Abs. 1 BGB)'
    );
    expect(notice.textDe).toContain('zwölf Monaten');
    expect(notice.textDe).toContain(
      'Transport-, Versand-, Wege-, Arbeits- und Materialkosten'
    );
    expect(notice.textDe).toContain('keinen Nutzungsersatz');
    expect(notice.textDe).toContain(
      '8f4b2c9a71d3e04b55c82a1940f71b6e9d04c2a183f5e6b7c8d9e0f1a2b3c4d5'
    );
    expect(notice.textDe).toContain(
      'BGH, Urteil vom 27.11.2019 – VIII ZR 285/18'
    );
  });

  it('BGB-06: selects Template 2 and compiles Ablaufhemmung (§ 475e BGB) for 12–24 months', () => {
    const notice = compileBgbNotice({
      item: mockItem,
      consumer,
      merchant: { name: 'Saturn Electro-Handelsgesellschaft mbH' },
      noticeDate: '2027-05-15', // 14 months after purchase
      defectDescription: 'Akku schwillt auf.',
      preferredRemedy: 'repair',
    });

    expect(notice.templateId).toBe('T2');
    expect(notice.textDe).toContain(
      '24-monatigen gesetzlichen Verjährungsfrist gem. § 438 Abs. 1 Nr. 3 BGB'
    );
    expect(notice.textDe).toContain(
      'Gesetzliche Ablaufhemmung (§ 475e Abs. 1 und Abs. 3 BGB)'
    );
    expect(notice.textDe).toContain('vier Monaten');
  });

  it('BGB-07: selects Template 3 and compiles ordinary subscription cancellation under § 309 Nr. 9', () => {
    const subItem: WalletItem = {
      ...mockItem,
      id: 'sub-gym',
      category: 'subscription',
      purchaseDate: '2025-01-01',
      expiryDate: '2027-01-01',
    };

    const notice = compileBgbNotice({
      item: subItem,
      consumer,
      merchant: { name: 'McFit GmbH' },
      noticeDate: '2026-06-01',
      cancellationButtonCompliant: true,
      issueType: 'contract_cancellation',
    });

    expect(notice.templateId).toBe('T3');
    expect(notice.textDe).toContain('ORDENTLICHE VERTRAGSKÜNDIGUNG');
    expect(notice.textDe).toContain('§ 309 Nr. 9');
    expect(notice.textDe).toContain('höchstens einem Monat');
    expect(notice.textDe).toContain('Widerruf der Einzugsermächtigung');
  });

  it('BGB-08: selects Template 4 and compiles fristlose Kündigung under § 312k Abs. 6 BGB', () => {
    const subItem: WalletItem = {
      ...mockItem,
      id: 'sub-dark',
      category: 'subscription',
      purchaseDate: '2025-01-01',
      expiryDate: '2027-01-01',
    };

    const notice = compileBgbNotice({
      item: subItem,
      consumer,
      merchant: { name: 'BadProvider' },
      noticeDate: '2026-06-01',
      cancellationButtonCompliant: false, // Triggers T4
    });

    expect(notice.templateId).toBe('T4');
    expect(notice.textDe).toContain('AUSSERORDENTLICHE FRISTLOSE KÜNDIGUNG');
    expect(notice.textDe).toContain('§ 312k Abs. 6 BGB');
    expect(notice.textDe).toContain('ohne Einhaltung einer Kündigungsfrist');
  });

  it('BGB-09: selects Template 5 for cooling-off revocation within 14 days under §§ 312g, 355 BGB', () => {
    const notice = compileBgbNotice({
      itemName: 'Streaming Service',
      category: 'subscription',
      consumer,
      merchant: { name: 'StreamNow' },
      purchaseDate: '2026-10-01',
      noticeDate: '2026-10-08', // Within 14 days
      issueType: 'cooling_off_revocation',
    });

    expect(notice.templateId).toBe('T5');
    expect(notice.textDe).toContain('GESETZLICHER WIDERRUF');
    expect(notice.textDe).toContain('§§ 312g Abs. 1, 355');
    expect(notice.textDe).toContain('14 Kalendertagen');
  });

  it('BGB-10: injects § 286 ZPO alternative proof clause when hasProofOfPurchase is false', () => {
    const noReceiptItem: WalletItem = {
      ...mockItem,
      hasProofOfPurchase: false,
      receiptSha256: undefined,
    };
    const notice = compileBgbNotice({
      item: noReceiptItem,
      consumer,
      merchant: { name: 'Saturn' },
      noticeDate: '2026-06-01',
      defectDescription: 'Gerät defekt.',
    });

    expect(notice.textDe).toContain('Beweismittel-Hinweis (§ 286 ZPO)');
    expect(notice.textDe).toContain(
      'Ein physischer Thermopapier-Kassenbon ist für die gesetzliche Sachmängelhaftung nach §§ 437 ff. BGB rechtlich nicht zwingend erforderlich'
    );
  });

  it('BGB-12: compiles in English with verbatim LexFox RDG safe harbor footer', () => {
    const notice = compileBgbNotice({
      item: mockItem,
      consumer,
      merchant: { name: 'Saturn' },
      noticeDate: '2026-05-01',
      language: 'en',
    });

    expect(notice.language).toBe('en');
    expect(notice.textEn).toContain('FORMAL STATUTORY NOTICE OF DEFECT');
    expect(notice.textEn).toContain('BGH VIII ZR 285/18');
    expect(notice.textEn).toContain(LEXFOX_SAFE_HARBOR_EN);
    expect(notice.safeHarborDisclaimer).toBe(LEXFOX_SAFE_HARBOR_EN);
  });

  it('compiles DIN 5008 plaintext and PDF dossier with embedded evidence', async () => {
    const notice = compileBgbNotice({
      item: mockItem,
      consumer,
      merchant: { name: 'Saturn' },
      noticeDate: '2026-05-01',
    });

    const plaintext = compilePlaintextDossier(notice);
    expect(plaintext).toBe(notice.text);

    const dossierResult = await compilePdfDossier({
      notice,
      receiptImageBytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), // Dummy PNG header
      receiptMimeType: 'image/png',
    });

    expect(dossierResult.pdfBytes.length).toBeGreaterThan(0);
    expect(dossierResult.filename).toContain('Rechtsdossier_T1_2026-05-01.pdf');
    expect(dossierResult.sha256).toBe(mockItem.receiptSha256);

    // JPEG branch
    const jpegDossier = await compilePdfDossier({
      notice,
      receiptImageBytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]),
      receiptMimeType: 'image/jpeg',
    });
    expect(jpegDossier.pdfBytes.length).toBeGreaterThan(0);

    // No receipt sha256 branch (§ 286 ZPO evidence box)
    const noReceiptNotice = compileBgbNotice({
      itemName: 'Non-receipt item',
      consumer,
      merchant: { name: 'Seller' },
      noticeDate: '2026-05-01',
      preferredRemedy: 'unspecified',
      hasProofOfPurchase: false,
    });
    const noReceiptDossier = await compilePdfDossier({
      notice: noReceiptNotice,
    });
    expect(noReceiptDossier.pdfBytes.length).toBeGreaterThan(0);
  });
});
