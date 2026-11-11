import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { editorialCollections } from './editorial-catalog.mjs';
import { buildCatalogResearch, validateCatalogResearch } from './catalog-research.mjs';

describe('draft catalog research artifact', () => {
  it('matches the installed editorial schema and seed validator', async () => {
    const artifact = JSON.parse(await readFile(new URL('../seed/catalog-research-2026-11-11.json', import.meta.url), 'utf8'));
    const result = await validateCatalogResearch(artifact);
    expect(result.valid, result.errors.join('\n')).toBe(true);
  });

  it('contains only draft entries with date and cited source metadata and no assessments', () => {
    const artifact = buildCatalogResearch();
    expect(artifact.entries.length).toBeGreaterThan(20);
    expect(artifact.entries.every((entry) => entry.status === 'draft' && entry.observedOn === artifact.observedOn && entry.sourceIds.length > 0)).toBe(true);
    expect(artifact.entries.some((entry) => entry.collection === 'policy_assessments')).toBe(false);
    expect(artifact.relations.length).toBeGreaterThan(0);
  });

  it('rejects publication, uncited rows, and relation endpoint mismatches', async () => {
    const artifact = buildCatalogResearch();
    artifact.entries[0].status = 'published';
    artifact.entries[1].sourceIds = ['missing-source'];
    artifact.relations[0].child.collection = 'policy_plans';
    const result = await validateCatalogResearch(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('must remain draft'))).toBe(true);
    expect(result.errors.some((error) => error.includes('must cite known source IDs'))).toBe(true);
    expect(result.errors.some((error) => error.includes('schema endpoints'))).toBe(true);
  });

  it('uses only fields defined by the installed editorial collection schema', () => {
    const fieldSets = new Map(editorialCollections.map((collection) => [collection.slug, new Set(collection.fields.map((field) => field.slug))]));
    for (const entry of buildCatalogResearch().entries) {
      for (const field of Object.keys(entry.data)) expect(fieldSets.get(entry.collection).has(field), `${entry.collection}.${field}`).toBe(true);
    }
  });
});
