import { isDeepStrictEqual } from 'node:util';

export const POLICY_COLLECTION = 'brand_policies';
export const LOGO_FIELD = { slug: 'logo', label: 'Brand logo', type: 'image', required: false };

function withoutLogo(data) {
  const { logo: _logo, ...rest } = data ?? {};
  return rest;
}

function imageReference(media, asset) {
  return {
    id: media.id,
    provider: 'local',
    filename: media.filename ?? asset.filename,
    mimeType: media.mimeType ?? asset.mimeType,
    ...(media.width ?? asset.width ? { width: media.width ?? asset.width } : {}),
    ...(media.height ?? asset.height ? { height: media.height ?? asset.height } : {}),
    alt: asset.alt,
    caption: asset.caption,
  };
}

async function collectMedia(client) {
  const media = [];
  let cursor;
  do {
    const page = await client.mediaList({ limit: 100, ...(cursor ? { cursor } : {}) });
    media.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return media;
}

async function collectPolicyStatuses(client, slugs) {
  const selected = new Map([...slugs].map((slug) => [slug, []]));
  for (const status of ['draft', 'published', 'archived', 'scheduled', 'pending', 'private', 'future']) {
    for await (const item of client.listAll(POLICY_COLLECTION, { status, limit: 100 })) {
      if (selected.has(item.slug)) selected.get(item.slug).push({ ...item, status: item.status ?? status });
    }
  }
  return selected;
}

/**
 * Import the logo as native EmDash media and stage only the optional `logo`
 * field on each existing published policy. It never publishes content.
 */
export async function runBrandLogoImport({ client, entries, apply = false, publishLogoOnly = false, skipConflictingDrafts = false, log = () => {} }) {
  const collection = await client.collection(POLICY_COLLECTION);
  const existingLogoField = collection.fields?.find((field) => field.slug === LOGO_FIELD.slug);
  if (existingLogoField && (existingLogoField.type !== LOGO_FIELD.type || existingLogoField.required)) {
    throw new Error('EmDash field brand_policies.logo must be an optional image field; review the existing field before importing.');
  }

  const byStatus = await collectPolicyStatuses(client, entries.map(({ slug }) => slug));
  const policies = new Map();
  for (const entry of entries) {
    const matches = byStatus.get(entry.slug) ?? [];
    const published = matches.filter((item) => item.status === 'published');
    const other = matches.filter((item) => item.status !== 'published');
    if (other.length) {
      throw new Error(`Import stopped: ${entry.slug} has non-published content (${other.map((item) => item.status).join(', ')}); editorial review is required.`);
    }
    if (published.length !== 1) {
      throw new Error(`Import stopped: expected one existing published ${POLICY_COLLECTION}/${entry.slug} entry, found ${published.length}.`);
    }
    const item = await client.get(POLICY_COLLECTION, published[0].id);
    let draft;
    let skipReason;
    if (item.draftRevisionId) {
      const comparison = await client.compare(POLICY_COLLECTION, item.id);
      draft = comparison.draft;
      if (!draft || !comparison.live) {
        if (!skipConflictingDrafts) throw new Error(`Import stopped: ${entry.slug} has an unreadable pending draft; review it in EmDash.`);
        skipReason = 'pending draft could not be verified';
      }
      if (draft && comparison.live && !isDeepStrictEqual(withoutLogo(comparison.live), withoutLogo(draft))) {
        if (!skipConflictingDrafts) throw new Error(`Import stopped: ${entry.slug} has pending non-logo editorial changes; review its draft before importing logos.`);
        skipReason = 'pending non-logo editorial changes';
      }
    }
    policies.set(entry.slug, { item, draft, skipReason });
  }

  const mediaItems = await collectMedia(client);
  const planned = entries.map((entry) => {
    const { item, draft, skipReason } = policies.get(entry.slug);
    const found = mediaItems.filter((media) => media.filename === entry.asset.filename);
    if (found.length > 1) {
      throw new Error(`Import stopped: multiple media items use ${entry.asset.filename}; resolve the duplicate before importing.`);
    }
    const media = found[0];
    if (media && media.caption !== entry.asset.caption) {
      throw new Error(`Import stopped: media filename ${entry.asset.filename} already exists with different attribution; refusing to reuse or duplicate it.`);
    }
    if (media && (media.mimeType !== entry.asset.mimeType || media.width !== entry.asset.width || media.height !== entry.asset.height || media.size !== entry.asset.bytes.byteLength)) {
      throw new Error(`Import stopped: existing media ${entry.asset.filename} has a different MIME type, dimensions, or byte size; resolve it before importing.`);
    }
    const desired = media ? imageReference(media, entry.asset) : null;
    if (skipReason) return { entry, item, media, alreadyLinked: false, skipReason };
    const publishedLogo = item.data?.logo;
    const draftLogo = draft?.logo;
    const selectedLogo = draftLogo ?? publishedLogo;
    if (selectedLogo && (!desired || selectedLogo.id !== desired.id || (selectedLogo.provider && selectedLogo.provider !== 'local'))) {
      throw new Error(`Import stopped: ${entry.slug} already has a different selected logo; refusing to overwrite it.`);
    }
    if (draftLogo && !desired) {
      throw new Error(`Import stopped: ${entry.slug} has a pending logo that cannot be matched to the attributed media item.`);
    }
    const alreadyLinked = Boolean(selectedLogo && desired && selectedLogo.id === desired.id);
    return { entry, item, media, alreadyLinked };
  });

  const missingMedia = planned.filter(({ media }) => !media).length;
  const missingLinks = planned.filter(({ alreadyLinked, skipReason }) => !alreadyLinked && !skipReason).length;
  const skippedCount = planned.filter(({ skipReason }) => skipReason).length;
  if (!apply) {
    if (!existingLogoField) log('Would add optional image field brand_policies.logo.\n');
    for (const { entry, media, alreadyLinked, skipReason } of planned) {
      if (skipReason) {
        log(`Skip policy link for ${entry.slug}: ${skipReason}; media will still be imported.\n`);
        continue;
      }
      log(`${media ? 'Reuse' : 'Upload'} ${entry.asset.filename}; ${alreadyLinked ? 'logo already staged' : 'stage logo on ' + entry.slug} draft.\n`);
    }
    log(`Dry run: ${missingMedia} media uploads, ${missingLinks} logo draft updates, and ${skippedCount} policy links skipped are ready. No writes performed. Re-run with --apply to import and stage; add --publish-logo-only to publish verified logo-only changes.\n`);
    return { dryRun: true, uploaded: 0, reused: planned.length - missingMedia, staged: 0, alreadyLinked: planned.length - missingLinks - skippedCount, skipped: skippedCount, published: 0 };
  }

  if (!existingLogoField) {
    await client.createField(POLICY_COLLECTION, LOGO_FIELD);
    const confirmedCollection = await client.collection(POLICY_COLLECTION);
    const confirmedField = confirmedCollection.fields?.find((field) => field.slug === LOGO_FIELD.slug);
    if (!confirmedField || confirmedField.type !== LOGO_FIELD.type || confirmedField.required) {
      throw new Error('EmDash did not confirm the optional image field brand_policies.logo.');
    }
    log('Added optional image field brand_policies.logo.\n');
  }

  const folderPages = [];
  let folderCursor;
  do {
    const page = await client.mediaFolderList({ limit: 100, ...(folderCursor ? { cursor: folderCursor } : {}) });
    folderPages.push(...page.items);
    folderCursor = page.nextCursor;
  } while (folderCursor);
  const matchingFolders = folderPages.filter((folder) => folder.name === 'Brand logos');
  if (matchingFolders.length > 1) throw new Error('Import stopped: multiple native media folders are named Brand logos.');
  const folder = matchingFolders[0] ?? await client.mediaFolderCreate('Brand logos');

  let uploaded = 0;
  let staged = 0;
  let reused = 0;
  let alreadyLinked = 0;
  let skipped = 0;
  for (const plan of planned) {
    let media = plan.media;
    if (!media) {
      media = await client.mediaUpload(new Uint8Array(plan.entry.asset.bytes), plan.entry.asset.filename, {
        contentType: plan.entry.asset.mimeType,
        alt: plan.entry.asset.alt,
        caption: plan.entry.asset.caption,
      });
      uploaded++;
      log(`Uploaded ${plan.entry.asset.filename}.\n`);
    } else {
      reused++;
    }
    plan.media = media;
    if (media.folderId !== folder.id) {
      await client.mediaSetFolder(media.id, folder.id);
      media = { ...media, folderId: folder.id };
    }
    if (plan.skipReason) {
      skipped++;
      log(`Imported media for ${plan.entry.slug} but skipped its policy link: ${plan.skipReason}.\n`);
      continue;
    }

    const reference = imageReference(media, plan.entry.asset);
    const policyData = plan.item.data ?? {};
    const current = plan.alreadyLinked ? (plan.item.draftRevisionId ? (await client.compare(POLICY_COLLECTION, plan.item.id)).draft : policyData).logo : null;
    if (current?.id === reference.id && (!current.provider || current.provider === 'local')) {
      alreadyLinked++;
      continue;
    }

    // `data` is deliberately partial: EmDash merges this field into a draft
    // revision. `_rev` makes the staging write fail closed on concurrent edits.
    const updated = await client.update(POLICY_COLLECTION, plan.item.id, {
      data: { logo: reference },
      ...(plan.item._rev ? { _rev: plan.item._rev } : {}),
    });
    if (!updated.draftRevisionId) {
      throw new Error(`EmDash did not confirm a staged logo draft for ${plan.entry.slug}. No publish was requested.`);
    }
    const comparison = await client.compare(POLICY_COLLECTION, plan.item.id);
    if (!comparison.draft || !isDeepStrictEqual(withoutLogo(comparison.live), withoutLogo(comparison.draft)) || comparison.draft.logo?.id !== media.id) {
      throw new Error(`EmDash did not confirm an isolated logo-only draft for ${plan.entry.slug}; stop and review the entry.`);
    }
    staged++;
    log(`Staged logo for ${plan.entry.slug}; its published version is unchanged.\n`);
  }

  let published = 0;
  if (publishLogoOnly) {
    const pending = [];
    for (const plan of planned) {
      if (plan.skipReason) continue;
      const fresh = await client.get(POLICY_COLLECTION, plan.item.id);
      if (!fresh.draftRevisionId) continue;
      const comparison = await client.compare(POLICY_COLLECTION, plan.item.id);
      const expectedMedia = plan.media ?? mediaItems.find((item) => item.filename === plan.entry.asset.filename);
      const logo = comparison.draft?.logo;
      if (!comparison.draft || !isDeepStrictEqual(withoutLogo(comparison.live), withoutLogo(comparison.draft)) || !expectedMedia || logo?.id !== expectedMedia.id || (logo.provider && logo.provider !== 'local')) {
        throw new Error(`Publishing stopped: ${plan.entry.slug} no longer has an isolated logo-only draft for the expected native media item.`);
      }
      pending.push({ plan, expectedMedia, revision: fresh._rev });
    }
    for (const { plan, expectedMedia, revision } of pending) {
      if (!revision) throw new Error(`Publishing stopped: EmDash did not provide a revision token for ${plan.entry.slug}.`);
      // Final read immediately before publishing protects unrelated editorial work.
      const comparison = await client.compare(POLICY_COLLECTION, plan.item.id);
      if (!comparison.draft || !isDeepStrictEqual(withoutLogo(comparison.live), withoutLogo(comparison.draft)) || comparison.draft.logo?.id !== expectedMedia.id) {
        throw new Error(`Publishing stopped: ${plan.entry.slug} changed after logo-only review.`);
      }
      // EmDash's convenience publish() omits `_rev`; use the same native REST
      // contract with its optimistic concurrency token for this explicit path.
      await client.request(
        'POST',
        `/content/${encodeURIComponent(POLICY_COLLECTION)}/${encodeURIComponent(plan.item.id)}/publish`,
        { _rev: revision },
      );
      const confirmed = await client.get(POLICY_COLLECTION, plan.item.id);
      if (confirmed.status !== 'published' || confirmed.data?.logo?.id !== expectedMedia.id || confirmed.draftRevisionId) {
        throw new Error(`EmDash did not confirm publication of the logo-only ${plan.entry.slug} change.`);
      }
      published++;
      log(`Published verified logo-only change for ${plan.entry.slug}.\n`);
    }
  }

  log(`Import complete: ${uploaded} uploaded, ${reused} reused, ${staged} draft links staged, ${alreadyLinked} already linked, ${skipped} policy links skipped, ${published} published.\n`);
  return { dryRun: false, uploaded, reused, staged, alreadyLinked, skipped, published };
}
