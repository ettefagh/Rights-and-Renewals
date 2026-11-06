# 📊 Project Management & Governance Hub

**Role Title:** Project Manager  
**Role Owner:** **Jeetkumar (Member E)**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule Heidelberg / Berlin, WiSe 2026)  
**Instructor:** Prof. Franziska Schwarz  
**Assigned Capacity:** **10h Sprint Governance & Quality Verification** (10.9% of 92h Sprint Total)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  
**Governing Documents:** [`BLUEPRINT.md`](../../BLUEPRINT.md) · [`GOAL.md`](../../GOAL.md)

---

## 🧭 Governance Documents Index

| Document | Purpose & Contents | Primary Owner | Status |
| :--- | :--- | :---: | :---: |
| [**`GATE_STATUS.md`**](./GATE_STATUS.md) | **7-Gate Definition of Done & Pre-Build Gate Audit Ledger:** Tracks Gate 0 Pre-Build architectural sign-off (`ADR-01`–`ADR-05`) and the 7 Sprint 1 Quality Gates under Issue #30. | Jeetkumar & Mojtaba | **Active SSOT** |
| [**`ISSUE_ORCHESTRATOR_STATUS_REPORT.md`**](./ISSUE_ORCHESTRATOR_STATUS_REPORT.md) | **Live GitHub Issue & Project 4 Audit Report:** Comprehensive audit of 30 issues, 10 milestones, and 5-member WIP limit compliance. | Jeetkumar | **Active Audit** |
| [**`synthesis.md`**](./synthesis.md) | **Master Pre-Build Governance & Sprint 1 Framework:** Sprint 1 capacity reconciliation (92h), 5 Red Lines, causal ADR syntax, and SRH AI disclosure compliance. | Jeetkumar | **Active Framework** |

---

## 🎯 Role Objectives & Governance Mandate

As **Project Manager**, **Jeetkumar** is responsible for agile sprint planning, backlog orchestration, team cadence, and ensuring strict adherence to course requirements and engineering quality standards:

1. **Agile Kanban Board Governance:** Maintain the official 5-column GitHub Projects (v2) board ([https://github.com/users/ettefagh/projects/4](https://github.com/users/ettefagh/projects/4)).
2. **Work-in-Progress (WIP) Enforcement:** Enforce a strict WIP limit of $\le 2$ active tasks per member in Column 3 (`3. In Progress`).
3. **MoSCoW Backlog & Scope Fence:** Guard against scope creep into premature OCR scanning, automated bank scraping (PSD2), or live ELSTER filing (`Risk R-5`, `#17`).
4. **7-Gate Definition of Done (DoD):** Verify all 7 quality gates prior to approving issues into Column 5 (`5. Done`).
5. **Architectural Decision Record (ADR) Governance:** Maintain causal decision log syntax (*"We chose / changed [X] because [Y], supported by [Z]"*).

---

## 📋 Assigned GitHub Issues & Ownership

| Issue | Title | Story Points | Column Status | Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#15**](https://github.com/ettefagh/CM-LAB/issues/15) | `[Risk R-3] Regulatory Liability: Legal Services Act (RDG) & Tax Advisory (StBerG)` | — | `4. In Review / QA` | Co-owned with AmirHossein; ensure LexFox disclaimer compliance |
| [**#17**](https://github.com/ettefagh/CM-LAB/issues/17) | `[Risk R-5] Scope Creep Across Hardware, Subscriptions, Banking Sync & Taxes` | — | `4. In Review / QA` | Strict MoSCoW boundary enforcement & WIP limit $\le 2$ |
| [**#21**](https://github.com/ettefagh/CM-LAB/issues/21) | `[Deliverable D-4] German Tax Receipt Research Brief & Schema` | — | `5. Done` | Co-owned with AmirHossein; review & verification |
| [**#27**](https://github.com/ettefagh/CM-LAB/issues/27) | `[ADR-01] Pivot from Automated OCR Receipt Scanning to <15s Manual-First Flow` | — | `5. Done` | Documented causal rationale and benchmarking evidence |
| [**#30**](https://github.com/ettefagh/CM-LAB/issues/30) | `[Governance & DoD] Team 6 Sprint Capacity Reconciliation (92h) & 7-Gate DoD` | — | `4. In Review / QA` | Master sprint capacity allocation and DoD verification tracker |

---

## 📅 Team Cadence & Agile Rituals

* **Weekly Async Standup:** Tuesdays at 18:00 CET via Slack/Discord.
* **Pre-Lab Sync:** Fridays at 09:30 CET (30 minutes prior to SRH lab session).
* **Bi-Weekly Retrospective:** Following Friday lab sessions.
