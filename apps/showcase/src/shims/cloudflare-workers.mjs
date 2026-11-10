/**
 * Shim for 'cloudflare:workers' to allow Astro SSR static prerendering and edge runtime
 * fallback when D1, R2, or KV bindings are not provisioned in the Cloudflare environment.
 */

if (typeof globalThis !== 'undefined' && typeof globalThis.MessageChannel === 'undefined') {
  class MockMessagePort extends EventTarget {
    constructor() { super(); this.onmessage = null; this._other = null; }
    postMessage(msg) {
      if (this._other) {
        queueMicrotask(() => {
          const ev = { data: msg };
          if (typeof this._other.onmessage === 'function') this._other.onmessage(ev);
        });
      }
    }
    start() {}
    close() {}
  }
  class MockMessageChannel {
    constructor() {
      this.port1 = new MockMessagePort();
      this.port2 = new MockMessagePort();
      this.port1._other = this.port2;
      this.port2._other = this.port1;
    }
  }
  globalThis.MessageChannel = MockMessageChannel;
  globalThis.MessagePort = MockMessagePort;
}


class MockD1Statement {
  constructor(sql, db) {
    this.sql = sql;
    this.db = db;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async all() {
    return this.db._exec(this.sql, this.params);
  }

  async run() {
    return this.db._exec(this.sql, this.params);
  }

  async first(colName) {
    const res = await this.all();
    const row = res.results?.[0];
    if (!row) return null;
    return colName !== undefined ? row[colName] : row;
  }

  async raw(options) {
    const res = await this.all();
    return (res.results || []).map((r) => Object.values(r));
  }
}

class MockD1Database {
  constructor() {
    this.options = new Map([
      ['emdash:setup_complete', JSON.stringify(true)],
      ['emdash:site_title', JSON.stringify('Rights & Renewals Sovereign Showcase')],
      ['emdash:site_tagline', JSON.stringify('Statutory EU & German Consumer Rights Engine')],
      ['emdash:site_url', JSON.stringify('https://rightsandrenewals.pages.dev')],
      ['emdash:locale', JSON.stringify('de-DE')],
      ['emdash:auto_seed_complete', JSON.stringify(true)],
      ['site:url', JSON.stringify('https://rightsandrenewals.pages.dev')]
    ]);
    this.users = [
      {
        id: '01JADMIN0000000000000000',
        email: 'admin@rightsandrenewals.org',
        name: 'Rights & Renewals Sovereign Admin',
        role: 1,
        email_verified: 1,
        created_at: '2026-11-10T00:00:00.000Z',
        updated_at: '2026-11-10T00:00:00.000Z'
      }
    ];
    this.migrations = [
      { name: '0001_initial.sql', executed_at: '2026-11-10T00:00:00.000Z' }
    ];
  }

  prepare(sql) {
    return new MockD1Statement(sql, this);
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.all());
    }
    return results;
  }

  async exec(sql) {
    return { count: 1, duration: 0 };
  }

  async dump() {
    return new ArrayBuffer(0);
  }

  withSession(constraint) {
    return {
      prepare: (sql) => this.prepare(sql),
      batch: (stmts) => this.batch(stmts),
      getBookmark: () => 'bm_sovereign_01'
    };
  }

  _exec(sql, params) {
    const lower = sql.toLowerCase().trim();

    // 1. Migration count and table checks
    if (lower.includes('_emdash_migrations')) {
      if (lower.includes('count')) {
        return {
          results: [{ count: 1000 }],
          meta: { changes: 0, last_row_id: null, duration: 0 }
        };
      }
      return {
        results: [...this.migrations],
        meta: { changes: 0, last_row_id: null, duration: 0 }
      };
    }

    // 2. Users table checks
    if (lower.includes('users')) {
      if (lower.includes('count')) {
        return {
          results: [{ count: this.users.length }],
          meta: { changes: 0, last_row_id: null, duration: 0 }
        };
      }
      if (lower.startsWith('select')) {
        return {
          results: [...this.users],
          meta: { changes: 0, last_row_id: null, duration: 0 }
        };
      }
      if (lower.startsWith('insert')) {
        return {
          results: [{ id: params[0] || '01JADMIN0000000000000000' }],
          meta: { changes: 1, last_row_id: 1, duration: 0 }
        };
      }
    }

    // 3. Options table
    if (lower.includes('options')) {
      if (lower.startsWith('select')) {
        // If specific param passed: e.g. name = ? or name in (?, ?)
        if (params.length > 0) {
          const matched = [];
          for (const p of params) {
            if (typeof p === 'string' && this.options.has(p)) {
              matched.push({ name: p, value: this.options.get(p) });
            }
          }
          return {
            results: matched,
            meta: { changes: 0, last_row_id: null, duration: 0 }
          };
        }
        const results = [];
        for (const [name, value] of this.options.entries()) {
          results.push({ name, value });
        }
        return { results, meta: { changes: 0, last_row_id: null, duration: 0 } };
      }

      if (lower.startsWith('insert') || lower.startsWith('update') || lower.includes('into options')) {
        if (params.length >= 2) {
          const name = String(params[0]);
          const val = typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]);
          this.options.set(name, val);
        }
        return { results: [], meta: { changes: 1, last_row_id: 1, duration: 0 } };
      }
    }

    // 4. Default safe fallback for other statements (e.g. pragma, collections, plugin state)
    return {
      results: [],
      meta: { changes: 0, last_row_id: null, duration: 0 }
    };
  }
}

class MockR2Bucket {
  constructor() {
    this.store = new Map();
  }

  async get(key, options) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      key,
      size: item.data.byteLength || item.data.length || 0,
      etag: 'mock-etag',
      httpMetadata: item.metadata || {},
      customMetadata: item.customMetadata || {},
      arrayBuffer: async () => item.data,
      text: async () => new TextDecoder().decode(item.data),
      body: {
        getReader: () => {
          let done = false;
          return {
            read: async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: new Uint8Array(item.data) };
            }
          };
        }
      }
    };
  }

  async head(key) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      key,
      size: item.data.byteLength || 0,
      etag: 'mock-etag',
      httpMetadata: item.metadata || {}
    };
  }

  async put(key, value, options = {}) {
    const buf = value instanceof ArrayBuffer ? value : (value?.buffer || new Uint8Array());
    const obj = {
      key,
      data: buf,
      metadata: options.httpMetadata || {},
      customMetadata: options.customMetadata || {}
    };
    this.store.set(key, obj);
    return {
      key,
      size: buf.byteLength || 0,
      etag: 'mock-etag'
    };
  }

  async delete(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) this.store.delete(k);
  }

  async list(options = {}) {
    return {
      objects: Array.from(this.store.keys()).map((k) => ({ key: k, size: 0 })),
      truncated: false
    };
  }
}

class MockKVNamespace {
  constructor() {
    this.store = new Map();
  }

  async get(key, type = 'text') {
    const val = this.store.get(key);
    if (val === undefined) return null;
    if (type === 'json') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }

  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list() {
    return {
      keys: Array.from(this.store.keys()).map((name) => ({ name })),
      list_complete: true
    };
  }
}

const fallbackDb = new MockD1Database();
const fallbackMedia = new MockR2Bucket();
const fallbackSession = new MockKVNamespace();

export const env = new Proxy({}, {
  get(target, prop) {
    // 1. Real runtime bindings from Cloudflare Pages (set via middleware in globalThis.__CF_ENV__)
    if (typeof globalThis !== 'undefined' && globalThis.__CF_ENV__ && globalThis.__CF_ENV__[prop]) {
      return globalThis.__CF_ENV__[prop];
    }
    // 2. Direct properties on target
    if (target[prop] !== undefined) {
      return target[prop];
    }
    // 3. Fallbacks for known bindings when not bound in Cloudflare
    if (prop === 'DB') return fallbackDb;
    if (prop === 'MEDIA') return fallbackMedia;
    if (prop === 'SESSION') return fallbackSession;
    return undefined;
  }
});

export const waitUntil = (promise) => {
  if (promise && typeof promise.then === 'function') {
    promise.catch(() => {});
  }
};

export class WorkerGlobalScope {}

export class ExecutionContext {
  waitUntil(promise) {}
  passThroughOnException() {}
}

export default { env, waitUntil, WorkerGlobalScope, ExecutionContext };
