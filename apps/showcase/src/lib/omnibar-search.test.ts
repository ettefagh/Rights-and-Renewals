import { describe, expect, it } from 'vitest';
import type { PolicyWikiEntry, WalletItem } from '@cmlab/core';
import { normalizeSearchText, parseOmniCommand, projectWalletSearchItem, searchWalletItems, searchWikiPolicies } from '../../../app/src/lib/omnibar-search';

function policy(brandSlug: string, brandName: string, searchAliases: string[]): PolicyWikiEntry {
  return {
    brandSlug,
    brandName,
    category: 'subscription',
    statutoryWarrantyMonths: 24,
    commercialGuaranteeMonths: 0,
    cancellationNoticeMonths: 1,
    cancellationButtonCompliant: true,
    legalNotes: 'Check the current contract terms.',
    verifiedDate: '2026-10-01',
    searchAliases
  };
}

function walletItem(overrides: Partial<WalletItem> = {}): WalletItem {
  return {
    id: 'item-1',
    title: 'Kopfhörer',
    category: 'hardware',
    brandSlug: 'audio-labs',
    merchantOrProvider: 'Audio Labs Store',
    purchaseDate: '2026-01-01',
    expiryDate: '2028-01-01',
    priceGrossEur: 120,
    isTaxDeductible: false,
    status: 'active',
    searchTokens: ['noise cancelling', 'headphones'],
    hasProofOfPurchase: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  };
}

describe('omnibar search', () => {
  it('normalizes case, accents, punctuation, and whitespace', () => {
    expect(normalizeSearchText('  CRÈME—Brûlée  ')).toBe('creme brulee');
  });

  it('matches every query term across policy fields and aliases', () => {
    const entries = [
      policy('telekom', 'Telekom', ['Deutsche Telekom', 'Magenta Zuhause']),
      policy('spotify', 'Spotify', ['music streaming'])
    ];

    expect(searchWikiPolicies('deutsche MAGENTA', entries).map(({ item }) => item.brandSlug)).toEqual(['telekom']);
    expect(searchWikiPolicies('streaming spotify', entries).map(({ item }) => item.brandSlug)).toEqual(['spotify']);
  });

  it('uses local wallet search tokens and notes and bounds results', () => {
    const items = [
      walletItem({ id: 'first', title: 'Headphones', searchTokens: ['noise cancelling'] }),
      walletItem({ id: 'second', title: 'Headphones Pro', searchTokens: ['noise cancelling'] }),
      walletItem({ id: 'third', title: 'Headphones Max', notes: 'noise cancelling', searchTokens: [] })
    ];

    expect(searchWalletItems('NOISE cancelling', items, 2).map(({ item }) => item.id)).toEqual(['first', 'second']);
    expect(searchWalletItems('cancelling', items, 20)).toHaveLength(3);
    expect(searchWalletItems('headphones', items, 0)).toEqual([]);
  });

  it('searches mixed modern and legacy rows without requiring optional search tokens', () => {
    const legacy = {
      id: 12,
      name: 'Kaffeemaschine',
      merchant: 'Müller Markt',
      category: 'hardware',
      priceEur: 49.9,
      serialNumber: 'SERIAL-LEGACY-12'
    } as unknown as WalletItem;
    const modern = walletItem({ id: 'modern-1', title: 'Mixer', serialNumber: 'SERIAL-MODERN-1' });

    const matches = searchWalletItems('serial legacy', [modern, legacy]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.item).toBe(legacy);
    expect(matches[0]?.projection).toMatchObject({
      title: 'Kaffeemaschine',
      merchantOrProvider: 'Müller Markt',
      priceLabel: '€49.90',
      serialNumber: 'SERIAL-LEGACY-12'
    });
    expect(searchWalletItems('SERIAL MODERN', [modern, legacy]).map(({ item }) => item.id)).toEqual(['modern-1']);
  });

  it('handles malformed tokens and unknown prices without throwing or coercing objects', () => {
    const malformed = {
      id: 'legacy-bad',
      name: 'Unknown price item',
      merchant: 'Old shop',
      category: 'hardware',
      searchTokens: { invalid: true },
      priceEur: { amount: 99.95 }
    } as unknown as WalletItem;
    const rows = [malformed, null, { searchTokens: null, priceEur: Number.NaN }] as unknown as WalletItem[];

    const match = searchWalletItems('unknown price', rows)[0];
    expect(match?.item).toBe(malformed);
    expect(match?.projection.priceLabel).toBe('Price unavailable');
    expect(projectWalletSearchItem({ name: 'Only name', merchant: 4, priceEur: { amount: 5 } })).toMatchObject({
      title: 'Only name',
      merchantOrProvider: 'Unknown provider',
      priceLabel: 'Price unavailable'
    });
    expect(normalizeSearchText({ invalid: true })).toBe('');
    expect(searchWalletItems('item', rows).map(({ item }) => item.id)).toEqual(['legacy-bad']);
  });

  it('keeps Wiki search usable when wallet rows are malformed', () => {
    const malformedRows = [null, { title: {}, merchant: 12, searchTokens: { invalid: true } }] as unknown as WalletItem[];
    expect(searchWalletItems('spotify', malformedRows)).toEqual([]);
    expect(searchWikiPolicies('spotify', [policy('spotify', 'Spotify', ['music streaming'])])).toHaveLength(1);
  });

  it('parses supported commands and preserves arguments without inventing commands', () => {
    expect(parseOmniCommand('>claim headphones')).toEqual({ command: 'claim', argument: 'headphones' });
    expect(parseOmniCommand('>wiki Magenta Zuhause')).toEqual({ command: 'wiki', argument: 'Magenta Zuhause' });
    expect(parseOmniCommand('>import file.csv')).toEqual({ command: null, argument: 'file.csv' });
    expect(parseOmniCommand('>cms')).toEqual({ command: null, argument: '' });
    expect(parseOmniCommand('>emdash')).toEqual({ command: null, argument: '' });
    expect(parseOmniCommand('headphones')).toBeNull();
  });
});
