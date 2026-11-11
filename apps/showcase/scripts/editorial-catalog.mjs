const field = (slug, label, type, extra = {}) => ({ slug, label, type, ...extra });
const ref = (slug, label, relation, relationSide, multiple = true) => field(slug, label, 'reference', {
  validation: { relation, relationSide, multiple },
});
const common = (slug, label, fields, { routable = false, schedule = false, group = 'Policy catalog', icon = 'database' } = {}) => ({
  slug,
  label,
  labelSingular: label.replace(/s$/, ''),
  ...(routable ? { urlPattern: `/${slug}/{slug}` } : {}),
  supports: ['drafts', 'revisions', 'preview', ...(schedule ? ['scheduling'] : []), 'search'],
  group,
  icon,
  fields,
});

const identity = (slug, label) => [
  field('title', 'Name', 'string', { required: true, searchable: true }),
  field('summary', 'Editorial summary', 'text'),
  field('stable_key', 'Stable identity', 'string', { required: true, unique: true }),
];

export const editorialCollections = [
  common('policy_providers', 'Policy Providers', [
    ...identity('policy_providers', 'Policy Providers'),
    field('official_site', 'Official site', 'url'),
  ], { routable: true, schedule: true }),
  common('policy_services', 'Policy Services', [
    ...identity('policy_services', 'Policy Services'),
    ref('provider', 'Provider', 'provider_services', 'child', false),
  ], { routable: true, schedule: true }),
  common('policy_plans', 'Policy Plans', [
    ...identity('policy_plans', 'Policy Plans'),
    ref('service', 'Service', 'service_plans', 'child', false),
  ], { routable: true, schedule: true }),
  common('policy_offers', 'Policy Offers', [
    ...identity('policy_offers', 'Policy Offers'),
    ref('plan', 'Plan', 'plan_offers', 'child', false),
    field('offer_key', 'Offer identity', 'string', { required: true }),
  ], { routable: true, schedule: true }),
  common('policy_offer_versions', 'Offer Versions', [
    field('title', 'Version label', 'string', { required: true }),
    field('version_key', 'Stable version identity', 'string', { required: true, unique: true }),
    field('revision_hash', 'Revision fingerprint (filled by review workflow)', 'string'),
    ref('offer', 'Offer', 'offer_versions', 'child', false),
    field('terms_statement', 'Terms statement', 'text', { required: true }),
    field('source_url', 'Source URL', 'url', { required: true }),
    field('source_published_at', 'Source published at', 'datetime'),
    field('observed_at', 'Observed at', 'datetime', { required: true }),
    field('effective_from', 'Effective from', 'datetime'),
    field('effective_to', 'Effective to', 'datetime'),
    field('applicability_country', 'Country code', 'string'),
    field('applicability_channel', 'Signup channel', 'select', { validation: { options: ['web', 'app', 'phone', 'in_person', 'other'] } }),
    field('applicability_customer', 'Customer kind', 'select', { validation: { options: ['consumer', 'business'] } }),
  ]),
  common('policy_rules', 'Policy Rules', [
    ...identity('policy_rules', 'Policy Rules'),
    field('rule_key', 'Rule identity', 'string', { required: true }),
    field('official_source_url', 'Official source', 'url', { required: true }),
  ], { routable: true, schedule: true }),
  common('policy_rule_versions', 'Rule Versions', [
    field('title', 'Version label', 'string', { required: true }),
    field('version_key', 'Stable version identity', 'string', { required: true, unique: true }),
    field('revision_hash', 'Revision fingerprint (filled by review workflow)', 'string'),
    ref('rule', 'Rule', 'rule_versions', 'child', false),
    field('statement', 'Rule statement', 'text', { required: true }),
    field('source_url', 'Official source URL', 'url', { required: true }),
    field('source_published_at', 'Source published at', 'datetime'),
    field('observed_at', 'Observed at', 'datetime', { required: true }),
    field('effective_from', 'Effective from', 'datetime'),
    field('effective_to', 'Effective to', 'datetime'),
    field('applicability_country', 'Country code', 'string'),
    field('applicability_channel', 'Signup channel', 'select', { validation: { options: ['web', 'app', 'phone', 'in_person', 'other'] } }),
    field('applicability_customer', 'Customer kind', 'select', { validation: { options: ['consumer', 'business'] } }),
  ]),
  common('policy_evidence', 'Policy Evidence', [
    field('title', 'Evidence title', 'string', { required: true }),
    field('stable_key', 'Stable identity', 'string', { required: true, unique: true }),
    field('revision_hash', 'Revision fingerprint (filled by review workflow)', 'string'),
    field('evidence_kind', 'Evidence kind', 'select', { required: true, validation: { options: ['terms_excerpt', 'official_guidance', 'official_law', 'product_observation', 'other'] } }),
    field('public_excerpt', 'Public excerpt', 'text'),
    field('internal_notes', 'Internal notes', 'text'),
    field('source_url', 'Source URL', 'url', { required: true }),
    field('source_published_at', 'Source published at', 'datetime'),
    field('observed_at', 'Observed at', 'datetime', { required: true }),
  ]),
  common('policy_assessments', 'Policy Assessments', [
    field('title', 'Assessment title', 'string', { required: true }),
    field('assessment_key', 'Stable assessment identity', 'string', { required: true }),
    field('revision_hash', 'Revision fingerprint (filled by review workflow)', 'string'),
    ref('offer_version', 'Offer version', 'assessment_offer_versions', 'child', false),
    ref('rule_versions', 'Rule versions', 'assessment_rule_versions', 'child'),
    ref('evidence', 'Evidence', 'assessment_evidence', 'child'),
    field('applicability_country', 'Country code', 'string', { required: true }),
    field('applicability_contract_from', 'Contract from', 'datetime'),
    field('applicability_contract_to', 'Contract to', 'datetime'),
    field('applicability_channel', 'Signup channel', 'select', { validation: { options: ['web', 'app', 'phone', 'in_person', 'other'] } }),
    field('applicability_customer', 'Customer kind', 'select', { validation: { options: ['consumer', 'business'] } }),
    field('terms_statement', 'Terms statement', 'text', { required: true }),
    field('product_observation', 'Product observation', 'text', { required: true }),
    field('applicability_state', 'Applicability', 'select', { required: true, validation: { options: ['applicable', 'not_applicable', 'needs_information', 'ambiguous'] } }),
    field('terms_state', 'Terms statement state', 'select', { required: true, validation: { options: ['found', 'not_found', 'unclear', 'not_assessed'] } }),
    field('finding_state', 'Editorial finding', 'select', { required: true, validation: { options: ['no_issue_identified', 'missing_required_disclosure', 'implementation_gap', 'possible_conflict', 'unresolved', 'not_assessed'] } }),
    field('reviewed_at', 'Reviewed at', 'datetime', { required: true }),
    field('review_expires_at', 'Review expires at', 'datetime', { required: true }),
  ]),
];

const relation = (slug, parentCollection, childCollection, parentLabel, childLabel, maxChildrenPerParent = null) => ({
  slug, parentCollection, childCollection, parentLabel, childLabel,
  parentLabelSingular: parentLabel.slice(0, -1),
  childLabelSingular: childLabel.slice(0, -1),
  maxChildrenPerParent,
  maxParentsPerChild: 1,
});

export const editorialRelations = [
  relation('provider_services', 'policy_providers', 'policy_services', 'Providers', 'Services'),
  relation('service_plans', 'policy_services', 'policy_plans', 'Services', 'Plans'),
  relation('plan_offers', 'policy_plans', 'policy_offers', 'Plans', 'Offers'),
  relation('offer_versions', 'policy_offers', 'policy_offer_versions', 'Offers', 'Versions'),
  relation('rule_versions', 'policy_rules', 'policy_rule_versions', 'Rules', 'Versions'),
  relation('assessment_offer_versions', 'policy_offer_versions', 'policy_assessments', 'Offer Versions', 'Assessments'),
  relation('assessment_rule_versions', 'policy_rule_versions', 'policy_assessments', 'Rule Versions', 'Assessments'),
  relation('assessment_evidence', 'policy_evidence', 'policy_assessments', 'Evidence', 'Assessments'),
];

export function providerIdentityEntries(brands) {
  if (!Array.isArray(brands)) throw new TypeError('Expected a reviewed brand catalog array.');
  return brands.flatMap((brand) => typeof brand.service_slug === 'string' && typeof brand.brand_name === 'string'
    ? [{ id: `policy_providers-${brand.service_slug}`, slug: brand.service_slug, status: 'published', data: { title: brand.brand_name, stable_key: `provider:${brand.service_slug}` } }]
    : []);
}
