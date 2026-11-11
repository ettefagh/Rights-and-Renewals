# Rights & Renewals Wallet API

This guide covers the HTTP routes hosted by the wallet Pages app at `https://rightsandrenewals-app.pages.dev`.

## Service boundary

The wallet does not host a remote MCP server or an OAuth authorization server. It has no `/api/mcp`, `/api/health`, OAuth authorize/token/JWKS, or dynamic client-registration route. Remote policy MCP discovery and policy agent skills are provided by the separate showcase service; use that service's own discovery documents to find its current endpoint.

The wallet's receipt and contract vault is browser-local. These HTTP routes do not provide remote vault read or write access.

## Wallet sign-in routes

| Method | Path | Purpose |
|:--|:--|:--|
| `POST` | `/api/auth/request-pin` | Starts the wallet PIN challenge flow. The response contains a challenge `hash` and `expiresAt`. |
| `POST` | `/api/auth/verify-pin` | Verifies the email, PIN, challenge hash, and expiry. A successful response sets the wallet's HttpOnly session cookie and returns the wallet's calendar token and backup base secret. |

These routes support the wallet UI's PIN flow. They are not OAuth or third-party agent registration endpoints.

## Calendar feeds

The public demo feeds are:

| Method | Path | Content |
|:--|:--|:--|
| `GET` | `/api/calendar/subscriptions.ics` | iCalendar subscription feed with sample entries. |
| `GET` | `/api/calendar/warranties.ics` | iCalendar warranty feed with sample entries. |

Tokenized calendar paths are also available:

| Method | Path | Content |
|:--|:--|:--|
| `GET` | `/api/ical/subscriptions/{token}` | iCalendar subscription feed. |
| `GET` | `/api/ical/warranties/{token}` | iCalendar warranty feed. |

The current handlers return sample calendar entries; they do not export private records from a browser's local vault.

## Browser-local WebMCP

When a browser supports `navigator.modelContext` or `document.modelContext`, the wallet registers local demo tools named `vault_lookup` and `notice_generate`. They do not call a remote MCP endpoint or read the wallet's local records; `vault_lookup` returns an empty result and `notice_generate` returns a template descriptor with the supplied parameters.

## API catalog

The wallet's route list is available at [`/.well-known/api-catalog`](https://rightsandrenewals-app.pages.dev/.well-known/api-catalog).
