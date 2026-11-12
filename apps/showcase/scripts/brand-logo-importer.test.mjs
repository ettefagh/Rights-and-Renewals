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

function fakeClient({ live = { title: 'Spotify policy', legal_notes: 'Editorial text' }, draft = null, media = [], hasLogoField = true } = {}) {
  const state = {
    live: structuredClone(live),
    draft: draft ? structuredClone(draft) : null,
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
      if (status === 'published') yield { id: 'policy-spotify', slug: 'spotify', status: 'published' };
    },
    async get() {
      return { id: 'policy-spotify', slug: 'spotify', status: 'published', data: structuredClone(state.live), draftRevisionId: state.draft ? 'draft-rev' : null, _rev: 'live-rev' };
    },
    async compare() {
      return { live: structuredClone(state.live), draft: state.draft ? structuredClone(state.draft) : null, hasChanges: Boolean(state.draft) };
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
      const item = {
        id: 'media-spotify', filename, mimeType: 'image/png', size: bytes.byteLength,
        width: 512, height: 512, alt: options.alt, caption: options.caption,
      };
      state.media.push(item);
      return structuredClone(item);
    },
    async update(_collection, _id, input) {
      state.writes.update++;
      expect(input.data).toHaveProperty('logo');
      expect(Object.keys(input.data)).toEqual(['logo']);
      expect(input._rev).toBe('live-rev');
      state.draft = { ...(state.draft ?? state.live), ...structuredClone(input.data) };
      return { draftRevisionId: 'draft-rev' };
    },
    async request(method, path, input) {
      expect(method).toBe('POST');
      expect(path).toBe('/content/brand_policies/policy-spotify/publish');
      expect(input).toEqual({ _rev: 'live-rev' });
      state.writes.publish++;
      state.live = structuredClone(state.draft);
      state.draft = null;
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
    expect(state.live).toEqual({ title: 'Spotify policy', legal_notes: 'Editorial text' });
    expect(state.draft).toMatchObject({ title: 'Spotify policy', legal_notes: 'Editorial text', logo: { id: 'media-spotify', provider: 'local' } });
    expect(state.writes).toEqual({ createField: 0, upload: 1, update: 1, publish: 0, folderCreate: 1, folderAssign: 1 });
  });

  it('is idempotent for its own logo-only pending draft and can publish only that isolated change by opt-in', async () => {
    const { client, state } = fakeClient();
    await runBrandLogoImport({ client, entries, apply: true });
    const result = await runBrandLogoImport({ client, entries, apply: true, publishLogoOnly: true });

    expect(result).toMatchObject({ uploaded: 0, reused: 1, staged: 0, alreadyLinked: 1, published: 1 });
    expect(state.writes).toMatchObject({ upload: 1, update: 1, publish: 1, folderCreate: 1 });
    expect(state.live.logo).toMatchObject({ id: 'media-spotify', provider: 'local' });
    expect(state.draft).toBeNull();
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
});
