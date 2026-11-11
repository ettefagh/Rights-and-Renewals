# EmDash editorial platform — issue #37

Execution authorized by the user's request: “Apply your recommendations. Pursue by luna subagents. Be the thinker and orchestrator.” Integrity mode: development. Root owns architecture, adjudication and integration; Luna workers own bounded implementation and independent review.

## Scope and acceptance

| Milestone | Outcome | Acceptance evidence |
|---|---|---|
| M0: source reconciliation | Preserve newer in-app Wiki, quizzes, Month/Agenda and selected related UI/web edits alongside CMS release | Original donor fingerprints unchanged; integrated source identity; build and focused UI checks |
| M1: policy graph | Versioned providers/services/plans/offers/rules/evidence/assessments, approved public findings | EmDash1.4 schema validation; draft/expiry/dependency tests; deterministic published projection |
| M2: editorial website and learning | Editable public webpage content and existing Wiki/quiz content with offline fallback | CMS publish changes public output; preview isolation; quiz progress/replay preserved |
| M3: agent readiness | Native editorial MCP boundary, narrow proposed-draft authorization, revocation and audit preparation | Negative authorization/concurrency tests; no live agent connection or issued credential |
| M4: measurement | Allowlisted aggregate ingestion and reports; no fingerprinting; exact registration facts separated | Reject PII/unknown events; collection disabled unless configured; event/error tests |
| M4a: brand identity | Local brand logos in the app archive and public policy views | User-specified developer-icons source/attribution, covered brand mapping, accessible fallback and fixed dimensions |
| M5: integration/review | Reviewable PR and verified preview, with clear release evidence | Tests/builds, independent exact-source review, deployment and runtime evidence separately |

Actual editorial-agent connection verification stays deferred. Preserve offline wallet data and local quiz progress. No invented provider violations, legal rules or compliance claims. No main push/merge or production database write is implied by a local acceptance result. Any preview must use isolated bindings; source and built output must match.

## Source identity

- Fresh managed checkout: `C:/Users/admin/.codex/worktrees/emdash-editorial-platform/CM-LAB`.
- Created at verified remote main `bb92ebd534ff19eb1fed9297b1474c1ac5c1a3e7`, branch `codex/issue-37-emdash-editorial-platform`, then fast-forwarded to reviewed CMS implementation `dd1e53b249c7511becea66dbf388e428fdefb157`.
- UI donor: `cm-lab-ui-reference`, HEAD `f3530afe9e8f3b1676e61771a4cc934da2f0bbf5` plus dirty/untracked source. Keep originals and staging intact; copying edits is not moving them.
- Separate `auth-mail-preview` source is not automatically integrated; keep its identity and credentials prerequisites distinct.
- Baseline PR #36 remains open. Issue #37 changes should be reviewable separately from that CMS release.

## Ownership and mutation plan

- Luna UI: `apps/app/src/components/WalletApp.svelte`, donor UI components under `capture`, `views`, `widgets`, and new `wikiContent.ts`. Preserve current auth, omnibar, middleware, showcase URL and entry-point integration. No package edits.
- Luna domain: new `apps/showcase/scripts/editorial-catalog.mjs`, `src/lib/policy-graph*.ts`, dedicated public plan API and tests. Approval state cannot be a self-editable boolean; protected review binds to exact dependencies and expiry.
- Luna website: selected `apps/showcase` UI templates/styles plus new webpage/learning schema and resolver files, after explicit assignment. Preserve published policy resolver and public MCP contract.
- Root: request/plan/progress docs, shared interfaces, conflict adjudication, seed/import/config wiring and review. Additional agent infrastructure/analytics implementation assigned separately with non-overlapping files.

Before each mutation recheck destination state and donor hashes; never overwrite another owner's active edits. Changes to shared files require root integration. No dependency upgrades solely to match newer docs. Use installed EmDash1.4 schemas. Original source worktrees are read-only.

## Discovery and verification limits

Project graph was absent. Attempted required local Qwen warm-up; endpoint timed out. Deterministic Graphify extraction of showcase source produced 197 nodes/351 edges, but 11 Astro/Svelte files had partial parser failures. Use its TS edges only as orientation and confirm boundaries from source; no complete topology claim. Dependencies are installed with the existing frozen lockfile in the fresh checkout.

## Progress

- Issue #37 created; isolated branch initialized.
- Source inventory and UI merge advisory complete; no donor mutations.
- Implementation, runtime checks and independent review pending.
- UI restoration worker completed app check (0 errors, six existing warnings), app build and Svelte autofixer. Subsequent CMS-client/logo integration is in progress, so this is not final integrated acceptance.
- Baseline showcase suite: 14 passing tests. Baseline core suite: 88 passing tests; core typecheck passed. No new-code acceptance inferred from these baseline results.
- User added brand-logo requirement and suggested `xandemon/developer-icons`; assigned to the app/CMS worker with local SVG provenance and existing simple-icons fallback coverage.
- App CMS-client/logo pass completed 7 client tests and 2 mapping tests, app build/check (six existing warnings), showcase check and 15 local SVG checks per app. Five known brands currently use labeled monograms; do not claim complete logo coverage.
- Root reran the official Svelte MCP autofixer against the final PolicyWikiView, BrandLogo and BrandIcon source using installed Svelte5.57.3: no issues. PolicyWikiView has advisory class-directive and bind:this suggestions, not correctness failures. Initial UI worker checked the remaining restored Svelte components.
- Initial domain slice passed 11 focused tests and TypeScript; initial website slice passed seven tests, showcase build and check. Root reproduced the multiple-independent-rule ambiguity bug; domain completion worker owns the fix and protected-approval public read integration.
- Combined schema validation passed and the integration worker applied the model to an isolated local SQLite fixture (16 collections, 10 relations, 44 content entries). Full integrated runtime proof remains pending.

## Integration checks for reviewers

- Preserve legacy About page Portable Text when adding page sections; additive schema/import must not remove existing fields or replace published entries by default.
- Default CMS page content must preserve the approved homepage/demo and agent setup functions, not replace them with an unrelated generic layout.
- `asOf` in public learning data must mean source review date, not merely the current request timestamp.
- The public plan resolver must read protected approvals; an always-empty approval array is fail-closed but is not a completed reviewed-findings feature.
- Public learning review dates must be valid and not future-dated through a central publish policy; native required fields alone do not establish date validity or source freshness.
- Verify real pending-reference reads in publication policy and error propagation from relation queries. A mocked pure resolver test is insufficient runtime evidence.
- Protected review must bind actual dependency data, not merely self-reported hash fields. Published source changes suppress outdated findings; historical identities cannot silently rewrite history.
- Public API/MCP/wiki must share the plan projection; expose accessible findings in relevant wiki/plan views without implying unassessed plans are compliant.
- Native MCP draft principal has no publish/schema/settings/transfer permissions; actual connection remains deferred. CORS and an Access service token are not application authorization.
- Provide an actual editorial assessment/review screen or native admin extension with exact-revision approval actions; a REST review endpoint alone is not the promised user-friendly workflow. Group catalog, learning and website collections so new schema does not create an undifferentiated sidebar.
- Editors must not have to calculate cryptographic hashes by hand to create a source version. Hash actual content server-side; any stored revision-hash metadata is computed or optional and is never the authority for approval.
- Distinguish provider account registration from sign-in, email verification and passkey registration. Existing wallet auth does not provide a durable account-creation ledger; do not fabricate registration counts from clicks or successful sessions.
- Analytics Engine is sampled and stores data for three months; shorter dashboard filters do not delete underlying data. Use aggregates or controlled storage if shorter retention is required.
- Brand logo SVGs must be genuine source assets with provenance, no guessed paths or generic symbol masquerading as a company logo.
