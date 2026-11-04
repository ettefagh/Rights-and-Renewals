# 🔍 Product Strategy, Empirical Discovery & German Legal/Tax Research

**Role Title:** Product / Research Lead (Member B)  
**Role Owner:** **AmirHossein** (`@ettefagh`)  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH University of Applied Sciences — WiSe 2026 · Instructor: Prof. Franziska Schwarz)  
**Assigned Capacity:** **14h Total Sprint 1 Commitment** (`8h` Direct Story Implementation on `US-05` Statutory BGB Notice Templates + `6h` Policy Wiki Curation & German Tax Research Overhead out of Team 6's `92h` Sprint Budget — `15.2%`)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 📚 Product / Research Lead Specification Suite (`DOC-PRD-00` – `DOC-PRD-04`)

All product requirements, statutory BGB notice templates, Policy Wiki knowledge graph datasets, and German income tax compliance specifications in this directory are strictly scoped to **Product / Research Lead (AmirHossein — Member B)** responsibilities and aligned 1:1 with **Kyle** *(Development Lead)*, **Prushti** *(UX/UI Lead)*, **Mojtaba** *(Quality / Media Lead)*, and **Jeetkumar** *(Project Manager)*:

| Spec ID | Specification / Dataset Artifact | Primary Scope & Engineering Integration Contract | Mapped GitHub Issues & ADRs |
| :---: | :--- | :--- | :--- |
| **`DOC-PRD-00`** | [**`00_Product_Research_Lead_Role_and_Deliverables_Matrix.md`**](./00_Product_Research_Lead_Role_and_Deliverables_Matrix.md) | Official Role Charter, `14h / 92h` Sprint 1 Capacity Reconciliation, Cross-Functional Boundary Separation Matrix (`AmirHossein` vs. `Kyle`, `Mojtaba`, `Prushti`, `Jeetkumar`), 12-Issue Traceability Matrix, Causal **`ADR-02`** & **`ADR-03`** (plus `ADR-01` discovery evidence), and 7-Gate DoD Sign-Off. | `#3`, `#8`, `#9`, `#11`, `#14`, `#15`, `#19`, `#20`, `#21`, `#24`, `#28`, `#29` |
| **`DOC-PRD-01`** | [**`01_Empirical_User_Discovery_and_Product_Requirements_PRD.md`**](./01_Empirical_User_Discovery_and_Product_Requirements_PRD.md) | Synthesis of Consumer Interviews 1–4, Session 3 Thermal OCR Failure Benchmark (`42%` failure, `0%` warranty extraction, `$0.02–$0.15/scan`), Session 4 Peer Lab with **Team 7** (`38.0s -> 11.4s`, `Iteration C-3`), Walkthroughs A & B (`#25`, `#26`), Full MoSCoW Scope Lock (`49 SP`, fencing out `US-09` OCR), and Gherkin Scenarios across Views 1–6. | `US-01`–`US-09` (`#1`–`#13`), `#17`, `#18`, `#22`–`#28` |
| **`DOC-PRD-02`** | [**`02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md`**](./02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md) | Deterministic `BGB` Date & Remedy State Machine (`§§ 187, 188, 193, 434, 437, 438, 439, 475e, 477 Abs. 1, 309 Nr. 9, 312g, 355, 312k Abs. 6`), Civil Evidentiary Fallbacks (`§ 286 ZPO` *Kontoauszug*), **5 Verbatim Bilingual DE/EN Notice Templates** (`{{slot}}` parity with Kyle & Mojtaba), and **BGH VIII ZR 285/18 (*LexFox*)** / `§§ 2, 3 RDG` Safe Harbor. | `US-05` (`#3`, `#8`), `R-2` (`#14`), `R-3` (`#15`), `D-2` (`#19`), `C-3` (`#24`), `ADR-03` (`#29`) |
| **`DOC-PRD-03`** | [**`03_Policy_Wiki_Knowledge_Graph_and_Brand_Dataset_Spec.md`**](./03_Policy_Wiki_Knowledge_Graph_and_Brand_Dataset_Spec.md) | Zero-Transformation Dual-Projection Schema Bridge (`PolicyRecord` in MCP `DEV-03` $\leftrightarrow$ `PolicyWikiEntry` in Dexie `DEV-02`), Draft-07 JSON Schema, Staleness & 4-Point `§ 312k` Dark-Pattern Audit Rubric, and Full Verification Dossier for all **20 Student Hardware & Subscription Brands**. | `US-06` (`#9`), `US-07` (`#10`), `R-2` (`#14`), `R-4` (`#16`), `D-3` (`#20`), `ADR-03` (`#29`) |
| **`DATA-PRD-03`** | [**`policy_wiki_seed_v1.json`**](./policy_wiki_seed_v1.json) | Machine-readable, zero-transformation JSON array of all **20 verified student brands** (`spotify`, `netflix`, `amazon-prime`, `adobe`, `fitx`, `mcfit`, `jetbrains`, `github-copilot`, `chatgpt-plus`, `icloud`, `apple`, `sony`, `samsung`, `mediamarkt`, `saturn`, `anker`, `lenovo`, `dyson`, `bose`, `nintendo`) ready for direct import into `SEED_POLICIES` and `db.policy_wiki.bulkPut()`. | `US-06` (`#9`), `D-3` (`#20`), `US-01` (`#4` Autocomplete) |
| **`DOC-PRD-04`** | [**`04_German_Tax_Werbungskosten_and_GoBD_Compliance_Brief.md`**](./04_German_Tax_Werbungskosten_and_GoBD_Compliance_Brief.md) | Statutory Analysis of `§ 9 Abs. 1 S. 3 Nr. 6 EStG` (*Werbungskosten* / *Verlustvortrag* `§ 10d EStG`) vs. `§ 10 Abs. 1 Nr. 7 EStG` (*Sonderausgaben*), **BMF Guidance 22.02.2022 (`BStBl I 2022 S. 187`)** 1-Year 100% *Sofortabschreibung* Taxonomy, Mixed-Use Allocation (`>=90% = 100%`, `50/50` default), `GoBD Rn. 108–110` `SHA-256` Immutability, WISO/Taxfix/ELSTER CSV Contract, and `§§ 2, 3, 5 StBerG` Safe Harbor. | `US-08` (`#11`), `R-3` (`#15`), `D-4` (`#21` — Done), `Walkthrough A` (`#25`) |

---

## 🔗 Cross-Role Integration Pointers

1. **To Kyle (Development Lead — `../development-lead/`):**
   * Import [`policy_wiki_seed_v1.json`](./policy_wiki_seed_v1.json) directly into both `mcp-server/index.ts` (`SEED_POLICIES` `O(1)` hash map in `03_MCP_Server_and_JSON_RPC_Integration_Spec.md`) and `WalletDatabase.policy_wiki` (`02_Offline_First_Local_Database_Architecture.md`) with zero field-renaming glue.
   * Use the calendar-month statutory boundary rules (`§§ 187, 188 Abs. 2, 193 BGB`) and 5 deterministic template branches in [`02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md`](./02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md) §3 & §5 inside `claim_dossier_generate`.
2. **To Mojtaba (Quality / Media Lead — `../quality-media-lead/`):**
   * Consume the 5 bilingual `{{variable}}` templates and mandatory `BGH VIII ZR 285/18` (`§§ 2, 3 RDG`) footer from [`02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md`](./02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md) §5 for **Media Format 2 (`US-05`, `D-2 #19`)** PDF & `.txt`/clipboard fallback compilation.
   * Enforce pre-encryption Web Crypto `SHA-256` receipt hashing per [`04_German_Tax_Werbungskosten_and_GoBD_Compliance_Brief.md`](./04_German_Tax_Werbungskosten_and_GoBD_Compliance_Brief.md) §5 (`GoBD Rn. 108–110`) and UTF-8-BOM `;`-delimited CSV formatting for `US-08 (#11)`.
3. **To Prushti (UX/UI Lead — `../ux-ui-lead/`):**
   * Bind View 2 `<15s` brand typeahead (`Iteration C-1 #22`) to `search_aliases` and `default_tax_category` in [`policy_wiki_seed_v1.json`](./policy_wiki_seed_v1.json), and render View 3's unified 24-month progress bar highlighting the active 12-month `BGB § 477 Abs. 1` *Beweislastumkehr* zone (`Iteration C-3 #24`).
4. **To Jeetkumar (Project Manager — `../project-manager/`):**
   * Audit Gate 7 DoD compliance (`#30`) against [`00_Product_Research_Lead_Role_and_Deliverables_Matrix.md`](./00_Product_Research_Lead_Role_and_Deliverables_Matrix.md) §6.2, `Risk R-2 (#14)`, and `Risk R-3 (#15)`.

---

## 📋 Assigned GitHub Issues & Ownership (`@ettefagh`)

| Issue | Title | Story Points | Column Status | Focus & Deliverable Mapping |
| :---: | :--- | :---: | :---: | :--- |
| [**#3**](https://github.com/ettefagh/CM-LAB/issues/3) | `[Panel A Core Story US3] 1-Tap Statutory Claim & Cancel Generator` | 5 SP | `2. Ready (Sprint 1)` | Co-owned with Mojtaba; statutory BGB notice formulations (`DOC-PRD-02`) |
| [**#8**](https://github.com/ettefagh/CM-LAB/issues/8) | `[Backlog US-05] 1-Tap Claim & Cancellation Generator (BGB Notices)` | 5 SP | `2. Ready (Sprint 1)` | `8h` Sprint 1 direct template authoring (`§§ 437, 477 Abs. 1, 312k Abs. 6`) (`DOC-PRD-02`) |
| [**#9**](https://github.com/ettefagh/CM-LAB/issues/9) | `[Backlog US-06] Subscription & Warranty Policy Wiki (Top 20 Brands)` | 5 SP | `1. Backlog` | `18h` Session 6 structured JSON knowledge graph (`DOC-PRD-03` + `policy_wiki_seed_v1.json`) |
| [**#11**](https://github.com/ettefagh/CM-LAB/issues/11) | `[Backlog US-08] German Tax Tagging & Werbungskosten Export` | 3 SP | `1. Backlog` | `10h` Session 7 BMF 2022 / `§ 9 EStG` CSV & PDF tax export (`DOC-PRD-04`) |
| [**#14**](https://github.com/ettefagh/CM-LAB/issues/14) | `[Risk R-2] Subscription Dark Patterns & Shifting Terms` | — | `3. In Progress` | Mitigated via pre-seeded `BGB § 309 Nr. 9` & `§ 312k Abs. 6` remedies (`DOC-PRD-02`, `DOC-PRD-03`) |
| [**#15**](https://github.com/ettefagh/CM-LAB/issues/15) | `[Risk R-3] Regulatory Liability: RDG & StBerG Disclaimers` | — | `4. In Review / QA` | `BGH VIII ZR 285/18` (*LexFox*) & `§§ 2, 3, 5 StBerG` safe harbors (`DOC-PRD-02`, `DOC-PRD-04`) |
| [**#19**](https://github.com/ettefagh/CM-LAB/issues/19) | `[Deliverable D-2] Dual Purposeful Media Formats Integration` | — | `3. In Progress` | Co-owned with Mojtaba; Media Format 2 legal content & interpolation slots (`DOC-PRD-02`) |
| [**#20**](https://github.com/ettefagh/CM-LAB/issues/20) | `[Deliverable D-3] Policy Wiki v1 Seed Dataset & MCP Spec` | — | `4. In Review / QA` | Dual-store reconciled JSON seed of all 20 student brands (`DOC-PRD-03` + `policy_wiki_seed_v1.json`) |
| [**#21**](https://github.com/ettefagh/CM-LAB/issues/21) | `[Deliverable D-4] German Tax Receipt Research Brief & Schema` | — | `5. Done` | Completed `§ 9 EStG` / `BMF 22.02.2022` / `GoBD` brief & DB schema (`DOC-PRD-04`) |
| [**#24**](https://github.com/ettefagh/CM-LAB/issues/24) | `[Peer Lab Iteration C-3] Unified Visual BGB § 477 Timeline` | — | `5. Done` | Co-owned with Prushti; 12-month reversed burden of proof bar (`DOC-PRD-01`, `DOC-PRD-02`) |
| [**#28**](https://github.com/ettefagh/CM-LAB/issues/28) | `[ADR-02] Unifying Subscriptions Alongside Physical Hardware` | — | `5. Done` | Causal decision documentation grounded in Interviews 2 & 4 (`DOC-PRD-00`, `DOC-PRD-01`) |
| [**#29**](https://github.com/ettefagh/CM-LAB/issues/29) | `[ADR-03] Deterministic 1-Tap Claim Generator & MCP Policy Wiki` | — | `5. Done` | Causal decision documentation preventing LLM legal hallucinations (`DOC-PRD-00`, `DOC-PRD-02`) |

---

## ⚖️ Key Statutory Foundations & Regulatory References

### 1. German Consumer Hardware Rights (*Verbrauchsgüterkauf*)
* **`BGB §§ 434, 437`:** Unified subjective/objective conformity standard and primary statutory buyer remedies (*Rechte des Käufers bei Mängeln*).
* **`BGB § 438 Abs. 1 Nr. 3`:** Mandatory 24-month statutory seller limitation period (*Verjährungsfrist*), non-waivable in B2C new-goods contracts (`§ 476 Abs. 1 BGB`).
* **`BGB § 439 Abs. 1–4 & § 475 Abs. 3`:** Buyer's primary election between free repair (*Nachbesserung*) or brand-new replacement (*Nachlieferung*); seller bears 100% of shipping, labor, and material costs with zero compensation for prior use.
* **`BGB § 477 Abs. 1`:** 12-month reversed burden of proof (*Beweislastumkehr*) favoring consumers under EU Directive (EU) 2019/771.
* **`BGB § 475e Abs. 1 & Abs. 3`:** 4-month suspension of expiry (*Ablaufhemmung*) upon defect manifestation + 2-month suspension post-repair/inspection return.

### 2. German Subscription & Distance Contract Law
* **`BGB § 309 Nr. 9` (*Gesetz für faire Verbraucherverträge*):** Maximum 1-month rolling cancellation notice after initial minimum commitment; silent 12-month auto-extensions and post-Year-1 early termination penalties are void.
* **`BGB §§ 312g, 355`:** 14-day statutory cooling-off right of withdrawal (*Widerrufsrecht*) for distance contracts.
* **`BGB § 312k` & `§ 312k Abs. 6`:** Mandatory 2-step online cancellation button (*Kündigungsbutton*); non-compliance grants consumers an immediate right to **terminate at any time without notice (*fristlose Kündigung jederzeit*)**.

### 3. German Income Tax Law (*Werbungskosten*) & Legal/Tax Safe Harbors
* **`§ 9 Abs. 1 S. 3 Nr. 6 EStG` & `§ 10d EStG` vs. `§ 10 Abs. 1 Nr. 7 EStG`:** Deductible *Arbeitsmittel* & unlimited *Verlustvortrag* for Master's/*Zweitstudium* and *Werkstudenten* vs. €6,000/yr *Sonderausgaben* for *Erststudium*.
* **`BMF Guidance 22.02.2022` (`IV C 3 - S 2190/21/10002 :025`, `BStBl I 2022 S. 187`):** 1-year useful life enabling **100% immediate write-off (*Sofortabschreibung*)** in the purchase year for computer hardware, monitors, peripherals, and software regardless of the €800 net / €952 gross GWG cap.
* **`GoBD Rn. 108–110 & Rn. 130`:** Mobile capture & pre-encryption client-side `SHA-256` cryptographic hashing (`receiptSha256`) ensuring evidentiary immutability.
* **Safe Harbors (`BGH VIII ZR 285/18`, `§§ 2, 3 RDG`, `§§ 2, 3, 5 StBerG`):** Deterministic schematic document compilation and receipt cataloging with mandatory non-removable regulatory disclaimers.
