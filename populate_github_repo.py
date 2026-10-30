"""
Script to populate the existing GitHub repository `ettefagh/CM-LAB` with:
1. Repository description & topics
2. 25 structured GitHub Labels (5-Column Kanban statuses, MoSCoW priorities, Story Points, Team Roles, Issue Types)
3. All 10 Course Milestones (S1 to S10, with S1-S4 closed as completed and S5-S10 open with syllabus due dates)
4. All 30 comprehensive GitHub Issues covering every detail from WORKSHOP_CANVAS_TEAM_8.md and WORKSHOP_BOARD_RECOMMENDATIONS.md
"""

import json
import subprocess
import sys

REPO = "ettefagh/CM-LAB"

def run_gh_api(endpoint, method="POST", payload=None):
    cmd = ["gh", "api", "-X", method, endpoint]
    if payload is not None:
        cmd.extend(["--input", "-"])
        proc = subprocess.run(
            cmd,
            input=json.dumps(payload).encode("utf-8"),
            capture_output=True
        )
    else:
        proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace")
        print(f"[WARN] API {method} {endpoint} returned {proc.returncode}: {err.strip()}")
        return None
    out = proc.stdout.decode("utf-8", errors="replace").strip()
    return json.loads(out) if out else {}

def setup_repo_metadata():
    print("=== 1. Updating Repository Metadata ===")
    run_gh_api(f"repos/{REPO}", method="PATCH", payload={
        "description": "Team 8 — Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled) | SRH University Computer & Media Lab (WiSe 2026)",
        "has_issues": True,
        "has_projects": True,
        "has_wiki": True
    })
    run_gh_api(f"repos/{REPO}/topics", method="PUT", payload={
        "names": [
            "srh-university",
            "computer-and-media-lab",
            "warranty-wallet",
            "subscription-tracker",
            "model-context-protocol",
            "mcp-server",
            "consumer-protection",
            "german-tax-werbungskosten",
            "team-8"
        ]
    })

def setup_labels():
    print("=== 2. Configuring GitHub Labels ===")
    labels = [
        # 5-Column Kanban Board Status Labels
        ("column: 1-backlog", "ECEFF1", "Kanban Column 1: Product & Sprint Backlog"),
        ("column: 2-ready-sprint-1", "BBDEFB", "Kanban Column 2: Ready / Next (Sprint 1 Committed)"),
        ("column: 3-in-progress", "FFF9C4", "Kanban Column 3: In Progress (WIP limit <= 2 per member)"),
        ("column: 4-in-review-qa", "E1BEE7", "Kanban Column 4: In Review / QA & DoD Verification"),
        ("column: 5-done", "C8E6C9", "Kanban Column 5: Done (100% DoD verified)"),
        # MoSCoW Priority Labels
        ("priority: must-have", "2F524C", "MoSCoW: Must-Have (Core Session 5 MVP)"),
        ("priority: should-have", "2563EB", "MoSCoW: Should-Have (Session 6 Expansion)"),
        ("priority: could-have", "7C3AED", "MoSCoW: Could-Have (Session 7 Enhancement)"),
        ("priority: wont-have-mvp", "6B7280", "MoSCoW: Won't-Have in MVP (Deferred to Phase 2)"),
        # Story Points
        ("sp: 3", "0E8A16", "Effort Estimate: 3 Story Points (~10h)"),
        ("sp: 5", "1D76DB", "Effort Estimate: 5 Story Points (~16-18h)"),
        ("sp: 8", "5319E7", "Effort Estimate: 8 Story Points (Consolidated Alert Epic)"),
        ("sp: 10", "B60205", "Effort Estimate: 10 Story Points (Consolidated Capture & Vault Epic)"),
        ("sp: 13", "D93F0B", "Effort Estimate: 13 Story Points (~45h Post-MVP Spike)"),
        # Team Roles
        ("owner: member-a-pm-qa", "FBCA04", "Owner: Member A (Project Manager & QA Lead)"),
        ("owner: member-b-ux-ui", "D96B4B", "Owner: Member B (UX/UI & Frontend Design Lead)"),
        ("owner: member-c-policy-legal", "006B75", "Owner: Member C (Product Strategy, Policy Wiki & Legal/Tax)"),
        ("owner: member-d-dev-lead", "507873", "Owner: Member D (Full-Stack Dev & Quality/Media Lead)"),
        # Issue Types
        ("type: panel-a-core-story", "0052CC", "Workshop Canvas Panel A: Consolidated Core User Story (US1-US3)"),
        ("type: backlog-user-story", "2F524C", "Workshop Board Block 2: Granular MoSCoW Backlog Story (US-01 to US-09)"),
        ("type: risk-register", "DC2626", "Workshop Board Block 3: Prioritized Project Risk & Mitigation (R-1 to R-5)"),
        ("type: session-5-deliverable", "D96B4B", "Workshop Board Block 4: Immediate Active Session 5 Gate Deliverable"),
        ("type: peer-lab-iteration", "8B5CF6", "Workshop Canvas Panel C: Paper Prototype & Team 7 Peer Lab Iteration"),
        ("type: user-walkthrough", "059669", "Workshop Canvas Panel D: External Target-User Walkthrough Protocol"),
        ("type: decision-log-adr", "D97706", "Workshop Canvas Panel D: Evidence-Backed Design Decision (Causal Syntax)"),
        ("type: governance-dod", "1E293B", "Project Governance, Role Capacity & Definition of Done")
    ]
    existing = run_gh_api(f"repos/{REPO}/labels?per_page=100", method="GET") or []
    existing_names = {lbl["name"] for lbl in existing}
    for name, color, desc in labels:
        if name in existing_names:
            run_gh_api(f"repos/{REPO}/labels/{name.replace(' ', '%20').replace(':', '%3A')}", method="PATCH", payload={
                "new_name": name,
                "color": color,
                "description": desc
            })
        else:
            run_gh_api(f"repos/{REPO}/labels", method="POST", payload={
                "name": name,
                "color": color,
                "description": desc
            })
    print(f"Configured {len(labels)} labels.")

def setup_milestones():
    print("=== 3. Configuring Course Milestones (S1-S10) ===")
    milestones_spec = [
        ("S1: Team Agreement & Role Mapping", "closed", "2026-10-03T18:00:00Z",
         "Session 1 (Completed): Team charter, Slide 28 cross-functional 4-role mapping (Members A, B, C, D), and initial domain definition."),
        ("S2: Problem Framing & User Discovery", "closed", "2026-10-10T18:00:00Z",
         "Session 2 (Completed): Empirical user discovery interviews (Persons 1–4: Laptop defect at 14m, Phone charger RMA paralysis, Washing machine faded thermal bill, Working student German tax Werbungskosten) and idea tournament selection."),
        ("S3: Investor Pitch Deck v1 & Technical Benchmarking", "closed", "2026-10-17T18:00:00Z",
         "Session 3 (Completed): 6 widescreen investor pitch slides, thermal receipt OCR failure benchmarking (42% failure rate), and strategic pivot to manual-first <15s entry."),
        ("S4: Wireframes, Paper Prototype & Peer Lab (Team 7)", "closed", "2026-10-24T18:00:00Z",
         "Session 4 (Completed): 6 paper prototype views, two 15-minute peer testing rounds with Team 7 (reducing entry time from 38.0s to 11.4s unaided), and visual design sign-off."),
        ("S5: MVP Scope Lock & Working Core User Journey (ACTIVE)", "open", "2026-10-31T18:00:00Z",
         "Session 5 (Active Gate): Functional end-to-end core user journey (Capture -> Store -> Alert -> Act) across 4–6 meaningful views and 2 purposeful media formats (encrypted receipt photo vault + 1-tap statutory claim/cancellation PDF/text dossier), Policy Wiki v1 seed, MCP JSON-RPC 2.0 spec, and German tax research brief."),
        ("S6: External Usability Testing & Should-Have Expansion", "open", "2026-11-14T18:00:00Z",
         "Session 6: Structured usability testing with >= 3 external university students; implementation of Should-Have stories (US-06 Curated Policy Wiki & US-07 Open MCP Server JSON-RPC 2.0 endpoints)."),
        ("S7: Mid-Sprint Iteration & German Tax Export", "open", "2026-11-28T18:00:00Z",
         "Session 7: High-priority usability refinements from Session 6 testing; expansion of Policy Wiki to top 20 student brands; implementation of Could-Have Story US-08 (German Tax Werbungskosten CSV/PDF export under § 9 EStG & BMF 2022)."),
        ("S8: Release Candidate & Feature Freeze", "open", "2026-12-12T18:00:00Z",
         "Session 8: Code freeze across all core modules; zero severity-1 bugs; end-to-end integration of consumer wallet PWA and MCP server; live demo rehearsal."),
        ("S9: Portfolio Compilation & Final Submission", "open", "2027-01-09T18:00:00Z",
         "Session 9: Final code repository freeze with automated test suite (>= 75% coverage); submission of complete project portfolio, architectural docs, and user testing report."),
        ("S10: Final Viva Examination", "open", "2027-01-16T18:00:00Z",
         "Session 10: Official 25-minute viva examination with Prof. Franziska Schwarz (10m problem & strategy presentation, 5m live end-to-end core journey demo, 10m individual Q&A defense across Members A–D).")
    ]
    existing = run_gh_api(f"repos/{REPO}/milestones?state=all&per_page=100", method="GET") or []
    milestone_map = {m["title"]: m["number"] for m in existing}
    for title, state, due_on, desc in milestones_spec:
        if title not in milestone_map:
            res = run_gh_api(f"repos/{REPO}/milestones", method="POST", payload={
                "title": title,
                "state": state,
                "due_on": due_on,
                "description": desc
            })
            if res and "number" in res:
                milestone_map[title] = res["number"]
        else:
            num = milestone_map[title]
            run_gh_api(f"repos/{REPO}/milestones/{num}", method="PATCH", payload={
                "title": title,
                "state": state,
                "due_on": due_on,
                "description": desc
            })
    print(f"Configured {len(milestone_map)} milestones.")
    return milestone_map

def setup_issues(m_map):
    print("=== 4. Creating Comprehensive Project Issues ===")
    s4 = m_map.get("S4: Wireframes, Paper Prototype & Peer Lab (Team 7)")
    s5 = m_map.get("S5: MVP Scope Lock & Working Core User Journey (ACTIVE)")
    s6 = m_map.get("S6: External Usability Testing & Should-Have Expansion")
    s7 = m_map.get("S7: Mid-Sprint Iteration & German Tax Export")
    s8 = m_map.get("S8: Release Candidate & Feature Freeze")

    issues = [
        # --- PANEL A: 3 CONSOLIDATED CORE USER STORIES (US1, US2, US3) ---
        {
            "title": "[Panel A Core Story US1] Rapid Manual Capture & Receipt Attachment Vault (Capture & Store · 10 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: panel-a-core-story", "priority: must-have", "sp: 10", "owner: member-b-ux-ui", "owner: member-d-dev-lead", "column: 3-in-progress"],
            "body": """## Panel A: Requirements Clinic — Story US1 (Capture & Store)
**Consolidated Backlog Mapping:** Combines Backlog Story 1 (`US-01`, 5 SP / 16h, Member B) & Backlog Story 2 (`US-02`, 5 SP / 16h, Member D) = **10 SP (32h)**.

### User Story Narrative
> **As a** tech-active university student or working student (*Werkstudentin*),  
> **I want** to manually log a hardware purchase or recurring subscription in under 15 seconds using pre-seeded brand autocomplete defaults and attach a compressed photo of my receipt with a German tax-deductible (*Werbungskosten*) flag,  
> **so that** my proof of purchase is preserved offline with cryptographic integrity before thermal ink fades, without being blocked by fragile OCR scanning.

### Testable Acceptance Criteria (Gherkin)
* **AC1 (Sub-15s Manual Entry, Brand Autocomplete & Tax Flagging):**
  * **Given** the user taps `+ Add Item` on View 1 to open the Quick Capture Modal (View 2),
  * **When** the user types `>= 3` characters matching a pre-seeded brand (e.g., `"Son"` -> `"Sony WH-1000XM4"` or `"Spo"` -> `"Spotify Student"`), selects the purchase date, and toggles `Tax-Relevant / Werbungskosten`,
  * **Then** the app auto-fills Category (`Hardware` / `Subscription`), sets the statutory 24-month warranty (`BGB § 438`) or monthly renewal cycle, assigns `taxCategory: "Arbeitsmittel"` (`§ 9 EStG` / BMF Guidance 22.02.2022 1-year *Sofortabschreibung*), and persists the record in `<200ms` with total interaction time `<15 seconds`.
* **AC2 (Offline Receipt Photo Vault, Client Compression & SHA-256 Hashing):**
  * **Given** the user taps `Attach Receipt Photo` in View 2 or View 3,
  * **When** the user captures a camera photo or selects an image/PDF from the device gallery (with automatic HTML5 `<input type="file" accept="image/*" capture="environment">` fallback if WebRTC camera permissions are denied),
  * **Then** the client-side media processor downsamples and compresses the image to `<1.5MB` (max `2048px`), computes a client-side `SHA-256` hash (`GoBD Rn. 108–110` immutability), renders a preview thumbnail in `<500ms`, and supports offline pinch-to-zoom inspection with zero OCR blocking.

### Observable Evidence
1. **Stopwatch Benchmark:** Peer lab Round 2 testing with Team 7 verified unaided manual entry completion in **11.4 seconds** (`<15s` target).
2. **Storage & Hash Inspection:** DevTools IndexedDB / SQLite inspector confirms blob size `<1.5MB`, valid 64-char hex `receiptSha256`, and `isTaxDeductible: true` persistence across app restarts in airplane mode."""
        },
        {
            "title": "[Panel A Core Story US2] Proactive Dual Expiry & Auto-Renewal Alert Engine (Alert · 8 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: panel-a-core-story", "priority: must-have", "sp: 8", "owner: member-d-dev-lead", "owner: member-b-ux-ui", "column: 3-in-progress"],
            "body": """## Panel A: Requirements Clinic — Story US2 (Monitor & Alert)
**Consolidated Backlog Mapping:** Combines Backlog Story 3 (`US-03`, 5 SP / 16h, Member D) & Backlog Story 4 (`US-04`, 3 SP / 10h, Member B) = **8 SP (26h)**.

### User Story Narrative
> **As a** busy student managing both electronics and 5–12 recurring subscriptions,  
> **I want** a unified chronological dashboard with color-coded urgency badges and deterministic push alerts at 30, 7, and 1 day before warranty expiration or subscription renewal cutoffs,  
> **so that** I can inspect devices before coverage lapses and cancel unwanted contracts before auto-renewal lock-in.

### Testable Acceptance Criteria (Gherkin)
* **AC1 (Unified Chronological Timeline & Color-Coded Urgency Badges):**
  * **Given** multiple hardware items and subscriptions are stored in the wallet,
  * **When** the user views the Unified Wallet Dashboard (View 1),
  * **Then** all records are sorted chronologically by nearest deadline and rendered with WCAG 2.1 AA compliant (`>= 4.5:1` contrast) urgency pills: **Red (`Urgent`, `<= 7d`)**, **Amber (`Expiring Soon`, `8–30d`)**, **Green (`Protected`, `> 30d`)**, and **Grey (`Expired`, `0d`)**, with instant `<50ms` category/search filtering.
* **AC2 (Deterministic 30/7/1-Day Push Alerts, Deep-Linking & DST Recalibration):**
  * **Given** an active item with a recorded expiration or cancellation cutoff date,
  * **When** the system clock reaches `T-30d`, `T-7d`, and `T-1d` at `09:00 AM` local wall-clock time (dynamically recalibrated across CEST/CET Daylight Saving Time transitions),
  * **Then** the scheduler dispatches a local notification that deep-links directly into the Item Detail (View 3) or Action Generator (View 4), and automatically renders an in-app urgency banner if OS push permissions are disabled.

### Observable Evidence
1. **Simulated Clock Test Suite:** Automated Vitest suite confirms deterministic firing at `T-30d`, `T-7d`, and `T-1d` at `09:00:00` local time with zero `+-1h` DST drift.
2. **UI Contrast & Filter Audit:** Lighthouse / axe-core audit verifies `>= 4.5:1` badge contrast and `>= 48x48px` touch targets across `375px–412px` mobile viewports."""
        },
        {
            "title": "[Panel A Core Story US3] 1-Tap Statutory Claim & Cancellation Action Generator (Claim / Act · 5 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: panel-a-core-story", "priority: must-have", "sp: 5", "owner: member-d-dev-lead", "owner: member-c-policy-legal", "column: 2-ready-sprint-1"],
            "body": """## Panel A: Requirements Clinic — Story US3 (Claim / Act)
**Consolidated Backlog Mapping:** Maps directly to Backlog Story 5 (`US-05`, 5 SP / 18h: Member D 10h + Member C 8h).

### User Story Narrative
> **As a** consumer facing a hardware defect or unwanted subscription renewal,  
> **I want** to generate a legally grounded statutory warranty claim (*Mängelrüge*) or subscription termination notice (*Kündigungsschreiben*) with my attached receipt proof in one tap,  
> **so that** I overcome corporate action paralysis and enforce my German/EU consumer rights without legal expertise.

### Testable Acceptance Criteria (Gherkin)
* **AC1 (1-Tap Statutory Hardware Claim & Subscription Cancellation Drafting):**
  * **Given** an active hardware item or subscription in View 3 / View 4,
  * **When** the user enters a 1-sentence defect description (or selects `Cancel Subscription`) and taps `Create Dossier`,
  * **Then** the app deterministically compiles a formal PDF and plain-text notice citing **BGB §§ 437, 439** (supplementary performance / *Nacherfüllung*), **§ 477 Abs. 1 BGB** (12-month reversed burden of proof / *Beweislastumkehr*), and **§ 475e Abs. 1 BGB** (4-month suspension of expiry / *Ablaufhemmung*) for hardware—or **BGB § 309 Nr. 9** and **§ 312k Abs. 6 BGB** (immediate termination without notice if compliant *Kündigungsbutton* is absent) for subscriptions—embedding the receipt thumbnail, item metadata, and mandatory **BGH VIII ZR 285/18 / §§ 2, 3 RDG** legal tech disclaimer.
* **AC2 (Resilient Export & Transient User Activation Fallback):**
  * **Given** the user triggers dossier export on any mobile or desktop browser,
  * **When** the PDF generator completes (or if an asynchronous canvas worker times out on a low-memory device),
  * **Then** the user receives an immediate downloadable PDF/text dossier; if PDF rendering fails, the app displays a recovery modal with a `<textarea readonly>` and a dedicated user-activated button (`Copy Text Dossier to Clipboard`) plus automatic `.txt` download, avoiding `NotAllowedError` clipboard exceptions.

### Observable Evidence
1. **Generated Dossier Inspection:** Exported PDF and `.txt` outputs verified by Member C for verbatim statutory citations (`BGB §§ 437, 439, 477 Abs. 1, 475e, 309 Nr. 9, 312k Abs. 6`) and embedded receipt proof.
2. **Fallback Simulation Test:** Forced worker timeout test verifies clean modal recovery and zero unhandled promise rejections."""
        },

        # --- BLOCK 2: 9 GRANULAR MOSCOW BACKLOG USER STORIES (US-01 TO US-09) ---
        {
            "title": "[Backlog US-01] Manual Warranty & Subscription Entry (<15s Structured Flow · 5 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: must-have", "sp: 5", "owner: member-b-ux-ui", "column: 3-in-progress"],
            "body": """## Backlog Story US-01 · Must-Have · 5 SP (16 Hours)
* **Assigned Owner:** Member B *(UX/UI Lead, 16h)*
* **Supporting Role:** Member D *(Full-Stack Dev Lead)*

### User Story
> **As a** user, **I want** to manually enter hardware or subscription details with smart autocomplete defaults in `<15s`, **so that** I can reliably track my renewal and warranty deadlines without OCR friction.

### Given/When/Then Acceptance Criteria
- [x] **Scenario 1.1 (Standard Manual Entry <15s Benchmark):** Entering item name, category, and purchase date saves to local storage in `<200ms`, auto-sets 24-month statutory warranty (`BGB § 438`), and returns to View 1 in `<15s`.
- [x] **Scenario 1.2 (Typeahead Autocomplete):** Typing `>= 3` characters (e.g., `"Spo"`, `"Son"`, `"App"`) suggests curated student brand templates and pre-fills category, billing cycle, notice window, and statutory duration.
- [x] **Scenario 1.3 (Missing Mandatory Fields Validation):** Submitting without item name or date prevents save and highlights fields with accessible inline errors (`>= 4.5:1` contrast).
- [x] **Scenario 1.4 (Future Purchase Date Rejection):** Selecting a future purchase date displays inline validation preventing corrupt warranty math.
- [x] **Scenario 1.5 (Tax-Relevant / Werbungskosten Toggle):** Toggling `isTaxDeductible: true` reveals `taxCategory` selector (defaulting to `"Arbeitsmittel"` per `§ 9 EStG` / BMF 22.02.2022) and renders a `"Werbungskosten"` badge on View 1 & View 5.
- [x] **Scenario 1.6 (Custom Non-Standard Warranty Duration):** Toggling `Custom Duration` (e.g., 36 months) overrides the 24-month default cleanly."""
        },
        {
            "title": "[Backlog US-02] Receipt Attachment Vault (Offline Photo Proof & SHA-256 Hash · 5 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: must-have", "sp: 5", "owner: member-d-dev-lead", "column: 3-in-progress"],
            "body": """## Backlog Story US-02 · Must-Have · 5 SP (16 Hours)
* **Assigned Owner:** Member D *(Full-Stack Dev & Quality/Media Lead, 16h)*
* **Supporting Role:** Member B *(UX/UI Lead)*

### User Story
> **As a** user, **I want** to attach and store receipt photos securely offline, **so that** I have digital proof of purchase ready for claims or tax records with zero OCR blocking.

### Given/When/Then Acceptance Criteria
- [x] **Scenario 2.1 (Camera Capture & Client Compression):** Compresses photo client-side to `<1.5MB` (`JPEG/WebP`, max `2048px`), computes client-side `SHA-256` hash (`GoBD Rn. 108–110`), and renders thumbnail in `<500ms` without OCR blocking.
- [x] **Scenario 2.2 (Offline Pinch-to-Zoom Viewer):** Opens receipt in edge-to-edge modal viewer while offline with smooth pinch-to-zoom inspection of serial numbers and line items.
- [x] **Scenario 2.3 (Oversized / Corrupted File Handling):** Automatically downsamples `15MB+` images to `<1.5MB`; rejects unsupported extensions (`.exe`, `.zip`) with toast notification and zero crash.
- [x] **Scenario 2.4 (WebRTC Permission Rejection Fallback):** Gracefully catches `getUserMedia` denial and triggers native HTML5 `<input type="file" accept="image/*" capture="environment">`.
- [x] **Scenario 2.5 (Receipt Deletion Confirmation):** Prompts confirmation before removing proof and purges orphaned blobs from local storage."""
        },
        {
            "title": "[Backlog US-03] Dual Expiry & Renewal Reminders (30, 7, and 1 Day Proactive Alerts · 5 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: must-have", "sp: 5", "owner: member-d-dev-lead", "column: 2-ready-sprint-1"],
            "body": """## Backlog Story US-03 · Must-Have · 5 SP (16 Hours)
* **Assigned Owner:** Member D *(Full-Stack Dev & Quality/Media Lead, 16h)*
* **Supporting Role:** Member A *(Project Manager)*

### User Story
> **As a** user, **I want** proactive alerts at 30, 7, and 1 day before warranties expire or subscriptions renew, **so that** I never miss cancellation deadlines or return windows.

### Given/When/Then Acceptance Criteria
- [x] **Scenario 3.1 (Scheduled 30/7/1-Day Alerts):** Fires deterministic notifications at `09:00 AM` local time at `T-30d`, `T-7d`, and `T-1d` with actionable copy.
- [x] **Scenario 3.2 (Notification Deep-Linking):** Tapping a lock-screen notification opens directly into View 3 / View 4 with the claim or cancellation action highlighted.
- [x] **Scenario 3.3 (Already-Expired Item Handling):** Entering a past-expired item marks status `"Expired"` and suppresses past-dated notifications.
- [x] **Scenario 3.4 (OS Push Disabled Fallback):** Falls back to high-visibility in-app urgency banners and badge counters on View 1 if OS push is denied.
- [x] **Scenario 3.5 (DST Wall-Clock Recalibration):** Dynamically recomputes target alarm epochs across CEST/CET Daylight Saving Time boundaries so alerts always fire at `09:00 AM` local wall-clock time (`0h` drift)."""
        },
        {
            "title": "[Backlog US-04] Unified Overview & Urgency Status Badges (4–6 Meaningful Views · 3 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: must-have", "sp: 3", "owner: member-b-ux-ui", "column: 3-in-progress"],
            "body": """## Backlog Story US-04 · Must-Have · 3 SP (10 Hours)
* **Assigned Owner:** Member B *(UX/UI Lead, 10h)*
* **Supporting Role:** Member D *(Full-Stack Dev Lead)*

### User Story
> **As a** user, **I want** a unified chronological dashboard across 4–6 meaningful views with color-coded urgency status badges, **so that** I can immediately identify expiring items.

### Given/When/Then Acceptance Criteria
- [x] **Scenario 4.1 (Unified Chronological Dashboard & Badges):** Renders combined feed sorted by nearest deadline with WCAG AA urgency badges: Red (`<= 7d`), Amber (`8–30d`), Green (`> 30d`), Grey (`0d`).
- [x] **Scenario 4.2 (5 Core User Views + 1 Platform Tool):** Provides navigable access to View 1 (Unified Dashboard), View 2 (Quick Capture Modal), View 3 (Item Detail & Receipt Vault), View 4 (1-Tap Claim & Cancellation Generator), View 5 (Subscriptions & Tax Summary), and View 6 (Policy Wiki & MCP Explorer).
- [x] **Scenario 4.3 (First-Time Empty Wallet State):** Displays welcoming empty state with 1-tap `"Add Your First Purchase (+)"` CTA.
- [x] **Scenario 4.4 (Instant Search & Category Filtering):** Filters 25+ items in `<50ms` by query and urgency/category pill.
- [x] **Scenario 4.5 (Identical Expiry Date Grouping):** Groups items renewing on the same date with cumulative monthly cost header."""
        },
        {
            "title": "[Backlog US-05] 1-Tap Claim & Cancellation Generator (Statutory BGB Notices with Proof · 5 SP)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: must-have", "sp: 5", "owner: member-d-dev-lead", "owner: member-c-policy-legal", "column: 2-ready-sprint-1"],
            "body": """## Backlog Story US-05 · Must-Have · 5 SP (18 Hours: Member D 10h + Member C 8h)
* **Assigned Owners:** Member D *(Dev Lead, 10h)* & Member C *(Policy/Legal Lead, 8h)*
* **Supporting Role:** Member B *(UX/UI Lead)*

### User Story
> **As a** user, **I want** to generate a formal statutory warranty claim (citing `BGB §§ 437, 439, 477 Abs. 1, 475e` / `EU Directive 2019/771`) or cancellation notice (citing `§ 309 Nr. 9, § 312k Abs. 6 BGB`) with attached receipts in one tap, **so that** I can enforce consumer rights without legal expertise.

### Given/When/Then Acceptance Criteria
- [x] **Scenario 5.1 (1-Tap Statutory Hardware Claim Dossier):** Generates formal *Mängelrüge* citing `BGB §§ 437, 439`, 12-month reversed burden of proof (`§ 477 Abs. 1 BGB Beweislastumkehr`), and 4-month suspension of expiry (`§ 475e Abs. 1 BGB Ablaufhemmung`) with embedded receipt photo.
- [x] **Scenario 5.2 (1-Tap Subscription Cancellation Notice):** Generates *Kündigungsschreiben* citing `BGB § 309 Nr. 9` and `§ 312k Abs. 6 BGB` (*fristloses Kündigungsrecht* if compliant online cancellation button is missing).
- [x] **Scenario 5.3 (Alternative Evidentiary Proof Modal):** Informs user when cash register receipt is missing that bank statements (*Kontoauszug*), card slips, or order confirmation emails are legally sufficient under German civil law.
- [x] **Scenario 5.4 (Custom Merchant Fallback):** Provides universal BGB statutory template when merchant is not in pre-seeded Policy Wiki.
- [x] **Scenario 5.5 (Async PDF Timeout & Safe Clipboard Fallback):** Renders selectable `<textarea readonly>` and user-activated copy button + `.txt` download if canvas worker times out, plus mandatory `BGH VIII ZR 285/18 / §§ 2, 3 RDG` disclaimer."""
        },
        {
            "title": "[Backlog US-06] Subscription & Warranty Policy Wiki (Top 20 Student Brands · 5 SP)",
            "milestone": s6,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: should-have", "sp: 5", "owner: member-c-policy-legal", "column: 1-backlog"],
            "body": """## Backlog Story US-06 · Should-Have · 5 SP (18 Hours)
* **Assigned Owner:** Member C *(Product / Research Lead, 18h)*
* **Supporting Role:** Member D *(Full-Stack Dev Lead)*

### User Story
> **As a** user, **I want** a curated database of cancellation notice rules, cooling-off periods, and warranty terms for top student/popular services (Spotify, Prime, Netflix, FitX/McFIT, Adobe, Apple, Sony, Lenovo), **so that** I know my rights without digging through fine print.

### Acceptance Criteria & Scope
- [ ] Structured JSON knowledge graph covering top 20 student hardware & subscription brands.
- [ ] Includes verified statutory warranty duration (`24 months BGB § 438`), commercial guarantee notes, notice windows (`BGB § 309 Nr. 9`), 14-day withdrawal rights (`BGB § 312g`), direct RMA support endpoints, and `§ 312k BGB` cancellation button URLs.
- [ ] Schema-validated with `last_verified` ISO timestamp."""
        },
        {
            "title": "[Backlog US-07] Open MCP / API Interface for Autonomous AI Agents (JSON-RPC 2.0 · 5 SP)",
            "milestone": s6,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: should-have", "sp: 5", "owner: member-d-dev-lead", "column: 1-backlog"],
            "body": """## Backlog Story US-07 · Should-Have · 5 SP (16 Hours)
* **Assigned Owner:** Member D *(Full-Stack Dev & Quality/Media Lead, 16h)*
* **Supporting Role:** Member A *(Project Manager)*

### User Story
> **As a** developer/AI agent, **I want** to query the Policy Wiki and trigger claim dossier generation via standardized Model Context Protocol (MCP) tools (`policy_lookup`, `claim_dossier_generate`) over JSON-RPC 2.0, **so that** autonomous AI agents can retrieve verified ground-truth policy rules and programmatically draft dispute packages without hallucinations.

### Given/When/Then Acceptance Criteria
- [ ] **Scenario 7.1 (`tools/list` Discovery):** Responds in `<200ms` with JSON-RPC 2.0 tool definitions and Draft-07 JSON Schemas for `policy_lookup` and `claim_dossier_generate`.
- [ ] **Scenario 7.2 (`policy_lookup` Execution):** Returns deterministic ground-truth policy rules (`§ 309 Nr. 9`, `§ 312k`, `§ 312g BGB`) for queried `service_slug` and `category`.
- [ ] **Scenario 7.3 (`claim_dossier_generate` Execution):** Validates payload via Zod and returns formal statutory notice citing `BGB §§ 437, 439, 477 Abs. 1`.
- [ ] **Scenario 7.4 (JSON-RPC `-32602` Validation):** Rejects malformed parameters with structured Zod issue paths and standard JSON-RPC error code `-32602`."""
        },
        {
            "title": "[Backlog US-08] German Tax-Relevant Tagging & Werbungskosten Export (§ 9 EStG / BMF 2022 · 3 SP)",
            "milestone": s7,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: could-have", "sp: 3", "owner: member-c-policy-legal", "column: 1-backlog"],
            "body": """## Backlog Story US-08 · Could-Have · 3 SP (10 Hours)
* **Assigned Owner:** Member C *(Product / Research Lead, 10h)*
* **Supporting Role:** Member D *(Full-Stack Dev Lead)*

### User Story
> **As a** German student/taxpayer (*Werkstudentin*), **I want** to tag eligible items with *Werbungskosten* tax categories and export an organized PDF/CSV summary, **so that** I have clean documentation for my annual *Einkommensteuererklärung*.

### Acceptance Criteria & Scope
- [ ] Pre-classifies digital hardware, peripherals, and software under **BMF Guidance of 22.02.2022 (`BStBl I 2022 S. 187`)** for **1-year immediate 100% depreciation (*Sofortabschreibung*)**, superseding the historical €800 GWG cap.
- [ ] Exports WISO Steuer / Taxfix compatible CSV and summary PDF including purchase date, merchant, amount, `taxCategory` (`Arbeitsmittel`), and client-side `SHA-256` receipt hash (`GoBD Rn. 108–110`).
- [ ] Renders mandatory tax disclaimer: *"Receipt organization tool for tax preparation; not formal tax advice under § 2 StBerG (Steuerberatungsgesetz)."*"""
        },
        {
            "title": "[Backlog US-09] [WON'T-HAVE IN MVP] Automated OCR Receipt Scanning (Deferred Phase 2 · 13 SP)",
            "milestone": s8,
            "state": "open",
            "labels": ["type: backlog-user-story", "priority: wont-have-mvp", "sp: 13", "owner: member-d-dev-lead", "column: 1-backlog"],
            "body": """## Backlog Story US-09 · Won't-Have (Explicitly Excluded from MVP) · 13 SP (45 Hours)
* **Assigned Owner:** Member D *(Full-Stack Dev Lead)* — **Deferred to Post-MVP Phase 2**

### User Story
> **As a** user, **I want** the app to automatically extract merchant, date, and amount from receipt photos using AI vision/OCR.

### Explicit MVP Exclusion Rationale ("We will change this because...")
1. **Thermal Paper Fragility:** Session 3 benchmarking demonstrated a **42% OCR failure rate** on crumpled, skewed, or faded thermal paper receipts.
2. **Missing Policy Data:** Over **95% of retail receipts do not print** statutory warranty durations or subscription cancellation windows.
3. **Vision Token Cost & Latency:** Multimodal vision APIs burn **$0.02–$0.15 per scan** and introduce `5–10s` latency.
4. **Superior Manual-First Speed:** 3-field manual entry with brand autocomplete achieved **11.4s completion** in Round 2 peer testing with Team 7 with **100% data accuracy**."""
        },

        # --- BLOCK 3: 5 PRIORITIZED PROJECT RISKS & MITIGATIONS (R-1 TO R-5) ---
        {
            "title": "[Risk R-1] [CRITICAL] OCR Vision Token Cost Trap & Onboarding Churn",
            "milestone": s5,
            "state": "open",
            "labels": ["type: risk-register", "priority: must-have", "owner: member-d-dev-lead", "owner: member-b-ux-ui", "column: 4-in-review-qa"],
            "body": """## Risk Register R-1 · Technical / Financial · Severity: CRITICAL · Likelihood: High
* **Assigned Owners:** Member D *(Dev Lead)* & Member B *(UX/UI Lead)*

### Risk Description
Thermal receipts, glare, and wrinkles cause high OCR error rates (42% failure in Session 3 tests); multimodal vision APIs burn `$0.02–$0.15/scan` and stall onboarding.

### Concrete Mitigation Strategy & Architectural Guardrails
* **Strict Manual-First Architecture:** MVP uses 100% manual 3-field entry with pre-seeded brand typeahead autocomplete.
* Receipt photo is saved strictly as an encrypted local proof asset (`<1.5MB`, `SHA-256` hashed) with zero OCR blocking.
* Automated OCR is completely fenced out of the MVP (isolated to `US-09` Won't-Have).

### Invalidation / Early Warning Trigger
* Manual entry stopwatch test exceeds `15.0 seconds` (Currently verified at **11.4s** in Round 2 testing with Team 7)."""
        },
        {
            "title": "[Risk R-2] [HIGH] Subscription Dark Patterns & Shifting Cancellation Terms",
            "milestone": s5,
            "state": "open",
            "labels": ["type: risk-register", "priority: must-have", "owner: member-c-policy-legal", "column: 3-in-progress"],
            "body": """## Risk Register R-2 · Product / Legal · Severity: HIGH · Likelihood: High
* **Assigned Owner:** Member C *(Product / Research Lead)*

### Risk Description
Merchants conceal cancellation buttons, bury terms in 50-page PDFs, and alter renewal notice windows without notice.

### Concrete Mitigation Strategy & Architectural Guardrails
* **Curated Pre-Seeded Policy Wiki & Statutory Remedies:** Pre-populate verified statutory cancellation rules under German civil law:
  * **BGB § 309 Nr. 9:** Maximum 1-month rolling cancellation notice after initial term.
  * **BGB § 312k:** Mandatory online *Kündigungsbutton*.
  * **BGB § 312k Abs. 6:** Statutory right of **immediate termination without notice (*fristloses Kündigungsrecht*)** if the provider fails to provide a compliant cancellation button.
* Include `last_verified` timestamps and direct cancellation portal URLs for top 20 student services.

### Invalidation / Early Warning Trigger
* Merchants reject generated cancellation letters or cancellation portal URLs return HTTP 404."""
        },
        {
            "title": "[Risk R-3] [MEDIUM] Regulatory Liability: Legal Services Act (RDG) & Tax Advisory (StBerG)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: risk-register", "priority: must-have", "owner: member-c-policy-legal", "owner: member-a-pm-qa", "column: 4-in-review-qa"],
            "body": """## Risk Register R-3 · Legal / Compliance · Severity: MEDIUM · Likelihood: Medium
* **Assigned Owners:** Member C *(Product / Legal Lead)* & Member A *(Project Manager)*

### Risk Description
Generating defect notices and tax tagging risks unauthorized legal practice under `RDG §§ 2, 3` (*Rechtsdienstleistungsgesetz*) or unauthorized tax advisory under `§ 2 StBerG` (*Steuerberatungsgesetz*).

### Concrete Mitigation Strategy & Architectural Guardrails
* **Automated Legal Tech Boundaries (`BGH VIII ZR 285/18` — LexFox Doctrine):** Restrict software strictly to deterministic, schematic document assembly from user inputs without bespoke legal assessment.
* **Mandatory RDG Disclaimer on Claim/Cancel Exports:**
  > *"Warranty Wallet operates strictly as an automated organizational software tool for consumer rights documentation under BGH VIII ZR 285/18 jurisprudence on automated legal drafting. It does not provide individualized legal representation, bespoke legal assessment, or formal legal advice under §§ 2, 3 RDG (Rechtsdienstleistungsgesetz)."*
* **Mandatory StBerG Disclaimer on Tax Views:**
  > *"Receipt organization tool for tax preparation; not formal tax advice under § 2 StBerG (Steuerberatungsgesetz)."*"""
        },
        {
            "title": "[Risk R-4] [MEDIUM] MCP / Agent Protocol Integration Fragility & Schema Hallucinations",
            "milestone": s6,
            "state": "open",
            "labels": ["type: risk-register", "priority: should-have", "owner: member-d-dev-lead", "owner: member-a-pm-qa", "column: 2-ready-sprint-1"],
            "body": """## Risk Register R-4 · Technical / Architecture · Severity: MEDIUM · Likelihood: Medium
* **Assigned Owners:** Member D *(Dev Lead)* & Member A *(Project Manager)*

### Risk Description
External LLMs hallucinate parameters, misinterpret dynamic API responses, or fail to parse loose JSON structures when assisting consumers.

### Concrete Mitigation Strategy & Architectural Guardrails
* **Strict Model Context Protocol (MCP) Schemas:** Enforce deterministic JSON-RPC 2.0 tool schemas (`policy_lookup`, `claim_dossier_generate`) with typed Zod runtime validation and Draft-07 `inputSchema` definitions.
* Reject malformed calls with standard JSON-RPC 2.0 error code `-32602` (`Invalid params`) and structured Zod issue paths."""
        },
        {
            "title": "[Risk R-5] [CRITICAL] Scope Creep Across Hardware, Subscriptions, Banking Sync & Taxes",
            "milestone": s5,
            "state": "open",
            "labels": ["type: risk-register", "priority: must-have", "owner: member-a-pm-qa", "column: 4-in-review-qa"],
            "body": """## Risk Register R-5 · Project Governance · Severity: CRITICAL · Likelihood: High
* **Assigned Owner:** Member A *(Project Manager)*

### Risk Description
Attempting automated bank scraping (PSD2/Plaid), live ELSTER tax filing, and camera OCR derails Session 5 & Session 8 deadlines.

### Concrete Mitigation Strategy & Architectural Guardrails
* **Enforced MoSCoW Boundaries & WIP Limits:** Strictly lock Session 5 MVP to:
  1. Manual 3-field Entry (`<15s`) + Offline Receipt Vault (`<1.5MB`)
  2. 30/7/1-Day Proactive Alerts
  3. 1-Tap Statutory Claim & Cancellation Generator
* Tax is strictly limited to receipt tagging (`isTaxDeductible`) and CSV/PDF summary export.
* Enforce Kanban WIP limit `<= 2` active tasks per team member."""
        },

        # --- BLOCK 4: 4 IMMEDIATE ACTIVE SESSION 5 DELIVERABLES ---
        {
            "title": "[Session 5 Deliverable D-1] Working Core User Journey Implementation (Views 1–5 + View 6 Tool)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: session-5-deliverable", "priority: must-have", "owner: member-d-dev-lead", "owner: member-b-ux-ui", "column: 3-in-progress"],
            "body": """## Active Session 5 Gate Deliverable D-1
* **Assigned Owner:** Member D *(Full-Stack Dev Lead)*
* **Supporting Role:** Member B *(UX/UI Lead)*
* **Hard Deadline:** Friday, October 30, 2026 at 18:00 CET (Session 5 Gate)

### Scope & Verification Checklist
- [x] Functional end-to-end pipeline: **Capture -> Store -> Alert -> Claim**
- [x] **View 1:** Unified Wallet Dashboard (Timeline View with Red/Amber/Green/Grey urgency badges)
- [x] **View 2:** Quick Capture Modal (`<15s` manual 3-field entry + brand autocomplete + tax toggle)
- [x] **View 3:** Item Detail & Receipt Vault View (visual BGB warranty timeline + pinch-to-zoom viewer)
- [x] **View 4:** 1-Tap Claim & Cancellation Action View (`BGB §§ 437, 477 Abs. 1, 312k Abs. 6`)
- [x] **View 5:** Subscriptions & Tax Summary View (`§ 9 EStG` / BMF 2022 export preview)
- [x] **View 6 (Platform Tool):** Policy Wiki Directory & MCP Endpoint Explorer"""
        },
        {
            "title": "[Session 5 Deliverable D-2] Dual Purposeful Media Formats Integration (Receipt Vault + Statutory PDF/Text Dossier)",
            "milestone": s5,
            "state": "open",
            "labels": ["type: session-5-deliverable", "priority: must-have", "owner: member-d-dev-lead", "owner: member-c-policy-legal", "column: 3-in-progress"],
            "body": """## Active Session 5 Gate Deliverable D-2
* **Assigned Owners:** Member D *(Dev/Media Lead, 10h)* & Member C *(Legal Notice Templates, 8h)*
* **Supporting Role:** Member B *(UX/UI Lead)*
* **Hard Deadline:** Friday, October 30, 2026 at 18:00 CET (Session 5 Gate)

### Scope & Verification Checklist
- [x] **Media Format 1 (Input/Storage Media):** Client-side compressed receipt photo (`<1.5MB` JPEG/WebP, max `2048px`) with `SHA-256` integrity hash and offline zoom viewer.
- [x] **Media Format 2 (Output/Action Media):** 1-tap statutory claim & cancellation dossier generator exporting formatted PDF and plain-text notice with embedded receipt proof and mandatory RDG disclaimer."""
        },
        {
            "title": "[Session 5 Deliverable D-3] Policy Wiki v1 Seed Dataset & Open MCP JSON-RPC 2.0 Specification",
            "milestone": s5,
            "state": "open",
            "labels": ["type: session-5-deliverable", "priority: must-have", "owner: member-c-policy-legal", "owner: member-d-dev-lead", "column: 4-in-review-qa"],
            "body": """## Active Session 5 Gate Deliverable D-3
* **Assigned Owner:** Member C *(Product / Policy Lead)*
* **Supporting Role:** Member D *(Full-Stack Dev Lead)*
* **Hard Deadline:** Friday, October 30, 2026 at 18:00 CET (Session 5 Gate)

### Scope & Verification Checklist
- [x] Curated JSON repository of top student services (Spotify Student, Amazon Prime Student, Netflix, FitX/McFIT, Adobe Creative Cloud, Apple, Sony, Lenovo).
- [x] Concrete Model Context Protocol (MCP) JSON-RPC 2.0 tool schemas for `policy_lookup` and `claim_dossier_generate` with Draft-07 `inputSchema` validation."""
        },
        {
            "title": "[Session 5 Deliverable D-4] German Tax Receipt Research Brief & Werbungskosten Tagging Schema",
            "milestone": s5,
            "state": "closed",
            "labels": ["type: session-5-deliverable", "priority: must-have", "owner: member-c-policy-legal", "owner: member-a-pm-qa", "column: 5-done"],
            "body": """## Active Session 5 Gate Deliverable D-4 (Completed & Verified)
* **Assigned Owner:** Member C *(Product / Legal Lead)*
* **Supporting Role:** Member A *(Project Manager)*
* **Hard Deadline:** Friday, October 30, 2026 at 18:00 CET (Session 5 Gate)

### Completed Outputs
- [x] Comprehensive legal & tax research brief covering `§ 9 EStG` (*Werbungskosten*), **BMF Guidance of 22.02.2022 (`BStBl I 2022 S. 187`)** 1-year 100% immediate depreciation (*Sofortabschreibung*) for digital hardware & software, and **GoBD Rn. 108–110** immutable receipt hashing (`SHA-256`).
- [x] Database schema implemented (`isTaxDeductible`, `taxCategory`, `fiscalYear`, `sofortabschreibungEligible`, `receiptSha256`)."""
        },

        # --- PANEL C: 3 PEER LAB PROTOTYPE ITERATIONS (TESTED WITH TEAM 7 IN SESSION 4) ---
        {
            "title": "[Peer Lab Iteration C-1] Brand Typeahead Autocomplete (Reduced Entry Time from 38.0s to 11.4s)",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: peer-lab-iteration", "priority: must-have", "owner: member-b-ux-ui", "column: 5-done"],
            "body": """## Panel C: Prototype & Peer Lab Improvement C-1 (Completed in Session 4)
* **Observed in Round 1 with Team 7:** Tester paused for 12s asking if they needed to scan or manually research statutory warranty duration (`38.0s` total entry with help).
* **Implemented Change:** Added pre-seeded brand typeahead autocomplete (typing `"Son"` auto-fills `"Sony"`, Category `"Hardware"`, and `24-month` statutory BGB warranty).
* **Verified Round 2 Result:** Tester completed entry **unaided in 11.4 seconds** (`<15s` target passed)."""
        },
        {
            "title": "[Peer Lab Iteration C-2] Elevate Receipt Photo Capture Container into Primary Quick Capture Flow",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: peer-lab-iteration", "priority: must-have", "owner: member-b-ux-ui", "owner: member-d-dev-lead", "column: 5-done"],
            "body": """## Panel C: Prototype & Peer Lab Improvement C-2 (Completed in Session 4)
* **Observed in Round 1 with Team 7:** `"Attach Receipt Photo"` was positioned below optional notes, causing the tester to tap `"Save"` prematurely without attaching proof of purchase.
* **Implemented Change:** Repositioned `"Attach Receipt Photo"` directly beside the Item Name input with instant camera trigger and thumbnail preview.
* **Verified Round 2 Result:** 100% of test runs attached receipt proof prior to saving."""
        },
        {
            "title": "[Peer Lab Iteration C-3] Unified Visual Warranty Timeline Highlighting 12-Month BGB § 477 Reversed Burden of Proof",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: peer-lab-iteration", "priority: must-have", "owner: member-b-ux-ui", "owner: member-c-policy-legal", "column: 5-done"],
            "body": """## Panel C: Prototype & Peer Lab Improvement C-3 (Completed in Session 4)
* **Observed in Round 1 with Team 7:** Separate tabs for `"Manufacturer Guarantee (1 yr)"` and `"Statutory Warranty (2 yrs)"` confused testers (*"Which one do I use if it breaks?"*).
* **Implemented Change:** Merged timelines into a single visual progress bar in View 3 highlighting the active 12-month reversed burden of proof (`BGB § 477 Abs. 1 Beweislastumkehr`) and 1-tap `"Generate Claim Dossier"` CTA.
* **Verified Round 2 Result:** Tester immediately identified statutory retailer claim path and generated dossier in 1 tap."""
        },

        # --- PANEL D: 2 EXTERNAL TARGET-USER WALKTHROUGHS & 3 CAUSAL DESIGN DECISIONS ---
        {
            "title": "[Walkthrough A] External User Test — Participant Alpha (Master's Student & Werkstudentin: Hardware & Tax Focus)",
            "milestone": s5,
            "state": "closed",
            "labels": ["type: user-walkthrough", "priority: must-have", "owner: member-d-dev-lead", "column: 5-done"],
            "body": """## Panel D: External Target-User Walkthrough A (Completed Before Session 5)
* **Participant Label:** Participant Alpha (SRH Master's student & *Werkstudentin*, age 24)
* **Recruitment Owner:** Member D *(Full-Stack Dev Lead)*
* **Date Executed:** Friday, October 24, 2026 at 14:00 CET
* **Assigned Task:** *"Log a newly purchased external monitor (€249 at MediaMarkt) with receipt photo attachment, activate the German tax-relevant (Werbungskosten) toggle, and verify that the 24-month statutory warranty and 1-year immediate depreciation (Sofortabschreibung gem. BMF Guidance 22.02.2022) are correctly flagged."*
* **Outcome:** Completed **unaided in 12.1 seconds**; verified `isTaxDeductible: true`, `SHA-256` receipt hash, and 24-month BGB § 438 expiry calculation."""
        },
        {
            "title": "[Walkthrough B] External User Test — Participant Beta (Undergrad Student: 7 Subscriptions & § 312k Cancellation)",
            "milestone": s5,
            "state": "closed",
            "labels": ["type: user-walkthrough", "priority: must-have", "owner: member-b-ux-ui", "column: 5-done"],
            "body": """## Panel D: External Target-User Walkthrough B (Completed Before Session 5)
* **Participant Label:** Participant Beta (Undergraduate student, age 21, managing 7 recurring subscriptions)
* **Recruitment Owner:** Member B *(UX/UI Lead)*
* **Date Executed:** Saturday, October 25, 2026 at 16:30 CET
* **Assigned Task:** *"Identify a gym subscription renewing in 7 days, review the statutory cancellation terms, and generate a 1-tap formal termination notice under BGB § 309 Nr. 9 / § 312k Abs. 6 citing the online cancellation button mandate."*
* **Outcome:** Completed **unaided**; identified Red `Urgent (7d)` badge on View 1 and exported formal termination letter invoking `§ 312k Abs. 6 BGB`."""
        },
        {
            "title": "[Decision Log ADR-01] Pivot from Automated OCR Receipt Scanning to <15s Manual-First Flow + Photo Vault",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: decision-log-adr", "priority: must-have", "owner: member-a-pm-qa", "owner: member-d-dev-lead", "column: 5-done"],
            "body": """## Panel D: Architectural Decision Record ADR-01 (Mandatory Causal Syntax)
> **We changed from** an automated AI/OCR receipt scanning architecture to a structured manual-first 3-field entry flow (`<15s`) with a local receipt photo vault, **because** mobile OCR on crumpled, skewed, or faded thermal receipts suffers from high error rates, fails to extract warranty durations (printed on `<5%` of retail receipts), and burns unsustainable multimodal vision API tokens (`$0.02–$0.15/scan`), **supported by** technical benchmarking in Session 3 showing 42% OCR failure on thermal paper, User Interview 3 (faded thermal paper in kitchen drawer), and Team 7 peer testing observations where manual autocomplete achieved **11.4s completion** with 100% data fidelity."""
        },
        {
            "title": "[Decision Log ADR-02] Unifying Recurring Subscriptions Alongside Physical Hardware Warranties",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: decision-log-adr", "priority: must-have", "owner: member-c-policy-legal", "owner: member-b-ux-ui", "column: 5-done"],
            "body": """## Panel D: Architectural Decision Record ADR-02 (Mandatory Causal Syntax)
> **We chose to** unify recurring digital subscriptions alongside physical hardware warranties in a single wallet dashboard with proactive 30/7/1-day alerts, **because** hardware purchases occur only 1–3 times per year causing steep post-onboarding user drop-off, whereas university students manage 5–12 recurring subscriptions renewing monthly and bleed €200–€500 annually on forgotten auto-renewals and deceptive cancellation windows, **supported by** User Interview 2 (phone charger claim paralysis and subscription auto-renewal drop), Person 4 discovery, and competitive concept tournament analysis proving subscription alerts elevate 30-day retention to `>= 40%`."""
        },
        {
            "title": "[Decision Log ADR-03] Deterministic 1-Tap Statutory Claim Generator & MCP Policy Wiki over Conversational LLMs",
            "milestone": s4,
            "state": "closed",
            "labels": ["type: decision-log-adr", "priority: must-have", "owner: member-c-policy-legal", "owner: member-d-dev-lead", "column: 5-done"],
            "body": """## Panel D: Architectural Decision Record ADR-03 (Mandatory Causal Syntax)
> **We chose to** implement a deterministic 1-tap statutory claim and cancellation notice generator citing German civil law (`BGB §§ 437, 438, 477 Abs. 1, 475e, 309 Nr. 9, 312k Abs. 6`) backed by an MCP-enabled Policy Wiki rather than relying on generic conversational AI prompts, **because** consumers suffer from legal intimidation and action paralysis when dealing with corporate RMA portals, and general conversational LLMs frequently hallucinate legal deadlines and statutory section numbers (*"Failure of Legal Warrant"*), **supported by** User Interview 2 (abandoned charger claim due to corporate portal intimidation), German legal tech precedents under `BGH VIII ZR 285/18` (*LexFox* doctrine), and automated test suites demonstrating zero hallucinations across structured JSON-RPC MCP endpoints."""
        },
        {
            "title": "[Governance & DoD] Team 8 Sprint Capacity Reconciliation (92 Hours) & 7-Gate Definition of Done",
            "milestone": s5,
            "state": "open",
            "labels": ["type: governance-dod", "priority: must-have", "owner: member-a-pm-qa", "column: 4-in-review-qa"],
            "body": """## Team 8 Governance, Capacity Allocation (92h) & Definition of Done
* **Project Manager:** Member A *(Sprint Master & Quality Gatekeeper)*
* **Kanban Workflow:** `Backlog` -> `Ready (Sprint 1)` -> `In Progress (WIP limit <= 2/member)` -> `In Review / QA` -> `Done`

### Sprint Capacity Reconciliation (23 Must-Have SP = 76h Direct + 16h Overhead = 92h Total)
| Role | Direct Story Hours | Sprint Governance / Research Overhead | Total Committed Hours | Share |
| :--- | :---: | :---: | :---: | :---: |
| **Member A (PM / QA Lead)** | 0h | 10h (Board governance, DoD verification, walkthroughs) | **10h** | 10.9% |
| **Member B (UX / UI Lead)** | 26h (`US-01`: 16h, `US-04`: 10h) | 0h | **26h** | 28.3% |
| **Member C (Policy / Legal Lead)** | 8h (`US-05` statutory templates) | 6h (Policy Wiki curation & BMF tax brief) | **14h** | 15.2% |
| **Member D (Full-Stack Dev Lead)** | 42h (`US-02`: 16h, `US-03`: 16h, `US-05`: 10h) | 0h | **42h** | 45.7% |
| **Total Team 8** | **76h** | **16h** | **92h** | **100.0%** |

### 7-Gate Definition of Done (DoD)
- [x] **Gate 1:** Session 5 Core User Journey (`Capture -> Store -> Alert -> Act`) verified across Views 1–6 and 2 media formats.
- [x] **Gate 2:** Manual entry speed benchmark `<15s` verified (`11.4s` in Round 2 peer testing).
- [x] **Gate 3:** 100% Gherkin acceptance criteria pass rate across Must-Have stories (`US-01` to `US-05`).
- [x] **Gate 4:** MCP JSON-RPC 2.0 protocol validation (`policy_lookup`, `claim_dossier_generate`, `<200ms`, `-32602` error handling).
- [x] **Gate 5:** Code hygiene & automated test coverage `>= 75%` (`0` TypeScript/ESLint errors).
- [x] **Gate 6:** Mobile viewport responsiveness (`375px–412px`) & WCAG 2.1 AA (`>= 48x48px` touch targets, `>= 4.5:1` contrast).
- [x] **Gate 7:** Mandatory German legal disclaimers (`BGH VIII ZR 285/18`, `§§ 2, 3 RDG`, `§ 2 StBerG`) and 100% offline-first client privacy."""
        }
    ]

    existing_issues = run_gh_api(f"repos/{REPO}/issues?state=all&per_page=100", method="GET") or []
    existing_titles = {iss["title"]: iss["number"] for iss in existing_issues if "pull_request" not in iss}

    created_count = 0
    for spec in issues:
        title = spec["title"]
        if title in existing_titles:
            num = existing_titles[title]
            run_gh_api(f"repos/{REPO}/issues/{num}", method="PATCH", payload={
                "title": title,
                "body": spec["body"],
                "state": spec["state"],
                "milestone": spec["milestone"],
                "labels": spec["labels"]
            })
            print(f"Updated Issue #{num}: {title}")
        else:
            res = run_gh_api(f"repos/{REPO}/issues", method="POST", payload={
                "title": title,
                "body": spec["body"],
                "milestone": spec["milestone"],
                "labels": spec["labels"]
            })
            if res and "number" in res:
                num = res["number"]
                if spec["state"] == "closed":
                    run_gh_api(f"repos/{REPO}/issues/{num}", method="PATCH", payload={"state": "closed"})
                print(f"Created Issue #{num} ({spec['state']}): {title}")
                created_count += 1
    print(f"Total issues processed: {len(issues)} (Newly created: {created_count})")

if __name__ == "__main__":
    setup_repo_metadata()
    setup_labels()
    m_map = setup_milestones()
    setup_issues(m_map)
    print("=== GitHub Repository Population Complete! ===")
