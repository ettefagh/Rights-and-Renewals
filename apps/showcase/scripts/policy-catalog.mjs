import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const canonicalSource = new URL('../../../packages/core/src/data/policyWikiSeed.ts', import.meta.url);

export const policyFields = [
  {
    slug: 'title',
    label: 'Brand name',
    type: 'string',
    required: true,
    searchable: true,
    validation: { minLength: 1, maxLength: 160 },
  },
  {
    slug: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    validation: { options: ['subscription', 'hardware'] },
  },
  {
    slug: 'statutory_warranty_months',
    label: 'Statutory warranty (months)',
    type: 'integer',
    required: true,
    validation: { min: 0, max: 120 },
  },
  {
    slug: 'commercial_guarantee_months',
    label: 'Commercial guarantee (months)',
    type: 'integer',
    required: true,
    validation: { min: 0, max: 120 },
  },
  {
    slug: 'cancellation_notice_months',
    label: 'Cancellation notice (months)',
    type: 'integer',
    required: true,
    validation: { min: 0, max: 120 },
  },
  {
    slug: 'cancellation_button_compliant',
    label: 'Cancellation button reviewed as compliant',
    type: 'boolean',
    required: true,
    defaultValue: false,
  },
  {
    slug: 'cancellation_url',
    label: 'Cancellation link',
    type: 'url',
  },
  {
    slug: 'support_email',
    label: 'Support email',
    type: 'string',
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  },
  {
    slug: 'legal_notes',
    label: 'Policy notes',
    type: 'text',
    required: true,
    searchable: true,
  },
  {
    slug: 'verified_date',
    label: 'Last verified (date)',
    type: 'string',
    required: true,
    validation: { pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
  {
    slug: 'search_aliases',
    label: 'Search aliases (JSON array of strings)',
    type: 'json',
    required: true,
    defaultValue: [],
  },
];

export const policyCollection = {
  slug: 'brand_policies',
  label: 'Brand Policies',
  labelSingular: 'Brand Policy',
  description: 'Published German consumer warranty and subscription policy records.',
  urlPattern: '/wiki/{slug}',
  titleField: 'title',
  supports: ['drafts', 'revisions', 'preview', 'search', 'seo'],
  fields: policyFields,
};

export async function loadCanonicalPolicies() {
  const source = await readFile(canonicalSource, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  const { policySeedData } = await import(moduleUrl);

  if (!Array.isArray(policySeedData) || policySeedData.length === 0) {
    throw new Error('The canonical policy catalog is empty or unavailable.');
  }

  const seen = new Set();
  return policySeedData.map((policy) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(policy.brandSlug) || seen.has(policy.brandSlug)) {
      throw new Error(`Invalid or duplicate canonical policy slug: ${policy.brandSlug}`);
    }
    seen.add(policy.brandSlug);

    const { brandSlug, brandName } = policy;
    return {
      slug: brandSlug,
      data: {
        title: brandName,
        category: policy.category,
        statutory_warranty_months: policy.statutoryWarrantyMonths,
        commercial_guarantee_months: policy.commercialGuaranteeMonths,
        cancellation_notice_months: policy.cancellationNoticeMonths,
        cancellation_button_compliant: policy.cancellationButtonCompliant,
        ...(policy.cancellationUrl ? { cancellation_url: policy.cancellationUrl } : {}),
        ...(policy.supportEmail ? { support_email: policy.supportEmail } : {}),
        legal_notes: policy.legalNotes,
        verified_date: policy.verifiedDate,
        search_aliases: policy.searchAliases,
      },
    };
  });
}
