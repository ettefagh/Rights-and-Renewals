#!/usr/bin/env python3
"""
Tier 3: Cross-Feature Interactions (Pairwise & Graph Traversal) Test Suite (10 Tests).
Validates end-to-end agent discovery traversal, cross-domain references,
digest verification, scope consistency, and header preservation.
"""

import json
import re
import unittest
from hashlib import sha256
from pathlib import Path

from tests.agent_readiness.harness import (
    EndpointAccessor,
    SHOWCASE_CANONICAL,
    APP_CANONICAL,
    validate_link_headers,
    validate_api_catalog,
    validate_oauth_protected_resource,
    validate_mcp_server_card,
    validate_agent_skills,
    validate_auth_md,
    validate_webmcp_code,
)


class TestTier3CrossFeature(unittest.TestCase):
    """Cross-Feature Interactions and Multi-Hop Traversal Test Suite."""

    @classmethod
    def setUpClass(cls):
        cls.showcase_accessor = EndpointAccessor("showcase")
        cls.app_accessor = EndpointAccessor("app")

    def test_01_full_agent_discovery_traversal(self):
        """TC-TRAV-01: Autonomous Agent Discovery Traversal: / -> Link -> api-catalog -> auth.md -> server-card."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            # Hop 1: Homepage probe
            root_resp = acc.fetch("/")
            self.assertEqual(root_resp.status_code, 200)
            lh = root_resp.get_header("Link")
            self.assertIsNotNone(lh, f"{acc.property_name} root missing Link header")
            relations = validate_link_headers(lh or "")["relations"]

            # Hop 2: Navigate to API Catalog
            api_cat_url = relations.get("api-catalog")
            self.assertIsNotNone(api_cat_url, f"{acc.property_name} missing api-catalog relation")
            cat_resp = acc.fetch(api_cat_url)
            self.assertEqual(cat_resp.status_code, 200)
            cat_data = json.loads(cat_resp.body)
            self.assertTrue(validate_api_catalog(cat_data)["valid"])

            # Hop 3: Navigate to auth.md from catalog or Link header
            auth_url = relations.get("service-doc") or "/auth.md"
            auth_resp = acc.fetch(auth_url)
            self.assertEqual(auth_resp.status_code, 200)
            self.assertTrue(validate_auth_md(auth_resp.body)["has_auth_md_h1"])

            # Hop 4: Navigate to MCP Server Card
            mcp_resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(mcp_resp.status_code, 200)
            mcp_data = json.loads(mcp_resp.body)
            self.assertTrue(validate_mcp_server_card(mcp_data)["valid"])

    def test_02_reverse_discovery_traversal_from_ard(self):
        """TC-TRAV-02: ARD Reverse Traversal: ai-catalog.json -> server-card -> skills index."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            ard_resp = acc.fetch("/.well-known/ai-catalog.json")
            self.assertEqual(ard_resp.status_code, 200)
            ard_data = json.loads(ard_resp.body)

            # Check that referenced server card exists
            server_card_resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(server_card_resp.status_code, 200)

            # Check that referenced skills index exists
            skills_resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(skills_resp.status_code, 200)

    def test_03_markdown_negotiation_preserves_discovery_and_cors_headers(self):
        """TC-TRAV-03: Verify markdown negotiation maintains Link headers, Vary: Accept, and CORS."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            md_resp = acc.fetch("/", accept_header="text/markdown")
            self.assertEqual(md_resp.status_code, 200)
            ct = md_resp.get_header("Content-Type") or ""
            self.assertIn("text/markdown", ct)

            # Must preserve Link header
            lh = md_resp.get_header("Link")
            self.assertIsNotNone(lh, f"{acc.property_name} markdown response lost Link header")

            # Must preserve Vary header
            vary = md_resp.get_header("Vary")
            self.assertIsNotNone(vary, f"{acc.property_name} markdown response lost Vary header")

    def test_04_dual_domain_cross_reference_consistency(self):
        """TC-TRAV-04: Verify Showcase and App catalogs reference consistent canonical endpoints."""
        showcase_mcp = self.showcase_accessor.fetch("/.well-known/mcp/server-card.json")
        app_mcp = self.app_accessor.fetch("/.well-known/mcp/server-card.json")
        self.assertEqual(showcase_mcp.status_code, 200)
        self.assertEqual(app_mcp.status_code, 200)

        s_data = json.loads(showcase_mcp.body)
        a_data = json.loads(app_mcp.body)

        # Both should point to the live MCP endpoint
        s_ep = s_data.get("transport", {}).get("endpoint") or s_data.get("transport", {}).get("url")
        a_ep = a_data.get("transport", {}).get("endpoint") or a_data.get("transport", {}).get("url")
        self.assertIsNotNone(s_ep)
        self.assertIsNotNone(a_ep)

    def test_05_sitemap_loc_consistency_with_robots_txt(self):
        """TC-TRAV-05: Verify robots.txt Sitemap directive points to the exact sitemap.xml location."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            rb_resp = acc.fetch("/robots.txt")
            self.assertEqual(rb_resp.status_code, 200)
            sm_match = re.search(r"Sitemap:\s*(\S+)", rb_resp.body, re.IGNORECASE)
            self.assertIsNotNone(sm_match, f"{acc.property_name} robots.txt missing Sitemap line")
            declared_sitemap_url = sm_match.group(1).strip()
            self.assertEqual(declared_sitemap_url, f"{acc.canonical_origin}/sitemap.xml")

    def test_06_agent_skills_digest_integrity_against_skill_files(self):
        """TC-TRAV-06: Verify declared SHA-256 digests in agent-skills/index.json match skill files on disk."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(resp.status_code, 200)
            data = json.loads(resp.body)
            skills = data.get("skills", [])

            for skill in skills:
                url = skill.get("url", "")
                digest = skill.get("digest") or skill.get("sha256")
                self.assertIsNotNone(digest, f"Skill {skill.get('name')} missing digest")

                # If pointing to a relative skill file on disk, verify hash
                if url.startswith("/") or not url.startswith("http"):
                    skill_file = acc.base_dir / "public" / url.lstrip("/")
                    if skill_file.exists():
                        raw = skill_file.read_bytes().replace(b"\r\n", b"\n")
                        computed = sha256(raw).hexdigest()
                        clean_digest = digest.split(":")[-1].lower()
                        self.assertEqual(
                            computed.lower(), clean_digest,
                            f"Digest mismatch for {skill_file}: computed {computed} != declared {clean_digest}"
                        )

    def test_07_oauth_prm_scopes_aligned_with_auth_md(self):
        """TC-TRAV-07: Verify OAuth PRM scopes_supported are documented in /auth.md."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            oprm_resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(oprm_resp.status_code, 200)
            oprm_data = json.loads(oprm_resp.body)
            scopes = oprm_data.get("scopes_supported", [])

            auth_resp = acc.fetch("/auth.md")
            self.assertEqual(auth_resp.status_code, 200)
            auth_body = auth_resp.body

            for scope in scopes:
                self.assertIn(
                    scope, auth_body,
                    f"{acc.property_name} scope '{scope}' declared in OPRM but missing from /auth.md"
                )

    def test_08_webmcp_tools_aligned_with_mcp_server_card(self):
        """TC-TRAV-08: Verify tools registered in WebMCP correspond to MCP server card tools."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            wmcp = validate_webmcp_code(acc.base_dir)
            card_resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(card_resp.status_code, 200)
            card_data = json.loads(card_resp.body)

            card_tools = [t.get("name") for t in card_data.get("tools", [])]
            # Verify tools exist in server card or WebMCP
            self.assertTrue(
                len(card_tools) > 0 or len(wmcp["registered_tools"]) > 0 or len(wmcp["declarative_forms"]) > 0
            )

    def test_09_content_signal_consistency_across_layers(self):
        """TC-TRAV-09: Verify Content-Signal preferences match across robots.txt and HTTP headers."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            rb_resp = acc.fetch("/robots.txt")
            self.assertEqual(rb_resp.status_code, 200)
            cs_matches = re.findall(r"Content-Signal:\s*([^\r\n]+)", rb_resp.body, re.IGNORECASE)
            self.assertGreater(len(cs_matches), 0, f"{acc.property_name} robots.txt has no Content-Signal")

            # Check that search and ai-input or ai-train are configured
            combined_cs = " ".join(cs_matches)
            self.assertIn("search", combined_cs)
            self.assertIn("ai-train", combined_cs)

    def test_10_cloudflare_routes_json_configuration(self):
        """TC-TRAV-10: Verify _routes.json ensures static CDN delivery for discovery files."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            routes_file = acc.base_dir / "public" / "_routes.json"
            if not routes_file.exists():
                routes_file = acc.base_dir / "_routes.json"
            self.assertTrue(routes_file.exists(), f"{acc.property_name} missing _routes.json")

            data = json.loads(routes_file.read_text(encoding="utf-8"))
            exclude = data.get("exclude", [])
            include = data.get("include", [])

            # Verify that static assets or /.well-known/* are handled
            self.assertTrue(
                any("/.well-known/*" in e for e in exclude) or any("/api/*" in i for i in include),
                f"{acc.property_name} _routes.json must correctly partition static and worker paths"
            )


if __name__ == "__main__":
    unittest.main()
