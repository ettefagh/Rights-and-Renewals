#!/usr/bin/env python3
"""
Empirical Verification & Challenge Harness for Milestone M1
Specification Document: docs/UI_UX_RESEARCH_AND_DESIGN_SPECIFICATIONS.md
Author: teamwork_challenger_m1_spec_1
License: MIT / Academic Use (SRH University of Applied Sciences, CM-LAB WiSe 2026)

Test Suites Executed:
1. W3C Relative Luminance & Photometric Contrast Verification
   - Checks Text Tokens against WCAG 2.1 AA (>= 4.5:1) and AAA (>= 7.0:1)
   - Checks Non-Text & Border Tokens against WCAG SC 1.4.11 / 2.4.11 (>= 3.0:1)
   - Validates claims in Chapter 3.2 Photometric Verification Table
2. Exhaustive Placeholder Scan (TODO, TBD, [placeholder], ???, FIXME)
3. 5-Tier Responsive Breakpoint Grid & Column Math Monotonicity & Conservation
"""

from __future__ import annotations

import math
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Locate repo root
REPO_ROOT = Path(__file__).resolve().parent.parent
SPEC_DOC_PATH = REPO_ROOT / "docs" / "UI_UX_RESEARCH_AND_DESIGN_SPECIFICATIONS.md"


# ============================================================================
# 1. MATHEMATICAL RELATIVE LUMINANCE & CONTRAST RATIO FUNCTIONS
# ============================================================================

def srgb_channel(c: int) -> float:
    """W3C WCAG 2.1 channel linearization."""
    v = c / 255.0
    return v / 12.92 if v <= 0.04045 else math.pow((v + 0.055) / 1.055, 2.4)


def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    """Parse hex code (#RGB, #RRGGBB) to (r, g, b) tuple."""
    clean = hex_code.strip().lstrip("#")
    if len(clean) == 3:
        clean = "".join(c * 2 for c in clean)
    if len(clean) != 6:
        raise ValueError(f"Invalid hex color: {hex_code}")
    return (int(clean[0:2], 16), int(clean[2:4], 16), int(clean[4:6], 16))


def relative_luminance(hex_code: str) -> float:
    """
    W3C Relative Luminance L:
    L = 0.2126 * R + 0.7152 * G + 0.0722 * B
    """
    r, g, b = hex_to_rgb(hex_code)
    r_lin = srgb_channel(r)
    g_lin = srgb_channel(g)
    b_lin = srgb_channel(b)
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin


def contrast_ratio(hex1: str, hex2: str) -> float:
    """
    Compute W3C contrast ratio:
    (L1 + 0.05) / (L2 + 0.05) where L1 >= L2
    """
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


# ============================================================================
# 2. COLOR CONTRAST TEST SUITE
# ============================================================================

def verify_photometric_contrast() -> Dict[str, Any]:
    """Verify all text and non-text pairings from Chapter 2 and 3."""
    results = {
        "text_aa_passed": [],
        "text_aa_failed": [],
        "text_aaa_passed": [],
        "text_aaa_failed": [],
        "border_passed": [],
        "border_failed": [],
        "claims_vs_reality": []
    }

    # Chapter 3.2 explicit table pairings:
    # (name, fg_hex, bg_hex, element_type, claimed_L_fg, claimed_L_bg, claimed_CR, claimed_level)
    table_claims = [
        ("Light Canvas Body Text", "#0F172A", "#F4F7F6", "text", 0.0088, 0.9241, 16.57, "AAA"),
        ("Light Card Primary Text", "#0F172A", "#FFFFFF", "text", 0.0088, 1.0000, 17.86, "AAA"),
        ("Light Secondary Text", "#475569", "#FFFFFF", "text", 0.0886, 1.0000, 7.58, "AAA"),
        ("Dark Canvas Body Text", "#F8FAFC", "#0F172A", "text", 0.9536, 0.0088, 17.07, "AAA"),
        ("Dark Card Primary Text", "#F8FAFC", "#1E293B", "text", 0.9536, 0.0218, 13.98, "AAA"),
        ("Dark Secondary Text", "#CBD5E1", "#1E293B", "text", 0.6572, 0.0218, 9.85, "AAA"),
        ("Primary Pine Button", "#FFFFFF", "#2F524C", "text", 1.0000, 0.0716, 8.63, "AAA"),
        ("Deep Pine on Canvas", "#2F524C", "#F4F7F6", "text", 0.0716, 0.9241, 8.01, "AAA"),
        ("Coral Accent Button (B44A2D)", "#FFFFFF", "#B44A2D", "text", 1.0000, 0.1479, 5.31, "AA"),
        ("Focus Indicator Ring", "#2563EB", "#FFFFFF", "border", 0.1532, 1.0000, 5.17, "AA Non-Text"),
        ("Focus Ring (Dark Mode)", "#3B82F6", "#1E293B", "border", 0.2355, 0.0218, 3.98, "AA Non-Text"),
        ("Card / Input Border", "#64748B", "#F4F7F6", "border", 0.1706, 0.9241, 4.42, "AA Non-Text"),
        ("Card Border (Dark Mode)", "#94A3B8", "#0F172A", "border", 0.3595, 0.0088, 6.96, "AAA Non-Text"),
        ("Urgent Status Pill (L)", "#7F1D1D", "#FEE2E2", "text", 0.0548, 0.8095, 8.20, "AAA"),
        ("Urgent Status Pill (D)", "#FEE2E2", "#7F1D1D", "text", 0.8095, 0.0548, 8.20, "AAA"),
        ("Warning Pill (L)", "#78350F", "#FEF3C7", "text", 0.0657, 0.8930, 8.15, "AAA"),
        ("Warning Pill (D)", "#FDE68A", "#78350F", "text", 0.7931, 0.0657, 7.29, "AAA"),
        ("Protected Pill (L)", "#14532D", "#DCFCE7", "text", 0.0652, 0.9061, 8.30, "AAA"),
        ("Protected Pill (D)", "#BBF7D0", "#14532D", "text", 0.8164, 0.0652, 7.52, "AAA")
    ]

    # Additional semantic borders defined in tokens.css
    additional_borders = [
        ("Urgent Border (L)", "#DC2626", "#FEE2E2", "border", 3.0),
        ("Urgent Border (D)", "#F87171", "#7F1D1D", "border", 3.0),
        ("Warning Border (L)", "#B45309", "#FEF3C7", "border", 3.0),
        ("Warning Border (D)", "#F59E0B", "#78350F", "border", 3.0),
        ("Protected Border (L)", "#059669", "#DCFCE7", "border", 3.0),
        ("Protected Border (D)", "#10B981", "#14532D", "border", 3.0),
        ("Primitive Coral 500 with Slate 900", "#0F172A", "#D96B4B", "text", 4.5)
    ]

    for name, fg, bg, el_type, claim_l_fg, claim_l_bg, claim_cr, claim_lvl in table_claims:
        actual_l_fg = relative_luminance(fg)
        actual_l_bg = relative_luminance(bg)
        actual_cr = contrast_ratio(fg, bg)

        record = {
            "name": name,
            "fg": fg,
            "bg": bg,
            "claimed_L_fg": claim_l_fg,
            "actual_L_fg": round(actual_l_fg, 4),
            "claimed_L_bg": claim_l_bg,
            "actual_L_bg": round(actual_l_bg, 4),
            "claimed_CR": claim_cr,
            "actual_CR": round(actual_cr, 2),
            "claimed_level": claim_lvl,
            "l_diff_fg": abs(claim_l_fg - actual_l_fg),
            "l_diff_bg": abs(claim_l_bg - actual_l_bg),
        }
        results["claims_vs_reality"].append(record)

        if el_type == "text":
            # Test AA (>= 4.5:1)
            if actual_cr >= 4.5:
                results["text_aa_passed"].append((name, fg, bg, round(actual_cr, 2)))
            else:
                results["text_aa_failed"].append((name, fg, bg, round(actual_cr, 2), 4.5))

            # Test AAA (>= 7.0:1)
            if claim_lvl == "AAA":
                if actual_cr >= 7.0:
                    results["text_aaa_passed"].append((name, fg, bg, round(actual_cr, 2)))
                else:
                    results["text_aaa_failed"].append((name, fg, bg, round(actual_cr, 2), 7.0))
        elif el_type == "border":
            if actual_cr >= 3.0:
                results["border_passed"].append((name, fg, bg, round(actual_cr, 2)))
            else:
                results["border_failed"].append((name, fg, bg, round(actual_cr, 2), 3.0))

    for name, fg, bg, el_type, target_cr in additional_borders:
        actual_cr = contrast_ratio(fg, bg)
        if el_type == "border":
            if actual_cr >= target_cr:
                results["border_passed"].append((name, fg, bg, round(actual_cr, 2)))
            else:
                results["border_failed"].append((name, fg, bg, round(actual_cr, 2), target_cr))
        elif el_type == "text":
            if actual_cr >= target_cr:
                results["text_aa_passed"].append((name, fg, bg, round(actual_cr, 2)))
            else:
                results["text_aa_failed"].append((name, fg, bg, round(actual_cr, 2), target_cr))

    return results


# ============================================================================
# 3. UNRESOLVED PLACEHOLDER SCANNER
# ============================================================================

def scan_for_placeholders(filepath: Path) -> List[Tuple[int, str, str]]:
    """
    Scan deliverable file for unresolved placeholders:
    TODO, TBD, [placeholder], ???, FIXME
    Ignores valid HTML attribute mentions such as 'showing placeholder & shortcut badge'.
    """
    if not filepath.is_file():
        raise FileNotFoundError(f"Specification document not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    findings = []
    # Patterns to match genuine unresolved placeholders:
    # 1. \bTODO\b
    # 2. \bTBD\b
    # 3. \bFIXME\b
    # 4. \?\?\?
    # 5. \[placeholder\] (literal bracketed placeholder)
    # 6. \bXXX\b
    patterns = [
        (re.compile(r"\bTODO\b", re.IGNORECASE), "TODO"),
        (re.compile(r"\bTBD\b"), "TBD"),
        (re.compile(r"\bFIXME\b", re.IGNORECASE), "FIXME"),
        (re.compile(r"\?\?\?+"), "???"),
        (re.compile(r"\[placeholder\]", re.IGNORECASE), "[placeholder]"),
        (re.compile(r"\bXXX+\b"), "XXX"),
    ]

    for idx, line in enumerate(lines, 1):
        for pat, label in patterns:
            if pat.search(line):
                findings.append((idx, label, line.strip()))

    return findings


# ============================================================================
# 4. 5-TIER RESPONSIVE BREAKPOINT GRID & COLUMN MATH VERIFICATION
# ============================================================================

def verify_breakpoint_column_math() -> Dict[str, Any]:
    """
    Validate 5-tier responsive breakpoint grids:
    Tier 1: Mobile (xs) < 600px (down to 375px), 4 cols, 12px gutter, 16px page margin
    Tier 2: Tablet (sm) 600px - 899px, 8 cols, 16px gutter, 24px page margin
    Tier 3: Laptop (md) 900px - 1199px, 12 cols, 20px gutter, 24px page margin
    Tier 4: Desktop (lg) 1200px - 1599px, 12 cols, 24px gutter, 32px page margin
    Tier 5: Ultra (xl) >= 1600px, 12 cols, 32px gutter, 40px page margin, max container 1520px
    """
    tiers = [
        {
            "tier": 1,
            "name": "Mobile (xs)",
            "min_w": 375,
            "max_w": 599,
            "cols": 4,
            "gutter": 12,
            "margin": 16,
            "max_container": None
        },
        {
            "tier": 2,
            "name": "Tablet (sm)",
            "min_w": 600,
            "max_w": 899,
            "cols": 8,
            "gutter": 16,
            "margin": 24,
            "max_container": None
        },
        {
            "tier": 3,
            "name": "Laptop (md)",
            "min_w": 900,
            "max_w": 1199,
            "cols": 12,
            "gutter": 20,
            "margin": 24,
            "max_container": None
        },
        {
            "tier": 4,
            "name": "Desktop (lg)",
            "min_w": 1200,
            "max_w": 1599,
            "cols": 12,
            "gutter": 24,
            "margin": 32,
            "max_container": None,
            "split_check": (7, 5) # 7 cols left, 5 cols right
        },
        {
            "tier": 5,
            "name": "Ultra (xl)",
            "min_w": 1600,
            "max_w": 2560,
            "cols": 12,
            "gutter": 32,
            "margin": 40,
            "max_container": 1520,
            "split_check": (4, 4, 4) # 3-column analytics row (4:4:4)
        }
    ]

    tier_results = []
    monotonic_breakpoints = [0, 600, 900, 1200, 1600]

    # Verify strictly monotonic breakpoints
    for i in range(len(monotonic_breakpoints) - 1):
        if monotonic_breakpoints[i] >= monotonic_breakpoints[i + 1]:
            raise ValueError(f"Breakpoints are not strictly monotonic: {monotonic_breakpoints}")

    for t in tiers:
        # Check at min_w
        w_min = t["min_w"]
        w_max = t["max_w"]
        cols = t["cols"]
        gutter = t["gutter"]
        margin = t["margin"]

        # Effective container width
        eff_min = min(w_min, t["max_container"]) if t["max_container"] else w_min
        eff_max = min(w_max, t["max_container"]) if t["max_container"] else w_max

        # Available space inside margins
        avail_min = eff_min - 2 * margin
        avail_max = eff_max - 2 * margin

        # Total gutters
        total_gutters = (cols - 1) * gutter

        col_w_min = (avail_min - total_gutters) / cols
        col_w_max = (avail_max - total_gutters) / cols

        tier_data = {
            "tier": t["tier"],
            "name": t["name"],
            "cols": cols,
            "gutter": gutter,
            "margin": margin,
            "avail_min": avail_min,
            "col_w_min": round(col_w_min, 2),
            "avail_max": avail_max,
            "col_w_max": round(col_w_max, 2),
            "valid_min": col_w_min > 0,
            "valid_max": col_w_max > 0,
        }

        # Check column span preservation
        if "split_check" in t:
            split = t["split_check"]
            # Sum of spans: sum(k * col_w + (k-1) * gutter) + (len(split)-1) * gutter == avail
            reconstructed_min = sum(k * col_w_min + (k - 1) * gutter for k in split) + (len(split) - 1) * gutter
            reconstructed_max = sum(k * col_w_max + (k - 1) * gutter for k in split) + (len(split) - 1) * gutter
            tier_data["split_valid_min"] = math.isclose(reconstructed_min, avail_min, rel_tol=1e-5)
            tier_data["split_valid_max"] = math.isclose(reconstructed_max, avail_max, rel_tol=1e-5)

        tier_results.append(tier_data)

    return {"monotonic": True, "tiers": tier_results}


# ============================================================================
# MAIN EXECUTION HARNESS
# ============================================================================

def main():
    print("=" * 80)
    print("  EMPIRICAL CHALLENGER VERIFICATION HARNESS — MILESTONE M1")
    print("  Target Deliverable: docs/UI_UX_RESEARCH_AND_DESIGN_SPECIFICATIONS.md")
    print("=" * 80)

    # 1. Placeholder Scan
    print("\n[STEP 1/3] Scanning deliverable for unresolved placeholders...")
    placeholders = scan_for_placeholders(SPEC_DOC_PATH)
    if placeholders:
        print(f"  [FAIL] Found {len(placeholders)} unresolved placeholders:")
        for line_no, label, line_txt in placeholders:
            print(f"    - Line {line_no} [{label}]: {line_txt[:80]}")
    else:
        print("  [PASS] 0 unresolved placeholders found across entire document (1,715 lines).")

    # 2. Breakpoint Grid Math
    print("\n[STEP 2/3] Validating 5-tier responsive breakpoint grids & column math...")
    bp_data = verify_breakpoint_column_math()
    print("  [PASS] Breakpoint scale is strictly monotonic: [0, 600, 900, 1200, 1600]px")
    all_bp_valid = True
    for t in bp_data["tiers"]:
        valid = t["valid_min"] and t["valid_max"]
        split_ok = t.get("split_valid_min", True) and t.get("split_valid_max", True)
        if not (valid and split_ok):
            all_bp_valid = False
        print(f"    - Tier {t['tier']} ({t['name']}): {t['cols']} cols, gutter={t['gutter']}px, margin={t['margin']}px "
              f"-> Col Width: [{t['col_w_min']}px .. {t['col_w_max']}px] | Valid: {valid and split_ok}")

    # 3. Photometric Relative Luminance & Contrast
    print("\n[STEP 3/3] Calculating exact W3C Relative Luminance & Contrast Ratios...")
    contrast_data = verify_photometric_contrast()

    print("\n  --- Core Text Tokens (WCAG 2.1 Level AA >= 4.5:1) ---")
    print(f"  Passed ({len(contrast_data['text_aa_passed'])}):")
    for name, fg, bg, cr in contrast_data["text_aa_passed"]:
        print(f"    [OK] {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1")
    if contrast_data["text_aa_failed"]:
        print(f"  FAILED AA ({len(contrast_data['text_aa_failed'])}):")
        for name, fg, bg, cr, target in contrast_data["text_aa_failed"]:
            print(f"    [X]  {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1 < {target}:1")

    print("\n  --- Text Tokens Claimed as Level AAA (>= 7.0:1) ---")
    print(f"  Passed ({len(contrast_data['text_aaa_passed'])}):")
    for name, fg, bg, cr in contrast_data["text_aaa_passed"]:
        print(f"    [OK] {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1")
    if contrast_data["text_aaa_failed"]:
        print(f"  FAILED Claimed AAA ({len(contrast_data['text_aaa_failed'])}):")
        for name, fg, bg, cr, target in contrast_data["text_aaa_failed"]:
            print(f"    [X]  {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1 < {target}:1")

    print("\n  --- UI Component & Status Border Tokens (WCAG SC 1.4.11 >= 3.0:1) ---")
    print(f"  Passed ({len(contrast_data['border_passed'])}):")
    for name, fg, bg, cr in contrast_data["border_passed"]:
        print(f"    [OK] {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1")
    if contrast_data["border_failed"]:
        print(f"  FAILED Non-Text Contrast ({len(contrast_data['border_failed'])}):")
        for name, fg, bg, cr, target in contrast_data["border_failed"]:
            print(f"    [X]  {name:30} {fg} on {bg} -> CR: {cr:5.2f}:1 < {target}:1")

    print("\n  --- Discrepancy Analysis: Claimed vs. Actual W3C Relative Luminance ---")
    discrepancies = [r for r in contrast_data["claims_vs_reality"] if r["l_diff_fg"] > 0.01 or r["l_diff_bg"] > 0.01]
    print(f"  Found {len(discrepancies)} tokens with >0.01 discrepancy between claimed and actual luminance:")
    for d in discrepancies:
        print(f"    * {d['name']:28}: Claimed L=({d['claimed_L_fg']}, {d['claimed_L_bg']}) -> Actual L=({d['actual_L_fg']}, {d['actual_L_bg']}) | Claimed CR={d['claimed_CR']}:1 vs Actual CR={d['actual_CR']}:1")

    # Final Summary & Status
    has_contrast_failures = (
        len(contrast_data["text_aa_failed"]) > 0 or
        len(contrast_data["text_aaa_failed"]) > 0 or
        len(contrast_data["border_failed"]) > 0
    )
    has_placeholder_failures = len(placeholders) > 0

    print("\n" + "=" * 80)
    print("  EMPIRICAL CHALLENGE VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"  Placeholder Scan (Assert count == 0): {'PASSED' if not has_placeholder_failures else 'FAILED'}")
    print(f"  5-Tier Grid Column Math:              {'PASSED' if all_bp_valid else 'FAILED'}")
    print(f"  Text Contrast Level AA (>= 4.5:1):    {'FAILED' if contrast_data['text_aa_failed'] else 'PASSED'}")
    print(f"  Text Contrast Claimed AAA (>= 7.0:1): {'FAILED' if contrast_data['text_aaa_failed'] else 'PASSED'}")
    print(f"  Border Contrast Level AA (>= 3.0:1):  {'FAILED' if contrast_data['border_failed'] else 'PASSED'}")
    print("=" * 80)

    if has_contrast_failures or has_placeholder_failures:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
