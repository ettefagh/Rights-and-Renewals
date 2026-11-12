"""
CM-LAB E2E Testing Framework & Shared Harness
Author: teamwork_test_writer_e2e_1
License: MIT / Academic Use (SRH University of Applied Sciences, CM-LAB WiSe 2026)

This module provides the core opaque-box test harness, mathematical validators,
8-state Omnibar FSM simulation, GoBD SHA-256 hashing, BGB statutory timeline
calculators, and MCP JSON-RPC 2.0 contract verification utilities.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import math
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


# ============================================================================
# PATH DISCOVERY & SEED REPOSITORY ACCESS
# ============================================================================

def find_repo_root() -> Path:
    """Locate the git repository root by traversing upward."""
    curr = Path(__file__).resolve().parent
    for _ in range(6):
        if (curr / ".git").is_dir() or (curr / "ORIGINAL_REQUEST.md").is_file() or (curr / "GOAL.md").is_file():
            return curr
        curr = curr.parent
    # Fallback to current working directory
    return Path(os.getcwd()).resolve()

REPO_ROOT = find_repo_root()
SEED_DATA_PATH = REPO_ROOT / "development-documents" / "product-research-lead" / "policy_wiki_seed_v1.json"


def load_seed_brands() -> List[Dict[str, Any]]:
    """Load canonical 20-brand policy wiki seed dataset."""
    if not SEED_DATA_PATH.is_file():
        raise FileNotFoundError(f"Policy wiki seed file not found at: {SEED_DATA_PATH}")
    with open(SEED_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================================
# W3C DTCG DESIGN TOKEN REPOSITORY & CONTRAST CALCULATOR
# ============================================================================

# Authoritative W3C DTCG Token Definitions matching PROJECT.md and UX/UI Specs
DESIGN_TOKENS: Dict[str, Any] = {
    "color": {
        "primitive": {
            "pine-900": "#1B322E",
            "pine-800": "#23413C",
            "pine-700": "#2F524C",  # Primary Brand Pine
            "coral-600": "#C25B3D",
            "coral-500": "#D96B4B",  # Accent Coral
            "blue-600": "#2563EB",   # Focus Blue
            "blue-500": "#3B82F6",
            "red-600": "#DC2626",    # Urgent Red
            "red-500": "#EF4444",
            "amber-600": "#D97706",  # Warning Amber
            "amber-500": "#F59E0B",
            "green-600": "#059669",  # Protected Green
            "green-500": "#10B981",
            "slate-900": "#0F172A",  # Dark Canvas
            "slate-800": "#1E293B",  # Dark Surface Card
            "slate-600": "#475569",  # Secondary Text
            "slate-400": "#94A3B8",  # Muted Text Dark
            "slate-300": "#CBD5E1",
            "slate-100": "#F1F5F9",  # Subtle Surface
            "slate-50": "#F8FAFC",   # Light Canvas
            "white": "#FFFFFF",
            "gray-500": "#6B7280"    # Expired / Neutral
        },
        "semantic": {
            "light": {
                "surface-canvas": "#F4F7F6",
                "surface-card": "#FFFFFF",
                "surface-subtle": "#F1F5F9",
                "text-primary": "#0F172A",
                "text-secondary": "#475569",
                "text-muted": "#57687E",
                "brand-primary": "#2F524C",
                "brand-accent": "#D96B4B",
                "border-default": "#64748B",
                "border-focus": "#2563EB",
                "status-urgent": "#DC2626",
                "status-warning": "#D97706",
                "status-protected": "#059669",
                "status-neutral": "#6B7280"
            },
            "dark": {
                "surface-canvas": "#0F172A",
                "surface-card": "#1E293B",
                "surface-subtle": "#1E293B",
                "text-primary": "#F8FAFC",
                "text-secondary": "#CBD5E1",
                "text-muted": "#94A3B8",
                "brand-primary": "#2F524C",
                "brand-accent": "#D96B4B",
                "border-default": "#94A3B8",
                "border-focus": "#3B82F6",
                "status-urgent": "#EF4444",
                "status-warning": "#F59E0B",
                "status-protected": "#10B981",
                "status-neutral": "#9CA3AF"
            }
        }
    },
    "spacing": {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px"
    },
    "radius": {
        "sm": "4px",
        "md": "6px",
        "lg": "8px",
        "xl": "12px",
        "full": "9999px"
    },
    "z_index": {
        "base": 0,
        "sticky": 100,
        "navbar": 200,
        "dropdown": 300,
        "drawer": 400,
        "backdrop": 500,
        "modal": 600,
        "popover": 700,
        "toast": 800,
        "tooltip": 900,
        "max": 1000
    },
    "breakpoints": {
        "xs": 0,
        "sm": 600,
        "md": 900,
        "lg": 1200,
        "xl": 1600
    }
}


def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    """Parse hex color string (#RGB, #RRGGBB) to (R, G, B) tuple."""
    hex_clean = hex_code.strip().lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join(c * 2 for c in hex_clean)
    if len(hex_clean) != 6:
        raise ValueError(f"Invalid hex color format: {hex_code}")
    return (
        int(hex_clean[0:2], 16),
        int(hex_clean[2:4], 16),
        int(hex_clean[4:6], 16),
    )


def relative_luminance(r: int, g: int, b: int) -> float:
    """
    Calculate W3C WCAG 2.1 relative luminance L.
    Formula: L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
    """
    def srgb_channel(c: int) -> float:
        val = c / 255.0
        return val / 12.92 if val <= 0.04045 else math.pow((val + 0.055) / 1.055, 2.4)

    r_lin = srgb_channel(r)
    g_lin = srgb_channel(g)
    b_lin = srgb_channel(b)
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin


def contrast_ratio(hex1: str, hex2: str) -> float:
    """
    Compute W3C WCAG 2.1 contrast ratio between two hex colors.
    Returns (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
    """
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    l1 = relative_luminance(*rgb1)
    l2 = relative_luminance(*rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


# ============================================================================
# GOBD SHA-256 PRE-ENCRYPTION CRYPTOGRAPHIC ENGINE
# ============================================================================

def compute_gobd_sha256(receipt_bytes: bytes, metadata: Dict[str, Any]) -> str:
    """
    Generate GoBD Rn. 108-110 compliant immutable SHA-256 pre-encryption digest.
    Combines canonical JSON metadata header with binary image payload.
    """
    canonical_meta = json.dumps(metadata, sort_keys=True, separators=(",", ":")).encode("utf-8")
    hasher = hashlib.sha256()
    hasher.update(canonical_meta)
    hasher.update(b"::GOBD_RECEIPT_BLOB::")
    hasher.update(receipt_bytes)
    return hasher.hexdigest()


# ============================================================================
# GERMAN CIVIL CODE (BGB) STATUTORY TIMELINE CALCULATOR
# ============================================================================

class BGBTimelineCalculator:
    """
    Deterministic German Consumer Law (BGB) calculation engine:
    - BGB § 438 Abs. 1 Nr. 3: 24-month statutory warranty
    - BGB § 477 Abs. 1: 12-month reversed burden of proof cliff (Beweislastumkehr)
    - BGB § 475e Abs. 1: 4-month suspension of expiry (Ablaufhemmung)
    - BGB § 309 Nr. 9: 1-month rolling subscription cancellation notice
    - BGB § 312k: Statutory online cancellation button mandate
    """

    @staticmethod
    def add_months(start_date: datetime.date, months: int) -> datetime.date:
        """Add exact calendar months with proper month-end capping."""
        new_year = start_date.year + (start_date.month + months - 1) // 12
        new_month = (start_date.month + months - 1) % 12 + 1
        # Handle month length differences (e.g. Jan 31 -> Feb 28/29)
        max_days = [31, 29 if BGBTimelineCalculator.is_leap_year(new_year) else 28,
                    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][new_month - 1]
        new_day = min(start_date.day, max_days)
        return datetime.date(new_year, new_month, new_day)

    @staticmethod
    def is_leap_year(year: int) -> bool:
        """Determine if a calendar year is a leap year."""
        return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)

    @classmethod
    def calculate_warranty_milestones(cls, purchase_date: datetime.date) -> Dict[str, Any]:
        """Calculate complete statutory timeline milestones for a consumer purchase."""
        cliff_12m = cls.add_months(purchase_date, 12)
        expiry_24m = cls.add_months(purchase_date, 24)
        ablaufhemmung_28m = cls.add_months(expiry_24m, 4)
        cliff_alert_30d = cliff_12m - datetime.timedelta(days=30)
        expiry_alert_30d = expiry_24m - datetime.timedelta(days=30)
        expiry_alert_7d = expiry_24m - datetime.timedelta(days=7)
        expiry_alert_1d = expiry_24m - datetime.timedelta(days=1)

        return {
            "purchase_date": purchase_date.isoformat(),
            "cliff_12m_beweislastumkehr": cliff_12m.isoformat(),
            "expiry_24m_statutory": expiry_24m.isoformat(),
            "ablaufhemmung_28m": ablaufhemmung_28m.isoformat(),
            "cliff_alert_t30d": cliff_alert_30d.isoformat(),
            "expiry_alert_t30d": expiry_alert_30d.isoformat(),
            "expiry_alert_t7d": expiry_alert_7d.isoformat(),
            "expiry_alert_t1d": expiry_alert_1d.isoformat()
        }

    @classmethod
    def evaluate_status(cls, purchase_date: datetime.date, current_date: datetime.date) -> Dict[str, Any]:
        """Determine consumer status and proof burden based on current date."""
        milestones = cls.calculate_warranty_milestones(purchase_date)
        cliff = datetime.date.fromisoformat(milestones["cliff_12m_beweislastumkehr"])
        expiry = datetime.date.fromisoformat(milestones["expiry_24m_statutory"])

        if current_date <= cliff:
            status = "protected"
            burden_of_proof = "seller"
            urgency_level = "low" if (cliff - current_date).days > 30 else "medium_cliff_warning"
        elif current_date <= expiry:
            status = "cliff_warning"
            burden_of_proof = "consumer"
            days_left = (expiry - current_date).days
            if days_left <= 7:
                urgency_level = "urgent_red"
            elif days_left <= 30:
                urgency_level = "warning_amber"
            else:
                urgency_level = "medium"
        else:
            status = "expired"
            burden_of_proof = "expired"
            urgency_level = "neutral_gray"

        return {
            "status": status,
            "burden_of_proof": burden_of_proof,
            "urgency_level": urgency_level,
            "days_to_cliff": (cliff - current_date).days,
            "days_to_expiry": (expiry - current_date).days
        }

    @classmethod
    def generate_statutory_notice(
        cls,
        brand_name: str,
        item_name: str,
        purchase_date: datetime.date,
        defect_date: datetime.date,
        defect_description: str,
        claim_type: str = "rectification"  # 'rectification' (Nachbesserung) or 'replacement' (Nachlieferung)
    ) -> Dict[str, Any]:
        """
        Generate formal statutory BGB § 437/439 defect notice (Mängelrüge)
        in compliance with German BGB legal tech standards.
        """
        eval_result = cls.evaluate_status(purchase_date, defect_date)
        is_within_cliff = eval_result["burden_of_proof"] == "seller"

        if is_within_cliff:
            legal_clause = (
                f"Gemäß § 477 Abs. 1 BGB wird vermutet, dass der Mangel bereits bei Gefahrübergang "
                f"vorhanden war, da der Mangel innerhalb von 12 Monaten nach Übergabe aufgetreten ist."
            )
        else:
            legal_clause = (
                f"Der Gewährleistungsanspruch besteht nach § 438 Abs. 1 Nr. 3 BGB für 24 Monate. "
                f"Der Käufer legt den Nachweis vor, dass der Mangel auf einer vertragswidrigen Beschaffenheit beruht."
            )

        demand_remedy = (
            "binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Neulieferung (§ 439 Abs. 1 Alt. 2 BGB)"
            if claim_type == "replacement" else
            "binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Nachbesserung (§ 439 Abs. 1 Alt. 1 BGB)"
        )

        german_dossier = (
            f"MÄNGELRÜGE GEMÄSS § 437 BGB\n\n"
            f"Gegenstand: {item_name} ({brand_name})\n"
            f"Kaufdatum: {purchase_date.strftime('%d.%m.%Y')}\n"
            f"Datum der Mangelanzeige: {defect_date.strftime('%d.%m.%Y')}\n\n"
            f"Mangelbeschreibung:\n{defect_description}\n\n"
            f"Rechtliche Grundlage:\n{legal_clause}\n\n"
            f"Aufforderung zur Nacherfüllung:\n"
            f"Hiermit fordere ich Sie auf, {demand_remedy} zu veranlassen.\n\n"
            f"Vorsorglich verweise ich auf die Ablaufhemmung nach § 475e Abs. 1 BGB."
        )

        return {
            "item_name": item_name,
            "brand_name": brand_name,
            "statutory_basis": ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 439", "BGB § 477"],
            "burden_of_proof": eval_result["burden_of_proof"],
            "dossier_text_de": german_dossier,
            "valid": True
        }


# ============================================================================
# UNIFIED OMNIBAR 8-STATE FINITE STATE MACHINE (FSM) ENGINE
# ============================================================================

class OmnibarState:
    IDLE = "IDLE"
    FOCUSED_EMPTY = "FOCUSED_EMPTY"
    QUERYING = "QUERYING"
    WIKI_MATCHES = "WIKI_MATCHES"
    VAULT_MATCHES = "VAULT_MATCHES"
    HYBRID_MATCHES = "HYBRID_MATCHES"
    NO_MATCH_SUGGESTION = "NO_MATCH_SUGGESTION"
    COMMAND_MODE = "COMMAND_MODE"

    ALL_STATES = {
        IDLE, FOCUSED_EMPTY, QUERYING, WIKI_MATCHES,
        VAULT_MATCHES, HYBRID_MATCHES, NO_MATCH_SUGGESTION, COMMAND_MODE
    }


class OmnibarFSM:
    """
    Formal 8-State Finite State Machine governing the Unified Search/Activity/Request Bar.
    Enforces valid transitions, search arbitration across Wiki and Vault,
    command parsing, and zero-dead-end create suggestions.
    """

    VALID_VERBS = {">claim", ">cancel", ">tax", ">import", ">audit"}

    def __init__(self, wiki_brands: Optional[List[Dict[str, Any]]] = None, vault_items: Optional[List[Dict[str, Any]]] = None):
        self.wiki_brands = wiki_brands or load_seed_brands()
        self.vault_items = vault_items or []
        self.state = OmnibarState.IDLE
        self.query = ""
        self.history: List[str] = [self.state]
        self.recent_activities: List[str] = [
            "Searched Spotify subscription policy",
            "Viewed Apple MacBook Pro warranty",
            "Exported 2026 Werbungskosten CSV"
        ]

    def reset(self) -> None:
        """Reset FSM to initial resting IDLE state."""
        self.state = OmnibarState.IDLE
        self.query = ""
        self.history = [self.state]

    def transition_to(self, target_state: str) -> None:
        """Execute state transition with guard checks."""
        if target_state not in OmnibarState.ALL_STATES:
            raise ValueError(f"Illegal Omnibar state: {target_state}")
        self.state = target_state
        self.history.append(target_state)

    def on_focus(self) -> str:
        """User clicks or activates shortcut (Ctrl/Cmd+K) into omnibar."""
        if self.state == OmnibarState.IDLE:
            if not self.query.strip():
                self.transition_to(OmnibarState.FOCUSED_EMPTY)
            else:
                self.process_query(self.query)
        return self.state

    def on_blur(self) -> str:
        """User clicks outside omnibar."""
        self.transition_to(OmnibarState.IDLE)
        return self.state

    def on_escape(self) -> str:
        """User presses ESC key."""
        self.query = ""
        self.transition_to(OmnibarState.IDLE)
        return self.state

    def process_query(self, raw_input: str) -> Dict[str, Any]:
        """
        Process user keystroke string and compute next FSM state and match results.
        """
        self.query = raw_input
        trimmed = raw_input.strip()

        if not trimmed:
            self.transition_to(OmnibarState.FOCUSED_EMPTY)
            return {
                "state": self.state,
                "recent_activities": self.recent_activities,
                "quick_actions": [">claim", ">cancel", ">tax", ">import"],
                "results": []
            }

        if trimmed.startswith(">"):
            self.transition_to(OmnibarState.COMMAND_MODE)
            return self._handle_command_mode(trimmed)

        # Transition to QUERYING
        self.transition_to(OmnibarState.QUERYING)

        # Perform searches across Wiki and Vault
        wiki_matches = self._search_wiki(trimmed)
        vault_matches = self._search_vault(trimmed)

        if wiki_matches and vault_matches:
            self.transition_to(OmnibarState.HYBRID_MATCHES)
        elif wiki_matches:
            self.transition_to(OmnibarState.WIKI_MATCHES)
        elif vault_matches:
            self.transition_to(OmnibarState.VAULT_MATCHES)
        else:
            self.transition_to(OmnibarState.NO_MATCH_SUGGESTION)

        return {
            "state": self.state,
            "query": trimmed,
            "wiki_matches": wiki_matches,
            "vault_matches": vault_matches,
            "suggestions": self._generate_suggestions(trimmed) if self.state == OmnibarState.NO_MATCH_SUGGESTION else []
        }

    def _search_wiki(self, term: str) -> List[Dict[str, Any]]:
        """Search policy wiki by brand name, slug, aliases, and legal statutes."""
        term_lower = term.lower()
        matches = []
        for brand in self.wiki_brands:
            b_name = (brand.get("brand_name") or brand.get("brandName") or "").lower()
            b_slug = (brand.get("service_slug") or brand.get("serviceSlug") or "").lower()
            aliases = [a.lower() for a in brand.get("search_aliases", [])]
            statutes = [s.lower() for s in brand.get("statutory_basis", [])]

            if (term_lower in b_name or
                term_lower in b_slug or
                any(term_lower in a for a in aliases) or
                any(term_lower in s for s in statutes)):
                matches.append(brand)
        return matches

    def _search_vault(self, term: str) -> List[Dict[str, Any]]:
        """Search saved user vault items by name, merchant, or category."""
        term_lower = term.lower()
        matches = []
        for item in self.vault_items:
            name = (item.get("name") or "").lower()
            merchant = (item.get("merchant") or "").lower()
            cat = (item.get("category") or "").lower()
            if term_lower in name or term_lower in merchant or term_lower in cat:
                matches.append(item)
        return matches

    def _generate_suggestions(self, term: str) -> List[Dict[str, str]]:
        """Produce actionable create/import fallback suggestions (zero dead-ends)."""
        return [
            {
                "type": "create_warranty",
                "label": f"Create new warranty for '{term}'",
                "action": "open_create_warranty_modal",
                "prefill": {"name": term, "category": "hardware", "statutory_months": 24}
            },
            {
                "type": "add_subscription",
                "label": f"Add recurring subscription for '{term}'",
                "action": "open_add_subscription_modal",
                "prefill": {"name": term, "category": "subscription", "notice_days": 30}
            },
            {
                "type": "import_receipt",
                "label": f"Import receipt for '{term}' (Drag & Drop or File)",
                "action": "trigger_receipt_upload"
            }
        ]

    def _handle_command_mode(self, command_str: str) -> Dict[str, Any]:
        """Parse executable verb command workflows (>claim, >cancel, >tax, >import, >audit)."""
        tokens = command_str.split(maxsplit=1)
        verb = tokens[0].lower()
        args = tokens[1].strip() if len(tokens) > 1 else ""

        is_valid_verb = verb in self.VALID_VERBS
        return {
            "state": OmnibarState.COMMAND_MODE,
            "verb": verb,
            "args": args,
            "is_valid_verb": is_valid_verb,
            "workflow": self._resolve_verb_workflow(verb, args) if is_valid_verb else None
        }

    def _resolve_verb_workflow(self, verb: str, args: str) -> Dict[str, Any]:
        """Dispatch verb to mapped handler."""
        if verb == ">claim":
            return {"action": "generate_claim_dossier", "target": args, "statutory_code": "BGB § 437"}
        elif verb == ">cancel":
            return {"action": "generate_cancellation_notice", "target": args, "statutory_code": "BGB § 312k"}
        elif verb == ">tax":
            return {"action": "compile_werbungskosten_report", "target": args, "statutory_code": "§ 9 EStG / BMF 2022"}
        elif verb == ">import":
            return {"action": "trigger_receipt_hash_pipeline", "target": args, "standard": "GoBD Rn. 108-110"}
        elif verb == ">audit":
            return {"action": "run_integrity_audit", "target": args}
        return {"action": "unknown"}


# ============================================================================
# MCP JSON-RPC 2.0 PROTOCOL ENGINE & SIMULATOR
# ============================================================================

class MCPServerEngine:
    """
    Public MCP discovery and policy lookup simulation for student journey tests.
    Use tests/mcp-reliability.mjs to exercise the actual HTTP handlers.
    """

    def __init__(self, brands: Optional[List[Dict[str, Any]]] = None):
        self.brands = brands or load_seed_brands()
        self.brand_map = {
            (b.get("service_slug") or b.get("serviceSlug")): b
            for b in self.brands
        }

    def handle_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming JSON-RPC 2.0 payload and return spec-compliant response."""
        # 1. Validate JSON-RPC 2.0 structure
        if payload.get("jsonrpc") != "2.0":
            return {
                "jsonrpc": "2.0",
                "id": payload.get("id"),
                "error": {"code": -32600, "message": "Invalid Request: jsonrpc must be '2.0'"}
            }

        req_id = payload.get("id")
        method = payload.get("method")
        params = payload.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2025-11-25",
                    "serverInfo": {"name": "rights-and-renewals", "version": "2.0.0"},
                    "capabilities": {"tools": {}}
                }
            }

        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": json.loads(
                        (REPO_ROOT / "apps/showcase/public/.well-known/mcp/server-card.json").read_text(encoding="utf8")
                    )["tools"]
                }
            }

        elif method == "tools/call":
            tool_name = params.get("name")
            args = params.get("arguments", {})

            if tool_name == "policy_lookup":
                slug = args.get("service_slug", "").lower().strip()
                if not slug:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32602, "message": "Invalid params: service_slug is required"}
                    }
                brand = self.brand_map.get(slug)
                if not brand:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {"content": [{"type": "text", "text": f"Brand slug '{slug}' not found in canonical dataset."}], "isError": True}
                    }
                policy = dict(brand)
                if policy["category"] == "subscription":
                    policy.update(
                        statutory_warranty_months=None,
                        commercial_guarantee_months=None,
                        reversed_burden_months=None,
                        cancellation_button_compliant=None,
                    )
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [{"type": "text", "text": json.dumps(policy, ensure_ascii=False)}],
                        "structuredContent": policy,
                    }
                }

            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": f"Method/Tool '{tool_name}' not found"}
                }

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method '{method}' not found"}
            }


# ============================================================================
# HTML DOM & ARIA OPAQUE-BOX CONTRACT PARSER
# ============================================================================

class DOMContractInspector(HTMLParser):
    """
    Opaque-box HTML structural parser that audits DOM elements, ARIA attributes,
    roles, and classes without coupling to internal frameworks.
    """

    def __init__(self):
        super().__init__()
        self.tags: List[str] = []
        self.elements_with_id: Dict[str, Dict[str, Any]] = {}
        self.roles: Set[str] = set()
        self.comboboxes: List[Dict[str, str]] = []
        self.buttons: List[Dict[str, str]] = []
        self.css_custom_props: Set[str] = set()
        self.has_viewport_meta: bool = False
        self.viewport_content: str = ""

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]):
        self.tags.append(tag)
        attr_dict = {k: v or "" for k, v in attrs}

        tag_id = attr_dict.get("id")
        if tag_id:
            self.elements_with_id[tag_id] = {"tag": tag, "attrs": attr_dict}

        role = attr_dict.get("role")
        if role:
            self.roles.add(role)
            if role == "combobox":
                self.comboboxes.append(attr_dict)

        if tag == "button":
            self.buttons.append(attr_dict)

        if tag == "meta" and attr_dict.get("name") == "viewport":
            self.has_viewport_meta = True
            self.viewport_content = attr_dict.get("content", "")

    def handle_data(self, data: str):
        # Scan for CSS variables in inline styles or style blocks
        var_matches = re.findall(r"--[a-zA-Z0-9_-]+", data)
        for var in var_matches:
            self.css_custom_props.add(var)
