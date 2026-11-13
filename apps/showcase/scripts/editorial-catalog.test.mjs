import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateSeed } from 'emdash/seed';
import { editorialCollections, editorialRelations, providerIdentityEntries } from './editorial-catalog.mjs';

describe('editorial policy graph schema', () => {
  it('defines real relation-backed reference pickers with matching collection ends', () => {
    const collections = new Map(editorialCollections.map((collection) => [collection.slug, collection]));
    const relations = new Map(editorialRelations.map((relation) => [relation.slug, relation]));
    for (const collection of editorialCollections) {
      for (const reference of collection.fields.filter((field) => field.type === 'reference')) {
        const relation = relations.get(reference.validation.relation);
        expect(relation, `${collection.slug}.${reference.slug} relation exists`).toBeDefined();
        const side = reference.validation.relationSide;
        const target = side === 'parent' ? relation.childCollection : relation.parentCollection;
        expect([relation.parentCollection, relation.childCollection]).toContain(collection.slug);
        expect(reference.validation.targetCollection ?? target).toBe(target);
      }
    }
    expect(editorialRelations).toHaveLength(8);
  });

  it('does not enable scheduling for sensitive assessments', () => {
    const assessments = editorialCollections.find((collection) => collection.slug === 'policy_assessments');
    expect(assessments.supports).not.toContain('scheduling');
  });

  it('groups policy editing and leaves revision fingerprints optional', () => {
    expect(editorialCollections.filter(({ group }) => group !== 'Policy catalog')).toEqual([]);
    for (const collection of editorialCollections.filter(({ slug }) => ['policy_offer_versions', 'policy_rule_versions', 'policy_evidence', 'policy_assessments'].includes(slug))) {
      expect(collection.fields.find(({ slug }) => slug === 'revision_hash')?.required).not.toBe(true);
    }
  });

  it('seeds only the stable identity from the reviewed 20-brand catalog', async () => {
    const brands = JSON.parse(await readFile(new URL('../public/data/policy_wiki_seed_v1.json', import.meta.url), 'utf8'));
    const providers = providerIdentityEntries(brands);
    expect(providers).toHaveLength(20);
    expect(providers[0]).toMatchObject({ slug: 'spotify', data: { title: 'Spotify', stable_key: 'provider:spotify' } });
    expect(Object.keys(providers[0].data).sort()).toEqual(['stable_key', 'title']);
  });

  it('passes the installed EmDash 1.4 seed and relation validator', () => {
    const result = validateSeed({
      version: '1',
      meta: { name: 'Policy graph test', description: 'Hypothetical schema fixture.' },
      collections: editorialCollections,
      relations: editorialRelations,
    });
    expect(result.valid, result.errors.join('\n')).toBe(true);
  });
});
