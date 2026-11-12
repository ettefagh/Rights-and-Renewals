# CMS ownership of brand logos

Requested 12 November 2026: move the 20 deployed brand identities into native
EmDash Media and let editors replace the logo on each Brand Policy record.
Static files alone did not satisfy CMS management.

## Delivery and ownership

- Runtime worker: optional native `logo` image value on Brand Policies; published
  policy API exposes a safe logo URL; website and wallet prefer it and retain the
  existing static fallback.
- Import worker: native authenticated Media upload and optional schema field,
  idempotent dry-run/apply workflow, source attribution and logo-only updates.
- Orchestrator: authentication, integration, independent review, remote import,
  preview/production verification and evidence report.

## Acceptance

1. All 20 logos appear as genuine EmDash Media records backed by existing R2.
2. Existing brand records reference those media items through an editable native
   image field. Existing policy content and unrelated drafts remain intact.
3. Published API, Wiki and wallet use CMS logo references. Private/draft logos
   are not exposed by reading draft content in public loaders.
4. Repeating the importer does not duplicate assets or replace editor choices.
5. Source attribution remains available. Raster derivatives do not weaken the
   native SVG upload restrictions.
6. Tests and exact deployed source are reported separately from remote import
   evidence. An authentication blocker is not called completion.

## Current external dependency

Wrangler is authenticated, but the EmDash CLI has no administrator session.
The protected CMS API requires both existing Cloudflare Access and native EmDash
authorization. Use their normal sign-in flows; do not bypass either control or
write fabricated Media rows directly into D1.

## Operator workflow

From `apps/showcase`, complete `pnpm exec emdash login --url <site-origin>`.
For the current path-protected Cloudflare Access setup, sign in using
`cloudflared access login <site-origin>/_emdash/admin/` first. Supply its cached
assertion privately through `EMDASH_HEADERS` if the CLI cannot discover the
path-specific Access application. Never paste tokens into chat or commit them.

Set `EMDASH_URL` to the site origin. Run `pnpm emdash:import-brand-logos` for a
read-only plan. `--apply` adds the missing optional image field, uploads into
the native **Brand logos** folder and stages logo references. Add
`--publish-logo-only` only to publish revisions proven to contain no unrelated
changes. Each publish includes the native revision precondition. Existing
conflicting logos or unrelated drafts stop the import.

Editors subsequently open **Brand Policies**, select a record and change its
**Brand logo** image field using the Media picker, then publish their revision.
The website and wallet consume `/api/brand-policy-logos/<slug>`; the route only
serves ready raster media referenced by a published brand record. Existing
Cloudflare protection on the administrator and native media API stays intact.

## Implementation verification

The integrated showcase suite passed 169 tests. Focused core logo tests passed
4 tests. Worker checks reported no showcase errors/warnings and no app errors
(six existing warnings outside the edited components). Independent source
review found no high-severity issue. Remote import and deployed logo-stream
evidence remain pending native EmDash device authorization.
