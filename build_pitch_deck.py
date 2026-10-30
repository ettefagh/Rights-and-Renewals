from pathlib import Path
import pymupdf as fitz
import docx
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Inches, Pt, RGBColor

WORKSPACE = Path(r"c:\Users\admin\Documents\antigravity\optimistic-bardeen")
ASSETS_DIR = WORKSPACE / "pitch_assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Exact color palette from the original PDF pitch deck
HEX_TEAL = "507873"
HEX_CORAL = "D96B4B"
HEX_CREAM = "FDF7F2"
HEX_PEACH = "FCECE8"
HEX_WHITE = "FFFFFF"
HEX_DARK = "263232"
HEX_MUTED = "4A5A5A"

RGB_TEAL = RGBColor(0x50, 0x78, 0x73)
RGB_CORAL = RGBColor(0xD9, 0x6B, 0x4B)
RGB_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RGB_DARK = RGBColor(0x26, 0x32, 0x32)
RGB_MUTED = RGBColor(0x4A, 0x5A, 0x5A)


def generate_chevrons_png(out_path: Path) -> Path:
    """Draws the 4-stage chevron diagram (Capture -> Store -> Alert -> Claim) at high DPI using PyMuPDF vector shapes."""
    w, h = 1150, 195
    doc = fitz.open()
    page = doc.new_page(width=w, height=h)

    bg_shape = page.new_shape()
    bg_shape.draw_rect(fitz.Rect(0, 0, w, h))
    bg_shape.finish(fill=(253 / 255, 247 / 255, 242 / 255), color=None)
    bg_shape.commit()

    stages = [
        ("Capture", "Quick product input &\nreceipt photo saved\n(brand policy auto-filled)", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Store", "Invoice, warranty terms\nand manual saved\nsecurely in one vault", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Alert", "Reminders at 30, 7\nand 1 day before\ncoverage expires", (0x50 / 255, 0x78 / 255, 0x73 / 255)),
        ("Claim", "One-tap claim with\nproof attached, then\ntracked to resolution", (0xD9 / 255, 0x6B / 255, 0x4B / 255)),
    ]

    chev_w = 255
    chev_h = 104
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

        text_rect = fitz.Rect(x0 + tip, y0 + 32, x0 + chev_w - tip / 2, y1 - 18)
        page.insert_textbox(
            text_rect,
            title,
            fontsize=21,
            fontname="hebo",
            color=(1, 1, 1),
            align=fitz.TEXT_ALIGN_CENTER,
        )

        cap_rect = fitz.Rect(x0 + 6, y1 + 10, x0 + chev_w + 4, h - 2)
        page.insert_textbox(
            cap_rect,
            desc,
            fontsize=12.5,
            fontname="helv",
            color=(0x38 / 255, 0x48 / 255, 0x48 / 255),
            align=fitz.TEXT_ALIGN_LEFT,
        )

    pix = page.get_pixmap(dpi=240)
    pix.save(str(out_path))
    doc.close()
    return out_path


def generate_timeline_png(out_path: Path) -> Path:
    """Draws the S3-S10 horizontal milestone timeline matching the original deck style."""
    w, h = 1150, 96
    doc = fitz.open()
    page = doc.new_page(width=w, height=h)

    bg_shape = page.new_shape()
    bg_shape.draw_rect(fitz.Rect(0, 0, w, h))
    bg_shape.finish(fill=(253 / 255, 247 / 255, 242 / 255), color=None)
    bg_shape.commit()

    milestones = [
        ("S3", "Brief and pitch", True),
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


# XML Helpers for python-docx
def set_cell_shading(cell, hex_color: str) -> None:
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)


def set_cell_margins(cell, top=120, bottom=120, left=180, right=180) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_borders(cell, color=HEX_TEAL, sz="10", val="single") -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f"</w:tcBorders>"
    )
    tcPr.append(borders)


def clear_table_borders(table) -> None:
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>'
        f'<w:insideH w:val="none"/><w:insideV w:val="none"/>'
        f"</w:tblBorders>"
    )
    tblPr.append(borders)


def set_row_height(row, height_in: float, exact: bool = False) -> None:
    trPr = row._tr.get_or_add_trPr()
    trHeight = OxmlElement("w:trHeight")
    trHeight.set(qn("w:val"), str(int(height_in * 1440)))
    trHeight.set(qn("w:hRule"), "exact" if exact else "atLeast")
    trPr.append(trHeight)


def add_run(p, text: str, size_pt: float, bold: bool = False, color: RGBColor = RGB_DARK, font_name: str = "Arial"):
    r = p.add_run(text)
    r.bold = bold
    r.font.name = font_name
    r.font.size = Pt(size_pt)
    r.font.color.rgb = color
    return r


def add_slide_header(doc: Document, title: str, subtitle: str, is_first_slide: bool = False) -> None:
    if not is_first_slide:
        doc.add_page_break()

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    clear_table_borders(tbl)
    set_row_height(tbl.rows[0], 1.08)

    cell = tbl.cell(0, 0)
    cell.width = Inches(12.53)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_shading(cell, HEX_TEAL)
    set_cell_margins(cell, top=140, bottom=140, left=300, right=300)

    p1 = cell.paragraphs[0]
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(2)
    add_run(p1, title, size_pt=25, bold=True, color=RGB_WHITE)

    p2 = cell.add_paragraph()
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(0)
    add_run(p2, subtitle, size_pt=12, bold=False, color=RGB_WHITE)


def add_spacer(doc: Document, pt: float = 6) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(pt)
    p.paragraph_format.line_spacing = Pt(2)


def build_three_card_row(
    doc: Document,
    cards_data,
    card_height_in: float = 1.65,
    fill_hex: str = HEX_PEACH,
    border_hex: str = HEX_TEAL,
    title_color: RGBColor = RGB_CORAL,
):
    tbl = doc.add_table(rows=1, cols=5)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    clear_table_borders(tbl)
    set_row_height(tbl.rows[0], card_height_in)

    widths = [3.95, 0.34, 3.95, 0.34, 3.95]
    for c_idx, w_in in enumerate(widths):
        tbl.cell(0, c_idx).width = Inches(w_in)

    for idx, card in enumerate(cards_data):
        col_i = idx * 2
        cell = tbl.cell(0, col_i)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
        set_cell_shading(cell, fill_hex)
        set_cell_borders(cell, color=border_hex, sz="10")
        set_cell_margins(cell, top=140, bottom=140, left=190, right=190)

        p_title = cell.paragraphs[0]
        p_title.paragraph_format.space_before = Pt(0)
        p_title.paragraph_format.space_after = Pt(7)
        add_run(p_title, card["title"], size_pt=15, bold=True, color=title_color)

        for b_idx, line in enumerate(card.get("lines", [])):
            p_line = cell.add_paragraph()
            p_line.paragraph_format.space_before = Pt(0)
            p_line.paragraph_format.space_after = Pt(4 if b_idx < len(card["lines"]) - 1 else 0)
            p_line.paragraph_format.line_spacing = 1.15
            if isinstance(line, tuple):
                lbl, val = line
                add_run(p_line, lbl, size_pt=10.5, bold=True, color=RGB_DARK)
                add_run(p_line, val, size_pt=10.5, bold=False, color=RGB_MUTED)
            else:
                add_run(p_line, line, size_pt=11, bold=False, color=RGB_MUTED)
    return tbl


def build_full_width_box(doc: Document, fill_hex: str, border_hex: str, height_in: float = 1.05):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    clear_table_borders(tbl)
    set_row_height(tbl.rows[0], height_in)
    cell = tbl.cell(0, 0)
    cell.width = Inches(12.53)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_shading(cell, fill_hex)
    set_cell_borders(cell, color=border_hex, sz="10")
    set_cell_margins(cell, top=120, bottom=120, left=200, right=200)
    return cell


def attach_full_bleed_cream_header(sec) -> None:
    """Adds a full-bleed 13.333in x 7.5in VML rectangle in the section header so Word renders #FDF7F2 across the entire 16:9 canvas."""
    hdr = sec.header
    hp = hdr.paragraphs[0]
    hp.paragraph_format.space_before = Pt(0)
    hp.paragraph_format.space_after = Pt(0)
    vml_xml = (
        f'<w:pict {nsdecls("w")} xmlns:v="urn:schemas-microsoft-com:vml" '
        f'xmlns:o="urn:schemas-microsoft-com:office:office">'
        f'<v:rect style="position:absolute;left:0pt;top:0pt;width:960pt;height:540pt;'
        f'z-index:-251658240;mso-position-horizontal-relative:page;mso-position-vertical-relative:page" '
        f'fillcolor="#{HEX_CREAM}" stroked="f"/>'
        f'</w:pict>'
    )
    hp.add_run()._r.append(parse_xml(vml_xml))


def build_pitch_docx(out_docx: Path) -> None:
    chev_png = generate_chevrons_png(ASSETS_DIR / "slide3_chevrons.png")
    time_png = generate_timeline_png(ASSETS_DIR / "slide5_timeline.png")

    doc = Document()

    # Configure Widescreen 16:9 Landscape Slide Geometry (13.333 in x 7.5 in)
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width = Inches(13.333)
    sec.page_height = Inches(7.5)
    sec.top_margin = Inches(0.28)
    sec.bottom_margin = Inches(0.28)
    sec.left_margin = Inches(0.40)
    sec.right_margin = Inches(0.40)
    sec.header_distance = Inches(0.0)
    sec.footer_distance = Inches(0.0)

    attach_full_bleed_cream_header(sec)

    # =========================================================================
    # SLIDE 1: USERS AND THE PROBLEM
    # =========================================================================
    add_slide_header(doc, "Warranty Wallet", "1. Users and the problem", is_first_slide=True)
    add_spacer(doc, 8)

    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.left_indent = Inches(0.1)
    p_h1.paragraph_format.space_before = Pt(2)
    p_h1.paragraph_format.space_after = Pt(12)
    add_run(p_h1, "People lose coverage they already paid for.", size_pt=24, bold=True, color=RGB_DARK)

    build_three_card_row(
        doc,
        [
            {
                "title": "Lost receipts",
                "lines": [
                    "Paper bills fade, emails get buried, and proof takes days to find when a product breaks."
                ],
            },
            {
                "title": "Forgotten dates",
                "lines": [
                    "People do not know when a warranty or promotional coverage period ends, or that it already expired."
                ],
            },
            {
                "title": "Confusing claims",
                "lines": [
                    "Unsure who to contact, what company warranty policy applies, or what to send, so many give up."
                ],
            },
        ],
        card_height_in=1.70,
        fill_hex=HEX_PEACH,
        border_hex=HEX_TEAL,
        title_color=RGB_CORAL,
    )

    add_spacer(doc, 12)

    p_u_title = doc.add_paragraph()
    p_u_title.paragraph_format.left_indent = Inches(0.1)
    p_u_title.paragraph_format.space_before = Pt(2)
    p_u_title.paragraph_format.space_after = Pt(3)
    add_run(p_u_title, "Who are our users?", size_pt=14, bold=True, color=RGB_DARK)

    p_u_body = doc.add_paragraph()
    p_u_body.paragraph_format.left_indent = Inches(0.1)
    p_u_body.paragraph_format.space_before = Pt(0)
    p_u_body.paragraph_format.space_after = Pt(12)
    add_run(
        p_u_body,
        "Students, young adults, and households who buy phones, laptops, and appliances (and manage recurring subscriptions) and have to find proof of purchase when something breaks.",
        size_pt=12,
        color=RGB_MUTED,
    )

    p_idea_title = doc.add_paragraph()
    p_idea_title.paragraph_format.left_indent = Inches(0.1)
    p_idea_title.paragraph_format.space_before = Pt(2)
    p_idea_title.paragraph_format.space_after = Pt(3)
    add_run(p_idea_title, "Our idea in one sentence", size_pt=14, bold=True, color=RGB_DARK)

    p_idea_body = doc.add_paragraph()
    p_idea_body.paragraph_format.left_indent = Inches(0.1)
    p_idea_body.paragraph_format.space_before = Pt(0)
    p_idea_body.paragraph_format.space_after = Pt(0)
    add_run(
        p_idea_body,
        "A mobile app that organizes your purchases and receipts, warns you before warranties expire, and automates filing and tracking claims.",
        size_pt=12,
        bold=False,
        color=RGB_MUTED,
    )

    # =========================================================================
    # SLIDE 2: WHAT USERS TOLD US
    # =========================================================================
    add_slide_header(doc, "What users told us", "2. Findings from 3 anonymous conversations")
    add_spacer(doc, 6)

    tbl_s2 = doc.add_table(rows=1, cols=5)
    tbl_s2.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_s2.autofit = False
    clear_table_borders(tbl_s2)
    set_row_height(tbl_s2.rows[0], 3.0)
    for c_idx, w_in in enumerate([3.95, 0.34, 3.95, 0.34, 3.95]):
        tbl_s2.cell(0, c_idx).width = Inches(w_in)

    personas = [
        {
            "name": "Person 1",
            "incident": "Laptop screen fault",
            "workaround": "Searched old emails and bags",
            "difficulty": "Took days to find proof",
            "surprise": "Did not know warranty end date",
            "verdict": "Verdict: Supports",
        },
        {
            "name": "Person 2",
            "incident": "Phone charger stopped",
            "workaround": "Kept a photo in the gallery",
            "difficulty": "Unsure how to make a claim",
            "surprise": "Warranty had already expired",
            "verdict": "Verdict: Partly supports",
        },
        {
            "name": "Person 3",
            "incident": "Washing machine repair",
            "workaround": "Paper bills in a drawer",
            "difficulty": "Faded bill, hard to read",
            "surprise": "Wants reminders more than storage",
            "verdict": "Verdict: Supports",
        },
    ]

    for idx, pdata in enumerate(personas):
        cell = tbl_s2.cell(0, idx * 2)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
        set_cell_shading(cell, HEX_WHITE)
        set_cell_borders(cell, color=HEX_TEAL, sz="10")
        set_cell_margins(cell, top=110, bottom=110, left=170, right=170)

        p_name = cell.paragraphs[0]
        p_name.paragraph_format.space_after = Pt(4)
        add_run(p_name, pdata["name"], size_pt=14.5, bold=True, color=RGB_TEAL)

        for label, val in [
            ("INCIDENT", pdata["incident"]),
            ("WORKAROUND", pdata["workaround"]),
            ("DIFFICULTY", pdata["difficulty"]),
            ("SURPRISE", pdata["surprise"]),
        ]:
            pl = cell.add_paragraph()
            pl.paragraph_format.space_before = Pt(1)
            pl.paragraph_format.space_after = Pt(0)
            add_run(pl, label, size_pt=8, bold=True, color=RGB_CORAL)

            pv = cell.add_paragraph()
            pv.paragraph_format.space_before = Pt(0)
            pv.paragraph_format.space_after = Pt(3)
            add_run(pv, val, size_pt=10.5, bold=False, color=RGB_DARK)

        p_verd = cell.add_paragraph()
        p_verd.paragraph_format.space_before = Pt(4)
        p_verd.paragraph_format.space_after = Pt(0)
        add_run(p_verd, pdata["verdict"], size_pt=11, bold=True, color=RGB_DARK)

    add_spacer(doc, 6)

    box_s2 = build_full_width_box(doc, fill_hex=HEX_PEACH, border_hex=HEX_TEAL, height_in=1.10)
    p_ev1 = box_s2.paragraphs[0]
    p_ev1.paragraph_format.space_after = Pt(2)
    add_run(p_ev1, "Does the evidence support the idea? Mostly yes.", size_pt=12.5, bold=True, color=RGB_DARK)

    p_ev2 = box_s2.add_paragraph()
    p_ev2.paragraph_format.space_after = Pt(3)
    add_run(
        p_ev2,
        "All three struggled with proof of purchase or warranty timing. Person 2 mainly struggled with claiming, while Person 3 valued reminders more than storage.",
        size_pt=10.5,
        color=RGB_MUTED,
    )

    p_ev3 = box_s2.add_paragraph()
    p_ev3.paragraph_format.space_after = Pt(0)
    add_run(p_ev3, "What we changed:  ", size_pt=10.5, bold=True, color=RGB_CORAL)
    add_run(
        p_ev3,
        "Reminders and guided claims now come first in the journey, and our MVP uses fast structured input + receipt photo backup with pre-populated brand warranty defaults so faded bills never block a claim.",
        size_pt=10.5,
        bold=False,
        color=RGB_DARK,
    )

    # =========================================================================
    # SLIDE 3: OUR SOLUTION
    # =========================================================================
    add_slide_header(doc, "Our solution", "3. Proposed solution and core user journey")
    add_spacer(doc, 10)

    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img3.paragraph_format.space_before = Pt(2)
    p_img3.paragraph_format.space_after = Pt(10)
    p_img3.add_run().add_picture(str(chev_png), width=Inches(12.4))

    p_st = doc.add_paragraph()
    p_st.paragraph_format.left_indent = Inches(0.1)
    p_st.paragraph_format.space_before = Pt(4)
    p_st.paragraph_format.space_after = Pt(10)
    add_run(p_st, "Three stages:    ", size_pt=13.5, bold=True, color=RGB_DARK)
    add_run(p_st, "CAPTURE  (log & photo)       ", size_pt=13.5, bold=True, color=RGB_DARK)
    add_run(p_st, "PROTECT  (store and alert)       ", size_pt=13.5, bold=True, color=RGB_DARK)
    add_run(p_st, "CLAIM  (draft and track)", size_pt=13.5, bold=True, color=RGB_DARK)

    box_s3 = build_full_width_box(doc, fill_hex=HEX_PEACH, border_hex=HEX_TEAL, height_in=0.95)
    p_j1 = box_s3.paragraphs[0]
    p_j1.paragraph_format.space_after = Pt(0)
    add_run(
        p_j1,
        "Journey: buy a product, log purchase details & save receipt photo (warranty length auto-suggested from our brand database), get warned before expiry, product breaks, send a ready claim, follow it to resolution.",
        size_pt=11.5,
        color=RGB_MUTED,
    )

    # =========================================================================
    # SLIDE 4: THREE CORE FEATURES
    # =========================================================================
    add_slide_header(doc, "Three core features", "4. What we build, and what we do not")
    add_spacer(doc, 8)

    build_three_card_row(
        doc,
        [
            {
                "title": "1  Quick capture & vault",
                "lines": [
                    "Fast user input + receipt photo backup for a reliable MVP, paired with a pre-populated brand warranty database (OCR scanning added in Phase 2)."
                ],
            },
            {
                "title": "2  Alerts and storage",
                "lines": [
                    "Invoice photo, warranty terms, and manual stored securely. Proactive reminders at 30, 7, and 1 day before expiry."
                ],
            },
            {
                "title": "3  Claim generator",
                "lines": [
                    "One tap drafts a claim message with proof attached, matches company warranty requirements, and tracks status to resolution."
                ],
            },
        ],
        card_height_in=2.35,
        fill_hex=HEX_WHITE,
        border_hex=HEX_TEAL,
        title_color=RGB_TEAL,
    )

    add_spacer(doc, 8)

    box_s4 = build_full_width_box(doc, fill_hex=HEX_PEACH, border_hex=HEX_CORAL, height_in=1.55)
    p_s4_1 = box_s4.paragraphs[0]
    p_s4_1.paragraph_format.space_after = Pt(4)
    add_run(p_s4_1, "Out of scope for now & future vision", size_pt=13.5, bold=True, color=RGB_CORAL)

    p_s4_2 = box_s4.add_paragraph()
    p_s4_2.paragraph_format.space_after = Pt(3)
    add_run(p_s4_2, "Out of scope for MVP:  ", size_pt=10.5, bold=True, color=RGB_DARK)
    add_run(
        p_s4_2,
        "Automated OCR receipt scanning (Phase 2)  |  Resale valuation  |  Retailer dashboard  |  Bank or email integration  |  Marketplace listing",
        size_pt=10.5,
        color=RGB_MUTED,
    )

    p_s4_3 = box_s4.add_paragraph()
    p_s4_3.paragraph_format.space_after = Pt(4)
    add_run(p_s4_3, "Future platform vision:  ", size_pt=10.5, bold=True, color=RGB_TEAL)
    add_run(
        p_s4_3,
        "Subscription & student promo tracking (seeded via promotional directory scraping)  |  Ad-supported free student tier  |  White-label brand customization",
        size_pt=10.5,
        color=RGB_DARK,
    )

    p_s4_4 = box_s4.add_paragraph()
    p_s4_4.paragraph_format.space_after = Pt(0)
    add_run(
        p_s4_4,
        "Rule: we hold these three core MVP features until they work end to end.",
        size_pt=10.5,
        bold=True,
        color=RGB_DARK,
    )

    # =========================================================================
    # SLIDE 5: FEASIBILITY AND PLAN
    # =========================================================================
    add_slide_header(doc, "Feasibility and plan", "5. Milestones, risks and support needed")
    add_spacer(doc, 4)

    p_img5 = doc.add_paragraph()
    p_img5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img5.paragraph_format.space_before = Pt(2)
    p_img5.paragraph_format.space_after = Pt(6)
    p_img5.add_run().add_picture(str(time_png), width=Inches(12.4))

    build_three_card_row(
        doc,
        [
            {
                "title": "Top risks",
                "lines": [
                    ("Faded receipts / OCR complexity: ", "Fix: structured user input + photo backup for MVP; add OCR in Phase 2"),
                    ("No warranty length on receipt: ", "Fix: scraped brand warranty database + defaults by product type"),
                    ("Scope creep: ", "Fix: hold the 3 core MVP features before expanding to subscriptions"),
                ],
            },
            {
                "title": "Dependencies",
                "lines": [
                    "- Wireframes before prototype",
                    "- Brand warranty & promo database seeded before capture module",
                    "- Data model before alerts and claims",
                    "- Working end-to-end prototype before user tests & investor demo",
                ],
            },
            {
                "title": "Support needed",
                "lines": [
                    "- Advice on warranty data scraping & OCR tools",
                    "- Help finding test users",
                    "- Feedback on claim wording",
                    ("Next owners (to Session 4):", ""),
                    "Board and link: Member A",
                    "Wireframes: Member B",
                    "Warranty DB & scraper research: Member C",
                    "2 more interviews: Member D",
                ],
            },
        ],
        card_height_in=3.25,
        fill_hex=HEX_WHITE,
        border_hex=HEX_TEAL,
        title_color=RGB_TEAL,
    )

    doc.save(str(out_docx))
    print(f"Saved rebuilt pitch docx to {out_docx}")


if __name__ == "__main__":
    out_file = WORKSPACE / "Warranty_Wallet_Pitch_Deck_Rebuilt.docx"
    build_pitch_docx(out_file)
