#!/usr/bin/env python3
"""
Tier 4: Real-World Scenarios (isitagentready.com 23-Check Audit Emulation).
Executes complete automated passive probe, header analysis, schema validation,
and readiness level calculation (Level 0 to 5) for apps/showcase and apps/app.
"""

import json
import unittest
from typing import Dict, Any

from tests.agent_readiness.harness import (
    EndpointAccessor,
    run_isitagentready_audit,
    SHOWCASE_CANONICAL,
    APP_CANONICAL,
)


class TestTier4AuditEmulation(unittest.TestCase):
    """Full 23-Check Audit Emulation matching isitagentready.com."""

    @classmethod
    def setUpClass(cls):
        cls.showcase_accessor = EndpointAccessor("showcase")
        cls.app_accessor = EndpointAccessor("app")
        cls.showcase_audit = run_isitagentready_audit(cls.showcase_accessor)
        cls.app_audit = run_isitagentready_audit(cls.app_accessor)

    def test_01_audit_completes_all_23_checks_for_showcase(self):
        """TC-AUDIT-01: Verify audit engine executes exactly 23 checks for apps/showcase."""
        self.assertEqual(
            self.showcase_audit["total_checks"], 23,
            f"Expected 23 checks for showcase, got {self.showcase_audit['total_checks']}"
        )

    def test_02_audit_completes_all_23_checks_for_app(self):
        """TC-AUDIT-02: Verify audit engine executes exactly 23 checks for apps/app."""
        self.assertEqual(
            self.app_audit["total_checks"], 23,
            f"Expected 23 checks for app, got {self.app_audit['total_checks']}"
        )

    def test_03_discoverability_category_checks(self):
        """TC-AUDIT-03: Verify Discoverability checks (robotsTxt, sitemap, linkHeaders, dnsAid)."""
        required_checks = ["robotsTxt", "sitemap", "linkHeaders", "dnsAid"]
        for audit in [self.showcase_audit, self.app_audit]:
            check_map = {c["check_id"]: c for c in audit["checks"]}
            for cid in required_checks:
                self.assertIn(cid, check_map, f"Missing {cid} in {audit['property']} audit")
                res = check_map[cid]
                self.assertIn(res["status"], ["pass", "fail"])

    def test_04_content_accessibility_markdown_negotiation(self):
        """TC-AUDIT-04: Verify Content Accessibility check (markdownNegotiation)."""
        for audit in [self.showcase_audit, self.app_audit]:
            check_map = {c["check_id"]: c for c in audit["checks"]}
            self.assertIn("markdownNegotiation", check_map)
            res = check_map["markdownNegotiation"]
            self.assertEqual(res["category"], "contentAccessibility")

    def test_05_bot_access_control_category_checks(self):
        """TC-AUDIT-05: Verify Bot Access Control checks (robotsTxtAiRules, contentSignals, webBotAuth)."""
        required_checks = ["robotsTxtAiRules", "contentSignals", "webBotAuth"]
        for audit in [self.showcase_audit, self.app_audit]:
            check_map = {c["check_id"]: c for c in audit["checks"]}
            for cid in required_checks:
                self.assertIn(cid, check_map, f"Missing {cid} in {audit['property']} audit")

    def test_06_protocol_discovery_category_checks(self):
        """TC-AUDIT-06: Verify Protocol Discovery checks (apiCatalog, oauthProtectedResource, authMd, mcpServerCard, agentSkills, webMcp, ard)."""
        required_checks = [
            "apiCatalog",
            "oauthProtectedResource",
            "authMd",
            "mcpServerCard",
            "agentSkills",
            "webMcp",
            "ard"
        ]
        for audit in [self.showcase_audit, self.app_accessor]:
            # Inspect audit or run checks
            pass

        for audit in [self.showcase_audit, self.app_audit]:
            check_map = {c["check_id"]: c for c in audit["checks"]}
            for cid in required_checks:
                self.assertIn(cid, check_map, f"Missing {cid} in {audit['property']} audit")

    def test_07_commerce_checks_evaluate_neutral(self):
        """TC-AUDIT-07: Verify Commerce checks (x402, mpp, ucp, acp, ap2) evaluate to neutral."""
        commerce_ids = ["x402", "mpp", "ucp", "acp", "ap2"]
        for audit in [self.showcase_audit, self.app_audit]:
            check_map = {c["check_id"]: c for c in audit["checks"]}
            for cid in commerce_ids:
                self.assertIn(cid, check_map)
                self.assertEqual(
                    check_map[cid]["status"], "neutral",
                    f"Commerce check {cid} must be neutral for non-commerce site, got {check_map[cid]['status']}"
                )

    def test_08_readiness_level_classification_range(self):
        """TC-AUDIT-08: Verify readiness level is computed in standard range [0, 5]."""
        for audit in [self.showcase_audit, self.app_audit]:
            level = audit["readiness_level"]
            self.assertIn(
                level, [0, 1, 2, 3, 4, 5],
                f"Invalid readiness level {level} in {audit['property']}"
            )
            self.assertIsNotNone(audit["readiness_level_name"])

    def test_09_audit_json_serializable(self):
        """TC-AUDIT-09: Verify audit report is clean JSON serializable matching API contract."""
        for audit in [self.showcase_audit, self.app_audit]:
            try:
                dumped = json.dumps(audit, indent=2)
                self.assertGreater(len(dumped), 100)
            except Exception as e:
                self.fail(f"Failed to serialize audit report to JSON: {e}")

    def test_10_audit_gap_analysis_reporting(self):
        """TC-AUDIT-10: Verify audit report produces detailed actionable diagnostic text for any failed check."""
        for audit in [self.showcase_audit, self.app_audit]:
            for check in audit["checks"]:
                self.assertTrue(len(check["details"]) > 0, f"Check {check['check_id']} has empty details")
                if check["status"] == "fail":
                    # Must contain diagnostic info
                    self.assertTrue(
                        any(w in check["details"].lower() for w in ["expected", "missing", "status", "failed", "no ", "invalid", "not"]),
                        f"Insufficient diagnostic info for failed check {check['check_id']}: {check['details']}"
                    )


if __name__ == "__main__":
    unittest.main()
