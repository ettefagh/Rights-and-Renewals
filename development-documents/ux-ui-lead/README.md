# 🎨 UX/UI Interaction Design, Dual-Domain Showcase & Accessibility (`DOC-UX-00`)

**Role Title:** UX/UI Lead  
**Role Owner:** **Prushti** (Member C)  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH University of Applied Sciences · WiSe 2026 · Prof. Franziska Schwarz)  
**Assigned Capacity:** `26h` Total (`16h` `US-01` `<15s` Capture & Unified Omni-Bar + `10h` `US-04` Modular Dashboard & Calendar Widgets)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 📂 Authoritative UX/UI Pre-Build Specification Index

All documents in this directory are verified CM-LAB specifications governing both the **Public Showcase (`[Project].pages.dev`)** and the **Offline-First Wallet Application (`app.[Project].pages.dev`)**:

| Doc ID | File | Scope & Primary Deliverables | Mapped Gates |
| :---: | :--- | :--- | :---: |
| **`DOC-UX-01`** | [`MASTER_UIUX_PREBUILD_SPECIFICATION.md`](./MASTER_UIUX_PREBUILD_SPECIFICATION.md) | Master UI/UX blueprint covering Dual-Domain topology (`[Project].pages.dev` Showcase + `app.[Project].pages.dev` App), the **Unified Search / Activity / Request Omni-Bar**, 3 Calendar Widgets, 6 Core Views, and Svelte 5 Runes (`OmniBar.svelte`). | Gates 1, 2, 6, 7 |
| **`DOC-UX-02`** | [`USER_RESEARCH_SUMMARY.md`](./USER_RESEARCH_SUMMARY.md) | Authentic empirical research synthesis: Qualitative Interviews (**Persons 1–4**), Consumer Friction Asymmetry, Session 3 OCR failure benchmark (`42%` fail rate), Team 7 Peer Lab (`38.0s -> 11.4s`, `0% -> 100%` receipt capture), and External Walkthroughs A (`#25`) & B (`#26`). | Gate 2, `ADR-01`, `ADR-02` |
| **`DOC-UX-03`** | [`INFORMATION_ARCHITECTURE_AND_INTERACTION_SUMMARY.md`](./INFORMATION_ARCHITECTURE_AND_INTERACTION_SUMMARY.md) | Dual-domain sitemap, Single-Island routing (`<WalletApp client:only="svelte" />`), deterministic state machine & keyboard shortcuts for the **Unified Omni-Bar**, and interaction rules for the 3 Calendar Widgets. | Gates 1, 2, 6 |
| **`DOC-UX-04`** | [`DESIGN_SYSTEM_AND_TOKENS_SUMMARY.md`](./DESIGN_SYSTEM_AND_TOKENS_SUMMARY.md) | W3C DTCG 3-tier tokens anchored on CM-LAB's official palette (`#2F524C` Teal, `#D96B4B` Coral, `#F4F7F6` Canvas, semantic urgency colors), CSS custom properties (`--color-*`), `>=48x48px` touch ergonomics, and Svelte 5 component variant matrix. | Gate 6 |
| **`DOC-UX-05`** | [`ACCESSIBILITY_AND_ENGINEERING_HANDOFF_SUMMARY.md`](./ACCESSIBILITY_AND_ENGINEERING_HANDOFF_SUMMARY.md) | WCAG 2.1 AA compliance (`Gate 6`), ARIA 1.2 combobox/listbox contracts, modal focus traps, Airplane Mode offline UX, `Permissions-Policy: camera=(self)` mobile Safari safety (`Red Line #4`), and developer handoff contracts to **Kyle** & **Mojtaba**. | Gates 1, 6, 7 |
| **`DOC-UX-06`** | [`TEST_INFRA_OVERVIEW.md`](./TEST_INFRA_OVERVIEW.md) | Storybook 10.5+ CSF (`@storybook/addon-svelte-csf` `.stories.svelte`, `@storybook/addon-a11y`, `@storybook/addon-vitest`), Vitest component suite (`>=75%`), and `<15.0s` stopwatch usability benchmark protocol (`Gate 2`). | Gates 2, 5, 6 |
| **`DOC-UX-07`** | [`ONBOARDING_WIZARD_AND_3D_SPECIFICATION.md`](./ONBOARDING_WIZARD_AND_3D_SPECIFICATION.md) | 4-step progressive onboarding wizard contract + Threlte 8 declarative 3D canvas (Svelte 5 runes) for warm tactile welcome, Dexie storage setup, and interactive showcase hero card scene. | Gates 1, 2, 6 |
| **`DOC-UX-08`** | [`DRAWER_ICON_AND_MEDIA_PIPELINE_SPEC.md`](./DRAWER_ICON_AND_MEDIA_PIPELINE_SPEC.md) | Runes-first bottom-sheet & 520px side drawer primitive (`@harshmandan/svaul`), authoritative 24x24 UI icons (`lucide-svelte`), build-time brand vector pipeline (`unplugin-icons` + `@iconify-json/simple-icons`), static showcase hero downsampling (`astro:assets`), and client-side Web Worker receipt vault preservation (`image-compression.worker.ts`, GoBD `SHA-256`, GDPR Art. 25). | Gates 1, 2, 6, 7 |

---

## 🏛️ Dual-Domain & Modern Widget Dashboard Architecture

1. **Main Showcase Webpage (`[Project].pages.dev`):**
   * Public Astro 6 showcase introducing CM-LAB's **two primary interfaces** (**Authoritative MCP Server** `POST /api/mcp` and **Offline-First Wallet App**).
   * Features an interactive read-only preview dashboard with sample modular calendar widgets, a preview **Unified Omni-Bar**, zero-JS SEO Policy Wiki pages (`/wiki/[slug]`), and the live `<McpExplorerIsland client:load />` JSON-RPC 2.0 console.
2. **Modern Wallet Application (`app.[Project].pages.dev`):**
   * 100% offline-first PWA mounted as a **Single Root Island (`<WalletApp client:only="svelte" />`, `~11.8 KB` gzipped)** backed by `Dexie.js v4` and `wallet.svelte.ts`.
   * **Unified Search / Activity / Request Omni-Bar (Centerpiece):** Simultaneously queries the bundled Policy Wiki (`policy_wiki_seed_v1.json` in `<2ms`), searches encrypted local `Dexie.js` items & activity logs (`<5ms`), and triggers `<15s` quick capture / receipt import (`11.4s` verified benchmark).
   * **Modular Dashboard & 3 Distinct Calendar Widgets:**
     * *Monthly Renewal & Expiry Grid* (with same-day collision grouping, e.g., `"Nov 1 · 3 Renewals"`).
     * *24m / 12m `BGB § 477 Abs. 1` Warranty Cliff Timeline Bar* (`Iteration C-3 #24`).
     * *30 / 7 / 1-Day Expiration Countdown Stack* (`09:00 Europe/Berlin`, `0h` CET/CEST DST drift).

---

## 🛠️ UI Package Standards & Media Division of Labor (`DOC-UX-08`)

Ratified in [`DRAWER_ICON_AND_MEDIA_PIPELINE_SPEC.md`](./DRAWER_ICON_AND_MEDIA_PIPELINE_SPEC.md) (`DOC-UX-08`), the repository enforces a strict separation between presentation primitives, build-time vectors, and sandboxed client media:

1. **`@harshmandan/svaul` (Runes-First Drawer Primitive):** Powers the Contextual Item Detail Drawer (520px fixed on desktop, bottom-sheet on mobile), 1-Tap Claim Drawer, and filter drawers with velocity snapping and full ARIA modal focus trapping.
2. **`lucide-svelte` (Universal UI Icon Standard):** Consistent 24x24 vector stroke icons across FAB Speed Dial, Unified Omni-Bar, Calendar widgets, and drawer headers with WCAG AA/AAA contrast ratios.
3. **`unplugin-icons` + `@iconify-json/simple-icons` (Brand Vector Pipeline):** Zero-runtime build-time SVG compilation of official vector logos for the Top 20 student brands across the Brand Policy Wiki (`/wiki`), eliminating heavy raster images and CLS.
4. **`astro:assets` (Static Showcase Media):** Build-time AVIF/WebP downsampling, zero-CLS intrinsic dimensions, and EXIF stripping for static showcase hero graphics.
5. **Preservation of `image-compression.worker.ts` (Client-Side Receipt Vault):** Raw consumer receipt photos ($15MB+) are strictly processed locally via Web Worker (<1.5MB) with GoBD Rn. 108–110 `SHA-256` pre-encryption hashing and `AES-GCM-256` local IndexedDB encryption (`GDPR Art. 25`). Build-time tools never touch user receipts.

---

## 🎨 Official Design System Tokens & Color Palette

| Token Name | Hex Code | Purpose / Application | Contrast Ratio (on `#FFFFFF`) |
| :--- | :---: | :--- | :---: |
| `--color-primary-teal` | `#2F524C` | Primary headers, active Omni-Bar border, brand typography | **7.8 : 1** (AAA) |
| `--color-accent-coral` | `#D96B4B` | Primary CTAs (`+ Quick Capture`), Omni-Bar create highlight | **4.6 : 1** (AA) |
| `--color-bg-canvas` | `#F4F7F6` | Main application & showcase background (soft mineral neutral) | — |
| `--color-card-white` | `#FFFFFF` | Elevated widget surfaces, Omni-Bar listbox, modal dialogs | — |
| `--color-urgent-red` | `#DC2626` | Urgent badge ($\le 7$d), immediate action cutoffs, field errors | **4.8 : 1** (AA) |
| `--color-warning-amber` | `#D97706` | Expiring soon badge ($8–30$d), Month 11 `BGB § 477` cliff alert | **4.5 : 1** (AA) |
| `--color-protected-green`| `#059669` | Protected badge ($>30$d), verified GoBD `SHA-256` vault status | **4.9 : 1** (AA) |
| `--color-expired-grey` | `#6B7280` | Expired / archived records ($0$d), neutral secondary metadata | **4.7 : 1** (AA) |

---

## 📋 Assigned GitHub Issues & Ownership (`Prushti`)

| Issue | Title | Story Points | Column Status | UX/UI Deliverable Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#1**](https://github.com/ettefagh/CM-LAB/issues/1) | `[Panel A Core Story US1] Rapid Manual Capture & Receipt Vault` | 10 SP | `3. In Progress` | Primary owner for AC1 (Omni-Bar + `<15s` Quick Capture UI) |
| [**#2**](https://github.com/ettefagh/CM-LAB/issues/2) | `[Panel A Core Story US2] Proactive Dual Expiry Alert Engine` | 8 SP | `3. In Progress` | Co-owner for AC1 (Modular Calendar Widgets & urgency badges) |
| [**#4**](https://github.com/ettefagh/CM-LAB/issues/4) | `[Backlog US-01] Manual Entry (<15s Structured Flow)` | 5 SP | `4. In Review / QA` | `16h` UI spec & Svelte 5 `QuickCaptureModal` (`11.4s` verified) |
| [**#7**](https://github.com/ettefagh/CM-LAB/issues/7) | `[Backlog US-04] Unified Overview & Urgency Status Badges` | 3 SP | `3. In Progress` | `10h` UI build across Views 1–6 & Dual-Domain preview |
| [**#13**](https://github.com/ettefagh/CM-LAB/issues/13) | `[Risk R-1] OCR Cost Trap & Onboarding Churn Guardrail` | — | `4. In Review / QA` | Mitigated via `<10ms` Prefix-Trie & Omni-Bar create suggestion |
| [**#18**](https://github.com/ettefagh/CM-LAB/issues/18) | `[Deliverable D-1] Working Core User Journey Implementation` | — | `4. In Review / QA` | Single-Island `<WalletApp client:only="svelte" />` navigation |
| [**#22**](https://github.com/ettefagh/CM-LAB/issues/22) | `[Peer Lab Iteration C-1] Brand Typeahead Autocomplete` | — | `5. Done` | Tested with Team 7; cut capture latency from `38.0s` to `11.4s` |
| [**#23**](https://github.com/ettefagh/CM-LAB/issues/23) | `[Peer Lab Iteration C-2] Elevate Receipt Photo Container` | — | `5. Done` | Positioned receipt vault container beside `Item Name` (`100%` capture) |
| [**#24**](https://github.com/ettefagh/CM-LAB/issues/24) | `[Peer Lab Iteration C-3] Unified Visual BGB § 477 Timeline` | — | `5. Done` | `BgbCliffTimelineWidget` highlighting Month 12 *Beweislastumkehr* |
| [**#26**](https://github.com/ettefagh/CM-LAB/issues/26) | `[Walkthrough B] External User Test — Participant Beta` | — | `5. Done` | Verified unaided 7-subscription triage & `§ 312k Abs. 6` cancel |
| [**#28**](https://github.com/ettefagh/CM-LAB/issues/28) | `[ADR-02] Unifying Subscriptions Alongside Hardware` | — | `5. Done` | Co-owner with AmirHossein on unified widget dashboard IA |
