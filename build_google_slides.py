import os
from pathlib import Path
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import pymupdf as fitz
import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

WORKSPACE = Path(r"c:\Users\admin\Documents\antigravity\optimistic-bardeen")
ASSETS_DIR = WORKSPACE / "pitch_assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Exact color palette
HEX_TEAL = RGBColor(0x50, 0x78, 0x73)      # #507873 Dark Teal Header & Borders
HEX_CORAL = RGBColor(0xD9, 0x6B, 0x4B)     # #D96B4B Terracotta / Coral Accent
HEX_CREAM = RGBColor(0xFD, 0xF7, 0xF2)     # #FDF7F2 Slide Canvas Background
HEX_PEACH = RGBColor(0xFC, 0xEC, 0xE8)     # #FCECE8 Peach Box Fill
HEX_WHITE = RGBColor(0xFF, 0xFF, 0xFF)     # White Box Fill
HEX_DARK = RGBColor(0x26, 0x32, 0x32)      # Dark Charcoal Text
HEX_MUTED = RGBColor(0x4A, 0x5A, 0x5A)     # Muted Grey-Teal Body Text
HEX_LIGHT_BORDER = RGBColor(0x50, 0x78, 0x73)


def generate_chevrons_png(out_path: Path) -> Path:
    """Draws high-DPI 4-stage chevron diagram."""
    w, h = 1150, 190
    doc = fitz.open()
    page = doc.new_page(width=w, height=h)

    bg_shape = page.new_shape()
    bg_shape.draw_rect(fitz.Rect(0, 0, w, h))
    bg_shape.finish(fill=(253 / 255, 247 / 255, 242 / 255), color=None)
    bg_shape.commit()

    stages = [
        ("Capture", "Quick item & plan input\n+ receipt photo saved\n(terms auto-matched)", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Store", "Invoice, warranty terms\n& cancellation policy\nsaved in secure vault", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Alert", "Reminders at 30, 7,\nand 1 day before coverage\nor trial renewal expires", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Claim / Act", "1-tap claim or trial\ncancellation drafted,\ntracked to resolution", (0xD9 / 255, 0x6B / 255, 0x4B / 255)),
    ]

    chev_w = 255
    chev_h = 100
    tip = 28
    gap = 22
    start_x = 10
    top_y = 6

    for idx, (title, desc, fill_rgb) in enumerate(stages):
        x0 = start_x + idx * (chev_w + gap)
        y0 = top_y
        y_mid = y0 + chev_h / 2
        y1 = y0 + chev_h

        pts = [
            fitz.Point(x0, y0),
            fitz.Point(x0 + chev_w - tip, y0),
            fitz.Point(x0 + chev_w, y_mid),
            fitz.Point(x0 + chev_w - tip, y1),
            fitz.Point(x0, y1),
            fitz.Point(x0 + tip, y_mid),
        ]
        sh = page.new_shape()
        sh.draw_polyline(pts)
        sh.finish(fill=fill_rgb, color=None, closePath=True)
        sh.commit()

        text_rect = fitz.Rect(x0 + tip, y0 + 30, x0 + chev_w - tip / 2, y1 - 18)
        page.insert_textbox(
            text_rect,
            title,
            fontsize=20,
            fontname="hebo",
            color=(1, 1, 1),
            align=fitz.TEXT_ALIGN_CENTER,
        )

        cap_rect = fitz.Rect(x0 + 6, y1 + 8, x0 + chev_w + 4, h - 2)
        page.insert_textbox(
            cap_rect,
            desc,
            fontsize=12,
            fontname="helv",
            color=(0x38 / 255, 0x48 / 255, 0x48 / 255),
            align=fitz.TEXT_ALIGN_LEFT,
        )

    pix = page.get_pixmap(dpi=240)
    pix.save(str(out_path))
    doc.close()
    return out_path


def generate_timeline_png(out_path: Path) -> Path:
    """Draws high-DPI horizontal milestone timeline."""
    w, h = 1150, 92
    doc = fitz.open()
    page = doc.new_page(width=w, height=h)

    bg_shape = page.new_shape()
    bg_shape.draw_rect(fitz.Rect(0, 0, w, h))
    bg_shape.finish(fill=(253 / 255, 247 / 255, 242 / 255), color=None)
    bg_shape.commit()

    milestones = [
        ("S3", "Brief & pitch", True),
        ("S4", "Wireframes", False),
        ("S5", "Prototype v1", False),
        ("S6", "Capture & DB work", False),
        ("S7", "Alerts work", False),
        ("S8", "Claims work", False),
        ("S9", "User tests", False),
        ("S10", "Investor demo", False),
    ]

    teal = (0x50 / 255, 0x78 / 255, 0x73 / 255)
    coral = (0xD9 / 255, 0x6B / 255, 0x4B / 255)
    dark = (0x26 / 255, 0x32 / 255, 0x32 / 255)
    muted = (0x4A / 255, 0x5A / 255, 0x5A / 255)

    x_start = 68
    x_end = w - 68
    y_line = 44
    step = (x_end - x_start) / (len(milestones) - 1)

    line_sh = page.new_shape()
    line_sh.draw_line(fitz.Point(x_start, y_line), fitz.Point(x_end, y_line))
    line_sh.finish(color=teal, width=3.2)
    line_sh.commit()

    for idx, (code, label, is_highlight) in enumerate(milestones):
        cx = x_start + idx * step
        dot_color = coral if is_highlight else teal

        top_rect = fitz.Rect(cx - 45, 2, cx + 45, 30)
        page.insert_textbox(
            top_rect,
            code,
            fontsize=12.5,
            fontname="hebo",
            color=dark,
            align=fitz.TEXT_ALIGN_CENTER,
        )

        c_sh = page.new_shape()
        c_sh.draw_circle(fitz.Point(cx, y_line), 11.5)
        c_sh.finish(fill=dot_color, color=dot_color)
        c_sh.commit()

        bot_rect = fitz.Rect(cx - 66, y_line + 16, cx + 66, h - 2)
        page.insert_textbox(
            bot_rect,
            label,
            fontsize=11,
            fontname="helv",
            color=muted,
            align=fitz.TEXT_ALIGN_CENTER,
        )

    pix = page.get_pixmap(dpi=240)
    pix.save(str(out_path))
    doc.close()
    return out_path


def add_slide_header(slide, title_text: str, subtitle_text: str):
    # Top banner rectangle
    header_box = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.4), Inches(0.28), Inches(12.533), Inches(1.18))
    header_box.fill.solid()
    header_box.fill.fore_color.rgb = HEX_TEAL
    header_box.line.color.rgb = HEX_TEAL
    header_box.line.width = Pt(0)

    tf = header_box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.25)
    tf.margin_top = Inches(0.12)
    tf.margin_bottom = Inches(0.12)

    p1 = tf.paragraphs[0]
    p1.text = title_text
    p1.font.bold = True
    p1.font.size = Pt(26)
    p1.font.color.rgb = HEX_WHITE
    p1.font.name = "Arial"

    p2 = tf.add_paragraph()
    p2.text = subtitle_text
    p2.font.bold = False
    p2.font.size = Pt(13)
    p2.font.color.rgb = HEX_WHITE
    p2.font.name = "Arial"


def add_card(slide, left, top, width, height, title, body_paragraphs, fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_CORAL):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    card.line.color.rgb = border_color
    card.line.width = Pt(1.5)

    tf = card.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.2)
    tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.2)
    tf.margin_bottom = Inches(0.2)

    if title:
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.bold = True
        p0.font.size = Pt(16)
        p0.font.color.rgb = title_color
        p0.font.name = "Arial"
        p0.space_after = Pt(8)
        start_idx = 0
    else:
        start_idx = 0

    for idx, item in enumerate(body_paragraphs):
        p = tf.add_paragraph() if (title or idx > 0) else tf.paragraphs[0]
        p.space_after = Pt(4)
        if isinstance(item, tuple):
            prefix, rest = item
            r1 = p.add_run()
            r1.text = prefix
            r1.font.bold = True
            r1.font.size = Pt(11)
            r1.font.color.rgb = HEX_DARK
            r1.font.name = "Arial"

            r2 = p.add_run()
            r2.text = rest
            r2.font.bold = False
            r2.font.size = Pt(11)
            r2.font.color.rgb = HEX_MUTED
            r2.font.name = "Arial"
        else:
            r = p.add_run()
            r.text = item
            r.font.bold = False
            r.font.size = Pt(11.5)
            r.font.color.rgb = HEX_MUTED
            r.font.name = "Arial"
    return card


def build_full_pitch_deck(pptx_path: Path):
    chev_png = generate_chevrons_png(ASSETS_DIR / "slide3_chevrons.png")
    time_png = generate_timeline_png(ASSETS_DIR / "slide5_timeline.png")

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def create_slide_with_canvas():
        s = prs.slides.add_slide(blank_layout)
        bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = HEX_CREAM
        bg.line.fill.background()
        return s

    # =========================================================================
    # SLIDE 1: USERS AND THE PROBLEM
    # =========================================================================
    s1 = create_slide_with_canvas()
    add_slide_header(s1, "Warranty & Subscription Wallet", "1. Users and the problem")

    # Headline
    tb = s1.shapes.add_textbox(Inches(0.4), Inches(1.6), Inches(12.5), Inches(0.5))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "People lose coverage and paid trials they already paid for."
    p.font.bold = True
    p.font.size = Pt(23)
    p.font.color.rgb = HEX_DARK

    # 3 Problem Cards
    col_w = Inches(3.95)
    gap = Inches(0.34)
    top_pos = Inches(2.25)
    card_h = Inches(2.1)

    add_card(s1, Inches(0.4), top_pos, col_w, card_h, "Lost receipts & records", [
        "Paper bills fade, emails get buried, and proof takes days to find when a product breaks or warranty service is needed."
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_CORAL)

    add_card(s1, Inches(0.4) + col_w + gap, top_pos, col_w, card_h, "Forgotten renewal dates", [
        "Consumers miss statutory warranty cutoffs and free-trial cancellation windows until recurring charges already hit their account."
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_CORAL)

    add_card(s1, Inches(0.4) + (col_w + gap) * 2, top_pos, col_w, card_h, "Confusing fine print", [
        "Unsure who to contact, what company policy clauses apply, or what proof to attach—so the majority of consumers simply give up."
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_CORAL)

    # Who are our users & One-sentence idea
    u_box = s1.shapes.add_textbox(Inches(0.4), Inches(4.55), Inches(12.5), Inches(2.4))
    utf = u_box.text_frame
    utf.word_wrap = True

    up1 = utf.paragraphs[0]
    up1.text = "Who are our users?"
    up1.font.bold = True
    up1.font.size = Pt(14)
    up1.font.color.rgb = HEX_DARK
    up1.space_after = Pt(2)

    up2 = utf.add_paragraph()
    up2.text = "Students, young adults, and households buying electronics and appliances who also manage multiple digital subscriptions and need effortless proof and protection."
    up2.font.size = Pt(12)
    up2.font.color.rgb = HEX_MUTED
    up2.space_after = Pt(12)

    ip1 = utf.add_paragraph()
    ip1.text = "Our idea in one sentence"
    ip1.font.bold = True
    ip1.font.size = Pt(14)
    ip1.font.color.rgb = HEX_DARK
    ip1.space_after = Pt(2)

    ip2 = utf.add_paragraph()
    ip2.text = "A unified mobile wallet that organizes your purchases and subscriptions, warns you before warranties or trials expire, and automates filing claims and cancellations in one tap."
    ip2.font.bold = True
    ip2.font.size = Pt(12.5)
    ip2.font.color.rgb = HEX_TEAL

    # =========================================================================
    # SLIDE 2: WHAT USERS TOLD US
    # =========================================================================
    s2 = create_slide_with_canvas()
    add_slide_header(s2, "What users told us", "2. Findings from 3 anonymous conversations")

    top_pos2 = Inches(1.65)
    card_h2 = Inches(3.6)

    # Person 1
    add_card(s2, Inches(0.4), top_pos2, col_w, card_h2, "Person 1", [
        ("INCIDENT\n", "Laptop screen fault"),
        ("WORKAROUND\n", "Searched old emails and bags"),
        ("DIFFICULTY\n", "Took days to find proof"),
        ("SURPRISE\n", "Did not know warranty end date"),
        ("Verdict: ", "Supports"),
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    # Person 2
    add_card(s2, Inches(0.4) + col_w + gap, top_pos2, col_w, card_h2, "Person 2", [
        ("INCIDENT\n", "Phone charger stopped"),
        ("WORKAROUND\n", "Kept a photo in the gallery"),
        ("DIFFICULTY\n", "Unsure how to make a claim"),
        ("SURPRISE\n", "Warranty had already expired"),
        ("Verdict: ", "Partly supports"),
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    # Person 3
    add_card(s2, Inches(0.4) + (col_w + gap) * 2, top_pos2, col_w, card_h2, "Person 3", [
        ("INCIDENT\n", "Washing machine repair"),
        ("WORKAROUND\n", "Paper bills in a drawer"),
        ("DIFFICULTY\n", "Faded bill, hard to read"),
        ("SURPRISE\n", "Wants reminders more than storage"),
        ("Verdict: ", "Supports"),
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    # Bottom Evidence Box
    add_card(s2, Inches(0.4), Inches(5.45), Inches(12.533), Inches(1.6), "Does the evidence support the idea? Mostly yes.", [
        "All three struggled with proof of purchase or timing. Person 2 mainly struggled with claiming, while Person 3 valued proactive reminders more than passive storage.",
        ("What we changed (MVP Focus):  ", "Reminders and guided claims come first. Our MVP pairs quick manual entry + receipt photo backup with a pre-filled brand policy database so faded bills never block a claim.")
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_DARK)

    # =========================================================================
    # SLIDE 3: OUR SOLUTION
    # =========================================================================
    s3 = create_slide_with_canvas()
    add_slide_header(s3, "Our solution", "3. Proposed solution and core user journey")

    # Chevrons Image
    s3.shapes.add_picture(str(chev_png), Inches(0.45), Inches(1.65), width=Inches(12.4))

    # Three Stages bar
    st_box = s3.shapes.add_textbox(Inches(0.4), Inches(4.35), Inches(12.5), Inches(0.4))
    st_tf = st_box.text_frame
    st_p = st_tf.paragraphs[0]
    st_r0 = st_p.add_run()
    st_r0.text = "Three stages:    "
    st_r0.font.bold = True
    st_r0.font.size = Pt(14)
    st_r0.font.color.rgb = HEX_DARK

    for label, col in [("CAPTURE  (log & photo)       ", HEX_DARK), ("PROTECT  (store & alert)       ", HEX_DARK), ("CLAIM & ACT  (draft & track)", HEX_DARK)]:
        r = st_p.add_run()
        r.text = label
        r.font.bold = True
        r.font.size = Pt(14)
        r.font.color.rgb = col

    # Bottom Journey Box
    add_card(s3, Inches(0.4), Inches(4.95), Inches(12.533), Inches(1.9), "", [
        ("Core User Journey:  ", "Buy a product or subscribe to a trial → log purchase details & save photo (warranty duration or trial policy auto-suggested from our brand database) → receive proactive alerts at 30, 7, and 1 day before expiry → product breaks or trial ends → send a ready claim or cancellation in one tap → track to resolution."),
        ("Unified Platform Advantage:  ", "The exact same Capture → Protect → Alert engine handles both physical product warranties and recurring digital subscriptions in one clean interface.")
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_DARK)

    # =========================================================================
    # SLIDE 4: THREE CORE FEATURES
    # =========================================================================
    s4 = create_slide_with_canvas()
    add_slide_header(s4, "Three core features", "4. What we build for MVP, and our future platform roadmap")

    top_pos4 = Inches(1.65)
    card_h4 = Inches(2.7)

    add_card(s4, Inches(0.4), top_pos4, col_w, card_h4, "1  Quick capture & vault", [
        ("MVP Approach: ", "Fast structured manual entry + receipt photo backup so faded bills and OCR errors never block testing."),
        ("Pre-Filled Defaults: ", "Pre-populated database of top brands and statutory warranty terms auto-suggests coverage (AI OCR added in Phase 2).")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    add_card(s4, Inches(0.4) + col_w + gap, top_pos4, col_w, card_h4, "2  Alerts and storage", [
        ("Centralized Vault: ", "Invoice photo, retailer terms, and product manual stored securely in one location."),
        ("Dual Expiry Engine: ", "Automated notifications at 30, 7, and 1 day before either warranty coverage or subscription trials expire.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    add_card(s4, Inches(0.4) + (col_w + gap) * 2, top_pos4, col_w, card_h4, "3  Claim & cancel generator", [
        ("One-Tap Drafting: ", "Generates ready-to-send claim packages with proof attached, formatted to the manufacturer's exact specifications."),
        ("Action Routing: ", "Provides verified direct contact links and 1-tap cancellation notices for recurring subscriptions.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    # Scope & Future Vision Box
    add_card(s4, Inches(0.4), Inches(4.55), Inches(12.533), Inches(2.5), "Out of scope for now & future platform vision", [
        ("Out of scope for MVP:  ", "Automated OCR receipt scanning (Phase 2)  |  Resale valuation  |  Retailer dashboard  |  Direct bank API integration  |  Marketplace listing"),
        ("Future platform vision:  ", "Promotional directory scraping (UNiDAYS-style student deals)  |  Ad-supported free student tier  |  White-label brand customization"),
        ("Rule:  ", "We hold our three core MVP features until they work end to end.")
    ], fill_color=HEX_PEACH, border_color=HEX_CORAL, title_color=HEX_CORAL)

    # =========================================================================
    # SLIDE 5: WHY US VS GENERAL AI? (STRATEGIC DEFENSIBILITY & DATA MOAT)
    # =========================================================================
    s5 = create_slide_with_canvas()
    add_slide_header(s5, "Strategic defensibility", "5. Why a dedicated platform when general AI already exists?")

    # Sub-headline
    tb5 = s5.shapes.add_textbox(Inches(0.4), Inches(1.58), Inches(12.5), Inches(0.45))
    tf5 = tb5.text_frame
    p5 = tf5.paragraphs[0]
    p5.text = "Why build this when AI can scan, draft, and answer questions?"
    p5.font.bold = True
    p5.font.size = Pt(21)
    p5.font.color.rgb = HEX_DARK

    card_h5 = Inches(3.6)
    top_pos5 = Inches(2.15)

    add_card(s5, Inches(0.4), top_pos5, col_w, card_h5, "The General AI Limitation", [
        ("Pre-Trained on Static Data: ", "LLMs are frozen in time and cannot reliably browse live company sites to confirm changing fine print."),
        ("Short Context & Memory: ", "Chatbots cannot digest 50-page complex warranty documents and remember every specific clause throughout a chat."),
        ("Hallucination Risk: ", "General models guess missing dates or policies, which can void a legal claim.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_CORAL)

    add_card(s5, Inches(0.4) + col_w + gap, top_pos5, col_w, card_h5, "We Are the AI's Resource", [
        ("The Missing Data Layer: ", "AI is only as good as its underlying ground truth. General AI cannot read what isn't structured."),
        ("Standardized Knowledge Base: ", "We parse, verify, and structure complex warranty terms and subscription rules into clean, AI-ready data."),
        ("Domain Authority: ", "Instead of competing with AI, we become the indispensable verified data layer that makes AI accurate.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    add_card(s5, Inches(0.4) + (col_w + gap) * 2, top_pos5, col_w, card_h5, "Purpose-Built Execution", [
        ("Execution vs. Conversation: ", "General AI chats about problems; our system executes solutions with verified proof attached."),
        ("Reliable Zero-Token Workflow: ", "By structuring brand policies in advance, users get instant, accurate claim packages without burning AI tokens."),
        ("Direct Action Routing: ", "Direct integration with company claims departments, statutory consumer rights, and cancellation workflows.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    # Bottom summary callout on Slide 5
    add_card(s5, Inches(0.4), Inches(5.9), Inches(12.533), Inches(1.2), "", [
        ("Defensibility Summary:  ", "General chatbots are conversational; Warranty Wallet is an authoritative, purpose-built execution engine backed by a proprietary, verified warranty and subscription knowledge graph.")
    ], fill_color=HEX_PEACH, border_color=HEX_TEAL, title_color=HEX_DARK)

    # =========================================================================
    # SLIDE 6: FEASIBILITY AND PLAN
    # =========================================================================
    s6 = create_slide_with_canvas()
    add_slide_header(s6, "Feasibility and plan", "6. Milestones, risks and support needed")

    # Timeline Image
    s6.shapes.add_picture(str(time_png), Inches(0.45), Inches(1.55), width=Inches(12.4))

    top_pos6 = Inches(2.65)
    card_h6 = Inches(4.35)

    add_card(s6, Inches(0.4), top_pos6, col_w, card_h6, "Top risks & fixes", [
        ("Faded receipts & OCR complexity: ", "Fix: Structured user input + photo backup for MVP; phase in AI OCR in Phase 2."),
        ("Missing warranty lengths on receipts: ", "Fix: Pre-populated brand warranty & promo database + statutory defaults."),
        ("Scope creep across features: ", "Fix: Hold the 3 core MVP features strictly until they work end to end.")
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    add_card(s6, Inches(0.4) + col_w + gap, top_pos6, col_w, card_h6, "Dependencies", [
        "- Wireframes completed before prototype build",
        "- Brand warranty & subscription database seeded before capture module",
        "- Data model established before alert and claim engines",
        "- Working end-to-end prototype ready before user testing and investor demo"
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    add_card(s6, Inches(0.4) + (col_w + gap) * 2, top_pos6, col_w, card_h6, "Support needed", [
        "- Advice on warranty data scraping and OCR tools",
        "- Help recruiting test users for prototype trials",
        "- Expert feedback on claim wording and legal templates",
        ("Next owners (to Session 4):", ""),
        "Board & link: Member A",
        "Wireframes: Member B",
        "Warranty DB & scraper research: Member C",
        "2 more interviews: Member D"
    ], fill_color=HEX_WHITE, border_color=HEX_TEAL, title_color=HEX_TEAL)

    prs.save(str(pptx_path))
    print(f"Saved 6-slide PPTX to {pptx_path}")


def upload_to_google_slides(pptx_path: Path, title: str):
    creds, project = google.auth.default()
    drive = build("drive", "v3", credentials=creds)

    media = MediaFileUpload(
        str(pptx_path),
        mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        resumable=True
    )

    file_metadata = {
        "name": title,
        "mimeType": "application/vnd.google-apps.presentation"
    }

    f = drive.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, name, webViewLink"
    ).execute()

    print(f"Successfully converted to Google Slides!")
    print(f"Presentation ID: {f['id']}")
    print(f"Google Slides Link: {f.get('webViewLink')}")
    return f


if __name__ == "__main__":
    out_pptx = WORKSPACE / "Warranty_Wallet_Pitch_Deck_GoogleSlides.pptx"
    build_full_pitch_deck(out_pptx)
    upload_to_google_slides(out_pptx, "Warranty & Subscription Wallet - Pitch Deck")
