# 🛡️ Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)

**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule*)  
**Course Module:** *Computer & Media Lab* (Wintersemester 2026) · **Instructor:** Prof. Franziska Schwarz  
**Working Team:** **Team 6** (Peer Testing Collaboration with Team 7)  
**Active Milestone:** **Session 5 — MVP Scope Control & Working Core User Journey Gate**  

[![GitHub Issues](https://img.shields.io/github/issues/ettefagh/CM-LAB?color=2F524C&label=Active%20Sprint%20Issues)](https://github.com/ettefagh/CM-LAB/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/ettefagh/CM-LAB?color=059669&label=Completed%20%26%20DoD%20Verified)](https://github.com/ettefagh/CM-LAB/issues?q=is%3Aissue+is%3Aclosed)
[![Milestones](https://img.shields.io/badge/Milestones-S1%E2%80%93S10%20Configured-D96B4B)](https://github.com/ettefagh/CM-LAB/milestones)
[![Projects](https://img.shields.io/badge/GitHub%20Projects-Team%206%20Kanban-2563EB)](https://github.com/ettefagh/CM-LAB/projects)

---

## 👥 Team 6 Official Roster & Role Assignments

| Team | Role Title | Team Member | Documentation Folder | GitHub Label Filter | Core Responsibilities & Assigned Scope |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Team 6** | **Project Manager** | **Jeetkumar** | [`project-manager/`](./development-documents/project-manager/) | [`owner: Jeetkumar (PM)`](https://github.com/ettefagh/CM-LAB/issues?q=label%3A%22owner%3A+Jeetkumar+%28PM%29%22) | Agile sprint planning, MoSCoW backlog governance, 5-column Kanban board & WIP limit ($\le 2$) enforcement, Risk Register (`R-3`, `R-5`), ADR-01, 7-Gate Definition of Done (`#30`). |
| **Team 6** | **Product / Research Lead** | **AmirHossein** (`@ettefagh`) | [`product-research-lead/`](./development-documents/product-research-lead/) | [`owner: AmirHossein (Product/Research)`](https://github.com/ettefagh/CM-LAB/issues?q=label%3A%22owner%3A+AmirHossein+%28Product%2FResearch%29%22) | Empirical user discovery (Persons 1–4), Policy Wiki 20 student brands (`US-06`, `D-3`), German Civil Code statutory notices (`BGB §§ 437, 477 Abs. 1, 309 Nr. 9, 312k Abs. 6` in `US-05`), German Tax *Werbungskosten* (`§ 9 EStG` / BMF 2022 `US-08`, `D-4`), Risks `R-2` & `R-3`, ADRs `02` & `03`. |
| **Team 6** | **UX/UI Lead** | **Prushti** | [`ux-ui-lead/`](./development-documents/ux-ui-lead/) | [`owner: Prushti (UX/UI)`](https://github.com/ettefagh/CM-LAB/issues?q=label%3A%22owner%3A+Prushti+%28UX%2FUI%29%22) | Mobile interaction design, Figma wireframes, WCAG 2.1 AA accessibility, 6 paper prototype views & Peer Lab iterations (`C-1`, `C-2`, `C-3`), `<15s` Manual Entry UI (`US-01`), Unified Chronological Dashboard & Urgency Badges (`US-04`), Walkthrough B (`#26`). |
| **Team 6** | **Development Lead** | **Kyle** | [`development-lead/`](./development-documents/development-lead/) | [`owner: Kyle (Dev Lead)`](https://github.com/ettefagh/CM-LAB/issues?q=label%3A%22owner%3A+Kyle+%28Dev+Lead%29%22) | Offline-first IndexedDB / SQLite storage engine (`US-01`/`US-02`), Proactive 30/7/1-Day Push Alert Scheduler with dynamic CEST/CET DST recalibration (`US-03`), Working Core User Journey (`D-1`), Open MCP JSON-RPC 2.0 Server (`US-07`, `R-4`), Walkthrough A (`#25`). |
| **Team 6** | **Quality / Media Lead** | **Mojtaba** | [`quality-media-lead/`](./development-documents/quality-media-lead/) | [`owner: Mojtaba (Quality/Media)`](https://github.com/ettefagh/CM-LAB/issues?q=label%3A%22owner%3A+Mojtaba+%28Quality%2FMedia%29%22) | Dual Purposeful Media Formats (`D-2`): **Media Format 1** (`<1.5MB` client receipt photo compression, `SHA-256` GoBD hashing & pinch-to-zoom viewer in `US-02`) and **Media Format 2** (1-tap statutory PDF/text dossier renderer & clipboard fallback in `US-05`), plus $\ge 75\%$ automated test suite & QA verification. |

---

## 📌 Quick Navigation & Repository Index

| Document / Asset | Purpose & Contents | Format |
| :--- | :--- | :--- |
| [**`development-documents/`**](./development-documents/) | **Team 6 Development Documents Hub:** Individual role specifications, architectures, sprint logs & DoD checklists for [Jeetkumar](./development-documents/project-manager/), [AmirHossein](./development-documents/product-research-lead/), [Prushti](./development-documents/ux-ui-lead/), [Kyle](./development-documents/development-lead/), and [Mojtaba](./development-documents/quality-media-lead/) | Directory (5 Roles) |
| [**`WORKSHOP_CANVAS_TEAM_8.md`**](./WORKSHOP_CANVAS_TEAM_8.md) | **Official 4-Panel Team 6 Workshop Canvas:** Panel A (Requirements Clinic `US1–US3`), Panel B (6-Step Core User Journey + 2 Exception Flows), Panel C (6 Paper Prototype Views & Team 7 Peer Lab Results), Panel D (Homework Launchpad, Walkthroughs A & B, 3 Causal Decisions, Session 4 Status Report) | Markdown (67 KB) |
| [**`WORKSHOP_BOARD_RECOMMENDATIONS.md`**](./WORKSHOP_BOARD_RECOMMENDATIONS.md) | **Master 4-Block Workshop Board Specification:** Block 1 (Sharpen the Idea), Block 2 (9 MoSCoW User Stories & Full Gherkin Criteria), Block 3 (Milestones `S1–S10` & 5 Prioritized Risks), Block 4 (Commit, 5-Column Kanban Board, 92h Role Capacity, 7-Gate DoD) | Markdown (73 KB) |
| [**`PROJECT_MEMORY_AND_RESEARCH.md`**](./PROJECT_MEMORY_AND_RESEARCH.md) | **Comprehensive Research Dossier:** Empirical user interviews (Persons 1–4), German Civil Code (`BGB §§ 437, 438, 477 Abs. 1, 475e, 309 Nr. 9, 312k Abs. 6`), German Tax Law (`§ 9 EStG`, `BMF 22.02.2022` 100% digital depreciation, `GoBD` SHA-256 hashing), and MCP JSON-RPC 2.0 specification | Markdown (41 KB) |
| [**`Warranty_Wallet_Pitch_Deck_Rebuilt.pdf`**](./Warranty_Wallet_Pitch_Deck_Rebuilt.pdf) | **Rebuilt 6-Slide Widescreen (16:9) Investor Pitch Deck** ([Google Slides Live Link](https://docs.google.com/presentation/d/152nLrrfXt9FgDuTi3W5siGW7zZGjtU2nYvfdToobWGA/edit?usp=drivesdk)) | PDF / PPTX / DOCX |
| [**GitHub Issues (`#1`–`#30`)**](https://github.com/ettefagh/CM-LAB/issues) | **Live Issue Tracker:** All 3 Panel A Core Stories, 9 Granular MoSCoW Stories (`US-01`–`US-09`), 5 Risks (`R-1`–`R-5`), 4 Session 5 Deliverables (`D-1`–`D-4`), 3 Peer Lab Iterations (`C-1`–`C-3`), 2 Walkthroughs (`A` & `B`), 3 ADRs, and DoD Governance | GitHub Issues |
| [**Course Milestones (`S1`–`S10`)**](https://github.com/ettefagh/CM-LAB/milestones) | **Full Semester Route:** Completed `S1–S4`, Active `S5` (Oct 31, 2026), Upcoming `S6–S10` (through Final Viva Exam Jan 16, 2027) | GitHub Milestones |

---

## 🖼️ 4-Block Workshop Board Visuals (1:1 Square Slides)

| Block 1: Sharpen the Idea (20 min) | Block 2: Backlog & Criteria (25 min) |
| :---: | :---: |
| ![Block 1](./square_block_1_sharpen_the_idea.png) | ![Block 2](./square_block_2_backlog.png) |
| **Block 3: Route + Risks (20 min)** | **Block 4: Commit & Governance (10 min)** |
| ![Block 3](./square_block_3_route_and_risks.png) | ![Block 4](./square_block_4_commit.png) |

---

## 📋 Official 5-Column Agile Kanban Board (Live Issue & Member Mapping)

In strict compliance with SRH Course Governance (Slide 29), **Team 6** enforces a **5-Column Kanban Structure** led by Project Manager **Jeetkumar** with a strict **Work-in-Progress (WIP) limit of $\le 2$ active items per member**:

| 1. Backlog (`column: 1-backlog`) | 2. Ready / Sprint 1 (`column: 2-ready-sprint-1`) | 3. In Progress (`column: 3-in-progress`) | 4. In Review / QA (`column: 4-in-review-qa`) | 5. Done (`column: 5-done`) |
| :--- | :--- | :--- | :--- | :--- |
| • [#9 US-06: Policy Wiki (5 SP)](https://github.com/ettefagh/CM-LAB/issues/9) — **AmirHossein**<br>• [#10 US-07: Open MCP Server (5 SP)](https://github.com/ettefagh/CM-LAB/issues/10) — **Kyle**<br>• [#11 US-08: German Tax Export (3 SP)](https://github.com/ettefagh/CM-LAB/issues/11) — **AmirHossein & Mojtaba**<br>• [#12 US-09: Camera OCR (Won't-Have, 13 SP)](https://github.com/ettefagh/CM-LAB/issues/12) — **Kyle & Mojtaba** | • [#3 Panel A US3: 1-Tap Claim & Cancel (5 SP)](https://github.com/ettefagh/CM-LAB/issues/3) — **Mojtaba & AmirHossein**<br>• [#6 US-03: 30/7/1-Day Alerts (5 SP)](https://github.com/ettefagh/CM-LAB/issues/6) — **Kyle**<br>• [#8 US-05: 1-Tap Claim Generator (5 SP)](https://github.com/ettefagh/CM-LAB/issues/8) — **Mojtaba & AmirHossein**<br>• [#16 Risk R-4: MCP Schema Validation](https://github.com/ettefagh/CM-LAB/issues/16) — **Kyle & Mojtaba** | • [#1 Panel A US1: Capture & Vault (10 SP)](https://github.com/ettefagh/CM-LAB/issues/1) — **Prushti, Mojtaba & Kyle**<br>• [#2 Panel A US2: Alert Engine (8 SP)](https://github.com/ettefagh/CM-LAB/issues/2) — **Kyle & Prushti**<br>• [#4 US-01: Manual Entry <15s (5 SP)](https://github.com/ettefagh/CM-LAB/issues/4) — **Prushti**<br>• [#5 US-02: Receipt Photo Vault (5 SP)](https://github.com/ettefagh/CM-LAB/issues/5) — **Mojtaba & Kyle**<br>• [#7 US-04: Unified Dashboard (3 SP)](https://github.com/ettefagh/CM-LAB/issues/7) — **Prushti**<br>• [#14 Risk R-2: Dark Patterns Wiki](https://github.com/ettefagh/CM-LAB/issues/14) — **AmirHossein**<br>• [#18 Deliverable D-1: Core Journey](https://github.com/ettefagh/CM-LAB/issues/18) — **Kyle & Prushti**<br>• [#19 Deliverable D-2: Dual Media](https://github.com/ettefagh/CM-LAB/issues/19) — **Mojtaba & AmirHossein** | • [#13 Risk R-1: OCR Cost Trap Guardrail](https://github.com/ettefagh/CM-LAB/issues/13) — **Kyle, Mojtaba & Prushti**<br>• [#15 Risk R-3: RDG & StBerG Disclaimers](https://github.com/ettefagh/CM-LAB/issues/15) — **AmirHossein & Jeetkumar**<br>• [#17 Risk R-5: MoSCoW Scope Fence](https://github.com/ettefagh/CM-LAB/issues/17) — **Jeetkumar**<br>• [#20 Deliverable D-3: Wiki Seed & MCP Spec](https://github.com/ettefagh/CM-LAB/issues/20) — **AmirHossein & Kyle**<br>• [#30 Governance & 7-Gate DoD Tracker](https://github.com/ettefagh/CM-LAB/issues/30) — **Jeetkumar & Mojtaba** | • [#21 Deliverable D-4: German Tax Brief](https://github.com/ettefagh/CM-LAB/issues/21) — **AmirHossein & Jeetkumar**<br>• [#22 Peer Lab C-1: Brand Autocomplete (11.4s)](https://github.com/ettefagh/CM-LAB/issues/22) — **Prushti**<br>• [#23 Peer Lab C-2: Primary Receipt Container](https://github.com/ettefagh/CM-LAB/issues/23) — **Prushti & Mojtaba**<br>• [#24 Peer Lab C-3: Visual BGB § 477 Timeline](https://github.com/ettefagh/CM-LAB/issues/24) — **Prushti & AmirHossein**<br>• [#25 Walkthrough A: Participant Alpha](https://github.com/ettefagh/CM-LAB/issues/25) — **Kyle & Mojtaba**<br>• [#26 Walkthrough B: Participant Beta](https://github.com/ettefagh/CM-LAB/issues/26) — **Prushti**<br>• [#27 ADR-01: Manual-First vs OCR](https://github.com/ettefagh/CM-LAB/issues/27) — **Jeetkumar, Kyle & Mojtaba**<br>• [#28 ADR-02: Unified Subs + Warranties](https://github.com/ettefagh/CM-LAB/issues/28) — **AmirHossein & Prushti**<br>• [#29 ADR-03: Deterministic BGB & MCP](https://github.com/ettefagh/CM-LAB/issues/29) — **AmirHossein & Kyle** |

---

## ⚖️ Team 6 Sprint Capacity Reconciliation (92 Hours Across 5 Members)

| Team | Role Title | Team Member | Direct Story Implementation | Sprint Governance / QA / Research | Total Allocated Capacity |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **Team 6** | **Project Manager** | **Jeetkumar** | 0h | 10h (Kanban governance, WIP limits $\le 2$, DoD checks) | **10h** (10.9%) |
| **Team 6** | **Product / Research Lead** | **AmirHossein** (`@ettefagh`) | 8h ([#8 US-05](https://github.com/ettefagh/CM-LAB/issues/8): statutory BGB notices) | 6h (Policy Wiki curation & German tax brief) | **14h** (15.2%) |
| **Team 6** | **UX/UI Lead** | **Prushti** | 26h ([#4 US-01](https://github.com/ettefagh/CM-LAB/issues/4): 16h; [#7 US-04](https://github.com/ettefagh/CM-LAB/issues/7): 10h) | 0h | **26h** (28.3%) |
| **Team 6** | **Development Lead** | **Kyle** | 22h ([#5 US-02](https://github.com/ettefagh/CM-LAB/issues/5): 6h vault DB; [#6 US-03](https://github.com/ettefagh/CM-LAB/issues/6): 16h alert engine) | 0h | **22h** (23.9%) |
| **Team 6** | **Quality / Media Lead** | **Mojtaba** | 20h ([#5 US-02](https://github.com/ettefagh/CM-LAB/issues/5): 10h `<1.5MB` photo compression & SHA-256; [#8 US-05](https://github.com/ettefagh/CM-LAB/issues/8): 10h PDF/text dossier generator) | 0h (Leads $\ge 75\%$ automated test suite & QA sign-off) | **20h** (21.7%) |
| **Total** | **5 Cross-Functional Leads** | **Team 6 Roster** | **76h (23 Must-Have SP)** | **16h** | **92h (100.0%)** |

---

## 📊 Rebuilt 16:9 Investor Pitch Deck Preview

| Slide 1: Hook & Core Problem | Slide 2: User Discovery Insights | Slide 3: Solution & 4-Stage Engine |
| :---: | :---: | :---: |
| ![Slide 1](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-1.png) | ![Slide 2](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-2.png) | ![Slide 3](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-3.png) |
| **Slide 4: Core MVP & Policy Wiki (MCP)** | **Slide 5: Market Validation & Wedge** | **Slide 6: Roadmap & Team 6** |
| ![Slide 4](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-4.png) | ![Slide 5](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-5.png) | ![Slide 6](./Warranty_Wallet_Pitch_Deck_Rebuilt-page-6.png) |

---

## 🛠️ Syncing to GitHub Projects (v2) UI Board (`https://github.com/ettefagh/CM-LAB/projects`)

All 30 issues, 10 milestones, and 27 labels (including `column: 1-backlog` through `column: 5-done` and the 5 `owner: ...` member labels) are live on [`ettefagh/CM-LAB`](https://github.com/ettefagh/CM-LAB/issues). To also populate the native **GitHub Projects (v2)** visual Kanban board at [`https://github.com/ettefagh/CM-LAB/projects`](https://github.com/ettefagh/CM-LAB/projects):

```powershell
# 1. Grant the `project` scope to your GitHub CLI token (one-time browser confirmation):
gh auth refresh -h github.com -s project,read:project

# 2. Run the automated Team 6 Projects v2 setup & population script:
python setup_github_project_v2.py
```
