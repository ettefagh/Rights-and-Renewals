# Issue 37 wrap-up checkpoint — 11 November 2026

The user requested that development wrap up or stop, that status be reported on GitHub, and that a preview then be published and reported. Scope is frozen. This checkpoint is not a completed CMS release.

## Preview source

`373b93786995b00f9b477eba1d7877038d32f978` captures the completed wallet/UI slice on top of CMS release `dd1e53b249c7511becea66dbf388e428fdefb157`:

- Restored in-app Wiki, law guides/glossary, company archive, two quizzes and local progress, Month/Agenda and related existing wallet UI edits.
- Validated published-CMS client and bundled offline fallback; successful empty arrays remain empty.
- Fifteen locally hosted SVG logos (five from developer-icons, ten from Simple Icons) and five labeled monogram fallbacks, with source/license provenance.
- All twelve changed Svelte components passed the official autofixer with no issues; style/focus suggestions are advisory.

The preview must be built from the clean detached `issue-37-ui-verification/CM-LAB` checkout at that exact commit, with `PUBLIC_SHOWCASE_ORIGIN=https://rightsandrenewals-showcase.padarhava.workers.dev`. The new backend Wiki endpoint is not deployed there, so the UI may show its bundled fallback. This must not be described as proof of live CMS synchronization.

Fresh-checkout verification: 90 core tests passed; core typecheck passed. App check passed with zero errors and six existing EmailGate/OmniBar accessibility warnings. The final preview build and HTTP/bundle verification are reported on GitHub with the deployment identity.

## Preserved unfinished backend

The following work is captured as an interrupted draft, not a deployable acceptance result: relational policy catalog, exact-review publication hooks and protected approvals, plan API/MCP lookup, plan findings page, native review console, website/learning schemas and resolvers, additive migration/import tools, native proposal queue and aggregate analytics preparation.

The earlier isolated SQLite model apply created 16 collections, 10 relations and 44 content entries; rerun skipped existing records. Later schema/admin/proposal edits were interrupted and do not inherit that acceptance automatically.

Final frozen backend check: 96/97 showcase tests passed; one editorial-proposals test failed because its expected capability list no longer matched the new content-read capability. Showcase check reported 39 errors across the new review React UI, proposal plugin/tests and event environment types. No errors were repaired after the user requested wrap-up; these failures are preserved for review.

Other incomplete acceptance: actual protected-approval/publication runtime against D1, revision-fingerprint usability, complete importer/admin UI integration, metadata/consumer wiring, native agent OAuth/Access interoperability, telemetry binding/consent/registry integration and an authoritative registration source. Do not infer registrations from sign-in or clicks. No invented provider plans or legal findings were published.

## Limits and preservation

Luna workers and the independent browser verifier hit their usage limit. Browser/end-to-end checks did not complete and must remain unverified. No credentials were issued, editorial agent connected, Access policy changed, analytics activated, production deployment made or production database written during this issue37 work.

Original UI and auth donor worktrees remain intact. Their edits and staging are not removed. Keep issue37 open and the pull request in draft; do not mark the full CMS objective complete. Resume from this draft source and the recorded errors, preserving the distinction between draft PR head and deployed preview commit.
