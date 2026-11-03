# 🔍 Product Strategy & Legal/Policy Research

**Role Title:** Product / Research Lead  
**Role Owner:** **AmirHossein** (`@ettefagh`)  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 14h Total (8h Direct Story Implementation + 6h Research & Wiki Curation)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 🎯 Role Objectives & Research Mandate

As **Product / Research Lead**, **AmirHossein** drives product problem framing, empirical user research, German consumer law alignment, German income tax compliance, and the structured curation of the Policy Wiki knowledge graph:

1. **Empirical User Discovery Synthesis:** Ground backlog decisions in real consumer interview data (Persons 1–4: Laptop defect at 14m, Phone charger RMA paralysis, Washing machine faded thermal ink, Working student German tax *Werbungskosten*).
2. **German Civil Code (BGB) Statutory Formulation:** Draft legally verified templates for statutory warranty notices (*Mängelrüge*) and subscription cancellations (*Kündigungsschreiben*).
3. **German Tax Law Compliance:** Ensure digital hardware and peripherals follow **BMF Guidance of 22.02.2022 (`BStBl I 2022 S. 187`)** for **1-year 100% immediate depreciation (*Sofortabschreibung*)** under `§ 9 EStG` (*Werbungskosten*).
4. **Top 20 Brand Policy Wiki (JSON Schema):** Curate verified cancellation windows, RMA endpoints, and legal notice requirements for top student services (`US-06`, `D-3`).
5. **Regulatory Disclaimers:** Embed mandatory legal-tech protection boundaries under **BGH VIII ZR 285/18** (*LexFox* doctrine), `RDG §§ 2, 3`, and `§ 2 StBerG`.

---

## 📋 Assigned GitHub Issues & Ownership

| Issue | Title | Story Points | Column Status | Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#3**](https://github.com/ettefagh/CM-LAB/issues/3) | `[Panel A Core Story US3] 1-Tap Statutory Claim & Cancel Generator` | 5 SP | `2. Ready (Sprint 1)` | Co-owned with Mojtaba; statutory BGB notice formulations |
| [**#8**](https://github.com/ettefagh/CM-LAB/issues/8) | `[Backlog US-05] 1-Tap Claim & Cancellation Generator (BGB Notices)` | 5 SP | `2. Ready (Sprint 1)` | 8h direct template authoring (`§§ 437, 477 Abs. 1, 312k Abs. 6`) |
| [**#9**](https://github.com/ettefagh/CM-LAB/issues/9) | `[Backlog US-06] Subscription & Warranty Policy Wiki (Top 20 Brands)` | 5 SP | `1. Backlog` | 18h structured JSON knowledge graph for Session 6 |
| [**#11**](https://github.com/ettefagh/CM-LAB/issues/11) | `[Backlog US-08] German Tax Tagging & Werbungskosten Export` | 3 SP | `1. Backlog` | 10h BMF 2022 / § 9 EStG tax export logic for Session 7 |
| [**#14**](https://github.com/ettefagh/CM-LAB/issues/14) | `[Risk R-2] Subscription Dark Patterns & Shifting Terms` | — | `3. In Progress` | Mitigation through pre-seeded BGB § 312k statutory remedies |
| [**#15**](https://github.com/ettefagh/CM-LAB/issues/15) | `[Risk R-3] Regulatory Liability: RDG & StBerG Disclaimers` | — | `4. In Review / QA` | LexFox doctrine disclaimers on claim & tax export flows |
| [**#19**](https://github.com/ettefagh/CM-LAB/issues/19) | `[Deliverable D-2] Dual Purposeful Media Formats Integration` | — | `3. In Progress` | Co-owned with Mojtaba; legal content & layout verification |
| [**#20**](https://github.com/ettefagh/CM-LAB/issues/20) | `[Deliverable D-3] Policy Wiki v1 Seed Dataset & MCP Spec` | — | `4. In Review / QA` | Curated JSON dataset of top 8 student brands for Session 5 |
| [**#21**](https://github.com/ettefagh/CM-LAB/issues/21) | `[Deliverable D-4] German Tax Receipt Research Brief & Schema` | — | `5. Done` | Completed legal tax brief & schema implementation |
| [**#24**](https://github.com/ettefagh/CM-LAB/issues/24) | `[Peer Lab Iteration C-3] Unified Visual BGB § 477 Timeline` | — | `5. Done` | Co-owned with Prushti; 12-month reversed burden of proof |
| [**#28**](https://github.com/ettefagh/CM-LAB/issues/28) | `[ADR-02] Unifying Subscriptions Alongside Physical Hardware` | — | `5. Done` | Causal decision documentation based on Person 2 & 4 |
| [**#29**](https://github.com/ettefagh/CM-LAB/issues/29) | `[ADR-03] Deterministic 1-Tap Claim Generator & MCP Policy Wiki` | — | `5. Done` | Causal decision documentation preventing LLM hallucinations |

---

## ⚖️ Key Statutory Foundations & Regulatory References

### 1. German Consumer Hardware Rights
* **BGB § 437:** Primary statutory warranty rights for defective goods (*Rechte des Käufers bei Mängeln*).
* **BGB § 438 Abs. 1 Nr. 3:** Statutory 2-year limitation period (*Verjährungsfrist* of 24 months).
* **BGB § 439:** Supplementary performance (*Nacherfüllung*) giving consumer initial choice between repair (*Nachbesserung*) or replacement (*Nachlieferung*).
* **BGB § 477 Abs. 1:** 12-month reversed burden of proof (*Beweislastumkehr*) favoring consumers under EU Directive 2019/771.
* **BGB § 475e Abs. 1:** 4-month suspension of expiry (*Ablaufhemmung*) following defect emergence.

### 2. German Subscription & Contract Law
* **BGB § 309 Nr. 9:** Maximum 1-month rolling cancellation notice after initial minimum term.
* **BGB § 312k:** Mandatory online cancellation button (*Kündigungsbutton*) on consumer web services.
* **BGB § 312k Abs. 6:** Statutory right to **immediate termination without notice (*fristloses Kündigungsrecht*)** if a merchant fails to provide a legally compliant cancellation button.

### 3. German Tax Law (*Werbungskosten*)
* **§ 9 EStG (*Werbungskosten*):** Income-related expenses deductible for students & employees.
* **BMF Guidance 22.02.2022 (`BStBl I 2022 S. 187`):** 1-year immediate 100% depreciation (*Sofortabschreibung*) for computer hardware, peripherals, and software, superseding historical €800 GWG depreciation schedules.
* **GoBD Rn. 108–110:** Immutability and audit compliance via client-side `SHA-256` receipt cryptographic hashing.
