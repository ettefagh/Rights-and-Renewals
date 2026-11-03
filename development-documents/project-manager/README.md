# 📊 Project Management & Governance

**Role Title:** Project Manager  
**Role Owner:** **Jeetkumar**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 10h Sprint Governance & Quality Verification (10.9% of 92h Sprint Total)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

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

* **Weekly Async Standup:** Tuesdays at 18:00 CET via Slack/Discord:
  * *What did I complete since last sync?*
  * *What am I committing to deliver before Friday lab?*
  * *Are there any blockers or dependencies?*
* **Pre-Lab Sync:** Fridays at 09:30 CET (30 minutes prior to SRH lab session):
  * Align on live demo deliverables, review peer feedback, and calibrate sprint velocity.
* **Bi-Weekly Retrospective:** Following Friday lab sessions:
  * Review completed user stories, inspect WIP bottlenecks, and refine next sprint backlog.

---

## 🛡️ Risk Management Matrix (PM Focus)

| Risk ID | Title | Severity | Mitigation Strategy | Early Warning Trigger |
| :---: | :--- | :---: | :--- | :--- |
| **R-1** | OCR Token Cost Trap & Onboarding Churn | **CRITICAL** | Manual-first `<15s` 3-field entry; camera strictly serves as receipt photo vault (`US-02`). | Manual entry stopwatch exceeds 15.0s (currently `11.4s`). |
| **R-3** | Regulatory Liability (RDG §§ 2, 3 / StBerG § 2) | **MEDIUM** | Restrict to deterministic document drafting under BGH VIII ZR 285/18; mandatory disclaimers. | Missing disclaimer on exported PDF/text dossier or tax view. |
| **R-5** | Scope Creep Across Hardware, Subs, Banking & Taxes | **CRITICAL** | Strict MoSCoW boundaries; ban PSD2 banking sync & live ELSTER filing; enforce WIP $\le 2$. | Any member with $>2$ active `In Progress` tasks. |
