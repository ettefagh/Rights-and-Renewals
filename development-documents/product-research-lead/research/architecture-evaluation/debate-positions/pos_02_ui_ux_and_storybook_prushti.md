# 🎨 Debate Position Brief 02: UX/UI Interaction Speed, WCAG 2.1 AA Ergonomics & Storybook Component Isolation

* **Debate Agent:** **Agent 02 — Prushti** (*UX/UI, Interaction Design & Storybook Lead, Team 6*)
* **Academic Context:** SRH University of Applied Sciences — *Computer & Media Lab* (WiSe 2026, Prof. Franziska Schwarz)
* **Core Mandate:** Defend the **`11.4s` Manual Capture Benchmark (`US-01`, `<15s` SLA)**, **`<10ms` Prefix-Trie Typeahead**, **Mobile Touch Ergonomics (`>=48x48px` targets)**, **Unified Visual `BGB § 477` Timeline Clarity (`Iteration C-3`)**, **WCAG 2.1 AA Accessibility**, and **Isolated Visual Verification in Storybook (`@storybook/addon-svelte-csf`)**.
* **Primary Architectural Vote:** **CONDITIONAL YES to Hybrid Astro 6 + EmDash CMS + Svelte 5 Runes (`9.35 / 10`)** — **STRICTLY ON THE CONDITION** that Views 1–5 execute inside a **single unified `<WalletApp client:only="svelte" />` island** and **HARD VETO** against Pure `.astro` + Vanilla `<script>` DOM manipulation for any interactive wallet view.

---

## 1. Opening UX/UI Stance: Why Frontend Architecture Is a Direct UX Latency & Accessibility Contract

In Team 6's peer-lab validation (`Iteration C-1 #22` through `Iteration C-3`), we reduced first-item onboarding time from **`38.0s` down to `11.4s`** (`24%` faster than our `<15s` `ADR-01` ceiling) and lifted student comprehension of the German statutory **`BGB § 477 Abs. 1` (12-month *Beweislastumkehr*)** vs. **`BGB § 438 Abs. 1 Nr. 3` (24-month *Verjährungsfrist*)** split from **`29%` to `100%`**. Those human-factors gains are fragile. They depend on three strict frontend engineering invariants that our architecture debate must not compromise:

1. **Sub-15-Second Onboarding SLA (`US-01`) Under Throttled 4G & Airplane Mode:** Students capture receipts standing at a MediaMarkt checkout counter or on a university train in spotty 4G/offline conditions. Every kilobyte of JavaScript parse/compile overhead delays Time-to-Interactive (TTI), and every millisecond of input-to-DOM lag on the `<10ms` Prefix-Trie typeahead (`Sony`, `Spotify`, `Apple`, `FitX`) breaks typing rhythm.
2. **Continuous Spatial Context & Zero-Flicker State Transitions (`Views 1–5`):** Moving from the **Unified Dashboard (`View 1`)** into the **Quick Capture Modal (`View 2`)**, inspecting the **Unified `BGB § 477` Progress Bar & 60fps Pinch-to-Zoom Receipt Vault (`View 3`)**, or triggering the **1-Tap Statutory Claim Modal (`View 4`)** must feel like a native iOS/Android vault (`<16ms` frame budget)—never a multi-page server reload.
3. **Deterministic Visual & Accessibility Verification in Storybook (`http://localhost:6006`):** With a **30-hour Sprint 1 UX/UI budget** (out of Team 6's `92h` total capacity), we cannot manually test 20 merchant policies, 3 urgency states, DST boundary transitions, and error states by clicking through the full app shell. Every UI state must be verifiable in isolation via **Storybook CSF (`.stories.svelte`)**, **`@storybook/addon-a11y`**, and **`@storybook/addon-vitest`**.

```mermaid
flowchart LR
    subgraph UXInvariants["Team 6 Non-Negotiable UX & Accessibility SLAs"]
        SLA1["⏱️ 11.4s Capture SLA (US-01)<br/>• <10ms Prefix-Trie Typeahead<br/>• Instant BGB § 438 / § 477 Math"]
        SLA2["📱 Mobile Touch & WCAG 2.1 AA<br/>• >=48x48px Touch Targets<br/>• Semantic Urgency Tokens + Icons"]
        SLA3["🧪 Storybook Visual Isolation<br/>• .stories.svelte (Svelte 5 Runes)<br/>• @storybook/addon-a11y Zero Violations"]
    end

    subgraph ArchChoice["Architectural Execution Layer"]
        AstroEdge["Astro 6 + EmDash Edge Shell<br/>• View 6A: /wiki/* (0 KB JS SEO)<br/>• POST /api/mcp (<35ms Edge)"]
        SingleIsland["Single <WalletApp client:only='svelte' /><br/>• Views 1–5 Unified Client State Machine<br/>• 11.8 KB Gzipped Runtime (-82.7% vs React)"]
    end

    SLA1 & SLA2 & SLA3 ===>|"Enforced By"| SingleIsland
    AstroEdge -.->|"Seeds Offline Dexie Policy Wiki"| SingleIsland
```

---

## 2. Why Pure Astro (`.astro` + Vanilla JS) Fails Views 1–5 (Hard UX & Accessibility Veto)

Evaluating [`ARCH-EVAL-03`](../03_Astro_vs_Svelte_Framework_Comparison_and_Recommendation.md#L728-L736), **Architecture 3 (Pure `.astro` Server Templates + Vanilla `<script>` DOM Manipulation)** scores a failing **`3.5 / 10`** on client reactivity and **`3.0 / 10`** on Storybook testability. As UX/UI & Storybook Lead, I issue a **Hard Veto** against using Pure `.astro` without a compiled reactive UI framework for **Views 1–5**:

### 2.1 Destruction of Keyboard Focus, ARIA Live Regions, and `<10ms` Typeahead (`View 2`)
* In **View 2 (`QuickCaptureModal`)**, typing `"son"` triggers our in-memory `PrefixTrie` in `<2ms` and renders selectable brand pills (`Sony — Hardware, 24m BGB § 438, Arbeitsmittel`). When the user taps or presses `Enter` on a suggestion, **7 dependent form fields and statutory badges** update simultaneously (merchant, category radio group, 24m expiry date, 12m `BGB § 477` reversal date, `§ 9 EStG` *Werbungskosten* checkbox, and *BMF 22.02.2022 Sofortabschreibung* callout).
* In Pure `.astro`, `.astro` frontmatter runs **only on the server**. Attempting to wire **35+ cross-view reactive state variables** via imperative `document.querySelector` listeners and `listEl.innerHTML = ...` string concatenation destroys active DOM nodes on every keystroke. This **drops keyboard focus**, breaks `aria-activedescendant` and `role="listbox"` screen-reader announcements, and risks stale validation banners during our `11.4s` capture flow.

### 2.2 Multi-Page Transition Flicker & Broken Airplane-Mode Routing (`Views 1–5`)
* Because personal receipts (`AES-GCM-256` blobs) and `WalletItem` records live 100% locally in **browser IndexedDB (`Dexie.js v4`)** per `ADR-02`, an `.astro` server route on Cloudflare Workers **cannot read the user's vault**.
* Splitting Views 1–5 across separate `.astro` pages (`/dashboard`, `/capture`, `/item/[id]`, `/claim/[id]`, `/tax`) would force full document navigations or View Transition roundtrips that fail in **Airplane Mode**, dump the decrypted receipt `<canvas>` bitmap from memory, and introduce a `150–300ms` white flash between views.

### 2.3 Interactive `BGB § 477` Timeline & 60fps Canvas Pinch-to-Zoom Lifecycle Hazards (`View 3` & `View 4`)
* **View 3 (`ItemDetailVaultView`)** pairs our `Iteration C-3` **Unified `BGB § 477` Dual-Phase Progress Bar** (0–12m *Beweislastumkehr* in Teal `#0D9488` $\rightarrow$ 12–24m *Verjährungsfrist* in Amber `#F59E0B`) with a hardware-accelerated HTML5 `<canvas>` receipt viewer supporting two-finger pinch-to-zoom and pan matrices, plus a **1-Tap Statutory Action Drawer (`View 4`)** that live-interpolates `BGB §§ 437, 439, 477 Abs. 1` and `§ 312k Abs. 6` notices.
* Managing pointer-event gesture math, off-main-thread Web Worker receipt compression (`<1.5MB`), and `URL.createObjectURL` memory revocation in raw `.astro` `<script>` tags without Svelte 5's deterministic `$effect(() => { ... return () => cleanup(); })` lifecycle guarantees memory leaks on mobile Safari and broken modal focus traps (`WCAG 2.4.3 Focus Order`).

### 2.4 Complete Loss of Storybook CSF & Automated Accessibility Gates
* `.astro` server components **cannot be mounted natively in Storybook**. Adopting Pure `.astro` for UI components would blind our `http://localhost:6006` visual testing pipeline, stripping Team 6 of automated `@storybook/addon-a11y` contrast/ARIA audits and `@storybook/addon-vitest` snapshot verification.

---

## 3. Why Svelte 5 Runes + Storybook Svelte CSF Beats Both React 19 & Pure Astro

Migrating our interactive client layer (`Workload B: Views 1–5` + `View 6B MCP Console`) to **Svelte 5 Runes (`.svelte` + `.svelte.ts`)** delivers decisive, measurable wins over both Pure `.astro` and our current **React 19 + Zustand v5 + Immer (`DEV-LEAD-DOC-01`)** baseline:

| UX / UI & Engineering Metric | **Svelte 5 Runes + `@storybook/addon-svelte-csf`** | **React 19 + Zustand v5 + Immer Baseline** | **Pure `.astro` + Vanilla `<script>`** | **UX & Sprint 1 Impact for Team 6** |
| :--- | :--- | :--- | :--- | :--- |
| **Client JS Runtime Payload (Gzipped)** | **`11.8 KB`** (`svelte/internal` signals) | **`68.4 KB`** (`react-dom` + `zustand` + `immer`) | `0 KB` framework (`+18 KB` custom DOM glue) | **`82.7%` smaller bundle** = ~`320ms` faster cold PWA boot on student 4G phones. |
| **Prefix-Trie Keystroke-to-DOM Latency** | **`1.4 ms`** (Direct surgical signal DOM patch) | **`4.8 ms`** (Fiber VDOM diff + `useMemo` array) | **`2.1 ms`** (`innerHTML` wipe; loses ARIA focus) | Zero input lag; preserves `<10ms` typeahead budget with `8.6ms` headroom. |
| **Reactive State & Dexie `liveQuery` Sync** | **Single-Path** (`createSubscriber` + `$state.raw`) | **Dual-Write Hazard** (Zustand `set` + `db.items`) | Manual `CustomEvent` bus + DOM queries | Eliminates stale UI badges when background Web Workers or Service Workers update IndexedDB. |
| **Wall-Clock Urgency Tick (`Europe/Berlin`)** | **Native `new SvelteDate()`** (`svelte/reactivity`) | Manual `setInterval` + full tree re-render | Server request timestamp only | Surgically flips only crossed badges (`Protected` $\rightarrow$ `Expiring Soon` $\rightarrow$ `Urgent`). |
| **View 2 Component + Store Boilerplate** | **`282 LOC`** (Zero `useMemo` / dependency arrays) | **`428 LOC`** (11 `useState` hooks + 2 stores) | **`540+ LOC`** (Imperative DOM mutation soup) | **`34.1%` less code** to author, review, and test within Prushti's `30h` Sprint 1 budget. |
| **Storybook CSF & Accessibility Tooling** | **First-Class `.stories.svelte`** + `$props.id()` | First-Class `.stories.tsx` (`useId()`) | **Unsupported** for `.astro` server templates | Native Rune-driven stories with automated WCAG 2.1 AA verification. |

### 3.1 Zero-Lag Reactivity via `$state`, `$derived`, and `$props.id()`
1. **Surgical Keystroke Updates Without Hook Overhead:** In `QuickCaptureModal.svelte`, `let suggestions = $derived(name.trim().length >= 3 ? brandTrie.search(name) : [])` and `let computedReversedBurdenDate = $derived.by(...)` compile directly into fine-grained push-pull signal edges. Unlike React 19—where typing a single character re-executes the entire `QuickCaptureModal` function body, evaluates explicit dependency arrays, and reconciles Virtual DOM fibers—Svelte 5 mutates only the exact text node or suggestion `<ul>` in **`1.4ms`**.
2. **Built-In Accessibility IDs (`$props.id()`):** Svelte 5.20's `$props.id()` generates deterministic, SSR-safe unique prefixes (`{uid}-name`, `{uid}-title`, `{uid}-tax-cat`), guaranteeing 100% valid `for`/`id`, `aria-labelledby`, and `aria-describedby` bindings across modals without manual ID plumbing.

### 3.2 First-Class Storybook Svelte CSF (`.stories.svelte`) Enforcing Design Tokens & `>=48px` Ergonomics
Using `@storybook/addon-svelte-csf`, `@storybook/addon-a11y`, and `@storybook/addon-vitest` on `http://localhost:6006`, every component in Views 1–6 is authored and verified against Team 6's strict visual design system:
* **Semantic Urgency Color Tokens + Non-Color Redundancy (WCAG 1.4.1 & 1.4.3):**
  * **Protected (`> 30 days` / Active `BGB § 477` 0–12m window):** `Teal #0D9488` surface accent (`#F0FDFA` badge fill, `#115E59` text — **`7.4:1` contrast**) paired with `ShieldCheck` icon and explicit `"BGB § 477 Active (Month 4 of 12)"` label.
  * **Expiring Soon (`8–30 days` / `BGB § 477` Month 11–12 transition):** `Amber #F59E0B` border (`#FEF3C7` fill, `#92400E` text — **`6.8:1` contrast**) paired with `ClockAlert` icon.
  * **Urgent Action (`<= 7 days` / `BGB § 309 Nr. 9` notice cutoff):** `Coral #E11D48` accent (`#FFE4E6` fill, `#9F1239` text — **`7.1:1` contrast**) paired with `AlertTriangle` icon.
* **Touch Target Ergonomics (`>=48x48px`):** Every interactive control—Prefix-Trie suggestion rows, category filter pills, `BGB § 312k` cancellation buttons, and modal close targets—enforces `min-height: var(--touch-target-min, 48px)` (`3rem`) and `min-width: 48px`, audited automatically in Storybook's mobile viewport presets (`375x812px` iPhone SE/14, `360x800px` Android).

```svelte
<!-- src/components/ItemDetailTimeline.stories.svelte — Native Svelte 5 CSF Story -->
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ItemDetailTimeline from './ItemDetailTimeline.svelte';

	const { Story } = defineMeta({
		title: 'Wallet/View3_BGB477_Timeline',
		component: ItemDetailTimeline,
		tags: ['autodocs'],
		parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }, { id: 'target-size', enabled: true }] } } }
	});
</script>

<!-- State 1: Month 4 of 24 — Inside 12m BGB § 477 Abs. 1 Beweislastumkehr (Teal #0D9488) -->
<Story name="Phase1_Beweislastumkehr_Teal" args={{ purchaseDate: '2026-07-04', currentDate: '2026-11-04', warrantyMonths: 24 }} />

<!-- State 2: Month 11.5 — 14 Days Before BGB § 477 Cutoff (Amber #F59E0B Warning) -->
<Story name="Phase1_ExpiringBurdenReversal_Amber" args={{ purchaseDate: '2025-11-18', currentDate: '2026-11-04', warrantyMonths: 24 }} />

<!-- State 3: Month 23.8 — 5 Days Before 24m BGB § 438 Expiry (Coral #E11D48 Urgent) -->
<Story name="Phase2_UrgentStatutoryCutoff_Coral" args={{ purchaseDate: '2024-11-09', currentDate: '2026-11-04', warrantyMonths: 24 }} />
```

---

## 4. The Single-Island UX Rule & Strategic Concessions Across Team 6

To harmonize **Kyle's** Cloudflare/MCP architecture (`ARCH-EVAL-01`), **AmirHossein's** EmDash Policy Wiki governance (`ARCH-EVAL-02`), and **Mojtaba's** Web Worker/Crypto media pipeline, I propose the **Single-Island UX Rule** along with three concrete cross-team concessions:

### 4.1 The Single-Island UX Rule: Unified `<WalletApp client:only="svelte" />` for Views 1–5
> [!IMPORTANT]
> **Architectural Mandate:** We must **never** split Views 1–5 into five separate Astro islands across five server routes. Instead, Astro's `/app` route must mount a **single unified `<WalletApp client:only="svelte" />` island** backed by `wallet.svelte.ts` (`createSubscriber` + `Dexie.js` + `SvelteDate`).

| Official Team 6 View | Execution Boundary & Astro Directive | Primary UX / WCAG 2.1 AA Invariant | Required Storybook `.stories.svelte` States |
| :--- | :--- | :--- | :--- |
| **View 1: Unified Dashboard (`US-04`)** | Inside `<WalletApp client:only="svelte" />` | `<50ms` search/filter pills; same-day renewal group cards | `EmptyVault`, `MixedUrgencyGrid`, `SameDaySubscriptionCluster` |
| **View 2: `<15s` Quick Capture (`US-01`)** | Modal inside `<WalletApp />` (`0ms` mount) | `11.4s` capture; `<10ms` Prefix-Trie; `>=48px` suggestion pills | `HardwareDefault_BGB438`, `TrieAutocompleteOpen`, `FutureDateError` |
| **View 3: Item Vault & `BGB § 477` (`US-02`)** | Sub-view inside `<WalletApp />` (`<16ms`) | Unified 12m/24m progress bar (`Iteration C-3`); 60fps Canvas | `Phase1_Teal_477`, `Phase2_Amber_438`, `ReceiptCanvasZoomed` |
| **View 4: 1-Tap Claim & Cancel (`US-05`)** | Drawer inside `<WalletApp />` (`<16ms`) | Live `BGB §§ 437, 477, 312k Abs. 6` preview + 1-tap copy | `DefectClaim_Within12m`, `OrdinaryCancel_309`, `ImmediateCancel_312k6` |
| **View 5: Tax *Werbungskosten* (`US-08`)** | Sub-view inside `<WalletApp />` (`<16ms`) | `§ 9 EStG` / *BMF 2022* 100% write-off summary + GoBD export | `ArbeitsmittelWriteOff`, `MixedDeductibleTable`, `GoBDExportReady` |
| **View 6A: Policy Wiki Directory (`US-06`)** | **`.astro` Edge SSR / Static (`0 KB` JS)** | `<15ms` TTFB, 100/100 SEO, EmDash Portable Text citations | Verified via Astro build + Playwright a11y smoke test |
| **View 6B: MCP Explorer Widget (`US-07`)** | `<McpExplorerIsland client:load />` | Live JSON-RPC 2.0 request builder & `-32602` error badge | `PolicyLookupSuccess`, `ClaimDossierCompiled`, `ZodError_32602` |

Below is the `svelte-autofixer`-verified (`0 issues, 0 suggestions`) `<WalletApp />` shell demonstrating `<16ms` in-memory view transitions with zero network roundtrips in Airplane Mode:

```svelte
<!-- src/components/WalletApp.svelte — Mounted via <WalletApp client:only="svelte" /> in src/pages/app.astro -->
<script lang="ts">
	import { walletStore } from '../stores/wallet.svelte';
	import UnifiedDashboard from './UnifiedDashboard.svelte';
	import QuickCaptureModal from './QuickCaptureModal.svelte';
	import ItemDetailVault from './ItemDetailVault.svelte';
	import ClaimGeneratorModal from './ClaimGeneratorModal.svelte';
	import TaxSummaryView from './TaxSummaryView.svelte';

	type ActiveRoute = 'dashboard' | 'detail' | 'tax';

	let activeRoute = $state<ActiveRoute>('dashboard');
	let isCaptureOpen = $state(false);
	let isClaimOpen = $state(false);

	let selectedItem = $derived(
		walletStore.items.find((i) => i.id === walletStore.activeItemId) ?? null
	);
</script>

<main class="wallet-shell">
	<nav class="wallet-nav" aria-label="Wallet Primary Views">
		<button type="button" class="nav-pill" aria-current={activeRoute === 'dashboard' ? 'page' : undefined} onclick={() => (activeRoute = 'dashboard')}>
			Dashboard ({walletStore.filteredItems.length})
		</button>
		<button type="button" class="nav-pill" aria-current={activeRoute === 'tax' ? 'page' : undefined} onclick={() => (activeRoute = 'tax')}>
			Tax Export (§ 9 EStG)
		</button>
		<button type="button" class="btn-capture" onclick={() => (isCaptureOpen = true)}>
			+ Quick Capture (&lt;15s)
		</button>
	</nav>

	{#if activeRoute === 'dashboard'}
		<UnifiedDashboard onSelectItem={(id) => { walletStore.activeItemId = id; activeRoute = 'detail'; }} />
	{:else if activeRoute === 'detail' && selectedItem}
		<ItemDetailVault item={selectedItem} onOpenClaim={() => (isClaimOpen = true)} onBack={() => (activeRoute = 'dashboard')} />
	{:else if activeRoute === 'tax'}
		<TaxSummaryView />
	{/if}

	<QuickCaptureModal isOpen={isCaptureOpen} onClose={() => (isCaptureOpen = false)} />
	{#if selectedItem}
		<ClaimGeneratorModal isOpen={isClaimOpen} item={selectedItem} onClose={() => (isClaimOpen = false)} />
	{/if}
</main>
```

### 4.2 UX/UI Concessions to Edge SEO, EmDash Governance & Sprint 1 Schedule Protection
1. **Concession to Workload A (`View 6A: Public Policy Wiki Directory`):** I fully endorse rendering `/wiki` and `/wiki/[slug]` (Top 20 student brands: `Apple`, `Sony`, `Spotify`, `FitX`, `MediaMarkt`, etc.) as **Zero-JS `.astro` Server Templates** backed by **EmDash CMS + Cloudflare D1**. Public statutory reference tables do not need client-side IndexedDB state, and shipping `0 KB` of JS guarantees a `100/100` Lighthouse SEO score and `<15ms` edge TTFB, while **View 6B (`<McpExplorerIsland client:load />`)** mounts as a dedicated Svelte 5 island on the same page for live JSON-RPC 2.0 testing.
2. **Concession to AmirHossein's EmDash Portable Text Schema (`ARCH-EVAL-02`):** Svelte 5's `View 3` and `View 6` components will consume EmDash's flattened dual-projection `bundle.json` (synced non-blockingly into `db.policy_wiki` via `initAndSyncPolicyWiki()`) so AmirHossein can flip `cancellation_button_compliant` (`BGB § 312k Abs. 6`) in `/_emdash/admin` without breaking `<10ms` offline Prefix-Trie autocomplete.
3. **Concession to Kyle's Sprint 1 Schedule Risk (`92h` Team Budget):** To avoid jeopardizing our **Session 5 Gate**, we keep 100% of Kyle's framework-agnostic TypeScript services (`db.ts`, `PrefixTrie.ts`, `AlertScheduler.ts`) untouched and execute the Svelte 5 + `.stories.svelte` island rollout incrementally—starting with **View 2 (`QuickCaptureModal.svelte`)** and **View 6B (`McpExplorerIsland.svelte`)**, then consolidating Views 1, 3, 4, and 5 into `<WalletApp client:only="svelte" />`.
