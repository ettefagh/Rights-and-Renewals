# EmDash Policy CMS Implementation Plan

## Goal

Deliver the CM-LAB EmDash policy CMS as a durable, authenticated editorial workflow for the existing `rightsandrenewals` Cloudflare deployment. Public showcase policy pages must read only published CMS entries. User vault and receipt data remain local. The supported hosting target must be resolved before release.

Tracking issue: [#35](https://github.com/ettefagh/CM-LAB/issues/35)

## Milestones

| ID | Deliverable | Owner | Dependencies | Acceptance check | Status |
| --- | --- | --- | --- | --- | --- |
| M1 | Read-only discovery, scope, and release target | Lead | User authorization | Issue #35; exact source/runtime revisions and blockers documented | Complete |
| M2 | EmDash-supported framework baseline, typed policy model, idempotent import path, and safe editor entry | Lead | Official EmDash 1.4 docs; current D1 content-model state | Astro 6+ with a supported Cloudflare runtime; no in-memory edits; no anonymous writes/reset; seed/import preserve editorial content | Implemented locally; exact-SHA review pending |
| M3 | Published-only API and server-rendered showcase wiki | Lead | M2 | Anonymous routes read published EmDash entries; authorized editor preview is private and labeled | Implemented locally; build/type checks passed; live D1 access blocked |
| M4 | Independent critic, challenger, and release audit | Non-implementing reviewer(s) | M2–M3 exact diff | Findings resolved or explicitly documented; exact-SHA review recorded | In progress |
| M5 | Integrate and publish | Lead, subject to project gates | M4; hosting target decision; safe D1 schema/content migration; production lineage reconciliation | Deployment uses an approved exact SHA; admin, API, and wiki behavior confirmed live | Blocked: Pages adapter incompatibility, production lineage, and uninitialized D1 |

## Work ownership

| Agent or pass | Files / deliverable owned | Must not edit | Expected evidence |
| --- | --- | --- | --- |
| Lead implementation | `apps/showcase` EmDash config, seed/import tooling, APIs, and wiki routes; this plan and progress record | User's dirty original checkout; unrelated wallet UI and MCP behavior | Focused diffs, build output, source/runtime evidence |
| Critic / challenger / auditor | Read-only current-tree review and final exact-SHA review | All source and tracker state | Concrete findings, edge cases, and verified / not verified / blocked decision |

## Integration decisions

- Use the existing EmDash instance in `apps/showcase`; do not add a second CMS or admin surface to the wallet app.
- Align `apps/showcase` to EmDash 1.4's Astro 6+ peer requirement. The Astro 6 Cloudflare adapter no longer supports Pages; the current Pages project cannot be released with this stack without changing the hosting architecture. Do not claim Pages runtime compatibility from a successful bundle build.
- Use EmDash's typed collection and draft/publish lifecycle as the policy source of truth. Keep `packages/core` seed data for offline wallet behavior unless a separate approved scope changes it.
- Treat `seed/seed.json` as first-setup metadata, not a production migration for the already configured D1 database.
- Remove the unprotected project-specific admin reset endpoint from the current main source before any release.
- Do not write to production D1 during development or use shared production bindings from a preview.

## Verification gates

- Initial critic and release audits: completed; unsupported scheduling, importer conflicts, MCP lookup order/field type, malformed-entry resilience, alias collisions, and preview labeling were fixed or narrowed by implementation.
- Final critic/challenger/auditor: pending exact implementation SHA.
- Local verification: Astro build, `tsc`, `svelte-check`, seed validation, syntax checks, and diff checks.
- Production behavior: not verified; the latest read-only Wrangler D1 query succeeded and listed only `_cf_KV`.

## Open release risks

- Cloudflare deployment list reports production source `f3530afe9e8f3b1676e61771a4cc934da2f0bbf5`; open PR #34 still has that head. It is not an ancestor of current `origin/main` (`bb92ebd534ff19eb1fed9297b1474c1ac5c1a3e7`). A deployment from current `main` without reconciling that lineage could regress live showcase changes.
- The latest read-only D1 audit found only `_cf_KV` and no EmDash tables. A prior read failed with error 7403; the subsequent successful query confirms the database is reachable but not initialized for EmDash.
- The EmDash seed file initializes an empty site; it is not a production migration. The authenticated importer requires a seeded collection and preserves existing records.
- The CMS admin requires an authenticated EmDash account; this session has no confirmed editor identity. Production schema/content initialization is not authorized or verified.
- EmDash 1.4 requires Astro 6+, while the Astro Cloudflare adapter required by Astro 6 no longer supports Cloudflare Pages. The existing Pages target was explicitly requested, so migrate to Workers only after the user confirms that hosting change.
- Production PR #34 contains live-only wallet/showcase changes and the three-tool read-only MCP boundary absent from current `origin/main`; preserve those when reconciling source lineage.
- Production preview resources are not isolated in the checked-in Wrangler config. Development must use local bindings or explicitly isolated resources.
- The project's EmDash MCP `search_docs` tool and CMS-specific skills are not exposed in this session. Current official EmDash docs were checked directly.
