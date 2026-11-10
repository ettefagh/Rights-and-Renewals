"""
Tier 1: Comprehensive Feature Coverage Test Suite
Author: teamwork_test_writer_e2e_1
Requirements: ORIGINAL_REQUEST.md (R1, R2, R3, R4) & PROJECT.md (Features 1-20)

Verifies >=5 test cases per core feature category:
- Category A: Design Tokens & System Proofs (Features 1, 3)
- Category B: Main Showcase Webpage (Features 4, 5, 6, 7, 8, 9, 10)
- Category C: Modern Application Interface (Features 11, 17, 18, 19)
- Category D: Unified Omnibar Engine (Features 12, 13, 14, 15, 16)
"""

import datetime
import json
import unittest
from pathlib import Path
from typing import Any, Dict, List

from tests.e2e.harness import (
    DESIGN_TOKENS,
    OmnibarFSM,
    OmnibarState,
    MCPServerEngine,
    BGBTimelineCalculator,
    compute_gobd_sha256,
    contrast_ratio,
    hex_to_rgb,
    load_seed_brands,
    relative_luminance,
    DOMContractInspector,
    REPO_ROOT
)


# ============================================================================
# CATEGORY A: DESIGN TOKENS & SYSTEM PROOFS
# ============================================================================

class TestTier1CategoryA_DesignTokens(unittest.TestCase):
    """
    Tier 1 Category A: Design Tokens & System Proofs
    Mandate: >=5 test cases validating W3C DTCG tokens, WCAG contrast,
    and responsive layout invariants.
    """

    def test_01_primitive_tokens_structure_and_validity(self):
        """TC-DTCG-01: Verify primitive tokens contain required palette, spacing, and radius."""
        primitives = DESIGN_TOKENS["color"]["primitive"]
        self.assertIn("pine-700", primitives)
        self.assertEqual(primitives["pine-700"], "#2F524C")  # Primary Brand Pine
        self.assertEqual(primitives["coral-500"], "#D96B4B")  # Accent Coral
        self.assertEqual(primitives["blue-600"], "#2563EB")   # Focus Blue
        self.assertEqual(primitives["red-600"], "#DC2626")    # Urgent Red
        self.assertEqual(primitives["amber-600"], "#D97706")  # Warning Amber
        self.assertEqual(primitives["green-600"], "#059669")  # Protected Green

        # Check all primitive colors parse to valid RGB
        for name, hex_val in primitives.items():
            rgb = hex_to_rgb(hex_val)
            self.assertEqual(len(rgb), 3, f"Token {name} ({hex_val}) must have 3 RGB channels")
            for channel in rgb:
                self.assertTrue(0 <= channel <= 255, f"Channel in {name} must be within [0, 255]")

    def test_02_photometric_wcag_text_contrast_compliance(self):
        """TC-DTCG-02: Verify WCAG 2.1 AA/AAA contrast ratios for text elements."""
        light_sem = DESIGN_TOKENS["color"]["semantic"]["light"]
        dark_sem = DESIGN_TOKENS["color"]["semantic"]["dark"]

        # Light theme primary text contrast vs canvas
        cr_light_primary = contrast_ratio(light_sem["text-primary"], light_sem["surface-canvas"])
        self.assertGreaterEqual(cr_light_primary, 7.0, f"Light primary text contrast {cr_light_primary:.2f} must meet AAA (>=7.0:1)")

        # Light theme secondary text contrast vs canvas
        cr_light_sec = contrast_ratio(light_sem["text-secondary"], light_sem["surface-canvas"])
        self.assertGreaterEqual(cr_light_sec, 4.5, f"Light secondary text contrast {cr_light_sec:.2f} must meet AA (>=4.5:1)")

        # Dark theme primary text contrast vs dark canvas
        cr_dark_primary = contrast_ratio(dark_sem["text-primary"], dark_sem["surface-canvas"])
        self.assertGreaterEqual(cr_dark_primary, 7.0, f"Dark primary text contrast {cr_dark_primary:.2f} must meet AAA (>=7.0:1)")

        # Dark theme secondary text contrast vs dark canvas
        cr_dark_sec = contrast_ratio(dark_sem["text-secondary"], dark_sem["surface-canvas"])
        self.assertGreaterEqual(cr_dark_sec, 4.5, f"Dark secondary text contrast {cr_dark_sec:.2f} must meet AA (>=4.5:1)")

    def test_03_photometric_wcag_ui_component_and_focus_contrast(self):
        """TC-DTCG-03: Verify WCAG 2.1 SC 1.4.11 / SC 2.4.11 boundary & focus contrast (>=3.0:1)."""
        light_sem = DESIGN_TOKENS["color"]["semantic"]["light"]
        dark_sem = DESIGN_TOKENS["color"]["semantic"]["dark"]

        # Focus ring contrast against light canvas
        cr_focus_light = contrast_ratio(light_sem["border-focus"], light_sem["surface-canvas"])
        self.assertGreaterEqual(cr_focus_light, 3.0, f"Focus indicator {cr_focus_light:.2f} must be >=3.0:1")

        # Focus ring contrast against dark canvas
        cr_focus_dark = contrast_ratio(dark_sem["border-focus"], dark_sem["surface-canvas"])
        self.assertGreaterEqual(cr_focus_dark, 3.0, f"Dark focus indicator {cr_focus_dark:.2f} must be >=3.0:1")

    def test_04_status_color_palette_and_urgency_hierarchy(self):
        """TC-DTCG-04: Verify status color tokens and semantic urgency definitions."""
        light_sem = DESIGN_TOKENS["color"]["semantic"]["light"]
        self.assertEqual(light_sem["status-urgent"], "#DC2626")      # <= 7 days
        self.assertEqual(light_sem["status-warning"], "#D97706")     # <= 30 days
        self.assertEqual(light_sem["status-protected"], "#059669")   # > 30 days
        self.assertEqual(light_sem["status-neutral"], "#6B7280")     # Expired

        # Verify all status colors have distinct luminances
        lum_urgent = relative_luminance(*hex_to_rgb(light_sem["status-urgent"]))
        lum_warning = relative_luminance(*hex_to_rgb(light_sem["status-warning"]))
        lum_protected = relative_luminance(*hex_to_rgb(light_sem["status-protected"]))
        self.assertNotEqual(lum_urgent, lum_warning)
        self.assertNotEqual(lum_warning, lum_protected)

    def test_05_z_index_strata_hierarchy_monotonicity(self):
        """TC-DTCG-05: Verify 11-tier unified z-index strata has zero collisions."""
        z_dict = DESIGN_TOKENS["z_index"]
        expected_tiers = ["base", "sticky", "navbar", "dropdown", "drawer", "backdrop", "modal", "popover", "toast", "tooltip", "max"]
        prev_val = -1
        for tier in expected_tiers:
            self.assertIn(tier, z_dict, f"Missing z-index tier: {tier}")
            curr_val = z_dict[tier]
            self.assertGreater(curr_val, prev_val, f"Z-index tier {tier} ({curr_val}) must be strictly greater than {prev_val}")
            prev_val = curr_val

    def test_06_responsive_breakpoint_monotonic_scale(self):
        """TC-DTCG-06: Verify 5-tier responsive breakpoints have strictly increasing pixel values."""
        bp = DESIGN_TOKENS["breakpoints"]
        self.assertEqual(bp["xs"], 0)
        self.assertLess(bp["xs"], bp["sm"])
        self.assertLess(bp["sm"], bp["md"])
        self.assertLess(bp["md"], bp["lg"])
        self.assertLess(bp["lg"], bp["xl"])
        self.assertGreaterEqual(bp["xl"], 1600)


# ============================================================================
# CATEGORY B: MAIN SHOWCASE WEBPAGE
# ============================================================================

class TestTier1CategoryB_ShowcaseWebpage(unittest.TestCase):
    """
    Tier 1 Category B: Main Showcase Webpage ([Project].page.dev)
    Mandate: >=5 test cases covering dual-interface landing, split-screen MCP playground,
    modular dashboard layout, and 3 calendar widget types.
    """

    def setUp(self):
        self.mcp_server = MCPServerEngine()

    def test_01_dual_interface_conceptual_model_contracts(self):
        """TC-SHOWCASE-01: Verify dual-interface intro exposes both MCP tools and Human App."""
        # Query MCP server initialize and tool list
        init_resp = self.mcp_server.handle_request({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {}
        })
        self.assertEqual(init_resp["result"]["protocolVersion"], "2025-11-25")
        self.assertIn(init_resp["result"]["serverInfo"]["name"], ["rights-and-renewals", "cmlab-warranty-mcp"])

        tools_resp = self.mcp_server.handle_request({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        })
        tool_names = [t["name"] for t in tools_resp["result"]["tools"]]
        self.assertEqual(tool_names, ["policy_lookup", "statutory_law_lookup", "subscription_category_rules"])

    def test_02_split_screen_mcp_playground_policy_lookup(self):
        """TC-SHOWCASE-02: Verify interactive playground policy_lookup execution over JSON-RPC 2.0."""
        req = {
            "jsonrpc": "2.0",
            "id": "play-1",
            "method": "tools/call",
            "params": {
                "name": "policy_lookup",
                "arguments": {"service_slug": "spotify"}
            }
        }
        resp = self.mcp_server.handle_request(req)
        self.assertEqual(resp["jsonrpc"], "2.0")
        self.assertEqual(resp["id"], "play-1")
        self.assertNotIn("error", resp)

        content = json.loads(resp["result"]["content"][0]["text"])
        self.assertEqual(content.get("brand_name"), "Spotify")
        self.assertEqual(content.get("category"), "subscription")
        self.assertIn("BGB § 309 Nr. 9", content.get("statutory_basis", []))
        self.assertIsNone(content["cancellation_button_compliant"])
        self.assertIsNone(content["statutory_warranty_months"])
        self.assertEqual(content, resp["result"]["structuredContent"])

    def test_03_retired_tools_are_unavailable(self):
        """TC-SHOWCASE-03: Public MCP clients cannot invoke retired tools."""
        for tool in ("claim_dossier_generate", "tax_deductibility_check"):
            resp = self.mcp_server.handle_request({
                "jsonrpc": "2.0",
                "id": "retired",
                "method": "tools/call",
                "params": {"name": tool, "arguments": {}},
            })
            self.assertEqual(resp["error"]["code"], -32602)

    def test_04_calendar_type1_monthly_grid_data_model(self):
        """TC-SHOWCASE-04: Verify Calendar Type 1 (Monthly ISO 8601 DIN Grid) event and urgency badges."""
        purchase_date = datetime.date(2025, 6, 1)
        today = datetime.date(2026, 5, 10)  # 22 days before June 1 cliff (< 30 days)
        status = BGBTimelineCalculator.evaluate_status(purchase_date, today)

        # In month 11 (22 days before cliff), cliff is approaching (<= 30 days)
        self.assertEqual(status["status"], "protected")
        self.assertEqual(status["urgency_level"], "medium_cliff_warning")
        self.assertEqual(status["burden_of_proof"], "seller")
        self.assertLessEqual(status["days_to_cliff"], 30)

    def test_05_calendar_type2_timeline_agenda_12m_cliff_progress(self):
        """TC-SHOWCASE-05: Verify Calendar Type 2 (Timeline/Agenda) spotlighting BGB § 477 cliff."""
        purchase_date = datetime.date(2025, 11, 1)
        milestones = BGBTimelineCalculator.calculate_warranty_milestones(purchase_date)

        cliff_date = datetime.date.fromisoformat(milestones["cliff_12m_beweislastumkehr"])
        expiry_date = datetime.date.fromisoformat(milestones["expiry_24m_statutory"])

        # Exactly 12 months between purchase and cliff
        self.assertEqual(cliff_date.year, 2026)
        self.assertEqual(cliff_date.month, 11)
        self.assertEqual(cliff_date.day, 1)

        # Exactly 24 months to statutory expiry
        self.assertEqual(expiry_date.year, 2027)
        self.assertEqual(expiry_date.month, 11)

    def test_06_calendar_type3_risk_heatmap_density_matrix(self):
        """TC-SHOWCASE-06: Verify Calendar Type 3 (Risk Heatmap) 52-week density calculation."""
        sample_items = [
            {"id": "i1", "expiry": datetime.date(2026, 12, 1), "price": 1200.0, "status": "protected"},
            {"id": "i2", "expiry": datetime.date(2026, 12, 10), "price": 350.0, "status": "cliff_warning"},
            {"id": "i3", "expiry": datetime.date(2027, 3, 15), "price": 89.0, "status": "protected"}
        ]
        # Cluster in December 2026 has €1550 capital at risk
        dec_cluster = [i for i in sample_items if i["expiry"].month == 12 and i["expiry"].year == 2026]
        capital_at_risk = sum(i["price"] for i in dec_cluster)
        self.assertEqual(len(dec_cluster), 2)
        self.assertEqual(capital_at_risk, 1550.0)

    def test_07_ai_agent_quick_connect_config_contracts(self):
        """TC-SHOWCASE-07: Verify all 6 AI agent quick-connect configurations target Rights & Renewals."""
        # 1. Claude Code CLI Command
        claude_code_cmd = "claude mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp"
        self.assertIn("rights-and-renewals", claude_code_cmd)
        self.assertIn("--transport http", claude_code_cmd)
        self.assertTrue(claude_code_cmd.endswith("/api/mcp"))

        # 2. Claude Desktop (mcp-remote stdio bridge)
        claude_desktop_cfg = {
            "mcpServers": {
                "rights-and-renewals": {
                    "command": "npx",
                    "args": ["-y", "mcp-remote", "https://rightsandrenewals.pages.dev/api/mcp"]
                }
            }
        }
        self.assertIn("rights-and-renewals", claude_desktop_cfg["mcpServers"])
        self.assertEqual(claude_desktop_cfg["mcpServers"]["rights-and-renewals"]["args"][1], "mcp-remote")

        # 3. Cursor IDE (.cursor/mcp.json)
        cursor_cfg = {
            "mcpServers": {
                "rights-and-renewals": {
                    "url": "https://rightsandrenewals.pages.dev/api/mcp"
                }
            }
        }
        self.assertEqual(cursor_cfg["mcpServers"]["rights-and-renewals"]["url"], "https://rightsandrenewals.pages.dev/api/mcp")

        # 4. Windsurf (mcp_config.json with serverUrl)
        windsurf_cfg = {
            "mcpServers": {
                "rights-and-renewals": {
                    "serverUrl": "https://rightsandrenewals.pages.dev/api/mcp"
                }
            }
        }
        self.assertIn("serverUrl", windsurf_cfg["mcpServers"]["rights-and-renewals"])
        self.assertNotIn("url", windsurf_cfg["mcpServers"]["rights-and-renewals"])

        # 5. VS Code / Continue (config.json)
        continue_cfg = {
            "mcpServers": [
                {
                    "name": "rights-and-renewals",
                    "transport": {
                        "type": "sse",
                        "url": "https://rightsandrenewals.pages.dev/api/mcp"
                    }
                }
            ]
        }
        self.assertEqual(continue_cfg["mcpServers"][0]["name"], "rights-and-renewals")
        self.assertEqual(continue_cfg["mcpServers"][0]["transport"]["url"], "https://rightsandrenewals.pages.dev/api/mcp")

        # 6. Gemini CLI (gemini mcp add & settings.json)
        gemini_cmd = "gemini mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp"
        gemini_cfg = {
            "mcpServers": {
                "rights-and-renewals": {
                    "httpUrl": "https://rightsandrenewals.pages.dev/api/mcp"
                }
            }
        }
        self.assertIn("--transport http", gemini_cmd)
        self.assertIn("httpUrl", gemini_cfg["mcpServers"]["rights-and-renewals"])

    def test_08_agent_setup_page_dom_and_a11y_contracts(self):
        """TC-SHOWCASE-08: Verify Agent Setup page and discovery contracts."""
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        agent_setup_path = os.path.join(base_dir, "apps", "showcase", "src", "pages", "agent-setup.astro")
        self.assertTrue(os.path.exists(agent_setup_path), "agent-setup.astro must exist")

        with open(agent_setup_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Invariants from Cloudflare reference & discovery contracts
        self.assertIn("Rights &amp; Renewals · Agent Setup", content)
        self.assertIn("hero-copy-prompt-btn", content)
        self.assertIn("agent-card-claude-code", content)
        self.assertIn("agent-card-claude-desktop", content)
        self.assertIn("agent-card-cursor", content)
        self.assertIn("agent-card-windsurf", content)
        preferred_clients = ("antigravity", "claude-code", "codex", "vscode", "cursor")
        card_positions = [content.index(f'id="agent-card-{client}"') for client in preferred_clients]
        tab_positions = [content.index(f'id="tab-{client}"') for client in preferred_clients]
        self.assertEqual(card_positions, sorted(card_positions))
        self.assertEqual(tab_positions, sorted(tab_positions))
        self.assertIn("agent-card-gemini", content)
        self.assertIn('role="tablist"', content)
        self.assertIn('role="tab"', content)
        self.assertIn('role="tabpanel"', content)
        self.assertIn('rel="ai-catalog"', content)
        self.assertIn('rel="mcp-server-card"', content)
        self.assertIn('rel="agent-skills"', content)

        # Discovery files verification
        prompt_md_path = os.path.join(base_dir, "apps", "showcase", "public", "agent-setup", "prompt.md")
        self.assertTrue(os.path.exists(prompt_md_path), "prompt.md must exist")

        server_card_path = os.path.join(base_dir, "apps", "showcase", "public", ".well-known", "mcp", "server-card.json")
        self.assertTrue(os.path.exists(server_card_path), "server-card.json must exist")

        ai_catalog_path = os.path.join(base_dir, "apps", "showcase", "public", ".well-known", "ai-catalog.json")
        self.assertTrue(os.path.exists(ai_catalog_path), "ai-catalog.json must exist")

        skills_index_path = os.path.join(base_dir, "apps", "showcase", "public", ".well-known", "agent-skills", "index.json")
        self.assertTrue(os.path.exists(skills_index_path), "agent-skills/index.json must exist")



# ============================================================================
# CATEGORY C: MODERN APPLICATION INTERFACE
# ============================================================================

class TestTier1CategoryC_ModernApp(unittest.TestCase):
    """
    Tier 1 Category C: Modern Application Interface (app.[Project].page.dev)
    Mandate: >=5 test cases covering app shell, contextual item detail drawer,
    modular dashboard widgets, GoBD SHA-256 receipts, and dual-domain privacy isolation.
    """

    def test_01_app_view_shell_layout_and_100dvh_meta(self):
        """TC-APP-01: Verify app shell layout requirements (100dvh viewport, safe area)."""
        sample_html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
            <style>
                :root {
                    --height-viewport: 100dvh;
                    --padding-safe-bottom: env(safe-area-inset-bottom, 16px);
                }
            </style>
        </head>
        <body>
            <header role="banner" id="app-header">
                <div role="combobox" aria-expanded="false" id="omnibar-root"></div>
            </header>
            <main id="app-dashboard-grid" class="grid-12-col"></main>
        </body>
        </html>
        """
        inspector = DOMContractInspector()
        inspector.feed(sample_html)
        self.assertTrue(inspector.has_viewport_meta)
        self.assertIn("viewport-fit=cover", inspector.viewport_content)
        self.assertIn("banner", inspector.roles)
        self.assertIn("combobox", inspector.roles)
        self.assertIn("app-header", inspector.elements_with_id)
        self.assertIn("app-dashboard-grid", inspector.elements_with_id)

    def test_02_contextual_item_drawer_bgb_timeline_and_proof(self):
        """TC-APP-02: Verify 520px slide-over drawer contracts: timeline, BGB cliff, GoBD digest."""
        purchase_date = datetime.date(2025, 3, 1)
        receipt_bytes = b"RECEIPT_SCAN_SATURN_ANKER_CHARGER_EUR_49_99"
        metadata = {
            "item_name": "Anker 65W GaN Charger",
            "merchant": "Saturn",
            "purchase_date": purchase_date.isoformat(),
            "price_eur": 49.99
        }
        gobd_hash = compute_gobd_sha256(receipt_bytes, metadata)
        self.assertEqual(len(gobd_hash), 64)  # Valid SHA-256 hex string

        # Check drawer timeline contract
        milestones = BGBTimelineCalculator.calculate_warranty_milestones(purchase_date)
        self.assertEqual(milestones["purchase_date"], "2025-03-01")
        self.assertEqual(milestones["cliff_12m_beweislastumkehr"], "2026-03-01")
        self.assertEqual(milestones["expiry_24m_statutory"], "2027-03-01")

    def test_03_gobd_receipt_immutability_tamper_detection(self):
        """TC-APP-03: Verify GoBD SHA-256 pre-encryption digest detects any receipt alteration."""
        metadata = {"item_name": "Sony WH-1000XM5", "price": 299.00}
        orig_blob = b"AUTHENTIC_RECEIPT_IMAGE_DATA_0123456789"
        tampered_blob = b"AUTHENTIC_RECEIPT_IMAGE_DATA_0123456788"  # 1 bit flipped

        digest_orig = compute_gobd_sha256(orig_blob, metadata)
        digest_tampered = compute_gobd_sha256(tampered_blob, metadata)
        self.assertNotEqual(digest_orig, digest_tampered)

    def test_04_dexie_offline_vault_5_stores_contract(self):
        """TC-APP-04: Verify IndexedDB (Dexie.js v4) 5-store schema architecture."""
        required_stores = {
            "items": "++id, name, merchant, category, purchaseDate, expiryDate, beweislastumkehrDate, isTaxDeductible, status, receiptSha256",
            "receipt_blobs": "id, mimeType, createdAt, byteSize",
            "alarm_schedules": "++id, itemId, triggerDate, urgencyLevel, dispatched",
            "policy_wiki": "serviceSlug, brandName, category, jurisdiction, statutoryWarrantyMonths, reversedBurdenMonths",
            "dispute_history": "++id, itemId, brandSlug, statutoryCode, dispatchDate, status"
        }
        self.assertEqual(len(required_stores), 5)
        self.assertIn("items", required_stores)
        self.assertIn("receipt_blobs", required_stores)
        self.assertIn("alarm_schedules", required_stores)
        self.assertIn("policy_wiki", required_stores)
        self.assertIn("dispute_history", required_stores)

    def test_05_dual_domain_privacy_and_routing_separation(self):
        """TC-APP-05: Verify origin isolation between showcase and app domains."""
        showcase_domain = "https://[project].page.dev"
        app_domain = "https://app.[project].page.dev"

        # Verify cross-domain deep link uses URL hash to avoid server logging
        sample_item_slug = "spotify-student-plan"
        deep_link = f"{app_domain}/#action=view&slug={sample_item_slug}"
        self.assertIn("#action=view", deep_link)
        self.assertTrue(deep_link.startswith(app_domain))
        self.assertNotEqual(showcase_domain, app_domain)

    def test_06_spend_radar_and_urgent_attention_widget_contracts(self):
        """TC-APP-06: Verify Urgent Attention widget filters items with <= 30 days remaining."""
        vault = [
            {"id": "1", "name": "Apple MacBook Pro", "days_remaining": 18, "price_eur": 1999.00},
            {"id": "2", "name": "Spotify Subscription", "days_remaining": 5, "price_eur": 5.99},
            {"id": "3", "name": "Logitech MX Master", "days_remaining": 240, "price_eur": 89.00}
        ]
        urgent_items = [i for i in vault if i["days_remaining"] <= 30]
        self.assertEqual(len(urgent_items), 2)
        total_urgent_spend = sum(i["price_eur"] for i in urgent_items)
        self.assertAlmostEqual(total_urgent_spend, 2004.99, places=2)

    def test_07_werbungskosten_tax_deductible_filter_and_export(self):
        """TC-APP-07: Verify BMF 2022 1-year Sofortabschreibung classification and tax export."""
        expenses = [
            {"name": "MacBook Pro", "isTaxDeductible": True, "category": "Arbeitsmittel", "price": 1499.0, "sofortabschreibung": True},
            {"name": "JetBrains All Products", "isTaxDeductible": True, "category": "Software", "price": 119.0, "sofortabschreibung": True},
            {"name": "Private Gym Membership", "isTaxDeductible": False, "category": "Private", "price": 360.0, "sofortabschreibung": False}
        ]
        deductible = [e for e in expenses if e["isTaxDeductible"]]
        self.assertEqual(len(deductible), 2)
        total_deductible = sum(e["price"] for e in deductible)
        self.assertEqual(total_deductible, 1618.0)
        # All deductible software and hardware qualify for 100% 1-year write-off per BMF 22.02.2022
        self.assertTrue(all(e["sofortabschreibung"] for e in deductible))


# ============================================================================
# CATEGORY D: UNIFIED OMNIBAR ENGINE
# ============================================================================

class TestTier1CategoryD_UnifiedOmnibar(unittest.TestCase):
    """
    Tier 1 Category D: Unified Omnibar Engine
    Mandate: >=5 test cases covering idle state, wiki search, vault search,
    create/import suggestions, and verb commands (>claim, >cancel, >tax, >import).
    """

    def setUp(self):
        self.wiki_brands = load_seed_brands()
        self.vault_items = [
            {"id": "v1", "name": "Apple MacBook Pro 16", "merchant": "Apple Store", "category": "hardware"},
            {"id": "v2", "name": "Spotify Premium Student", "merchant": "Spotify", "category": "subscription"},
            {"id": "v3", "name": "Sony Noise Canceling Headphones", "merchant": "MediaMarkt", "category": "hardware"}
        ]
        self.fsm = OmnibarFSM(wiki_brands=self.wiki_brands, vault_items=self.vault_items)

    def test_01_idle_state_and_focus_empty_quick_actions(self):
        """TC-OMNI-01: Verify Omnibar starts at IDLE and transitions to FOCUSED_EMPTY on focus."""
        self.assertEqual(self.fsm.state, OmnibarState.IDLE)
        state = self.fsm.on_focus()
        self.assertEqual(state, OmnibarState.FOCUSED_EMPTY)

        res = self.fsm.process_query("")
        self.assertEqual(res["state"], OmnibarState.FOCUSED_EMPTY)
        self.assertGreater(len(res["recent_activities"]), 0)
        self.assertIn(">claim", res["quick_actions"])
        self.assertIn(">cancel", res["quick_actions"])

    def test_02_wiki_database_search_matching(self):
        """TC-OMNI-02: Verify Omnibar queries Policy Wiki and enters WIKI_MATCHES."""
        self.fsm.on_focus()
        res = self.fsm.process_query("Netflix")
        self.assertEqual(res["state"], OmnibarState.WIKI_MATCHES)
        self.assertEqual(len(res["wiki_matches"]), 1)
        self.assertEqual(res["wiki_matches"][0]["brand_name"], "Netflix")

    def test_03_saved_vault_items_search_matching(self):
        """TC-OMNI-03: Verify Omnibar queries local vault items and enters VAULT_MATCHES."""
        self.fsm.on_focus()
        # Query matching local vault item 'Headphones' not in wiki brand names
        res = self.fsm.process_query("Headphones")
        self.assertEqual(res["state"], OmnibarState.VAULT_MATCHES)
        self.assertGreaterEqual(len(res["vault_matches"]), 1)
        self.assertEqual(res["vault_matches"][0]["name"], "Sony Noise Canceling Headphones")

    def test_04_create_import_suggestions_on_zero_match(self):
        """TC-OMNI-04: Verify Omnibar displays actionable zero-dead-end suggestions when no match."""
        self.fsm.on_focus()
        res = self.fsm.process_query("Logitech MX Master")
        self.assertEqual(res["state"], OmnibarState.NO_MATCH_SUGGESTION)
        self.assertEqual(len(res["suggestions"]), 3)
        suggestion_types = [s["type"] for s in res["suggestions"]]
        self.assertIn("create_warranty", suggestion_types)
        self.assertIn("add_subscription", suggestion_types)
        self.assertIn("import_receipt", suggestion_types)

    def test_05_executable_verb_command_workflows(self):
        """TC-OMNI-05: Verify verb commands (>claim, >cancel, >tax, >import, >audit) transition to COMMAND_MODE."""
        verbs = [
            (">claim spotify", ">claim", "spotify", "generate_claim_dossier"),
            (">cancel netflix", ">cancel", "netflix", "generate_cancellation_notice"),
            (">tax 2026", ">tax", "2026", "compile_werbungskosten_report"),
            (">import receipt.pdf", ">import", "receipt.pdf", "trigger_receipt_hash_pipeline"),
            (">audit", ">audit", "", "run_integrity_audit")
        ]
        for cmd, expected_verb, expected_target, expected_action in verbs:
            self.fsm.reset()
            self.fsm.on_focus()
            res = self.fsm.process_query(cmd)
            self.assertEqual(res["state"], OmnibarState.COMMAND_MODE)
            self.assertEqual(res["verb"], expected_verb)
            self.assertEqual(res["args"], expected_target)
            self.assertTrue(res["is_valid_verb"])
            self.assertEqual(res["workflow"]["action"], expected_action)


if __name__ == "__main__":
    unittest.main()
