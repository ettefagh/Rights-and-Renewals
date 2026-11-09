#!/usr/bin/env python3
"""
Tier 1: Feature Coverage Test Suite (>=5 tests per feature area across 12 areas).
Validates authoritative requirements for apps/showcase and apps/app.
"""

import json
import re
import unittest
from pathlib import Path

from tests.agent_readiness.harness import (
    DOCS_DIR,
    SHOWCASE_CANONICAL,
    APP_CANONICAL,
    ALL_REQUIRED_AI_BOTS,
    REQUIRED_CONTENT_SIGNALS,
    EndpointAccessor,
    validate_robots_txt,
    validate_sitemap_xml,
    validate_link_headers,
    validate_api_catalog,
    validate_oauth_protected_resource,
    validate_mcp_server_card,
    validate_agent_skills,
    validate_ard_manifest,
    validate_auth_md,
    validate_webmcp_code,
    validate_dns_aid_documentation,
)


class BaseFeatureCoverageTest(unittest.TestCase):
    """Base class for feature coverage tests."""

    @classmethod
    def setUpClass(cls):
        cls.showcase_accessor = EndpointAccessor("showcase")
        cls.app_accessor = EndpointAccessor("app")


class TestTier1Area01_RobotsTxt(BaseFeatureCoverageTest):
    """Feature Area 1: RFC 9309 Robots Exclusion Protocol & AI Crawl Governance."""

    def test_01_showcase_robots_plain_text_and_status_200(self):
        """TC-ROBOTS-01: Verify showcase /robots.txt returns plain text HTTP 200 without HTML."""
        resp = self.showcase_accessor.fetch("/robots.txt")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for showcase robots.txt, got {resp.status_code}")
        ct = resp.get_header("Content-Type") or ""
        self.assertIn("text/plain", ct, f"Expected text/plain Content-Type, got '{ct}'")
        self.assertNotIn("<html", resp.body.lower(), "robots.txt must not return HTML soft-404")

    def test_02_app_robots_plain_text_and_status_200(self):
        """TC-ROBOTS-02: Verify app /robots.txt returns plain text HTTP 200 without HTML."""
        resp = self.app_accessor.fetch("/robots.txt")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for app robots.txt, got {resp.status_code}")
        ct = resp.get_header("Content-Type") or ""
        self.assertIn("text/plain", ct, f"Expected text/plain Content-Type, got '{ct}'")
        self.assertNotIn("<html", resp.body.lower(), "robots.txt must not return HTML soft-404")

    def test_03_explicit_ai_search_crawlers_governed(self):
        """TC-ROBOTS-03: Verify explicit directives for AI Search bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot)."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            val = validate_robots_txt(resp.body)
            for bot in ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]:
                self.assertTrue(
                    any(bot.lower() == ua.lower() for ua in val["user_agents"]),
                    f"{acc.property_name} robots.txt missing explicit User-agent for {bot}"
                )

    def test_04_explicit_ai_training_crawlers_governed(self):
        """TC-ROBOTS-04: Verify explicit directives for AI Training bots (GPTBot, ClaudeBot, Google-Extended)."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            val = validate_robots_txt(resp.body)
            for bot in ["GPTBot", "ClaudeBot", "Google-Extended"]:
                self.assertTrue(
                    any(bot.lower() == ua.lower() for ua in val["user_agents"]),
                    f"{acc.property_name} robots.txt missing explicit User-agent for {bot}"
                )

    def test_05_content_signals_directives_present(self):
        """TC-ROBOTS-05: Verify valid Content-Signal directives for ai-train, search, ai-input."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            val = validate_robots_txt(resp.body)
            self.assertEqual(
                len(val["missing_signals"]), 0,
                f"{acc.property_name} robots.txt missing required Content-Signals: {val['missing_signals']}"
            )

    def test_06_canonical_sitemap_reference_present(self):
        """TC-ROBOTS-06: Verify Sitemap: directive references canonical sitemap.xml."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/robots.txt")
            val = validate_robots_txt(resp.body)
            self.assertTrue(val["has_sitemap"], f"{acc.property_name} robots.txt missing Sitemap directive")
            expected_sitemap = f"{acc.canonical_origin}/sitemap.xml"
            self.assertTrue(
                any(expected_sitemap in sm for sm in val["sitemaps"]),
                f"{acc.property_name} robots.txt Sitemap directive does not match {expected_sitemap}"
            )


class TestTier1Area02_SitemapXml(BaseFeatureCoverageTest):
    """Feature Area 2: Sitemaps Protocol (sitemaps.org)."""

    def test_01_showcase_sitemap_xml_schema_valid(self):
        """TC-SITEMAP-01: Verify showcase /sitemap.xml has valid XML with sitemaps.org 0.9 schema."""
        resp = self.showcase_accessor.fetch("/sitemap.xml")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for showcase sitemap.xml, got {resp.status_code}")
        val = validate_sitemap_xml(resp.body, SHOWCASE_CANONICAL)
        self.assertTrue(val["valid_xml"], f"Showcase sitemap.xml invalid: {val.get('error')}")
        self.assertGreater(val["url_count"], 0, "Showcase sitemap.xml must have >= 1 URL")

    def test_02_app_sitemap_xml_schema_valid(self):
        """TC-SITEMAP-02: Verify app /sitemap.xml has valid XML with sitemaps.org 0.9 schema."""
        resp = self.app_accessor.fetch("/sitemap.xml")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for app sitemap.xml, got {resp.status_code}")
        val = validate_sitemap_xml(resp.body, APP_CANONICAL)
        self.assertTrue(val["valid_xml"], f"App sitemap.xml invalid: {val.get('error')}")
        self.assertGreater(val["url_count"], 0, "App sitemap.xml must have >= 1 URL")

    def test_03_canonical_urls_match_domain_origins(self):
        """TC-SITEMAP-03: Verify all <loc> tags are absolute canonical URLs matching their domain."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/sitemap.xml")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} sitemap.xml returned status {resp.status_code}")
            val = validate_sitemap_xml(resp.body, acc.canonical_origin)
            self.assertEqual(
                len(val["invalid_origin_urls"]), 0,
                f"{acc.property_name} sitemap.xml has non-canonical URLs: {val['invalid_origin_urls']}"
            )

    def test_04_lastmod_iso8601_format(self):
        """TC-SITEMAP-04: Verify <lastmod> entries adhere to ISO 8601 YYYY-MM-DD format."""
        iso_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/sitemap.xml")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} sitemap.xml returned status {resp.status_code}")
            val = validate_sitemap_xml(resp.body, acc.canonical_origin)
            for entry in val["urls"]:
                if "lastmod" in entry:
                    self.assertTrue(
                        iso_pattern.match(entry["lastmod"]),
                        f"Invalid lastmod '{entry['lastmod']}' in {acc.property_name} sitemap"
                    )

    def test_05_canonical_root_presence(self):
        """TC-SITEMAP-05: Verify homepage URL (/) is explicitly declared in sitemap.xml."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/sitemap.xml")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} sitemap.xml returned status {resp.status_code}")
            val = validate_sitemap_xml(resp.body, acc.canonical_origin)
            self.assertTrue(
                val["has_canonical_root"],
                f"{acc.property_name} sitemap.xml missing root canonical entry '{acc.canonical_origin}/'"
            )


class TestTier1Area03_LinkHeaders(BaseFeatureCoverageTest):
    """Feature Area 3: RFC 8288 Web Linking Response Headers on Homepage."""

    def test_01_showcase_homepage_emits_link_header(self):
        """TC-LINK-01: Verify showcase GET / emits RFC 8288 Link response header."""
        resp = self.showcase_accessor.fetch("/")
        lh = resp.get_header("Link")
        self.assertIsNotNone(lh, "Showcase GET / must emit Link header")
        val = validate_link_headers(lh or "")
        self.assertTrue(val["has_link"], "Link header must contain at least one valid relation")

    def test_02_app_homepage_emits_link_header(self):
        """TC-LINK-02: Verify app GET / emits RFC 8288 Link response header."""
        resp = self.app_accessor.fetch("/")
        lh = resp.get_header("Link")
        self.assertIsNotNone(lh, "App GET / must emit Link header")
        val = validate_link_headers(lh or "")
        self.assertTrue(val["has_link"], "Link header must contain at least one valid relation")

    def test_03_link_header_rel_api_catalog(self):
        """TC-LINK-03: Verify Link header contains rel='api-catalog' pointing to /.well-known/api-catalog."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/")
            lh = resp.get_header("Link") or ""
            val = validate_link_headers(lh)
            self.assertTrue(val["has_api_catalog"], f"{acc.property_name} Link header missing rel='api-catalog'")
            self.assertIn("/.well-known/api-catalog", val["relations"].get("api-catalog", ""))

    def test_04_link_header_rel_service_doc(self):
        """TC-LINK-04: Verify Link header contains rel='service-doc' pointing to documentation or /auth.md."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/")
            lh = resp.get_header("Link") or ""
            val = validate_link_headers(lh)
            self.assertTrue(val["has_service_doc"], f"{acc.property_name} Link header missing rel='service-doc'")

    def test_05_vary_accept_header_emitted(self):
        """TC-LINK-05: Verify Vary: Accept response header is emitted on homepage to protect edge caches."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/")
            vary = resp.get_header("Vary")
            self.assertIsNotNone(vary, f"{acc.property_name} GET / must emit Vary header")
            self.assertIn("Accept", vary, f"{acc.property_name} Vary header must include 'Accept'")


class TestTier1Area04_MarkdownNegotiation(BaseFeatureCoverageTest):
    """Feature Area 4: HTTP Content Negotiation (Markdown for Agents)."""

    def test_01_showcase_negotiates_markdown_on_accept(self):
        """TC-MD-01: Verify showcase returns HTTP 200 text/markdown when Accept: text/markdown is sent."""
        resp = self.showcase_accessor.fetch("/", accept_header="text/markdown")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for markdown request, got {resp.status_code}")
        ct = resp.get_header("Content-Type") or ""
        self.assertIn("text/markdown", ct, f"Expected text/markdown Content-Type, got '{ct}'")

    def test_02_app_negotiates_markdown_on_accept(self):
        """TC-MD-02: Verify app returns HTTP 200 text/markdown when Accept: text/markdown is sent."""
        resp = self.app_accessor.fetch("/", accept_header="text/markdown")
        self.assertEqual(resp.status_code, 200, f"Expected 200 for markdown request, got {resp.status_code}")
        ct = resp.get_header("Content-Type") or ""
        self.assertIn("text/markdown", ct, f"Expected text/markdown Content-Type, got '{ct}'")

    def test_03_markdown_response_contains_structured_body(self):
        """TC-MD-03: Verify negotiated markdown body is non-empty and structured with headings."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header="text/markdown")
            self.assertGreater(len(resp.body.strip()), 50, f"{acc.property_name} markdown response too short")
            self.assertTrue(resp.body.startswith("#") or "---" in resp.body, f"{acc.property_name} missing markdown structure")

    def test_04_default_browser_receives_html(self):
        """TC-MD-04: Verify standard browser requests without Accept: text/markdown receive HTML."""
        browser_accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8"
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header=browser_accept)
            self.assertEqual(resp.status_code, 200)
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("text/html", ct, f"{acc.property_name} browser request must return text/html")

    def test_05_markdown_response_preserves_discovery_link_headers(self):
        """TC-MD-05: Verify negotiated markdown response still emits RFC 8288 Link headers."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/", accept_header="text/markdown")
            lh = resp.get_header("Link") or ""
            val = validate_link_headers(lh)
            self.assertTrue(val["has_api_catalog"], f"{acc.property_name} markdown response missing api-catalog Link")


class TestTier1Area05_ApiCatalog(BaseFeatureCoverageTest):
    """Feature Area 5: RFC 9727 API Catalog Linkset (/.well-known/api-catalog)."""

    def test_01_api_catalog_content_type_linkset_json(self):
        """TC-CAT-01: Verify /.well-known/api-catalog returns application/linkset+json."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/api-catalog")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} api-catalog returned status {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("application/linkset+json", ct, f"{acc.property_name} wrong Content-Type: '{ct}'")

    def test_02_api_catalog_linkset_array_structure(self):
        """TC-CAT-02: Verify root object contains a valid 'linkset' array."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/api-catalog")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} api-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_api_catalog(data)
            self.assertTrue(val["valid"], f"{acc.property_name} invalid linkset: {val.get('error')}")

    def test_03_linkset_contains_service_desc_relation(self):
        """TC-CAT-03: Verify linkset contains service-desc relation pointing to server card or schema."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/api-catalog")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} api-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_api_catalog(data)
            self.assertTrue(val["has_service_desc"], f"{acc.property_name} linkset missing service-desc")

    def test_04_linkset_contains_service_doc_relation(self):
        """TC-CAT-04: Verify linkset contains service-doc relation pointing to documentation."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/api-catalog")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} api-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_api_catalog(data)
            self.assertTrue(val["has_service_doc"], f"{acc.property_name} linkset missing service-doc")

    def test_05_api_catalog_cors_allow_origin(self):
        """TC-CAT-05: Verify api-catalog permits cross-origin requests via Access-Control-Allow-Origin: *."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/api-catalog")
            cors = resp.get_header("Access-Control-Allow-Origin")
            self.assertEqual(cors, "*", f"{acc.property_name} api-catalog missing CORS: *")


class TestTier1Area06_OAuthProtectedResource(BaseFeatureCoverageTest):
    """Feature Area 6: RFC 9728 OAuth Protected Resource Metadata."""

    def test_01_oauth_prm_status_and_content_type(self):
        """TC-OPRM-01: Verify /.well-known/oauth-protected-resource returns HTTP 200 application/json."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} OPRM returned {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("application/json", ct, f"{acc.property_name} wrong Content-Type: '{ct}'")

    def test_02_oauth_prm_resource_matches_origin(self):
        """TC-OPRM-02: Verify resource field matches the canonical property origin."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} OPRM returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_oauth_protected_resource(data, acc.canonical_origin)
            self.assertTrue(val["resource_matches_origin"], f"{acc.property_name} resource mismatch: {val['resource']}")

    def test_03_oauth_prm_authorization_servers_array(self):
        """TC-OPRM-03: Verify authorization_servers is a non-empty array of URLs."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} OPRM returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_oauth_protected_resource(data, acc.canonical_origin)
            self.assertGreater(len(val["authorization_servers"]), 0, f"{acc.property_name} empty auth servers")

    def test_04_oauth_prm_scopes_supported_defined(self):
        """TC-OPRM-04: Verify scopes_supported contains domain-specific OAuth scopes."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} OPRM returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_oauth_protected_resource(data, acc.canonical_origin)
            self.assertGreater(len(val["scopes_supported"]), 0, f"{acc.property_name} empty scopes_supported")

    def test_05_oauth_prm_bearer_methods_supported_header(self):
        """TC-OPRM-05: Verify bearer_methods_supported includes 'header'."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/oauth-protected-resource")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} OPRM returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_oauth_protected_resource(data, acc.canonical_origin)
            self.assertIn("header", val["bearer_methods_supported"], f"{acc.property_name} missing 'header' bearer method")


class TestTier1Area07_AuthMd(BaseFeatureCoverageTest):
    """Feature Area 7: Agent Authentication & Registration Guidance (/auth.md)."""

    def test_01_auth_md_status_and_content_type(self):
        """TC-AUTH-01: Verify /auth.md returns HTTP 200 with text/markdown."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/auth.md")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} /auth.md returned {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("text/markdown", ct, f"{acc.property_name} wrong Content-Type: '{ct}'")

    def test_02_auth_md_strict_h1_title(self):
        """TC-AUTH-02: Verify first H1 heading strictly contains 'auth.md' (isitagentready requirement)."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/auth.md")
            val = validate_auth_md(resp.body)
            self.assertTrue(val["has_auth_md_h1"], f"{acc.property_name} H1 missing 'auth.md': '{val['first_h1']}'")

    def test_03_auth_md_registration_flow_guidance(self):
        """TC-AUTH-03: Verify /auth.md provides instructions for agent registration and authentication."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/auth.md")
            val = validate_auth_md(resp.body)
            self.assertTrue(val["has_registration_flow"], f"{acc.property_name} missing registration flow guidance")

    def test_04_auth_md_documents_token_usage(self):
        """TC-AUTH-04: Verify /auth.md explains Bearer token authorization header."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/auth.md")
            self.assertIn("Bearer", resp.body, f"{acc.property_name} /auth.md must describe Bearer token header")

    def test_05_auth_md_documents_supported_scopes(self):
        """TC-AUTH-05: Verify /auth.md documents supported OAuth scopes."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/auth.md")
            val = validate_auth_md(resp.body)
            self.assertTrue(val["has_scopes"], f"{acc.property_name} /auth.md must document supported scopes")


class TestTier1Area08_McpServerCard(BaseFeatureCoverageTest):
    """Feature Area 8: SEP-1649 MCP Server Card (/.well-known/mcp/server-card.json)."""

    def test_01_server_card_status_and_content_type(self):
        """TC-MCP-01: Verify /.well-known/mcp/server-card.json returns HTTP 200 application/json."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} server-card returned {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("application/json", ct)

    def test_02_server_card_server_info_object(self):
        """TC-MCP-02: Verify serverInfo contains name, version, and description."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} server-card returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_mcp_server_card(data)
            self.assertTrue(val["valid"], f"{acc.property_name} server-card invalid: {val.get('error')}")
            self.assertIsNotNone(val["server_name"])

    def test_03_server_card_transport_endpoint(self):
        """TC-MCP-03: Verify transport declares endpoint and streamable-http/sse type."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} server-card returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_mcp_server_card(data)
            self.assertIn(val["transport_type"], ["streamable-http", "sse", "http-post"])

    def test_04_server_card_capabilities_tools(self):
        """TC-MCP-04: Verify capabilities declares tools capability."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/mcp/server-card.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} server-card returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_mcp_server_card(data)
            self.assertTrue(val["has_tools"], f"{acc.property_name} server-card missing tools capability")

    def test_05_server_card_cors_header(self):
        """TC-MCP-05: Verify server-card.json provides Access-Control-Allow-Origin: *."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/mcp/server-card.json")
            cors = resp.get_header("Access-Control-Allow-Origin")
            self.assertEqual(cors, "*", f"{acc.property_name} server-card missing CORS: *")


class TestTier1Area09_AgentSkillsIndex(BaseFeatureCoverageTest):
    """Feature Area 9: Cloudflare Agent Skills Discovery (/.well-known/agent-skills/index.json)."""

    def test_01_skills_index_status_and_content_type(self):
        """TC-SKILLS-01: Verify agent-skills/index.json returns HTTP 200 application/json."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} skills index returned {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("application/json", ct)

    def test_02_skills_array_non_empty(self):
        """TC-SKILLS-02: Verify skills array contains at least 1 declared skill."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} skills index returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_agent_skills(data, acc.base_dir)
            self.assertGreater(val["skills_count"], 0, f"{acc.property_name} empty skills array")

    def test_03_skills_fields_structure(self):
        """TC-SKILLS-03: Verify each skill defines name, type, description, and url."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} skills index returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_agent_skills(data, acc.base_dir)
            for skill in val["skills"]:
                self.assertIsNotNone(skill["name"], "Skill missing name")
                self.assertIsNotNone(skill["type"], "Skill missing type")
                self.assertIsNotNone(skill["url"], "Skill missing url")

    def test_04_skills_sha256_digest_format(self):
        """TC-SKILLS-04: Verify each skill provides a valid 64-char hex SHA-256 digest."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} skills index returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_agent_skills(data, acc.base_dir)
            for skill in val["skills"]:
                self.assertTrue(skill["is_digest_format"], f"Invalid digest format for {skill['name']}: {skill['digest']}")

    def test_05_skills_cors_header(self):
        """TC-SKILLS-05: Verify agent-skills endpoints emit Access-Control-Allow-Origin: *."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/agent-skills/index.json")
            cors = resp.get_header("Access-Control-Allow-Origin")
            self.assertEqual(cors, "*", f"{acc.property_name} skills index missing CORS: *")


class TestTier1Area10_ArdAiCatalog(BaseFeatureCoverageTest):
    """Feature Area 10: Agentic Resource Discovery Manifest (/.well-known/ai-catalog.json)."""

    def test_01_ard_status_and_content_type(self):
        """TC-ARD-01: Verify /.well-known/ai-catalog.json returns HTTP 200 application/json."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/ai-catalog.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} ai-catalog returned {resp.status_code}")
            ct = resp.get_header("Content-Type") or ""
            self.assertIn("application/json", ct)

    def test_02_ard_cors_allow_origin_star(self):
        """TC-ARD-02: Verify ARD manifest emits Access-Control-Allow-Origin: * header."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/ai-catalog.json")
            cors = resp.get_header("Access-Control-Allow-Origin")
            self.assertEqual(cors, "*", f"{acc.property_name} ARD manifest missing CORS: *")

    def test_03_ard_host_metadata_defined(self):
        """TC-ARD-03: Verify manifest defines host or identifying organization metadata."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/ai-catalog.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} ai-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_ard_manifest(data)
            self.assertTrue(val["has_host_or_name"], f"{acc.property_name} ARD manifest missing host/name")

    def test_04_ard_entries_non_empty(self):
        """TC-ARD-04: Verify entries array contains at least 1 resource entry."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/ai-catalog.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} ai-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_ard_manifest(data)
            self.assertGreater(val["entry_count"], 0, f"{acc.property_name} ARD manifest entries empty")

    def test_05_ard_spec_entry_single_url_or_data(self):
        """TC-ARD-05: Verify ARD §3.4 rule: entries must contain exactly one of 'url' or 'data'."""
        for acc in [self.showcase_accessor, self.app_accessor]:
            resp = acc.fetch("/.well-known/ai-catalog.json")
            self.assertEqual(resp.status_code, 200, f"{acc.property_name} ai-catalog returned status {resp.status_code}")
            data = json.loads(resp.body)
            val = validate_ard_manifest(data)
            self.assertTrue(val["entries_valid"], f"{acc.property_name} ARD entries violate url/data uniqueness rule")


class TestTier1Area11_WebMcpBrowserIntegration(BaseFeatureCoverageTest):
    """Feature Area 11: W3C WebMCP In-Browser Integration."""

    def test_01_showcase_has_webmcp_integration(self):
        """TC-WMCP-01: Verify showcase integrates WebMCP via programmatic or declarative forms."""
        val = validate_webmcp_code(self.showcase_accessor.base_dir)
        self.assertTrue(val["valid"], "Showcase must implement WebMCP integration")

    def test_02_app_has_webmcp_integration(self):
        """TC-WMCP-02: Verify app integrates WebMCP via programmatic or declarative forms."""
        val = validate_webmcp_code(self.app_accessor.base_dir)
        self.assertTrue(val["valid"], "App must implement WebMCP integration")

    def test_03_showcase_registers_policy_lookup_tool(self):
        """TC-WMCP-03: Verify showcase registers consumer rights policy tools."""
        val = validate_webmcp_code(self.showcase_accessor.base_dir)
        tools = [t.lower() for t in val["registered_tools"]]
        has_tool = any("policy" in t or "rights" in t for t in tools) or len(val["declarative_forms"]) > 0
        self.assertTrue(has_tool, f"Showcase missing policy tools: {val['registered_tools']}")

    def test_04_app_declarative_form_attributes_present(self):
        """TC-WMCP-04: Verify app provides declarative form toolname attributes."""
        val = validate_webmcp_code(self.app_accessor.base_dir)
        self.assertTrue(
            val["has_declarative"] or val["has_programmatic"],
            "App must provide declarative or programmatic WebMCP tools"
        )

    def test_05_app_registers_vault_or_notice_tools(self):
        """TC-WMCP-05: Verify app registers vault, notice, or deadline calculation tools."""
        val = validate_webmcp_code(self.app_accessor.base_dir)
        tools = [t.lower() for t in val["registered_tools"]]
        has_domain_tool = any(
            any(k in t for k in ["vault", "timeline", "notice", "claim", "tax", "policy"])
            for t in tools
        ) or len(val["declarative_forms"]) > 0
        self.assertTrue(has_domain_tool, f"App missing domain tools: {val['registered_tools']}")


class TestTier1Area12_DnsAidDocumentation(BaseFeatureCoverageTest):
    """Feature Area 12: DNS for AI Discovery (DNS-AID) & DNSSEC Documentation."""

    def setUp(self):
        self.doc_path = DOCS_DIR / "DNS_AID_ZONE_CONFIGURATION.md"

    def test_01_dns_aid_document_exists(self):
        """TC-DNS-01: Verify docs/DNS_AID_ZONE_CONFIGURATION.md exists."""
        self.assertTrue(self.doc_path.exists(), f"Missing {self.doc_path}")

    def test_02_documents_rfc_9460_svcb_https_records(self):
        """TC-DNS-02: Verify document includes RFC 9460 HTTPS/SVCB DNS records."""
        val = validate_dns_aid_documentation(self.doc_path)
        self.assertTrue(val["has_svcb_or_https"], "DNS-AID doc missing HTTPS/SVCB records")

    def test_03_documents_agents_namespace_subdomains(self):
        """TC-DNS-03: Verify document defines _agents namespace subdomains (_index, _mcp, etc.)."""
        val = validate_dns_aid_documentation(self.doc_path)
        self.assertTrue(val["has_agents_namespace"], "DNS-AID doc missing _agents namespace")

    def test_04_documents_dnssec_signing_parameters(self):
        """TC-DNS-04: Verify document specifies DNSSEC parameters (Algorithm 13 / DS records)."""
        val = validate_dns_aid_documentation(self.doc_path)
        self.assertTrue(val["has_dnssec"], "DNS-AID doc missing DNSSEC parameters")

    def test_05_documents_doh_validation_with_ad_bit(self):
        """TC-DNS-05: Verify document details DNS-over-HTTPS queries with Authenticated Data (AD=true)."""
        content = self.doc_path.read_text(encoding="utf-8") if self.doc_path.exists() else ""
        self.assertTrue(
            "AD" in content or "dns-query" in content or "doh" in content.lower(),
            "DNS-AID doc missing DoH verification guidance"
        )


if __name__ == "__main__":
    unittest.main()
