# EmDash Policy CMS Progress

## Current status

- Current milestone: reconcile the deployed source and prepare a commit for independent review.
- Overall status: the showcase builds as a Worker. Preview isolation, the production hostname, Access allowlist, and authenticated setup still need verification.
- Tracking issue: [#35](https://github.com/ettefagh/CM-LAB/issues/35).
- Worktree: `codex/issue-35-emdash-policy-cms`, based on `origin/main` `bb92ebd534ff19eb1fed9297b1474c1ac5c1a3e7`.
- Last updated: 2026-11-10 (Europe/Berlin).

## Implemented

- Upgraded the showcase to Astro 6.4.8, Cloudflare adapter 13.7.0, current Svelte/React adapters and Wrangler 4.159.0. The showcase now targets Workers through the EmDash Worker entrypoint. The wallet remains a separate Pages application.
- Replaced the fake static EmDash desk with a redirect to the authenticated EmDash admin. Removed the unprotected reset route and fail-open platform shims.
- Added a typed `brand_policies` seed schema and 20 starter records sourced from the existing canonical policy catalog. Offline wallet data remains local.
- Added an EmDash-backed published policy projection for the API, wiki and the three public read-only MCP tools. Public reads suppress editor preview context; the detail page supports EmDash’s authenticated preview with a visible notice and `private, no-store` response.
- Added an authenticated, dry-run-first importer. It checks the model, unexpected required fields, and scheduling capability; preserves existing published entries; stops on non-published canonical slug conflicts; and verifies the complete published catalog after apply.
- Added defensive projection checks for malformed records, email addresses and dates; one malformed entry is skipped without disabling other records. MCP validates inputs before reading CMS data, reports ambiguous aliases, and exposes only policy, statutory-law, and subscription-rule lookups. Claim-generation and tax tools remain unavailable on the public server due to defects previously found in sample review.
- Removed mutable process-local policy writes; CMS read failures do not fall back to seed data online.
- Updated the issue acceptance criteria to match the installed EmDash 1.4 capability set and preview behavior.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Seed generation and EmDash seed validation | Passed | `pnpm --dir apps/showcase emdash:sync-policy-seed`; generated 20 policy records |
| Frozen dependency install and package-age policy | Passed | `pnpm install --frozen-lockfile`; lockfile passed policy verification |
| TypeScript | Passed | `pnpm --dir apps/showcase exec tsc --noEmit --pretty false` |
| Showcase check | Passed | `pnpm --dir apps/showcase check`; 0 errors and 0 warnings |
| Astro/Cloudflare production build | Passed | `pnpm --dir apps/showcase build`; server output completed with adapter 13 |
| Script syntax | Passed | `node --check` for the three policy catalog/import scripts |
| Public MCP boundary | Updated | `tools/list` and `tools/call` expose only three read-only tools; CMS policy lookup uses published EmDash records |
| Diff whitespace | Passed | `git diff --check` |
| Astro language diagnostics | Not run | `astro check` prompted for `@astrojs/check`, which is not installed; no dependency was added |

The successful build emitted non-fatal upstream Zod comment warnings and a bundle-size warning for a chunk over 500 kB. The first build attempt failed during static rendering of `/agent-setup`; that route is now server-rendered and the final build passed.

## Production release gates

- `wrangler pages deployment list --project-name rightsandrenewals` previously reported production source `f3530afe9e8f3b1676e61771a4cc934da2f0bbf5`, the head of open PR #34. The release candidate must preserve the deployed wallet, showcase, machine views, and setup guides alongside the new policy source. Machine-readable wiki routes must read published CMS records too.
- Latest read-only `wrangler d1 execute rightsandrenewals-db --remote` succeeded and listed only `_cf_KV`; there are no EmDash tables. A previous read failed with error 7403, but the later successful query confirms D1 is reachable and uninitialized for EmDash.
- EmDash 1.4 requires Astro 6+, and the Astro Cloudflare adapter needed for Astro 6 no longer supports Pages. The successful Astro build verifies bundle compilation, not compatibility with the current Pages deployment target.
- The EmDash admin route redirects to login, and this session has no confirmed production editor identity. No production D1 write, seed, import, deploy, or publication was performed.
- The seed is first-setup metadata, not a production migration. The importer requires the collection to exist and refuses to overwrite non-published records.
- Preview bindings are not isolated in the checked-in Wrangler config.

## Next actions

1. Finish integrating the deployed PR #34 source and check the combined wallet and showcase build.
2. Complete independent review of the resulting commit and open a draft PR for issue #35.
3. Confirm the public hostname and initial administrator. Set `EMDASH_SITE_URL` to the selected origin and protect `/_emdash/*` with Cloudflare Access before opening the setup route.
4. Verify setup, import, draft visibility, publish and unpublish, and persistence on an Access-protected preview with separate D1, R2 and KV resources.
5. Verify the intended production bindings, deploy the reviewed SHA, bootstrap the authorized editor, and record the deployment and runtime evidence.
