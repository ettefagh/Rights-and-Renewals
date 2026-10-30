"""
Master Script: Generate 4 High-Resolution Square (1600x1600px, 1:1) Slide Images
with Concise, Summarized, High-Impact Bullet Points for the SRH Workshop Board:
- Block 1: 1 / Sharpen the idea · 20 min
- Block 2: 2 / Backlog & Acceptance Criteria · 25 min
- Block 3: 3 / Route + risks · 20 min
- Block 4: 4 / Commit & Governance · 10 min
"""

import os
import shutil
from PIL import Image, ImageDraw, ImageFont

# Dimensions
WIDTH = 1600
HEIGHT = 1600

# Color Palette
BG_COLOR = "#F4F7F6"         # Clean, soft light background
HEADER_TEAL = "#2F524C"      # Deep brand teal
ACCENT_CORAL = "#D96B4B"     # Vibrant brand coral
CARD_BG = "#FFFFFF"          # Pure white card
CARD_BORDER = "#D6E0DE"      # Subtle card border
CARD_SHADOW = "#E5EBEA"      # Soft drop shadow
TEXT_PRIMARY = "#1A2E2B"     # Dark slate
TEXT_MUTED = "#556B67"       # Muted slate
STICKY_BG = "#FDF5E2"        # Warm sticky note yellow/cream
STICKY_BORDER = "#E8D5A3"    # Sticky border
PEACH_BG = "#FDF0EC"         # Light peach
TEAL_TINT = "#E2ECE9"        # Soft teal tint
GRAY_TINT = "#EAEFF0"        # Neutral gray tint

# Status Pill Colors
MUST_BG = "#2F524C"
MUST_FG = "#FFFFFF"
SHOULD_BG = "#2563EB"
SHOULD_FG = "#FFFFFF"
COULD_BG = "#7C3AED"
COULD_FG = "#FFFFFF"
WONT_BG = "#6B7280"
WONT_FG = "#FFFFFF"

# Fonts
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"

def get_font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def draw_rounded_card(draw, box, radius=14, fill=CARD_BG, border=CARD_BORDER, shadow=True):
    x0, y0, x1, y1 = box
    if shadow:
        draw.rounded_rectangle([x0 + 3, y0 + 4, x1 + 3, y1 + 4], radius=radius, fill=CARD_SHADOW)
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=border, width=1)

def draw_pill(draw, text, x, y, font, bg=TEAL_TINT, fg=HEADER_TEAL, px=10, py=4, radius=8):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + px * 2
    h = th + py * 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=bg)
    draw.text((x + px - bbox[0], y + py - bbox[1]), text, font=font, fill=fg)
    return w, h

def wrap_text(text, font, max_width):
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = font.getbbox(test_line)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(word)
                current_line = []
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def draw_wrapped_text(draw, text, x, y, max_width, font, fill=TEXT_PRIMARY, line_spacing=4):
    lines = wrap_text(text, font, max_width)
    curr_y = y
    for line in lines:
        bbox = font.getbbox(line)
        lh = bbox[3] - bbox[1]
        draw.text((x - bbox[0], curr_y - bbox[1]), line, font=font, fill=fill)
        curr_y += lh + line_spacing
    return curr_y

def draw_header_banner(draw, title, subtitle):
    draw.rectangle([40, 36, 1560, 44], fill=HEADER_TEAL)
    draw.rectangle([40, 44, 280, 48], fill=ACCENT_CORAL)
    draw_pill(draw, "SRH COMPUTER & MEDIA LAB · WI-SE 2026 · SESSION 5 WORKSHOP CANVAS", 40, 58, get_font(13, True), bg=TEAL_TINT, fg=HEADER_TEAL, px=12, py=5)
    draw.text((40, 95), title, font=get_font(34, True), fill=HEADER_TEAL)
    draw.text((40, 146), subtitle, font=get_font(15, False), fill=TEXT_MUTED)
    draw.line([40, 178, 1560, 178], fill="#D8E2E0", width=1)

def draw_footer_bar(draw, slide_num, slide_title):
    draw.line([40, 1550, 1560, 1550], fill="#D8E2E0", width=1)
    f_foot = get_font(13, False)
    f_bold = get_font(13, True)
    draw.text((40, 1562), "Warranty & Subscription Wallet (MCP/API-Enabled) · Team Alpha (Members A, B, C, D)", font=f_foot, fill=TEXT_MUTED)
    page_str = f"Slide {slide_num} of 4 · Block {slide_num}: {slide_title}"
    bbox = f_bold.getbbox(page_str)
    tw = bbox[2] - bbox[0]
    draw.text((1560 - tw, 1562), page_str, font=f_bold, fill=HEADER_TEAL)

def draw_check_badge(draw, cx, cy, radius=10, bg="#059669"):
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=bg)
    draw.line([cx - 5, cy, cx - 1, cy + 4], fill="#FFFFFF", width=2)
    draw.line([cx - 1, cy + 4, cx + 5, cy - 4], fill="#FFFFFF", width=2)


# ==============================================================================
# SLIDE 1: SHARPEN THE IDEA (CONCISE)
# ==============================================================================
def render_slide_1():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    draw_header_banner(
        draw,
        "1 / Sharpen the idea · 20 min",
        "Empirical Discovery Feedback · Scope Pivot · Revised Problem & Outcome · 3 Core Features"
    )
    
    # TOP LEFT: Which Feedback Will We Use? (w=910, h=560, y=195 to 755)
    draw_rounded_card(draw, [40, 195, 960, 755], radius=14)
    draw_pill(draw, "WHICH FEEDBACK WILL WE USE? (USER DISCOVERY & ARCHITECTURE)", 60, 212, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    feedbacks = [
        ("• Person 1 (Laptop Defect, 14mo):",
         "Receipt lost across inboxes; unaware of 2-year statutory rights (BGB § 437).",
         "Action: Encrypted receipt vault + automated statutory warranty calculation."),
        ("• Person 2 (Charger Failure, 9mo):",
         "Photo buried in 15k camera roll; action paralysis on Saturn vs Anker RMA.",
         "Action: 1-tap statutory claim letter generator with attached proof."),
        ("• Person 3 (Washing Machine Bill):",
         "Thermal ink faded after 18mo; verbatim: 'I want reminders more than storage.'",
         "Action: Multi-stage proactive alerts (30, 7, 1 day) before expiration."),
        ("• Person 4 (Student Tax / Werbungskosten):",
         "Needs tech receipts for tax return; BMF 2022 allows 100% digital asset write-off.",
         "Action: 'Tax-Relevant' tag + WISO/Taxfix CSV export preparation.")
    ]
    
    cur_y = 250
    for title, desc, action in feedbacks:
        draw.text((60, cur_y), title, font=get_font(14, True), fill=HEADER_TEAL)
        cur_y += 22
        cur_y = draw_wrapped_text(draw, desc, 60, cur_y, 880, get_font(13, False), fill=TEXT_PRIMARY, line_spacing=3)
        cur_y += 2
        draw.text((60, cur_y), "→ " + action, font=get_font(13, True), fill=ACCENT_CORAL)
        cur_y += 28
        
    # TOP RIGHT: Sticky Note - Strategic Pivot (w=570, h=560, y=195 to 755)
    draw_rounded_card(draw, [990, 195, 1560, 755], radius=14, fill=STICKY_BG, border=STICKY_BORDER)
    draw.rounded_rectangle([1220, 185, 1330, 205], radius=4, fill="#E6D3A3")
    draw_pill(draw, "WE WILL CHANGE THIS BECAUSE...", 1015, 214, get_font(13, True), bg="#EED59B", fg="#4A3B12", px=14, py=5)
    
    draw.text((1015, 258), "Pivot: Dropping Camera OCR from MVP", font=get_font(16, True), fill="#3D3110")
    draw_wrapped_text(draw, "Pivoting from automated OCR scanning to manual-first entry (<15s) with receipt photo vault.", 1015, 288, 520, get_font(13, False), fill="#3D3110")
    
    reasons = [
        ("1. Thermal Paper Fragility:", "Thermal receipts fade & crumple; mobile OCR hallucinates."),
        ("2. Missing Policy Terms:", "95%+ of receipts lack warranty periods or cancellation rules."),
        ("3. Cost & Latency De-risking:", "Multimodal vision APIs add 5–10s latency & token costs."),
        ("4. 100% Data Integrity for S5:", "Manual entry (<15s) with brand presets guarantees clean demo.")
    ]
    
    s_y = 356
    for r_title, r_desc in reasons:
        draw.text((1015, s_y), "• " + r_title, font=get_font(13, True), fill="#2F2507")
        s_y += 20
        s_y = draw_wrapped_text(draw, r_desc, 1030, s_y, 505, get_font(12.5, False), fill="#4A3B12", line_spacing=2)
        s_y += 14
        
    draw.rounded_rectangle([1015, 685, 1535, 735], radius=6, fill="#F2E2BE")
    draw.text((1025, 700), "MVP Camera Role: Retained strictly as receipt attachment vault.", font=get_font(12, True), fill="#61440C")

    # MIDDLE: Revised Problem & Useful Outcome (w=1520, h=275, y=775 to 1050)
    draw_rounded_card(draw, [40, 775, 1560, 1050], radius=14)
    
    # Left Sub-Box: Problem
    draw.rounded_rectangle([60, 795, 785, 980], radius=10, fill=PEACH_BG, outline="#F3CEC5", width=1)
    draw_pill(draw, "REVISED PROBLEM STATEMENT", 80, 810, get_font(11, True), bg="#F8DDD6", fg=ACCENT_CORAL)
    p_text = "Consumers forfeit hundreds of euros yearly because paper receipts fade, warranty & renewal deadlines pass unnoticed, and tax-deductible expenses (Werbungskosten) are lost—intimidated by corporate fine print."
    draw_wrapped_text(draw, p_text, 80, 848, 685, get_font(13, False), fill=TEXT_PRIMARY, line_spacing=4)
    
    # Right Sub-Box: Outcome
    draw.rounded_rectangle([815, 795, 1540, 980], radius=10, fill=TEAL_TINT, outline="#CFE1DC", width=1)
    draw_pill(draw, "USEFUL OUTCOME (VALUE PROPOSITION)", 835, 810, get_font(11, True), bg="#D3E5E0", fg=HEADER_TEAL)
    o_text = "A unified wallet enabling <15s manual logging with receipt vault, automated 30/7/1-day alerts, and 1-tap claim/cancellation letters citing German law (BGB §§ 437/312k), backed by an MCP Policy Wiki for AI agents."
    draw_wrapped_text(draw, o_text, 835, 848, 685, get_font(13, False), fill=TEXT_PRIMARY, line_spacing=4)
    
    # Bottom Metrics Row
    m_y = 1002
    draw.text((60, m_y + 4), "NORTH STAR METRICS:", font=get_font(12, True), fill=HEADER_TEAL)
    draw_pill(draw, "SPEED: <15s Manual Entry Time", 230, m_y, get_font(12, True), bg=GRAY_TINT, fg=TEXT_PRIMARY)
    draw_pill(draw, "SAVINGS: Net € Recovered / User", 490, m_y, get_font(12, True), bg=GRAY_TINT, fg=TEXT_PRIMARY)
    draw_pill(draw, "LEGAL: ≥90% Claim Acceptance Rate", 770, m_y, get_font(12, True), bg=GRAY_TINT, fg=TEXT_PRIMARY)
    draw_pill(draw, "RETENTION: ≥40% 30-Day Sub Retention", 1080, m_y, get_font(12, True), bg=GRAY_TINT, fg=TEXT_PRIMARY)

    # BOTTOM: 3 Core Features + Platform Asset + Exclusions (w=1520, h=465, y=1070 to 1535)
    f_cols = [
        ("1. QUICK MANUAL LOG & VAULT", "CAPTURE & STORE", [
            ("• <15s 3-Field Entry:", "Name, purchase date, category."),
            ("• Receipt Photo Vault:", "Local/cloud image attachment (<5MB)."),
            ("• German Tax Tag:", "Toggle for Werbungskosten (BMF 100%)."),
            ("• Brand Smart Presets:", "Instant 24-mo statutory warranty fill."),
            ("• SHA-256 Immutability:", "Tamper-proof receipt hash for audits."),
            ("• Status:", "Committed for Session 5 demo.")
        ], TEAL_TINT, HEADER_TEAL),
        ("2. DUAL EXPIRY & RENEWAL ALERTS", "MONITOR & ALERT", [
            ("• Unified Dashboard:", "Hardware warranties & subs side-by-side."),
            ("• Proactive Push Alerts:", "Dispatched at T-30, T-7, and T-1 days."),
            ("• Urgency Badges:", "Green (>30d), Amber (7-30d), Red (<7d)."),
            ("• Renewal Warning:", "Prevents lock-in under BGB § 309."),
            ("• Calendar Preview:", "Exportable .ics reminders for renewals."),
            ("• Status:", "Active countdown engine in S5.")
        ], TEAL_TINT, HEADER_TEAL),
        ("3. 1-TAP CLAIM & CANCEL GENERATOR", "ACTION & RECOVERY", [
            ("• Statutory Claim Dossier:", "Cites BGB §§ 437/477 Beweislastumkehr."),
            ("• 1-Tap Cancellation Letter:", "Cites BGB § 312k Kündigungsbutton."),
            ("• Auto-Attached Proof:", "Embeds receipt directly into PDF/draft."),
            ("• Verified RMA Endpoints:", "Direct manufacturer support links."),
            ("• Dual Export:", "1-tap mailto draft & downloadable PDF."),
            ("• Status:", "Claim templates tested in S6.")
        ], TEAL_TINT, HEADER_TEAL),
        ("PLATFORM ASSET & SCOPE EXCLUSIONS", "MCP & NON-GOALS", [
            ("• 20-Brand Policy Wiki:", "Verified rules for top student brands."),
            ("• Open MCP Server:", "JSON-RPC tools for AI agents to query."),
            ("• Out of Scope (MVP):", "No camera OCR (deferred post-MVP)."),
            ("• Explicit Non-Goal:", "No PSD2 banking sync; no ELSTER filing."),
            ("• Architecture:", "Mobile-first PWA before native apps."),
            ("• Core Principle:", "Zero hallucination, 100% clean data.")
        ], PEACH_BG, ACCENT_CORAL)
    ]
    
    col_w = 358
    col_gap = 26
    start_x = 40
    c_y = 1070
    
    for i, (col_title, col_sub, col_items, col_bg, col_fg) in enumerate(f_cols):
        cx = start_x + i * (col_w + col_gap)
        draw_rounded_card(draw, [cx, c_y, cx + col_w, c_y + 465], radius=12)
        
        # Col Header
        draw.rounded_rectangle([cx + 1, c_y + 1, cx + col_w - 1, c_y + 55], radius=11, fill=col_bg)
        draw.text((cx + 14, c_y + 10), col_title, font=get_font(12, True), fill=col_fg)
        draw.text((cx + 14, c_y + 30), col_sub, font=get_font(11, False), fill=TEXT_MUTED)
        
        # Items
        iy = c_y + 70
        for item_h, item_d in col_items:
            is_neg = "Out of Scope" in item_h or "Non-Goal" in item_h
            is_stat = "Status" in item_h or "Principle" in item_h
            if is_neg:
                h_fill = ACCENT_CORAL
            elif is_stat:
                h_fill = "#059669"
            else:
                h_fill = HEADER_TEAL
            draw.text((cx + 14, iy), item_h, font=get_font(12, True), fill=h_fill)
            iy += 18
            iy = draw_wrapped_text(draw, item_d, cx + 14, iy, col_w - 28, get_font(11.5, False), fill=TEXT_PRIMARY, line_spacing=2)
            iy += 10
            
    draw_footer_bar(draw, 1, "Sharpen the Idea · 20 min")
    img.save("square_block_1_sharpen_the_idea.png", "PNG")
    print("Rendered concise: square_block_1_sharpen_the_idea.png")


# ==============================================================================
# SLIDE 2: BACKLOG & ACCEPTANCE CRITERIA (CONCISE)
# ==============================================================================
def render_slide_2():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    draw_header_banner(
        draw,
        "2 / Backlog & Acceptance Criteria · 25 min",
        "9 Prioritised MoSCoW User Stories · Must-Have Acceptance Criteria · Team Workload & Sprint Allocation"
    )
    
    # TOP SECTION: 9 Prioritized User Stories (w=1520, h=700, y=195 to 895)
    draw_rounded_card(draw, [40, 195, 1560, 895], radius=14)
    draw_pill(draw, "PRIORITISED MoSCoW BACKLOG (9 USER STORIES WITH ESTIMATES & OWNERS)", 60, 212, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    stories = [
        # MUST
        ("US-01 [MUST]", "Manual Entry & Photo Vault", "Member B & D", "5 pts",
         "Manually log product/receipt in <15s with image attachment & tax tag for proof.",
         "• Flow <15s (Name, Date, Category)\n• Image upload (<5MB) with thumbnail",
         MUST_BG, MUST_FG),
        ("US-02 [MUST]", "Dual Expiry Calculation Engine", "Member D", "3 pts",
         "Automated calculation of statutory warranty (24mo BGB § 438) & sub renewals.",
         "• Auto 24-mo statutory warranty\n• Dynamic color urgency countdown pills",
         MUST_BG, MUST_FG),
        ("US-03 [MUST]", "Proactive 30/7/1-Day Alerts", "Member D & A", "5 pts",
         "Multi-stage push alerts before coverage expires or contracts auto-renew.",
         "• Scheduled at T-30d, T-7d, T-1d\n• Email fallback + urgent in-app banner",
         MUST_BG, MUST_FG),
        ("US-04 [MUST]", "1-Tap Statutory Claim & Cancel", "Member C & B", "5 pts",
         "1-tap generation of claim & cancel letters citing German law (BGB §§ 437/312k).",
         "• Formal draft with legal citations\n• Receipt proof auto-attached to PDF/mail",
         MUST_BG, MUST_FG),
        ("US-05 [MUST]", "Unified Responsive Dashboard", "Member B", "3 pts",
         "Single responsive dashboard with status badges & instantaneous search/filter.",
         "• Mobile & desktop responsive screen\n• Filter by Hardware vs Sub vs Tax",
         MUST_BG, MUST_FG),
        # SHOULD
        ("US-06 [SHOULD]", "Top 20 Brand Policy Wiki", "Member C", "5 pts",
         "Verified cancellation windows, refund rules & RMA links for 20 student brands.",
         "• Structured JSON for top 20 brands\n• Verified RMA links & notice cutoffs",
         SHOULD_BG, SHOULD_FG),
        ("US-07 [SHOULD]", "Open MCP Server & REST API", "Member D", "5 pts",
         "Query the Policy Wiki via JSON-RPC tools so AI agents assist without hallucinations.",
         "• MCP JSON-RPC 2.0 query tools for AI\n• REST endpoints for policy lookups",
         SHOULD_BG, SHOULD_FG),
        # COULD & WON'T
        ("US-08 [COULD]", "German Tax (Werbungskosten) Export", "Member C & D", "3 pts",
         "Export tax-tagged receipts formatted for German returns (BMF 100% write-off).",
         "• CSV/ZIP export for WISO / Taxfix\n• Pre-flags BMF 100% digital asset rule",
         COULD_BG, COULD_FG),
        ("US-09 [WON'T]", "Camera OCR Scanning & Bank Sync", "Future Scope", "8 pts",
         "On-device OCR receipt scanning & banking sync explicitly deferred post-MVP.",
         "• Out of scope for MVP to prevent creep\n• Camera strictly serves as receipt vault",
         WONT_BG, WONT_FG),
    ]
    
    col_w = 480
    col_gap = 25
    start_x = 60
    s_y_base = 246
    card_h = 200
    
    for idx, (code, title, owner, pts, desc, criteria, pill_bg, pill_fg) in enumerate(stories):
        c_col = idx % 3
        c_row = idx // 3
        cx = start_x + c_col * (col_w + col_gap)
        cy = s_y_base + c_row * (card_h + 10)
        
        # Story card box
        draw.rounded_rectangle([cx, cy, cx + col_w, cy + card_h], radius=10, fill="#FFFFFF", outline="#DCE4E3", width=1)
        
        # Story Header
        draw_pill(draw, code, cx + 12, cy + 10, get_font(11, True), bg=pill_bg, fg=pill_fg, px=8, py=3)
        draw.text((cx + 122, cy + 12), title, font=get_font(12, True), fill=HEADER_TEAL)
        
        # Story Meta
        meta_str = f"Owner: {owner}   |   Estimate: {pts}"
        draw.text((cx + 12, cy + 36), meta_str, font=get_font(10.5, True), fill=TEXT_MUTED)
        
        # Story Text
        cy_text = draw_wrapped_text(draw, desc, cx + 12, cy + 54, col_w - 24, get_font(11, False), fill=TEXT_PRIMARY, line_spacing=2)
        
        # Key Acceptance Criteria inside card
        draw.rounded_rectangle([cx + 10, cy + 124, cx + col_w - 10, cy + card_h - 8], radius=6, fill="#F7FAF9")
        draw.text((cx + 16, cy + 128), "Acceptance Criteria:", font=get_font(10, True), fill=HEADER_TEAL)
        draw_wrapped_text(draw, criteria, cx + 16, cy + 144, col_w - 32, get_font(9.5, False), fill=TEXT_PRIMARY, line_spacing=2)

    # BOTTOM LEFT: Detailed Acceptance Criteria (w=910, h=620, y=915 to 1535)
    draw_rounded_card(draw, [40, 915, 960, 1535], radius=14)
    draw_pill(draw, "MUST-HAVE DETAILED ACCEPTANCE CRITERIA (GHERKIN / DoD)", 60, 932, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    ac_items = [
        ("US-01: Manual Log & Receipt Vault (<15s flow)",
         "• Given user clicks '+ Add', when entering Name, Date, Category, flow finishes <15s.\n"
         "• Optional photo upload accepts PNG/JPG (<5MB) with instant local preview thumbnail.\n"
         "• 'Tax-Relevant' checkbox sets Werbungskosten flag with client-side SHA-256 hash."),
        ("US-02: Dual Expiry Calculation Engine",
         "• Hardware defaults to statutory 24-mo warranty under German law (BGB § 438).\n"
         "• Subscriptions calculate monthly/annual renewals & cancellation cutoff (T-30d).\n"
         "• Dashboard shows dynamic color badges (Green >30d, Yellow 7–30d, Red <7d)."),
        ("US-03: Multi-Stage Proactive Alerts",
         "• Push alerts trigger deterministically at T-30, T-7, and T-1 days before deadline.\n"
         "• Fallback email notification if push denied; persistent in-app banner for items <7d."),
        ("US-04: 1-Tap Claim & Cancellation Generator",
         "• Generates formatted PDF/mailto draft citing BGB §§ 437, 477 (Beweislastumkehr) or § 312k.\n"
         "• Pre-populates retailer email, user details, defect summary, and embeds receipt photo."),
        ("US-05: Unified Products & Subscriptions Dashboard",
         "• Single responsive screen sorted by nearest expiration; instant client-side tabs filter\n"
         "  between 'Hardware', 'Subscriptions', and 'Tax-Relevant' items (<100ms response).")
    ]
    
    acy = 966
    for ac_title, ac_desc in ac_items:
        draw.text((60, acy), ac_title, font=get_font(12.5, True), fill=HEADER_TEAL)
        acy += 20
        acy = draw_wrapped_text(draw, ac_desc, 60, acy, 880, get_font(11.5, False), fill=TEXT_PRIMARY, line_spacing=2)
        acy += 10

    # BOTTOM RIGHT: Team Sprint Workload Allocation (w=570, h=620, y=915 to 1535)
    draw_rounded_card(draw, [990, 915, 1560, 1535], radius=14)
    draw_pill(draw, "SPRINT 1 WORKLOAD ALLOCATION (24H TOTAL / 6H PER MEMBER)", 1010, 932, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    roles = [
        ("Member A · Project Manager & QA", "6 hrs / week",
         "• Sprint backlog orchestration & Notion/GitHub tracker governance.\n"
         "• Design Session 6 usability testing protocol with 5 SRH students.\n"
         "• Enforce Definition of Done quality gates and PR sign-offs.",
         "#E8F1EF"),
        ("Member B · UX/UI & Frontend Lead", "6 hrs / week",
         "• Mobile-first responsive UI components in Tailwind / CSS.\n"
         "• Design tokens (Teal #507873 / Coral #D96B4B) & component library.\n"
         "• Build 4 core views: Dashboard, Add Modal, Detail Card, Claim View.",
         "#E8F1EF"),
        ("Member C · Product & Policy Research", "6 hrs / week",
         "• Curate 20 top student brand warranty & cancellation policies.\n"
         "• Draft legally verified claim templates citing BGB §§ 437/477/312k.\n"
         "• Synthesize German tax guide (Werbungskosten / BMF 2022 write-off).",
         "#E8F1EF"),
        ("Member D · Full-Stack Dev Lead", "6 hrs / week",
         "• Core data store schema & local receipt image vault (<5MB).\n"
         "• Build dual expiry calculation engine & push notification scheduler.\n"
         "• Prototype open Model Context Protocol (MCP) JSON-RPC server.",
         "#E8F1EF")
    ]
    
    ry = 966
    for r_title, r_time, r_desc, r_bg in roles:
        draw.rounded_rectangle([1010, ry, 1540, ry + 128], radius=8, fill=r_bg, outline="#CFDDD9", width=1)
        draw.text((1025, ry + 10), r_title, font=get_font(12.5, True), fill=HEADER_TEAL)
        draw_pill(draw, r_time, 1435, ry + 8, get_font(11, True), bg=HEADER_TEAL, fg="#FFFFFF", px=8, py=3)
        draw_wrapped_text(draw, r_desc, 1025, ry + 36, 500, get_font(11, False), fill=TEXT_PRIMARY, line_spacing=2)
        ry += 138
        
    draw_footer_bar(draw, 2, "Backlog & Acceptance Criteria · 25 min")
    img.save("square_block_2_backlog.png", "PNG")
    print("Rendered concise: square_block_2_backlog.png")


# ==============================================================================
# SLIDE 3: ROUTE & RISKS (CONCISE)
# ==============================================================================
def render_slide_3():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    draw_header_banner(
        draw,
        "3 / Route + risks · 20 min",
        "SRH MediaLab Semester Milestones (S4–S10) · 5 Prioritised Project Risks & Actionable Mitigations"
    )
    
    # TOP SECTION: Semester Roadmap (w=1520, h=510, y=195 to 705)
    draw_rounded_card(draw, [40, 195, 1560, 705], radius=14)
    draw_pill(draw, "SEMESTER ROUTE & MILESTONE SCHEDULE (ALIGNED WITH SRH SYLLABUS)", 60, 212, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    milestones = [
        ("S4 (Oct 24)", "DESIGN & PROTOTYPE", "COMPLETED",
         "• 4-view Figma wireframes & brand tokens.\n• User journeys & workshop canvas setup.\n• Gate: Team alignment on scope boundary.",
         "#E2ECE9", HEADER_TEAL),
        ("S5 (Oct 31)", "MVP SCOPE LOCK (ACTIVE)", "ACTIVE SPRINT",
         "• Core journey: manual log (<15s) + receipt vault.\n• Dual expiry countdown calculation engine.\n• Gate: Manual logging speed <15s verified.",
         PEACH_BG, ACCENT_CORAL),
        ("S6 (Nov 14)", "TESTING & FEEDBACK", "SCHEDULED",
         "• Usability testing with 5 SRH students.\n• Evaluate claim letter generation clarity.\n• Gate: Zero blocking UX usability defects.",
         GRAY_TINT, TEXT_PRIMARY),
        ("S7 (Nov 28)", "ITERATE & POLISH", "SCHEDULED",
         "• Student feedback fixes & reminder logic.\n• Policy Wiki expanded to 20 student brands.\n• Gate: Working MCP JSON-RPC prototype.",
         GRAY_TINT, TEXT_PRIMARY),
        ("S8 (Dec 12)", "FEATURE FREEZE & RELEASE", "SCHEDULED",
         "• Full end-to-end beta release & code freeze.\n• Cross-browser QA & demo rehearsal.\n• Gate: 100% automated test pass rate.",
         GRAY_TINT, TEXT_PRIMARY),
        ("S9 (Jan 09)", "PROJECT SUBMISSION", "DEADLINE",
         "• Final code commit, docs & test summary.\n• GitHub repo, slide deck & demo video.\n• Gate: Formal academic submission complete.",
         GRAY_TINT, TEXT_PRIMARY),
        ("S10 (Jan 16)", "FINAL EXAM PRESENTATION", "EXAMINATION",
         "• 7-minute live pitch & interactive demo.\n• Examiner evaluation & module defense.\n• Gate: Successful final module grading.",
         "#EBE4F5", "#5B21B6")
    ]
    
    m_w = 345
    m_gap = 20
    
    # Row 1 (S4 to S7)
    for i in range(4):
        s_date, s_title, s_status, s_desc, m_bg, m_fg = milestones[i]
        mx = 60 + i * (m_w + m_gap)
        my = 246
        draw.rounded_rectangle([mx, my, mx + m_w, my + 215], radius=10, fill=m_bg, outline="#CFDDD9", width=1)
        draw.text((mx + 14, my + 14), s_date, font=get_font(14, True), fill=m_fg)
        draw_pill(draw, s_status, mx + m_w - 95, my + 10, get_font(9, True), bg=m_fg, fg="#FFFFFF", px=6, py=2)
        draw.text((mx + 14, my + 42), s_title, font=get_font(11, True), fill=HEADER_TEAL)
        draw_wrapped_text(draw, s_desc, mx + 14, my + 68, m_w - 28, get_font(11, False), fill=TEXT_PRIMARY, line_spacing=4)
        
    # Row 2 (S8 to S10)
    m_w2 = 465
    for j in range(3):
        idx = 4 + j
        s_date, s_title, s_status, s_desc, m_bg, m_fg = milestones[idx]
        mx = 60 + j * (m_w2 + m_gap + 10)
        my = 475
        draw.rounded_rectangle([mx, my, mx + m_w2, my + 215], radius=10, fill=m_bg, outline="#CFDDD9", width=1)
        draw.text((mx + 14, my + 14), s_date, font=get_font(14, True), fill=m_fg)
        draw_pill(draw, s_status, mx + m_w2 - 105, my + 10, get_font(9, True), bg=m_fg, fg="#FFFFFF", px=6, py=2)
        draw.text((mx + 14, my + 42), s_title, font=get_font(11, True), fill=HEADER_TEAL)
        draw_wrapped_text(draw, s_desc, mx + 14, my + 68, m_w2 - 28, get_font(11, False), fill=TEXT_PRIMARY, line_spacing=4)

    # BOTTOM SECTION: 5 Prioritized Risks & Mitigations (w=1520, h=810, y=725 to 1535)
    draw_rounded_card(draw, [40, 725, 1560, 1535], radius=14)
    draw_pill(draw, "5 PRIORITISED PROJECT RISKS & ACTIONABLE MITIGATIONS", 60, 742, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    risks = [
        ("Risk 1 · Scope Creep into Camera OCR Scanning", "HIGH SEVERITY", "#DC2626", "Owner: Member A (PM)",
         "Impact: Attempting automated receipt scanning derails development & exhausts vision tokens.",
         "Mitigation: Strict ban on camera OCR in MVP. Manual entry (<15s) guarantees 100% data integrity.",
         "Early Trigger: Any pull request introducing client-side OCR without PM sign-off."),
        ("Risk 2 · Legal Accuracy of Generated Claim Letters", "MEDIUM SEVERITY", "#D97706", "Owner: Member C (Research)",
         "Impact: Claims rejected by retailers if German consumer law citations are inaccurate.",
         "Mitigation: Pre-format templates citing BGB §§ 437, 477 (Beweislastumkehr) & § 312k + legal disclaimers.",
         "Early Trigger: Ambiguity in claim rejection feedback during Session 6 user testing."),
        ("Risk 3 · Push Notification Delivery Failure / Blocked", "HIGH SEVERITY", "#DC2626", "Owner: Member D (Dev Lead)",
         "Impact: Users deny browser permissions, missing warranty expirations & renewals.",
         "Mitigation: Triple redundancy: WebPush + Email fallback (Resend) + persistent in-app urgency banners.",
         "Early Trigger: Permission opt-in rate <50% during Session 6 usability trials."),
        ("Risk 4 · Team Workload & Solo Developer Bottleneck", "MEDIUM SEVERITY", "#D97706", "Owner: Member A (PM)",
         "Impact: Development bottleneck falls solely on Member D, risking burnout and delayed sprints.",
         "Mitigation: Strict 6h/wk timebox; pair programming (Member D pairs with B on UI components).",
         "Early Trigger: Any backlog task exceeding 5 story points or remaining in WIP >4 days."),
        ("Risk 5 · Policy Wiki Data Staleness & Dead Links", "LOW SEVERITY", "#059669", "Owner: Member C (Research)",
         "Impact: Brand warranty terms, cancellation notice periods, or RMA support URLs become outdated.",
         "Mitigation: Scope MVP strictly to top 20 verified student brands; schema with last_verified timestamp.",
         "Early Trigger: 404 error returned on RMA link or changed cancellation terms.")
    ]
    
    r_y = 776
    r_h = 142
    for r_title, r_sev, r_color, r_owner, r_imp, r_mit, r_trig in risks:
        draw.rounded_rectangle([60, r_y, 1540, r_y + r_h], radius=8, fill="#FFFFFF", outline="#DCE4E3", width=1)
        
        # Header Row
        draw.text((75, r_y + 12), r_title, font=get_font(13.5, True), fill=HEADER_TEAL)
        draw_pill(draw, r_sev, 620, r_y + 10, get_font(10, True), bg=r_color, fg="#FFFFFF", px=8, py=2)
        draw.text((760, r_y + 13), r_owner, font=get_font(12, True), fill=TEXT_MUTED)
        
        # Details
        draw_wrapped_text(draw, "• " + r_imp, 75, r_y + 40, 1440, get_font(12, False), fill="#7F1D1D", line_spacing=2)
        draw_wrapped_text(draw, "• " + r_mit, 75, r_y + 72, 1440, get_font(12, False), fill="#065F46", line_spacing=2)
        draw_wrapped_text(draw, "• " + r_trig, 75, r_y + 106, 1440, get_font(11.5, False), fill="#854D0E", line_spacing=2)
        
        r_y += r_h + 10
        
    draw_footer_bar(draw, 3, "Route + risks · 20 min")
    img.save("square_block_3_route_and_risks.png", "PNG")
    print("Rendered concise: square_block_3_route_and_risks.png")


# ==============================================================================
# SLIDE 4: COMMIT & GOVERNANCE (CONCISE)
# ==============================================================================
def render_slide_4():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    draw_header_banner(
        draw,
        "4 / Commit · 10 min",
        "Project Management & Governance · Immediate Session 5 Deliverables · External Support · Definition of Done"
    )
    
    # TOP LEFT: Project Manager & Agile Board (w=735, h=640, y=195 to 835)
    draw_rounded_card(draw, [40, 195, 775, 835], radius=14)
    draw_pill(draw, "PROJECT MANAGER & 5-COLUMN AGILE GOVERNANCE BOARD", 60, 212, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    draw.text((60, 248), "Project Manager:", font=get_font(13.5, True), fill=HEADER_TEAL)
    draw.text((185, 248), "Member A (Sprint Master & Quality Gatekeeper)", font=get_font(13, False), fill=TEXT_PRIMARY)
    
    draw.text((60, 276), "Tracker System:", font=get_font(13.5, True), fill=HEADER_TEAL)
    draw.text((185, 276), "GitHub Projects & Notion Kanban Board", font=get_font(13, False), fill=TEXT_PRIMARY)
    
    # 5-Column Visual Board
    draw.text((60, 312), "5-Column Board Structure & WIP Limits:", font=get_font(12.5, True), fill=HEADER_TEAL)
    
    columns = [
        ("1. Backlog", "All prioritized MoSCoW user stories (US-01 to US-09).", "#F1F5F9", "No limit"),
        ("2. Next (Sprint 1)", "Active 2-week sprint backlog items committed.", "#E0F2FE", "Max 6"),
        ("3. In Progress", "Active implementation & coding.", "#FEF3C7", "Max 4 (WIP)"),
        ("4. In Review / QA", "Peer review, visual UI check & DoD validation.", "#EDE9FE", "Max 3"),
        ("5. Done", "100% meets Definition of Done; merged to main.", "#DCFCE7", "Closed")
    ]
    
    b_y = 338
    for c_title, c_desc, c_bg, c_wip in columns:
        draw.rounded_rectangle([60, b_y, 755, b_y + 46], radius=6, fill=c_bg, outline="#CFDDD9", width=1)
        draw.text((75, b_y + 13), c_title, font=get_font(12, True), fill=HEADER_TEAL)
        draw_pill(draw, c_wip, 665, b_y + 10, get_font(10, True), bg=HEADER_TEAL, fg="#FFFFFF", px=6, py=2)
        draw.text((220, b_y + 15), c_desc, font=get_font(11, False), fill=TEXT_PRIMARY)
        b_y += 52
        
    draw.text((60, 620), "Team Cadence & Rituals:", font=get_font(12.5, True), fill=HEADER_TEAL)
    c_cadence = (
        "• Weekly Async Standup: Discord/Slack check-in every Tuesday 18:00.\n"
        "• Pre-Lab Sync: 30-minute alignment every Friday at 09:30 before SRH lab.\n"
        "• Pair Programming: Developer (Member D) pairs with UI Lead (Member B).\n"
        "• Bi-Weekly Retro: Held after Friday lab sessions to refine backlog."
    )
    draw_wrapped_text(draw, c_cadence, 60, 648, 695, get_font(12, False), fill=TEXT_PRIMARY, line_spacing=4)

    # TOP RIGHT: Session 5 Deliverables (w=735, h=640, y=195 to 835)
    draw_rounded_card(draw, [815, 195, 1560, 835], radius=14)
    draw_pill(draw, "NEXT RESULTS: IMMEDIATE SESSION 5 DELIVERABLES (OCT 31)", 835, 212, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    deliverables = [
        ("Deliverable 1 · Manual Entry & Photo Upload Modal", "SESSION 5 (OCT 31)",
         "Owners: Member B (UI) & Member D (Dev)",
         "Interactive 3-field modal (Name, Date, Category) with receipt image upload (<5MB), instant preview thumbnail, and German tax toggle (<15s flow)."),
        ("Deliverable 2 · Curated 20-Brand Policy Wiki Dataset", "SESSION 5 (OCT 31)",
         "Owner: Member C (Product & Research Lead)",
         "Structured JSON repository covering 20 student brands (Apple, Spotify, Amazon, etc.) with verified warranty windows, cancellation cutoffs, and RMA URLs."),
        ("Deliverable 3 · Usability Testing Protocol & Task Guide", "SESSION 5 (OCT 31)",
         "Owner: Member A (Project Manager)",
         "5-step task-based test protocol for Session 6: logging speed check, receipt upload clarity, notification trigger check, and claim letter review."),
        ("Deliverable 4 · Open MCP Server Protocol Prototype", "SESSION 5 (OCT 31)",
         "Owner: Member D (Development Lead)",
         "Basic JSON-RPC 2.0 tool schema allowing autonomous AI agents to query the Policy Wiki, returning structured cancellation windows & warranty terms.")
    ]
    
    d_y = 250
    for d_title, d_due, d_owner, d_scope in deliverables:
        draw.rounded_rectangle([835, d_y, 1540, d_y + 132], radius=8, fill="#FFFFFF", outline="#DCE4E3", width=1)
        draw.text((850, d_y + 10), d_title, font=get_font(12.5, True), fill=HEADER_TEAL)
        draw_pill(draw, d_due, 1375, d_y + 8, get_font(10, True), bg=ACCENT_CORAL, fg="#FFFFFF", px=8, py=3)
        draw.text((850, d_y + 32), d_owner, font=get_font(11, True), fill=TEXT_MUTED)
        draw_wrapped_text(draw, d_scope, 850, d_y + 56, 675, get_font(11.5, False), fill=TEXT_PRIMARY, line_spacing=2)
        d_y += 142

    # BOTTOM LEFT: Support Needed (w=735, h=680, y=855 to 1535)
    draw_rounded_card(draw, [40, 855, 775, 1535], radius=14)
    draw_pill(draw, "EXTERNAL SUPPORT & FACULTY RESOURCES NEEDED", 60, 872, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    supports = [
        ("1. Faculty Scope Guidance (Prof. Franziska Schwarz):",
         "Confirm agreement that manual entry (<15s) + receipt vault fully satisfies the 'working core user journey' without premature OCR complexity.",
         "Formal milestone approval during Session 5 lab."),
        ("2. Student Usability Testing Cohort (5 Participants):",
         "Access to 5 non-technical SRH students for Session 6 usability testing to evaluate onboarding friction, logging speed, and claim trust.",
         "Scheduled for Session 6 (Nov 14)."),
        ("3. Academic Legal Disclaimer Validation:",
         "Consultation with SRH legal/business faculty to review formulations citing BGB §§ 437/477 and German income tax write-off disclaimers.",
         "Pre-cleared before Session 6 usability trials."),
        ("4. Cloud Infrastructure & Hosting Credits:",
         "GitHub Student Developer Pack / Vercel deployment approval and Supabase/Firebase free tier storage for encrypted receipt attachments.",
         "Deployed staging environment for Session 5 demo.")
    ]
    
    sup_y = 910
    for s_title, s_desc, s_target in supports:
        draw.text((60, sup_y), s_title, font=get_font(13, True), fill=HEADER_TEAL)
        sup_y += 20
        sup_y = draw_wrapped_text(draw, s_desc, 60, sup_y, 695, get_font(12, False), fill=TEXT_PRIMARY, line_spacing=3)
        sup_y += 4
        draw.text((60, sup_y), "→ Target: " + s_target, font=get_font(11.5, True), fill=ACCENT_CORAL)
        sup_y += 28

    # BOTTOM RIGHT: Definition of Done (w=735, h=680, y=855 to 1535)
    draw_rounded_card(draw, [815, 855, 1560, 1535], radius=14)
    draw_pill(draw, "RIGOROUS DEFINITION OF DONE (DoD QUALITY GATES)", 835, 872, get_font(12, True), bg=TEAL_TINT, fg=HEADER_TEAL)
    
    draw.text((835, 910), "A backlog story or task is marked DONE only when passing all 6 gates:", font=get_font(12.5, True), fill=HEADER_TEAL)
    
    dods = [
        ("Gate 1 · Acceptance Criteria Verified:",
         "100% of defined Gherkin / MoSCoW acceptance criteria pass verified manual testing on both desktop and mobile viewports."),
        ("Gate 2 · Peer Review & QA Gate:",
         "Pull request reviewed and approved by at least one other team member. Clean git history with descriptive commit messages."),
        ("Gate 3 · Responsive Mobile & Desktop Layout:",
         "Fully responsive UI verified across viewport widths from 375px (iPhone) to 1440px (Desktop Chrome/Safari) with zero broken elements."),
        ("Gate 4 · Reliability & Performance Standards:",
         "Image uploads <5MB handled smoothly with client-side compression; zero uncaught exceptions or error logs in browser console."),
        ("Gate 5 · German Legal & Tax Integrity:",
         "All statutory claim packages cite accurate BGB sections (§§ 437, 477, 312k) and tax items properly reflect BMF 100% write-off guidelines."),
        ("Gate 6 · Live Deployment & Documentation:",
         "Code merged to 'main' branch, auto-deployed to Vercel/staging, and documented in project tracker with demo screenshot or recording.")
    ]
    
    dod_y = 945
    for d_gate, d_text in dods:
        draw_check_badge(draw, 846, dod_y + 7, radius=10, bg="#059669")
        draw.text((868, dod_y), d_gate, font=get_font(12.5, True), fill="#065F46")
        dod_y += 20
        dod_y = draw_wrapped_text(draw, d_text, 868, dod_y, 660, get_font(11.5, False), fill=TEXT_PRIMARY, line_spacing=2)
        dod_y += 18
        
    draw_footer_bar(draw, 4, "Commit · 10 min")
    img.save("square_block_4_commit.png", "PNG")
    print("Rendered concise: square_block_4_commit.png")

if __name__ == "__main__":
    render_slide_1()
    render_slide_2()
    render_slide_3()
    render_slide_4()
    print("All 4 concise square slides successfully rendered!")
