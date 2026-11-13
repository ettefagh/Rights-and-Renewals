# Issue 37 editorial review and import runbook

## Review workflow

The EmDash sidebar groups policy records under **Policy catalog**, learning content under **Learning**, and editable public pages under **Website**. The native **Assessment review** page is registered by the separate `cmlab-policy-review-console` plugin and opens at `/_emdash/admin/plugins/cmlab-policy-review-console/review`.

Select an assessment to load its current review state, revision comparison, review period, and source snapshots. The protected review route returns the offer/rule/evidence titles, statements, version identities, citations and fingerprints from the exact records used to calculate the review binding. Ordinary content GET does not hydrate those references. The confirmation action submits only the assessment ID, current EmDash revision, and expected protected-review revision. Reviewer identity and authorization come from the authenticated server route. A review does not publish the content; use the native content editor for the separate publish action. The policy publication hook checks current approval and linked source revisions again at publication time. Missing source snapshots disable approval in the screen; stale detail responses are ignored and selection is disabled during submission.

Approval refusals must be resolved by reloading the assessment. Permission, author separation, changed revision, changed evidence, or unavailable review storage can all refuse a review. The current domain route returns a generic fail-closed message for these causes; the page displays that server response and asks the editor to reload. No actor value entered in the page is authoritative, and account binding alone does not establish whether a session was operated by a person or an automated client.

The immutable audit row is created before the conditional approval write. A failed
concurrent approval can therefore leave an audit row for an attempted review. The
current protected approval row is the authority for an accepted decision; an audit
row by itself does not prove acceptance or allow publication.

## Additive import workflow

The default `pnpm emdash:import-editorial` command is read-only. Set `EMDASH_URL` to the site origin; remote origins require HTTPS. Review the ordered plan for collection creation, ordinary fields, relations, reference fields, block types, block fields, and missing starter entries. Existing matching entries are preserved, and any edited starter entry or incompatible model definition stops the import.

Only run `pnpm emdash:import-editorial -- --apply` after the plan is reviewed. Applying requires `EMDASH_TOKEN` for an EmDash operator with schema and content permissions. The adapter calls authenticated EmDash collection, relation, and field routes with the bearer token and `X-EmDash-Request: 1`; it fills only missing sidebar group/icon metadata and relaxes only required `revision_hash` fields. Block types, new fields, content, and publication use the installed EmDash client. It creates missing entries only. It never replaces pages, posts, brand policies, or existing user-edited entries.

The importer derives provider identity entries from `public/data/policy_wiki_seed_v1.json`, storing only each reviewed brand's name, slug, and stable key in `policy_providers`. It does not transfer legacy plan tiers or legal findings. Seed synchronization retains existing provider entries.

Revision fingerprint fields on policy offer versions, rule versions, evidence, and assessments are optional legacy metadata. For an existing site, apply safely relaxes only a required `revision_hash` field to optional; it does not delete or rewrite existing values. Readers and review hooks derive fingerprints from actual canonical content and ignore the self-entered field. Editors do not calculate hashes. Published source versions and evidence cannot be edited; create a new version instead. The before-save hook throws with abort error policy, including when a formerly published entry has been unpublished or its current state cannot be verified.

The trusted graph-review server plugin declares `content:publish` because installed EmDash 1.4 exposes `content.getVersioned` only through that capability. It consequently has access to plugin-side publication operations, although this implementation calls only the versioned read API. This is an explicit server-plugin trust requirement, not an editorial-agent token grant. Assessment approval routes still require an authenticated Editor/Admin and native `content:publish_any` permission; proposals use a different plugin without publication capability.

## Private proposal queue

Open `/_emdash/admin/plugins/cmlab-policy-review-console/proposals` for the read-only pending queue. An authenticated Editor/Admin can inspect up to 50 proposals, their owner, body and expected target revision, then open the allowlisted target in the native editor. Contributors can read only their own submissions through the own-list route. No queue action applies or publishes the suggested change. Accepted edits must be made and reviewed separately against the target's current state. Queue resolution/archive actions are not implemented in this milestone.

## Publication dates

The central `content:beforePublish` hook checks `verified_date` on `brand_policies` and `reviewed_on` on `law_guides`, `glossary_terms`, `quizzes`, and `quiz_questions`. Dates must be valid ISO 8601 date-times and must not be future-dated. Missing or malformed review dates refuse publication through the shared EmDash lifecycle hook. Other collections are unaffected.

## Local checks

Focused tests:

```sh
pnpm exec vitest run scripts/editorial-importer.test.mjs scripts/editorial-catalog.test.mjs src/lib/policy-publication-guard.test.ts src/lib/policy-review-api.test.ts
```

Do not use this runbook as authorization to apply changes to a remote database, publish production content, connect an editorial agent, or deploy the site.
