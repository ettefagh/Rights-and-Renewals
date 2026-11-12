import type { PolicyWikiEntry, WalletItem } from '@cmlab/core';

export type SearchMatch<T> = { item: T; score: number };

export interface WalletSearchProjection {
  title: string;
  merchantOrProvider: string;
  brandSlug: string;
  category: string;
  searchTokens: string[];
  serialNumber: string;
  notes: string;
  priceLabel: string;
}

export type WalletSearchMatch<T> = SearchMatch<T> & { projection: WalletSearchProjection };

export function normalizeSearchText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function scoreFields(query: string, fields: unknown[]): number | null {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!terms.length) return null;

  const normalizedFields = fields.map(normalizeSearchText).filter(Boolean);
  const haystack = normalizedFields.join(' ');
  if (!terms.every((term) => haystack.includes(term))) return null;

  // Prefer full title/name hits while keeping aliases and cross-field matches searchable.
  const wholeField = normalizedFields.find((field) => field.includes(normalizedQuery));
  if (!wholeField) return 1;
  if (wholeField === normalizedQuery) return 4;
  return wholeField.startsWith(normalizedQuery) ? 3 : 2;
}

export function searchWikiPolicies(
  query: string,
  policies: readonly PolicyWikiEntry[],
  limit = 5
): SearchMatch<PolicyWikiEntry>[] {
  const boundedLimit = Math.max(0, Math.min(Math.floor(limit), 20));
  if (!normalizeSearchText(query) || boundedLimit === 0) return [];

  return policies
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return { item, index, score: null };
      const aliases = Array.isArray(record.searchAliases) ? record.searchAliases : [];
      return {
        item,
        index,
        score: scoreFields(query, [record.brandName, record.brandSlug, record.category, ...aliases])
      };
    })
    .filter((match): match is { item: PolicyWikiEntry; index: number; score: number } => match.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, boundedLimit)
    .map(({ item, score }) => ({ item, score }));
}

export function searchWalletItems(
  query: string,
  items: readonly WalletItem[],
  limit = 5
): WalletSearchMatch<WalletItem>[] {
  const boundedLimit = Math.max(0, Math.min(Math.floor(limit), 20));
  if (!normalizeSearchText(query) || boundedLimit === 0) return [];

  return items
    .filter((item) => {
      const id = asRecord(item)?.id;
      return (typeof id === 'string' && id.trim().length > 0) ||
        (typeof id === 'number' && Number.isFinite(id));
    })
    .map((item, index) => {
      const projection = projectWalletSearchItem(item);
      return {
        item,
        projection,
        index,
        score: scoreFields(query, [projection.title, projection.merchantOrProvider, projection.brandSlug, projection.category, ...projection.searchTokens, projection.serialNumber, projection.notes])
      };
    })
    .filter((match): match is { item: WalletItem; projection: WalletSearchProjection; index: number; score: number } => match.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, boundedLimit)
    .map(({ item, projection, score }) => ({ item, projection, score }));
}

/** Read a current or legacy wallet row without mutating or migrating it. */
export function projectWalletSearchItem(item: unknown): WalletSearchProjection {
  const record = asRecord(item) ?? {};
  const price = finiteNumber(record.priceGrossEur) ?? finiteNumber(record.priceEur);
  const tokens = Array.isArray(record.searchTokens) ? record.searchTokens.filter((token): token is string => typeof token === 'string') : [];
  return {
    title: firstText(record.title, record.name) ?? 'Untitled item',
    merchantOrProvider: firstText(record.merchantOrProvider, record.merchant) ?? 'Unknown provider',
    brandSlug: firstText(record.brandSlug) ?? '',
    category: firstText(record.category) ?? 'item',
    searchTokens: tokens,
    serialNumber: firstText(record.serialNumber) ?? '',
    notes: firstText(record.notes) ?? '',
    priceLabel: price === null ? 'Price unavailable' : `€${price.toFixed(2)}`
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstText(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type OmniCommand = 'add' | 'wiki' | 'tax' | 'claim' | 'cancel';

export function parseOmniCommand(query: string): { command: OmniCommand | null; argument: string } | null {
  const trimmed = query.trim();
  if (!trimmed.startsWith('>')) return null;
  const [rawCommand = '', ...argument] = trimmed.slice(1).trim().split(/\s+/);
  const aliases: Record<string, OmniCommand> = { add: 'add', wiki: 'wiki', tax: 'tax', claim: 'claim', cancel: 'cancel' };
  return { command: aliases[rawCommand.toLocaleLowerCase('en-US')] ?? null, argument: argument.join(' ') };
}
