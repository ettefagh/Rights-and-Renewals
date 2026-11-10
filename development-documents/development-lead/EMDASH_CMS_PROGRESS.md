# EmDash Policy CMS Progress

## Current status

- Current milestone: M4 — final independent review.
- Overall status: local implementation is complete; production initialization and publication are blocked by unresolved source lineage and Cloudflare access.
- Tracking issue: [#35](https://github.com/ettefagh/CM-LAB/issues/35).
- Worktree: `codex/issue-35-emdash-policy-cms`, based on `origin/main` `bb92ebd534ff19eb1fed9297b1474c1ac5c1a3e7`.
- Last updated: 2026-11-10 (Europe/Berlin).

## Implemented

- Upgraded the showcase to Astro 6.4.8, Cloudflare adapter 13.7.0, current Svelte/React adapters and Wrangler 4.159.0 to satisfy EmDash 1.4 and retain Pages support. The selected Wrangler and Workers runtime packages pass the workspace's 24-hour package-age policy.
- Replaced the fake static EmDash desk with a redirect to the authenticated EmDash admin. Removed the unprotected reset route and fail-open platform shims.
- Added a typed `brand_policies` seed schema and 20 starter records sourced from the existing canonical policy catalog. Offline wallet data remains local.
- Added an EmDash-backed published policy projection for the API, wiki and MCP. Public API/MCP reads suppress editor preview context; the detail page supports EmDash’s authenticated preview with a visible notice and `private, no-store` response.
- Added an authenticated, dry-run-first importer. It checks the model and scheduling capability, preserves existing published entries, stops on non-published canonical slug conflicts, and verifies the complete published catalog after apply.
- Added defensive projection checks for malformed records, email addresses and dates; one malformed entry is skipped without disabling other records. MCP validates inputs before reading CMS data and reports ambiguous aliases.
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
| Diff whitespace | Passed | `git diff --check` |
| Astro language diagnostics | Not run | `astro check` prompted for `@astrojs/check`, which is not installed; no dependency was added |

The successful build emitted non-fatal upstream Zod comment warnings and a bundle-size warning for a chunk over 500 kB. The first build attempt failed during static rendering of `/agent-setup`; that route is now server-rendered and the final build passed.

## Production release gates

- `wrangler pages deployment list --project-name rightsandrenewals` reports Production branch `main` at source `f3530afe9e8f3b1676e61771a4cc934da2f0bbf5`. Open PR #34 still has this head; it is not an ancestor of current `origin/main` `bb92ebd534ff19eb1fed9297b1474c1ac5c1a3e7`.
- A prior read-only D1 audit found only `_cf_KV` and no EmDash tables. The current `wrangler d1 execute rightsandrenewals-db --remote` read failed with Cloudflare error 7403 (account is not authorized), so the live schema could not be reconfirmed.
- The EmDash admin route redirects to login, and this session has no confirmed production editor identity. No production D1 write, seed, import, deploy, or publication was performed.
- The seed is first-setup metadata, not a production migration. The importer requires the collection to exist and refuses to overwrite non-published records.
- Preview bindings are not isolated in the checked-in Wrangler config.

## Next actions

1. Complete independent read-only review against the committed implementation SHA and resolve any material findings.
2. Push the issue branch and open a PR after exact-SHA review.
3. Reconcile the open PR #34 production lineage with current `main` before choosing a release SHA.
4. Restore Cloudflare D1 authorization and establish the authorized EmDash admin identity; inspect the live schema before running the importer.
5. Deploy only after those prerequisites, then verify admin access, published API/wiki/MCP behavior, and exact deployed SHA.
