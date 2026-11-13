# Issue 37 agent and measurement operations

Status: development resumed from the draft checkpoint. Local infrastructure and negative tests are being integrated; deployed interoperability remains unverified. No credentials were issued, no external agent was connected, no Access configuration changed, and no telemetry data was written.

## Editorial proposal boundary

The native EmDash factory is `apps/showcase/src/lib/editorial-proposals-plugin.ts:createPlugin`, registered in `astro.config.mjs`. It exposes only `propose_draft` under contract `1.0.0`. EmDash's MCP dispatcher requires the plugin-specific token scope `mcp:tools:cmlab-editorial-proposals`; the route also requires host RBAC `content:create` permission and enforces `Contributor` role. Plugin capabilities are `hooks.content-policy:register` and `content:read`: content reads validate revision-suggestion targets. These server plugin capabilities are separate from caller token grants; no broad write, schema, settings, publish or transfer grant is issued to an agent.

The active queue uses the plugin's private `storage.proposals`, rather than a publicly readable CMS collection. `EDITORIAL_PROPOSALS_COLLECTION` and its additive helper remain legacy scaffolding and are not required for this queue. Inputs are strict and bounded, exclude caller-supplied ownership/status/approval fields, and allow pages, posts, assessments, law guides, glossary, quizzes and quiz questions. Revision suggestions require a target and expected revision. The adapter checks the target snapshot and atomically creates an owner-bound proposal using a caller-specific idempotency key; it never modifies the target entry or publishes content.

### Adapter prerequisite

The native adapter reads `ctx.storage.proposals`, not a top-level storage collection, and preserves host-bound identity in `ownerId`. It avoids `ctx.content.create`, whose installed API does not accept an author identity. These records are proposed drafts for human consideration; they are not ordinary authored CMS entries. Caller input never determines ownership. Token-only callers without a bound user are rejected. Revision checking is a submission-time snapshot check, not a lock on subsequent target edits; a reviewer must re-read the target before applying a suggestion.

Only the proposing contributor and authenticated Editors/Admins can read the dedicated queue. `listOwnDrafts` is limited to 50; the shared reviewer list is bounded to 100 and checks both native reviewer permission and the host-bound role. The read-only reviewer page at `/_emdash/admin/plugins/cmlab-policy-review-console/proposals` shows up to 50 pending proposals. The proposal service does not provide approve, publish, schedule, edit-existing, or queue-resolution operations. Deployed persistence proof remains pending. Human reviewers must review the underlying target and current revision in the CMS before manually applying a proposal.

### Access, OAuth, tokens, revocation

Passkeys/Passlock authenticate people; they are not machine identities. Do not issue an “Agent Passlock”. Native MCP/OAuth interoperability has not been verified. Existing email Access policy covers `/_emdash/*`, including native EmDash routes; no broad anonymous exception or Access change is authorized. Before a future connection, document a narrowly scoped OAuth resource/route policy for only the intended MCP endpoint, verify that it does not bypass human admin protections, and validate it with the real host configuration.

When authorized later, create a distinct Contributor principal/token with only `mcp:tools:cmlab-editorial-proposals`. Reject tokens carrying `content:write`, `content:publish`, `schema:write`, or `plugins:manage`. Store the credential only in the approved secret manager, never in this repository. Rotation: provision a replacement, verify its narrow scope and intended host route, then revoke the old token and read back its revoked state. Incident response: revoke through EmDash's native token/client management, verify denial, and review the CMS audit history. Homemade auth, token storage, and homemade revocation are out of scope.

Run `node apps/showcase/scripts/agent-readiness.mjs` to print local readiness and deferred prerequisites. It explicitly reports that connection verification and credential issuance are false. It does not contact EmDash, OAuth, Access, or a remote agent.

## Public measurement

`POST /api/events` is off unless `PUBLIC_EVENTS_ENABLED=true`. When enabled it requires `application/json`, an exact allowlisted `Origin`, explicit `consent: true`, a body at most 4 KiB, a valid event name, and IDs/revisions present in bounded controlled published registries (at most 500 values per category). Current event names are `page_view`, `block_view`, `cta_click`, `policy_open`, and `plan_select`. No account, email, raw search text, URL, visitor ID, IP/UA hash, device signature, receipt, or personal subscription data is accepted. The API does not log request metadata or event bodies. It writes only controlled dimensions to the `ANALYTICS` binding, never event payloads to CMS D1. The environment adapter validates optional bindings at runtime and preserves native method receivers; it does not declare unconfigured resources in generated Cloudflare types.

The `<TelemetryConsent />` component is opt-in and separate from authentication. `src/scripts/telemetry.ts` emits only after consent is saved, omits credentials, and suppresses collection in editor/preview contexts. Removing consent stops future sends; it does not create a visitor or revocation identifier. The website integration owner must include the component on public pages and dispatch `cmlab:telemetry` events using stable CMS page/block/CTA IDs and active content revisions. No event should be wired to login, registration clicks, PIN results, or sign-in results.

When enabled, both `ANALYTICS` and `PUBLIC_EVENTS_RATE_LIMITER` are mandatory. A missing binding or rate-limit error fails closed with 503. The global non-identifying limiter key avoids using IP or visitor data. Cloudflare's rate limit binding is approximate and local to each edge location, so this is an abuse-control guard, not a strict global quota. Use a separate unique integer namespace for this binding.

Analytics Engine samples data and retains it for three months. Queries must weight counts with `SUM(_sample_interval)` and report approximate event totals; they must never claim unique users. Do not claim shorter raw-event retention based on a shorter report window. If shorter retention becomes necessary, aggregate before ingestion into a controlled store with enforceable deletion. Cloudflare Web Analytics provides page/performance metrics but does not replace this custom first-party event contract.

`node apps/showcase/scripts/query-editorial-analytics.mjs <events-by-name|events-by-day|cta-clicks|registrations> [from YYYY-MM-DD] [through YYYY-MM-DD]` runs one of three fixed aggregate SQL queries. It accepts no SQL argument. `registrations` reports `not_configured` locally and makes no network request. Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_READ_TOKEN`, and optionally `EDITORIAL_ANALYTICS_DATASET` only in the operator environment. The token needs Account Analytics Read; never put it in deployment config, source, or command-line arguments.

## Registration reporting

The wallet's current auth flow does not persist an authoritative account-creation event. `telemetry-registration-ledger.ts` defines a server-only durable adapter contract with idempotency by source event ID and daily aggregates. It is intentionally not connected. Until a verified account-creation source is available, report `not_configured`; never infer registrations from register-button clicks, verified PINs, successful sign-ins, or Analytics Engine event counts. Registration facts stay outside sampled Analytics Engine, and the adapter has no token/passkey fields.

## Configuration and verification

`config/editorial-agent/readiness.example.json` and `config/analytics/wrangler.bindings.example.jsonc` are examples only. Root must wire plugin registration, the additive collection, registry source, public consent include, Analytics Engine binding, rate-limit binding, allowed origins, and IDs. Keep event collection disabled until those items are reviewed. Do not apply the example to the active Wrangler configuration without an explicit integration step.

Local negative tests cover role/ownership guards, field injection, revision conflicts, atomic retry delegation, disabled telemetry, missing bindings, PII/unknown event rejection, fake IDs, body limits, origin/content type, consent, and rate limiting. These tests do not prove the actual native OAuth/Access route, Cloudflare bindings, remote dataset, or editor review queue.
