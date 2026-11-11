import { describe, expect, it } from 'vitest';
import { getBrandLogo, getBrandMonogram } from './brandLogos.js';

describe('brand logo lookup', () => {
  it('normalizes stable slugs and maps known local assets', () => {
    expect(getBrandLogo('  GITHUB ')).toEqual({ name: 'GitHub Pro / Copilot', file: 'github.svg', source: 'developer-icons' });
    expect(getBrandLogo('deutsche-bahn')?.file).toBe('deutsche-bahn.svg');
  });

  it('keeps unavailable and unknown brands on labeled monogram fallback', () => {
    expect(getBrandLogo('gymshark')?.file).toBeUndefined();
    expect(getBrandLogo('unlisted-brand')).toBeUndefined();
    expect(getBrandMonogram('gymshark')).toBe('GY');
    expect(getBrandMonogram('unlisted-brand', 'Unlisted Brand')).toBe('UB');
  });
});
