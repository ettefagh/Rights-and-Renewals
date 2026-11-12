# 🏛️ Team 6 Master Pre-Build Governance & Sprint 1 Framework (`synthesis.md`)

**Document ID:** `CM-LAB-PM-SYNTHESIS-V1` · **Authoritative Version:** `1.1.0 (Session 5 MVP Scope Lock)`  
**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule* Heidelberg / Berlin)  
**Academic Module:** *Computer & Media Lab* (Wintersemester 2026) · **Supervising Faculty:** Prof. Franziska Schwarz  
**Author:** **Jeetkumar — Project Manager (Member E, Team 6)**  
**Cross-Functional Sign-Off:** AmirHossein (Product/Research), Prushti (UX/UI), Kyle (Development), Mojtaba (Quality/Media)  
**Governing Documents:** [`BLUEPRINT.md`](../../BLUEPRINT.md) · [`GOAL.md`](../../GOAL.md) · [`GATE_STATUS.md`](./GATE_STATUS.md)

---

## 1. Executive Summary & The Project Manager's Mandate

In accordance with Barry Boehm's Software Cost of Change curve, resolving structural ambiguities and alignment issues during the pre-build phase costs **$1\times$**, whereas discovering them during development costs **$10\times–30\times$**, and discovering them during the final viva examination with Prof. Franziska Schwarz costs **$50\times–200\times$** in academic standing and grading penalties.

To prevent both chaos and Big Design Up Front (BDUF), Team 6 enforces a **Two-Tiered Rolling Gate Model**:
1. **Tier 1 (Foundational Gate 0 — Pre-Build Lock):** Unifies all five functional disciplines into a single canonical contract ([`BLUEPRINT.md`](../../BLUEPRINT.md)), establishing the dual-domain deployment topology, shared TypeScript interfaces, and the 5 non-negotiable red lines before code merge.
2. **Tier 2 (Sprint 1 Delivery Gates — Issue #30):** Enforces 7 strict quality gates (G1 through G7) before any issue moves to `5. Done`.

---

## 2. Team 6 Sprint 1 Capacity Reconciliation (92.0 Hours Total)

Team 6 operates within a strictly locked **92-hour Sprint 1 capacity budget** allocated across five specialized engineering leads:

| Lead | Member ID | Core Jurisdictions & Key Deliverables | Direct Story SP | Direct Story Hours | Governance / Research | Total Committed |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Jeetkumar** | Member E | Agile Kanban governance, WIP limit $\le 2$, 7-Gate DoD audit ([#30](https://github.com/ettefagh/CM-LAB/issues/30)), Risk Register (`R-1`–`R-5`). | 0 SP | 0.0h | 10.0h | **10.0h** (10.9%) |
| **AmirHossein** | Member B | Statutory BGB notices (`US-05` [#8](https://github.com/ettefagh/CM-LAB/issues/8)), Top 20 Policy Wiki seed ([#20](https://github.com/ettefagh/CM-LAB/issues/20)), German tax brief ([#21](https://github.com/ettefagh/CM-LAB/issues/21)). | 8 SP | 8.0h | 6.0h | **14.0h** (15.2%) |
| **Prushti** | Member C | Dual-domain showcase & app layouts, Unified Omni-Bar, Calendar Widgets, Views 1–6 Svelte 5 + Storybook CSF ([#1](https://github.com/ettefagh/CM-LAB/issues/1), [#4](https://github.com/ettefagh/CM-LAB/issues/4), [#7](https://github.com/ettefagh/CM-LAB/issues/7)). | 8 SP | 26.0h | 0.0h | **26.0h** (28.3%) |
| **Kyle** | Member D | Dexie.js v4 storage vault ([#5](https://github.com/ettefagh/CM-LAB/issues/5)), push scheduler with 0h DST drift ([#6](https://github.com/ettefagh/CM-LAB/issues/6)), Worker `/api/mcp` ([#10](https://github.com/ettefagh/CM-LAB/issues/10)). | 11 SP | 22.0h | 0.0h | **22.0h** (23.9%) |
| **Mojtaba** | Member A | Web Worker `<1.5MB` image compression & GoBD SHA-256 hash stamp ([#5](https://github.com/ettefagh/CM-LAB/issues/5)), PDF/text dossier compiler ([#19](https://github.com/ettefagh/CM-LAB/issues/19)), $\ge 75\%$ Vitest suite. | 10 SP | 20.0h | 0.0h | **20.0h** (21.7%) |
| **Total Team 6** | **5 Leads** | **Session 5 MVP Scope Lock Gate Commitment** | **23 SP (Must-Have)** | **76.0h** | **16.0h** | **92.0h** (100.0%) |

---

## 3. The 5 Non-Negotiable Project Red Lines

The Project Manager enforces the following five immutable constraints at all times:
1. **NO OCR in MVP (`ADR-01` / `WON'T-HAVE #12`):** Cloud/camera OCR fails on $42\%$ of faded thermal receipts and burns token fees. All onboarding uses the sub-15s (`11.4s` benchmarked) manual-first Omni-Bar + photo vaulting flow.
2. **ZERO Cloud Plaintext Receipts (`GDPR Art. 25`):** Raw receipt images and personal items stay 100% in local IndexedDB. Cloudflare edge only handles public brand policies and stateless `/api/mcp` requests.
3. **NO Hallucinated Legal Advice (`Risk R-3 #15` / `ADR-03`):** Legal letters MUST use the deterministic templates in `DOC-PRD-02` and embed mandatory **BGH VIII ZR 285/18 (*LexFox*) / RDG §§ 2, 3** and **§ 2 StBerG** safe-harbor disclaimers.
4. **NO Mobile Safari Camera Lockout:** `public/_headers` must enforce `Permissions-Policy: camera=(self)` and **strictly omit `Cross-Origin-Embedder-Policy: require-corp`** so camera capture never deadlocks.
5. **STRICT 92h Sprint Budget (`Risk R-5 #17`):** Phase 1 MVP boots strictly from bundled `policy_wiki_seed_v1.json`. Do not introduce Cloudflare D1 migrations or external cloud databases into the Session 5 critical path.

---

## 4. Academic Rigor: Causal ADR Syntax & SRH AI Disclosure

### 4.1 Causal ADR Syntax Formula
In all coursework documentation and jury evaluations with Prof. Franziska Schwarz, Team 6 articulates decisions using the required causal formula:
$$\text{"We chose / changed [X] because [Y], supported by [Z]."}$$

* **ADR-01:** We chose an **in-memory brand Prefix-Trie autocomplete** because **mobile camera OCR exhibits a $42\%$ failure rate on faded thermal paper while adding $\$0.02\text{--}\$0.15$ token cost**, supported by **empirical peer testing where Team 7 completed capture in $11.4\text{s}$ with zero cloud API expenses**.
* **ADR-02:** We chose to **unify physical hardware warranties and recurring digital subscriptions** because **hardware-only trackers suffer from fatal retention decay ($1\text{--}3$ purchases/year)**, supported by **consumer subscription habituation ($5\text{--}12$ active services) maintaining active daily/monthly retention ($>40\%$)**.
* **ADR-03:** We chose **deterministic statutory document assembly** because **generative LLMs risk legal hallucination and violate the German Legal Services Act (*RDG §§ 2, 3*)**, supported by **the Federal Court of Justice (*BGH VIII ZR 285/18 LexFox*) jurisprudence**.
* **ADR-04:** We chose a **Hybrid Astro 6 app shell with a Single Root Svelte 5 Runes Island (`client:only="svelte"`)** because **pure Astro SSR cannot access client IndexedDB/WebCrypto while pure React 19 inflated bundle size to $68.4\text{ KB}$ with dual-write state drift**, supported by **Svelte 5 Runes cutting client JS by $82.7\%$ ($11.8\text{ KB}$ gzipped), reducing UI code by $34\%$, and delivering $1.4\text{ms}$ DOM patch reactivity**.
* **ADR-05:** We chose a **Dual-Domain architecture (`[Project].pages.dev` + `app.[Project].pages.dev`) with a persistent Omni-Bar** because **mixing public showcase/MCP developer docs with private personal vault workflows creates cognitive clutter**, supported by **sub-second static showcase loading alongside instant $<10\text{ms}$ multi-domain search across Policy Wiki, saved items, and new item creation**.

### 4.2 SRH University Generative AI Disclosure
Under the **SRH Orientation Framework (*Orientierungsrahmen v1.0*, 15.07.2025)**:
> *„Im Rahmen der Vorarbeit zur Systemarchitektur, der Modellierung von Entscheidungspfaden (ADRs) sowie zur iterativen Optimierung von UI-Komponenten und Datenstrukturen wurden KI-gestützte Entwicklungswerkzeuge (Google Gemini / Anthropic Claude) herangezogen. Alle generierten Vorschläge wurden durch das Entwicklungsteam kritisch auf Konformität mit BGB, GoBD und Web-Standards geprüft, architektonisch angepasst und eigenständig implementiert. Die finale Code- und Textbasis stellt eine eigenständige Ingenieurleistung dar.“*
