# Policy research and relationships

Scope first: provider → service → named plan → commercial offer → offer version.
Establish country, contract cohort/date, signup channel and consumer/business kind.
Do not project a brand summary onto every plan. Reuse a shared Rule/Rule Version
across assessments only when its source/version/scope genuinely match.

An Assessment links exactly one published Offer Version, at least one published
Rule Version and published Evidence. Use native reference pickers/API, not IDs
pasted into prose. Checked-in assessment relations have a one-parent-per-child
limit despite some multi-select fields: reuse across assessments is possible,
but several rule/evidence parents on one assessment may be refused. Check live
cardinality; do not duplicate rules to work around it. Readers bound each rule
and evidence set to 50. Prefer focused, one-rule assessments.

Research the provider's actual terms, incorporated documents and public product
behavior. Record exact URL, document/section, short excerpt, source publication
date if known, observation time, inspected steps and gaps. Use the specific
official legal source: German consolidated legislation at
https://www.gesetze-im-internet.de/, authoritative publication at
https://www.recht.bund.de/, EU documents at https://eur-lex.europa.eu/.
Open current sources and verify the applicable version; portals alone are not
citations. Distinguish legal effective date from document publication and review.
AI output is a research lead, not evidence.

Decide independently:

| Decision | Meaning |
| --- | --- |
| Applicability | `applicable`: supported facts/scope; `not_applicable`: identify excluding fact; `needs_information`: name missing fact; `ambiguous`: unresolved interpretation/conflict. |
| Terms | `found`: cite clause; `not_found`: document complete search coverage; `unclear`: wording/scope uncertain; `not_assessed`: no completed investigation. |
| Finding | `no_issue_identified`: limited reviewed question; `missing_required_disclosure`: establish duty plus adequate absence evidence; `implementation_gap`: required behavior versus observed gap; `possible_conflict`: apparent contradiction; `unresolved`: insufficient evidence; `not_assessed`: incomplete review. |

An inaccessible page does not establish absence. A found clause does not prove
implemented behavior. No issue identified is not whole-provider certification.
Internal notes are omitted from the current public graph projection but remain
accessible to authorized CMS users: never store secrets there.

Brand Policies is a legacy summary: required month integers cannot represent
unknown or day-based periods; do not enter 0 or round to fit. The false-default
compliance Boolean cannot distinguish unreviewed/inapplicable/confirmed failure.
Retain uncertainty in notes/draft and use assessments for nuanced conclusions.
Put citations/scope in legal_notes because no dedicated source field exists.
Plans/Offers currently lack dedicated price/currency/billing/minimum-term fields.

Offer/rule scope and assessment contract boundaries match the user's contract
date, inclusive start and exclusive end. Blank scope can broaden application.
Overlapping offers return ambiguity, not “latest wins.” Immutable open-ended
versions may require operator scope/model correction before another is published.

Capture a brief: target ID/revision; identities and scope; question; provider and
official URLs/sections; source/observed dates; excerpt; behavior; gaps/conflicts;
proposed three states; linked records; review/expiry rationale.
