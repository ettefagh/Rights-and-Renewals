import { describe, expect, it } from 'vitest';
import { telemetryRevision } from './telemetry-page-metadata';
import {
  cmsPageTelemetryMetadata,
  planTelemetryMetadata,
  policyTelemetryMetadata,
  wikiTelemetryMetadata,
} from './telemetry-page-metadata';

describe('telemetry page metadata', () => {
  it('builds a stable CMS page id and hashes only its public page content', async () => {
    const page = { id: 'about-us', title: 'About', sections: [{ _key: 'intro', body: 'Hello' }] };
    const expectedRevision = await telemetryRevision({ title: 'About', description: '', sections: page.sections });
    const actual = await cmsPageTelemetryMetadata(page);
    expect(actual).toEqual({ pageId: 'page:about-us', revision: expectedRevision });
    expect(await cmsPageTelemetryMetadata({ ...page })).toEqual(actual);
    expect(await cmsPageTelemetryMetadata({ ...page, description: 'About the project' })).not.toEqual(actual);
  });

  it('uses the fixed wiki page identity and revision payload', async () => {
    expect(await wikiTelemetryMetadata()).toEqual({
      pageId: 'page:wiki',
      revision: await telemetryRevision({ route: '/wiki', title: 'Policy Wiki' }),
    });
  });

  it('maps policy page and entity identity to the same brand slug and policy hash', async () => {
    const policy = { brandSlug: 'acme-mobile', title: 'Acme Mobile', verified_date: '2026-11-01' };
    const metadata = await policyTelemetryMetadata(policy);
    expect(metadata).toEqual({
      pageId: 'page:policy:acme-mobile', entityId: 'policy:acme-mobile', revision: await telemetryRevision(policy),
    });
    expect(metadata.pageId.replace('page:', '')).toBe(metadata.entityId);
  });

  it('maps plan page and entity identity to the same id and hashes the public summary fields', async () => {
    const plan = { id: 'plan-42', slug: 'student-basic', title: 'Student Basic', summary: 'A compact plan', href: '/plans/student-basic' };
    const metadata = await planTelemetryMetadata(plan);
    expect(metadata).toEqual({
      pageId: 'page:plan:plan-42', entityId: 'plan:plan-42',
      revision: await telemetryRevision({ id: plan.id, slug: plan.slug, title: plan.title, summary: plan.summary }),
    });
    expect(metadata.pageId.replace('page:', '')).toBe(metadata.entityId);
    const differentHref = { ...plan, href: '/plans/elsewhere' };
    expect(await planTelemetryMetadata(differentHref)).toEqual(metadata);
  });
});

