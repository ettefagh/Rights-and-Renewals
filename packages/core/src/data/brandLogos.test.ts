import { describe, expect, it } from 'vitest';
import { getBrandLogo, getBrandMonogram } from './brandLogos.js';

describe('brand logo lookup', () => {
  it('normalizes stable slugs and maps known local assets', () => {
    expect(getBrandLogo('  GITHUB ')).toEqual({ name: 'GitHub Pro / Copilot', file: 'github.svg', source: 'developer-icons' });
    expect(getBrandLogo('deutsche-bahn')?.file).toBe('deutsche-bahn.svg');
  });

  it('uses verified local site assets and keeps unknown brands on labeled fallback', () => {
    expect(getBrandLogo('gymshark')?.file).toBe('gymshark.png');
    expect(getBrandLogo('mindfactory')?.file).toBe('mindfactory.png');
    expect(getBrandLogo('mcfit')?.file).toBe('mcfit.png');
    expect(getBrandLogo('urban-sports-club')?.file).toBe('urban-sports-club.ico');
    expect(getBrandLogo('disney-plus')?.file).toBe('disney-plus.svg');
    expect(getBrandLogo('unlisted-brand')).toBeUndefined();
    expect(getBrandMonogram('gymshark')).toBe('GY');
    expect(getBrandMonogram('unlisted-brand', 'Unlisted Brand')).toBe('UB');
  });
});
