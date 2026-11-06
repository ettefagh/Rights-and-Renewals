# 📁 Team 6 — Development Documents Hub

**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule*)  
**Course Module:** *Computer & Media Lab* (Wintersemester 2026) · **Instructor:** Prof. Franziska Schwarz  
**Working Team:** **Team 6**  
**Project:** *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 🧭 Overview & Directory Index

This directory serves as the centralized development documentation repository for **Team 6**. Each functional discipline maintains a dedicated documentation directory outlining role-specific architecture, technical specifications, task mappings, acceptance criteria, and deliverable protocols, reconciled under the canonical [**`BLUEPRINT.md`**](../BLUEPRINT.md) Single Source of Truth (`ADR-04` Astro 6 + Svelte 5 Runes + Dual-Domain `[Project].pages.dev` & `app.[Project].pages.dev`).

```
development-documents/
├── README.md                      # Master directory & team governance overview (this file)
├── project-manager/               # Jeetkumar: Sprint planning, Kanban, WIP limits, DoD
├── product-research-lead/         # AmirHossein: User discovery, BGB legal, Tax brief, Policy Wiki
├── ux-ui-lead/                    # Prushti: Wireframes, 6 Views, Design tokens, WCAG AA, UI flows
├── development-lead/              # Kyle: Offline-first DB, Push alerts (DST), Open MCP server
└── quality-media-lead/            # Mojtaba: Dual media formats (receipt vault + PDF dossier), QA suite
```

---

## 👥 Cross-Functional Team 6 Role Matrix

| Directory | Role Title | Team Member | Primary Focus & Deliverables | Direct Story Hours | Governance / Research | Total Committed |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| [`project-manager/`](./project-manager/) | **Project Manager** | **Jeetkumar** | Sprint planning, 5-column Kanban board governance, WIP limit ($\le 2$) enforcement, Risk Register (`R-3`, `R-5`), ADR-01, 7-Gate Definition of Done (`#30`). | 0h | 10h | **10h** (10.9%) |
| [`product-research-lead/`](./product-research-lead/) | **Product / Research Lead** | **AmirHossein** (`@ettefagh`) | User research (Persons 1–4), German Civil Code statutory notices (`BGB §§ 437, 477 Abs. 1, 309 Nr. 9, 312k Abs. 6`), German Tax *Werbungskosten* (`§ 9 EStG` / BMF 2022 `US-08`), Top 20 Brand Policy Wiki (`US-06`, `D-3`). | 8h | 6h | **14h** (15.2%) |
| [`ux-ui-lead/`](./ux-ui-lead/) | **UX/UI Lead** | **Prushti** | Figma wireframes, design system tokens, WCAG 2.1 AA accessibility ($\ge 48\times 48$px touch targets, $\ge 4.5:1$ contrast), `<15s` Manual Entry UI (`US-01`), Unified Dashboard & Urgency Badges (`US-04`), Walkthrough B (`#26`). | 26h | 0h | **26h** (28.3%) |
| [`development-lead/`](./development-lead/) | **Development Lead** | **Kyle** | Offline-first IndexedDB / SQLite architecture, `<15s` entry engine (`US-01`), Proactive 30/7/1-Day Push Alert Scheduler with dynamic CEST/CET DST recalibration (`US-03`), Open MCP JSON-RPC 2.0 Server (`US-07`), Walkthrough A (`#25`). | 22h | 0h | **22h** (23.9%) |
| [`quality-media-lead/`](./quality-media-lead/) | **Quality / Media Lead** | **Mojtaba** | Dual Purposeful Media Formats (`D-2`): **Media Format 1** (`<1.5MB` receipt photo compression, `SHA-256` GoBD hashing & offline zoom viewer in `US-02`) and **Media Format 2** (1-tap statutory PDF/text dossier generator in `US-05`), automated test suite ($\ge 75\%$ coverage). | 20h | 0h | **20h** (21.7%) |
| **Total Team 6** | **5 Functional Leads** | **Team 6 Roster** | **Active Milestone 1 / Session 5 Commitment** | **76h** | **16h** | **92h** (100.0%) |

---

## 🛠️ Engineering & Development Standards

### 1. Git Workflow & Branching Strategy
* **Default Branch:** `main` (Protected; all merges require peer review approval).
* **Branch Naming Scheme:**
  * `feature/<role>-<issue-number>-<short-description>` (e.g., `feature/dev-6-push-alert-scheduler`)
  * `fix/<role>-<issue-number>-<short-description>` (e.g., `fix/ux-4-date-picker-contrast`)
  * `docs/<role>-<topic>` (e.g., `docs/policy-wiki-top-20-brands`)

### 2. Definition of Done (7 Quality Gates)
No pull request or issue may be moved to `5. Done` without passing all 7 gates verified by **Jeetkumar** (PM) and **Mojtaba** (QA):
1. **Gate 1 (Core Journey):** End-to-end `Capture -> Store -> Alert -> Act` pipeline functional across Views 1–6.
2. **Gate 2 (Speed Benchmark):** Manual entry stopwatch verified at $<15$s (`11.4s` in Session 4 peer lab).
3. **Gate 3 (Gherkin AC):** 100% testable acceptance criteria pass rate across Must-Have stories (`US-01` to `US-05`).
4. **Gate 4 (MCP Protocol):** JSON-RPC 2.0 validation (`policy_lookup`, `claim_dossier_generate`, $<200$ms response, `-32602` error handling).
5. **Gate 5 (Code Quality & Tests):** Zero TypeScript/linter errors; automated test suite coverage $\ge 75\%$.
6. **Gate 6 (Accessibility & Responsive):** Tested on mobile viewports ($375\text{px}–412\text{px}$) with WCAG 2.1 AA compliance.
7. **Gate 7 (Legal Disclaimers):** Mandatory German legal disclaimers (`BGH VIII ZR 285/18`, `§§ 2, 3 RDG`, `§ 2 StBerG`) present on all export flows.
