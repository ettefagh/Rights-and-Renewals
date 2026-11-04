# 🎯 Project Goal & AI Agent Operational Charter

**Project:** Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)  
**Academic Module:** *Computer & Media Lab* (WiSe 2026, SRH Hochschule) · **Instructor:** Prof. Franziska Schwarz  
**Repository:** [`https://github.com/ettefagh/CM-LAB`](https://github.com/ettefagh/CM-LAB) · **Active Milestone:** Session 5 (MVP Scope Lock Gate)  

---

## 🚀 Mission Statement
Deliver an **offline-first, zero-cloud Progressive Web App (PWA) and Model Context Protocol (MCP) Server** enabling German university students and young professionals to:
1. **Capture** any physical hardware purchase or digital subscription in **$<15\text{ seconds}$** (`11.4s` benchmark).
2. **Store** encrypted receipts and GoBD-compliant `SHA-256` proofs locally on-device with zero privacy leakage (`GDPR Art. 25`).
3. **Alert** users before statutory 12-month burden-of-proof cliffs (`BGB § 477 Abs. 1`) and auto-renewals (`09:00 Europe/Berlin`).
4. **Act** via 1-tap formal German legal letters (`BGB §§ 437, 439, 309 Nr. 9, 312k Abs. 6`) and German tax write-offs (`§ 9 EStG` / BMF 2022).

---

## 👥 Team 6 Roster & Ownership (92h Sprint 1)

| Member | First Name | Role | Sprint 1 Capacity | Core Jurisdiction & Key Issue |
| :--- | :--- | :--- | :---: | :--- |
| **Member E** | **Jeetkumar** | Project Manager | `10h` | Kanban board governance, WIP limit $\le 2$, 7-Gate DoD audit ([#30](https://github.com/ettefagh/CM-LAB/issues/30)). |
| **Member B** | **AmirHossein** | Product / Research Lead | `14h` | BGB notice formulations ([#8](https://github.com/ettefagh/CM-LAB/issues/8)), Top 20 Policy Wiki ([#9](https://github.com/ettefagh/CM-LAB/issues/9)), BMF 2022 tax ([#11](https://github.com/ettefagh/CM-LAB/issues/11)). |
| **Member C** | **Prushti** | UX / UI Lead | `26h` | Views 1–5 Svelte 5 components ([#1](https://github.com/ettefagh/CM-LAB/issues/1)), Design tokens, Storybook CSF ([#4](https://github.com/ettefagh/CM-LAB/issues/4)). |
| **Member D** | **Kyle** | Development Lead | `22h` | Dexie.js v4 storage ([#5](https://github.com/ettefagh/CM-LAB/issues/5)), push scheduler ([#6](https://github.com/ettefagh/CM-LAB/issues/6)), Worker `/api/mcp` ([#10](https://github.com/ettefagh/CM-LAB/issues/10)). |
| **Member A** | **Mojtaba** | Quality / Media Lead | `20h` | `<1.5MB` Web Worker compression + GoBD `SHA-256` ([#5](https://github.com/ettefagh/CM-LAB/issues/5)), PDF/Text compiler ([#19](https://github.com/ettefagh/CM-LAB/issues/19)), Vitest suite. |

---

## 🏛️ Ratified System Architecture (`ADR-04`)

```
[Cloudflare Edge Plane]
  • Astro 6 App Shell on Cloudflare Workers (wrangler.jsonc)
  • Authoritative MCP Endpoint: POST /api/mcp (Zod -32602 validated, <30ms latency)
  • Phase 1: In-memory Top 20 Seed (policy_wiki_seed_v1.json)
  • Phase 2: EmDash CMS (emdashcms.dev) + Cloudflare D1 (ec_policy_wiki) + Workers KV

[Client Device Plane - 100% Offline-First]
  • Single Root Island: <WalletApp client:only="svelte" /> (~11.8 KB gzip)
  • Reactive State: wallet.svelte.ts (Svelte 5 Runes: $state.raw + createSubscriber)
  • Local Persistence: Dexie.js v4 (IndexedDB) with AES-GCM-256 encrypted blobs
  • Pure TS Engine: PrefixTrie.ts (<10ms), AlertScheduler.ts (0h DST drift)
  • Media Pipeline: Web Worker downsampler (<1.5MB) + Pre-Encryption GoBD SHA-256
```

---

## 📱 6 Core Views & MVP Deliverables

* **View 1: Dashboard (`US-04`)** — Unified list with live countdowns and urgency badges (🟢 Protected, 🟡 Expiring Soon, 🔴 Urgent).
* **View 2: Quick Capture Modal (`US-01`)** — Sub-15s entry via Prefix-Trie autocomplete, auto-filling `BGB § 438`/`§ 309 Nr. 9` terms + BMF 2022 tax toggle.
* **View 3: Item Detail & Timeline (`Iteration C-3`)** — Interactive 24m warranty bar highlighting the 12m `BGB § 477` cliff + pinch-to-zoom receipt viewer.
* **View 4: 1-Tap Claim & Cancel (`US-05`, `D-2`)** — Live preview of formal German legal letters (`BGB §§ 437, 439, 312k Abs. 6`) + 1-tap PDF/clipboard export.
* **View 5: German Tax Summary (`US-08`, `D-4`)** — Student/employee *Werbungskosten* summary table and CSV export.
* **View 6: Policy Wiki & MCP Explorer (`US-06`, `US-07`, `D-3`)** — Public brand directory + interactive console to test MCP JSON-RPC 2.0 calls.

---

## ⚠️ Non-Negotiable Agent Guardrails (The 5 Red Lines)

1. **NO OCR in MVP (`ADR-01` / `WON'T-HAVE #12`):** Cloud/camera OCR fails on 42% of faded thermal receipts and costs token fees. Entry must strictly use the manual-first `<15s` autocomplete flow.
2. **ZERO Cloud Plaintext Receipts (`GDPR Art. 25`):** Raw receipt images and personal items stay 100% in local IndexedDB. Cloudflare edge only handles public brand policies and stateless `/api/mcp` requests.
3. **NO Hallucinated Legal Advice (`Risk R-3 #15` / `ADR-03`):** Legal letters MUST use the deterministic templates in `02_German_Consumer_Law_BGB_and_Statutory_Templates_Spec.md` and embed mandatory **BGH VIII ZR 285/18 (*LexFox*) / RDG §§ 2, 3** safe-harbor disclaimers.
4. **NO Mobile Safari Camera Lockout:** `public/_headers` must enforce `Permissions-Policy: camera=(self)` and **strictly omit `Cross-Origin-Embedder-Policy: require-corp`** so camera capture never deadlocks.
5. **STRICT 92h Sprint Budget (`Risk R-5 #17`):** Phase 1 MVP boots strictly from bundled `policy_wiki_seed_v1.json`. Do not introduce Cloudflare D1 migrations or external cloud databases into the Session 5 critical path.

---

## 📂 Key File Fast-Index

* **Architecture Decision Records:** [`research/architecture-evaluation/04_Multi_Agent_Architecture_and_Deployment_Debate_Synthesis.md`](file:///c:/Users/admin/Documents/antigravity/optimistic-bardeen/research/architecture-evaluation/04_Multi_Agent_Architecture_and_Deployment_Debate_Synthesis.md) (`ADR-04`)
* **Dev Lead Specs:** [`development-documents/development-lead/`](file:///c:/Users/admin/Documents/antigravity/optimistic-bardeen/development-documents/development-lead/) (`00_` through `04_`)
* **Product/Legal Specs:** [`development-documents/product-research-lead/`](file:///c:/Users/admin/Documents/antigravity/optimistic-bardeen/development-documents/product-research-lead/) (`00_` through `04_` + `policy_wiki_seed_v1.json`)
* **PM Governance & Gates:** [`development-documents/project-manager/GATE_STATUS.md`](file:///c:/Users/admin/Documents/antigravity/optimistic-bardeen/development-documents/project-manager/GATE_STATUS.md)
* **GitHub Projects Board:** [https://github.com/users/ettefagh/projects/4](https://github.com/users/ettefagh/projects/4)
