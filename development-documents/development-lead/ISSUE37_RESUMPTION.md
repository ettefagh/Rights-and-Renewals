# Issue 37 development resumption

User instruction: continue development after the published UI-only checkpoint.
Starting revision: `2616b9f70479d63d44969e9821c60e48693b605e`.
Workspace: `emdash-editorial-platform/CM-LAB`, existing issue37 branch, initially clean.

## Current milestone

Repair the interrupted backend, make the assessment and proposal review workflows
usable, and verify the actual installed EmDash integration. Preserve the restored
wallet Wiki, quizzes, calendar and logos. No agent connection or credential issuance
is included. No production deploy or remote database mutation is included.

## Findings driving the changes

- Missing React declarations and mismatched JSX configuration caused admin checks
  to fail. The assessment selection also needed stale-response protection.
- Manually supplied revision hashes prevented ordinary source publication. Approval
  must instead bind to hashes calculated from the actual source content.
- The configured native plugin omitted its before-save hook and write capability.
  EmDash save hooks return replacement content; policy-style cancellation objects
  cannot veto a save. A throwing hook with abort error policy is required.
- Native versioned reads require the installed runtime's content capability wiring;
  a mocked `getVersioned` context alone does not prove availability.
- Proposal persistence used the wrong context storage path; private queue queries
  also filtered a field that was missing from the declared indexes.
- Shared proposal listing needed explicit host-bound reviewer authorization.
- The content REST response does not hydrate assessment reference labels. Review
  should display the source snapshots used by the protected approval route.
- Telemetry referenced optional resources absent from generated binding types.
  A runtime adapter now validates optional resources without inventing declarations.

## Ownership and review

Luna proposal worker owns proposal service/native adapter and queue screen.
Luna admin worker repaired the assessment screen and independently reviews proposal
and telemetry boundaries, including a temporary SQLite runtime test. Luna domain
worker repairs source hashes and native publication guards. Root integrates shared
configuration, dependencies, review-source display, documentation and verification.

## Verification

- Full showcase suite: 24 files, 110 tests passed, including actual native EmDash
  runtime/route dispatch and temporary SQLite proposal persistence. Concurrent
  retries create one queue record; reused keys with different payloads conflict;
  owner lists are isolated; contributor reviewer access returns 403, anonymous
  access returns 401, and Editor/Admin reviewer access succeeds.
- Showcase check: zero errors and zero warnings.
- The installed native hook pipeline executes the aborting save guard: draft edits
  pass and published/formerly published version edits throw. The graph descriptor
  regression checks the needed capability/hook declarations.
- Independent cross-review found no remaining blocker in the repaired graph,
  private queue, source snapshot display or telemetry adapter. The graph plugin's
  elevated server capability and audit-attempt semantics are documented.
- Final integrated showcase build passed. Remaining warnings are upstream Zod
  annotation cleanup and large client chunks. Browser verification is unavailable
  because browser access is disabled in Work settings. No visual acceptance claim
  is made. Runtime source files stayed unchanged during the final build; a later
  wording-only change to the standalone readiness script passed its two tests.

## Remaining features and release work

1. Populate the reviewed provider/service/plan/offer catalog, versioned legal rules,
   evidence and assessments. No real provider plan terms or violations are invented
   by the starter seed.
2. Link wallet subscription records to precise catalog plans/offers and show
   reviewed missing-policy findings in the in-app subscription UI. The public plan
   resolver/page does not complete this personal wallet integration.
3. Extend CMS editing to remaining hardcoded website sections and verify draft,
   publish, withdrawal and discovery behavior end to end on isolated bindings.
4. Add proposal resolution/archive actions and track manually applied suggestions.
   The current queue is intentionally read-only.
5. Verify deployed private storage and native MCP/OAuth/Access routing, then prepare
   scoped credentials and revocation. Actual agent connection verification remains
   deferred by user instruction; no credentials have been issued.
6. Finish consent/event wiring, configure isolated Cloudflare analytics resources and
   build editorial reports. Collection remains disabled and has no fingerprinting.
7. Connect an authoritative account-creation ledger for registration reporting;
   successful sign-ins and clicks must not be counted as registrations.
8. Replace five monogram brand fallbacks if trustworthy licensed logos are available.
9. Complete an isolated backend preview, real D1 approval/publication lifecycle and
   browser/editor acceptance before production release. Native SQLite and mocked
   graph tests do not prove Cloudflare D1 or authenticated browser behavior.

The existing published app preview is still commit `373b937`; it does not contain
these backend changes. The full platform remains a draft release; production and
remote databases are unchanged by this milestone.
