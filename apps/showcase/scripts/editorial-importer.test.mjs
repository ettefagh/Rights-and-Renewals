import { describe, expect, it } from 'vitest';
import { createSchemaHttpAdapter, runEditorialImport } from './editorial-importer.mjs';

const fixture = () => {
  const calls = [];
  const records = new Map();
  const client = {
    collections: async () => [{ slug: 'guides' }],
    collection: async () => ({ urlPattern: '/guides/{slug}', supports: [], fields: [{ slug: 'title', type: 'string', required: true }] }),
    manifest: async () => ({ relations: [] }),
    blockTypes: async () => [],
    listAll: async function* (collection, { status }) { for (const item of records.values()) if (item.collection === collection && item.status === status) yield item; },
    get: async (_collection, id) => records.get(id),
    createCollection: async (...args) => calls.push(['collection', ...args]),
    updateCollection: async (...args) => calls.push(['update-collection', ...args]),
    createRelation: async (...args) => calls.push(['relation', ...args]),
    createField: async (...args) => calls.push(['field', ...args]),
    updateField: async (...args) => calls.push(['update-field', ...args]),
    createBlockType: async (...args) => calls.push(['block', ...args]),
    create: async (...args) => { calls.push(['create', ...args]); return { id: 'new-id' }; },
    publish: async (...args) => calls.push(['publish', ...args]),
  };
  return { client, calls, records };
};

describe('editorial importer', () => {
  it('shows an ordered actionable plan by default without writes', async () => {
    const { client, calls } = fixture();
    const plan = [];
    await runEditorialImport({ client, collections: [{ slug: 'new', label: 'New', urlPattern: '/new/{slug}', fields: [{ slug: 'title', type: 'string' }, { slug: 'related', type: 'reference' }, { slug: 'sections', type: 'blocks' }] }], relations: [{ slug: 'new_related', parentCollection: 'new', childCollection: 'guides', parentLabel: 'News', childLabel: 'Guides' }], blockTypes: [{ slug: 'hero', label: 'Hero', currentVersion: 1, versions: [{ version: 1, fields: [{ slug: 'heading', label: 'Heading', type: 'string' }] }] }], entries: [{ collection: 'guides', slug: 'one', status: 'draft', data: { title: 'One' } }], log: (line) => plan.push(line) });
    expect(calls).toEqual([]);
    expect(plan.join('')).toContain('Create collection new');
    expect(plan.join('')).toContain('Add reference field new.related');
    expect(plan.join('')).toContain('Create block type hero');
    expect(plan.join('')).toContain('Add block field new.sections');
  });

  it('refuses incompatible fields before writing', async () => {
    const { client, calls } = fixture();
    await expect(runEditorialImport({ client, collections: [{ slug: 'guides', fields: [{ slug: 'title', type: 'text', required: true }] }], entries: [], apply: true })).rejects.toThrow('Incompatible');
    expect(calls).toEqual([]);
  });

  it('creates schema endpoints, relations, block types, then content on first apply', async () => {
    const { client, calls } = fixture();
    const collections = [{ slug: 'new', label: 'New', group: 'Website', urlPattern: '/new/{slug}', supports: ['drafts'], fields: [{ slug: 'title', type: 'string' }, { slug: 'related', type: 'reference', validation: { relation: 'new_related', relationSide: 'child', multiple: false } }, { slug: 'sections', type: 'blocks' }] }];
    const relations = [{ slug: 'new_related', parentCollection: 'guides', childCollection: 'new', parentLabel: 'Guides', childLabel: 'News', maxParentsPerChild: 1 }];
    const blockTypes = [{ slug: 'hero', label: 'Hero', currentVersion: 1, versions: [{ version: 1, fields: [{ slug: 'heading', label: 'Heading', type: 'string' }] }] }];
    await runEditorialImport({ client, collections, relations, blockTypes, entries: [{ collection: 'new', slug: 'home', status: 'published', data: { title: 'Home' } }], apply: true });
    expect(calls.map(([kind]) => kind)).toEqual(['collection', 'field', 'relation', 'field', 'block', 'field', 'create', 'publish']);
    expect(calls[0][1]).toMatchObject({ slug: 'new', group: 'Website', urlPattern: '/new/{slug}' });
    expect(calls[3][2].slug).toBe('related');
    expect(calls[4][1]).toMatchObject({ slug: 'hero', fields: [{ slug: 'heading' }] });
  });

  it('preserves matching existing starter entries on rerun', async () => {
    const { client, calls, records } = fixture();
    records.set('existing', { id: 'existing', collection: 'guides', slug: 'one', status: 'published', data: { title: 'One' } });
    const result = await runEditorialImport({ client, collections: [{ slug: 'guides', urlPattern: '/guides/{slug}', fields: [{ slug: 'title', type: 'string', required: true }] }], entries: [{ collection: 'guides', slug: 'one', status: 'published', data: { title: 'One' } }], apply: true });
    expect(result.dryRun).toBe(false);
    expect(calls).toEqual([]);
  });

  it('recognizes an already-created relation-backed field and does not recreate it on rerun', async () => {
    const { client, calls } = fixture();
    client.collections = async () => [{ slug: 'guides' }];
    client.collection = async () => ({ urlPattern: '/guides/{slug}', supports: [], group: 'Policy catalog', icon: 'database', fields: [
      { slug: 'title', type: 'string', required: true },
      { slug: 'related', type: 'reference', required: false, validation: { relation: 'guide_refs', relationSide: 'child', multiple: false, targetCollection: 'other' } },
    ] });
    client.manifest = async () => ({ relations: [{ slug: 'guide_refs', parentCollection: 'other', childCollection: 'guides', parentLabel: 'Others', parentLabelSingular: 'Other', childLabel: 'Guides', childLabelSingular: 'Guide', maxChildrenPerParent: null, maxParentsPerChild: 1 }] });
    await runEditorialImport({ client, collections: [{ slug: 'guides', group: 'Policy catalog', icon: 'database', urlPattern: '/guides/{slug}', fields: [
      { slug: 'title', type: 'string', required: true },
      { slug: 'related', type: 'reference', validation: { relation: 'guide_refs', relationSide: 'child', multiple: false } },
    ] }], relations: [{ slug: 'guide_refs', parentCollection: 'other', childCollection: 'guides', parentLabel: 'Others', parentLabelSingular: 'Other', childLabel: 'Guides', childLabelSingular: 'Guide', maxChildrenPerParent: null, maxParentsPerChild: 1 }], entries: [], apply: true });
    expect(calls).toEqual([]);
  });

  it('recognizes an existing block type after EmDash fills default field values', async () => {
    const { client, calls } = fixture();
    client.blockTypes = async () => [{ slug: 'hero', label: 'Hero', currentVersion: 1, versions: [{ version: 1, fields: [{ slug: 'heading', label: 'Heading', type: 'string', required: false }] }] }];
    await runEditorialImport({ client, collections: [{ slug: 'guides', urlPattern: '/guides/{slug}', fields: [{ slug: 'title', type: 'string', required: true }] }], blockTypes: [{ slug: 'hero', label: 'Hero', currentVersion: 1, versions: [{ version: 1, fields: [{ slug: 'heading', label: 'Heading', type: 'string' }] }] }], entries: [], apply: true });
    expect(calls).toEqual([]);
  });

  it('refuses a conflicting existing sidebar group instead of replacing it', async () => {
    const { client, calls } = fixture();
    client.collection = async () => ({ urlPattern: '/guides/{slug}', supports: [], group: 'Custom', fields: [{ slug: 'title', type: 'string', required: true }] });
    await expect(runEditorialImport({ client, collections: [{ slug: 'guides', group: 'Policy catalog', urlPattern: '/guides/{slug}', fields: [{ slug: 'title', type: 'string', required: true }] }], entries: [], apply: true })).rejects.toThrow('sidebar group');
    expect(calls).toEqual([]);
  });

  it('relaxes only an existing required revision hash field so an existing model can accept server-filled hashes', async () => {
    const { client, calls } = fixture();
    client.collection = async () => ({ urlPattern: '/guides/{slug}', supports: [], fields: [
      { slug: 'title', type: 'string', required: true },
      { slug: 'revision_hash', label: 'Revision SHA-256', type: 'string', required: true },
    ] });
    await runEditorialImport({ client, collections: [{ slug: 'guides', urlPattern: '/guides/{slug}', fields: [
      { slug: 'title', type: 'string', required: true },
      { slug: 'revision_hash', label: 'Revision fingerprint (filled by review workflow)', type: 'string' },
    ] }], entries: [], apply: true });
    expect(calls).toEqual([['update-field', 'guides', 'revision_hash', { required: false }]]);
  });

  it('refuses an edited existing entry instead of repairing it', async () => {
    const { client, calls, records } = fixture();
    records.set('existing', { id: 'existing', collection: 'guides', slug: 'one', status: 'published', data: { title: 'Editor version' } });
    await expect(runEditorialImport({ client, collections: [{ slug: 'guides', urlPattern: '/guides/{slug}', fields: [{ slug: 'title', type: 'string', required: true }] }], entries: [{ collection: 'guides', slug: 'one', status: 'published', data: { title: 'Seed version' } }], apply: true })).rejects.toThrow('refusing to update');
    expect(calls).toEqual([]);
  });

  it('sends authenticated requests with the verified EmDash schema routes and exact bodies', async () => {
    const calls = [];
    const adapter = createSchemaHttpAdapter({ origin: 'https://cms.example', token: 'operator-secret', headers: { 'CF-Access-Client-Id': 'edge-client' }, fetchImpl: async (url, init) => {
      calls.push([String(url), init]);
      return new Response(JSON.stringify({ success: true, data: { item: { slug: 'new' }, relation: { slug: 'linked' } } }), { status: 201, headers: { 'content-type': 'application/json' } });
    } });
    await adapter.createCollection({ slug: 'new', label: 'New', labelSingular: 'New', group: 'Website', icon: 'globe', urlPattern: '/new/{slug}', supports: ['drafts'], fields: [{ slug: 'title' }] });
    await adapter.createRelation({ slug: 'linked', parentCollection: 'new', childCollection: 'guides', parentLabel: 'News', childLabel: 'Guides' });
    await adapter.updateCollection('pages', { group: 'Website', icon: 'globe' });
    await adapter.updateField('policy_offer_versions', 'revision_hash', { required: false });
    expect(calls[0][0]).toBe('https://cms.example/_emdash/api/schema/collections');
    expect(calls[0][1].headers).toMatchObject({ Authorization: 'Bearer operator-secret', 'X-EmDash-Request': '1', 'CF-Access-Client-Id': 'edge-client' });
    expect(JSON.parse(calls[0][1].body)).toMatchObject({ slug: 'new', group: 'Website', urlPattern: '/new/{slug}' });
    expect(calls[1][0]).toBe('https://cms.example/_emdash/api/relations');
    expect(JSON.parse(calls[1][1].body)).toMatchObject({ slug: 'linked', parentCollection: 'new', childCollection: 'guides' });
    expect(calls[2][0]).toBe('https://cms.example/_emdash/api/schema/collections/pages');
    expect(calls[2][1].method).toBe('PUT');
    expect(JSON.parse(calls[2][1].body)).toEqual({ group: 'Website', icon: 'globe' });
    expect(calls[3][0]).toBe('https://cms.example/_emdash/api/schema/collections/policy_offer_versions/fields/revision_hash');
    expect(calls[3][1].method).toBe('PUT');
    expect(JSON.parse(calls[3][1].body)).toEqual({ required: false });
  });

  it('requires a safe origin and operator token for schema writes', () => {
    expect(() => createSchemaHttpAdapter({ origin: 'https://user:pass@cms.example/path', token: 'x' })).toThrow('bounded HTTPS');
    expect(() => createSchemaHttpAdapter({ origin: 'https://cms.example' })).toThrow('operator token');
  });
});
