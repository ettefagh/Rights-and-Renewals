import type { PolicyWikiEntry, WalletItem } from '@cmlab/core';

export type SearchMatch<T> = { item: T; score: number };

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function scoreFields(query: string, fields: string[]): number | null {
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
  policies: PolicyWikiEntry[],
  limit = 5
): SearchMatch<PolicyWikiEntry>[] {
  const boundedLimit = Math.max(0, Math.min(Math.floor(limit), 20));
  if (!normalizeSearchText(query) || boundedLimit === 0) return [];

  return policies
    .map((item, index) => ({
      item,
      index,
      score: scoreFields(query, [item.brandName, item.brandSlug, item.category, ...item.searchAliases])
    }))
    .filter((match): match is { item: PolicyWikiEntry; index: number; score: number } => match.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, boundedLimit)
    .map(({ item, score }) => ({ item, score }));
}

export function searchWalletItems(
  query: string,
  items: WalletItem[],
  limit = 5
): SearchMatch<WalletItem>[] {
  const boundedLimit = Math.max(0, Math.min(Math.floor(limit), 20));
  if (!normalizeSearchText(query) || boundedLimit === 0) return [];

  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreFields(query, [item.title, item.merchantOrProvider, item.brandSlug ?? '', item.category, ...item.searchTokens, item.notes ?? ''])
    }))
    .filter((match): match is { item: WalletItem; index: number; score: number } => match.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, boundedLimit)
    .map(({ item, score }) => ({ item, score }));
}

export type OmniCommand = 'add' | 'wiki' | 'tax' | 'cms' | 'emdash' | 'claim' | 'cancel';

export function parseOmniCommand(query: string): { command: OmniCommand | null; argument: string } | null {
  const trimmed = query.trim();
  if (!trimmed.startsWith('>')) return null;
  const [rawCommand = '', ...argument] = trimmed.slice(1).trim().split(/\s+/);
  const aliases: Record<string, OmniCommand> = { emdash: 'emdash', cms: 'cms', add: 'add', wiki: 'wiki', tax: 'tax', claim: 'claim', cancel: 'cancel' };
  return { command: aliases[rawCommand.toLocaleLowerCase('en-US')] ?? null, argument: argument.join(' ') };
}
