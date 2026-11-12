# Rights & Renewals — CMS editor handbook

For editors adding content, researching policy information, and updating existing records.

Schema baseline: 12 November 2026, repository revision `70772ff5cb18e2422691c2c957f8d07a254f7d5d`. This handbook describes the checked-in showcase CMS model and its readers/guards. It is not a live inventory of the production database: if a collection or field below is absent in your CMS, ask the operator to reconcile the model using the additive import runbook. Do not create a similarly named replacement collection.

CMS: [open the editorial workspace](https://rightsandrenewals-showcase.padarhava.workers.dev/_emdash/admin/). Complete Cloudflare Access and native EmDash sign-in normally.

Navigate: [choose a collection](#1-start-here) · [research and findings](#2-how-to-investigate-a-policy) · [connect plans and rules](#3-connect-companies-plans-and-shared-rules) · [create/update workflow](#4-adding-and-updating-safely) · [logos](#5-media-and-brand-logos) · [webpages](#6-webpage-editing) · [learning and quizzes](#7-learning-content-and-quizzes) · [publication checklist](#8-publish-checklist) · [troubleshooting](#9-troubleshooting) · [all fields](#11-complete-field-reference).

## 1. Start here

1. Search for the existing record by title, slug, and stable identity before creating anything.
2. Choose the collection using the map below. A brand summary is not a plan-specific legal finding.
3. Establish the exact country, service, plan, offer, signup channel, customer kind, and relevant contract date.
4. Read the original source, record its URL, locate the actual wording, and record when you observed it.
5. Save a draft. Fill the applicable field checklist in section 11; optional in the schema does not necessarily mean safe to omit for publication.
6. Preview, compare changes against the published revision, obtain the required review, and publish deliberately.
7. Check the public output without editor preview enabled. Confirm the result and citations, not merely that the CMS says “Published.”

| What you are changing | Where it belongs | What it affects |
| --- | --- | --- |
| Brand-wide summary, cancellation contact, warranty summary, aliases, logo | **Brand Policies** (`brand_policies`) | Published brand Wiki/API data and consumers such as the wallet |
| Company, service, named plan, commercial offer | **Policy Providers → Services → Plans → Offers** | The reusable subscription catalog |
| Terms at a particular time and scope | **Offer Versions** | The exact provider statement used in an assessment |
| Shared legal requirement and its dated wording | **Policy Rules → Rule Versions** | One reusable rule linked to many assessments |
| Source excerpt or observed product behavior | **Policy Evidence** | The evidential basis of a finding |
| Whether a rule applies and whether a disclosure/implementation is missing | **Policy Assessments**, then **Assessment review** | Reviewed, scoped plan findings; not a manually drawn warning icon |
| Plain-language explanation of a law or term | **Learning → Law guides / Glossary** | Published learning Wiki content |
| Quiz and its questions | **Learning → Learning quizzes / Quiz questions** | Versioned learning content |
| Public webpage text and supported content sections | **Website → Pages** | Showcase pages; not the wallet app's forms or navigation |
| Logo file, alternative text, caption, organization | **Media**, then the content's image picker | A file is not linked to a brand until its Brand logo field references it |
| General article | **Posts** | Starter article collection; confirm an actual public consumer before promising an article route |

## 2. How to investigate a policy

### Create a research brief before filling the finding

Use this worksheet in the editorial task or evidence notes. It is a research aid, not an additional CMS collection.

```text
Task / editor / reviewer:
Existing entry ID + slug + current revision:
Provider → service → plan → offer:
Country / customer kind / signup channel:
Contract date or contract cohort:
Question being investigated:
Provider source URL + document title + section:
Source publication date, if actually known:
Observed at (UTC):
Exact short excerpt and plain-language interpretation:
Official rule source + paragraph/article + applicable version:
Product steps inspected (public pages; no private customer data):
What was found / not found / inaccessible:
Contradictions, exceptions, limitations:
Proposed applicability / terms / finding states:
Related records to create or reuse:
Review date / expiry / reason for review interval:
```

Investigate in this order:

1. **Identify the product precisely.** A provider can operate several services; a service can have several plans; a plan can have different offers. Separate student, family, annual, promotional, reseller, and country-specific terms when they differ. Do not use a brand homepage as proof of a particular plan's terms.
2. **Collect provider evidence.** Read the terms, offer page, cancellation/help page and any incorporated documents. Capture document title, section and short relevant excerpt. Check that the source actually covers the selected plan and cohort.
3. **Locate the applicable legal source.** Use the statute, amendment/publication record or relevant court/authority source. [Gesetze im Internet](https://www.gesetze-im-internet.de/) provides consolidated German federal legislation; it distinguishes these texts from the authoritative publication in the [Bundesgesetzblatt](https://www.recht.bund.de/). For EU material, use [EUR-Lex](https://eur-lex.europa.eu/). Link the specific article/paragraph or document in each CMS record, not only these portal homepages.
4. **Check applicability separately.** Explain country, consumer/business scope, channel, contract dates, transitions, exceptions and any facts still needed. A rule's current wording does not establish its applicability to every older contract.
5. **Compare wording and behavior separately.** A clause in the terms and a working cancellation mechanism are different observations. Record the inspected steps and limits; do not cancel a real subscription as an editorial test.
6. **Resolve conflicts or retain uncertainty.** If sources disagree, preserve both references and explain the conflict. An inaccessible page is not evidence that a required clause is absent. AI output can suggest research questions; it is not a verified source.
7. **Set review dates after actual review.** Publication date, observed date, effective date, and reviewed date mean different things. Do not substitute today's date for an unknown source publication date.

Avoid uploading receipts, account screens, customer identifiers or credentials into public content. Keep public excerpts concise and accurate. Internal notes are excluded from the current public graph projection, but are still accessible to authorized CMS users; they are not a secret store.

### Findings: use three separate decisions

| Field | Values | How to decide |
| --- | --- | --- |
| `applicability_state` | `applicable`, `not_applicable`, `needs_information`, `ambiguous` | Applicable: the facts and scope support application. Not applicable: identify the excluding fact. Needs information: name the missing fact. Ambiguous: describe unresolved interpretation or conflict. |
| `terms_state` | `found`, `not_found`, `unclear`, `not_assessed` | Found: cite the clause. Not found: identify the documents/sections actually searched. Unclear: wording exists but meaning/scope is uncertain. Not assessed: the investigation has not been performed. |
| `finding_state` | `no_issue_identified`, `missing_required_disclosure`, `implementation_gap`, `possible_conflict`, `unresolved`, `not_assessed` | No issue identified: limited to this reviewed question and evidence. Missing required disclosure: establish the applicable disclosure duty and document a sufficiently complete search. Implementation gap: identify the required behavior and observed gap. Possible conflict: record the apparent contradiction. Unresolved: evidence cannot support a conclusion. Not assessed: no completed assessment. |

`not_found` does **not** by itself establish `missing_required_disclosure`. `no_issue_identified` does not certify the whole provider as compliant. Never use a default false Boolean or a lack of records as proof of a legal breach.

## 3. Connect companies, plans, and shared rules

```text
Provider → Service → Plan → Offer → Offer version
                                      ↑
                                   Assessment → Rule version → Rule
                                      ↓
                                   Evidence
```

Example below is fictional and demonstrates data structure, not a legal finding about any real company:

| Record | Example identity | Meaning |
| --- | --- | --- |
| Provider | `provider:example-fitness` | The company identity |
| Service | `service:example-fitness:membership` | Gym membership service |
| Plan | `plan:example-fitness:platinum` | Named Platinum plan, not the whole brand |
| Offer | `offer:example-fitness:platinum:de:web:annual` | A distinguishable commercial variant |
| Offer version | `offer-version:example-fitness:platinum:de:web:2026-11-12:v1` | The observed terms, with scope and source |
| Rule | `rule:bg12` | Internal identifier BG12; its statement must name a real, sourced rule |
| Rule version | `rule-version:bg12:2026-11-12:v1` | One dated interpretation/text of that rule |
| Evidence | `evidence:example-fitness:platinum:terms:2026-11-12` | A specific source snapshot/excerpt or observation |
| Assessment | `assessment:example-fitness:platinum:bg12:de:web:v1` | Comparison of the offer version, rule version and evidence |

Reuse the same rule and rule version for an unrelated cloud-storage or streaming plan **only when the rule and version genuinely match**. Create an assessment for each offer version and scope; do not copy an entire brand finding to every plan. Reuse evidence only if it is the same document/observation and remains applicable.

Identity naming above is a recommended convention, not an enforced schema format. Entry **slugs** and learning `stable_id` values instead use lowercase words separated by hyphens. Do not rename a stable identity merely because a display title changes. Do not confuse a slug, a stable key, and the CMS-generated entry ID.

Use the native reference picker to link records. Pasting an identity into the summary does not create a relationship. An assessment needs exactly one offer version, at least one rule version, and at least one published evidence record. The public reader bounds rule/evidence references at 50 each; keep assessments focused.

Current model limitation: relation definitions set `maxParentsPerChild: 1` even for some assessment reference fields presented as multiple. Reusing one rule/evidence record across several assessments is compatible with the parent-to-many-children relationship, but linking several rule/evidence parents to a single assessment may conflict with that limit. If the picker refuses a valid combination, have the operator inspect the live relation definition; do not duplicate a rule simply to bypass it. One-rule assessments are the clearest initial editorial unit.

Dates on offer/rule versions and assessment contract ranges are matched against the user's **contract date**. Start is inclusive and end is exclusive. Overlapping offer scopes can return an ambiguous result; the resolver does not simply pick the latest record. Publishing another version is not enough to establish which contract cohort it covers. Published versions are immutable, so ask for a reviewed scope/model correction if overlapping open-ended versions cannot be distinguished safely. The current schema has no dedicated price, currency, billing-cycle or minimum-term fields on Plans/Offers: describe sourced distinctions in summaries/terms; do not invent unsupported structured fields.

## 4. Adding and updating safely

### Brand summaries

Open **Brand Policies**, check the slug and current published content, then fill the brand fields listed in section 11. Use this collection for a broad, clearly qualified summary. Explain plan, country, seller and cohort limitations in `legal_notes`; preserve a source trail in those notes because this legacy collection has no separate citation field.

The three month fields accept only integers from 0 to 120. They cannot express “unknown,” a number of days, or a complex plan-dependent period. Do not enter zero as a substitute for missing research or round a deadline to fit. If a required number cannot truthfully represent the policy, leave the change as a draft and raise the modeling issue. Distinguish statutory rights from a commercial guarantee and identify the party providing each.

`cancellation_button_compliant` is a required Boolean with a false default, not a four-state assessment. True needs a scoped, recorded review; false cannot distinguish unreviewed, inapplicable and a confirmed issue. Do not flip it based solely on a failed page load. Use the assessment model for nuanced findings and explain limitations in notes. Refresh `verified_date` only after rechecking the substance.

### New plan assessment: creation order

1. Reuse or create Provider, Service, Plan and Offer; link each to its parent.
2. Create an Offer Version from the actual provider source and verified scope.
3. Reuse or create Rule and Rule Version from the applicable official source.
4. Create Evidence containing enough public text to support the finding, plus internal investigation notes as needed.
5. Publish the reviewed source versions/evidence before assessment approval. Once published, offer versions, rule versions and evidence cannot be edited, even after unpublishing. Correct them by creating replacement versions/records with new identities.
6. Save the Assessment with references, independent terms/behavior descriptions, scope, three state selections and review window.
7. A different authorized Editor/Admin opens **Assessment review** and reviews the exact current assessment and linked snapshots. Review approval is separate from publishing; then publish in the native editor. The server binds approval to current content/references and derives hashes itself.

Assessment review: `/_emdash/admin/plugins/cmlab-policy-review-console/review`.
The approval expires at the earlier of 30 days after approval or the assessment's `review_expires_at`. Editing the assessment or changing linked dependencies invalidates the previous binding. A typed reviewer name or a populated legacy `revision_hash` is not approval. The author cannot approve their own assessment. Reload and resolve stale revisions or missing dependencies; do not work around a refusal.

### Updating an existing record

1. Record ID, slug, current revision, published state, and the reason for change.
2. Inspect existing unpublished edits. Coordinate with their owner; never publish an unrelated draft just to add a logo or fix one field.
3. Compare the old source and new source. Decide whether this is a display correction, changed underlying facts, or a new time/scope version.
4. Change only the intended mutable fields. Create a new version for published immutable source records. Preserve old evidence and its observation date.
5. Recheck dependent content: assessments, learning explanations/quizzes, webpage claims and brand summary. Do not assume these synchronize automatically.
6. For a quiz content/answer/order change, assign a new `content_version`; keep stable IDs where the question retains its identity. This separates new results from local progress associated with the older content.
7. Obtain fresh assessment approval where applicable, preview and publish. Log who changed what, the source, review, and verified public result.

For an incorrect published finding, ask the authorized editor to withdraw/unpublish it while preparing the correction. Do not delete historical evidence or restore an old assessment and assume its approval remains valid. A revision restore still needs current source and publication checks.

## 5. Media and brand logos

1. Search **Media → Brand logos** before uploading. Reuse the correct existing asset.
2. Use a legitimate brand source or a reviewed asset with traceable provenance. Record original source, retrieval date, transformation and usage considerations in the editorial task; include suitable attribution in the caption where appropriate. A filename is not evidence of provenance.
3. Use a clean, readable raster image. The public brand-logo route serves ready raster media; do not bypass native SVG restrictions. Do not stretch, recolor or crop a logo so it misrepresents the brand.
4. Set meaningful `alt` text, for example “Example Fitness logo.” Set `caption` for context/attribution where needed; use the **Brand logos** folder (`folderId`). Use focal point controls (`focalX`, `focalY`) only if a crop needs them.
5. File bytes/name/type, size, storage key, readiness and generated ID are upload/system metadata. Width/height should reflect the actual image, not invented display dimensions. Replace by uploading a new asset and changing the reference, rather than fabricating metadata.
6. Open the relevant Brand Policy and choose the file in **Brand logo** (`logo`). Preview, check unrelated draft changes, then publish the intended revision.
7. Verify `/wiki/<brand-slug>` and `/api/brand-policy-logos/<brand-slug>` without a preview session. Upload success alone does not prove public linkage. Do not remove a media item until its references have been checked.

The current logo projection uses the selected published media reference; metadata such as alternative text does not automatically prove every client renders it. Include accessibility in the public-output check.

## 6. Webpage editing

Use **Website → Pages**. The `home` record controls supported home content; `agent-setup` controls supported agent-setup content. Other valid, non-reserved slugs are handled by the generic public page route. Existing application/system routes take precedence: do not create pages named `api`, `wiki` or `_emdash` expecting to replace them.

Page fields: `title`, `description`, `sections`, plus existing legacy rich-text `content`. Preserve existing content unless its removal is deliberate: generic pages can render both sections and legacy content. Website catalog limits a title to 180 characters, and the reader enforces that limit even where an older seed field definition has no length validation. Descriptions are at most 320 characters.

Choose an appropriate section block, edit the fields in section 11, and reorder blocks in the editor. At most 30 blocks are consumed. Block `placement` values:

- `content`: regular page content; the default when placement is absent.
- `home-intro`: home intro slot; requires a heading.
- `agent-intro`: agent setup intro slot; requires a heading.

Use only the matching intro placement on the corresponding special page. Those templates select their specific intro and `content` blocks; mismatched placements can disappear. On a generic page, confirm the rendered order and headings in preview.

For a CTA, supply **all three**: label, safe destination, and stable `cta_id`. Even on a hero/copy block, incomplete CTA data will not render a link. Keep a CTA ID when its purpose stays the same; use a new one for a different action. IDs should identify actions, for example `home-open-wallet`, never a user, email or session. Preserve block `_key` identities on ordinary edits; block type/version metadata is managed by the editor.

Invalid or incomplete blocks can be omitted by the public reader even if an entry saves. Feature and FAQ blocks need at least one complete row. Use plain editorial text in these supported fields; custom widgets, layout code, app search, capture and bottom navigation still require development work.

Native SEO controls, when available: `seo.title`, `seo.description`, `seo.image`, `seo.canonical`, `seo.noIndex`. Use an accurate search title/summary, suitable public social image, and the intended public canonical URL. Leave defaults unless there is a reason to override; confirm before excluding a page from indexing. The generic page route consumes these controls. The special home/agent templates have their own metadata handling; do not assume every SEO override appears there without checking.

Posts have `title`, `featured_image`, rich-text `content`, and `excerpt`. Post categories/tags are native taxonomy assignments, separate from Brand Policy `category`. Keep a controlled vocabulary, reuse existing terms, and confirm public route support with the operator before committing to a new article workflow.

## 7. Learning content and quizzes

Law guides and glossary entries should answer a specific reader question, identify jurisdiction, link specific official sources, and explain the limits of any simplified wording. Source rows require both label and URL. Although the repeater permits an empty list, source-backed legal guidance should have relevant citations before publication.

All learning `stable_id` values use lowercase letters/numbers separated by hyphens. Use a real, nonfuture `reviewed_on` timestamp after review. The publication hook checks this date, and readers can omit malformed entries.

For a quiz:

1. Create the Quiz, its stable ID, title, description and immutable content version.
2. Create its Questions. Match each `quiz_id` to the Quiz's `stable_id`, and set the native Quiz reference consistently. Add a related law-guide reference when useful.
3. Add 2–8 answer options with unique stable IDs and meaningful labels. `correct_option_id` must equal exactly one option ID. Explain why the answer is correct and source it; do not use trick wording as a substitute for testing understanding.
4. Set question `order` from 0 to 19. Fill the Quiz's `question_ids` list in the intended display order, without duplicates. **That list drives public order; changing only a question's numeric order is insufficient.** Native references alone do not substitute for these string IDs.
5. Review and publish all listed questions, then the quiz. A missing/invalid/unpublished question or a mismatched `quiz_id` can cause the whole quiz to be omitted. Preview the full quiz and check its explanation/source links.
6. Update `content_version` whenever the published learning content changes; the schema calls it immutable but it does not create a new version for you. Explicitly manage version labels on updates.

## 8. Publish checklist

- [ ] Correct record and scope; no duplicate stable identity or accidental slug change.
- [ ] All required fields and relevant optional scope/citation fields are complete.
- [ ] Sources opened and checked; quoted wording and conclusions kept distinct.
- [ ] Unknown facts stay unknown; defaults are not treated as reviewed conclusions.
- [ ] Date meanings are correct; review dates are valid and nonfuture, expiry is in the future, ranges are ordered.
- [ ] Source versions/evidence are published; native relationships point to the intended entries.
- [ ] No unreviewed draft is included; assessment approval matches the current revision and dependencies.
- [ ] Public text contains no private account/customer data or secrets.
- [ ] Logos render and have meaningful metadata; links, CTA labels and stable IDs are correct.
- [ ] Preview checked for missing blocks/questions, small-screen readability and keyboard access.
- [ ] After publishing, verify the public Wiki/page/API without draft preview and record what was checked.

Publishing a CMS entry updates only readers that consume it. It does not deploy wallet UI code or prove API/MCP output is correct. Public read-only policy retrieval and protected editorial changes are separate workflows. Actual editorial-agent connection verification remains deferred; this handbook does not authorize an agent to approve or publish. Use the private proposal queue for suggestions; it does not apply changes automatically.

## 9. Troubleshooting

| Symptom | Check before changing data |
| --- | --- |
| Required field missing from the sidebar/editor | Confirm site, collection and installed model with the operator; this guide is source-based, not proof of live schema migration. |
| Brand logo exists in Media but is absent publicly | Correct Brand logo reference, published revision, ready raster asset, and the logo route; do not publish an unrelated draft. |
| Policy or learning publish refused | Valid ISO date-time, actual completed review, nonfuture date; read the rejection message. |
| Assessment approval/publish refused | Separate authorized reviewer, current revision, published source references, valid future expiry, unchanged source snapshots; reload review. |
| Version/evidence edit refused | A published immutable record must be replaced with a new record/version, even if unpublished now. |
| Plan result asks for more information | Country, contract date, signup channel and customer kind required by the selected scopes. |
| Plan result is ambiguous | Overlapping offers or conflicting approved assessments; resolve scope/evidence, never choose an arbitrary winner. |
| Quiz missing | All listed questions published and valid, matching `quiz_id`, unique IDs/options, correct answer present, review dates valid. |
| CTA/block missing | Required text, correct placement, complete safe CTA triple, row lengths and limits. |
| Changes visible only in preview | Published revision versus saved draft, correct origin/slug, downstream refresh/fallback behavior. |

## 10. Source of truth and maintenance

The complete field reference below is derived from the checked-in seed, which includes legacy Posts/Page content fields, plus the website catalog's explicit title limit. Review it whenever models change. This guide adds editorial recommendations; they are not all enforced by CMS validators. No production content, schema or access controls were changed to create this guide.

Implementation sources:

- [Brand model](../../apps/showcase/scripts/policy-catalog.mjs), [graph models and relations](../../apps/showcase/scripts/editorial-catalog.mjs), [learning models](../../apps/showcase/scripts/learning-catalog.mjs), [website blocks](../../apps/showcase/scripts/website-catalog.mjs), [combined seed](../../apps/showcase/seed/seed.json).
- [Website reader](../../apps/showcase/src/lib/website-cms.ts), [learning reader](../../apps/showcase/src/lib/learning-cms.ts), [graph resolver](../../apps/showcase/src/lib/policy-graph.ts), [CMS graph loader](../../apps/showcase/src/lib/policy-graph-cms.ts), [review/immutability guards](../../apps/showcase/src/lib/policy-graph-plugin.ts), [date publication guard](../../apps/showcase/src/lib/policy-publication-guard.ts).
- [Operator import and review runbook](ISSUE37_EDITORIAL_REVIEW_AND_IMPORT_RUNBOOK.md), [brand media operations](ISSUE37_CMS_BRAND_MEDIA.md), [agent and measurement operations](ISSUE37_AGENT_AND_MEASUREMENT_OPERATIONS.md). These operator documents do not replace an editor's source review.

## 11. Complete field reference

**Required** means `required: true` in the checked-in definition. **Optional** means the CMS model does not require it; the workflow or public reader may still need it. Lengths are schema maxima in characters; row limits are per repeater. Nested rows must satisfy their own required fields. **Unique** is a model constraint only where stated; elsewhere editors should still prevent duplicate identities.

Common native controls on content entries are not custom fields: CMS-generated ID, slug, status, author/byline assignments where enabled, timestamps, revision/history, preview, and publication controls. Keep slugs stable; do not manually write IDs, timestamps, revision hashes or approval records. Scheduling is supported only on configured collections; source versions/evidence and assessments have explicit scheduling guards. Use direct reviewed publishing for these graph records.

### Posts — `posts`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Title | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `featured_image` — Featured Image | image | Optional | No additional declared constraint | Choose an appropriate licensed, accessible Media asset and verify the consuming article template. |
| `content` — Content | portableText | Optional | No additional declared constraint | Legacy/native rich text. Preview formatting and source links; generic pages may render it in addition to blocks. Do not silently erase existing material. |
| `excerpt` — Excerpt | text | Optional | No additional declared constraint | Accurate short article summary; no unsupported promises. Verify article consumer before publication. |

### Pages — `pages`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Title | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `content` — Content | portableText | Optional | No additional declared constraint | Legacy/native rich text. Preview formatting and source links; generic pages may render it in addition to blocks. Do not silently erase existing material. |
| `description` — Description | text | Optional | max 320 chars | Plain-language description appropriate to this content; explain purpose without unsupported claims. |
| `sections` — Page sections | blocks | Optional | max 30 rows; types: hero, copy_section, feature_list, faq, cta | Supported page blocks in intended order; at most 30. Preview for invalid/missing blocks and correct placement. |

### Brand Policies — `brand_policies`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Brand name | string | Required | min 1 chars; max 160 chars | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `category` — Category | select | Required | subscription, hardware | Choose subscription or hardware for this brand-level summary; this is separate from article taxonomies. |
| `statutory_warranty_months` — Statutory warranty (months) | integer | Required | min 0; max 120 | Research the scoped statutory period and responsible party. Whole months only; do not use 0 for unknown or round days to months. |
| `commercial_guarantee_months` — Commercial guarantee (months) | integer | Required | min 0; max 120 | Separate voluntary guarantee from statutory rights; verify provider, product and conditions. Do not infer from advertising alone. |
| `cancellation_notice_months` — Cancellation notice (months) | integer | Required | min 0; max 120 | Verify notice period for the stated scope; not minimum contract length or billing frequency. If months cannot represent it, retain draft and escalate. |
| `cancellation_button_compliant` — Cancellation button reviewed as compliant | boolean | Required | default false | Boolean summary only: true requires actual scoped review. False default does not distinguish unreviewed, inapplicable or failed. Explain limitations in notes. |
| `cancellation_url` — Cancellation link | url | Optional | No additional declared constraint | Verify the provider cancellation entry point and exact scope; avoid personal authenticated/account-specific URLs. |
| `support_email` — Support email | string | Optional | email pattern | Verify a public support contact on an official source; do not guess an address from the domain. |
| `legal_notes` — Policy notes | text | Required | No additional declared constraint | Explain sources, scope, exceptions, statutory versus commercial rights and limits of the brand-wide summary. Include citations because no separate source field exists here. |
| `verified_date` — Last verified (UTC date and time) | datetime | Required | No additional declared constraint | Actual re-verification time for the policy substance, ISO 8601 with timezone, nonfuture. Merely uploading a logo is not a full policy review. |
| `search_aliases` — Search aliases | repeater | Required | min 0 rows; max 80 rows; default [] | Common brand/service variants only; deduplicate and avoid misleading unrelated providers. |
| `search_aliases[].alias` — Alias | string | Required | No additional declared constraint | One recognizable synonym or spelling variant per row. |
| `logo` — Brand logo | image | Optional | No additional declared constraint | Choose the correct ready raster asset from native Media. Uploading a file alone does not create this published reference. |

### Policy Providers — `policy_providers`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Name | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `summary` — Editorial summary | text | Optional | No additional declared constraint | Describe what this identity covers, how it differs from related entries, and relevant limits; cite supporting sources in the research task. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `official_site` — Official site | url | Optional | No additional declared constraint | Verify the provider-controlled official HTTPS site; avoid affiliate or lookalike domains. |

### Policy Services — `policy_services`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Name | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `summary` — Editorial summary | text | Optional | No additional declared constraint | Describe what this identity covers, how it differs from related entries, and relevant limits; cite supporting sources in the research task. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `provider` — Provider | reference | Optional | relation: provider_services; single selection | Select the actual Provider record, not a similarly named service. |

### Policy Plans — `policy_plans`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Name | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `summary` — Editorial summary | text | Optional | No additional declared constraint | Describe what this identity covers, how it differs from related entries, and relevant limits; cite supporting sources in the research task. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `service` — Service | reference | Optional | relation: service_plans; single selection | Select the Service this plan belongs to; preserve the company/service/plan hierarchy. |

### Policy Offers — `policy_offers`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Name | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `summary` — Editorial summary | text | Optional | No additional declared constraint | Describe what this identity covers, how it differs from related entries, and relevant limits; cite supporting sources in the research task. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `plan` — Plan | reference | Optional | relation: plan_offers; single selection | Select the exact named Plan, not the whole provider. |
| `offer_key` — Offer identity | string | Required | No additional declared constraint | Identify this distinguishable commercial variant consistently; include differentiating country/channel/term in the identity convention when needed. |

### Offer Versions — `policy_offer_versions`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Version label | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `version_key` — Stable version identity | string | Required | unique | New permanent version identity for a specific source/scope. Do not reuse an old key for changed published terms or law. |
| `revision_hash` — Legacy fingerprint (optional) | string | Optional | No additional declared constraint | Optional legacy metadata. Leave empty for new editorial work; the server derives authoritative fingerprints. A typed hash does not validate content. |
| `offer` — Offer | reference | Optional | relation: offer_versions; single selection | Select the exact Offer whose terms this version records. |
| `terms_statement` — Terms statement | text | Required | No additional declared constraint | Accurately summarize or briefly quote provider terms; cite document and section. State what was inspected; do not mix in the legal conclusion. |
| `source_url` — Source URL | url | Required | No additional declared constraint | Open the exact source document/page and verify ownership, relevance, version and accessibility. Prefer stable HTTPS URLs; never include login tokens. |
| `source_published_at` — Source published at | datetime | Optional | No additional declared constraint | The date/time stated by the source, if known. Leave blank if unknown; do not substitute the observation date. |
| `observed_at` — Observed at | datetime | Required | No additional declared constraint | Actual time you inspected this source or behavior, in ISO 8601 with timezone, preferably UTC. This is not its legal effective date. |
| `effective_from` — Effective from | datetime | Optional | No additional declared constraint | Verified beginning of the relevant contract cohort/scope, inclusive. Explain transitions in the research notes; do not infer from publication alone. |
| `effective_to` — Effective to | datetime | Optional | No additional declared constraint | Verified end of the relevant contract cohort/scope, exclusive. Must follow the start; blank is open-ended, not unknown historical precision. |
| `applicability_country` — Country code | string | Optional | No additional declared constraint | Use a two-letter country code, e.g. DE, consistently. Required on assessments; fill on source versions whenever country constrains applicability. |
| `applicability_channel` — Signup channel | select | Optional | web, app, phone, in_person, other | Channel through which the contract was concluded, not the editor's research device. Blank can broaden scope, so omit only deliberately. |
| `applicability_customer` — Customer kind | select | Optional | consumer, business | Consumer or business scope from the source; never assume both. Blank can broaden scope. |

### Policy Rules — `policy_rules`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Name | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `summary` — Editorial summary | text | Optional | No additional declared constraint | Describe what this identity covers, how it differs from related entries, and relevant limits; cite supporting sources in the research task. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `rule_key` — Rule identity | string | Required | No additional declared constraint | Stable internal rule identifier such as bg12; explain the actual sourced requirement in the rule/version, not just its code. |
| `official_source_url` — Official source | url | Required | No additional declared constraint | Link to the actual official statutory/authority document defining the rule; verify the paragraph and applicable version. |

### Rule Versions — `policy_rule_versions`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Version label | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `version_key` — Stable version identity | string | Required | unique | New permanent version identity for a specific source/scope. Do not reuse an old key for changed published terms or law. |
| `revision_hash` — Legacy fingerprint (optional) | string | Optional | No additional declared constraint | Optional legacy metadata. Leave empty for new editorial work; the server derives authoritative fingerprints. A typed hash does not validate content. |
| `rule` — Rule | reference | Optional | relation: rule_versions; single selection | Select the reusable Policy Rule whose wording/version is being recorded. |
| `statement` — Rule statement | text | Required | No additional declared constraint | State the rule and its conditions/exceptions faithfully, with an exact article/paragraph reference. Separate text from interpretation. |
| `source_url` — Official source URL | url | Required | No additional declared constraint | Open the exact source document/page and verify ownership, relevance, version and accessibility. Prefer stable HTTPS URLs; never include login tokens. |
| `source_published_at` — Source published at | datetime | Optional | No additional declared constraint | The date/time stated by the source, if known. Leave blank if unknown; do not substitute the observation date. |
| `observed_at` — Observed at | datetime | Required | No additional declared constraint | Actual time you inspected this source or behavior, in ISO 8601 with timezone, preferably UTC. This is not its legal effective date. |
| `effective_from` — Effective from | datetime | Optional | No additional declared constraint | Verified beginning of the relevant contract cohort/scope, inclusive. Explain transitions in the research notes; do not infer from publication alone. |
| `effective_to` — Effective to | datetime | Optional | No additional declared constraint | Verified end of the relevant contract cohort/scope, exclusive. Must follow the start; blank is open-ended, not unknown historical precision. |
| `applicability_country` — Country code | string | Optional | No additional declared constraint | Use a two-letter country code, e.g. DE, consistently. Required on assessments; fill on source versions whenever country constrains applicability. |
| `applicability_channel` — Signup channel | select | Optional | web, app, phone, in_person, other | Channel through which the contract was concluded, not the editor's research device. Blank can broaden scope, so omit only deliberately. |
| `applicability_customer` — Customer kind | select | Optional | consumer, business | Consumer or business scope from the source; never assume both. Blank can broaden scope. |

### Policy Evidence — `policy_evidence`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Evidence title | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `stable_key` — Stable identity | string | Required | unique | Permanent identity, not a display name. Search before creating; retain across ordinary corrections. Published evidence replacements need a new identity. |
| `revision_hash` — Legacy fingerprint (optional) | string | Optional | No additional declared constraint | Optional legacy metadata. Leave empty for new editorial work; the server derives authoritative fingerprints. A typed hash does not validate content. |
| `evidence_kind` — Evidence kind | select | Required | terms_excerpt, official_guidance, official_law, product_observation, other | Choose the source/observation category matching the evidence, not the desired finding. |
| `public_excerpt` — Public excerpt | text | Optional | No additional declared constraint | Supply a concise, contextual public excerpt or observation sufficient to explain the evidence. Do not include personal data; this field may be publicly projected. |
| `internal_notes` — Internal notes | text | Optional | No additional declared constraint | Record search coverage, inspection steps, caveats, contradictions and research provenance. Not in the current public graph projection; still not a secret store. |
| `source_url` — Source URL | url | Required | No additional declared constraint | Open the exact source document/page and verify ownership, relevance, version and accessibility. Prefer stable HTTPS URLs; never include login tokens. |
| `source_published_at` — Source published at | datetime | Optional | No additional declared constraint | The date/time stated by the source, if known. Leave blank if unknown; do not substitute the observation date. |
| `observed_at` — Observed at | datetime | Required | No additional declared constraint | Actual time you inspected this source or behavior, in ISO 8601 with timezone, preferably UTC. This is not its legal effective date. |

### Policy Assessments — `policy_assessments`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `title` — Assessment title | string | Required | No additional declared constraint | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `assessment_key` — Stable assessment identity | string | Required | No additional declared constraint | Stable identity for this scoped assessment. Keep unique by editorial convention; schema does not enforce uniqueness on this field. |
| `revision_hash` — Legacy fingerprint (optional) | string | Optional | No additional declared constraint | Optional legacy metadata. Leave empty for new editorial work; the server derives authoritative fingerprints. A typed hash does not validate content. |
| `offer_version` — Offer version | reference | Optional | relation: assessment_offer_versions; single selection | Exactly one published Offer Version used in this comparison; select a native relationship. |
| `rule_versions` — Rule versions | reference | Optional | relation: assessment_rule_versions | At least one published Rule Version; use a focused rule assessment. Check live relation cardinality if the picker refuses links. |
| `evidence` — Evidence | reference | Optional | relation: assessment_evidence | At least one published Evidence record supporting the comparison; an unsourced conclusion is insufficient. |
| `applicability_country` — Country code | string | Required | No additional declared constraint | Use a two-letter country code, e.g. DE, consistently. Required on assessments; fill on source versions whenever country constrains applicability. |
| `applicability_contract_from` — Contract from | datetime | Optional | No additional declared constraint | First contract date covered by this assessment, inclusive; align with offer/rule scope. |
| `applicability_contract_to` — Contract to | datetime | Optional | No additional declared constraint | First contract date excluded from this assessment, exclusive; must follow the start. |
| `applicability_channel` — Signup channel | select | Optional | web, app, phone, in_person, other | Channel through which the contract was concluded, not the editor's research device. Blank can broaden scope, so omit only deliberately. |
| `applicability_customer` — Customer kind | select | Optional | consumer, business | Consumer or business scope from the source; never assume both. Blank can broaden scope. |
| `terms_statement` — Terms statement | text | Required | No additional declared constraint | Accurately summarize or briefly quote provider terms; cite document and section. State what was inspected; do not mix in the legal conclusion. |
| `product_observation` — Product observation | text | Required | No additional declared constraint | Describe actually observed behavior and test steps, channel/date and limits. Say when not tested; do not turn a terms excerpt into a behavior claim. |
| `applicability_state` — Applicability | select | Required | applicable, not_applicable, needs_information, ambiguous | Choose independently using section 2; explain missing facts or ambiguity instead of forcing applicable. |
| `terms_state` — Terms statement state | select | Required | found, not_found, unclear, not_assessed | Found/not found describes the researched documents only; record search coverage and uncertainty. |
| `finding_state` — Editorial finding | select | Required | no_issue_identified, missing_required_disclosure, implementation_gap, possible_conflict, unresolved, not_assessed | Select the reviewed conclusion supported by applicability plus evidence; not_found alone does not prove a required disclosure is missing. |
| `reviewed_at` — Reviewed at | datetime | Required | No additional declared constraint | Actual completed assessment review time; use ISO 8601 with timezone and no fabricated future completion. |
| `review_expires_at` — Review expires at | datetime | Required | No additional declared constraint | Future recheck deadline chosen for the evidence volatility and impact. Approval is capped at 30 days or this expiry, whichever is earlier. |

### Law guides — `law_guides`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `stable_id` — Stable guide ID | string | Required | max 100 chars | Permanent lowercase-hyphen identifier; must match cross-record IDs exactly. Search for duplicates before creating. |
| `title` — Title | string | Required | max 180 chars | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `jurisdiction` — Jurisdiction | string | Required | max 180 chars | Name the geographic/legal scope precisely; do not imply all countries share the same rule. |
| `summary` — Summary | text | Required | max 2400 chars | Explain the rule plainly with its conditions and limits; every substantive claim needs supporting sources. |
| `takeaways` — Takeaways | repeater | Optional | min 0 rows; max 20 rows | Concise actionable learning points; preserve the source's qualifications. |
| `takeaways[].text` — Takeaway | text | Required | max 1000 chars | One accurate, sourced takeaway per row; avoid absolute promises. |
| `sources` — Official sources | repeater | Optional | min 0 rows; max 30 rows | Use relevant specific official citations. Empty is schema-valid but insufficient for source-backed legal learning publication. |
| `sources[].label` — Source label | string | Required | max 180 chars | Clear short display label; in a source row, identify document and article/section rather than only the publisher. |
| `sources[].url` — Official source URL | url | Required | No additional declared constraint | Specific verified official source URL; open it and check the cited provision and version. |
| `reviewed_on` — Reviewed on | datetime | Required | No additional declared constraint | Actual completed learning review, ISO 8601 with timezone, nonfuture. Required by the publication guard and public reader. |

### Glossary — `glossary_terms`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `stable_id` — Stable term ID | string | Required | max 100 chars | Permanent lowercase-hyphen identifier; must match cross-record IDs exactly. Search for duplicates before creating. |
| `title` — Term | string | Required | max 180 chars | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `label` — Short label | string | Required | max 180 chars | Short label that distinguishes the term without changing its meaning. |
| `description` — Description | text | Required | max 2400 chars | Plain-language description appropriate to this content; explain purpose without unsupported claims. |
| `sources` — Official sources | repeater | Optional | min 0 rows; max 30 rows | Use relevant specific official citations. Empty is schema-valid but insufficient for source-backed legal learning publication. |
| `sources[].label` — Source label | string | Required | max 180 chars | Clear short display label; in a source row, identify document and article/section rather than only the publisher. |
| `sources[].url` — Official source URL | url | Required | No additional declared constraint | Specific verified official source URL; open it and check the cited provision and version. |
| `reviewed_on` — Reviewed on | datetime | Required | No additional declared constraint | Actual completed learning review, ISO 8601 with timezone, nonfuture. Required by the publication guard and public reader. |

### Learning quizzes — `quizzes`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `stable_id` — Stable quiz ID | string | Required | max 100 chars | Permanent lowercase-hyphen identifier; must match cross-record IDs exactly. Search for duplicates before creating. |
| `content_version` — Immutable content version | string | Required | max 120 chars | Assign a new explicit version when quiz content, answers or order change; retain old result identity. Not an automatically managed version. |
| `title` — Title | string | Required | max 180 chars | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `description` — Description | text | Required | max 1200 chars | Plain-language description appropriate to this content; explain purpose without unsupported claims. |
| `question_ids` — Ordered question IDs | repeater | Optional | min 0 rows; max 20 rows | Ordered nonempty list for public quiz display; unique IDs, each resolving to a valid published question with matching quiz_id. |
| `question_ids[].id` — Stable question ID | string | Required | max 120 chars | Stable ID of the target question/answer, not a CMS-generated entry ID. Use lowercase-hyphen IDs. |
| `reviewed_on` — Reviewed on | datetime | Required | No additional declared constraint | Actual completed learning review, ISO 8601 with timezone, nonfuture. Required by the publication guard and public reader. |

### Quiz questions — `quiz_questions`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `stable_id` — Stable question ID | string | Required | max 120 chars | Permanent lowercase-hyphen identifier; must match cross-record IDs exactly. Search for duplicates before creating. |
| `quiz_id` — Quiz ID | string | Required | max 100 chars | Exactly the parent Quiz stable_id. Native quiz_reference alone does not populate this public-reader linkage. |
| `quiz_reference` — Quiz | reference | Optional | relation: quiz_questions | Select the matching native Quiz record as well as setting quiz_id; keep both representations consistent. |
| `order` — Order | integer | Required | min 0; max 19 | Zero-based authoring order, 0–19. Public order follows the parent quiz question_ids array, so update both consistently. |
| `prompt` — Prompt | text | Required | max 1200 chars | Ask one clear question with enough scope to have one defensible answer. |
| `options` — Answer choices | repeater | Optional | min 0 rows; max 8 rows | Supply 2–8 complete choices for publication, unique lowercase-hyphen IDs; avoid duplicative or accidentally correct distractors. |
| `options[].id` — Stable answer ID | string | Required | max 20 chars | Stable ID of the target question/answer, not a CMS-generated entry ID. Use lowercase-hyphen IDs. |
| `options[].label` — Answer label | text | Required | max 500 chars | Clear short display label; in a source row, identify document and article/section rather than only the publisher. |
| `correct_option_id` — Correct answer ID | string | Required | max 20 chars | Must match exactly one answer option ID; confirm the explanation and official source support it. |
| `explanation` — Explanation | text | Required | max 1800 chars | Explain the correct answer and limits in plain language; revisit after any source or option change. |
| `source_label` — Source label | string | Required | max 180 chars | Name the official document and relevant provision supporting the answer. |
| `source_url` — Official source URL | url | Required | No additional declared constraint | Open the exact source document/page and verify ownership, relevance, version and accessibility. Prefer stable HTTPS URLs; never include login tokens. |
| `source_law_guide` — Related law guide | reference | Optional | relation: quiz_question_law_guide | Select the relevant Law Guide if available; does not replace source_url or source_label. |
| `reviewed_on` — Reviewed on | datetime | Required | No additional declared constraint | Actual completed learning review, ISO 8601 with timezone, nonfuture. Required by the publication guard and public reader. |

### Website section block fields

These are nested under `pages.sections[]`. Block metadata `_type`, `_version` and `_key` is managed by the block editor; preserve the key when editing the same block. Requirements below come from each block definition; the public reader adds the completeness rules explained in section 6.

#### Hero — `hero`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `placement` — Placement | select | Optional | content, home-intro, agent-intro | content (default), home-intro, or agent-intro; use the matching special-page slot. Intro placements need a heading. |
| `heading` — Heading | string | Required | max 180 chars | Concise section heading; preserve page heading hierarchy. Required for hero and any intro placement. |
| `body` — Body | text | Optional | max 1200 chars | Plain editorial copy with appropriate scope; this supported block does not create a custom interactive feature. |
| `cta_label` — CTA label | string | Optional | max 100 chars | Clear action label describing the destination. A rendered CTA needs label, safe URL and stable CTA ID together. |
| `cta_url` — CTA link | url | Optional | No additional declared constraint | Safe intended destination, e.g. /wiki or an official HTTPS link. Test it; no script URLs or personal query parameters. |
| `cta_id` — Stable CTA ID | string | Optional | max 120 chars | Stable action identity, e.g. home-open-wallet; preserve for same purpose, replace when purpose changes. Never contain personal data. |

#### Copy section — `copy_section`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `placement` — Placement | select | Optional | content, home-intro, agent-intro | content (default), home-intro, or agent-intro; use the matching special-page slot. Intro placements need a heading. |
| `heading` — Heading | string | Optional | max 180 chars | Concise section heading; preserve page heading hierarchy. Required for hero and any intro placement. |
| `body` — Body | text | Optional | max 4000 chars | Plain editorial copy with appropriate scope; this supported block does not create a custom interactive feature. |
| `cta_label` — CTA label | string | Optional | max 100 chars | Clear action label describing the destination. A rendered CTA needs label, safe URL and stable CTA ID together. |
| `cta_url` — CTA link | url | Optional | No additional declared constraint | Safe intended destination, e.g. /wiki or an official HTTPS link. Test it; no script URLs or personal query parameters. |
| `cta_id` — Stable CTA ID | string | Optional | max 120 chars | Stable action identity, e.g. home-open-wallet; preserve for same purpose, replace when purpose changes. Never contain personal data. |

#### Feature list — `feature_list`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `placement` — Placement | select | Optional | content, home-intro, agent-intro | content (default), home-intro, or agent-intro; use the matching special-page slot. Intro placements need a heading. |
| `heading` — Heading | string | Optional | max 180 chars | Concise section heading; preserve page heading hierarchy. Required for hero and any intro placement. |
| `items` — Features | repeater | Optional | min 1 rows; max 12 rows | 1–12 complete feature rows; each needs title and body. |
| `items[].title` — Title | string | Required | max 180 chars | Use the precise recognizable name or a concise, scoped version/assessment label. Do not imply a broader review than was performed. |
| `items[].body` — Body | text | Required | max 1000 chars | Plain editorial copy with appropriate scope; this supported block does not create a custom interactive feature. |

#### FAQ — `faq`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `placement` — Placement | select | Optional | content, home-intro, agent-intro | content (default), home-intro, or agent-intro; use the matching special-page slot. Intro placements need a heading. |
| `heading` — Heading | string | Optional | max 180 chars | Concise section heading; preserve page heading hierarchy. Required for hero and any intro placement. |
| `questions` — Questions | repeater | Optional | min 1 rows; max 12 rows | 1–12 complete FAQ rows with real questions and supported answers. |
| `questions[].question` — Question | string | Required | max 500 chars | Phrase the actual reader question precisely. |
| `questions[].answer` — Answer | text | Required | max 2000 chars | Give a direct, scoped and supportable answer. Do not imply personalized advice. |

#### Call to action — `cta`

| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |
| --- | --- | --- | --- | --- |
| `placement` — Placement | select | Optional | content, home-intro, agent-intro | content (default), home-intro, or agent-intro; use the matching special-page slot. Intro placements need a heading. |
| `heading` — Heading | string | Optional | max 180 chars | Concise section heading; preserve page heading hierarchy. Required for hero and any intro placement. |
| `body` — Body | text | Optional | max 1200 chars | Plain editorial copy with appropriate scope; this supported block does not create a custom interactive feature. |
| `cta_label` — CTA label | string | Required | max 100 chars | Clear action label describing the destination. A rendered CTA needs label, safe URL and stable CTA ID together. |
| `cta_url` — CTA link | url | Optional | No additional declared constraint | Safe intended destination, e.g. /wiki or an official HTTPS link. Test it; no script URLs or personal query parameters. |
| `cta_id` — Stable CTA ID | string | Required | max 120 chars | Stable action identity, e.g. home-open-wallet; preserve for same purpose, replace when purpose changes. Never contain personal data. |

