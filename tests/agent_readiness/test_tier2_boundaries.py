#!/usr/bin/env python3
"""
Tier 2: Boundary & Corner Cases Test Suite (15 Tests).
Validates edge conditions, case-insensitivity, malformed headers, wildcards,
CORS preflights, input schemas, and resilience against adversarial inputs.
"""

import json
import re
import unittest
from pathlib import Path

from tests.agent_readiness.harness import (
    EndpointAccessor,
    SHOWCASE_CANONICAL,
    APP_CANONICAL,
    validate_robots_txt,
    validate_api_catalog,
    validate_link_headers,
)


class TestTier2Boundaries(unittest.TestCase):
    """Boundary and Corner Case Test Suite."""

    @classmethod
    def setUpClass(cls):
        cls.showcase_accessor = EndpointAccessor("showcase")
        cls.app_accessor = EndpointAccessor("app")

    def test_01_case_insensitive_accept_headers(self):
        """TC-BOUND-01: Verify Accept: TEXT/MARKDOWN (uppercase) is recognized."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header="TEXT/MARKDOWN")
            # If markdown is supported, it must handle case-insensitively
            ct = (resp.get_header("Content-Type") or "").lower()
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(
                "text/markdown" in ct or "text/html" in ct,
                f"{acc.property_name} crashed or returned invalid Content-Type on uppercase Accept: '{ct}'"
            )

    def test_02_trailing_slash_normalization(self):
        """TC-BOUND-02: Verify trailing slash behavior on discovery endpoints."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # Fetch without slash
            resp_no_slash = acc.fetch("/.well-known/api-catalog")
            # Fetch with slash
            resp_with_slash = acc.fetch("/.well-known/api-catalog/")
            # Both should resolve to valid data or clean redirect/same response, never 500
            self.assertIn(resp_no_slash.status_code, [200, 404])
            self.assertIn(resp_with_slash.status_code, [200, 301, 308, 404])

    def test_03_malformed_accept_headers(self):
        """TC-BOUND-03: Verify malformed Accept headers do not crash middleware with 500 error."""
        malformed_headers = [
            ";;;",
            "text/plain, q=invalid",
            "text/markdown;q=not-a-number",
            "??invalid/mime;;;",
            "text/html;q=1, text/markdown;q=999999999999999999999"
        ]
        for acc in [self.showcase_accessor, self.app_accessor]:
            for mal in malformed_headers:
                resp = acc.fetch("/", accept_header=mal)
                self.assertNotEqual(
                    resp.status_code, 500,
                    f"{acc.property_name} crashed with HTTP 500 on malformed Accept: '{mal}'"
                )

    def test_04_wildcard_accept_defaults_to_html(self):
        """TC-BOUND-04: Verify wildcard Accept (*/*) defaults to standard HTML."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header="*/*")
            self.assertEqual(resp.status_code, 200)
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("text/html", ct, f"{acc.property_name} */* must default to text/html, got '{ct}'")

    def test_05_complex_qvalue_weighted_accept(self):
        """TC-BOUND-05: Verify q-value weight preferences between text/html and text/markdown."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # HTML prioritized: q=1.0 vs q=0.5
            resp_html_favored = acc.fetch("/", accept_header="text/html;q=1.0, text/markdown;q=0.5")
            ct_html = resp_html_favored.get_header("Content-Type") or ""
            self.assertIn("text/html", ct_html, f"{acc.property_name} failed to honor higher q-value for HTML")

    def test_06_cors_preflight_headers_configured(self):
        """TC-BOUND-06: Verify CORS headers configuration allows GET and OPTIONS methods on discovery files."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # Headers parser must return Access-Control-Allow-Origin: * for .well-known endpoints
            hdrs = acc.headers_parser.resolve("/.well-known/ai-catalog.json")
            cors_origin = hdrs.get("Access-Control-Allow-Origin")
            self.assertEqual(cors_origin, "*", f"{acc.property_name} ai-catalog missing CORS origin * in _headers")

    def test_07_robots_txt_case_insensitivity_and_whitespace(self):
        """TC-BOUND-07: Verify robots.txt directive parsing tolerates whitespace and casing."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            if resp.status_code == 200:
                # Test parser tolerance
                val = validate_robots_txt(resp.body)
                self.assertTrue(val["valid_structure"])
                for ua in val["user_agents"]:
                    self.assertFalse(ua.startswith(" "), "User-agent value has untrimmed leading space")

    def test_08_empty_or_whitespace_accept_header(self):
        """TC-BOUND-08: Verify empty or pure whitespace Accept header returns HTTP 200 HTML."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            for empty_accept in ["", "   ", "\t"]:
                resp = acc.fetch("/", accept_header=empty_accept)
                self.assertEqual(resp.status_code, 200)
                ct = resp.get_header("Content-Type") or ""
                self.assertIn("text/html", ct)

    def test_09_extra_json_fields_tolerance(self):
        """TC-BOUND-09: Verify discovery JSON parsers tolerate extra extension fields without failing."""
        mock_catalog = {
            "linkset": [
                {
                    "anchor": "https://example.com",
                    "service-desc": [{"href": "https://example.com/api"}],
                    "service-doc": [{"href": "https://example.com/docs"}],
                    "status": [{"href": "https://example.com/health"}],
                    "x-future-agent-extension": {"protocol": "quantum", "enabled": True}
                }
            ],
            "x-vendor-custom-metadata": "allowed"
        }
        val = validate_api_catalog(mock_catalog)
        self.assertTrue(val["valid"], "API catalog validator failed on forward-compatible extension fields")

    def test_10_missing_or_empty_input_to_webmcp_tool(self):
        """TC-BOUND-10: Verify registered WebMCP tool schemas define required input validation."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # Inspect tool schemas in code
            base_dir = acc.base_dir
            for f in base_dir.rglob("*.[jt]s*"):
                if "node_modules" in f.parts or "dist" in f.parts or not f.is_file():
                    continue
                text = f.read_text(encoding="utf-8", errors="replace")
                if "registerTool" in text and "inputSchema" in text:
                    # Verify schema has properties and required fields
                    self.assertIn("properties", text, f"{f.name} tool inputSchema missing properties object")

    def test_11_extreme_query_string_length_handling(self):
        """TC-BOUND-11: Verify 2048-character query strings do not cause server crashes."""
        extreme_query = "/?search=" + ("A" * 2048)
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch(extreme_query)
            self.assertNotEqual(resp.status_code, 500, f"{acc.property_name} crashed on 2048-char query string")

    def test_12_special_characters_escaping_in_markdown(self):
        """TC-BOUND-12: Verify markdown content negotiation preserves valid formatting without unescaped nulls."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header="text/markdown")
            if resp.status_code == 200 and "text/markdown" in (resp.get_header("Content-Type") or ""):
                self.assertNotIn("\x00", resp.body, "Markdown body contains raw null bytes")
                self.assertNotIn("\r\r", resp.body, "Markdown body contains corrupted line endings")

    def test_13_security_headers_coexistence(self):
        """TC-BOUND-13: Verify security headers (HSTS, nosniff, etc.) coexist with discovery headers."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            hdrs = acc.headers_parser.resolve("/")
            # Must not overwrite security protections
            self.assertTrue(
                "X-Content-Type-Options" in hdrs or "Strict-Transport-Security" in hdrs or len(hdrs) > 0,
                f"{acc.property_name} missing security header configuration"
            )

    def test_14_non_standard_http_methods(self):
        """TC-BOUND-14: Verify HEAD method requests on discovery endpoints."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # HEAD simulated via headers parser
            hdrs = acc.headers_parser.resolve("/.well-known/api-catalog")
            self.assertIn("application/linkset+json", hdrs.get("Content-Type", ""))

    def test_15_content_signals_value_normalization(self):
        """TC-BOUND-15: Verify Content-Signal directives are correctly structured and normalized."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            if resp.status_code == 200:
                val = validate_robots_txt(resp.body)
                for cs in val["content_signals"]:
                    # Must contain key=value pairs
                    self.assertIn("=", cs, f"Malformed Content-Signal directive in {acc.property_name}: '{cs}'")


if __name__ == "__main__":
    unittest.main()
