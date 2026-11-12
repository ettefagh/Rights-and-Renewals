#!/usr/bin/env python3
"""
Master Test Runner for AI Agent Production Readiness (isitagentready.com Compliance).
SRH University of Applied Sciences · CM-LAB WiSe 2026.

Usage:
    python tests/agent_readiness/runner.py [--all] [--tier {1,2,3,4}] [--format {text,tap,json}] [--update-docs] [--audit]

Exit Code:
    0: All executed tests passed.
    1: One or more tests failed or errored.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tests.agent_readiness.test_tier1_feature_coverage import (
    TestTier1Area01_RobotsTxt,
    TestTier1Area02_SitemapXml,
    TestTier1Area03_LinkHeaders,
    TestTier1Area04_MarkdownNegotiation,
    TestTier1Area05_ApiCatalog,
    TestTier1Area06_OAuthProtectedResource,
    TestTier1Area07_AuthMd,
    TestTier1Area08_McpServerCard,
    TestTier1Area09_AgentSkillsIndex,
    TestTier1Area10_ArdAiCatalog,
    TestTier1Area11_WebMcpBrowserIntegration,
    TestTier1Area12_DnsAidDocumentation,
)
from tests.agent_readiness.test_tier2_boundaries import TestTier2Boundaries
from tests.agent_readiness.test_tier3_cross_feature import TestTier3CrossFeature
from tests.agent_readiness.test_tier4_isitagentready_audit import TestTier4AuditEmulation
from tests.agent_readiness.harness import (
    EndpointAccessor,
    run_isitagentready_audit,
    SHOWCASE_CANONICAL,
    APP_CANONICAL,
)

TIER_MAP = {
    1: [
        TestTier1Area01_RobotsTxt,
        TestTier1Area02_SitemapXml,
        TestTier1Area03_LinkHeaders,
        TestTier1Area04_MarkdownNegotiation,
        TestTier1Area05_ApiCatalog,
        TestTier1Area06_OAuthProtectedResource,
        TestTier1Area07_AuthMd,
        TestTier1Area08_McpServerCard,
        TestTier1Area09_AgentSkillsIndex,
        TestTier1Area10_ArdAiCatalog,
        TestTier1Area11_WebMcpBrowserIntegration,
        TestTier1Area12_DnsAidDocumentation,
    ],
    2: [TestTier2Boundaries],
    3: [TestTier3CrossFeature],
    4: [TestTier4AuditEmulation],
}

TIER_NAMES = {
    1: "Tier 1: Feature Coverage (>=5 tests per feature area across 12 areas)",
    2: "Tier 2: Boundary & Corner Cases (Headers, Slashing, Malformed Accept, CORS)",
    3: "Tier 3: Cross-Feature Interactions & Multi-Hop Discovery Traversal",
    4: "Tier 4: Real-World Scenarios & Full isitagentready.com 23-Check Audit Emulation",
}


def build_suite(selected_tiers: List[int]) -> unittest.TestSuite:
    """Assemble unittest suite for requested tiers."""
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    for t in selected_tiers:
        for cls in TIER_MAP.get(t, []):
            suite.addTests(loader.loadTestsFromTestCase(cls))
    return suite


def run_tap(suite: unittest.TestSuite) -> Tuple[int, int, int]:
    """Execute tests and output Test Anything Protocol (TAP) stream."""
    total = suite.countTestCases()
    print(f"1..{total}")
    idx = 1
    passed = 0
    failed = 0

    for test_group in suite:
        for test in test_group:
            result = unittest.TestResult()
            test.run(result)
            test_desc = f"{test.__class__.__name__}.{test._testMethodName}"
            if result.wasSuccessful():
                print(f"ok {idx} - {test_desc}")
                passed += 1
            else:
                err_msg = ""
                if result.failures:
                    err_msg = result.failures[0][1].splitlines()[-1]
                elif result.errors:
                    err_msg = result.errors[0][1].splitlines()[-1]
                print(f"not ok {idx} - {test_desc} # {err_msg}")
                failed += 1
            idx += 1

    return passed, failed, total


def generate_test_ready_doc(
    results_summary: Dict[str, Any],
    showcase_audit: Dict[str, Any],
    app_audit: Dict[str, Any],
    output_path: Path = REPO_ROOT / "TEST_READY.md"
) -> None:
    """Generate or update the authoritative TEST_READY.md file at project root."""
    tier_counts = results_summary.get("tier_counts", {})
    total_tests = results_summary.get("total_tests", 0)
    passed_tests = results_summary.get("passed_tests", 0)
    failed_tests = results_summary.get("failed_tests", 0)

    doc_content = f"""# AI Agent Production Readiness Test Suite Delivery (`TEST_READY.md`)

**Date:** 2026-11-09  
**Status:** READY / SPECIFICATION & E2E VERIFICATION ACTIVE  
**Authority:** `isitagentready.com` (Cloudflare), RFC 9309, RFC 8288, RFC 9727, RFC 9728, SEP-1649, Agent Skills RFC, ARD v0.9, W3C WebMCP  
**Author:** `teamwork_test_writer_agentready` (Lead E2E Test Writer)  
**Parent Orchestrator:** `9acad914-4fc8-4298-8467-f0517967a526`  

---

## 1. Executive Summary & Test Suite Deliverables

A comprehensive, opaque-box, requirement-driven automated E2E test suite has been designed and implemented in `tests/agent_readiness/`. The suite verifies **100% of the 23 audit criteria** evaluated by `isitagentready.com` across both web properties:
1. **Showcase Property (`apps/showcase` / `rightsandrenewals.pages.dev`)**: Public landing page, Brand Policy Wiki, and Open MCP JSON-RPC 2.0 server.
2. **Sovereign App Property (`apps/app` / `rightsandrenewals-app.pages.dev`)**: Offline-first encrypted consumer rights wallet, statutory timeline engine, and PWA.

### Test Suite Structure:
- `tests/agent_readiness/harness.py`: Core endpoint accessor, Cloudflare Pages `_headers` parser, HTTP probe engine, schema validators, and full 23-check audit emulator.
- `tests/agent_readiness/test_tier1_feature_coverage.py`: Tier 1 Feature Coverage (61 tests covering 12 distinct feature areas with >= 5 tests each).
- `tests/agent_readiness/test_tier2_boundaries.py`: Tier 2 Boundary & Corner Cases (15 tests covering case-insensitivity, trailing slashes, malformed Accept, wildcards, CORS preflights, input schemas).
- `tests/agent_readiness/test_tier3_cross_feature.py`: Tier 3 Cross-Feature Interactions (10 tests covering full agent discovery traversal, ARD reverse lookup, digest verification, scope consistency).
- `tests/agent_readiness/test_tier4_isitagentready_audit.py`: Tier 4 Real-World Audit Scenarios (10 tests running the full 23-check audit engine and calculating readiness levels).
- `tests/agent_readiness/runner.py`: Master test runner supporting text, TAP, and JSON outputs, live preview testing, and documentation generation.
- `tests/agent_readiness/runner.js`: Cross-platform Node.js execution wrapper.

---

## 2. Test Architecture & Tier Breakdown

| Tier | Name | Test Count | Scope & Focus |
|:---:|---|:---:|---|
| **Tier 1** | **Feature Coverage** | {tier_counts.get(1, 61)} | 12 feature areas (>= 5 tests each): `/robots.txt`, `/sitemap.xml`, RFC 8288 `Link` headers, Content Negotiation (`Accept: text/markdown`), RFC 9727 API Catalog, RFC 9728 OAuth PRM, `/auth.md`, SEP-1649 MCP Server Card, Agent Skills index, ARD `ai-catalog.json`, WebMCP integration, DNS-AID documentation. |
| **Tier 2** | **Boundary & Corner Cases** | {tier_counts.get(2, 15)} | Case-insensitivity (`TEXT/MARKDOWN`), trailing slash normalization, malformed Accept headers, wildcard mime types (`*/*`), q-value weighting, CORS preflights (OPTIONS), extreme query lengths, security header coexistence. |
| **Tier 3** | **Cross-Feature Interactions** | {tier_counts.get(3, 10)} | End-to-end multi-hop agent discovery traversal (`/` -> `Link` -> `api-catalog` -> `auth.md` -> `mcp/server-card.json` -> skills), reverse ARD traversal, SHA-256 digest disk integrity, cross-domain consistency, `_routes.json` partitioning. |
| **Tier 4** | **Real-World Scenarios** | {tier_counts.get(4, 10)} | Full 23-check audit emulation matching `isitagentready.com` criteria, category-level scoring, gap analysis diagnostics, and maturity level computation (Level 0 to 5) for both showcase and app. |
| **Total** | **Full E2E Suite** | **{total_tests}** | **Complete opaque-box coverage across both web properties.** |

---

## 3. How to Run the Tests

### Command Line Execution:
```powershell
# Run the entire 4-tier test suite with standard human-readable output:
python tests/agent_readiness/runner.py --all

# Run specific tiers (e.g. Tier 1 Feature Coverage or Tier 4 Audit):
python tests/agent_readiness/runner.py --tier 1
python tests/agent_readiness/runner.py --tier 4

# Run with TAP (Test Anything Protocol) output:
python tests/agent_readiness/runner.py --all --format tap

# Run with structured JSON output for CI pipelines:
python tests/agent_readiness/runner.py --all --format json

# Print the full 23-check audit scorecard for both web properties:
python tests/agent_readiness/runner.py --audit

# Execute via Node.js wrapper:
node tests/agent_readiness/runner.js --all
```

---

## 4. Current Audit Scorecard & Gap Analysis

When evaluated against the current repository state (prior to M1–M4 implementation by downstream workers), the audit engine provides a precise baseline gap analysis:

### Showcase Web Property (`apps/showcase` / `rightsandrenewals.pages.dev`):
- **Current Readiness Level:** Level {showcase_audit.get('readiness_level', 0)} ({showcase_audit.get('readiness_level_name', 'Not Ready')})
- **Checks Passed:** {showcase_audit.get('passed_count', 0)} / 23
- **Checks Failed (Pending M1-M4):** {showcase_audit.get('failed_count', 0)} / 23
- **Neutral Checks:** {showcase_audit.get('neutral_count', 5)} / 23

### Sovereign App Web Property (`apps/app` / `rightsandrenewals-app.pages.dev`):
- **Current Readiness Level:** Level {app_audit.get('readiness_level', 0)} ({app_audit.get('readiness_level_name', 'Not Ready')})
- **Checks Passed:** {app_audit.get('passed_count', 0)} / 23
- **Checks Failed (Pending M1-M4):** {app_audit.get('failed_count', 0)} / 23
- **Neutral Checks:** {app_audit.get('neutral_count', 5)} / 23

---

## 5. Verification Checklist for Downstream Milestones

As implementing agents complete Milestones M1, M2, M3, and M4, re-running `python tests/agent_readiness/runner.py --all` will progressively turn failed checks into passes until both properties achieve **Level 5: Agent-Native**:

- [ ] **M1: Crawl Governance & DNS-AID**: `/robots.txt` plain text, AI bot directives, Content-Signals, `/sitemap.xml`, and `docs/DNS_AID_ZONE_CONFIGURATION.md`.
- [ ] **M2: Agent Discovery Catalogs & Metadata**: `/.well-known/api-catalog`, `/.well-known/oauth-protected-resource`, `/auth.md`, `/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/index.json`, `/.well-known/ai-catalog.json`, and `_headers` MIME overrides.
- [ ] **M3: Link Headers & Markdown Content Negotiation**: RFC 8288 `Link` headers on `/`, `_routes.json` routing, and Astro middleware returning `Content-Type: text/markdown; charset=utf-8` on `Accept: text/markdown`.
- [ ] **M4: WebMCP Browser Integration**: Programmatic `document.modelContext.registerTool()` and declarative Svelte form attributes (`toolname`, `tooldescription`, `toolparamdescription`).
- [ ] **M5: 100% E2E Verification**: All 96 test cases passing across Tiers 1–4, achieving **Level 5 ("Agent-Native")** on both web properties.
"""
    output_path.write_text(doc_content, encoding="utf-8")
    print(f"[TEST_READY] Successfully published: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="CM-LAB Agent Readiness E2E Test Runner")
    parser.add_argument("--all", action="store_true", default=True, help="Run all 4 tiers")
    parser.add_argument("--tier", type=str, default=None, help="Specific tier(s) to run (e.g. 1 or 1,2,4)")
    parser.add_argument("--format", choices=["text", "tap", "json"], default="text", help="Output format")
    parser.add_argument("--verbose", action="store_true", default=True, help="Verbose text output")
    parser.add_argument("--update-docs", action="store_true", default=False, help="Update TEST_READY.md")
    parser.add_argument("--audit", action="store_true", default=False, help="Print full 23-check audit scorecards")
    parser.add_argument("--url-showcase", type=str, default=None, help="Live URL for showcase")
    parser.add_argument("--url-app", type=str, default=None, help="Live URL for app")

    args = parser.parse_args()

    selected_tiers = [1, 2, 3, 4]
    if args.tier:
        selected_tiers = [int(x.strip()) for x in args.tier.split(",") if x.strip().isdigit()]

    # Run audit engine
    showcase_acc = EndpointAccessor("showcase", live_base_url=args.url_showcase)
    app_acc = EndpointAccessor("app", live_base_url=args.url_app)
    showcase_audit = run_isitagentready_audit(showcase_acc)
    app_audit = run_isitagentready_audit(app_acc)

    if args.audit:
        print("=" * 80)
        print("  AI AGENT PRODUCTION READINESS AUDIT (isitagentready.com Emulation)")
        print("=" * 80)
        for audit in [showcase_audit, app_audit]:
            print(f"\nProperty: {audit['property'].upper()} ({audit['canonical_origin']})")
            print(f"Readiness Level: Level {audit['readiness_level']} ({audit['readiness_level_name']})")
            print(f"Summary: {audit['passed_count']} Passed, {audit['failed_count']} Failed, {audit['neutral_count']} Neutral")
            print("-" * 80)
            for c in audit["checks"]:
                sym = "PASS" if c["status"] == "pass" else ("NEUT" if c["status"] == "neutral" else "FAIL")
                print(f"  [{sym:<4}] {c['check_id']:<26} ({c['category']:<20}) : {c['details']}")
        print("=" * 80)
        return 0

    suite = build_suite(selected_tiers)
    total_count = suite.countTestCases()

    tier_counts = {t: build_suite([t]).countTestCases() for t in [1, 2, 3, 4]}

    if args.format == "tap":
        passed, failed, total = run_tap(suite)
        if args.update_docs:
            generate_test_ready_doc(
                {"tier_counts": tier_counts, "total_tests": total, "passed_tests": passed, "failed_tests": failed},
                showcase_audit,
                app_audit
            )
        sys.exit(0 if failed == 0 else 1)

    if args.format == "text":
        print("=" * 80)
        print("  CM-LAB AGENT PRODUCTION READINESS E2E TEST RUNNER")
        print("  SRH University of Applied Sciences · CM-LAB WiSe 2026")
        print("=" * 80)
        print(f"  Tiers Selected: {', '.join(str(t) for t in selected_tiers)}")
        for t in selected_tiers:
            print(f"    - {TIER_NAMES[t]} ({tier_counts.get(t, 0)} tests)")
        print(f"  Total Test Cases in Suite: {total_count}")
        print("-" * 80)

    start_time = time.perf_counter()
    runner = unittest.TextTestRunner(verbosity=2 if args.verbose else 1, stream=sys.stdout if args.format == "text" else open(os.devnull, "w"))
    result = runner.run(suite)
    duration = time.perf_counter() - start_time

    failed = len(result.failures) + len(result.errors)
    passed = total_count - failed

    results_summary = {
        "tier_counts": tier_counts,
        "total_tests": total_count,
        "passed_tests": passed,
        "failed_tests": failed,
        "duration_seconds": round(duration, 3)
    }

    if args.format == "json":
        output = {
            "summary": results_summary,
            "showcase_audit": showcase_audit,
            "app_audit": app_audit,
            "failures": [
                {"test": str(test), "message": err.splitlines()[-1]}
                for test, err in result.failures + result.errors
            ]
        }
        print(json.dumps(output, indent=2))

    if args.update_docs:
        generate_test_ready_doc(results_summary, showcase_audit, app_audit)

    if args.format == "text":
        print("-" * 80)
        print(f"  Summary: {passed}/{total_count} Passed ({failed} Failed) in {duration:.3f}s")
        print("=" * 80)

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
