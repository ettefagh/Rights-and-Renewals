# Test Infrastructure & Verification Architecture (`TEST_INFRA.md`)

**Document Version:** `1.0.0-PROD`  
**Author:** `teamwork_test_writer_e2e_1` (Lead E2E Test Writer)  
**Academic Module:** *Computer & Media Lab* (SRH Hochschule Heidelberg / Berlin, WiSe 2026)  
**Project:** *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Authoritative Scope:** `PROJECT.md` & `ORIGINAL_REQUEST.md` (R1, R2, R3, R4)  
**Date:** 2026-11-05  

---

## 1. Test Philosophy & Design Principles

The CM-LAB test infrastructure is engineered around an **opaque-box, contract-driven, requirement-verified** testing philosophy. It is designed to evaluate both interfaces of the system:
1. **Interface A (Human Web Application):** Interactive Svelte 5 / React 19 application shell, Dexie.js v4 local vault, and Unified Search / Activity / Request Bar (Omnibar).
2. **Interface B (AI Agent MCP Server):** Model Context Protocol (MCP 2024-11-05 standard) JSON-RPC 2.0 tool execution (`policy_lookup`, `claim_dossier_generate`).

### Core Testing Invariants:
1. **Opaque-Box Verification:** Tests verify external observable behavior, public interfaces, DOM contracts, state transitions, and API/MCP wire formats without coupling to internal private component implementations or transient variable names.
2. **Progressive Testability:** The test suite operates across all development phases:
   - Evaluates authoritative specifications, seed databases (`policy_wiki_seed_v1.json`), W3C DTCG tokens, and FSM transition tables during design/pre-build.
   - Evaluates live DOM structures, generated CSS custom properties, and JSON-RPC endpoints as implementation code matures.
3. **Zero External Dependencies:** Built using standard Python 3 `unittest` and standard Node.js (`child_process`), requiring zero third-party `pip` or `npm` installations. Executes identically on Windows, Linux, and macOS in $<150\text{ ms}$.
4. **Deterministic Authoritative Oracles:** Expected outputs are derived exclusively from statutory German legal codes (`BGB`, `EStG`, `BMF Guidance`, `GoBD`), W3C specifications (DTCG, WCAG 2.1 relative luminance math), and canonical seed databases.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4-TIER REQUIREMENT-DRIVEN E2E TEST ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: FEATURE COVERAGE (25 Tests)                                         │
│ • Design Tokens & Contrast (6 tests) · Showcase Webpage (7 tests)          │
│ • Modern App Interface (7 tests)     · Unified Omnibar Engine (5 tests)     │
│                                                                             │
│ TIER 2: BOUNDARY & CORNER CASES (15 Tests)                                  │
│ • Special Chars & XSS Escaping · Extreme String Lengths & ReDoS (4096 chars)│
│ • Leap Years (Feb 29) & Rollovers · European DST Shifts (09:00 Invariant)   │
│ • Exact BGB Cliff/Expiry Days · Extreme Viewports (320px to 2560px)         │
│ • GoBD Receipt Immutability Blobs · JSON-RPC 2.0 Malformed Errors           │
│                                                                             │
│ TIER 3: CROSS-FEATURE & OMNIBAR 8-STATE FSM (12 Tests)                      │
│ • Formal 8-State Omnibar FSM Lifecycle (IDLE through COMMAND_MODE)          │
│ • Hybrid Partitioning (Vault + Wiki) · Zero-Dead-End Suggestions            │
│ • Verb Workflows (>claim, >cancel, >tax) · Contextual Drawer Navigation     │
│ • Split-Screen UI-to-MCP Sync (<30ms Latency SLA)                           │
│                                                                             │
│ TIER 4: REAL-WORLD STUDENT APPLICATION JOURNEYS (8 Tests)                   │
│ • Journey 1: Student Spotify BGB § 309/§ 312k Cancellation                  │
│ • Journey 2: Student Apple MacBook Pro Month 11 BGB § 477 Cliff Claim       │
│ • Journey 3: Student Unlisted Purchase (Keychron Q1) & GoBD SHA-256 Vault   │
│ • Journey 4: Werkstudent Werbungskosten Tax Return & BMF 2022 Sofortabschreibung│
│ • Journey 5: Autonomous AI MCP Agent JSON-RPC 2.0 Dossier Compilation       │
│ • Journey 6: Saturn Charger Failure Month 9 Retailer Routing                │
│ • Journey 7: Gym Subscription Obstructed Button Fristlose Kündigung         │
│ • Journey 8: Multi-Item Vault Audit (North Star Metric NSM-01 >= €350)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Inventory Mapping Matrix

Every feature defined in `PROJECT.md` maps directly to executable test cases across the 4 tiers:

| Feature # | Feature Name | Mapped Tier & Test Identifier | Verification Focus |
|:---:|---|---|---|
| **F01** | UI/UX Research & Specifications Doc | Tier 1: `TC-SHOWCASE-01`, `TC-APP-01` | Architecture, dual-interface model, and responsive layouts |
| **F02** | Unified Bar 8-State FSM Specification | Tier 1: `TC-OMNI-01` to `05`; Tier 3: `TC-FSM-01` to `07` | 8 states (`IDLE` to `COMMAND_MODE`), state transitions, illegal transition guards |
| **F03** | Design System & Token Proofs | Tier 1: `TC-DTCG-01` to `06`; Tier 2: `TC-BOUND-10` | W3C DTCG tokens, WCAG AA/AAA contrast ratios, z-index strata, breakpoints |
| **F04** | Showcase Landing & Dual-Interface Intro | Tier 1: `TC-SHOWCASE-01`; Tier 4: `TC-JOURNEY-05` | "Two Faces of Ground Truth", MCP tools and human application |
| **F05** | Split-Screen Interactive MCP Playground | Tier 1: `TC-SHOWCASE-02`, `03`; Tier 3: `TC-FSM-12` | JSON-RPC 2.0 tool execution (`policy_lookup`, `claim_dossier_generate`) in <30ms |
| **F06** | Modular Showcase Dashboard Grid | Tier 1: `TC-SHOWCASE-01`; Tier 2: `TC-BOUND-10` | 12-column responsive layout, widget boundaries, CLS <= 0.05 |
| **F07** | Showcase Calendar Type 1 (Monthly Grid) | Tier 1: `TC-SHOWCASE-04` | ISO 8601 DIN 7-column layout, date cells, urgency badges |
| **F08** | Showcase Calendar Type 2 (Timeline/Agenda) | Tier 1: `TC-SHOWCASE-05`; Tier 4: `TC-JOURNEY-02` | 12-month BGB § 477 Beweislastumkehr progress bar and claim CTA |
| **F09** | Showcase Calendar Type 3 (Risk Heatmap) | Tier 1: `TC-SHOWCASE-06` | 52-week risk density matrix, deadline clustering, capital at risk |
| **F10** | Showcase Unified Bar Integration | Tier 1: `TC-SHOWCASE-01`; Tier 3: `TC-FSM-04` | Multi-domain search preview across sample wiki and vault |
| **F11** | Modern App View Shell & Layout | Tier 1: `TC-APP-01`; Tier 2: `TC-BOUND-10` | 100dvh viewport container, safe-area insets, sticky top bar |
| **F12** | App Unified Omnibar (Idle & Quick Actions) | Tier 1: `TC-OMNI-01`; Tier 3: `TC-FSM-01` | Hotkey (Ctrl/Cmd+K), recent activities, quick action chips |
| **F13** | App Unified Omnibar (Wiki Database Search) | Tier 1: `TC-OMNI-02`; Tier 3: `TC-FSM-02` | Fast query matching across 20 brands and BGB statutory rules |
| **F14** | App Unified Omnibar (Saved Items Search) | Tier 1: `TC-OMNI-03`; Tier 3: `TC-FSM-03` | Local vault querying across warranties, subscriptions, receipts |
| **F15** | App Unified Omnibar (Create/Import Suggestions)| Tier 1: `TC-OMNI-04`; Tier 3: `TC-FSM-05`, `10` | Zero-dead-end fallback prompts ("Create warranty", "Import receipt") |
| **F16** | App Unified Omnibar (Verb Command Workflows) | Tier 1: `TC-OMNI-05`; Tier 3: `TC-FSM-06`, `11` | Executable verbs (`>claim`, `>cancel`, `>tax`, `>import`, `>audit`) |
| **F17** | App Contextual Item Detail Drawer | Tier 1: `TC-APP-02`; Tier 3: `TC-FSM-08`; Tier 4: `TC-JOURNEY-02` | 520px slide-over drawer, 24m BGB timeline, GoBD SHA-256 proof |
| **F18** | App Modular Dashboard Widgets | Tier 1: `TC-APP-06`; Tier 4: `TC-JOURNEY-08` | Urgent Attention banner (<=30d), spend radar, master vault ledger |
| **F19** | Dual-Domain Edge Hosting & Routing Config | Tier 1: `TC-APP-05` | Origin separation, deep-linking via URL hash, privacy sandbox |
| **F20** | Dual Track E2E Test Suite & Test Runner | Full Suite (`tests/e2e/runner.py`, `runner.js`) | Executable runner covering all 4 tiers with JSON and CLI modes |
| **F21** | Final Milestone Verification & Build Pass | Full Suite Discovery | Clean local build, 100% pass rate (60/60 tests) |
| **F22** | Adversarial Coverage Hardening | Tier 2: `TC-BOUND-01` to `15` | Malformed JSON-RPC, ReDoS, XSS, DST shifts, leap years |

---

## 3. Authoritative Expected Output Derivation

For every test case in the suite, expected outputs are grounded in explicit authoritative sources:

| Verification Domain | Authoritative Ground Truth Source | Mathematical / Statutory Formula |
|---|---|---|
| **WCAG 2.1 Contrast** | W3C Relative Luminance Standard (SC 1.4.3 / 1.4.11) | $L = 0.2126 R_{lin} + 0.7152 G_{lin} + 0.0722 B_{lin}$<br>$\text{CR} = (L_1 + 0.05) / (L_2 + 0.05) \ge 4.5:1$ (text), $\ge 3.0:1$ (UI) |
| **Statutory Warranty** | German Civil Code (`BGB § 438 Abs. 1 Nr. 3`) | 24 months statutory defect liability from handover date |
| **Burden of Proof Cliff** | German Civil Code (`BGB § 477 Abs. 1`) | Presumption of defect at delivery for 12 months; flips to consumer on Day 366 |
| **Suspension of Expiry** | German Civil Code (`BGB § 475e Abs. 1`) | 4-month *Ablaufhemmung* from first defect notice |
| **Subscription Notice** | German Civil Code (`BGB § 309 Nr. 9`) | Max 1-month rolling notice period for automatically renewed contracts |
| **Online Cancellation** | German Civil Code (`BGB § 312k Abs. 1 & Abs. 6`) | Mandatory online cancellation button; immediate termination without notice if missing/obstructed |
| **Receipt Immutability** | German GoBD (`BMF IV A 4 - S 0316/13/10005`, Rn. 108–110) | Pre-encryption `SHA-256(canonical_meta + receipt_blob)` tamper detection |
| **Tax Depreciation** | German Federal Tax Ministry (`BMF Guidance of 22.02.2022`) | 100% 1-year immediate write-off (*Sofortabschreibung*) for computer hardware & software under `§ 9 EStG` |
| **MCP Protocol Standard**| Model Context Protocol (Anthropic / Linux Foundation, 2024-11-05)| JSON-RPC 2.0 wire format, error codes `-32600` (Invalid Request), `-32601` (Method Not Found), `-32602` (Invalid Params) |

---

## 4. Test Suite File Structure & Layout

All test files are strictly co-located inside `tests/e2e/`:

```
tests/e2e/
├── __init__.py                           # Package marker
├── harness.py                            # Core shared harness, W3C contrast math, FSM simulation,
│                                         # GoBD hasher, BGB timeline calculator, MCP server engine
├── test_tier1_feature_coverage.py       # Tier 1: 25 tests across Tokens, Showcase, App, Omnibar
├── test_tier2_boundaries.py             # Tier 2: 15 tests for stress, boundaries, DST, leap years, ReDoS
├── test_tier3_fsm_and_combinations.py   # Tier 3: 12 tests for Omnibar 8-State FSM and cross-feature flows
├── test_tier4_student_journeys.py       # Tier 4: 8 tests for real-world student user journeys
├── runner.py                             # Executable Python master runner with CLI & JSON output
└── runner.js                             # Executable Node.js master runner wrapper
```

---

## 5. Execution Commands & Verification Guide

### 5.1 Standard Python Unittest Discovery
```powershell
# Run the entire E2E test suite via standard unittest
python -m unittest discover -s tests/e2e -p "test_*.py"
```

### 5.2 Master Runner Execution (Recommended)
```powershell
# 1. Run all 4 tiers (60 tests) with detailed output
python tests/e2e/runner.py

# 2. Run a specific tier only
python tests/e2e/runner.py --tier 1
python tests/e2e/runner.py --tier 2
python tests/e2e/runner.py --tier 3
python tests/e2e/runner.py --tier 4

# 3. Output machine-readable JSON (for CI / orchestration)
python tests/e2e/runner.py --json

# 4. Run via Node.js wrapper
node tests/e2e/runner.js
```

### 5.3 Expected Verification Output
```
================================================================================
  CM-LAB E2E TEST SUITE — MASTER VERIFICATION RUNNER
  SRH University of Applied Sciences · CM-LAB WiSe 2026
================================================================================
  Target Tiers: 1, 2, 3, 4
    - Tier 1: Feature Coverage (Showcase, App, Omnibar, Tokens)
    - Tier 2: Boundary & Corner Cases (Leap Years, Viewports, ReDoS)
    - Tier 3: Cross-Feature Combinations & Omnibar 8-State FSM
    - Tier 4: Real-World Student User Journeys (Spotify, MacBook, GoBD)
  Total Test Cases Registered: 60
--------------------------------------------------------------------------------
[... 60 test execution lines ...]
--------------------------------------------------------------------------------
  Result: [PASSED] — 60/60 passed (100.0%) in 0.105s
================================================================================
```

---

## 6. Continuous Integration & Quality Gates

The test suite acts as an unyielding quality gate for all subsequent milestones:
1. **Pre-Commit / Pre-Push:** Fast execution ($<150\text{ ms}$) permits local execution on every developer save.
2. **Milestone M2 & M3 Verification:** As frontend and backend assets are built, the tests serve as the authoritative behavioral contract.
3. **Milestone M4 Release Gate:** 100% pass rate (60/60 tests) is a mandatory prerequisite for `TEST_READY.md` sign-off and final delivery.
