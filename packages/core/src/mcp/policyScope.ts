import type { PolicyWikiEntry } from '../types/contracts.js';

const subscriptionLaw = [
  { title: 'BGB § 309 No. 9 — standard contract terms', url: 'https://www.gesetze-im-internet.de/bgb/__309.html' },
  { title: 'BGB § 312k — online cancellation', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' },
];

const goodsLaw = [
  { title: 'BGB § 437 — buyer remedies for defects', url: 'https://www.gesetze-im-internet.de/bgb/__437.html' },
  { title: 'BGB § 438 — limitation of defect claims', url: 'https://www.gesetze-im-internet.de/bgb/__438.html' },
  { title: 'BGB § 477 — presumption for consumer goods', url: 'https://www.gesetze-im-internet.de/bgb/__477.html' },
];

const providerGuides = new Map([
  ['netflix', {
    title: 'Netflix Help Center — cancel a membership',
    url: 'https://help.netflix.com/de/node/407',
    notes: 'For direct billing, Netflix normally ends the membership at the end of the current billing period. If billed through a partner, follow the instructions in the account.',
  }],
  ['spotify', {
    title: 'Spotify Support — cancel Premium',
    url: 'https://support.spotify.com/de/article/cancel-premium/',
    notes: 'Directly billed Spotify Premium normally runs until the next billing date. Partner-billed plans and free trials can follow different rules.',
  }],
]);

export function getPolicyScope(category: PolicyWikiEntry['category'], entry?: PolicyWikiEntry) {
  if (category === 'hardware') {
    const appleSource = entry?.brandSlug === 'apple'
      ? { title: 'Apple — hardware warranty by product', url: 'https://www.apple.com/de/legal/warranty/' }
      : undefined;
    return {
      statutory_warranty_months: entry?.statutoryWarrantyMonths ?? 24,
      reversed_burden_months: 12,
      statutory_basis: ['BGB § 437', 'BGB § 438 Abs. 1 Nr. 3', 'BGB § 477 Abs. 1'],
      commercial_guarantee_months: null,
      cancellation_notice_months: null,
      cancellation_button_compliant: null,
      sources: appleSource ? [...goodsLaw, appleSource] : goodsLaw,
      legal_scope: 'General German consumer-goods purchase rules. The usual limitation period is two years from delivery. The one-year presumption concerns when non-conformity appears after transfer of risk, with statutory exceptions. Commercial guarantees depend on the specific product and provider terms.',
      notes: appleSource ? 'Check Apple’s warranty terms for the specific product and purchase country.' : undefined,
    };
  }

  const provider = entry && providerGuides.get(entry.brandSlug);
  return {
    statutory_warranty_months: null,
    reversed_burden_months: null,
    statutory_basis: ['BGB § 309 Nr. 9', 'BGB § 312k'],
    commercial_guarantee_months: null,
    cancellation_notice_months: null,
    cancellation_button_compliant: null,
    sources: provider
      ? [...subscriptionLaw, { title: provider.title, url: provider.url }]
      : subscriptionLaw,
    legal_scope: 'Goods warranty fields do not apply to this subscription lookup. BGB § 309 No. 9 limits covered standard terms. BGB § 312k applies to covered paid continuing consumer contracts offered online, subject to statutory exceptions. A provider help page does not establish button compliance.',
    notes: provider?.notes ?? 'Check the contract and billing provider for the applicable cancellation procedure and effective date.',
  };
}
