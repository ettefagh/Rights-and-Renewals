# Field snapshot

Derived from CMS_EDITOR_HANDBOOK.md at repository commit c810e8e, based on model revision 70772ff (12 November 2026). Not a live-schema assertion. Use scripts/fields.py to retrieve a selected collection/block; do not read this whole file by default. CMS requirement and public-reader/editorial requirements differ; see the selected advice and relevant workflow reference.

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

