import { describe, expect, it } from 'vitest';
import { runPolicyImport } from './policy-importer.mjs';

const policyFields = [
  { slug: 'title', type: 'string', required: true, searchable: true },
  { slug: 'support_email', type: 'string' },
];

const policyCollection = {
  slug: 'brand_policies',
  urlPattern: '/wiki/{slug}',
  titleField: 'title',
  supports: ['drafts', 'revisions', 'preview', 'search', 'seo'],
};

const canonicalEntries = [
  { slug: 'spotify', data: { title: 'Canonical Spotify' } },
  { slug: 'apple', data: { title: 'Canonical Apple' } },
];

function createFakeClient({ fields = policyFields, items = [] } = {}) {
  const state = {
    fields: fields.map((field) => ({ ...field, required: Boolean(field.required) })),
    items: items.map((item) => ({ ...item, data: { ...item.data } })),
    writes: { createField: 0, create: 0, publish: 0 },
  };

  const client = {
    async collections() {
      return [{ slug: policyCollection.slug }];
    },
    async collection() {
      return {
        ...policyCollection,
        supports: [...policyCollection.supports],
        fields: state.fields.map((field) => ({ ...field })),
      };
    },
    async *listAll(_slug, { status }) {
      for (const item of state.items) {
        if (item.status === status) yield { slug: item.slug, status: item.status };
      }
    },
    async createField(_slug, field) {
      state.writes.createField++;
      state.fields.push({ ...field, required: Boolean(field.required) });
    },
    async create(_slug, item) {
      state.writes.create++;
      const entry = {
        id: `id-${item.slug}`,
        slug: item.slug,
        status: 'draft',
        data: { ...item.data },
      };
      state.items.push(entry);
      return { id: entry.id };
    },
    async publish(_slug, id) {
      state.writes.publish++;
      const entry = state.items.find((item) => item.id === id);
      if (!entry) throw new Error(`Missing fake entry ${id}.`);
      entry.status = 'published';
    },
    async get(_slug, id) {
      return state.items.find((item) => item.id === id);
    },
  };

  return { client, state };
}

describe('runPolicyImport', () => {
  it('keeps dry-run read-only while reporting missing fields and entries', async () => {
    const { client, state } = createFakeClient({ fields: [policyFields[0]] });
    const messages = [];

    const result = await runPolicyImport({
      client,
      canonicalEntries,
      policyCollection,
      policyFields,
      log: (message) => messages.push(message),
    });

    expect(result).toEqual({ dryRun: true, created: 0, skipped: 0, missingEntries: 2 });
    expect(state.writes).toEqual({ createField: 0, create: 0, publish: 0 });
    expect(messages.join('')).toContain('Would add field support_email (string).');
    expect(messages.join('')).toContain('2 entries can be imported.');
  });

  it('preserves published editorial data and is idempotent on rerun', async () => {
    const existingSpotify = {
      id: 'id-spotify',
      slug: 'spotify',
      status: 'published',
      data: { title: 'Editorial Spotify' },
    };
    const { client, state } = createFakeClient({ items: [existingSpotify] });

    const first = await runPolicyImport({ client, canonicalEntries, policyCollection, policyFields, apply: true });
    const second = await runPolicyImport({ client, canonicalEntries, policyCollection, policyFields, apply: true });

    expect(first).toEqual({ dryRun: false, created: 1, skipped: 1 });
    expect(second).toEqual({ dryRun: false, created: 0, skipped: 2 });
    expect(state.items.find((item) => item.slug === 'spotify').data).toEqual({ title: 'Editorial Spotify' });
    expect(state.items.filter((item) => item.slug === 'apple')).toHaveLength(1);
    expect(state.writes).toEqual({ createField: 0, create: 1, publish: 1 });
  });

  it('stops before writes when a canonical slug already exists as a draft', async () => {
    const { client, state } = createFakeClient({
      items: [{ id: 'id-spotify', slug: 'spotify', status: 'draft', data: { title: 'Draft Spotify' } }],
    });

    await expect(
      runPolicyImport({ client, canonicalEntries, policyCollection, policyFields, apply: true }),
    ).rejects.toThrow('spotify (draft)');

    expect(state.writes).toEqual({ createField: 0, create: 0, publish: 0 });
  });
});
