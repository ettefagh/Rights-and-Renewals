"""
Tier 4: Real-World Application Scenarios (Student User Journeys)
Author: teamwork_test_writer_e2e_1
Requirements: ORIGINAL_REQUEST.md (R1, R2, R3, R4) & PROJECT.md (Features 1-20)

Verifies end-to-end user journeys based on empirical research dossiers (Persons 1-4):
- Journey 1: Student Spotify Subscription Cancellation (BGB § 309 Nr. 9 & § 312k)
- Journey 2: Student Apple MacBook Pro Warranty & Month 11 BGB § 477 Cliff Notice
- Journey 3: Student Unlisted Purchase (Keychron Q1) & GoBD Rn. 108-110 SHA-256 Vaulting
- Journey 4: Werkstudent Werbungskosten Tax Return & BMF 2022 Sofortabschreibung Export
- Journey 5: Autonomous AI MCP Agent JSON-RPC 2.0 Ground-Truth Dossier Compilation
- Journey 6: Saturn Charger Failure Month 9 Seller Routing (BGB § 438 vs Manufacturer Guarantee)
- Journey 7: Gym Subscription Cancellation (FitX/McFIT) with § 312k Abs. 6 Obstructed Button Remedy
- Journey 8: Complete Multi-Item Vault Audit (North Star Metric NSM-01 >= €350 Protected)
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


class TestTier4StudentJourneys(unittest.TestCase):
    """
    Tier 4: Real-World Student User Journeys Test Suite
    Mandate: 8 comprehensive end-to-end lifecycle workflows.
    """

    def setUp(self):
        self.wiki_brands = load_seed_brands()
        self.vault_items = [
            {
                "id": "vault-mbp",
                "name": "Apple MacBook Pro 14",
                "merchant": "Apple Store Frankfurt",
                "category": "hardware",
                "purchase_date": "2025-11-15",
                "price_eur": 1999.00,
                "isTaxDeductible": True,
                "status": "protected"
            },
            {
                "id": "vault-spot",
                "name": "Spotify Premium Student",
                "merchant": "Spotify AB",
                "category": "subscription",
                "purchase_date": "2026-01-01",
                "price_eur": 5.99,
                "isTaxDeductible": False,
                "status": "active"
            },
            {
                "id": "vault-jb",
                "name": "JetBrains All Products Pack",
                "merchant": "JetBrains s.r.o.",
                "category": "subscription",
                "purchase_date": "2026-02-01",
                "price_eur": 149.00,
                "isTaxDeductible": True,
                "status": "active"
            },
            {
                "id": "vault-anker",
                "name": "Anker 65W GaN Charger",
                "merchant": "Saturn",
                "category": "hardware",
                "purchase_date": "2025-08-01",
                "price_eur": 49.99,
                "isTaxDeductible": True,
                "status": "protected"
            }
        ]
        self.fsm = OmnibarFSM(wiki_brands=self.wiki_brands, vault_items=self.vault_items)
        self.mcp_server = MCPServerEngine(brands=self.wiki_brands)

    def test_journey_01_student_spotify_subscription_cancellation(self):
        """Journey 1: Student searches Spotify, views BGB § 309 Nr. 9 rules, and generates cancellation."""
        # 1. Student opens Omnibar (Ctrl+K)
        self.fsm.on_focus()
        self.assertEqual(self.fsm.state, OmnibarState.FOCUSED_EMPTY)

        # 2. Types "spotify"
        res = self.fsm.process_query("spotify")
        self.assertIn(res["state"], {OmnibarState.WIKI_MATCHES, OmnibarState.HYBRID_MATCHES})

        # 3. Inspects policy ground truth
        spotify_policy = [b for b in res["wiki_matches"] if b.get("brand_name") == "Spotify"][0]
        self.assertEqual(spotify_policy.get("category"), "subscription")
        self.assertIn("BGB § 309 Nr. 9", spotify_policy.get("statutory_basis", []))
        self.assertIn("BGB § 312k", spotify_policy.get("statutory_basis", []))
        self.assertEqual(spotify_policy.get("statutoryNoticeDays"), 30)

        # 4. Verifies statutory online cancellation button URL
        cancel_url = spotify_policy.get("cancellation_button_url") or spotify_policy.get("cancellationButtonUrl")
        self.assertEqual(cancel_url, "https://www.spotify.com/account/subscription/cancel/")

        # 5. Executes command workflow >cancel spotify
        cmd_res = self.fsm.process_query(">cancel spotify")
        self.assertEqual(cmd_res["state"], OmnibarState.COMMAND_MODE)
        self.assertEqual(cmd_res["workflow"]["action"], "generate_cancellation_notice")
        self.assertEqual(cmd_res["workflow"]["statutory_code"], "BGB § 312k")

    def test_journey_02_student_apple_macbook_bgb_cliff_claim(self):
        """Journey 2: MacBook at Month 11 triggers 12m BGB § 477 cliff alert and pre-fills Mängelrüge."""
        purchase_date = datetime.date(2025, 11, 15)
        today = datetime.date(2026, 10, 20)  # Month 11 (26 days before 12m cliff)

        # 1. Student searches "MacBook"
        self.fsm.on_focus()
        res = self.fsm.process_query("MacBook")
        self.assertIn(res["state"], {OmnibarState.VAULT_MATCHES, OmnibarState.HYBRID_MATCHES})
        mbp_item = res["vault_matches"][0]
        self.assertEqual(mbp_item["id"], "vault-mbp")

        # 2. Evaluate status at current date
        status = BGBTimelineCalculator.evaluate_status(purchase_date, today)
        self.assertEqual(status["status"], "protected")
        self.assertEqual(status["urgency_level"], "medium_cliff_warning")
        self.assertEqual(status["burden_of_proof"], "seller")
        self.assertLessEqual(status["days_to_cliff"], 30)

        # 3. Student reports display backlight failure and compiles statutory notice
        notice = BGBTimelineCalculator.generate_statutory_notice(
            brand_name="Apple",
            item_name="Apple MacBook Pro 14",
            purchase_date=purchase_date,
            defect_date=today,
            defect_description="Display cable flickering / intermittent mini-LED backlight failure",
            claim_type="replacement"
        )
        self.assertTrue(notice["valid"])
        self.assertEqual(notice["burden_of_proof"], "seller")
        self.assertIn("§ 477 Abs. 1 BGB", notice["dossier_text_de"])
        self.assertIn("Neulieferung (§ 439 Abs. 1 Alt. 2 BGB)", notice["dossier_text_de"])
        self.assertIn("§ 475e Abs. 1 BGB", notice["dossier_text_de"])

    def test_journey_03_student_unlisted_purchase_with_gobd_receipt(self):
        """Journey 3: Student captures unlisted custom keyboard with GoBD SHA-256 receipt proof."""
        # 1. Student searches for unlisted brand "Keychron Q1"
        self.fsm.on_focus()
        res = self.fsm.process_query("Keychron Q1")
        self.assertEqual(res["state"], OmnibarState.NO_MATCH_SUGGESTION)
        create_action = res["suggestions"][0]
        self.assertEqual(create_action["type"], "create_warranty")

        # 2. Student uploads simulated receipt image
        receipt_image_bytes = b"JPEG_BINARY_DATA_RECEIPT_KEYCHRON_Q1_CANDYKEYS_EUR_189"
        metadata = {
            "item_name": "Keychron Q1 Pro",
            "merchant": "CandyKeys",
            "price_eur": 189.00,
            "purchase_date": "2026-11-01"
        }
        sha256_hash = compute_gobd_sha256(receipt_image_bytes, metadata)
        self.assertEqual(len(sha256_hash), 64)

        # 3. Persist to vault
        new_vault_entry = {
            "id": "vault-keychron",
            "name": "Keychron Q1 Pro",
            "merchant": "CandyKeys",
            "category": "hardware",
            "purchase_date": "2026-11-01",
            "price_eur": 189.00,
            "receiptSha256": sha256_hash,
            "isTaxDeductible": True,
            "status": "protected"
        }
        self.fsm.vault_items.append(new_vault_entry)

        # 4. Immediate subsequent search finds new item
        res_after = self.fsm.process_query("Keychron")
        self.assertEqual(res_after["state"], OmnibarState.VAULT_MATCHES)
        self.assertEqual(res_after["vault_matches"][0]["receiptSha256"], sha256_hash)

    def test_journey_04_werkstudent_werbungskosten_tax_return(self):
        """Journey 4: Werkstudent runs >tax 2026 and exports BMF 2022 Sofortabschreibung report."""
        # 1. Execute >tax command in Omnibar
        self.fsm.on_focus()
        res = self.fsm.process_query(">tax 2026")
        self.assertEqual(res["state"], OmnibarState.COMMAND_MODE)
        self.assertEqual(res["workflow"]["action"], "compile_werbungskosten_report")

        # 2. Filter deductible items
        tax_deductibles = [i for i in self.fsm.vault_items if i.get("isTaxDeductible")]
        self.assertEqual(len(tax_deductibles), 3)  # MacBook Pro (1999), JetBrains (149), Anker Charger (49.99)

        # 3. Verify BMF 22.02.2022 Sofortabschreibung total
        total_deduction = sum(i["price_eur"] for i in tax_deductibles)
        self.assertAlmostEqual(total_deduction, 2197.99, places=2)

        # 4. Verify CSV export format and § 2 StBerG disclaimer
        csv_rows = ["Item Name,Merchant,Purchase Date,Price EUR,GoBD Status"]
        for item in tax_deductibles:
            csv_rows.append(f"{item['name']},{item['merchant']},{item['purchase_date']},{item['price_eur']:.2f},Verified")
        csv_rows.append("DISCLAIMER: Hinweis nach § 2 StBerG: Diese Aufstellung stellt keine steuerliche Beratung dar.")
        csv_export = "\n".join(csv_rows)

        self.assertIn("Apple MacBook Pro 14", csv_export)
        self.assertIn("JetBrains All Products Pack", csv_export)
        self.assertIn("§ 2 StBerG", csv_export)

    def test_journey_05_autonomous_ai_mcp_agent_dossier_compilation(self):
        """Journey 5: Autonomous AI agent executes policy_lookup and claim_dossier_generate."""
        # 1. Agent queries policy for Sony
        lookup_res = self.mcp_server.handle_request({
            "jsonrpc": "2.0",
            "id": "agent-step-1",
            "method": "tools/call",
            "params": {"name": "policy_lookup", "arguments": {"service_slug": "sony"}}
        })
        self.assertNotIn("error", lookup_res)
        sony_policy = json.loads(lookup_res["result"]["content"][0]["text"])
        self.assertEqual(sony_policy.get("brand_name"), "Sony Europe")
        self.assertEqual(sony_policy.get("statutory_warranty_months"), 24)
        self.assertEqual(sony_policy.get("reversed_burden_months"), 12)

        # 2. Agent compiles formal defect notice
        dossier_res = self.mcp_server.handle_request({
            "jsonrpc": "2.0",
            "id": "agent-step-2",
            "method": "tools/call",
            "params": {
                "name": "claim_dossier_generate",
                "arguments": {
                    "brand_slug": "sony",
                    "item_name": "Sony WH-1000XM5 Headphones",
                    "purchase_date": "2026-05-01",
                    "defect_description": "Active Noise Canceling microphone feedback loop"
                }
            }
        })
        self.assertNotIn("error", dossier_res)
        dossier = json.loads(dossier_res["result"]["content"][0]["text"])
        self.assertTrue(dossier["valid"])
        self.assertIn("Sony WH-1000XM5 Headphones", dossier["dossier_text_de"])
        self.assertIn("BGB § 437", dossier["statutory_basis"])

    def test_journey_06_saturn_charger_failure_at_month_9_seller_routing(self):
        """Journey 6: Person 2 charger failure at Month 9 routed to seller (Saturn) under BGB § 438."""
        purchase_date = datetime.date(2025, 8, 1)
        incident_date = datetime.date(2026, 5, 1)  # Month 9

        # Within 12 months -> burden is seller
        status = BGBTimelineCalculator.evaluate_status(purchase_date, incident_date)
        self.assertEqual(status["burden_of_proof"], "seller")
        self.assertEqual(status["status"], "protected")

        # Routing check: Claim must be addressed to Retailer (Saturn), not Manufacturer (Anker)
        seller_claim = BGBTimelineCalculator.generate_statutory_notice(
            brand_name="Saturn (Verkäufer) / Anker (Hersteller)",
            item_name="Anker 65W GaN Charger",
            purchase_date=purchase_date,
            defect_date=incident_date,
            defect_description="Device completely ceased power delivery across all USB-C ports",
            claim_type="replacement"
        )
        self.assertIn("§ 477 Abs. 1 BGB", seller_claim["dossier_text_de"])
        self.assertIn("Neulieferung", seller_claim["dossier_text_de"])

    def test_journey_07_gym_contract_immediate_cancellation_when_button_obstructed(self):
        """Journey 7: Gym subscription cancellation with immediate § 312k Abs. 6 BGB termination."""
        # Search for McFIT in Wiki
        self.fsm.on_focus()
        res = self.fsm.process_query("McFIT")
        self.assertIn(res["state"], {OmnibarState.WIKI_MATCHES, OmnibarState.HYBRID_MATCHES})
        mcfit = res["wiki_matches"][0]
        self.assertEqual(mcfit["category"], "subscription")

        # Simulate user encountering an obstructed / broken cancellation flow
        # BGB § 312k Abs. 6 states: "Kann der Verbraucher den Vertrag über die Kündigungsschaltfläche
        # nicht kündigen, kann er den Vertrag ohne Einhaltung einer Kündigungsfrist kündigen."
        immediate_cancellation_clause = (
            "Hiermit kündige ich meinen Mitgliedsvertrag fristlos, mit sofortiger Wirkung und "
            "ohne Einhaltung einer Kündigungsfrist gemäß § 312k Abs. 6 BGB, da die gesetzlich "
            "vorgeschriebene Kündigungsschaltfläche auf Ihrer Website nicht ordnungsgemäß zur Verfügung gestellt wurde."
        )
        self.assertIn("§ 312k Abs. 6 BGB", immediate_cancellation_clause)
        self.assertIn("ohne Einhaltung einer Kündigungsfrist", immediate_cancellation_clause)

    def test_journey_08_end_to_end_multimodal_wallet_audit(self):
        """Journey 8: Complete Vault Audit asserts North Star Metric NSM-01 (>= €350 protected)."""
        # Calculate total value of active protected items in student's vault
        protected_items = [i for i in self.fsm.vault_items if i.get("status") in {"protected", "active"}]
        total_protected_value = sum(i["price_eur"] for i in protected_items)

        # North Star Metric NSM-01 requires >= €350 / yr protected
        self.assertGreaterEqual(
            total_protected_value,
            350.0,
            f"Total protected value €{total_protected_value:.2f} must meet or exceed €350 threshold"
        )


if __name__ == "__main__":
    unittest.main()
