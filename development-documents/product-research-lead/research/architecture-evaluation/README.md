# 🏗️ Architecture, CMS & Framework Evaluation Suite (Team 6)

**Project:** *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Academic Context:** SRH University of Applied Sciences (*SRH Hochschule*) · *Computer & Media Lab* (WiSe 2026 · Prof. Franziska Schwarz)  
**Repository:** [`ettefagh/CM-LAB`](https://github.com/ettefagh/CM-LAB)  

---

## 📚 Document Index

### 1. Core Technical Investigations (`01_`–`03_`)

| Document ID | File | Focus & Scope |
| :---: | :--- | :--- |
| **`ARCH-EVAL-01`** | [`01_Cloudflare_Platform_and_Edge_Deployment_Investigation.md`](./01_Cloudflare_Platform_and_Edge_Deployment_Investigation.md) | **Cloudflare Unified Workers & Split-Plane Edge Architecture:** Static Assets + V8 Isolates (`wrangler.jsonc`), Public Policy Wiki on **D1 + KV** (`<8ms`), Private Local Vault on **Dexie.js v4 (`AES-GCM-256` + GoBD `SHA-256`)** with optional zero-knowledge **R2** ciphertext backup, Remote **MCP Server on Workers** (`19.8–31.5ms` RTT), zero-PII **`PushSchedulerDO` Durable Object** Web Push (`09:00 Europe/Berlin`), `$0.00/mo` Free Tier audit, and iOS Safari camera-safe `public/_headers`. |
| **`ARCH-EVAL-02`** | [`02_EmDash_CMS_for_Policy_Wiki_and_MCP_Investigation.md`](./02_EmDash_CMS_for_Policy_Wiki_and_MCP_Investigation.md) | **EmDash CMS (`emdashcms.dev`) for Policy Wiki (`US-06`, `D-3`) & MCP (`US-07`):** Cloudflare + Astro's TypeScript-native serverless CMS (`D1` + `R2` + `workerd` V8 isolate plugin sandboxes), 1:1 schema mapping to `PolicyRecord` & `PolicyWikiEntry`, Portable Text statutory citations, quarantine of editorial `/_emdash/mcp` vs. public deterministic `/api/mcp`, `ETag` offline sync bridge (`/api/policy-wiki/bundle.json` $\rightarrow$ `Dexie.js`), and phased adoption roadmap. |
| **`ARCH-EVAL-03`** | [`03_Astro_vs_Svelte_Framework_Comparison_and_Recommendation.md`](./03_Astro_vs_Svelte_Framework_Comparison_and_Recommendation.md) | **Astro 6 vs. Svelte 5 Runes / SvelteKit vs. React 19 Baseline:** Workload split across Views 1–6, side-by-side `View 2 (<15s QuickCaptureModal)` implementation (`wallet.svelte.ts` using `createSubscriber` & `SvelteDate`, `QuickCaptureModal.svelte`, `.stories.svelte` CSF), verified with `svelte-autofixer` (`0 issues`), demonstrating **34% fewer LOC** (`282` vs. `428`) and **82.7% smaller JS bundle** (`11.8 KB` vs. `68.4 KB` gzipped). |

---

### 2. Multi-Agent Adversarial Debate & Ratified Synthesis (`04_` + `debate-positions/`)

| Document ID | File | Perspective & Core Concern |
| :---: | :--- | :--- |
| **`ARCH-EVAL-04`** | [**`04_Multi_Agent_Architecture_and_Deployment_Debate_Synthesis.md`**](./04_Multi_Agent_Architecture_and_Deployment_Debate_Synthesis.md) | **🏛️ Master Synthesis & Ratified `ADR-04` Verdict (`9.35 / 10`):** Cross-examination of all 5 functional perspectives, resolution of the 4 core architectural clashes, end-to-end topology, and the unanimous **Two-Speed Phased Rollout Plan** (`Session 5` $\rightarrow$ `Session 6` $\rightarrow$ `Sessions 7–8`). |
| **`DEBATE-POS-01`** | [`debate-positions/pos_01_systems_and_edge_architecture_kyle.md`](./debate-positions/pos_01_systems_and_edge_architecture_kyle.md) | **Kyle (Development Lead):** Offline-first IndexedDB ACID integrity (`<38ms p95`), `createSubscriber` single-source-of-truth reactivity, `<31.5ms` edge `/api/mcp`, and `PushSchedulerDO` + local fallback. |
| **`DEBATE-POS-02`** | [`debate-positions/pos_02_ui_ux_and_storybook_prushti.md`](./debate-positions/pos_02_ui_ux_and_storybook_prushti.md) | **Prushti (UX/UI Lead):** Hard veto on Pure `.astro` + vanilla JS for Views 1–5; Single-Island Rule (`<WalletApp client:only="svelte" />`); `1.4ms` keystroke reactivity (`11.4s` capture SLA); Storybook `.stories.svelte` CSF + WCAG 2.1 AA. |
| **`DEBATE-POS-03`** | [`debate-positions/pos_03_product_legal_and_cms_amirhossein.md`](./debate-positions/pos_03_product_legal_and_cms_amirhossein.md) | **AmirHossein (Product / Research Lead):** `BGB §§ 437, 477, 309 Nr. 9, 312k Abs. 6` & `BMF 2022` determinism; EmDash 30-day dark-pattern governance; hard legal red line quarantining `/_emdash/mcp` under *LexFox* (`BGH VIII ZR 285/18`, `RDG`, `StBerG`). |
| **`DEBATE-POS-04`** | [`debate-positions/pos_04_privacy_media_and_qa_mojtaba.md`](./debate-positions/pos_04_privacy_media_and_qa_mojtaba.md) | **Mojtaba (Quality / Media Lead):** GDPR Art. 25 zero-cloud receipt firewall; pre-encryption GoBD `SHA-256` digest; iOS Safari camera-safe `public/_headers` (no `COEP: require-corp`); `<canvas>` `$effect` cleanup; `84.5%` projected Vitest + Storybook QA coverage. |
| **`DEBATE-POS-05`** | [`debate-positions/pos_05_delivery_and_sprint_governance_jeetkumar.md`](./debate-positions/pos_05_delivery_and_sprint_governance_jeetkumar.md) | **Jeetkumar (Project Manager):** Protecting the locked `92h` Sprint 1 budget & Kanban $\text{WIP} \le 2$; fencing `EmDash v0.1` D1 migrations to Session 6 (`US-06` `18h` budget) while booting Session 5 from `policy_wiki_seed_v1.json` (`0h` cloud DB risk). |
