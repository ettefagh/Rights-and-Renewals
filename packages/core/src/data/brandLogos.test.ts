import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getBrandLogo, getBrandMonogram } from './brandLogos.js';
import { policySeedData } from './policyWikiSeed.js';

describe('brand logo lookup', () => {
  it('provides matching local assets in both applications for every catalog brand', () => {
    const catalog = policySeedData;
    expect(catalog).toHaveLength(20);
    for (const brand of catalog) {
      const file = getBrandLogo(brand.brandSlug)?.file;
      expect(file, brand.brandSlug).toBeTruthy();
      const app = readFileSync(new URL(`../../../../apps/app/public/brand-logos/${file}`, import.meta.url));
      const showcase = readFileSync(new URL(`../../../../apps/showcase/public/brand-logos/${file}`, import.meta.url));
      expect(app.length).toBeGreaterThan(0);
      expect(app.equals(showcase), brand.brandSlug).toBe(true);
    }
  });
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
