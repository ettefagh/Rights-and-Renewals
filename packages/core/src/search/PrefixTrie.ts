/**
 * PrefixTrie.ts - High-Performance In-Memory Autocomplete Engine (<10ms SLA)
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

export interface TrieSearchResult<T> {
  term: string;
  payload: T;
}

class TrieNode<T> {
  children = new Map<string, TrieNode<T>>();
  isEndOfWord = false;
  payloads: Set<T> = new Set();
}

export class PrefixTrie<T> {
  private root = new TrieNode<T>();
  private wordCount = 0;

  /**
   * Normalizes search tokens (lowercase, trimming, punctuation handling).
   */
  public static normalize(input: string): string {
    return input.toLowerCase().trim();
  }

  /**
   * Tokenizes a multi-word title or sentence into searchable prefix terms.
   */
  public static tokenize(text: string): string[] {
    const normalized = text.toLowerCase();
    const tokens = normalized
      .split(/[\s,._\-/+]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return Array.from(new Set(tokens));
  }

  /**
   * Inserts a key and attaches the associated payload.
   */
  public insert(word: string, payload: T): void {
    const normalized = PrefixTrie.normalize(word);
    if (!normalized) return;

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i]!;
      let next = current.children.get(char);
      if (!next) {
        next = new TrieNode<T>();
        current.children.set(char, next);
      }
      current = next;
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this.wordCount++;
    }
    current.payloads.add(payload);
  }

  /**
   * Inserts all individual words and the full string from a multi-token title.
   */
  public insertPhrase(phrase: string, payload: T): void {
    const normalizedPhrase = PrefixTrie.normalize(phrase);
    if (normalizedPhrase) {
      this.insert(normalizedPhrase, payload);
    }
    const tokens = PrefixTrie.tokenize(phrase);
    for (const token of tokens) {
      this.insert(token, payload);
    }
  }

  /**
   * Searches for all payloads matching the given prefix.
   * Returns deduplicated array of payloads limited to `maxResults`.
   */
  public search(prefix: string, maxResults = 10): T[] {
    const normalized = PrefixTrie.normalize(prefix);
    if (!normalized) {
      return [];
    }

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i]!;
      const next = current.children.get(char);
      if (!next) {
        return [];
      }
      current = next;
    }

    // Collect all payloads downstream
    const results = new Set<T>();
    this.collectPayloads(current, results, maxResults);
    return Array.from(results);
  }

  private collectPayloads(
    node: TrieNode<T>,
    accumulator: Set<T>,
    limit: number
  ): void {
    if (accumulator.size >= limit) {
      return;
    }

    if (node.isEndOfWord) {
      for (const p of node.payloads) {
        accumulator.add(p);
        if (accumulator.size >= limit) return;
      }
    }

    for (const child of node.children.values()) {
      this.collectPayloads(child, accumulator, limit);
      if (accumulator.size >= limit) return;
    }
  }

  /**
   * Clears the entire trie.
   */
  public clear(): void {
    this.root = new TrieNode<T>();
    this.wordCount = 0;
  }

  public get size(): number {
    return this.wordCount;
  }
}
