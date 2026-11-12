import { describe, expect, it } from 'vitest';
import { runBrandLogoImport } from './brand-logo-importer.mjs';

const entries = [
  {
    slug: 'spotify',
    asset: {
      filename: 'brand-spotify-logo-sourcehash-outputhash.png',
      mimeType: 'image/png',
      width: 512,
      height: 512,
      alt: 'Spotify',
      caption: 'Source: Simple Icons; source SHA-256 and derivative SHA-256.',
      bytes: Buffer.from([137, 80, 78, 71]),
    },
  },
];

function fakeClient({ live = { title: 'Spotify policy', legal_notes: 'Editorial text' }, draft = null, media = [], hasLogoField = true, records: providedRecords } = {}) {
  const state = {
    records: structuredClone(providedRecords ?? [{ slug: 'spotify', id: 'policy-spotify', status: 'published', live, draft }]),
    media: structuredClone(media),
    folder: null,
    hasLogoField,
    writes: { createField: 0, upload: 0, update: 0, publish: 0, folderCreate: 0, folderAssign: 0 },
  };
  const client = {
    async collection() { return { fields: state.hasLogoField ? [{ slug: 'logo', type: 'image', required: false }] : [] }; },
    async createField(_collection, field) {
      expect(field).toEqual({ slug: 'logo', label: 'Brand logo', type: 'image', required: false });
      state.writes.createField++;
      state.hasLogoField = true;
    },
    async *listAll(_slug, { status }) {
      for (const record of state.records) if (record.status === status) yield { id: record.id, slug: record.slug, status: record.status };
    },
    async get(_collection, id) {
      const record = state.records.find((item) => item.id === id);
      return { id: record.id, slug: record.slug, status: record.status, data: structuredClone(record.live), draftRevisionId: record.draft ? `draft-${record.slug}` : null, _rev: `rev-${record.slug}` };
    },
    async compare(_collection, id) {
      const record = state.records.find((item) => item.id === id);
      return { live: structuredClone(record.live), draft: record.draft ? structuredClone(record.draft) : null, hasChanges: Boolean(record.draft) };
    },
    async mediaList() { return { items: structuredClone(state.media) }; },
    async mediaFolderList() { return { items: state.folder ? [structuredClone(state.folder)] : [] }; },
    async mediaFolderCreate(name) {
      state.writes.folderCreate++;
      state.folder = { id: 'folder-brand-logos', name };
      return structuredClone(state.folder);
    },
    async mediaSetFolder(id, folderId) {
      state.writes.folderAssign++;
      const item = state.media.find((mediaItem) => mediaItem.id === id);
      item.folderId = folderId;
      return { id, folderId };
    },
    async mediaUpload(bytes, filename, options) {
      state.writes.upload++;
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(options.contentType).toBe('image/png');
      const slug = /^brand-(.+?)-logo-/.exec(filename)?.[1] ?? 'unknown';
      const item = {
        id: `media-${slug}`, filename, mimeType: 'image/png', size: bytes.byteLength,
        width: 512, height: 512, alt: options.alt, caption: options.caption,
      };
      state.media.push(item);
      return structuredClone(item);
    },
    async update(_collection, id, input) {
      state.writes.update++;
      expect(input.data).toHaveProperty('logo');
      expect(Object.keys(input.data)).toEqual(['logo']);
      const record = state.records.find((item) => item.id === id);
      expect(input._rev).toBe(`rev-${record.slug}`);
      record.updateCount = (record.updateCount ?? 0) + 1;
      record.draft = { ...(record.draft ?? record.live), ...structuredClone(input.data) };
      return { draftRevisionId: `draft-${record.slug}` };
    },
    async request(method, path, input) {
      expect(method).toBe('POST');
      const id = path.split('/').at(-2);
      const record = state.records.find((item) => item.id === id);
      expect(path).toBe(`/content/brand_policies/${id}/publish`);
      expect(input).toEqual({ _rev: `rev-${record.slug}` });
      state.writes.publish++;
      record.publishCount = (record.publishCount ?? 0) + 1;
      record.live = structuredClone(record.draft);
      record.draft = null;
    },
  };
  return { client, state };
}

describe('runBrandLogoImport', () => {
  it('defaults to read-only and reports native upload and staged update counts', async () => {
    const { client, state } = fakeClient({ hasLogoField: false });
    const logs = [];
    const result = await runBrandLogoImport({ client, entries, log: (line) => logs.push(line) });

    expect(result).toMatchObject({ dryRun: true, uploaded: 0, staged: 0, published: 0 });
    expect(state.writes).toEqual({ createField: 0, upload: 0, update: 0, publish: 0, folderCreate: 0, folderAssign: 0 });
    expect(logs.join('')).toContain('Would add optional image field brand_policies.logo');
    expect(logs.join('')).toContain('No writes performed');
  });

  it('adds only the optional image field when applying against a site that lacks it', async () => {
    const { client, state } = fakeClient({ hasLogoField: false });
    await runBrandLogoImport({ client, entries, apply: true });
    expect(state.writes.createField).toBe(1);
    expect(state.hasLogoField).toBe(true);
  });

  it('uploads native media and stages only the logo field without publishing', async () => {
    const { client, state } = fakeClient();
    const result = await runBrandLogoImport({ client, entries, apply: true });

    expect(result).toMatchObject({ dryRun: false, uploaded: 1, reused: 0, staged: 1, published: 0 });
    expect(state.records[0].live).toEqual({ title: 'Spotify policy', legal_notes: 'Editorial text' });
    expect(state.records[0].draft).toMatchObject({ title: 'Spotify policy', legal_notes: 'Editorial text', logo: { id: 'media-spotify', provider: 'local' } });
    expect(state.writes).toEqual({ createField: 0, upload: 1, update: 1, publish: 0, folderCreate: 1, folderAssign: 1 });
  });

  it('is idempotent for its own logo-only pending draft and can publish only that isolated change by opt-in', async () => {
    const { client, state } = fakeClient();
    await runBrandLogoImport({ client, entries, apply: true });
    const result = await runBrandLogoImport({ client, entries, apply: true, publishLogoOnly: true });

    expect(result).toMatchObject({ uploaded: 0, reused: 1, staged: 0, alreadyLinked: 1, published: 1 });
    expect(state.writes).toMatchObject({ upload: 1, update: 1, publish: 1, folderCreate: 1 });
    expect(state.records[0].live.logo).toMatchObject({ id: 'media-spotify', provider: 'local' });
    expect(state.records[0].draft).toBeNull();
  });

  it('stops before uploads when a pending draft contains other editorial changes', async () => {
    const { client, state } = fakeClient({ draft: { title: 'Edited title', legal_notes: 'Editorial text' } });
    await expect(runBrandLogoImport({ client, entries, apply: true })).rejects.toThrow('pending non-logo editorial changes');
    expect(state.writes).toEqual({ createField: 0, upload: 0, update: 0, publish: 0, folderCreate: 0, folderAssign: 0 });
  });

  it('does not replace an editor-selected logo', async () => {
    const { client, state } = fakeClient({ live: { title: 'Spotify policy', logo: { id: 'editor-media', provider: 'local' } } });
    await expect(runBrandLogoImport({ client, entries, apply: true })).rejects.toThrow('already has a different selected logo');
    expect(state.writes).toEqual({ createField: 0, upload: 0, update: 0, publish: 0, folderCreate: 0, folderAssign: 0 });
  });

  it('imports every asset and only links and publishes the 19 policies without conflicting drafts', async () => {
    const slugs = [
      'spotify', 'apple', 'mediamarkt', 'amazon', 'netflix', 'adobe', 'microsoft',
      'deutsche-bahn', 'github', 'jetbrains', 'youtube', 'saturn', 'otto', 'mindfactory',
      'notion', 'gymshark', 'mcfit', 'urban-sports-club', 'disney-plus', 'vodafone',
    ];
    const manyEntries = slugs.map((slug) => ({
      slug,
      asset: {
        ...entries[0].asset,
        filename: `brand-${slug}-logo-sourcehash-outputhash.png`,
        alt: slug,
      },
    }));
    const records = manyEntries.map(({ slug }) => {
      const live = { title: `${slug} policy`, cancellation_button_compliant: true, _slug: slug };
      return {
        id: `policy-${slug}`,
        slug,
        status: 'published',
        live,
        draft: slug === 'gymshark' ? { ...live, cancellation_button_compliant: false } : null,
      };
    });
    const { client, state } = fakeClient({ records });
    const logs = [];
    const result = await runBrandLogoImport({
      client,
      entries: manyEntries,
      apply: true,
      skipConflictingDrafts: true,
      publishLogoOnly: true,
      log: (line) => logs.push(line),
    });

    const gymshark = state.records.find((item) => item.slug === 'gymshark');
    expect(result).toMatchObject({ uploaded: 20, staged: 19, skipped: 1, published: 19 });
    expect(state.media).toHaveLength(20);
    expect(state.writes.folderAssign).toBe(20);
    expect(state.writes.update).toBe(19);
    expect(state.writes.publish).toBe(19);
    expect(gymshark.updateCount ?? 0).toBe(0);
    expect(gymshark.publishCount ?? 0).toBe(0);
    expect(gymshark.draft).toEqual({ ...gymshark.live, cancellation_button_compliant: false });
    expect(logs.join('')).toContain('Imported media for gymshark but skipped its policy link: pending non-logo editorial changes.');
    expect(logs.join('')).not.toContain('cancellation_button_compliant');
  });
});
