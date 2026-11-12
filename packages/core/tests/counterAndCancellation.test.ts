import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboardSafe, generateBarcodeSvg } from '../src/index.js';

describe('safeClipboard & barcodeSvg Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateBarcodeSvg', () => {
    it('returns empty string on empty text', () => {
      expect(generateBarcodeSvg('')).toBe('');
    });

    it('generates valid SVG markup for alphanumeric serial string', () => {
      const svg = generateBarcodeSvg('C02G80XYZ0GP');
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('<rect');
      expect(svg).toContain('C02G80XYZ0GP');
      expect(svg).toContain('fill="#000000"');
      expect(svg).toContain('background:#FFFFFF');
    });

    it('generates barcode with custom options', () => {
      const svg = generateBarcodeSvg('4012345678901', {
        height: 80,
        includeText: false,
        moduleWidth: 3
      });
      expect(svg).toContain('<svg');
      expect(svg).toContain('height="80"');
      expect(svg).not.toContain('<text');
    });
  });

  describe('copyToClipboardSafe', () => {
    it('returns false when text is empty', async () => {
      const result = await copyToClipboardSafe('');
      expect(result).toBe(false);
    });

    it('uses navigator.clipboard.writeText when available in secure context', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('window', { isSecureContext: true });
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: writeTextMock
        }
      });

      const success = await copyToClipboardSafe('TEST-SERIAL-123');
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('TEST-SERIAL-123');
    });

    it('falls back to document.execCommand when navigator.clipboard fails', async () => {
      vi.stubGlobal('window', { isSecureContext: true });
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
        }
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();

      vi.stubGlobal('document', {
        createElement: () => ({
          value: '',
          setAttribute: vi.fn(),
          style: {},
          focus: vi.fn(),
          setSelectionRange: vi.fn(),
        }),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      });

      const success = await copyToClipboardSafe('FALLBACK-SERIAL');
      expect(success).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
    });
  });
});
