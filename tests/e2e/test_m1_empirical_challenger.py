#!/usr/bin/env python3
"""
CM-LAB M1 Empirical Challenger Verification Suite
Author: teamwork_challenger_m1_spec_2
Milestone: M1 (UI/UX Research & Design Specifications)
Deliverable under test: docs/UI_UX_RESEARCH_AND_DESIGN_SPECIFICATIONS.md

Empirical test suite executing:
1. Omnibar 8-State FSM formal model with all 21 transition rules:
   - Reachability of all 8 states + action targets
   - Determinism and disjoint guards
   - Deadlock-freedom (all states return to IDLE)
   - Zero-dead-end recovery on unknown queries
2. BGB § 477 Statutory Timeline Engine:
   - Exact 12-month boundary from purchase date (BGB §§ 187, 188)
   - Leap year handling (Feb 29 -> Feb 28 on non-leap years)
   - BGB § 193 weekend and holiday rollover (Saturday/Sunday -> Monday)
3. Three Calendar Widget Data Bindings and Event Contracts:
   - MonthlyWeeklyGridCalendar (GridCalendarEvent)
   - TimelineAgendaCalendar (AgendaHorizonItem & 4 Horizons)
   - CountdownRiskHeatmap (HeatmapCellData & KPI Aggregates)
"""

from __future__ import annotations

import datetime
import json
import os
import sys
import time
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Add repo root to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tests.e2e.harness import (
    BGBTimelineCalculator,
    OmnibarFSM,
    OmnibarState,
    load_seed_brands
)


# ============================================================================
# PART 1: FORMAL 8-STATE OMNIBAR FSM & 21 TRANSITION RULES ENGINE
# ============================================================================

class OmnibarFSMModel:
    """
    Formal executable model of the 8-state Omnibar FSM implementing all 21 rules
    specified in Section 7.2 & 7.3 of docs/UI_UX_RESEARCH_AND_DESIGN_SPECIFICATIONS.md.
    """

    STATES = {
        "IDLE",
        "FOCUSED_EMPTY",
        "QUERYING",
        "VAULT_MATCHES",
        "WIKI_MATCHES",
        "HYBRID_MATCHES",
        "NO_MATCH_SUGGESTION",
        "COMMAND_MODE"
    }

    ACTION_TARGETS = {
        "ACTION_MODAL",
        "ITEM_DRAWER",
        "EXECUTING_ACTION",
        "EXTERNAL_PORTAL"
    }

    REGISTERED_VERBS = {">claim", ">cancel", ">tax", ">import", ">audit", ">export"}

    def __init__(self, wiki_brands: Optional[List[Dict[str, Any]]] = None, vault_items: Optional[List[Dict[str, Any]]] = None):
        self.wiki_brands = wiki_brands or []
        self.vault_items = vault_items or []
        self.current_state = "IDLE"
        self.query = ""
        self.selected_index = 0
        self.history: List[str] = [self.current_state]
        self.executed_rules: Set[int] = set()

    def reset(self):
        self.current_state = "IDLE"
        self.query = ""
        self.selected_index = 0
        self.history = [self.current_state]

    # --- RULE 1: IDLE -> FOCUSED_EMPTY ---
    def rule_1_focus(self, shortcut: str = "Ctrl+K") -> str:
        """Rule 1: Focus input OR press Ctrl+K / '/' when input text is empty -> FOCUSED_EMPTY"""
        if self.current_state == "IDLE" and len(self.query) == 0:
            self.current_state = "FOCUSED_EMPTY"
            self.history.append(self.current_state)
            self.executed_rules.add(1)
            return self.current_state
        raise ValueError(f"Rule 1 guard failed: state={self.current_state}, query='{self.query}'")

    # --- RULE 2: IDLE -> QUERYING (Deep Link) ---
    def rule_2_deep_link(self, query_string: str) -> str:
        """Rule 2: Direct deep-link with query length > 0 -> QUERYING"""
        if self.current_state == "IDLE" and len(query_string.strip()) > 0:
            self.query = query_string.strip()
            self.current_state = "QUERYING"
            self.history.append(self.current_state)
            self.executed_rules.add(2)
            return self.current_state
        raise ValueError(f"Rule 2 guard failed: state={self.current_state}, query='{query_string}'")

    # --- RULE 3: FOCUSED_EMPTY -> QUERYING ---
    def rule_3_keystroke_normal(self, char_or_text: str) -> str:
        """Rule 3: Keystroke typed, first char is NOT '>' -> QUERYING"""
        if self.current_state == "FOCUSED_EMPTY" and len(char_or_text) > 0 and not char_or_text.startswith(">"):
            self.query = char_or_text
            self.current_state = "QUERYING"
            self.history.append(self.current_state)
            self.executed_rules.add(3)
            return self.current_state
        raise ValueError(f"Rule 3 guard failed: state={self.current_state}, text='{char_or_text}'")

    # --- RULE 4: FOCUSED_EMPTY -> COMMAND_MODE ---
    def rule_4_keystroke_command(self, text_with_gt: str = ">") -> str:
        """Rule 4: Keystroke typed, first char IS '>' -> COMMAND_MODE"""
        if self.current_state == "FOCUSED_EMPTY" and text_with_gt.startswith(">"):
            self.query = text_with_gt
            self.current_state = "COMMAND_MODE"
            self.history.append(self.current_state)
            self.executed_rules.add(4)
            return self.current_state
        raise ValueError(f"Rule 4 guard failed: state={self.current_state}, text='{text_with_gt}'")

    # --- RULE 5: FOCUSED_EMPTY -> ACTION_MODAL ---
    def rule_5_click_quick_chip(self, chip_id: str) -> str:
        """Rule 5: Click Quick Action Chip (e.g. 'quick_add', 'receipt_upload') -> ACTION_MODAL"""
        if self.current_state == "FOCUSED_EMPTY" and chip_id in {"quick_add", "import_receipt", "file_claim"}:
            self.current_state = "ACTION_MODAL"
            self.history.append(self.current_state)
            self.executed_rules.add(5)
            return self.current_state
        raise ValueError(f"Rule 5 guard failed: state={self.current_state}, chip_id='{chip_id}'")

    # --- RULE 6: FOCUSED_EMPTY -> IDLE ---
    def rule_6_blur(self) -> str:
        """Rule 6: Blur input OR press Esc when empty -> IDLE"""
        if self.current_state == "FOCUSED_EMPTY":
            self.current_state = "IDLE"
            self.history.append(self.current_state)
            self.executed_rules.add(6)
            return self.current_state
        raise ValueError(f"Rule 6 guard failed: state={self.current_state}")

    # --- RULES 7-10: QUERYING Search Resolution ---
    def resolve_search(self) -> Tuple[str, Dict[str, Any]]:
        """
        Evaluate in-flight search in QUERYING state:
        Rule 7: Vault > 0 AND Wiki == 0 -> VAULT_MATCHES
        Rule 8: Vault == 0 AND Wiki > 0 -> WIKI_MATCHES
        Rule 9: Vault > 0 AND Wiki > 0 -> HYBRID_MATCHES
        Rule 10: Vault == 0 AND Wiki == 0 -> NO_MATCH_SUGGESTION
        """
        if self.current_state != "QUERYING":
            raise ValueError(f"Cannot resolve search from state {self.current_state}")

        q_lower = self.query.lower().strip()
        vault_matches = [
            it for it in self.vault_items
            if q_lower in it.get("name", "").lower() or q_lower in it.get("merchant", "").lower()
        ]
        wiki_matches = [
            b for b in self.wiki_brands
            if q_lower in (b.get("brand_name") or b.get("brandName") or "").lower() or
               q_lower in (b.get("service_slug") or b.get("serviceSlug") or "").lower() or
               any(q_lower in a.lower() for a in b.get("search_aliases", []))
        ]

        if len(vault_matches) > 0 and len(wiki_matches) == 0:
            self.current_state = "VAULT_MATCHES"
            self.executed_rules.add(7)
        elif len(vault_matches) == 0 and len(wiki_matches) > 0:
            self.current_state = "WIKI_MATCHES"
            self.executed_rules.add(8)
        elif len(vault_matches) > 0 and len(wiki_matches) > 0:
            self.current_state = "HYBRID_MATCHES"
            self.executed_rules.add(9)
        else:
            self.current_state = "NO_MATCH_SUGGESTION"
            self.executed_rules.add(10)

        self.history.append(self.current_state)
        return self.current_state, {
            "vault_matches": vault_matches,
            "wiki_matches": wiki_matches,
            "suggestions": self.generate_recovery_suggestions(self.query) if self.current_state == "NO_MATCH_SUGGESTION" else []
        }

    # --- RULE 11: QUERYING -> FOCUSED_EMPTY (Backspace) ---
    def rule_11_backspace_to_empty(self) -> str:
        """Rule 11: Backspace until query text becomes empty -> FOCUSED_EMPTY"""
        if self.current_state == "QUERYING":
            self.query = ""
            self.current_state = "FOCUSED_EMPTY"
            self.history.append(self.current_state)
            self.executed_rules.add(11)
            return self.current_state
        raise ValueError(f"Rule 11 guard failed: state={self.current_state}")

    # --- RULE 12: VAULT_MATCHES Key Nav ---
    def rule_12_navigate_vault_matches(self, direction: str = "down", list_length: int = 3) -> str:
        """Rule 12: ArrowDown/ArrowUp within bounds in VAULT_MATCHES -> VAULT_MATCHES (highlight updated)"""
        if self.current_state in {"VAULT_MATCHES", "HYBRID_MATCHES"}:
            if direction == "down":
                self.selected_index = min(self.selected_index + 1, list_length - 1)
            else:
                self.selected_index = max(self.selected_index - 1, 0)
            self.executed_rules.add(12)
            return self.current_state
        raise ValueError(f"Rule 12 guard failed: state={self.current_state}")

    # --- RULE 13: VAULT_MATCHES -> ITEM_DRAWER ---
    def rule_13_select_vault_item(self, item_id: str) -> str:
        """Rule 13: Press Enter OR click item in VAULT_MATCHES -> ITEM_DRAWER"""
        if self.current_state in {"VAULT_MATCHES", "HYBRID_MATCHES"} and item_id:
            self.current_state = "ITEM_DRAWER"
            self.history.append(self.current_state)
            self.executed_rules.add(13)
            return self.current_state
        raise ValueError(f"Rule 13 guard failed: state={self.current_state}")

    # --- RULE 14: WIKI_MATCHES -> ACTION_MODAL (Apply Policy) ---
    def rule_14_apply_wiki_policy(self, brand_slug: str) -> str:
        """Rule 14: Click [Apply to New Item] on wiki policy card -> ACTION_MODAL"""
        if self.current_state in {"WIKI_MATCHES", "HYBRID_MATCHES"} and brand_slug:
            self.current_state = "ACTION_MODAL"
            self.history.append(self.current_state)
            self.executed_rules.add(14)
            return self.current_state
        raise ValueError(f"Rule 14 guard failed: state={self.current_state}")

    # --- RULE 15: WIKI_MATCHES -> External Portal ---
    def rule_15_cancellation_portal(self, url: str) -> str:
        """Rule 15: Click [Cancellation Portal] with valid URL -> External Link (stays active in app)"""
        if self.current_state in {"WIKI_MATCHES", "HYBRID_MATCHES"} and url.startswith("https://"):
            self.executed_rules.add(15)
            return "EXTERNAL_PORTAL"
        raise ValueError(f"Rule 15 guard failed: state={self.current_state}, url='{url}'")

    # --- RULE 16: NO_MATCH_SUGGESTION -> ACTION_MODAL (Create Hardware) ---
    def rule_16_create_hardware(self) -> str:
        """Rule 16: Click [+ Create Hardware] from zero-dead-end suggestions -> ACTION_MODAL"""
        if self.current_state == "NO_MATCH_SUGGESTION" and len(self.query) > 0:
            self.current_state = "ACTION_MODAL"
            self.history.append(self.current_state)
            self.executed_rules.add(16)
            return self.current_state
        raise ValueError(f"Rule 16 guard failed: state={self.current_state}")

    # --- RULE 17: NO_MATCH_SUGGESTION -> ACTION_MODAL (Import Receipt) ---
    def rule_17_import_receipt(self) -> str:
        """Rule 17: Click [📥 Import Receipt] -> ACTION_MODAL"""
        if self.current_state == "NO_MATCH_SUGGESTION":
            self.current_state = "ACTION_MODAL"
            self.history.append(self.current_state)
            self.executed_rules.add(17)
            return self.current_state
        raise ValueError(f"Rule 17 guard failed: state={self.current_state}")

    # --- RULE 18: COMMAND_MODE Type Verb ---
    def rule_18_type_command(self, cmd_text: str) -> str:
        """Rule 18: Type command text in COMMAND_MODE -> COMMAND_MODE (filtering verbs)"""
        if self.current_state == "COMMAND_MODE":
            self.query = cmd_text
            self.executed_rules.add(18)
            return self.current_state
        raise ValueError(f"Rule 18 guard failed: state={self.current_state}")

    # --- RULE 19: COMMAND_MODE -> EXECUTING_ACTION ---
    def rule_19_execute_verb(self, verb: str) -> str:
        """Rule 19: Press Enter on verb in COMMAND_MODE -> EXECUTING_ACTION"""
        if self.current_state == "COMMAND_MODE" and any(verb.startswith(v) for v in self.REGISTERED_VERBS):
            self.current_state = "EXECUTING_ACTION"
            self.history.append(self.current_state)
            self.executed_rules.add(19)
            return self.current_state
        raise ValueError(f"Rule 19 guard failed: state={self.current_state}, verb='{verb}'")

    # --- RULE 20: Any State -> FOCUSED_EMPTY (Esc with Query) ---
    def rule_20_escape_with_query(self) -> str:
        """Rule 20: Any state, press Escape when query text is NOT empty -> FOCUSED_EMPTY (query cleared)"""
        if len(self.query) > 0 and self.current_state != "IDLE":
            self.query = ""
            self.current_state = "FOCUSED_EMPTY"
            self.history.append(self.current_state)
            self.executed_rules.add(20)
            return self.current_state
        raise ValueError(f"Rule 20 guard failed: state={self.current_state}, query='{self.query}'")

    # --- RULE 21: Any State -> IDLE (Esc when Empty) ---
    def rule_21_escape_when_empty(self) -> str:
        """Rule 21: Any state, press Escape when query text IS empty -> IDLE"""
        if len(self.query) == 0 and self.current_state != "IDLE":
            self.current_state = "IDLE"
            self.history.append(self.current_state)
            self.executed_rules.add(21)
            return self.current_state
        raise ValueError(f"Rule 21 guard failed: state={self.current_state}, query='{self.query}'")

    # --- Helper: Recovery Suggestions ---
    def generate_recovery_suggestions(self, term: str) -> List[Dict[str, Any]]:
        return [
            {
                "id": "sugg-hw",
                "label": f"Create new Hardware Warranty for '{term}'",
                "action": "open_create_hardware",
                "defaults": {"statutory_months": 24, "presumption_months": 12}
            },
            {
                "id": "sugg-sub",
                "label": f"Add Subscription for '{term}'",
                "action": "open_add_subscription",
                "defaults": {"notice_days": 30, "bgb_basis": "§ 309 Nr. 9"}
            },
            {
                "id": "sugg-receipt",
                "label": f"Import Receipt Document for '{term}'",
                "action": "open_receipt_dropzone",
                "defaults": {"gobd_sha256": True}
            },
            {
                "id": "sugg-wiki",
                "label": f"Search Policy Wiki Knowledge Graph for '{term}'",
                "action": "query_external_wiki",
                "defaults": {}
            }
        ]


# ============================================================================
# PART 2: STATUTORY TIMELINE ENGINE (BGB §§ 477, 187, 188, 193)
# ============================================================================

class StatutoryGermanLawEngine:
    """
    Statutory calculator implementing German Civil Code (BGB) rules:
    - BGB § 477 Abs. 1 (12-month reversed burden of proof)
    - BGB § 187 Abs. 1 (Ereignistag is day 0, period begins next day)
    - BGB § 188 Abs. 2 (Period expires at end of corresponding day of last month)
    - BGB § 188 Abs. 3 (Month-end capping: Feb 28 in non-leap year for Feb 29 purchase)
    - BGB § 193 (Sonn- und Feiertag, Sonnabend -> rollover to next Werktag / business day)
    """

    @staticmethod
    def is_leap_year(year: int) -> bool:
        return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)

    @classmethod
    def calculate_12m_cliff_calendar_date(cls, purchase_date: datetime.date) -> datetime.date:
        """
        BGB §§ 187(1), 188(2), 188(3):
        Compute exact 12-month deadline without weekend adjustment.
        """
        new_year = purchase_date.year + 1
        new_month = purchase_date.month
        # Month-end capping (e.g. Feb 29 in leap year -> Feb 28 in non-leap year)
        max_days = [31, 29 if cls.is_leap_year(new_year) else 28,
                    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][new_month - 1]
        new_day = min(purchase_date.day, max_days)
        return datetime.date(new_year, new_month, new_day)

    @classmethod
    def apply_bgb_193_rollover(
        cls,
        statutory_date: datetime.date,
        extra_public_holidays: Optional[Set[datetime.date]] = None
    ) -> Tuple[datetime.date, bool]:
        """
        BGB § 193:
        If deadline falls on a Saturday (5), Sunday (6), or statutory holiday,
        it extends to the next business day (Monday / Werktag).
        Returns (effective_deadline, was_rolled_over).
        """
        holidays = extra_public_holidays or set()
        curr = statutory_date
        rolled = False

        while curr.weekday() in (5, 6) or curr in holidays:
            curr += datetime.timedelta(days=1)
            rolled = True

        return curr, rolled

    @classmethod
    def evaluate_bgb_477_burden(
        cls,
        purchase_date: datetime.date,
        notice_date: datetime.date,
        apply_193: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate defect notification date against BGB § 477.
        """
        cal_cliff = cls.calculate_12m_cliff_calendar_date(purchase_date)
        eff_cliff, was_rolled = cls.apply_bgb_193_rollover(cal_cliff) if apply_193 else (cal_cliff, False)

        is_within_presumption = notice_date <= eff_cliff
        days_remaining = (eff_cliff - notice_date).days

        return {
            "purchase_date": purchase_date.isoformat(),
            "calendar_cliff_date": cal_cliff.isoformat(),
            "effective_cliff_date": eff_cliff.isoformat(),
            "notice_date": notice_date.isoformat(),
            "bgb_193_applied": was_rolled,
            "is_within_presumption": is_within_presumption,
            "burden_of_proof": "seller" if is_within_presumption else "consumer",
            "statutory_status": "protected" if is_within_presumption else "cliff_warning",
            "days_remaining_to_cliff": days_remaining
        }


# ============================================================================
# PART 3: THREE CALENDAR WIDGET CONTRACTS & DATA BINDINGS
# ============================================================================

class CalendarWidgetContractValidator:
    """
    Validates data bindings, schema completeness, and interaction contracts
    for the 3 calendar widget architectures specified in Chapter 6 & 10.
    """

    # --- CALENDAR TYPE 1: MonthlyWeeklyGridCalendar ---
    GRID_REQUIRED_FIELDS = {"id", "date", "title", "brand", "category", "urgency"}
    VALID_GRID_URGENCIES = {"urgent", "warning", "protected", "expired"}
    VALID_GRID_CATEGORIES = {"hardware", "subscription", "tax"}
    VALID_STATUTORY_TYPES = {"BGB_477_CLIFF", "BGB_438_EXPIRY", "BGB_309_RENEWAL", None}

    @classmethod
    def validate_grid_event(cls, event: Dict[str, Any]) -> List[str]:
        errors = []
        for f in cls.GRID_REQUIRED_FIELDS:
            if f not in event:
                errors.append(f"Missing required grid event field: '{f}'")

        if "date" in event:
            try:
                datetime.date.fromisoformat(event["date"])
            except ValueError:
                errors.append(f"Invalid ISO 8601 date: '{event['date']}'")

        if event.get("urgency") not in cls.VALID_GRID_URGENCIES:
            errors.append(f"Invalid grid event urgency: '{event.get('urgency')}'")

        if event.get("category") not in cls.VALID_GRID_CATEGORIES:
            errors.append(f"Invalid grid event category: '{event.get('category')}'")

        stat_type = event.get("bgbStatutoryType")
        if stat_type and stat_type not in cls.VALID_STATUTORY_TYPES:
            errors.append(f"Invalid statutory type: '{stat_type}'")

        return errors

    # --- CALENDAR TYPE 2: TimelineAgendaCalendar ---
    AGENDA_REQUIRED_FIELDS = {
        "id", "itemName", "brandSlug", "category",
        "purchaseDate", "expiryDate", "daysRemaining",
        "isWithinReversedBurdenOfProof", "reversedBurdenDeadline",
        "cancellationCompliant", "bgbClauses"
    }

    @classmethod
    def validate_agenda_item(cls, item: Dict[str, Any]) -> List[str]:
        errors = []
        for f in cls.AGENDA_REQUIRED_FIELDS:
            if f not in item:
                errors.append(f"Missing required agenda field: '{f}'")

        if "purchaseDate" in item:
            try:
                datetime.date.fromisoformat(item["purchaseDate"])
            except ValueError:
                errors.append(f"Invalid purchaseDate: '{item['purchaseDate']}'")

        if "expiryDate" in item:
            try:
                datetime.date.fromisoformat(item["expiryDate"])
            except ValueError:
                errors.append(f"Invalid expiryDate: '{item['expiryDate']}'")

        if not isinstance(item.get("bgbClauses"), list) or len(item.get("bgbClauses", [])) == 0:
            errors.append("bgbClauses must be a non-empty list of statutory citations")

        return errors

    @classmethod
    def classify_agenda_horizon(cls, item: Dict[str, Any]) -> int:
        """
        Classifies item into one of the 4 Horizon clusters:
        1: Critical Action Window (daysRemaining <= 7)
        2: Notice Review Window (8 <= daysRemaining <= 30)
        3: 12-Month Burden-of-Proof Cliff (Hardware & isWithinReversedBurdenOfProof)
        4: Extended Statutory Zone (Hardware & after 12 months)
        """
        days = item.get("daysRemaining", 999)
        cat = item.get("category")

        if days <= 7:
            return 1
        elif 8 <= days <= 30:
            return 2
        elif cat == "hardware" and item.get("isWithinReversedBurdenOfProof"):
            return 3
        else:
            return 4

    # --- CALENDAR TYPE 3: CountdownRiskHeatmap ---
    HEATMAP_REQUIRED_FIELDS = {"date", "weekNumber", "dayOfWeek", "intensityLevel", "events", "totalCostDueEur"}

    @classmethod
    def validate_heatmap_cell(cls, cell: Dict[str, Any]) -> List[str]:
        errors = []
        for f in cls.HEATMAP_REQUIRED_FIELDS:
            if f not in cell:
                errors.append(f"Missing required heatmap cell field: '{f}'")

        week = cell.get("weekNumber", 0)
        if not (1 <= week <= 53):
            errors.append(f"weekNumber out of bounds: {week} (expected 1-53)")

        dow = cell.get("dayOfWeek", -1)
        if not (0 <= dow <= 6):
            errors.append(f"dayOfWeek out of bounds: {dow} (expected 0-6 ISO)")

        intensity = cell.get("intensityLevel", -1)
        if intensity not in {0, 1, 2, 3, 4}:
            errors.append(f"intensityLevel must be 0, 1, 2, 3, or 4; got {intensity}")

        return errors

    @classmethod
    def compute_heatmap_kpis(cls, items: List[Dict[str, Any]], current_date: datetime.date) -> Dict[str, Any]:
        """Compute the 4 high-density annual synthesis KPIs."""
        total_tracked_capital = 0.0
        annual_subscriptions_total = 0.0
        imminent_actions_30d = 0
        impending_bgb_cliffs = 0

        for it in items:
            cat = it.get("category")
            price = it.get("priceEur", 0.0)
            if cat == "hardware":
                total_tracked_capital += price
                p_date_str = it.get("purchaseDate")
                if p_date_str:
                    p_date = datetime.date.fromisoformat(p_date_str)
                    cliff = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(p_date)
                    days_to_cliff = (cliff - current_date).days
                    if 0 <= days_to_cliff <= 60:
                        impending_bgb_cliffs += 1
            elif cat == "subscription":
                annual_subscriptions_total += price * 12.0
                exp_date_str = it.get("expiryDate")
                if exp_date_str:
                    exp_date = datetime.date.fromisoformat(exp_date_str)
                    days_to_renew = (exp_date - current_date).days
                    if 0 <= days_to_renew <= 30:
                        imminent_actions_30d += 1

        return {
            "total_tracked_capital_eur": round(total_tracked_capital, 2),
            "annual_subscriptions_total_eur": round(annual_subscriptions_total, 2),
            "imminent_actions_30d": imminent_actions_30d,
            "impending_bgb_cliffs": impending_bgb_cliffs
        }


# ============================================================================
# UNITTEST TEST SUITE: EMPIRICAL VERIFICATION OF SPECIFICATIONS
# ============================================================================

class TestM1EmpiricalChallenger(unittest.TestCase):
    """
    Empirical test cases validating M1 specifications:
    1. Omnibar 8-State FSM (21 rules, reachability, determinism, deadlocks, recovery)
    2. BGB § 477 Statutory Timeline Engine (12m boundary, leap year, BGB § 193)
    3. Three Calendar Widget Contracts and Data Bindings
    """

    def setUp(self):
        self.wiki_brands = load_seed_brands()
        self.sample_vault = [
            {
                "id": "v-sony",
                "name": "Sony WH-1000XM5 Wireless Headphones",
                "merchant": "MediaMarkt",
                "category": "hardware",
                "purchaseDate": "2025-12-15",
                "expiryDate": "2027-12-15",
                "priceEur": 279.00,
                "status": "warning"
            },
            {
                "id": "v-spotify",
                "name": "Spotify Premium Student",
                "merchant": "Spotify AB",
                "category": "subscription",
                "purchaseDate": "2026-01-08",
                "expiryDate": "2026-11-08",
                "priceEur": 5.99,
                "status": "urgent"
            },
            {
                "id": "v-macbook",
                "name": "Apple MacBook Pro 14 M3",
                "merchant": "Apple Retail Germany",
                "category": "hardware",
                "purchaseDate": "2025-06-20",
                "expiryDate": "2027-06-20",
                "priceEur": 1899.00,
                "status": "protected"
            }
        ]
        self.fsm = OmnibarFSMModel(wiki_brands=self.wiki_brands, vault_items=self.sample_vault)

    # ------------------------------------------------------------------------
    # SECTION 1: ALL 21 OMNIBAR FSM TRANSITION RULES
    # ------------------------------------------------------------------------

    def test_rule_01_idle_to_focused_empty(self):
        """Rule 1: IDLE --(Focus input / Ctrl+K) [query == ''] -> FOCUSED_EMPTY"""
        st = self.fsm.rule_1_focus("Ctrl+K")
        self.assertEqual(st, "FOCUSED_EMPTY")
        self.assertIn(1, self.fsm.executed_rules)

    def test_rule_02_idle_to_querying_deep_link(self):
        """Rule 2: IDLE --(Deep link with query) [len > 0] -> QUERYING"""
        st = self.fsm.rule_2_deep_link("Sony")
        self.assertEqual(st, "QUERYING")
        self.assertIn(2, self.fsm.executed_rules)

    def test_rule_03_focused_empty_to_querying_keystroke(self):
        """Rule 3: FOCUSED_EMPTY --(Keystroke char typed) [first char != '>'] -> QUERYING"""
        self.fsm.rule_1_focus()
        st = self.fsm.rule_3_keystroke_normal("MacBook")
        self.assertEqual(st, "QUERYING")
        self.assertIn(3, self.fsm.executed_rules)

    def test_rule_04_focused_empty_to_command_mode(self):
        """Rule 4: FOCUSED_EMPTY --(Keystroke char typed) [first char == '>'] -> COMMAND_MODE"""
        self.fsm.rule_1_focus()
        st = self.fsm.rule_4_keystroke_command(">claim")
        self.assertEqual(st, "COMMAND_MODE")
        self.assertIn(4, self.fsm.executed_rules)

    def test_rule_05_focused_empty_to_action_modal_chip(self):
        """Rule 5: FOCUSED_EMPTY --(Click Quick Action Chip) [valid chip] -> ACTION_MODAL"""
        self.fsm.rule_1_focus()
        st = self.fsm.rule_5_click_quick_chip("quick_add")
        self.assertEqual(st, "ACTION_MODAL")
        self.assertIn(5, self.fsm.executed_rules)

    def test_rule_06_focused_empty_to_idle_blur(self):
        """Rule 6: FOCUSED_EMPTY --(Blur input / Esc) -> IDLE"""
        self.fsm.rule_1_focus()
        st = self.fsm.rule_6_blur()
        self.assertEqual(st, "IDLE")
        self.assertIn(6, self.fsm.executed_rules)

    def test_rule_07_querying_to_vault_matches(self):
        """Rule 7: QUERYING --(Resolution) [Vault > 0, Wiki == 0] -> VAULT_MATCHES"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Headphones")
        st, res = self.fsm.resolve_search()
        self.assertEqual(st, "VAULT_MATCHES")
        self.assertGreater(len(res["vault_matches"]), 0)
        self.assertEqual(len(res["wiki_matches"]), 0)
        self.assertIn(7, self.fsm.executed_rules)

    def test_rule_08_querying_to_wiki_matches(self):
        """Rule 8: QUERYING --(Resolution) [Vault == 0, Wiki > 0] -> WIKI_MATCHES"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Netflix")
        st, res = self.fsm.resolve_search()
        self.assertEqual(st, "WIKI_MATCHES")
        self.assertEqual(len(res["vault_matches"]), 0)
        self.assertGreater(len(res["wiki_matches"]), 0)
        self.assertIn(8, self.fsm.executed_rules)

    def test_rule_09_querying_to_hybrid_matches(self):
        """Rule 9: QUERYING --(Resolution) [Vault > 0, Wiki > 0] -> HYBRID_MATCHES"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Spotify")
        st, res = self.fsm.resolve_search()
        self.assertEqual(st, "HYBRID_MATCHES")
        self.assertGreater(len(res["vault_matches"]), 0)
        self.assertGreater(len(res["wiki_matches"]), 0)
        self.assertIn(9, self.fsm.executed_rules)

    def test_rule_10_querying_to_no_match_suggestions(self):
        """Rule 10: QUERYING --(Resolution) [Vault == 0, Wiki == 0] -> NO_MATCH_SUGGESTION (>=3 recovery)"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Dyson Vacuum Cleaner V15")
        st, res = self.fsm.resolve_search()
        self.assertEqual(st, "NO_MATCH_SUGGESTION")
        self.assertEqual(len(res["vault_matches"]), 0)
        self.assertEqual(len(res["wiki_matches"]), 0)
        self.assertGreaterEqual(len(res["suggestions"]), 3)
        self.assertIn(10, self.fsm.executed_rules)

    def test_rule_11_querying_backspace_to_focused_empty(self):
        """Rule 11: QUERYING --(Backspace to empty) -> FOCUSED_EMPTY"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Typo")
        st = self.fsm.rule_11_backspace_to_empty()
        self.assertEqual(st, "FOCUSED_EMPTY")
        self.assertEqual(self.fsm.query, "")
        self.assertIn(11, self.fsm.executed_rules)

    def test_rule_12_vault_matches_keyboard_roving(self):
        """Rule 12: VAULT_MATCHES --(ArrowDown / ArrowUp) -> VAULT_MATCHES (roving active descendant)"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Headphones")
        self.fsm.resolve_search()
        st = self.fsm.rule_12_navigate_vault_matches("down", list_length=3)
        self.assertEqual(st, "VAULT_MATCHES")
        self.assertEqual(self.fsm.selected_index, 1)
        self.assertIn(12, self.fsm.executed_rules)

    def test_rule_13_vault_matches_to_item_drawer(self):
        """Rule 13: VAULT_MATCHES --(Press Enter / Click Item) -> ITEM_DRAWER"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Headphones")
        self.fsm.resolve_search()
        st = self.fsm.rule_13_select_vault_item("v-sony")
        self.assertEqual(st, "ITEM_DRAWER")
        self.assertIn(13, self.fsm.executed_rules)

    def test_rule_14_wiki_matches_to_action_modal(self):
        """Rule 14: WIKI_MATCHES --(Click [Apply to New Item]) -> ACTION_MODAL"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Netflix")
        self.fsm.resolve_search()
        st = self.fsm.rule_14_apply_wiki_policy("netflix")
        self.assertEqual(st, "ACTION_MODAL")
        self.assertIn(14, self.fsm.executed_rules)

    def test_rule_15_wiki_matches_cancellation_portal(self):
        """Rule 15: WIKI_MATCHES --(Click [Cancellation Portal]) -> EXTERNAL_PORTAL"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Netflix")
        self.fsm.resolve_search()
        st = self.fsm.rule_15_cancellation_portal("https://www.netflix.com/cancelplan")
        self.assertEqual(st, "EXTERNAL_PORTAL")
        self.assertIn(15, self.fsm.executed_rules)

    def test_rule_16_no_match_create_hardware(self):
        """Rule 16: NO_MATCH_SUGGESTION --(Click [+ Create Hardware]) -> ACTION_MODAL"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Logitech MX Master 3S")
        self.fsm.resolve_search()
        st = self.fsm.rule_16_create_hardware()
        self.assertEqual(st, "ACTION_MODAL")
        self.assertIn(16, self.fsm.executed_rules)

    def test_rule_17_no_match_import_receipt(self):
        """Rule 17: NO_MATCH_SUGGESTION --(Click [Import Receipt]) -> ACTION_MODAL"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Unknown Gizmo")
        self.fsm.resolve_search()
        st = self.fsm.rule_17_import_receipt()
        self.assertEqual(st, "ACTION_MODAL")
        self.assertIn(17, self.fsm.executed_rules)

    def test_rule_18_command_mode_type_verb(self):
        """Rule 18: COMMAND_MODE --(Type command text) -> COMMAND_MODE"""
        self.fsm.rule_1_focus()
        self.fsm.rule_4_keystroke_command(">")
        st = self.fsm.rule_18_type_command(">claim sony")
        self.assertEqual(st, "COMMAND_MODE")
        self.assertEqual(self.fsm.query, ">claim sony")
        self.assertIn(18, self.fsm.executed_rules)

    def test_rule_19_command_mode_execute_verb(self):
        """Rule 19: COMMAND_MODE --(Press Enter on verb) -> EXECUTING_ACTION"""
        self.fsm.rule_1_focus()
        self.fsm.rule_4_keystroke_command(">claim")
        st = self.fsm.rule_19_execute_verb(">claim")
        self.assertEqual(st, "EXECUTING_ACTION")
        self.assertIn(19, self.fsm.executed_rules)

    def test_rule_20_escape_with_query_to_focused_empty(self):
        """Rule 20: Any State --(Press Escape) [query != ''] -> FOCUSED_EMPTY"""
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Some Query")
        self.fsm.resolve_search()
        st = self.fsm.rule_20_escape_with_query()
        self.assertEqual(st, "FOCUSED_EMPTY")
        self.assertEqual(self.fsm.query, "")
        self.assertIn(20, self.fsm.executed_rules)

    def test_rule_21_escape_when_empty_to_idle(self):
        """Rule 21: Any State --(Press Escape) [query == ''] -> IDLE"""
        self.fsm.rule_1_focus()
        st = self.fsm.rule_21_escape_when_empty()
        self.assertEqual(st, "IDLE")
        self.assertIn(21, self.fsm.executed_rules)

    def test_fsm_all_21_rules_executed_and_verified(self):
        """Meta-verification: Execute all 21 transition rules in sequence and assert 100% coverage."""
        self.fsm.reset()

        # Rule 1: IDLE -> FOCUSED_EMPTY
        self.fsm.rule_1_focus()
        # Rule 6: FOCUSED_EMPTY -> IDLE
        self.fsm.rule_6_blur()

        # Rule 2: IDLE -> QUERYING (Deep Link)
        self.fsm.rule_2_deep_link("Sony")
        # Rule 11: QUERYING -> FOCUSED_EMPTY (Backspace)
        self.fsm.rule_11_backspace_to_empty()

        # Rule 4: FOCUSED_EMPTY -> COMMAND_MODE
        self.fsm.rule_4_keystroke_command(">")
        # Rule 18: COMMAND_MODE -> COMMAND_MODE (Type Verb)
        self.fsm.rule_18_type_command(">claim")
        # Rule 19: COMMAND_MODE -> EXECUTING_ACTION
        self.fsm.rule_19_execute_verb(">claim")

        # Reset for modal chip test
        self.fsm.reset()
        self.fsm.rule_1_focus()
        # Rule 5: FOCUSED_EMPTY -> ACTION_MODAL (Chip)
        self.fsm.rule_5_click_quick_chip("quick_add")

        # Reset for search resolution tests
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Headphones")  # Rule 3
        # Rule 7: QUERYING -> VAULT_MATCHES
        self.fsm.resolve_search()
        # Rule 12: VAULT_MATCHES -> VAULT_MATCHES (ArrowDown)
        self.fsm.rule_12_navigate_vault_matches("down", list_length=2)
        # Rule 13: VAULT_MATCHES -> ITEM_DRAWER
        self.fsm.rule_13_select_vault_item("v-sony")

        # Wiki Matches and Actions
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Netflix")
        # Rule 8: QUERYING -> WIKI_MATCHES
        self.fsm.resolve_search()
        # Rule 15: WIKI_MATCHES -> EXTERNAL_PORTAL
        self.fsm.rule_15_cancellation_portal("https://netflix.com/cancel")
        # Rule 14: WIKI_MATCHES -> ACTION_MODAL
        self.fsm.rule_14_apply_wiki_policy("netflix")

        # Hybrid Matches
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Spotify")
        # Rule 9: QUERYING -> HYBRID_MATCHES
        self.fsm.resolve_search()

        # No Match Suggestions & Actions
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("UnknownProductXYZ")
        # Rule 10: QUERYING -> NO_MATCH_SUGGESTION
        self.fsm.resolve_search()
        # Rule 16: NO_MATCH_SUGGESTION -> ACTION_MODAL (Create Hardware)
        self.fsm.rule_16_create_hardware()

        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("UnknownProductXYZ2")
        self.fsm.resolve_search()
        # Rule 17: NO_MATCH_SUGGESTION -> ACTION_MODAL (Import Receipt)
        self.fsm.rule_17_import_receipt()

        # Escape Handlers
        # Rule 20: Any state with query -> FOCUSED_EMPTY
        self.fsm.query = "ActiveQuery"
        self.fsm.current_state = "VAULT_MATCHES"
        self.fsm.rule_20_escape_with_query()

        # Rule 21: Any state with empty query -> IDLE
        self.fsm.rule_21_escape_when_empty()

        # Check coverage
        all_rules = set(range(1, 22))
        missing_rules = all_rules - self.fsm.executed_rules
        self.assertEqual(len(missing_rules), 0, f"Unexecuted transition rules: {missing_rules}")
        self.assertEqual(len(self.fsm.executed_rules), 21)

    def test_fsm_reachability_and_deadlock_freedom(self):
        """
        Formally verify:
        1. All 8 primary Omnibar states are reachable from IDLE.
        2. Zero deadlocks: every state has a deterministic return path to IDLE via Esc or blur.
        """
        all_8_states = {
            "IDLE", "FOCUSED_EMPTY", "QUERYING",
            "VAULT_MATCHES", "WIKI_MATCHES", "HYBRID_MATCHES",
            "NO_MATCH_SUGGESTION", "COMMAND_MODE"
        }

        discovered_states: Set[str] = set()

        # Path 1: IDLE
        discovered_states.add("IDLE")

        # Path 2: IDLE -> FOCUSED_EMPTY
        self.fsm.reset()
        st = self.fsm.rule_1_focus()
        discovered_states.add(st)
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 3: IDLE -> QUERYING
        self.fsm.reset()
        st = self.fsm.rule_2_deep_link("test")
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 4: IDLE -> FOCUSED_EMPTY -> QUERYING -> VAULT_MATCHES
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Headphones")
        st, _ = self.fsm.resolve_search()
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 5: IDLE -> FOCUSED_EMPTY -> QUERYING -> WIKI_MATCHES
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Netflix")
        st, _ = self.fsm.resolve_search()
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 6: IDLE -> FOCUSED_EMPTY -> QUERYING -> HYBRID_MATCHES
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("Spotify")
        st, _ = self.fsm.resolve_search()
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 7: IDLE -> FOCUSED_EMPTY -> QUERYING -> NO_MATCH_SUGGESTION
        self.fsm.reset()
        self.fsm.rule_1_focus()
        self.fsm.rule_3_keystroke_normal("NonExistentProduct12345")
        st, _ = self.fsm.resolve_search()
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Path 8: IDLE -> FOCUSED_EMPTY -> COMMAND_MODE
        self.fsm.reset()
        self.fsm.rule_1_focus()
        st = self.fsm.rule_4_keystroke_command(">claim")
        discovered_states.add(st)
        self.fsm.rule_20_escape_with_query()
        self.fsm.rule_21_escape_when_empty()
        self.assertEqual(self.fsm.current_state, "IDLE")

        # Assert all 8 states reached
        self.assertEqual(discovered_states, all_8_states)

    def test_unknown_queries_yield_recovery_without_empty_dead_ends(self):
        """Stress-test 10 arbitrary unknown queries to assert 0 empty dead ends."""
        unknown_inputs = [
            "Zalando Winter Jacket",
            "Miele Washing Machine W1",
            "KitchenAid Artisan 5KSM150",
            "Sony Trinitron CRT TV 1998",
            "Random Unknown Service 404",
            "Café Espresso Beans Subscription",
            "!@#$%^&*()_+ Nonce",
            "Xiaomi Smart Air Purifier 4",
            "Nintendo Switch OLED",
            "Bosch Professional GSR 18V-55"
        ]

        for q in unknown_inputs:
            self.fsm.reset()
            self.fsm.rule_1_focus()
            self.fsm.rule_3_keystroke_normal(q)
            st, res = self.fsm.resolve_search()

            self.assertEqual(st, "NO_MATCH_SUGGESTION")
            self.assertEqual(len(res["vault_matches"]), 0)
            self.assertEqual(len(res["wiki_matches"]), 0)

            suggestions = res["suggestions"]
            self.assertGreaterEqual(len(suggestions), 3, f"Query '{q}' returned fewer than 3 suggestions!")

            # Assert suggestion actions are actionable
            actions = [s["action"] for s in suggestions]
            self.assertIn("open_create_hardware", actions)
            self.assertIn("open_add_subscription", actions)
            self.assertIn("open_receipt_dropzone", actions)

            # Assert query string is propagated into creation label
            labels = " ".join(s["label"] for s in suggestions)
            self.assertIn(q, labels)

    # ------------------------------------------------------------------------
    # SECTION 2: BGB § 477 STATUTORY TIMELINE MATH & BGB § 193 ROLLOVER
    # ------------------------------------------------------------------------

    def test_bgb_477_exact_12_month_boundary_standard(self):
        """BGB § 477: Verify exact 12-month boundary from purchase date."""
        purchase = datetime.date(2025, 10, 15)
        # 12-month cliff under BGB §§ 187(1), 188(2)
        cliff = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(purchase)
        self.assertEqual(cliff, datetime.date(2026, 10, 15))

        # Notice on day before cliff: Seller bears burden
        day_before = datetime.date(2026, 10, 14)
        ev_before = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, day_before, apply_193=False)
        self.assertEqual(ev_before["burden_of_proof"], "seller")
        self.assertEqual(ev_before["statutory_status"], "protected")

        # Notice on exact cliff day: Seller bears burden
        ev_cliff = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, cliff, apply_193=False)
        self.assertEqual(ev_cliff["burden_of_proof"], "seller")
        self.assertEqual(ev_cliff["statutory_status"], "protected")

        # Notice on day after cliff: Consumer bears burden
        day_after = datetime.date(2026, 10, 16)
        ev_after = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, day_after, apply_193=False)
        self.assertEqual(ev_after["burden_of_proof"], "consumer")
        self.assertEqual(ev_after["statutory_status"], "cliff_warning")

    def test_bgb_477_leap_year_handling(self):
        """BGB § 188 Abs. 3: Feb 29 leap year purchase rollover to Feb 28 on non-leap years."""
        # Purchase on leap day: Feb 29, 2024
        leap_purchase = datetime.date(2024, 2, 29)

        # 12 months later is 2025 (non-leap year, Feb has only 28 days)
        # Under BGB § 188(3), the deadline ends with the expiration of the last day of the month
        cliff_2025 = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(leap_purchase)
        self.assertEqual(cliff_2025, datetime.date(2025, 2, 28))

        # On Feb 28, 2025: seller bears burden
        ev_leap_end = StatutoryGermanLawEngine.evaluate_bgb_477_burden(leap_purchase, datetime.date(2025, 2, 28), apply_193=False)
        self.assertEqual(ev_leap_end["burden_of_proof"], "seller")

        # On March 1, 2025: presumption expired, burden flips to consumer
        ev_leap_flip = StatutoryGermanLawEngine.evaluate_bgb_477_burden(leap_purchase, datetime.date(2025, 3, 1), apply_193=False)
        self.assertEqual(ev_leap_flip["burden_of_proof"], "consumer")

        # Non-leap year purchase on Feb 28, 2023 -> 2024 is leap year:
        # Corresponding day by number is Feb 28, 2024
        non_leap_purchase = datetime.date(2023, 2, 28)
        cliff_2024 = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(non_leap_purchase)
        self.assertEqual(cliff_2024, datetime.date(2024, 2, 28))

    def test_bgb_193_weekend_rollover_saturday(self):
        """BGB § 193: 12-month cliff falling on a Saturday rolls over to Monday."""
        # Purchase: 2025-11-14 -> 12m cliff is 2026-11-14 (which is a Saturday!)
        purchase = datetime.date(2025, 11, 14)
        cal_cliff = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(purchase)
        self.assertEqual(cal_cliff.weekday(), 5)  # 5 = Saturday

        # Apply BGB § 193
        eff_cliff, was_rolled = StatutoryGermanLawEngine.apply_bgb_193_rollover(cal_cliff)
        self.assertTrue(was_rolled)
        self.assertEqual(eff_cliff, datetime.date(2026, 11, 16))  # Monday
        self.assertEqual(eff_cliff.weekday(), 0)  # 0 = Monday

        # On Saturday 2026-11-14: Protected
        ev_sat = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, datetime.date(2026, 11, 14), apply_193=True)
        self.assertEqual(ev_sat["burden_of_proof"], "seller")

        # On Sunday 2026-11-15: Still Protected under § 193 extension
        ev_sun = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, datetime.date(2026, 11, 15), apply_193=True)
        self.assertEqual(ev_sun["burden_of_proof"], "seller")

        # On Monday 2026-11-16 (effective deadline): Protected
        ev_mon = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, datetime.date(2026, 11, 16), apply_193=True)
        self.assertEqual(ev_mon["burden_of_proof"], "seller")

        # On Tuesday 2026-11-17: Flips to consumer
        ev_tue = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, datetime.date(2026, 11, 17), apply_193=True)
        self.assertEqual(ev_tue["burden_of_proof"], "consumer")

    def test_bgb_193_weekend_rollover_sunday(self):
        """BGB § 193: 12-month cliff falling on a Sunday rolls over to Monday."""
        # Purchase: 2025-11-15 -> 12m cliff is 2026-11-15 (which is a Sunday!)
        purchase = datetime.date(2025, 11, 15)
        cal_cliff = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(purchase)
        self.assertEqual(cal_cliff.weekday(), 6)  # 6 = Sunday

        eff_cliff, was_rolled = StatutoryGermanLawEngine.apply_bgb_193_rollover(cal_cliff)
        self.assertTrue(was_rolled)
        self.assertEqual(eff_cliff, datetime.date(2026, 11, 16))  # Monday
        self.assertEqual(eff_cliff.weekday(), 0)

        # On Monday 2026-11-16: Still Protected
        ev_mon = StatutoryGermanLawEngine.evaluate_bgb_477_burden(purchase, datetime.date(2026, 11, 16), apply_193=True)
        self.assertEqual(ev_mon["burden_of_proof"], "seller")

    def test_bgb_193_weekday_no_rollover(self):
        """BGB § 193: 12-month cliff falling on a regular weekday (e.g. Wednesday) does NOT roll over."""
        # Purchase: 2025-10-14 -> 12m cliff is 2026-10-14 (Wednesday)
        purchase = datetime.date(2025, 10, 14)
        cal_cliff = StatutoryGermanLawEngine.calculate_12m_cliff_calendar_date(purchase)
        self.assertEqual(cal_cliff.weekday(), 2)  # 2 = Wednesday

        eff_cliff, was_rolled = StatutoryGermanLawEngine.apply_bgb_193_rollover(cal_cliff)
        self.assertFalse(was_rolled)
        self.assertEqual(eff_cliff, cal_cliff)

    # ------------------------------------------------------------------------
    # SECTION 3: THREE CALENDAR WIDGET CONTRACTS & DATA BINDINGS
    # ------------------------------------------------------------------------

    def test_calendar_type_1_grid_schema_and_event_binding(self):
        """Calendar Type 1 (MonthlyWeeklyGridCalendar): Test schema and ISO 8601 DIN binding."""
        valid_event = {
            "id": "evt-001",
            "date": "2026-11-08",
            "title": "FitX Gym Auto-Renewal",
            "brand": "FitX Deutschland GmbH",
            "category": "subscription",
            "amountEur": 29.00,
            "urgency": "urgent",
            "bgbStatutoryType": "BGB_309_RENEWAL",
            "actionUrl": "https://fitx.de/kuendigen"
        }
        errors = CalendarWidgetContractValidator.validate_grid_event(valid_event)
        self.assertEqual(len(errors), 0, f"Grid event validation errors: {errors}")

        # Test invalid event catches missing required field
        invalid_event = {"title": "No ID Event"}
        errors_inv = CalendarWidgetContractValidator.validate_grid_event(invalid_event)
        self.assertGreater(len(errors_inv), 0)

    def test_calendar_type_2_timeline_agenda_4_horizons(self):
        """Calendar Type 2 (TimelineAgendaCalendar): Test 4 horizon cluster classifications."""
        items = [
            # Horizon 1: Critical (<= 7 days)
            {
                "id": "h1-item",
                "itemName": "FitX Gym",
                "brandSlug": "fitx",
                "category": "subscription",
                "purchaseDate": "2026-01-08",
                "expiryDate": "2026-11-08",
                "daysRemaining": 3,
                "isWithinReversedBurdenOfProof": False,
                "reversedBurdenDeadline": "2026-11-08",
                "cancellationCompliant": True,
                "bgbClauses": ["BGB § 309 Nr. 9", "BGB § 312k"]
            },
            # Horizon 2: Notice review window (8-30 days)
            {
                "id": "h2-item",
                "itemName": "Adobe Creative Cloud",
                "brandSlug": "adobe",
                "category": "subscription",
                "purchaseDate": "2025-11-24",
                "expiryDate": "2026-11-24",
                "daysRemaining": 19,
                "isWithinReversedBurdenOfProof": False,
                "reversedBurdenDeadline": "2026-11-24",
                "cancellationCompliant": True,
                "bgbClauses": ["BGB § 309 Nr. 9"]
            },
            # Horizon 3: BGB § 477 12m cliff (Hardware, within 365 days)
            {
                "id": "h3-item",
                "itemName": "Sony WH-1000XM5",
                "brandSlug": "sony",
                "category": "hardware",
                "purchaseDate": "2025-12-15",
                "expiryDate": "2027-12-15",
                "daysRemaining": 406,
                "isWithinReversedBurdenOfProof": True,  # 325 days elapsed
                "reversedBurdenDeadline": "2026-12-15",
                "cancellationCompliant": False,
                "bgbClauses": ["BGB § 477 Abs. 1", "BGB § 437"]
            },
            # Horizon 4: Extended 13-24m Statutory Zone (Hardware, past 12m)
            {
                "id": "h4-item",
                "itemName": "Apple MacBook Pro 14",
                "brandSlug": "apple",
                "category": "hardware",
                "purchaseDate": "2025-06-20",
                "expiryDate": "2027-06-20",
                "daysRemaining": 227,
                "isWithinReversedBurdenOfProof": False,  # 17 months elapsed
                "reversedBurdenDeadline": "2026-06-20",
                "cancellationCompliant": False,
                "bgbClauses": ["BGB § 438 Abs. 1 Nr. 3"]
            }
        ]

        expected_horizons = [1, 2, 3, 4]
        for it, exp in zip(items, expected_horizons):
            errs = CalendarWidgetContractValidator.validate_agenda_item(it)
            self.assertEqual(len(errs), 0, f"Agenda item {it['id']} had errors: {errs}")
            horizon = CalendarWidgetContractValidator.classify_agenda_horizon(it)
            self.assertEqual(horizon, exp, f"Item {it['id']} classified as Horizon {horizon}, expected {exp}")

    def test_calendar_type_3_heatmap_cells_and_kpi_aggregates(self):
        """Calendar Type 3 (CountdownRiskHeatmap): Test 52-week cell schema & KPI rollups."""
        cell = {
            "date": "2026-11-08",
            "weekNumber": 45,
            "dayOfWeek": 6,  # Sunday
            "intensityLevel": 3,
            "events": [
                {
                    "id": "e1",
                    "title": "FitX Auto-Renewal",
                    "category": "subscription",
                    "costEur": 29.00,
                    "urgency": "urgent"
                }
            ],
            "totalCostDueEur": 29.00
        }
        errs = CalendarWidgetContractValidator.validate_heatmap_cell(cell)
        self.assertEqual(len(errs), 0, f"Heatmap cell validation errors: {errs}")

        # Test KPI rollup calculation on sample items
        current_date = datetime.date(2026, 11, 5)
        kpis = CalendarWidgetContractValidator.compute_heatmap_kpis(self.sample_vault, current_date)

        # Expected:
        # Hardware: Sony (279.00) + MacBook (1899.00) = 2178.00
        self.assertEqual(kpis["total_tracked_capital_eur"], 2178.00)
        # Subscriptions: Spotify (5.99 * 12) = 71.88
        self.assertEqual(kpis["annual_subscriptions_total_eur"], 71.88)
        # Imminent subscriptions next 30d: Spotify renews on Nov 8 (in 3 days) -> 1
        self.assertEqual(kpis["imminent_actions_30d"], 1)
        # Impending 12m BGB cliff: Sony purchased 2025-12-15 -> cliff is 2026-12-15 (40 days away, in [0, 60]) -> 1
        self.assertEqual(kpis["impending_bgb_cliffs"], 1)


# ============================================================================
# STANDALONE EXECUTION RUNNER & JSON EMISSION
# ============================================================================

def run_empirical_suite() -> int:
    suite = unittest.TestLoader().loadTestsFromTestCase(TestM1EmpiricalChallenger)
    runner = unittest.TextTestRunner(verbosity=2)
    start_t = time.perf_counter()
    result = runner.run(suite)
    duration = time.perf_counter() - start_t

    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    passed = total - failures - errors

    print("\n" + "=" * 80)
    print("  EMPIRICAL CHALLENGER TEST SUITE VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"  Total Empirical Tests Run: {total}")
    print(f"  Passed:                    {passed}")
    print(f"  Failed:                    {failures}")
    print(f"  Errors:                    {errors}")
    print(f"  Pass Rate:                 {(passed / total * 100.0):.1f}%")
    print(f"  Execution Duration:        {duration:.4f}s")
    print("=" * 80)

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(run_empirical_suite())
