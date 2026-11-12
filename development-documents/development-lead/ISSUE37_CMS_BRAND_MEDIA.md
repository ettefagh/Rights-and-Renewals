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

## Authentication

Wrangler and the EmDash CLI are authenticated following administrator approval.
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

The integrated showcase suite passed 170 tests. Focused core logo tests passed
4 tests. Worker checks reported no showcase errors/warnings and no app errors
(six existing warnings outside the edited components). Independent source
review found no high-severity issue.

Native authenticated import uploaded 20 ready Media items and published 19
logo-only brand revisions. All 20 policies retained their non-logo data. Gymshark
had an existing non-logo draft (including a cancellation finding), so its policy
link was skipped; its draft identity and content remain intact. Its logo is in
the Media library, ready for editorial selection when that draft is reviewed.
The `--skip-conflicting-drafts` option is explicit; without it conflicts abort.
A repeat apply reused all 20 assets, staged/published zero revisions and moved
the skipped logo into the same **Brand logos** folder.

Production runtime `fa21dbf` deployed as Worker version
`1f30e915-09bb-42c5-8f43-d8cb1a708d8f`. All 19 published logo URLs returned
HTTP 200 with PNG MIME and valid PNG signatures. Unknown and unlinked Gymshark
logo routes returned 404. Admin retained its Cloudflare Access 302 challenge.
Anonymous routes use the supported `getDb` loader runtime, because neither
public locals nor the optional request-context override necessarily contains DB.
The final route correction passed 4 focused tests and showcase check (0/0), and
the production build passed. The wallet was built/deployed from `aba5d5a` at
`https://5cf1123a.rightsandrenewals-app.pages.dev` and its production alias returned
200. Visual browser acceptance remains unverified; HTTP, API and binary checks
do not replace it.
