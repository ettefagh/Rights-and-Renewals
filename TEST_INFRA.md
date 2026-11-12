# Test Infrastructure & Verification Architecture (`TEST_INFRA.md`)

**Document Version:** `2.0.0-PROD`  
**Author:** `teamwork_test_writer_agentready` (Lead E2E Test Writer)  
**Academic Module:** *Computer & Media Lab* (SRH Hochschule Heidelberg / Berlin, WiSe 2026)  
**Project:** *Warranty, Subscription & Tax-Ready Wallet + AI Agent Production Readiness (`isitagentready.com` Compliance)*  
**Authoritative Scope:** `PROJECT.md` & `ORIGINAL_REQUEST.md` (R1, R2, R3, R4)  
**Date:** 2026-11-09  

---

## 1. Test Philosophy & Design Principles

The CM-LAB test infrastructure is engineered around an **opaque-box, contract-driven, requirement-verified** testing philosophy. The platform operates across a **Dual-Track Verification Landscape**:

1. **Track A (Human Web Application & Experience):** Interactive Svelte 5 application shell, Dexie.js v4 local encrypted vault, W3C DTCG tokens, and Unified Search / Activity / Request Bar (Omnibar) located in `tests/e2e/`.
2. **Track B (Autonomous AI Agent Infrastructure & `isitagentready.com` Compliance):** Full compliance with Cloudflare AI Crawl Control, RFC 9309, RFC 8288, RFC 9727, RFC 9728, SEP-1649, Agent Skills Discovery RFC, ARD, WebMCP, and DNS-AID located in `tests/agent_readiness/`.

### Core Testing Invariants:
1. **Opaque-Box Verification:** Tests verify external observable behavior, public HTTP endpoints, wire formats, MIME types, and DOM contracts without coupling to private implementation internals.
2. **Deterministic Authoritative Oracles:** Expected outputs are derived exclusively from statutory legal codes (`BGB`, `EStG`, `BMF Guidance`, `GoBD`) and ratified IETF/W3C/Cloudflare specifications.
3. **Zero External Dependencies:** Built using Python 3 standard library (`unittest`, `urllib`, `xml.etree`, `hashlib`) and Node.js (`child_process`), requiring zero third-party `pip` or `npm` installations. Runs identically on Windows, Linux, and macOS.
4. **Progressive Testability:** The test suites can run offline against repository static files and code, against local Astro/Cloudflare preview servers, or against live production endpoints (`rightsandrenewals.pages.dev` and `rightsandrenewals-app.pages.dev`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DUAL-TRACK REQUIREMENT-DRIVEN TEST ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ TRACK A: USER INTERFACE & STUDENT JOURNEYS (tests/e2e/ — 60 Tests)          │
│ • Tier 1: Design Tokens, Showcase Webpage, Modern App, Omnibar (25 tests)   │
│ • Tier 2: Boundary & Corner Cases (Leap Years, DST, ReDoS, Viewports) (15)  │
│ • Tier 3: Omnibar 8-State FSM & Multi-Domain Partitioning (12 tests)        │
│ • Tier 4: Real-World Student User Journeys (Spotify, MacBook, GoBD) (8)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ TRACK B: AI AGENT PRODUCTION READINESS (tests/agent_readiness/ — 96 Tests)  │
│ • Tier 1: Feature Coverage across 12 Areas (>=5 tests each) (61 tests)     │
│   - Area 01: RFC 9309 /robots.txt (AI search/train bots, Content-Signals)   │
│   - Area 02: Sitemaps Protocol /sitemap.xml (XML schema, canonical URLs)   │
│   - Area 03: RFC 8288 Link Headers on GET / (rel="api-catalog", etc.)       │
│   - Area 04: Markdown Content Negotiation (Accept: text/markdown vs HTML)   │
│   - Area 05: RFC 9727 API Catalog Linkset (/.well-known/api-catalog)        │
│   - Area 06: RFC 9728 OAuth PRM (/.well-known/oauth-protected-resource)    │
│   - Area 07: WorkOS Agent Registration Guidance (/auth.md H1 header)        │
│   - Area 08: SEP-1649 MCP Server Card (/.well-known/mcp/server-card.json)  │
│   - Area 09: Agent Skills Discovery Index & SHA-256 Digests                │
│   - Area 10: ARD Manifest (/.well-known/ai-catalog.json) & CORS *          │
│   - Area 11: W3C WebMCP In-Browser Tools & Declarative Forms                │
│   - Area 12: DNS-AID Zone Configuration & DNSSEC Documentation             │
│ • Tier 2: Boundary & Corner Cases (CORS, Case-Insensitivity, Wildcards) (15)│
│ • Tier 3: Cross-Feature Interactions & Multi-Hop Traversal (10 tests)       │
│ • Tier 4: Real-World Scenarios (isitagentready.com 23-Check Audit) (10)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Readiness Feature Inventory & Mapping Matrix

Every feature required by `isitagentready.com` and `PROJECT.md` maps directly to executable test cases in `tests/agent_readiness/`:

| Feature Area | Specifications & Protocols | Mapped Tier & Test Identifier | Verification Focus |
|---|---|---|---|
| **Crawl Governance** | RFC 9309, Content Signals | Tier 1: `TC-ROBOTS-01` to `06`; Tier 2: `TC-BOUND-07` | HTTP 200 text/plain, 6 AI bots, Content-Signals, Sitemap |
| **Sitemaps** | Sitemaps.org 0.9 Protocol | Tier 1: `TC-SITEMAP-01` to `05` | XML schema, canonical `<loc>`, `<lastmod>`, `<changefreq>` |
| **Link Headers** | RFC 8288 Web Linking | Tier 1: `TC-LINK-01` to `05`; Tier 3: `TC-TRAV-01` | Root GET `/` Link header with `api-catalog`, `service-doc` |
| **Content Negotiation** | Cloudflare Markdown for Agents | Tier 1: `TC-MD-01` to `05`; Tier 2: `TC-BOUND-01` | `Accept: text/markdown` -> HTTP 200 markdown, HTML fallback |
| **API Catalog** | RFC 9727 Linkset | Tier 1: `TC-CAT-01` to `05`; Tier 3: `TC-TRAV-01` | `application/linkset+json`, `service-desc`, `service-doc` |
| **OAuth PRM** | RFC 9728 Protected Resource | Tier 1: `TC-OPRM-01` to `05`; Tier 3: `TC-TRAV-07` | Resource origin, authorization servers, scopes, bearer headers |
| **Agent Auth Guidance**| WorkOS `/auth.md` | Tier 1: `TC-AUTH-01` to `05`; Tier 3: `TC-TRAV-07` | `# ... auth.md` H1 heading, registration flow, token usage |
| **MCP Server Card** | SEP-1649 / SEP-2127 | Tier 1: `TC-MCP-01` to `05`; Tier 3: `TC-TRAV-08` | ServerInfo, transport endpoint, capabilities, CORS `*` |
| **Agent Skills** | Cloudflare Agent Skills RFC | Tier 1: `TC-SKILLS-01` to `05`; Tier 3: `TC-TRAV-06`| Skills array, SHA-256 digest format, disk file integrity |
| **ARD Capability** | ARD v0.9 Manifest | Tier 1: `TC-ARD-01` to `05`; Tier 3: `TC-TRAV-02` | `ai-catalog.json`, urn:air IDs, exactly one of url/data, CORS |
| **WebMCP Integration** | W3C WebML/WebMCP | Tier 1: `TC-WMCP-01` to `05`; Tier 3: `TC-TRAV-08` | `document.modelContext.registerTool()`, form attributes |
| **DNS-AID & DNSSEC** | RFC 9460 SVCB/HTTPS, DNS-AID | Tier 1: `TC-DNS-01` to `05` | Zone file snippets, `_agents` namespace, Algorithm 13 DNSSEC |
| **Audit Emulation** | `isitagentready.com` 23-Check | Tier 4: `TC-AUDIT-01` to `10` | Full 23 checks, category scoring, maturity levels [0-5] |

---

## 3. Authoritative Expected Output Derivation

Expected outputs are grounded in explicit standards and legal oracles:

| Verification Domain | Authoritative Ground Truth Source | Mathematical / Protocol Oracle |
|---|---|---|
| **AI Crawl Exclusion** | RFC 9309 & Cloudflare AI Crawl Control | Explicit `User-agent:` blocks for `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `GPTBot`, `ClaudeBot`, `Google-Extended`. |
| **Content Signals** | Content Signals RFC (contentsignals.org) | Directives declaring `search=yes\|no`, `ai-train=yes\|no`, `ai-input=yes\|no`. |
| **Web Linking** | RFC 8288 (IETF) | `Link: <uri>; rel="api-catalog", <uri>; rel="service-doc"`. |
| **Content Negotiation** | HTTP/1.1 (RFC 9110 §12.5.1) | Media type matching `Accept: text/markdown` -> `Content-Type: text/markdown; charset=utf-8` + `Vary: Accept`. |
| **API Catalog** | RFC 9727 (IETF) | Root JSON `linkset` array with `service-desc`, `service-doc`, `status`. Content-Type `application/linkset+json`. |
| **OAuth PRM** | RFC 9728 (IETF) | JSON object containing `resource`, `authorization_servers`, `scopes_supported`, `bearer_methods_supported`. |
| **WorkOS Auth.md** | WorkOS `auth.md` Specification | First H1 Markdown heading must match `# ... auth.md` (case-insensitive). |
| **MCP Server Card** | SEP-1649 / Model Context Protocol | Root object declaring `serverInfo`, `transport`, `capabilities`. |
| **Agent Skills** | Cloudflare Agent Skills Discovery v0.2.0 | `skills` array with `name`, `type`, `description`, `url`, and `digest: sha256:<64_hex_digits>`. |
| **ARD Manifest** | Agentic Resource Discovery v0.9 | `host`, `entries` array with `urn:air:...` identifiers, adhering strictly to single `url` or `data` per entry. |
| **WebMCP Integration** | W3C WebML/WebMCP Explainer | Programmatic `(document.modelContext ?? navigator.modelContext).registerTool()` or HTML declarative `<form toolname="..." tooldescription="...">`. |
| **DNS-AID & DNSSEC** | RFC 9460 SVCB/HTTPS & draft-dnsaid | Service Mode HTTPS records under `_agents.<domain>`, authenticated via DNSSEC Algorithm 13 (`AD=true`). |

---

## 4. Test Suite File Structure & Layout

```
tests/
├── e2e/                                          # Track A: UI & Student Journeys
│   ├── __init__.py
│   ├── harness.py
│   ├── test_tier1_feature_coverage.py           # 25 tests
│   ├── test_tier2_boundaries.py                 # 15 tests
│   ├── test_tier3_fsm_and_combinations.py       # 12 tests
│   ├── test_tier4_student_journeys.py           # 8 tests
│   ├── runner.py
│   └── runner.js
└── agent_readiness/                              # Track B: AI Agent Production Readiness
    ├── __init__.py
    ├── harness.py                                # Cloudflare Pages _headers parser, HTTP probes, 23-check audit
    ├── test_tier1_feature_coverage.py           # Tier 1: 61 tests across 12 feature areas (>=5 tests each)
    ├── test_tier2_boundaries.py                 # Tier 2: 15 boundary & corner case tests
    ├── test_tier3_cross_feature.py              # Tier 3: 10 multi-hop agent discovery traversal tests
    ├── test_tier4_isitagentready_audit.py       # Tier 4: 10 real-world audit emulation tests
    ├── runner.py                                 # Master test runner (Text, TAP, JSON, Audit modes)
    └── runner.js                                 # Cross-platform Node.js wrapper
```

---

## 5. Execution Commands & Verification Guide

### 5.1 Track B: Agent Readiness Test Runner
```powershell
# 1. Run all 4 tiers (96 tests) with detailed console output:
python tests/agent_readiness/runner.py --all

# 2. Run specific tiers (e.g. Tier 1 Feature Coverage or Tier 4 Audit Emulation):
python tests/agent_readiness/runner.py --tier 1
python tests/agent_readiness/runner.py --tier 4

# 3. Run with TAP (Test Anything Protocol) output:
python tests/agent_readiness/runner.py --all --format tap

# 4. Run with structured JSON output for CI pipelines:
python tests/agent_readiness/runner.py --all --format json

# 5. Print the full 23-check audit scorecard for both web properties:
python tests/agent_readiness/runner.py --audit

# 6. Execute via Node.js wrapper:
node tests/agent_readiness/runner.js --all
```

### 5.2 Track A: UI & Omnibar Test Runner
```powershell
# Run Track A UI & Student Journey suite (60 tests):
python tests/e2e/runner.py
```

---

## 6. Continuous Integration & Quality Gates

The agent readiness test suite establishes a deterministic verification ladder:
1. **Milestone M1 (Crawl Governance & DNS-AID):** Verifies `/robots.txt`, `/sitemap.xml`, and `docs/DNS_AID_ZONE_CONFIGURATION.md`.
2. **Milestone M2 (Agent Catalogs & Metadata):** Verifies RFC 9727 API Catalog, RFC 9728 OAuth PRM, `/auth.md`, SEP-1649 MCP Server Card, Agent Skills index, ARD `ai-catalog.json`, and `_headers` CORS overrides.
3. **Milestone M3 (Link Headers & Content Negotiation):** Verifies RFC 8288 `Link` headers on `/`, `_routes.json`, and dynamic SSR middleware returning `Content-Type: text/markdown` on `Accept: text/markdown`.
4. **Milestone M4 (WebMCP In-Browser Integration):** Verifies programmatic and declarative tool registrations.
5. **Milestone M5 (100% Release Gate):** 100% of all 96 test cases passing across Tiers 1–4, achieving **Level 5 ("Agent-Native")** on both web properties.
