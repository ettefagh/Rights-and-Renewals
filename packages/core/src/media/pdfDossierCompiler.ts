/**
 * pdfDossierCompiler.ts - DIN 5008 PDF & Plaintext Dossier Compiler
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { CompiledLegalNotice } from '../legal/bgbNoticeCompiler.js';

export interface DossierParams {
  notice: CompiledLegalNotice;
  receiptImageBytes?: Uint8Array;
  receiptMimeType?: string; // 'image/jpeg' | 'image/png'
}

export interface CompiledDossierResult {
  pdfBytes: Uint8Array;
  textContent: string;
  filename: string;
  sha256?: string | undefined;
}

/**
 * Compiles a formatted DIN 5008 plaintext string suitable for clipboard or .txt download.
 */
export function compilePlaintextDossier(notice: CompiledLegalNotice): string {
  return notice.text;
}

/**
 * Compiles a client-side vector PDF under DIN 5008 Type B margins embedding receipt proof.
 */
export async function compilePdfDossier(
  params: DossierParams
): Promise<CompiledDossierResult> {
  const { notice, receiptImageBytes, receiptMimeType } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // DIN A4 in points (210 x 297 mm)
  const { height } = page.getSize();

  // Load standard Type 1 fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // DIN 5008 margins (points)
  const marginLeft = 70.87; // 25 mm
  const marginRight = 56.69; // 20 mm
  const contentWidth = 595.28 - marginLeft - marginRight;

  let cursorY = height - 70; // Start below top margin

  // 1. Header: Application & Purpose
  page.drawText('WARRANTY & SUBSCRIPTION WALLET — RECHTSDOSSIER', {
    x: marginLeft,
    y: cursorY,
    size: 9,
    font: fontBold,
    color: rgb(0.18, 0.32, 0.3), // Pine teal
  });

  cursorY -= 20;

  // 2. Subject Line (Bold, 11pt)
  const displaySubject =
    notice.subject.length > 75 ? notice.subject.slice(0, 72) + '...' : notice.subject;
  page.drawText(displaySubject, {
    x: marginLeft,
    y: cursorY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  cursorY -= 25;

  // 3. Body text line-by-line wrapping
  const lines = notice.text.split('\n');
  const maxBodyLines = 28; // Fits DIN 5008 single page with evidence box
  let linesDrawn = 0;

  for (const line of lines) {
    if (linesDrawn >= maxBodyLines) break;
    if (line.startsWith('#') || line.startsWith('---')) continue;

    const trimmed = line.trim();
    if (trimmed.length === 0) {
      cursorY -= 8;
      continue;
    }

    // Truncate/wrap line if too long
    const displayLine =
      trimmed.length > 95 ? trimmed.slice(0, 92) + '...' : trimmed;
    page.drawText(displayLine, {
      x: marginLeft,
      y: cursorY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });

    cursorY -= 12;
    linesDrawn++;
  }

  // 4. Embedded Receipt Proof Box / Evidentiary Box
  cursorY = Math.max(cursorY - 15, 120);

  // Draw container box
  page.drawRectangle({
    x: marginLeft,
    y: cursorY - 60,
    width: contentWidth,
    height: 60,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 0.98),
  });

  page.drawText('BEWEISMITTEL & NACHWEISFÜHRUNG (GoBD & § 286 ZPO)', {
    x: marginLeft + 10,
    y: cursorY - 15,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  if (notice.receiptSha256) {
    page.drawText(`GoBD SHA-256 Digest: ${notice.receiptSha256}`, {
      x: marginLeft + 10,
      y: cursorY - 30,
      size: 7,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(
      'Kaufnachweis im lokalen Kryptotresor manipulationssicher hinterlegt.',
      {
        x: marginLeft + 10,
        y: cursorY - 45,
        size: 7,
        font: fontRegular,
        color: rgb(0.05, 0.5, 0.3),
      }
    );

    // Embed image thumbnail if binary bytes provided
    if (receiptImageBytes && receiptImageBytes.length > 0) {
      try {
        const embeddedImg =
          receiptMimeType === 'image/png'
            ? await pdfDoc.embedPng(receiptImageBytes)
            : await pdfDoc.embedJpg(receiptImageBytes);

        page.drawImage(embeddedImg, {
          x: marginLeft + contentWidth - 55,
          y: cursorY - 55,
          width: 50,
          height: 50,
        });
      } catch (err) {
        console.warn(
          '[pdfDossierCompiler] Failed to embed image bytes into PDF:',
          err
        );
      }
    }
  } else {
    page.drawText(
      'Beweismittelhinweis gem. § 286 ZPO: Alternativnachweis via Kontoauszug / Zeugenbeweis.',
      {
        x: marginLeft + 10,
        y: cursorY - 32,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      }
    );
  }

  // 5. Non-Removable Safe-Harbor Footer at bottom of page
  page.drawText(
    'Hinweis: Erstellt durch Warranty Wallet gem. BGH VIII ZR 285/18 (LexFox). Keine Rechtsdienstleistung nach §§ 2, 3 RDG.',
    {
      x: marginLeft,
      y: 40,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  const pdfBytes = await pdfDoc.save();
  const safeFilename = `Rechtsdossier_${notice.templateId}_${notice.noticeDate}.pdf`;

  return {
    pdfBytes,
    textContent: notice.text,
    filename: safeFilename,
    sha256: notice.receiptSha256,
  };
}
