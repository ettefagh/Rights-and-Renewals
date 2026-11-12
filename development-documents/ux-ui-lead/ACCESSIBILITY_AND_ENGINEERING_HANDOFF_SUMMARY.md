# ♿ Accessibility (WCAG 2.1 AA) & Engineering Handoff Contract (`DOC-UX-05`)

**Document Reference:** `DOC-UX-05`  
**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule*)  
**Course Module:** *Computer & Media Lab* (Wintersemester 2026) · **Instructor:** Prof. Franziska Schwarz  
**Working Team:** **Team 6**  
**Project:** *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  
**Role Owner & Author:** **Prushti** — *UX/UI Lead (Member C)*  
**Engineering Handoff Recipients:** **Kyle** *(Development Lead — `22h`)* & **Mojtaba** *(Quality / Media Lead — `20h`)*

---

## 1. WCAG 2.1 AA Compliance Matrix (`DoD Gate 6`)

Passing **Definition of Done Gate 6 (`#30`)** requires zero automated or manual WCAG 2.1 Level AA violations across both `[Project].pages.dev` (Public Showcase) and `app.[Project].pages.dev` (Offline-First Wallet PWA) on `375px–412px` mobile and desktop viewports:

| WCAG 2.1 Criterion | Mandatory CM-LAB Implementation Rule | Verification Artifact |
| :--- | :--- | :--- |
| **1.3.1 Info & Relationships (A)** | Semantic landmarks (`<header>`, `<main>`, `<nav>`, `<dialog>`), explicit `<label for="{uid}-...">` via Svelte 5 `$props.id()`, and grouped calendar cells (`role="grid"`). | `@storybook/addon-a11y` (`axe-core`) |
| **1.4.1 Use of Color (A)** | Urgency badges and calendar cells pair color (`#DC2626`, `#D97706`, `#059669`, `#6B7280`) with geometric icons (`▲`, `◆`, `✓`, `○`) and explicit statutory status text. | Visual + Grayscale Storybook check |
| **1.4.3 Contrast Minimum (AA)** | Normal text $\ge 4.5:1$ (`#2F524C` Teal = **7.8:1 AAA**, `#D96B4B` Coral = **4.6:1 AA**, Urgency badges = **4.5:1–7.5:1**); interactive borders & focus rings $\ge 3.0:1$. | `tokens.css` & `addon-a11y` |
| **1.4.4 / 1.4.10 Reflow (AA)** | Zero horizontal scrolling (`CLS = 0`) at `320px–412px` width and `200%` text zoom; `<input>` font-size $\ge 16\text{px}$ (`1rem`) to prevent forced iOS Safari viewport zoom. | Mobile viewport matrix |
| **2.1.1 / 2.1.2 No Keyboard Trap (A)** | Complete keyboard operability across `OmniBar`, `MonthlyCalendarGrid`, `QuickCaptureModal`, and `ClaimGeneratorModal` with `Escape` guaranteed to dismiss overlays. | Vitest user-event keyboard suite |
| **2.4.3 / 2.4.7 Focus Order & Visible (AA)** | High-contrast `3px` Teal focus ring (`--focus-ring`) via `:focus-visible`; deterministic return-of-focus to invoking trigger when modals close. | Keyboard tab-through audit |
| **2.5.5 / 2.5.8 Target Size (`Gate 6`)** | Every button, filter pill, suggestion item, and active calendar day cell enforces **`>= 48x48px`** (`--size-touch-min: 48px`). | `target-size` rule in `addon-a11y` |
| **4.1.2 / 4.1.3 Name, Role, Value & Status (AA)** | WAI-ARIA 1.2 Combobox pattern on `OmniBar` & View 2 typeahead; `aria-live="polite"` announcements for search counts, GoBD `SHA-256` completion, and clipboard copy toasts. | VoiceOver (iOS) / NVDA check |

---

## 2. WAI-ARIA 1.2 Combobox, Focus Trap & Live Region Contracts

### 2.1 Unified Omni-Bar & Prefix-Trie Autocomplete (`ARIA 1.2 Combobox`)
Both the dashboard **Unified Search / Activity / Request Omni-Bar (`OmniBar.svelte`)** and View 2's **Brand Input (`QuickCaptureModal.svelte`)** implement the strict WAI-ARIA 1.2 `combobox` + `listbox` contract using Svelte 5's SSR-safe `$props.id()`:

* **Input Element (`<input type="search" role="combobox">`):**
  * `aria-autocomplete="list"`
  * `aria-expanded={isOpen && visibleItems.length > 0}`
  * `aria-controls="{uid}-listbox"`
  * `aria-activedescendant={activeOptionId}` — keeps actual DOM focus inside the `<input>` so users can continue typing or editing characters seamlessly while navigating options with `ArrowDown` / `ArrowUp`.
* **Popup Container (`<ul id="{uid}-listbox" role="listbox">`):**
  * Grouped sections (`Saved in Local Vault`, `Policy Wiki Statutory Rules`, `Quick Capture & Receipt Import`) use `<li role="presentation">` visual headers or `<ul role="group" aria-labelledby="{uid}-grp-...">` so screen readers announce context cleanly.
  * Each selectable row uses `role="option"` and `aria-selected={idx === activeIndex}`.
* **Polite Count Announcer (`<div class="sr-only" aria-live="polite">`):**
  * Announces result summaries after keystroke settle (`"3 matches: 1 saved item, 1 Policy Wiki brand, plus quick capture option"` or `"0 saved matches. Press Enter to log Dyson in under 15 seconds"`).

### 2.2 Modal Focus Traps & Non-Destructive Validation (`View 2`, `View 3 Zoom`, `View 4`)
* **Native `<dialog>` Element:** `QuickCaptureModal.svelte`, `ReceiptCanvasModal.svelte`, and `ClaimGeneratorModal.svelte` use HTML5 `<dialog>` invoked via `.showModal()` inside a Svelte 5 `$effect`, automatically rendering in the browser top-layer, inerting background dashboard widgets, trapping `Tab` / `Shift+Tab` focus, and binding `cancel` (`Escape`).
* **Deterministic Focus Return:** Closing View 2 or View 4 restores focus directly to `#omnibar-input` or the originating item card's CTA button.
* **Accessible Form Validation (`Board C Screen 03` / `Scenario 1.3`):** Submitting View 2 with an empty `name` or future `purchaseDate` sets `aria-invalid="true"` and `aria-describedby="{uid}-error"` on the offending input, moves focus to the first invalid control, and preserves 100% of entered fields and attached receipt thumbnails.

---

## 3. Offline Airplane-Mode UX & Mobile Safari Camera Safety (`Red Line #4`)

### 3.1 100% Airplane-Mode UX States (`navigator.onLine === false`)
Students routinely inspect receipts at retail service desks with poor indoor cellular reception or test the app in Airplane Mode (`Walkthrough A #25`):

1. **Zero Network Blocking:** Mounting `<WalletApp client:only="svelte" />` with Service Worker precaching (`sw.ts`) and bundled `policy_wiki_seed_v1.json` guarantees identical `<50ms` boot and `<10ms` Omni-Bar responses offline.
2. **Calm Offline Vault Pill:** When `navigator.onLine === false`, the top status bar switches from `🟢 Local Vault Ready` to `✈️ Offline Vault Active · 100% Functional` (Protected Green `#059669`, never an alarming error banner) so users know capture, receipt hashing, pinch-to-zoom, and PDF dossier export remain 100% operational.
3. **Notification Permission Denied Fallback (`Scenario 3.4`):** When `Notification.permission === 'denied'` and `urgentCount > 0`, `UrgencyCountdownWidget` pins a dismissible high-contrast banner at the top of View 1: `"⚠️ {n} statutory or renewal cutoffs within 30 days (OS notifications disabled)"`.

### 3.2 Mobile Safari Camera Header Lock & HTML5 Fallback (`Red Line #4`)
> [!CAUTION]
> **Non-Negotiable Deployment Guardrail (`Red Line #4`):** Enabling `Cross-Origin-Embedder-Policy: require-corp` causes iOS Safari's native camera sheet and `<input type="file" capture="environment">` stream to deadlock on mobile devices. Because CM-LAB uses **Dexie.js v4 (IndexedDB)** rather than `SharedArrayBuffer`, `public/_headers` MUST strictly omit `COEP: require-corp` and explicitly allow self-origin camera access.

Required `public/_headers` configuration handed off to **Kyle**:

```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Cross-Origin-Opener-Policy: unsafe-none
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

* **Graceful Camera Permission Recovery (`Scenario 2.4`):** If `navigator.mediaDevices.getUserMedia` throws `NotAllowedError` or `NotFoundError`, `QuickCaptureModal.svelte` preserves all typed inputs, surfaces a polite Warning Amber (`#D97706`) inline notice (`"Direct camera stream unavailable — opening native photo/PDF picker"`), and programmatically triggers `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment">`.

---

## 4. Cross-Functional Engineering Handoff Contracts

### 4.1 Handoff to Kyle (Development Lead — Data, Reactive Store, Scheduler & MCP)

| Interface Boundary | Source Module (Kyle) | Consuming Svelte Component (Prushti) | Binding SLA & Contract Invariant |
| :--- | :--- | :--- | :--- |
| **Reactive Vault Store** | `src/stores/wallet.svelte.ts` (`$state.raw` + `createSubscriber` over `db.ts`) | `WalletApp.svelte`, `OmniBar.svelte`, `MonthlyCalendarGrid.svelte` | Single source of truth in `Dexie.js v4`; ACID commits `<200ms` (`p95 <38ms`); zero dual-store sync boilerplate. |
| **Prefix-Trie Brand Engine** | `src/lib/PrefixTrie.ts` (`policy_wiki_seed_v1.json`) | `OmniBar.svelte`, `QuickCaptureModal.svelte` | `brandTrie.search(prefix)` executes synchronously in **`<2ms`** (`<10ms` ceiling), returning `category`, `statutoryMonths: 24`, `noticeDays: 30`, and `cancellationButtonCompliant`. |
| **DST-Safe Alert Engine** | `src/lib/AlertScheduler.ts` (`Europe/Berlin` IANA) | `UrgencyCountdownWidget.svelte`, Deep-Link Router | Fires at `09:00:00` local wall-clock (`0h` CET/CEST drift); notification tap deep-links to `/items/{id}?action=claim`. |
| **Edge & Stdio MCP API** | `POST /api/mcp` (`wrangler.jsonc`) | `McpExplorerIsland.svelte` (`View 6B` & `[Project].pages.dev/mcp`) | `<30ms` edge RTT (`Gate 4 <200ms`), `Cache-Control: no-store`, deterministic JSON-RPC `-32602` Zod error object rendered cleanly in UI inspector. |

### 4.2 Handoff to Mojtaba (Quality / Media Lead — Web Worker, Crypto, Canvas & PDF)

| Media Pipeline Boundary | Source Module (Mojtaba) | Consuming Svelte Component (Prushti) | Binding SLA & Lifecycle Safety Contract |
| :--- | :--- | :--- | :--- |
| **Format 1 Intake: Downsample + GoBD `SHA-256`** | `src/workers/image-compression.worker.ts` + Web Crypto `AES-GCM-256` | `QuickCaptureModal.svelte` (`ReceiptVaultSlot`) | Downsamples `<=2048px` & **`<1.5MB` WebP/JPEG in `<500ms`**; computes 64-char hex `receiptSha256` **prior** to encryption (`GoBD Rn. 108–110`); zero outbound network requests (`GDPR Art. 25`). |
| **Format 1 Inspection: 60fps Pinch-to-Zoom** | Decrypted `Blob` $\rightarrow$ `ImageBitmap` / `<canvas>` matrix | `ItemDetailVault.svelte` (`ReceiptCanvasModal`) | Svelte 5 `$effect(() => { ... return () => { bitmap.close(); URL.revokeObjectURL(url); }; })` prevents iOS Safari GPU memory leaks across `1x–4x` pinch-zoom gestures. |
| **Format 2 Output: Statutory Dossier & Fallback** | `src/workers/dossier-pdf.worker.ts` + `DOC-PRD-02` Templates | `ClaimGeneratorModal.svelte` (`View 4`) | Compiles PDF with embedded receipt + `SHA-256` + mandatory **`BGH VIII ZR 285/18` (`RDG §§ 2, 3`)** footer in `<800ms`. On worker timeout (`Scenario 5.5`), opens `<textarea readonly>` modal with a fresh click-bound **`Copy Notice Text to Clipboard`** button to preserve W3C transient user activation (`navigator.clipboard.writeText`). |
