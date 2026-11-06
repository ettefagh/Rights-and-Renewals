import { describe, it, expect, beforeEach } from 'vitest';
import { PrefixTrie } from '../src/search/PrefixTrie.js';

describe('PrefixTrie - Autocomplete & Tokenizer', () => {
  let trie: PrefixTrie<string>;

  beforeEach(() => {
    trie = new PrefixTrie<string>();
  });

  it('TRIE-01: search resolves in <0.8ms SLA across 1,000 inserted keys', () => {
    for (let i = 0; i < 1000; i++) {
      trie.insert(`brand_name_test_${i}`, `payload_${i}`);
    }

    const t0 = performance.now();
    for (let q = 0; q < 100; q++) {
      trie.search('brand_name_test_5', 10);
    }
    const totalMs = performance.now() - t0;
    const avgLatencyMs = totalMs / 100;

    expect(avgLatencyMs).toBeLessThan(0.8);
  });

  it('TRIE-02: normalizes and trims search queries and keys', () => {
    trie.insert('  Apple Inc.  ', 'apple_id');
    const results = trie.search('  apple  ');
    expect(results).toEqual(['apple_id']);
  });

  it('TRIE-03: tokenizes complex titles stripping punctuation and whitespace', () => {
    const tokens = PrefixTrie.tokenize(
      'Sony WH-1000XM4 / Wireless Noise-Cancelling, Black'
    );
    expect(tokens).toEqual(
      expect.arrayContaining([
        'sony',
        'wh',
        '1000xm4',
        'wireless',
        'noise',
        'cancelling',
        'black',
      ])
    );
  });

  it('TRIE-04: resolves prefix substring queries progressively', () => {
    trie.insert('spotify', 'spotify_id');
    expect(trie.search('sp')).toEqual(['spotify_id']);
    expect(trie.search('spot')).toEqual(['spotify_id']);
    expect(trie.search('spotify')).toEqual(['spotify_id']);
  });

  it('TRIE-05: returns empty array for non-existent prefix', () => {
    trie.insert('apple', 'apple_id');
    expect(trie.search('xyz')).toEqual([]);
    expect(trie.search('applex')).toEqual([]);
  });

  it('TRIE-06: returns empty array for empty search queries', () => {
    trie.insert('apple', 'apple_id');
    expect(trie.search('')).toEqual([]);
    expect(trie.search('   ')).toEqual([]);
  });

  it('TRIE-07: deduplicates payloads when multiple phrase tokens match query', () => {
    trie.insertPhrase('Apple MacBook Pro 14', 'apple_macbook_id');
    const results = trie.search('apple');
    expect(results).toEqual(['apple_macbook_id']);
  });

  it('TRIE-08: respects maxResults clamp', () => {
    for (let i = 0; i < 20; i++) {
      trie.insert(`spotify_item_${i}`, `id_${i}`);
    }
    const results = trie.search('spotify', 5);
    expect(results).toHaveLength(5);
  });

  it('TRIE-09: accurately tracks size and clears trie', () => {
    expect(trie.size).toBe(0);
    trie.insert('item1', 'p1');
    trie.insert('item2', 'p2');
    expect(trie.size).toBe(2);
    trie.clear();
    expect(trie.size).toBe(0);
    expect(trie.search('item')).toEqual([]);
  });
});
