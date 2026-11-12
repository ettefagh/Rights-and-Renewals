import { describe, expect, it } from 'vitest';
import type { PolicyWikiEntry, WalletItem } from '@cmlab/core';
import { normalizeSearchText, parseOmniCommand, searchWalletItems, searchWikiPolicies } from '../../../app/src/lib/omnibar-search';

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

  it('parses supported commands and preserves arguments without inventing commands', () => {
    expect(parseOmniCommand('>claim headphones')).toEqual({ command: 'claim', argument: 'headphones' });
    expect(parseOmniCommand('>wiki Magenta Zuhause')).toEqual({ command: 'wiki', argument: 'Magenta Zuhause' });
    expect(parseOmniCommand('>import file.csv')).toEqual({ command: null, argument: 'file.csv' });
    expect(parseOmniCommand('headphones')).toBeNull();
  });
});
