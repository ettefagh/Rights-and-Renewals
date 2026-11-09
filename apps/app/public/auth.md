# Rights & Renewals Agent Registration (auth.md)

Welcome to the **CM-LAB Sovereign Consumer Wallet & Cancellation App** AI agent registration and authentication interface. This document guides autonomous agents, browser-based WebMCP tools, and decentralized agent workflows interacting with the sovereign wallet application.

---

## 1. Audience & Sovereign Architecture

The CM-LAB Sovereign App (`https://rightsandrenewals-app.pages.dev`) is an offline-first, client-encrypted consumer rights application designed to empower users with local-first vault storage (Dexie.js), automated cancellation notices, and calendar subscription feeds:
- **Client-Side In-Browser Agents (WebMCP)**: Tools interacting with the local wallet via `document.modelContext.registerTool()`.
- **Decentralized Synchronization Agents**: Agents assisting users with encrypted vault backup, reminder scheduling, and contract lifecycle defense.
- **Automated Notice Dispatchers**: Autonomous agents executing termination letters upon user authorization.

---

## 2. Discovery Resources & Identity Federation

Agents can discover all endpoint definitions, server cards, and security policies via standard well-known URIs:

| Protocol / Standard | Endpoint URI | Description |
|:---|:---|:---|
| **RFC 9727 API Catalog** | `/.well-known/api-catalog` | Machine-readable linkset of all API endpoints and schemas |
| **RFC 9728 OAuth PRM** | `/.well-known/oauth-protected-resource` | Protected resource metadata, auth servers, and scopes |
| **RFC 8414 OAuth AS** | `/.well-known/oauth-authorization-server` | Authorization server metadata and token issuance |
| **SEP-1649 MCP Server Card** | `/.well-known/mcp/server-card.json` | Model Context Protocol server capabilities and transport |
| **Agent Skills Index** | `/.well-known/agent-skills/index.json` | Cloudflare Agent Skills discovery index and SHA-256 digests |
| **ARD Manifest** | `/.well-known/ai-catalog.json` | Agentic Resource Discovery capability catalog |
| **DNS-AID Records** | `_agents.rightsandrenewals-app.pages.dev` | RFC 9460 SVCB/HTTPS discovery records with DNSSEC |

---

## 3. Supported Authentication Methods

### Method 1: Anonymous Read-Only Access (Tier 0)
Public statutory calculator queries and static legal knowledge-base lookups require no authentication token:
```http
GET /api/health HTTP/1.1
Host: rightsandrenewals-app.pages.dev
Accept: application/json
```

### Method 2: HTTP Bearer Token Authentication (RFC 6750)
Interactions with encrypted wallet synchronization, calendar token issuance, or automated contract termination dispatch require an OAuth 2.0 Bearer access token:
```http
GET /api/ical/subscriptions/secret-token-123 HTTP/1.1
Host: rightsandrenewals-app.pages.dev
Authorization: Bearer cmlab_agt_eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/calendar
```

### Method 3: Dynamic Agent Registration (RFC 7591 / WorkOS)
Autonomous agents possessing verified identities may dynamically register to obtain delegated access credentials:
```http
POST /api/agent/register HTTP/1.1
Host: rightsandrenewals-app.pages.dev
Content-Type: application/json

{
  "client_name": "SovereignVaultSyncAgent/1.0",
  "redirect_uris": ["https://agent.example.org/oauth/callback"],
  "grant_types": ["client_credentials", "refresh_token"],
  "scope": "vault:read vault:write wallet:sync cancellation:generate"
}
```

---

## 4. Supported OAuth Scopes

All access tokens must be scoped appropriately. The sovereign app enforces the following permissions:

| Scope Identifier | Classification | Description |
|:---|:---|:---|
| `openid` | Standard | OpenID Connect agent identity assertion |
| `profile` | Standard | Agent profile and developer verification metadata |
| `email` | Standard | Administrative contact for notice confirmations |
| `offline_access` | Standard | Refresh token issuance for background monitoring |
| `vault:read` | Application | Read encrypted subscription and warranty records |
| `vault:write` | Application | Write new subscription contracts and warranty dossiers |
| `wallet:sync` | Application | Synchronize encrypted vault state across sovereign devices |
| `policy:read` | Domain | Access statutory consumer protection laws and wiki |
| `rights:read` | Domain | Query statutory warranty rules and cooling-off terms |
| `rights:search` | Domain | Semantic search across brand cancellation policies |
| `cancellation:generate`| Domain | Generate legally binding cancellation letters and notices |

---

## 5. Error Taxonomy & HTTP Status Codes

When an agent request fails authentication or authorization, the response includes an explicit RFC 6750 `WWW-Authenticate` header:

### HTTP 401 Unauthorized
Occurs when credentials are missing, invalid, or expired.
- **Missing Token**:
  ```http
  HTTP/1.1 401 Unauthorized
  WWW-Authenticate: Bearer realm="rightsandrenewals-app.pages.dev"
  Content-Type: application/json

  {
    "error": "unauthorized",
    "message": "Authorization header with valid Bearer token is required."
  }
  ```
- **Expired or Invalid Token**:
  ```http
  HTTP/1.1 401 Unauthorized
  WWW-Authenticate: Bearer error="invalid_token", error_description="The access token has expired or signature verification failed"
  Content-Type: application/json

  {
    "error": "invalid_token",
    "message": "Access token expired or signature failed verification against JWKS."
  }
  ```

### HTTP 403 Forbidden
Occurs when the token is valid but lacks sufficient privileges or violates policy:
- **Insufficient Scope**:
  ```http
  HTTP/1.1 403 Forbidden
  WWW-Authenticate: Bearer error="insufficient_scope", scope="vault:write"
  Content-Type: application/json

  {
    "error": "insufficient_scope",
    "message": "This operation requires the 'vault:write' scope.",
    "required_scope": "vault:write"
  }
  ```
- **Prohibited Agent Policy**:
  ```http
  HTTP/1.1 403 Forbidden
  Content-Type: application/json

  {
    "error": "agent_forbidden",
    "message": "Agent client blocked by Content-Signal governance or abuse rules."
  }
  ```

---

## 6. Rate Limits & Edge Throttling

To ensure uninterrupted service availability, rate limits are enforced at the Cloudflare edge:

| Tier | Rate Limit | Burst Allowance | Identifier |
|:---|:---|:---|:---|
| **Anonymous Agent** | 100 requests / minute | 10 concurrent | Client IP address |
| **Authenticated Agent** | 1,000 requests / minute | 25 concurrent | OAuth Client ID (`sub`) |
| **Elevated Partner Agent** | 5,000 requests / minute | 50 concurrent | Verified Enterprise Org |

### Rate Limit Response Headers
Every API response emits standard rate limiting metadata:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 991
X-RateLimit-Reset: 1731187200
```

When an agent exceeds rate limits, the server responds with **HTTP 429 Too Many Requests** and a `Retry-After` header:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "error": "too_many_requests",
  "message": "Rate limit exceeded. Please back off and retry after 30 seconds."
}
```

---

## 7. Model Context Protocol (MCP) & WebMCP Integration

Autonomous agents and in-browser assistants interact via dual protocols:
- **Remote MCP Endpoint**: `https://rightsandrenewals-app.pages.dev/api/mcp` (`streamable-http`)
- **MCP Server Card**: `/.well-known/mcp/server-card.json`
- **In-Browser WebMCP**: Registered synchronously on page load via `document.modelContext.registerTool()` for tools including:
  - `vault_quick_capture`: Ingest contract terms and renewal alerts directly from browser context.
  - `statutory_deadline_calc`: Compute exact BGB §438 warranty or cooling-off expiration dates.
  - `cancellation_notice_draft`: Compose legally binding cancellation letters.
