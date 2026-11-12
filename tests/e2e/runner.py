#!/usr/bin/env python3
"""
CM-LAB E2E Test Suite Master Runner
Author: teamwork_test_writer_e2e_1
License: MIT / Academic Use (SRH University of Applied Sciences, CM-LAB WiSe 2026)

Usage:
    python tests/e2e/runner.py [--all] [--tier {1,2,3,4}] [--verbose] [--json]

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
from typing import Any, Dict, List

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tests.e2e.test_tier1_feature_coverage import (
    TestTier1CategoryA_DesignTokens,
    TestTier1CategoryB_ShowcaseWebpage,
    TestTier1CategoryC_ModernApp,
    TestTier1CategoryD_UnifiedOmnibar
)
from tests.e2e.test_tier2_boundaries import TestTier2Boundaries
from tests.e2e.test_tier3_fsm_and_combinations import TestTier3FSMAndCombinations
from tests.e2e.test_tier4_student_journeys import TestTier4StudentJourneys


TIER_MAP = {
    1: [
        TestTier1CategoryA_DesignTokens,
        TestTier1CategoryB_ShowcaseWebpage,
        TestTier1CategoryC_ModernApp,
        TestTier1CategoryD_UnifiedOmnibar
    ],
    2: [TestTier2Boundaries],
    3: [TestTier3FSMAndCombinations],
    4: [TestTier4StudentJourneys]
}

TIER_NAMES = {
    1: "Tier 1: Feature Coverage (Showcase, App, Omnibar, Tokens)",
    2: "Tier 2: Boundary & Corner Cases (Leap Years, Viewports, ReDoS)",
    3: "Tier 3: Cross-Feature Combinations & Omnibar 8-State FSM",
    4: "Tier 4: Real-World Student User Journeys (Spotify, MacBook, GoBD)"
}


def create_suite(selected_tiers: List[int]) -> unittest.TestSuite:
    """Assemble a unittest TestSuite for the requested tiers."""
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    for tier in selected_tiers:
        test_classes = TIER_MAP.get(tier, [])
        for test_cls in test_classes:
            suite.addTests(loader.loadTestsFromTestCase(test_cls))
    return suite


def run_e2e_suite(
    selected_tiers: List[int],
    verbose: bool = True,
    output_json: bool = False
) -> int:
    """Execute test suite and output human-readable or JSON reports."""
    suite = create_suite(selected_tiers)
    total_tests = suite.countTestCases()

    if not output_json:
        print("=" * 80)
        print("  CM-LAB E2E TEST SUITE — MASTER VERIFICATION RUNNER")
        print("  SRH University of Applied Sciences · CM-LAB WiSe 2026")
        print("=" * 80)
        print(f"  Target Tiers: {', '.join(str(t) for t in selected_tiers)}")
        for t in selected_tiers:
            print(f"    - {TIER_NAMES[t]}")
        print(f"  Total Test Cases Registered: {total_tests}")
        print("-" * 80)

    start_time = time.perf_counter()
    verbosity = 2 if verbose and not output_json else 1
    runner = unittest.TextTestRunner(verbosity=verbosity, stream=sys.stderr if output_json else sys.stdout)
    result = runner.run(suite)
    duration = time.perf_counter() - start_time

    passes = total_tests - len(result.failures) - len(result.errors) - len(result.skipped)
    pass_rate = (passes / total_tests * 100.0) if total_tests > 0 else 0.0

    report_payload: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tiers": selected_tiers,
        "total_tests": total_tests,
        "passed": passes,
        "failed": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "pass_rate_percent": round(pass_rate, 2),
        "duration_seconds": round(duration, 4),
        "success": result.wasSuccessful(),
        "failures_summary": [
            {"test": str(test), "traceback": str(tb)} for test, tb in result.failures
        ],
        "errors_summary": [
            {"test": str(test), "traceback": str(tb)} for test, tb in result.errors
        ]
    }

    if output_json:
        print(json.dumps(report_payload, indent=2))
    else:
        print("-" * 80)
        status_label = "[PASSED]" if result.wasSuccessful() else "[FAILED]"
        print(f"  Result: {status_label} — {passes}/{total_tests} passed ({pass_rate:.1f}%) in {duration:.3f}s")
        print("=" * 80)

    return 0 if result.wasSuccessful() else 1


def main():
    parser = argparse.ArgumentParser(description="CM-LAB E2E Master Test Runner")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3, 4], help="Run a specific tier (1, 2, 3, or 4)")
    parser.add_argument("--all", action="store_true", default=True, help="Run all 4 tiers (default)")
    parser.add_argument("--quiet", action="store_true", help="Reduce output verbosity")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON results")

    args = parser.parse_args()

    if args.tier:
        selected_tiers = [args.tier]
    else:
        selected_tiers = [1, 2, 3, 4]

    exit_code = run_e2e_suite(
        selected_tiers=selected_tiers,
        verbose=not args.quiet,
        output_json=args.json
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
