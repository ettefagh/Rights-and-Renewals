/**
 * barcodeSvg.ts - Deterministic Pure SVG Code 128 Barcode Generator
 * Generates high-contrast, optical-scanner readable SVG markup for retail counter checkouts.
 * Zero external dependencies.
 */

// Code 128 module patterns (widths of alternate bars and spaces)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=Start B, 106=Stop)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Generate a standalone SVG string containing a Code 128 barcode for a given alphanumeric string.
 */
export function generateBarcodeSvg(
  text: string,
  options: {
    height?: number;
    moduleWidth?: number;
    includeText?: boolean;
    quietZone?: number;
  } = {}
): string {
  const height = options.height ?? 64;
  const moduleWidth = options.moduleWidth ?? 2;
  const includeText = options.includeText ?? true;
  const quietZone = options.quietZone ?? 20;

  // Filter or sanitize to ASCII 32..126
  const cleanText = (text || '').replace(/[^\x20-\x7E]/g, '');
  if (!cleanText) return '';

  // Encode Code 128B
  const patternIndices: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    patternIndices.push(code);
    checksum += code * (i + 1);
  }

  checksum = checksum % 103;
  patternIndices.push(checksum);
  patternIndices.push(STOP_CODE);

  // Build binary sequence of bars (1 = black, 0 = white)
  let binaryString = '';
  for (const idx of patternIndices) {
    const pattern = CODE128_PATTERNS[idx];
    if (!pattern) continue;
    let isBar = true;
    for (const char of pattern) {
      const width = parseInt(char, 10);
      binaryString += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  }

  const barcodeWidth = binaryString.length * moduleWidth;
  const totalWidth = barcodeWidth + quietZone * 2;
  const textHeight = includeText ? 18 : 0;
  const totalHeight = height + textHeight;

  // Convert binaryString to SVG rect elements
  const rects: string[] = [];
  let currentX = quietZone;

  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      // Find consecutive 1s
      let runLength = 1;
      while (i + 1 < binaryString.length && binaryString[i + 1] === '1') {
        runLength++;
        i++;
      }
      rects.push(
        `<rect x="${currentX}" y="4" width="${runLength * moduleWidth}" height="${height - 8}" fill="#000000" />`
      );
      currentX += runLength * moduleWidth;
    } else {
      currentX += moduleWidth;
    }
  }

  const textElement = includeText
    ? `<text x="${totalWidth / 2}" y="${totalHeight - 4}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="600" text-anchor="middle" fill="#0F172A">${cleanText}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" style="background:#FFFFFF;display:block;margin:0 auto;border-radius:4px;">
  ${rects.join('\n  ')}
  ${textElement}
</svg>`;
}
