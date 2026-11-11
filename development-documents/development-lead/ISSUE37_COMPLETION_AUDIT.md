# Issue 37 completion audit

The active goal includes implementation, verified content, isolated runtime proof,
and GitHub handoff. None of those states implies the others. Current integrated
changes after `cdfb7d1` are not yet committed or deployed.

| Requirement | Current evidence | Still required |
| --- | --- | --- |
| Wallet exact plan linkage | Optional persisted plan ID, explicit selection and lookup; app build/check and client tests; independent review | Deployed app/backend lookup against real catalog |
| Published policy findings | Shared public graph resolver and reviewed source hashing; no inferred compliance | Real editorial assessments and D1 lifecycle proof |
| Proposal lifecycle | Real SQLite CAS race, audit, pagination and unchanged-target tests | Deployed persistence and browser workflow |
| Editable website | Intro placement implementation underway; original interactive flows preserved | Final worker review, seed/import compatibility, render proof; assess other fixed copy |
| Catalog content | Schema/import and source references exist | Verified real plan/offer/version/rule/evidence content and editorial approval; no invented violations |
| Brand assets | Fifteen local SVGs, five monograms | Provenance-backed replacements or explicit remaining coverage |
| Analytics | Strict consented aggregate contract, default-off ingestion | Event/consent wiring, isolated bindings, report/runtime verification |
| Registration facts | Durable adapter contract; reports not_configured | Actual authoritative account-creation source and idempotent durable adapter |
| Agent infrastructure | Native scoped proposal tool, private ownership/reviewer boundary | Deployed access/OAuth routing and revocation preparation; actual agent connection intentionally deferred |
| Release | Dedicated preview resources created; config selects distinct bindings | Protected bootstrap, final artifact identity, deployment/readback, runtime/browser proof, commit/push/GitHub report |

## Isolated resource identities

Created for this issue only on 11 November 2026 in account
`6d669ac7aeb9e0fe32bd1ece28a1b8ef`:

- Worker target: `rightsandrenewals-showcase-issue37-preview` (not deployed yet).
- D1: `rightsandrenewals-issue37-preview`, ID `f83fe1e8-b766-47d7-af38-5b9e976d4318`.
- R2: `rightsandrenewals-issue37-preview-media`.
- Session KV: `rightsandrenewals-issue37-preview-session`, ID `4b2f2fa54a7a49328f1d8e95fae2cf92`.

`prepare-issue37-preview.mjs` generates the separate Wrangler config, rejecting
production/issue35 IDs. Build with `CMLAB_ISSUE37_PREVIEW=true`. Verify the generated
`dist/server/wrangler.json` rather than assuming deploy flags retarget built output.
The preview sets `CMLAB_PREVIEW_EDITORIAL_LOCK=true`; the Worker denies `/_emdash`
and its children before invoking EmDash, preventing public first-admin takeover.
Do not remove that lock before a protected bootstrap path is available. Current
Wrangler OAuth scope output does not establish Access policy write permission;
no Cloudflare credential environment override was found. No production config or
production database has been changed by these resource operations.

## Latest checks

- Before website slot edits: full showcase suite, 28 files / 129 tests passed.
- Latest showcase check: zero errors / zero warnings.
- Native SQLite content setup emits an unavailable object-cache virtual-module
  warning; lifecycle/CAS tests nevertheless pass. This is not Cloudflare runtime proof.
- Isolated-config build is in progress; no artifact/upload acceptance yet.
- Updated frozen integration suite: 30 files / 140 tests passed, including website
  placements and eight preview-lock cases. Type corrections in the lock test are
  being verified separately. Do not reuse the earlier 129 count as final evidence.
- Browser access was disabled at the last attempted verification. A rendered
  acceptance claim requires a fresh successful browser observation.

## Registration source audit

Current `apps/app/src/pages/api/auth/verify-pin.ts` validates a PIN hash and creates
session/iCal/backup tokens, then returns `verified: true`. It does not create a
durable user/account record or expose a distinct account-created event. The app
Wrangler configuration has no account database binding. Consequently this event
is verification/sign-in evidence, not an authoritative registration count. A real
account lifecycle backend or provider webhook must be selected and integrated
before enabling registration reporting; counting first observed sign-ins would
misstate the requested metric. The existing registration report remains explicitly
`not_configured` rather than emitting a fabricated zero or approximate count.
