const text = (slug, label, maxLength, required = false) => ({ slug, label, type: 'text', required, validation: { maxLength } });
const string = (slug, label, maxLength, required = false) => ({ slug, label, type: 'string', required, validation: { maxLength } });
const url = (slug, label) => ({ slug, label, type: 'url' });

export const websiteBlockTypes = [
  { slug: 'hero', label: 'Hero', category: 'Website', currentVersion: 1, versions: [{ version: 1, fields: [string('heading', 'Heading', 180, true), text('body', 'Body', 1200), string('cta_label', 'CTA label', 100), url('cta_url', 'CTA link'), string('cta_id', 'Stable CTA ID', 120)] }] },
  { slug: 'copy_section', label: 'Copy section', category: 'Website', currentVersion: 1, versions: [{ version: 1, fields: [string('heading', 'Heading', 180), text('body', 'Body', 4000), string('cta_label', 'CTA label', 100), url('cta_url', 'CTA link'), string('cta_id', 'Stable CTA ID', 120)] }] },
  { slug: 'feature_list', label: 'Feature list', category: 'Website', currentVersion: 1, versions: [{ version: 1, fields: [string('heading', 'Heading', 180), { slug: 'items', label: 'Features', type: 'repeater', validation: { minItems: 1, maxItems: 12, subFields: [string('title', 'Title', 180, true), text('body', 'Body', 1000, true)] } }] }] },
  { slug: 'faq', label: 'FAQ', category: 'Website', currentVersion: 1, versions: [{ version: 1, fields: [string('heading', 'Heading', 180), { slug: 'questions', label: 'Questions', type: 'repeater', validation: { minItems: 1, maxItems: 12, subFields: [string('question', 'Question', 500, true), text('answer', 'Answer', 2000, true)] } }] }] },
  { slug: 'cta', label: 'Call to action', category: 'Website', currentVersion: 1, versions: [{ version: 1, fields: [string('heading', 'Heading', 180), text('body', 'Body', 1200), string('cta_label', 'CTA label', 100, true), url('cta_url', 'CTA link'), string('cta_id', 'Stable CTA ID', 120, true)] }] },
];

export const websiteCollections = [
  {
    slug: 'pages', label: 'Pages', labelSingular: 'Page', urlPattern: '/{slug}', group: 'Website', icon: 'globe',
    supports: ['drafts', 'revisions', 'preview', 'search', 'seo'],
    fields: [
      { ...string('title', 'Title', 180, true), searchable: true },
      { ...text('description', 'Description', 320), searchable: true },
      { slug: 'sections', label: 'Page sections', type: 'blocks', validation: { maxItems: 30, allowedTypes: websiteBlockTypes.map(({ slug }) => slug) } },
    ],
  },
];

export const websiteRelations = [];
const block = (_type, _key, data) => ({ _type, _version: 1, _key, ...data });
export const websiteContent = {
  pages: [
    {
      slug: 'home', title: 'Rights & Renewals', description: 'Save receipts on your device and track the dates that matter for purchases and subscriptions in Germany.',
      sections: [
        block('hero', 'home-hero-v1', { heading: 'Keep the receipt. Know the deadline.', body: 'Track purchases and subscriptions in a wallet that keeps your receipts on your device.', cta_label: 'Open the wallet', cta_url: 'https://rightsandrenewals-app.pages.dev/', cta_id: 'home-open-wallet' }),
        block('copy_section', 'home-wiki-v1', { heading: 'Look up a policy', body: 'Browse sourced policy information and learning materials in the Policy Wiki.', cta_label: 'Browse the Policy Wiki', cta_url: '/wiki', cta_id: 'home-policy-wiki' }),
        block('feature_list', 'home-wallet-steps-v1', { heading: 'How the wallet works', items: [{ title: 'Save a purchase', body: 'Add a purchase or subscription and attach a receipt photo if you have one.' }, { title: 'Review dates', body: 'See upcoming dates alongside the purchases and subscriptions they belong to.' }, { title: 'Prepare a next step', body: 'Find provider information or prepare a draft to review before sending.' }] }),
      ],
    },
    {
      slug: 'agent-setup', title: 'Agent setup', description: 'Connect an agent to the public read-only Rights & Renewals MCP endpoint.',
      sections: [
        block('hero', 'agent-setup-hero-v1', { heading: 'Connect an agent to public information', body: 'The public MCP endpoint supports read-only brand policy, statute and subscription-rule lookups. Private receipts stay in your device wallet.', cta_label: 'Read the setup prompt', cta_url: '/agent-setup/prompt.md', cta_id: 'agent-setup-prompt' }),
      ],
    },
  ],
};
