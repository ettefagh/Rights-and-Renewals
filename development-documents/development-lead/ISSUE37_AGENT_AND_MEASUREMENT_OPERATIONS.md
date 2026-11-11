# Issue 37 agent and measurement operations

Status: local contracts and negative tests only. No credentials were issued, no external agent was connected, no Access configuration changed, and no telemetry data was written.

## Editorial proposal boundary

The native EmDash factory is `apps/showcase/src/lib/editorial-proposals-plugin.ts:createPlugin`. It exposes only `propose_draft` under contract `1.0.0`. EmDash's MCP dispatcher requires the plugin-specific token scope `mcp:tools:cmlab-editorial-proposals`; the route also requires the host RBAC `content:create` permission and enforces `Contributor` role before calling its adapter. The plugin declares only `hooks.content-policy:register`; it does not receive broad content, schema, settings, plugin-admin, publish, schedule, or transfer capabilities. The publish and schedule hooks cancel those actions for `editorial_proposals`.

The additive schema is exported as `EDITORIAL_PROPOSALS_COLLECTION` from `editorial-proposals.ts`; `addEditorialProposalsCollection(seed)` preserves existing seed entries and avoids duplicates. Root integration must add it to the seed/schema and register the plugin. Proposal inputs are strict, bounded, exclude author/owner/actor/status/approval/publication fields, and restrict targets to `pages` and `posts`. Revision suggestions require a target and expected revision. The host adapter must enforce target revision/lock conflicts, atomically deduplicate retries by idempotency key, create only draft content, and use the authenticated EmDash actor as `authorId`.

### Adapter prerequisite

The installed EmDash 1.4 plugin `ctx.content.create(collection, data, options)` API does not accept an actor or `authorId`; its plugin content callback forwards collection data and locale/translation options only. Therefore this implementation deliberately fails with `host_adapter_unavailable` when no trusted adapter is supplied. Do not wire caller data into `authorId`, use custom credentials, or represent an unowned row as an owned proposal. Root integration needs a host-owned adapter around an EmDash write API that can bind the authenticated actor and perform atomic idempotency/revision checks. The plugin route exposes the trusted host `user`; token-only callers without a bound user are rejected.

Only the proposing contributor and authorized CMS reviewers should be able to read the dedicated queue. `listOwnDrafts` is limited to 50. The proposal service does not provide approve, publish, schedule, or edit-existing operations. Human reviewers must review the underlying target and current revision in the CMS before manually applying an approved proposal.

### Access, OAuth, tokens, revocation

Passkeys/Passlock authenticate people; they are not machine identities. Do not issue an “Agent Passlock”. Native MCP/OAuth interoperability has not been verified. Existing email Access policy covers `/_emdash/*`, including native EmDash routes; no broad anonymous exception or Access change is authorized. Before a future connection, document a narrowly scoped OAuth resource/route policy for only the intended MCP endpoint, verify that it does not bypass human admin protections, and validate it with the real host configuration.

When authorized later, create a distinct Contributor principal/token with only `mcp:tools:cmlab-editorial-proposals`. Reject tokens carrying `content:write`, `content:publish`, `schema:write`, or `plugins:manage`. Store the credential only in the approved secret manager, never in this repository. Rotation: provision a replacement, verify its narrow scope and intended host route, then revoke the old token and read back its revoked state. Incident response: revoke through EmDash's native token/client management, verify denial, and review the CMS audit history. Homemade auth, token storage, and homemade revocation are out of scope.

Run `node apps/showcase/scripts/agent-readiness.mjs` to print local readiness and deferred prerequisites. It explicitly reports that connection verification and credential issuance are false. It does not contact EmDash, OAuth, Access, or a remote agent.

## Public measurement

`POST /api/events` is off unless `PUBLIC_EVENTS_ENABLED=true`. When enabled it requires `application/json`, an exact allowlisted `Origin`, explicit `consent: true`, a body at most 4 KiB, a valid event name, and IDs/revisions present in bounded controlled published registries (at most 500 values per category). `page_view`, `block_view`, `cta_click`, and `wiki_search` are the current event names. No account, email, raw search text, URL, visitor ID, IP/UA hash, device signature, receipt, or personal subscription data is accepted. The API does not log request metadata or event bodies. It writes only the allowlisted event and controlled ID dimensions to the `ANALYTICS` Analytics Engine binding; it never writes event payloads to CMS D1.

The `<TelemetryConsent />` component is opt-in and separate from authentication. `src/scripts/telemetry.ts` emits only after consent is saved, omits credentials, and suppresses collection in editor/preview contexts. Removing consent stops future sends; it does not create a visitor or revocation identifier. The website integration owner must include the component on public pages and dispatch `cmlab:telemetry` events using stable CMS page/block/CTA IDs and active content revisions. No event should be wired to login, registration clicks, PIN results, or sign-in results.

When enabled, both `ANALYTICS` and `PUBLIC_EVENTS_RATE_LIMITER` are mandatory. A missing binding or rate-limit error fails closed with 503. The global non-identifying limiter key avoids using IP or visitor data. Cloudflare's rate limit binding is approximate and local to each edge location, so this is an abuse-control guard, not a strict global quota. Use a separate unique integer namespace for this binding.

Analytics Engine samples data and retains it for three months. Queries must weight counts with `SUM(_sample_interval)` and report approximate event totals; they must never claim unique users. Do not claim shorter raw-event retention based on a shorter report window. If shorter retention becomes necessary, aggregate before ingestion into a controlled store with enforceable deletion. Cloudflare Web Analytics provides page/performance metrics but does not replace this custom first-party event contract.

`node apps/showcase/scripts/query-editorial-analytics.mjs <events-by-name|events-by-day|cta-clicks|registrations> [from YYYY-MM-DD] [through YYYY-MM-DD]` runs one of three fixed aggregate SQL queries. It accepts no SQL argument. `registrations` reports `not_configured` locally and makes no network request. Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_READ_TOKEN`, and optionally `EDITORIAL_ANALYTICS_DATASET` only in the operator environment. The token needs Account Analytics Read; never put it in deployment config, source, or command-line arguments.

## Registration reporting

The wallet's current auth flow does not persist an authoritative account-creation event. `telemetry-registration-ledger.ts` defines a server-only durable adapter contract with idempotency by source event ID and daily aggregates. It is intentionally not connected. Until a verified account-creation source is available, report `not_configured`; never infer registrations from register-button clicks, verified PINs, successful sign-ins, or Analytics Engine event counts. Registration facts stay outside sampled Analytics Engine, and the adapter has no token/passkey fields.

## Configuration and verification

`config/editorial-agent/readiness.example.json` and `config/analytics/wrangler.bindings.example.jsonc` are examples only. Root must wire plugin registration, the additive collection, registry source, public consent include, Analytics Engine binding, rate-limit binding, allowed origins, and IDs. Keep event collection disabled until those items are reviewed. Do not apply the example to the active Wrangler configuration without an explicit integration step.

Local negative tests cover role/ownership guards, field injection, revision conflicts, atomic retry delegation, disabled telemetry, missing bindings, PII/unknown event rejection, fake IDs, body limits, origin/content type, consent, and rate limiting. These tests do not prove the actual native OAuth/Access route, Cloudflare bindings, remote dataset, or editor review queue.
