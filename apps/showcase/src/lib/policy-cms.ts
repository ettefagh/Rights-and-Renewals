import { getEmDashCollection, getEmDashEntry, getRequestContext, isSafeHref, runWithContext } from 'emdash';
import type { PolicyWikiEntry } from '@cmlab/core';

export const POLICY_COLLECTION = 'brand_policies';

interface CmsPolicyFields {
  title: unknown;
  category: unknown;
  statutory_warranty_months: unknown;
  commercial_guarantee_months: unknown;
  cancellation_notice_months: unknown;
  cancellation_button_compliant: unknown;
  cancellation_url?: unknown;
  support_email?: unknown;
  legal_notes: unknown;
  verified_date: unknown;
  search_aliases: unknown;
}

interface CmsPolicyEntry {
  id: string;
  data: CmsPolicyFields;
}

function requiredString(value: unknown, field: string, slug: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`EmDash policy '${slug}' has an invalid ${field} field.`);
  }
  return value.trim();
}

function requiredWholeNumber(value: unknown, field: string, slug: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 120) {
    throw new Error(`EmDash policy '${slug}' has an invalid ${field} field.`);
  }
  return value;
}

function optionalSafeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const trimmed = value.trim();
  return isSafeHref(trimmed) ? trimmed : undefined;
}

function optionalEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
}

async function runWithoutDraftVisibility<T>(read: () => Promise<T>): Promise<T> {
  const context = getRequestContext();
  if (!context || (!context.editMode && !context.preview)) return read();

  const { preview: _preview, ...publicContext } = context;
  return runWithContext({ ...publicContext, editMode: false }, read);
}

function mapPolicyEntry(entry: CmsPolicyEntry): PolicyWikiEntry {
  const slug = entry.id.split('/').at(-1)?.toLowerCase() ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('EmDash policy has an invalid content slug.');
  }

  const data = entry.data;
  const category = data.category;
  if (category !== 'subscription' && category !== 'hardware') {
    throw new Error(`EmDash policy '${slug}' has an invalid category field.`);
  }
  if (typeof data.cancellation_button_compliant !== 'boolean') {
    throw new Error(`EmDash policy '${slug}' has an invalid cancellation_button_compliant field.`);
  }
  if (!Array.isArray(data.search_aliases) || !data.search_aliases.every((alias) => typeof alias === 'string')) {
    throw new Error(`EmDash policy '${slug}' has an invalid search_aliases field.`);
  }

  const verifiedDate = requiredString(data.verified_date, 'verified_date', slug);
  const verifiedDateTimestamp = Date.parse(`${verifiedDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(verifiedDate) ||
    Number.isNaN(verifiedDateTimestamp) ||
    new Date(verifiedDateTimestamp).toISOString().slice(0, 10) !== verifiedDate
  ) {
    throw new Error(`EmDash policy '${slug}' has an invalid verified_date field.`);
  }
  if (verifiedDate > new Date().toISOString().slice(0, 10)) {
    throw new Error(`EmDash policy '${slug}' has a future verified_date field.`);
  }

  const cancellationUrl = optionalSafeUrl(data.cancellation_url);
  const supportEmail = optionalEmail(data.support_email);
  if (data.support_email != null && data.support_email !== '' && !supportEmail) {
    throw new Error(`EmDash policy '${slug}' has an invalid support_email field.`);
  }
  return {
    brandSlug: slug,
    brandName: requiredString(data.title, 'title', slug),
    category,
    statutoryWarrantyMonths: requiredWholeNumber(data.statutory_warranty_months, 'statutory_warranty_months', slug),
    commercialGuaranteeMonths: requiredWholeNumber(data.commercial_guarantee_months, 'commercial_guarantee_months', slug),
    cancellationNoticeMonths: requiredWholeNumber(data.cancellation_notice_months, 'cancellation_notice_months', slug),
    cancellationButtonCompliant: data.cancellation_button_compliant,
    ...(cancellationUrl ? { cancellationUrl } : {}),
    ...(supportEmail ? { supportEmail } : {}),
    legalNotes: requiredString(data.legal_notes, 'legal_notes', slug),
    verifiedDate,
    searchAliases: data.search_aliases.map((alias) => (alias as string).trim()).filter(Boolean),
  };
}

export async function getPublishedPolicies(): Promise<PolicyWikiEntry[]> {
  return runWithoutDraftVisibility(async () => {
    const { entries, error } = await getEmDashCollection<typeof POLICY_COLLECTION, CmsPolicyFields>(
      POLICY_COLLECTION,
      { status: 'published' },
    );
    if (error) throw error;

    const policies: PolicyWikiEntry[] = [];
    for (const entry of entries) {
      try {
        policies.push(mapPolicyEntry(entry));
      } catch (error) {
        console.warn('[policy-cms] Skipping one malformed published policy entry.', error);
      }
    }
    return policies.sort((a, b) => a.brandName.localeCompare(b.brandName));
  });
}

export async function getPublishedPolicy(slug: string): Promise<PolicyWikiEntry | null> {
  return runWithoutDraftVisibility(async () => {
    const { entry, error } = await getEmDashEntry<typeof POLICY_COLLECTION, CmsPolicyFields>(
      POLICY_COLLECTION,
      slug,
    );
    if (error) throw error;
    return entry ? mapPolicyEntry(entry) : null;
  });
}

export async function getPolicyForPage(slug: string): Promise<{
  policy: PolicyWikiEntry | null;
  isPreview: boolean;
}> {
  const { entry, error, isPreview } = await getEmDashEntry<typeof POLICY_COLLECTION, CmsPolicyFields>(
    POLICY_COLLECTION,
    slug,
  );
  if (error) throw error;
  return { policy: entry ? mapPolicyEntry(entry) : null, isPreview };
}
