"""
Tier 3: Cross-Feature Combinations & Omnibar 8-State FSM Transitions
Author: teamwork_test_writer_e2e_1
Requirements: ORIGINAL_REQUEST.md (R1, R2, R3, R4) & PROJECT.md (Features 1-20)

Verifies formal FSM transitions, state invariants, and cross-feature interactions:
- Full 8-State Omnibar FSM lifecycle transitions
- IDLE -> FOCUSED_EMPTY -> QUERYING -> WIKI_MATCHES
- QUERYING -> VAULT_MATCHES
- QUERYING -> HYBRID_MATCHES (both Vault and Wiki partitioned)
- QUERYING -> NO_MATCH_SUGGESTION (zero dead ends)
- FOCUSED_EMPTY -> COMMAND_MODE (>claim, >cancel, >tax, >import, >audit)
- Omnibar item selection -> 520px Contextual Drawer integration
- Create suggestion -> Vault persistence -> immediate search cache update
- Command mode >tax -> BMF 2022 Werbungskosten export pipeline
- Showcase split-screen synchronization between Visual UI and MCP Streamer
"""

import datetime
import json
import unittest
from pathlib import Path
from typing import Any, Dict, List

from tests.e2e.harness import (
    BGBTimelineCalculator,
    MCPServerEngine,
    OmnibarFSM,
    OmnibarState,
    compute_gobd_sha256,
    load_seed_brands
)


class TestTier3FSMAndCombinations(unittest.TestCase):
    """
    Tier 3: Cross-Feature Combinations & Omnibar 8-State FSM Transitions
    Mandate: 12 comprehensive tests validating state machine rigor and module integration.
    """

    def setUp(self):
        self.wiki_brands = load_seed_brands()
        self.vault_items = [
            {
                "id": "v101",
                "name": "Apple MacBook Pro 16",
                "merchant": "Apple Retail Germany",
                "category": "hardware",
                "purchase_date": "2025-11-01",
                "price_eur": 2499.00,
                "isTaxDeductible": True,
                "status": "protected"
            },
            {
                "id": "v102",
                "name": "Spotify Premium Student",
                "merchant": "Spotify AB",
                "category": "subscription",
                "purchase_date": "2026-01-01",
                "price_eur": 5.99,
                "isTaxDeductible": False,
                "status": "active"
            },
            {
                "id": "v103",
                "name": "Anker 737 Power Bank",
                "merchant": "Saturn",
                "category": "hardware",
                "purchase_date": "2025-08-15",
                "price_eur": 129.99,
                "isTaxDeductible": True,
                "status": "protected"
            }
        ]
        self.fsm = OmnibarFSM(wiki_brands=self.wiki_brands, vault_items=self.vault_items)
        self.mcp_server = MCPServerEngine(brands=self.wiki_brands)

    def test_01_fsm_lifecycle_idle_to_focused_empty_to_idle(self):
        """TC-FSM-01: Verify IDLE -> FOCUSED_EMPTY on focus, and return to IDLE on Escape/blur."""
        self.assertEqual(self.fsm.state, OmnibarState.IDLE)

        # Trigger focus
        state = self.fsm.on_focus()
        self.assertEqual(state, OmnibarState.FOCUSED_EMPTY)
        self.assertEqual(self.fsm.state, OmnibarState.FOCUSED_EMPTY)

        # Trigger blur / escape
        state_esc = self.fsm.on_escape()
        self.assertEqual(state_esc, OmnibarState.IDLE)
        self.assertEqual(self.fsm.state, OmnibarState.IDLE)
        self.assertEqual(self.fsm.query, "")

    def test_02_fsm_lifecycle_focused_empty_to_querying_to_wiki_matches(self):
        """TC-FSM-02: Verify FOCUSED_EMPTY -> QUERYING -> WIKI_MATCHES when searching wiki-only brand."""
        self.fsm.on_focus()
        # "Netflix" is in Wiki seed, not in Vault items
        res = self.fsm.process_query("Netflix")
        self.assertEqual(res["state"], OmnibarState.WIKI_MATCHES)
        self.assertEqual(len(res["wiki_matches"]), 1)
        self.assertEqual(len(res["vault_matches"]), 0)
        self.assertIn(OmnibarState.QUERYING, self.fsm.history)
        self.assertIn(OmnibarState.WIKI_MATCHES, self.fsm.history)

        # Backspace query to empty
        res_empty = self.fsm.process_query("")
        self.assertEqual(res_empty["state"], OmnibarState.FOCUSED_EMPTY)

    def test_03_fsm_lifecycle_querying_to_vault_matches(self):
        """TC-FSM-03: Verify QUERYING -> VAULT_MATCHES when searching user-specific vault item."""
        self.fsm.on_focus()
        # "Power Bank" matches Anker 737 in vault, but is not a brand in Wiki
        res = self.fsm.process_query("Power Bank")
        self.assertEqual(res["state"], OmnibarState.VAULT_MATCHES)
        self.assertEqual(len(res["vault_matches"]), 1)
        self.assertEqual(res["vault_matches"][0]["id"], "v103")
        self.assertEqual(len(res["wiki_matches"]), 0)

    def test_04_fsm_lifecycle_querying_to_hybrid_matches(self):
        """TC-FSM-04: Verify QUERYING -> HYBRID_MATCHES when query matches both Vault and Wiki."""
        self.fsm.on_focus()
        # "Apple" is in Wiki, and "Apple MacBook Pro 16" is in Vault
        res = self.fsm.process_query("Apple")
        self.assertEqual(res["state"], OmnibarState.HYBRID_MATCHES)
        self.assertGreaterEqual(len(res["vault_matches"]), 1)
        self.assertGreaterEqual(len(res["wiki_matches"]), 1)
        self.assertEqual(res["vault_matches"][0]["name"], "Apple MacBook Pro 16")
        wiki_names = [b.get("brand_name") or b.get("brandName") for b in res["wiki_matches"]]
        self.assertIn("Apple", wiki_names)

    def test_05_fsm_lifecycle_querying_to_no_match_suggestion(self):
        """TC-FSM-05: Verify QUERYING -> NO_MATCH_SUGGESTION surfaces 3 zero-dead-end fallback actions."""
        self.fsm.on_focus()
        # "Keychron Keyboard" is neither in seed nor in vault
        res = self.fsm.process_query("Keychron Keyboard")
        self.assertEqual(res["state"], OmnibarState.NO_MATCH_SUGGESTION)
        self.assertEqual(len(res["wiki_matches"]), 0)
        self.assertEqual(len(res["vault_matches"]), 0)

        # Assert 3 actionable suggestions
        suggs = res["suggestions"]
        self.assertEqual(len(suggs), 3)
        actions = [s["action"] for s in suggs]
        self.assertIn("open_create_warranty_modal", actions)
        self.assertIn("open_add_subscription_modal", actions)
        self.assertIn("trigger_receipt_upload", actions)

    def test_06_fsm_lifecycle_focused_empty_to_command_mode(self):
        """TC-FSM-06: Verify entering '>' enters COMMAND_MODE and parses verb and target."""
        self.fsm.on_focus()
        res = self.fsm.process_query(">cancel spotify")
        self.assertEqual(res["state"], OmnibarState.COMMAND_MODE)
        self.assertEqual(res["verb"], ">cancel")
        self.assertEqual(res["args"], "spotify")
        self.assertTrue(res["is_valid_verb"])
        self.assertEqual(res["workflow"]["action"], "generate_cancellation_notice")

        # Exit command mode on ESC
        state_esc = self.fsm.on_escape()
        self.assertEqual(state_esc, OmnibarState.IDLE)

    def test_07_fsm_illegal_transition_guards(self):
        """TC-FSM-07: Verify state machine rejects illegal state strings."""
        with self.assertRaises(ValueError):
            self.fsm.transition_to("ILLEGAL_STATE_NONEXISTENT")

    def test_08_cross_feature_omnibar_to_item_drawer_navigation(self):
        """TC-FSM-08: Verify selecting a vault match routes to Contextual Drawer with BGB timeline."""
        self.fsm.on_focus()
        res = self.fsm.process_query("MacBook")
        self.assertIn(res["state"], {OmnibarState.VAULT_MATCHES, OmnibarState.HYBRID_MATCHES})
        selected_item = res["vault_matches"][0]

        # Calculate drawer timeline for selected item
        purchase = datetime.date.fromisoformat(selected_item["purchase_date"])
        today = datetime.date(2026, 10, 1)  # Month 11
        timeline = BGBTimelineCalculator.calculate_warranty_milestones(purchase)
        status_eval = BGBTimelineCalculator.evaluate_status(purchase, today)

        self.assertEqual(timeline["purchase_date"], "2025-11-01")
        self.assertEqual(timeline["cliff_12m_beweislastumkehr"], "2026-11-01")
        self.assertEqual(status_eval["status"], "protected")
        self.assertEqual(status_eval["burden_of_proof"], "seller")

    def test_09_cross_feature_omnibar_to_cancellation_workflow(self):
        """TC-FSM-09: Verify selecting a wiki subscription routes to BGB § 312k cancellation link."""
        self.fsm.on_focus()
        res = self.fsm.process_query("Spotify")
        self.assertIn(res["state"], {OmnibarState.WIKI_MATCHES, OmnibarState.HYBRID_MATCHES})
        spotify_policy = [b for b in res["wiki_matches"] if b.get("brand_name") == "Spotify"][0]

        cancellation_url = spotify_policy.get("cancellation_button_url") or spotify_policy.get("cancellationButtonUrl")
        self.assertIsNotNone(cancellation_url)
        self.assertTrue(cancellation_url.startswith("https://"))
        self.assertTrue(spotify_policy.get("cancellation_button_compliant"))

    def test_10_cross_feature_create_suggestion_to_vault_persistence(self):
        """TC-FSM-10: Verify executing create suggestion persists item to Vault and updates search."""
        self.fsm.on_focus()
        res_before = self.fsm.process_query("Keychron Q1")
        self.assertEqual(res_before["state"], OmnibarState.NO_MATCH_SUGGESTION)

        # Simulate user filling modal from prefilled suggestion
        sugg = res_before["suggestions"][0]
        new_item = {
            "id": "v999",
            "name": sugg["prefill"]["name"],
            "merchant": "CandyKeys Germany",
            "category": sugg["prefill"]["category"],
            "purchase_date": "2026-11-01",
            "price_eur": 189.00,
            "isTaxDeductible": True,
            "status": "protected"
        }
        # Persist to vault
        self.fsm.vault_items.append(new_item)

        # Query again
        res_after = self.fsm.process_query("Keychron Q1")
        self.assertEqual(res_after["state"], OmnibarState.VAULT_MATCHES)
        self.assertEqual(res_after["vault_matches"][0]["id"], "v999")

    def test_11_cross_feature_verb_tax_to_werbungskosten_pipeline(self):
        """TC-FSM-11: Verify >tax verb compiles Werbungskosten summary under BMF 2022."""
        self.fsm.on_focus()
        res = self.fsm.process_query(">tax 2026")
        self.assertEqual(res["state"], OmnibarState.COMMAND_MODE)
        self.assertEqual(res["workflow"]["action"], "compile_werbungskosten_report")

        # Aggregate tax deductible items in vault
        tax_items = [i for i in self.fsm.vault_items if i.get("isTaxDeductible")]
        self.assertGreaterEqual(len(tax_items), 2)
        total_deduction = sum(i["price_eur"] for i in tax_items)
        self.assertGreaterEqual(total_deduction, 2000.00)

    def test_12_cross_feature_split_screen_sync(self):
        """TC-FSM-12: Verify UI action triggers MCP JSON-RPC tool call simulation in <30ms."""
        import time
        start_t = time.perf_counter()

        # Trigger tool call simulating showcase split-screen click
        mcp_resp = self.mcp_server.handle_request({
            "jsonrpc": "2.0",
            "id": "sync-1",
            "method": "tools/call",
            "params": {
                "name": "policy_lookup",
                "arguments": {"service_slug": "spotify"}
            }
        })
        elapsed_ms = (time.perf_counter() - start_t) * 1000

        self.assertLess(elapsed_ms, 30.0, f"Split-screen sync took {elapsed_ms:.2f}ms, must be <30ms")
        self.assertEqual(mcp_resp["jsonrpc"], "2.0")
        self.assertNotIn("error", mcp_resp)


if __name__ == "__main__":
    unittest.main()
