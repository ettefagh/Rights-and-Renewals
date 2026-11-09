# Rights & Renewals Agent Registration (auth.md)

Welcome to the **CM-LAB Sovereign Rights & Renewals** AI agent registration and authentication interface. This document guides autonomous agents, MCP clients, and LLM search orchestrators on how to discover, authenticate, and interact with our services.

---

## 1. Audience & Ecosystem Overview

This specification applies to:
- **Autonomous AI Agents & Multi-Agent Swarms**: Automated legal reasoning, contract deadline defense, and consumer rights enforcement.
- **Model Context Protocol (MCP) Clients**: Direct invocation of rights search, claim dossier compilation, and statutory calculators.
- **Search Retrieval & AI Crawlers**: Authorized indexers retrieving verified cancellation policies and statutory references.

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
| **DNS-AID Records** | `_agents.rightsandrenewals.pages.dev` | RFC 9460 SVCB/HTTPS discovery records with DNSSEC |

---

## 3. Supported Authentication Methods

### Method 1: Anonymous Read-Only Access (Tier 0)
Public consumer rights queries, statutory period calculations (BGB, CRA, UCC), and brand policy lookups require no authentication token:
```http
GET /api/v1/rights?q=gym&jur=DE HTTP/1.1
Host: rightsandrenewals.pages.dev
Accept: application/json
```

### Method 2: HTTP Bearer Token Authentication (RFC 6750)
Protected operations (e.g. customized dossier generation, batch rights export, private policy sync) require an OAuth 2.0 Bearer access token transmitted in the `Authorization` request header:
```http
POST /api/mcp HTTP/1.1
Host: rightsandrenewals.pages.dev
Authorization: Bearer cmlab_agt_eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "claim_dossier_generate",
    "arguments": {
      "contract_id": "sub_4412",
      "legal_basis": "BGB_314"
    }
  }
}
```

### Method 3: Dynamic Agent Registration (RFC 7591 / WorkOS)
Autonomous agents possessing verified identities (e.g. ID-JAG assertion, public key binding, or WorkOS identity) may dynamically register to obtain client credentials:
```http
POST /api/agent/register HTTP/1.1
Host: rightsandrenewals.pages.dev
Content-Type: application/json

{
  "client_name": "AutonomousConsumerAdvocateBot/1.0",
  "redirect_uris": ["https://agent.example.org/oauth/callback"],
  "grant_types": ["client_credentials", "urn:ietf:params:oauth:grant-type:token-exchange"],
  "scope": "policy:read rights:read cancellation:generate"
}
```

---

## 4. Supported OAuth Scopes

All access tokens must be scoped appropriately. Requested scopes are validated on every request:

| Scope Identifier | Classification | Description |
|:---|:---|:---|
| `openid` | Standard | OpenID Connect agent identity assertion |
| `profile` | Standard | Agent profile and developer verification metadata |
| `email` | Standard | Administrative contact for notice confirmations |
| `offline_access` | Standard | Refresh token issuance for long-running workflows |
| `vault:read` | Application | Read encrypted subscription and warranty records |
| `vault:write` | Application | Write new subscription contracts and warranty dossiers |
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
  WWW-Authenticate: Bearer realm="rightsandrenewals.pages.dev"
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
  WWW-Authenticate: Bearer error="insufficient_scope", scope="cancellation:generate"
  Content-Type: application/json

  {
    "error": "insufficient_scope",
    "message": "This operation requires the 'cancellation:generate' scope.",
    "required_scope": "cancellation:generate"
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
X-RateLimit-Remaining: 987
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

## 7. Model Context Protocol (MCP) Integration

Autonomous agents utilizing the Model Context Protocol should connect to our server endpoint:
- **Transport Endpoint**: `https://rightsandrenewals.pages.dev/api/mcp`
- **Transport Type**: `streamable-http` (JSON-RPC 2.0) and Server-Sent Events (`/sse`)
- **Server Card**: `/.well-known/mcp/server-card.json`
- **Primary Tools**:
  - `policy_lookup`: Query statutory rules and brand terms.
  - `claim_dossier_generate`: Assemble consumer dispute evidence packs.
  - `statutory_law_lookup`: Fetch verbatim legal text across BGB, EU directives, and US UCC.
