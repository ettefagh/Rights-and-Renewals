import { describe, expect, it } from 'vitest';
import { websiteBlockTypes, websiteContent } from './website-catalog.mjs';

describe('website page placement catalog', () => {
  it('offers only supported placement values on every editorial block', () => {
    for (const block of websiteBlockTypes) {
      const field = block.versions[0].fields.find(({ slug }) => slug === 'placement');
      expect(field).toMatchObject({
        type: 'select',
        validation: { options: ['content', 'home-intro', 'agent-intro'] },
      });
    }
  });

  it('seeds the home and agent introductions into their template slots while retaining home content blocks', () => {
    const home = websiteContent.pages.find(({ slug }) => slug === 'home');
    const agentSetup = websiteContent.pages.find(({ slug }) => slug === 'agent-setup');

    expect(home?.sections.map(({ _key, placement }) => ({ _key, placement }))).toEqual([
      { _key: 'home-hero-v1', placement: 'home-intro' },
      { _key: 'home-wiki-v1', placement: undefined },
      { _key: 'home-wallet-steps-v1', placement: undefined },
    ]);
    expect(agentSetup?.sections.map(({ _key, placement }) => ({ _key, placement }))).toEqual([
      { _key: 'agent-setup-hero-v1', placement: 'agent-intro' },
    ]);
  });
});
