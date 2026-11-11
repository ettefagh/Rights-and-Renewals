export interface TelemetryPageMetadata {
  pageId: string;
  revision: string;
}

export interface TelemetryEntityPageMetadata extends TelemetryPageMetadata {
  entityId: string;
}

export interface CmsPageTelemetryInput {
  id: string;
  title: string;
  description?: string;
  sections: unknown[];
}

export interface PlanTelemetryInput {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

export const telemetryRevision = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return `sha256-${[...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

export async function cmsPageTelemetryMetadata(page: CmsPageTelemetryInput): Promise<TelemetryPageMetadata> {
  return {
    pageId: `page:${page.id}`,
    revision: await telemetryRevision({ title: page.title, description: page.description ?? '', sections: page.sections }),
  };
}

export async function wikiTelemetryMetadata(): Promise<TelemetryPageMetadata> {
  return {
    pageId: 'page:wiki',
    revision: await telemetryRevision({ route: '/wiki', title: 'Policy Wiki' }),
  };
}

export async function policyTelemetryMetadata(policy: { brandSlug: string }): Promise<TelemetryEntityPageMetadata> {
  const entityId = `policy:${policy.brandSlug}`;
  return {
    pageId: `page:${entityId}`,
    entityId,
    revision: await telemetryRevision(policy),
  };
}

export async function planTelemetryMetadata(plan: PlanTelemetryInput): Promise<TelemetryEntityPageMetadata> {
  const entityId = `plan:${plan.id}`;
  return {
    pageId: `page:${entityId}`,
    entityId,
    revision: await telemetryRevision({ id: plan.id, slug: plan.slug, title: plan.title, summary: plan.summary }),
  };
}
