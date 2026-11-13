const stable = (value) => JSON.stringify(value, (_key, child) => child && typeof child === 'object' && !Array.isArray(child)
  ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child);

const isReference = (field) => field.type === 'reference';
const isBlocks = (field) => field.type === 'blocks';

/** Add missing editorial structure and starter content without changing existing content. */
export async function runEditorialImport({ client, collections, relations = [], blockTypes = [], entries, apply = false, log = () => {} }) {
  const actualCollections = await client.collections();
  const collectionMap = new Map(actualCollections.map((item) => [item.slug, item]));
  const plans = [];

  for (const expected of collections) {
    const summary = collectionMap.get(expected.slug);
    if (!summary) {
      const { fields = [], ...definition } = expected;
      plans.push({ expected, actual: null, definition, ordinaryFields: fields.filter((field) => !isReference(field) && !isBlocks(field)), referenceFields: fields.filter(isReference), blockFields: fields.filter(isBlocks) });
      log(`Create collection ${expected.slug} (${expected.label}).\n`);
      for (const field of fields.filter((item) => !isReference(item) && !isBlocks(item))) log(`  Add field ${field.slug} (${field.type}).\n`);
      continue;
    }
    const actual = await client.collection(expected.slug);
    if (expected.urlPattern && actual.urlPattern !== expected.urlPattern) throw new Error(`Incompatible URL pattern for ${expected.slug}.`);
    const missingSupport = expected.supports?.filter((support) => !actual.supports.includes(support)) ?? [];
    if (missingSupport.length) throw new Error(`Incompatible ${expected.slug} capabilities: ${missingSupport.join(', ')}.`);
    if (actual.group && expected.group && actual.group !== expected.group) throw new Error(`Incompatible ${expected.slug} sidebar group.`);
    const collectionUpdate = {
      ...(expected.group && !actual.group ? { group: expected.group } : {}),
      ...(expected.icon && !actual.icon ? { icon: expected.icon } : {}),
    };
    for (const [key, value] of Object.entries(collectionUpdate)) log(`Set ${expected.slug} ${key} to ${value}.\n`);
    const fields = new Map(actual.fields.map((field) => [field.slug, field]));
    const addFields = [];
    const relaxRequiredFields = [];
    for (const field of expected.fields) {
      const found = fields.get(field.slug);
      if (!found) { addFields.push(field); continue; }
      if (found.type !== field.type) throw new Error(`Incompatible ${expected.slug}.${field.slug} type.`);
      if ((found.required ?? false) !== (field.required ?? false)) {
        if (field.slug === 'revision_hash' && field.required !== true && found.required === true) relaxRequiredFields.push(field);
        else throw new Error(`Incompatible ${expected.slug}.${field.slug} required.`);
      }
      if (!validationMatches(found, field)) throw new Error(`Incompatible ${expected.slug}.${field.slug} validation.`);
    }
    const ordinaryFields = addFields.filter((field) => !isReference(field) && !isBlocks(field));
    const referenceFields = addFields.filter(isReference);
    const blockFields = addFields.filter(isBlocks);
    for (const field of ordinaryFields) log(`Add field ${expected.slug}.${field.slug} (${field.type}).\n`);
    plans.push({ expected, actual, definition: expected, ordinaryFields, referenceFields, blockFields, relaxRequiredFields, collectionUpdate });
  }

  const currentRelations = (await client.manifest()).relations ?? [];
  const missingRelations = [];
  for (const relation of relations) {
    const current = currentRelations.find((item) => item.slug === relation.slug);
    if (current && stable(normalizeRelation(current)) !== stable(normalizeRelation(relation))) throw new Error(`Incompatible relation ${relation.slug}.`);
    if (!current) { missingRelations.push(relation); log(`Create relation ${relation.slug} (${relation.parentCollection} → ${relation.childCollection}).\n`); }
  }

  const currentBlockTypes = await client.blockTypes();
  const missingBlockTypes = [];
  for (const blockType of blockTypes) {
    const current = currentBlockTypes.find((item) => item.slug === blockType.slug);
    if (current && !blockTypeMatches(current, blockType)) throw new Error(`Incompatible block type ${blockType.slug}.`);
    if (!current) missingBlockTypes.push(blockType);
  }

  for (const { expected, referenceFields } of plans) {
    for (const field of referenceFields) log(`Add reference field ${expected.slug}.${field.slug} after its relation exists.\n`);
  }
  for (const blockType of missingBlockTypes) log(`Create block type ${blockType.slug}.\n`);
  for (const { expected, blockFields } of plans) {
    for (const field of blockFields) log(`Add block field ${expected.slug}.${field.slug} after its block types exist.\n`);
  }

  const existing = new Map();
  for (const collection of new Set(entries.map((item) => item.collection))) {
    for (const status of ['draft', 'published', 'archived', 'scheduled', 'pending', 'private', 'future']) {
      for await (const item of client.listAll(collection, { status, limit: 100 })) if (item.slug) existing.set(`${collection}/${item.slug}`, item);
    }
  }
  const missingEntries = [];
  for (const item of entries) {
    const found = existing.get(`${item.collection}/${item.slug}`);
    if (!found) { missingEntries.push(item); log(`Add starter entry ${item.collection}/${item.slug} (${item.status}).\n`); continue; }
    const actual = await client.get(item.collection, found.id);
    if (JSON.stringify(actual.data) !== JSON.stringify(item.data)) throw new Error(`Edited existing entry ${item.collection}/${item.slug}; refusing to update it.`);
    log(`Preserve matching ${item.collection}/${item.slug} (${actual.status}).\n`);
  }
  if (!apply) { log(`Dry run: ${plans.filter(({ actual }) => !actual).length} collections, ${missingRelations.length} relations, ${missingBlockTypes.length} block types, ${missingEntries.length} entries planned; no changes made.\n`); return { dryRun: true }; }

  // Endpoints must exist before relations, and relations before reference fields.
  for (const { expected, actual, definition, ordinaryFields, relaxRequiredFields = [], collectionUpdate = {} } of plans) {
    if (!actual) await client.createCollection(collectionDefinition(definition));
    else if (Object.keys(collectionUpdate).length) await client.updateCollection(expected.slug, collectionUpdate);
    for (const field of ordinaryFields) await client.createField(expected.slug, field);
    for (const field of relaxRequiredFields) await client.updateField(expected.slug, field.slug, { required: false });
  }
  for (const relation of missingRelations) await client.createRelation(relation);
  for (const { expected, referenceFields } of plans) for (const field of referenceFields) await client.createField(expected.slug, field);
  for (const blockType of missingBlockTypes) await client.createBlockType(toBlockTypeInput(blockType));
  for (const { expected, blockFields } of plans) for (const field of blockFields) await client.createField(expected.slug, field);
  for (const item of missingEntries) {
    const draft = await client.create(item.collection, { slug: item.slug, data: item.data });
    if (item.status === 'published') await client.publish(item.collection, draft.id);
  }
  return { dryRun: false };
}

function collectionDefinition(collection) {
  const { fields: _fields, ...definition } = collection;
  return definition;
}

function toBlockTypeInput(blockType) {
  const version = blockType.versions?.find((item) => item.version === blockType.currentVersion) ?? blockType.versions?.[0];
  if (!version) throw new Error(`Block type ${blockType.slug} has no version fields.`);
  return { slug: blockType.slug, label: blockType.label, ...(blockType.description ? { description: blockType.description } : {}), ...(blockType.icon ? { icon: blockType.icon } : {}), ...(blockType.category ? { category: blockType.category } : {}), fields: version.fields };
}

function blockTypeMatches(current, expected) {
  const input = toBlockTypeInput(expected);
  const fields = current.versions?.find((item) => item.version === current.currentVersion)?.fields ?? current.fields;
  return current.label === input.label && (current.category ?? undefined) === input.category && stable(normalizeBlockFields(fields ?? [])) === stable(normalizeBlockFields(input.fields));
}

function normalizeRelation(relation) {
  return Object.fromEntries(['slug', 'parentCollection', 'childCollection', 'parentLabel', 'parentLabelSingular', 'childLabel', 'childLabelSingular', 'maxChildrenPerParent', 'maxParentsPerChild'].map((key) => [key, relation[key] ?? null]));
}

function normalizeBlockFields(fields) {
  return fields.map((field) => ({
    slug: field.slug,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    ...(field.defaultValue == null ? {} : { defaultValue: field.defaultValue }),
    ...(field.validation == null ? {} : { validation: field.validation }),
    ...(field.options == null ? {} : { options: field.options }),
  }));
}

function validationMatches(found, expected) {
  if (expected.type === 'reference') {
    const actual = found.validation ?? {};
    const required = expected.validation ?? {};
    return Object.keys(required).filter((key) => ['relation', 'relationSide', 'multiple'].includes(key))
      .every((key) => (actual[key] ?? null) === (required[key] ?? null));
  }
  return stable(found.validation ?? null) === stable(expected.validation ?? null);
}

/** Authenticated adapter for the two schema operations missing from the 1.4 client. */
export function createSchemaHttpAdapter({ origin, token, headers: additionalHeaders = {}, fetchImpl = globalThis.fetch }) {
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error('Schema API origin must be a valid site origin.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Schema API target must be a bounded HTTPS site origin (HTTP is allowed only on localhost).');
  }
  if (typeof token !== 'string' || token.trim() === '') throw new Error('An operator token is required for schema changes.');
  const base = parsed.origin;
  async function write(method, path, body, label) {
    const response = await fetchImpl(new URL(path, `${base}/`), {
      method,
      headers: { ...additionalHeaders, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-EmDash-Request': '1' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true || !result?.data) {
      const message = typeof result?.error?.message === 'string' ? result.error.message : `EmDash refused ${label}.`;
      throw new Error(message);
    }
    return result.data;
  }
  return {
    createCollection: async (input) => (await write('POST', '/_emdash/api/schema/collections', collectionDefinition(input), 'collection creation')).item,
    updateCollection: async (slug, input) => (await write('PUT', `/_emdash/api/schema/collections/${encodeURIComponent(slug)}`, input, 'collection grouping update')).item,
    createRelation: async (input) => (await write('POST', '/_emdash/api/relations', normalizeRelation(input), 'relation creation')).relation,
    updateField: async (collection, fieldSlug, input) => (await write('PUT', `/_emdash/api/schema/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(fieldSlug)}`, input, 'field update')).item,
  };
}
