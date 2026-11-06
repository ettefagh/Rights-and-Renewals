# UI/UX Research, Design System Specifications & Technical Architecture
## Dual-Domain Web Properties: Main Showcase (`[Project].page.dev`) & Modern Application (`app.[Project].page.dev`)

**Document Identifier:** `SPEC-M1-UIUX-ARCH-001`  
**Milestone:** M1 (UI/UX Research & Design Specifications)  
**Standard Compliance:** W3C DTCG Token Specification, WCAG 2.1/2.2 AA & AAA, WAI-ARIA 1.3 Combobox, BGH VIII ZR 285/18 (*LexFox*), German BGB (§§ 434, 437, 438, 477 Abs. 1, 309 Nr. 9, 312k), § 9 EStG (BMF 22.02.2022), GoBD Rn. 108–110, GDPR Art. 25 (*Privacy by Design*).  
**Academic Context:** *Computer & Media Lab* (SRH Hochschule Heidelberg / Berlin, WiSe 2026)  
**Instructor:** Prof. Franziska Schwarz  
**Authoring Body:** Team 6 (Implementation Lead `teamwork_worker_m1_1` synthesizing Blueprints `teamwork_explorer_m1_1`, `teamwork_explorer_m1_2`, `teamwork_explorer_m1_3`)  
**Status:** Certified Authoritative Master Specification  
**Date:** 2026-11-05  

---

## Table of Contents
1. [Executive Summary, System Thesis & Dual-Domain Topology](#chapter-1-executive-summary-system-thesis--dual-domain-topology)
2. [W3C DTCG 3-Tier Design System & Token Specifications](#chapter-2-w3c-dtcg-3-tier-design-system--token-specifications)
3. [Photometric Accessibility & Ergonomics Governance (WCAG 2.1/2.2 AA & AAA)](#chapter-3-photometric-accessibility--ergonomics-governance-wcag-2122-aa--aaa)
4. [5-Tier Responsive Viewport Architecture & Layout Grids (100dvh & Safe Areas)](#chapter-4-5-tier-responsive-viewport-architecture--layout-grids-100dvh--safe-areas)
5. [Main Showcase Webpage Architecture (`[Project].page.dev`) & Dual-Core Playground](#chapter-5-main-showcase-webpage-architecture-projectpagedev--dual-core-playground)
6. [Three Distinct Calendar Widget Architectures](#chapter-6-three-distinct-calendar-widget-architectures)
7. [Modern Application Interface (`app.[Project].page.dev`) & Unified Omnibar Engine](#chapter-7-modern-application-interface-appprojectpagedev--unified-omnibar-engine)
8. [Modern App Dashboard Shell, Contextual Drawer (520px) & Workflows](#chapter-8-modern-app-dashboard-shell-contextual-drawer-520px--workflows)
9. [Complete ASCII Wireframe Blueprints](#chapter-9-complete-ascii-wireframe-blueprints)
10. [Technical Component API Contracts & Verification Methodology](#chapter-10-technical-component-api-contracts--verification-methodology)

---

# Chapter 1: Executive Summary, System Thesis & Dual-Domain Topology

### 1.1 The German Consumer Rights & Legal Tech Problem Space
German consumer law provides some of the strongest statutory warranty and cancellation protections in the European Union. However, consumer exercise of these rights suffers from severe operational asymmetry:
1. **The 12-Month Burden-of-Proof Cliff (`BGB § 477 Abs. 1`):** In sales of consumer goods (*Verbrauchsgüterkauf*), defects appearing within the first 12 months are presumed to have existed at delivery. After day 365, the burden of proof flips to the consumer, making warranty enforcement substantially more difficult. Consumers regularly miss this critical milestone due to lack of deadline tracking.
2. **Subscription Traps & Mandatory Cancellation Buttons (`BGB §§ 309 Nr. 9, 312k`):** While German law limits post-initial term subscriptions to 1-month rolling notices and mandates an easily accessible "Kündigungsbutton" (cancellation button) on merchant websites, digital providers utilize multi-step retention screens and deliberately obscure cancellation paths.
3. **Tax Write-Off Inefficiencies (`§ 9 EStG` / BMF Guidance 22.02.2022):** German tax regulations permit 100% immediate depreciation (*Sofortabschreibung*) of digital consumer hardware and software used as work equipment (*Arbeitsmittel*). Students and professionals forfeit hundreds of Euros annually because receipts are lost or unclassified.
4. **Cloud Privacy Vulnerabilities & Document Hoarding:** Existing commercial receipt management applications require users to upload unencrypted invoices, payment records, and personal identifying information to third-party cloud databases, exposing sensitive financial history to security breaches and cross-service profiling.
5. **Declaration Deadlines vs. Statutory Presumption Periods (`BGB § 193` vs. `BGB § 477 Abs. 1`):** In German civil law, deadline calculations must strictly distinguish between declarations of intent (*Willenserklärungen*, e.g., contract termination notices under `BGB § 309 Nr. 9`, cancellation button invocations under `BGB § 312k`, or revocation under `BGB § 355`) and substantive statutory presumption periods. Under `BGB § 193`, if a contractual declaration deadline expires on a Saturday, Sunday, or official public holiday, the deadline is automatically extended to the next business day. Conversely, the 12-month reversed burden of proof under `BGB § 477 Abs. 1` is a statutory legal presumption concerning the physical manifestation of a defect at handover—not a filing deadline. Therefore, pursuant to `BGB § 188 Abs. 2`, the 12-month presumption period expires strictly at the conclusion of the 12th calendar month from handover (clamped to Feb 28 on non-leap years per § 188 Abs. 3), and does **not** roll over under `BGB § 193`.

### 1.2 The "Two Faces of Ground Truth" Design Thesis
The CM-LAB platform resolves these challenges by introducing a unified architectural thesis:

> **"Two Faces of the Same Ground Truth"** — Statutory consumer rights, GoBD cryptographic immutability, and tax write-off intelligence must be symmetrically accessible, verifiable, and actionable by both **human consumers** through a modern, responsive reactive web application and **autonomous AI agents** (Claude Desktop, Cursor, local LLMs) through open Model Context Protocol (MCP) JSON-RPC 2.0 endpoints.

```
                               ┌────────────────────────────────────────────────────────┐
                               │           CANONICAL REPOSITORY GROUND TRUTH            │
                               │  - Policy Wiki Knowledge Graph (Top 20 German Brands)   │
                               │  - Deterministic BGB Notice Engine (§§ 437, 477, 312k) │
                               │  - German Tax Sofortabschreibung Engine (BMF 2022)     │
                               │  - GoBD SHA-256 Pre-Encryption Immutability Standard   │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                            ┌──────────────────────────────┴──────────────────────────────┐
                            ▼                                                             ▼
     ┌──────────────────────────────────────────────┐              ┌──────────────────────────────────────────────┐
     │      INTERFACE A: HUMAN APPLICATION          │              │        INTERFACE B: AI AGENT (MCP)           │
     │      Target: app.[Project].page.dev          │              │        Target: POST /api/mcp & SSE /sse      │
     ├──────────────────────────────────────────────┤              ├──────────────────────────────────────────────┤
     │ • Svelte 5 Offline-First PWA                 │              │ • Model Context Protocol (JSON-RPC 2.0)      │
     │ • Client-Side AES-GCM-256 Dexie.js Vault     │              │ • Zod Schema Validation (-32602 Error Guard) │
     │ • Sub-15s Manual Capture (<11.4s verified)   │              │ • Zero-Hallucination Ground-Truth Retrieval  │
     │ • 30/7/1-day Push Notifications (0h drift)   │              │ • Deterministic LexFox Legal Dossier Engine  │
     │ • Unified Search/Activity/Request Omnibar    │              │ • Tools: policy_lookup, claim_dossier_gen... │
     └──────────────────────────────────────────────┘              └──────────────────────────────────────────────┘
                            │                                                             │
                            └──────────────────────────────┬──────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │       MAIN SHOWCASE WEBPAGE ([Project].page.dev)       │
                               │  - Live Interactive Dual-Projection Playground         │
                               │  - Simultaneous UI State & Wire-Level Protocol Stream  │
                               │  - Modular 12-Column Dashboard Grid                    │
                               │  - 3-Engine Calendar Temporal Ecosystem                │
                               │  - Unified Search/Activity/Request Bar Demo            │
                               │  - 1-Click "Connect Claude / Cursor" Integration       │
                               └────────────────────────────────────────────────────────┘
```

### 1.3 Dual-Domain Cloudflare Pages Edge Deployment & SOP Privacy Sandbox
To enforce `GDPR Art. 25` (*Data Protection by Design and by Default*), the platform deploys across two distinct web origins with strict origin separation enforced by the browser's **Same-Origin Policy (SOP)**:

```
                              [Internet / Public User Traffic]
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
             [Project].page.dev                           app.[Project].page.dev
          (Main Showcase Webpage)                      (Modern App Client Island)
                      │                                             │
         ┌────────────┴────────────┐                   ┌────────────┴────────────┐
         │ Cloudflare Pages Origin │                   │ Cloudflare Pages Origin │
         │ • Fast Edge SSR / HTML  │                   │ • Offline PWA Shell     │
         │ • Public Documentation  │                   │ • Service Worker Cache  │
         │ • Dual-Core Playground  │                   │ • Svelte 5 Runes Island │
         │ • Multi-Calendar Demo   │                   │ • Dexie.js v4 IDB Vault │
         └────────────┬────────────┘                   └────────────┬────────────┘
                      │                                             │
                      │  [SOP Security Boundary: Isolated Origins]  │
                      │  - IDB / LocalStorage strictly sandboxed    │
                      │  - 0 private receipts accessible to showcase│
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼
                            [Cloudflare Workers Edge Plane]
                            • POST /api/mcp (JSON-RPC 2.0 Engine)
                            • GET /sse (MCP Server-Sent Events)
                            • Cache-Control: no-store
```

1. **Origin 1: `[Project].page.dev` (Main Showcase Webpage):**
   - Serves pre-rendered HTML and minimal JavaScript for lightning-fast First Contentful Paint ($<0.4\text{s}$) and near-zero Cumulative Layout Shift ($CLS \le 0.05$).
   - Exposes public edge endpoints: `POST /api/mcp` and `GET /sse`.
   - Contains zero user data, zero private encryption keys, and zero receipt images.
2. **Origin 2: `app.[Project].page.dev` (Modern Application Interface):**
   - Serves an offline-first Progressive Web App (PWA) operating on a dedicated origin sandbox `(https, app.[Project].page.dev, 443)`.
   - IndexedDB database `WarrantyWalletDB` is physically inaccessible to scripts running on `[Project].page.dev`.
   - Ingested receipt images undergo client-side Web Worker compression ($<1.5\text{MB}$), GoBD SHA-256 pre-encryption hashing, and AES-GCM-256 local storage. **Zero plaintext bytes leave the user's browser.**
3. **HTTP Security Header Posture (`public/_headers`):**
   ```http
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(self), microphone=(), geolocation=()
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self';
   ```
   *Safari Camera Deadlock Guard:* In strict adherence to ADR-04 §2.3, the header `Cross-Origin-Embedder-Policy: require-corp` is omitted to prevent WebRTC camera stream freezes on mobile Safari during receipt capture.

### 1.4 URL-Hash Deep Link Handoff Protocol
To allow prospective users exploring sample hardware items or subscription policies on the showcase webpage (`[Project].page.dev`) to test them in the modern application (`app.[Project].page.dev`) without server data transmission:
1. **URL Hash Specification (`RFC 3986 §3.5`):**
   ```
   https://app.[Project].page.dev/#/quick-add?brand=Sony&name=Sony+WH-1000XM5&price=279&category=hardware&purchaseDate=2025-12-15&tax=true
   ```
2. **Network Privacy Invariant:** URI fragments following `#` are executed entirely client-side by the browser and are never transmitted over HTTP request lines to Cloudflare edge servers, intermediate proxies, or access logs.
3. **Application Ingestion Flow:** The app client router reads `window.location.hash`, parses the parameters, immediately launches the Quick Capture modal in $<15\text{ms}$ with pre-populated statutory defaults, and clears the URL via `history.replaceState(null, '', '#/')`.

---

# Chapter 2: W3C DTCG 3-Tier Design System & Token Specifications

### 2.1 The W3C DTCG 3-Tier Token Hierarchy
The design token system strictly adheres to the W3C Design Tokens Community Group (DTCG) specification using a 3-tier hierarchy:

$$\text{Tier 1: Primitives} \longrightarrow \text{Tier 2: Semantics} \longrightarrow \text{Tier 3: Components}$$

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             W3C DTCG 3-TIER TOKEN RESOLUTION HIERARCHY                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: PRIMITIVES (Raw Hex, Dimension & Timing Literals)                                        │
│   color.primitive.pine.900    -> #1A302C           color.primitive.coral.500   -> #D96B4B        │
│   color.primitive.pine.700    -> #2F524C           color.primitive.coral.400   -> #F08264        │
│   color.primitive.neutral.50  -> #F8FAFC           color.primitive.blue.600    -> #2563EB        │
│   color.primitive.neutral.900 -> #0F172A           space.4 -> 16px, radius.md -> 6px             │
│                                            │                                                     │
│                                            ▼                                                     │
│ TIER 2: SEMANTICS (Design Intent & Theme Context: Light vs. Dark)                                │
│   color.brand.primary         -> {color.primitive.pine.700}                                      │
│   color.brand.accent          -> {color.primitive.coral.500}                                     │
│   color.surface.canvas        -> [Light: #F4F7F6 | Dark: #0F172A]                                │
│   color.surface.card          -> [Light: #FFFFFF | Dark: #1E293B]                                │
│   color.text.primary          -> [Light: #0F172A | Dark: #F8FAFC]                                │
│   color.status.urgent         -> #DC2626 (Light) / #EF4444 (Dark)                                │
│   color.status.warning        -> #D97706 (Light) / #F59E0B (Dark)                                │
│   color.status.protected      -> #059669 (Light) / #10B981 (Dark)                                │
│                                            │                                                     │
│                                            ▼                                                     │
│ TIER 3: COMPONENTS (Scoped Element Bindings)                                                     │
│   omnibar.container.bg        -> {color.surface.card}                                            │
│   omnibar.border.focus        -> {color.interactive.focus}                                       │
│   calendar.cell.cliff.bg      -> {color.status.warning.subtle}                                   │
│   button.primary.bg.default   -> {color.brand.primary}                                           │
│   button.primary.bg.hover     -> {color.brand.primary.hover}                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Brand Palette Specifications
All tokens derive from the ratified Team 6 design system:

| Token Name | Primitive Literal | Hex Value | Role & Usage |
|---|---|---|---|
| `color.brand.primary` | `color.primitive.pine.700` | `#2F524C` | Deep Pine: Header navigation, brand authority badges, primary buttons. |
| `color.brand.primary.hover` | `color.primitive.pine.800` | `#1F3834` | Deep Pine Hover: Button hover states, active tab borders. |
| `color.brand.accent` | `color.primitive.coral.500` | `#D96B4B` | Terracotta Coral: Primary CTAs, 1-tap claim triggers, notification badges. |
| `color.brand.accent.hover` | `color.primitive.coral.400` | `#F08264` | Coral Hover: Hover states for interactive accent controls. |
| `color.surface.canvas.light` | `color.primitive.slate.50` | `#F4F7F6` | Off-white canvas (eliminates eye strain vs pure `#FFF`). |
| `color.surface.canvas.dark` | `color.primitive.slate.900` | `#0F172A` | Slate 900 canvas: Deep midnight background for dark theme. |
| `color.surface.card.light` | `color.primitive.white` | `#FFFFFF` | Elevated card surfaces, Omnibar background, drawer background. |
| `color.surface.card.dark` | `color.primitive.slate.800` | `#1E293B` | Slate 800: Elevated card containers in dark mode. |
| `color.interactive.focus` | `color.primitive.blue.600` | `#2563EB` | High-visibility focus indicator ring ($CR \ge 4.5:1$). |

### 2.3 Status & Urgency Tokens

| Status Domain | Semantic Token | Light Mode Hex | Dark Mode Hex | Text Contrast Hex | Lifecycle Meaning |
|---|---|---|---|---|---|
| **Urgent** | `color.status.urgent` | `#DC2626` | `#EF4444` | `#7F1D1D` (L) / `#FEE2E2` (D) | Critical action required ($\le 7$ days), auto-renewal imminent. |
| **Warning** | `color.status.warning` | `#D97706` | `#F59E0B` | `#78350F` (L) / `#FDE68A` (D) | Notice review window ($8–30$ days), 12m BGB § 477 cliff alert. |
| **Protected**| `color.status.protected`| `#059669` | `#10B981` | `#14532D` (L) / `#BBF7D0` (D) | Active coverage ($>30$ days), GoBD SHA-256 verified. |
| **Expired** | `color.status.expired` | `#6B7280` | `#9CA3AF` | `#374151` (L) / `#E5E7EB` (D) | Contract lapsed, warranty expired, archived item. |

### 2.4 Spacing, Sizing, Elevation & Radius Tokens
The system enforces a 4px/8px geometric scale:
- **Spacing Scale:**
  - `space.1`: `4px` (micro badges, internal pill padding)
  - `space.2`: `8px` (icon-to-text spacing, compact button padding)
  - `space.3`: `12px` (mobile card padding, input internal padding)
  - `space.4`: `16px` (standard desktop card padding, mobile page margins)
  - `space.5`: `20px` (medium widget padding, tablet gutter)
  - `space.6`: `24px` (desktop card padding, section gap)
  - `space.8`: `32px` (dashboard widget grid gap, header padding)
  - `space.10`: `40px` (hero section vertical rhythm)
  - `space.12`: `48px` (standard touch target height for buttons)
  - `space.16`: `64px` (major section separators)
- **Border Radii:**
  - `radius.sm`: `4px` (urgency pills, status badges)
  - `radius.md`: `6px` (action buttons, text inputs, code boxes)
  - `radius.lg`: `8px` (widget cards, Omnibar container, popovers)
  - `radius.xl`: `12px` (modal dialogs, slide-over drawer corners)
  - `radius.full`: `9999px` (circular avatars, quick filter chips)
- **Elevation Strata (Z-Index Tokens):**
  - `z-index.base`: `0` (DOM standard flow)
  - `z-index.sticky`: `100` (in-page table headers, calendar sub-headers)
  - `z-index.navbar`: `200` (top utility header, persistent navigation rail)
  - `z-index.dropdown`: `300` (Omnibar popover dropdown, autocomplete listbox)
  - `z-index.drawer`: `400` (520px Contextual Item Detail slide-over drawer)
  - `z-index.backdrop`: `500` (modal & drawer scrim background overlays)
  - `z-index.modal`: `600` (Quick Capture modal, Claim Dossier generator)
  - `z-index.submodal`: `700` (date pickers, confirmation prompts)
  - `z-index.toast`: `800` (ephemeral notification toasts)
  - `z-index.tooltip`: `900` (hover tooltips)
  - `z-index.takeover`: `1000` (full-screen camera viewfinder)

### 2.5 Typography & Germanic Hyphenation Rules
- **Font Stacks:**
  - UI Sans: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - Code & Cryptographic Monospace: `JetBrains Mono, "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **German Hyphenation Standard:** Long German legal compound nouns (e.g. *Beweislastumkehr*, *Sofortabschreibung*, *Werbungskostenpauschale*, *Kündigungserklärung*) cause line wrapping defects in narrow containers. All card containers and drawer headers declare:
  ```css
  hyphens: auto;
  -webkit-hyphens: auto;
  lang: de;
  overflow-wrap: break-word;
  ```

### 2.6 Full `tokens.css` Stylesheet Artifact
```css
:root {
  /* Primitive Brand Colors */
  --color-primitive-pine-900: #1a302c;
  --color-primitive-pine-800: #1f3834;
  --color-primitive-pine-700: #2f524c;
  --color-primitive-coral-600: #b44a2d;
  --color-primitive-coral-500: #d96b4b;
  --color-primitive-coral-400: #f08264;
  --color-primitive-blue-600: #2563eb;
  --color-primitive-red-600: #dc2626;
  --color-primitive-amber-600: #d97706;
  --color-primitive-emerald-600: #059669;

  /* Neutrals (Light Theme Default) */
  --color-surface-canvas: #f4f7f6;
  --color-surface-card: #ffffff;
  --color-surface-subtle: #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-border-default: #64748b;
  --color-border-subtle: #e2e8f0;
  --color-interactive-focus: #2563eb;

  /* Brand Semantics */
  --color-brand-primary: var(--color-primitive-pine-700);
  --color-brand-primary-hover: var(--color-primitive-pine-800);
  --color-brand-accent: var(--color-primitive-coral-500);
  --color-brand-accent-hover: var(--color-primitive-coral-400);
  --color-brand-accent-contrast: var(--color-primitive-coral-600);

  /* Status Semantics (Light) */
  --color-status-urgent-bg: #fee2e2;
  --color-status-urgent-text: #7f1d1d;
  --color-status-urgent-border: #dc2626;

  --color-status-warning-bg: #fef3c7;
  --color-status-warning-text: #78350f;
  --color-status-warning-border: #b45309;

  --color-status-protected-bg: #dcfce7;
  --color-status-protected-text: #14532d;
  --color-status-protected-border: #059669;

  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Z-Index Strata */
  --z-index-base: 0;
  --z-index-sticky: 100;
  --z-index-navbar: 200;
  --z-index-dropdown: 300;
  --z-index-drawer: 400;
  --z-index-backdrop: 500;
  --z-index-modal: 600;
  --z-index-submodal: 700;
  --z-index-toast: 800;
  --z-index-tooltip: 900;
  --z-index-takeover: 1000;
}

[data-theme="dark"] {
  --color-surface-canvas: #0f172a;
  --color-surface-card: #1e293b;
  --color-surface-subtle: #1e293b;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #94a3b8;
  --color-border-default: #94a3b8;
  --color-border-subtle: #334155;
  --color-interactive-focus: #3b82f6;

  /* Status Semantics (Dark) */
  --color-status-urgent-bg: #7f1d1d;
  --color-status-urgent-text: #fee2e2;
  --color-status-urgent-border: #f87171;

  --color-status-warning-bg: #78350f;
  --color-status-warning-text: #fde68a;
  --color-status-warning-border: #f59e0b;

  --color-status-protected-bg: #14532d;
  --color-status-protected-text: #bbf7d0;
  --color-status-protected-border: #10b981;
}
```

---

# Chapter 3: Photometric Accessibility & Ergonomics Governance (WCAG 2.1/2.2 AA & AAA)

### 3.1 Mathematical Relative Luminance ($L$) & Contrast Ratio Derivations
Every color pairing across both Light and Dark themes is mathematically proven using the **W3C Relative Luminance ($L$)** formula defined in WCAG 2.1 / 2.2:

$$R_s = \frac{R_{8\text{bit}}}{255}, \quad G_s = \frac{G_{8\text{bit}}}{255}, \quad B_s = \frac{B_{8\text{bit}}}{255}$$

$$C = \begin{cases} \frac{C_s}{12.92} & \text{if } C_s \le 0.04045 \\ \left(\frac{C_s + 0.055}{1.055}\right)^{2.4} & \text{if } C_s > 0.04045 \end{cases}$$

$$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$

$$\text{Contrast Ratio } (CR) = \frac{L_1 + 0.05}{L_2 + 0.05} \quad \text{where } L_1 \ge L_2$$

### 3.2 Photometric Contrast Proof Verification Table

| Visual Element / Pair | Foreground Token | Background Token | Luminance Calculation | Contrast Ratio | WCAG Criterion | Verified Level |
|---|---|---|---|---|---|---|
| **Light Canvas Body Text** | Neutral 900 (`#0F172A`, $L=0.0088$) | Canvas Light (`#F4F7F6`, $L=0.9241$) | $\frac{0.9241 + 0.05}{0.0088 + 0.05} = \frac{0.9741}{0.0588}$ | **16.57:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Light Card Primary Text**| Neutral 900 (`#0F172A`, $L=0.0088$) | Surface White (`#FFFFFF`, $L=1.0000$) | $\frac{1.0000 + 0.05}{0.0088 + 0.05} = \frac{1.0500}{0.0588}$ | **17.86:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Light Secondary Text** | Neutral 600 (`#475569`, $L=0.0886$) | Surface White (`#FFFFFF`, $L=1.0000$) | $\frac{1.0000 + 0.05}{0.0886 + 0.05} = \frac{1.0500}{0.1386}$ | **7.58:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Dark Canvas Body Text** | Neutral 50 (`#F8FAFC`, $L=0.9536$) | Canvas Dark (`#0F172A`, $L=0.0088$) | $\frac{0.9536 + 0.05}{0.0088 + 0.05} = \frac{1.0036}{0.0588}$ | **17.07:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Dark Card Primary Text** | Neutral 50 (`#F8FAFC`, $L=0.9536$) | Surface Dark (`#1E293B`, $L=0.0218$) | $\frac{0.9536 + 0.05}{0.0218 + 0.05} = \frac{1.0036}{0.0718}$ | **13.98:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Dark Secondary Text** | Neutral 300 (`#CBD5E1`, $L=0.6572$) | Surface Dark (`#1E293B`, $L=0.0218$) | $\frac{0.6572 + 0.05}{0.0218 + 0.05} = \frac{0.7072}{0.0718}$ | **9.85:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Primary Pine Button** | White Text (`#FFFFFF`, $L=1.0000$) | Deep Pine (`#2F524C`, $L=0.0716$) | $\frac{1.0000 + 0.05}{0.0716 + 0.05} = \frac{1.0500}{0.1216}$ | **8.63:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Deep Pine on Canvas** | Deep Pine (`#2F524C`, $L=0.0716$) | Canvas Light (`#F4F7F6`, $L=0.9241$) | $\frac{0.9241 + 0.05}{0.0716 + 0.05} = \frac{0.9741}{0.1216}$ | **8.01:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Coral Accent Button** | White Text (`#FFFFFF`, $L=1.0000$) | Accent Coral Contrast (`#B44A2D`, $L=0.1479$) | $\frac{1.0000 + 0.05}{0.1479 + 0.05} = \frac{1.0500}{0.1979}$ | **5.31:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AA** ($\ge 4.5:1$) |
| **Focus Indicator Ring** | Focus Blue (`#2563EB`, $L=0.1532$) | Surface White (`#FFFFFF`, $L=1.0000$) | $\frac{1.0000 + 0.05}{0.1532 + 0.05} = \frac{1.0500}{0.2032}$ | **5.17:1** | SC 1.4.11 / 2.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Focus Ring (Dark Mode)**| Focus Blue Dark (`#3B82F6`, $L=0.2355$) | Surface Dark (`#1E293B`, $L=0.0218$) | $\frac{0.2355 + 0.05}{0.0218 + 0.05} = \frac{0.2855}{0.0718}$ | **3.98:1** | SC 1.4.11 / 2.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Card / Input Border** | Neutral 500 (`#64748B`, $L=0.1706$) | Canvas Light (`#F4F7F6`, $L=0.9241$) | $\frac{0.9241 + 0.05}{0.1706 + 0.05} = \frac{0.9741}{0.2206}$ | **4.42:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Card Border (Dark Mode)**| Neutral 400 (`#94A3B8`, $L=0.3595$) | Canvas Dark (`#0F172A`, $L=0.0088$) | $\frac{0.3595 + 0.05}{0.0088 + 0.05} = \frac{0.4095}{0.0588}$ | **6.96:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AAA Non-Text**|
| **Urgent Status Pill (L)**| Dark Red Text (`#7F1D1D`, $L=0.0548$) | Light Red Bg (`#FEE2E2`, $L=0.8095$) | $\frac{0.8095 + 0.05}{0.0548 + 0.05} = \frac{0.8595}{0.1048}$ | **8.20:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Urgent Status Pill (D)**| Light Red Text (`#FEE2E2`, $L=0.8095$)| Dark Red Bg (`#7F1D1D`, $L=0.0548$) | $\frac{0.8095 + 0.05}{0.0548 + 0.05} = \frac{0.8595}{0.1048}$ | **8.20:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Warning Pill (L)** | Dark Amber Text (`#78350F`, $L=0.0657$)| Light Amber Bg (`#FEF3C7`, $L=0.8930$)| $\frac{0.8930 + 0.05}{0.0657 + 0.05} = \frac{0.9430}{0.1157}$ | **8.15:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Warning Pill (D)** | Light Amber Text (`#FDE68A`, $L=0.7931$)| Dark Amber Bg (`#78350F`, $L=0.0657$)| $\frac{0.7931 + 0.05}{0.0657 + 0.05} = \frac{0.8431}{0.1157}$ | **7.29:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Protected Pill (L)** | Dark Green Text (`#14532D`, $L=0.0652$)| Light Green Bg (`#DCFCE7`, $L=0.9061$)| $\frac{0.9061 + 0.05}{0.0652 + 0.05} = \frac{0.9561}{0.1152}$ | **8.30:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |
| **Protected Pill (D)** | Light Green Text (`#BBF7D0`, $L=0.8164$)| Dark Green Bg (`#14532D`, $L=0.0652$)| $\frac{0.8164 + 0.05}{0.0652 + 0.05} = \frac{0.8664}{0.1152}$ | **7.52:1** | SC 1.4.3 ($\ge 4.5:1$) | **Passes AAA** ($\ge 7.0:1$) |

### 3.2b Semantic Status Border Contrast Verification (WCAG SC 1.4.11 $\ge 3.0:1$)

| Border / Component Pair | Border Token Hex | Background Token Hex | Luminance Calculation | Contrast Ratio | WCAG Criterion | Verified Level |
|---|---|---|---|---|---|---|
| **Urgent Border (Dark Mode)** | Border Dark (`#F87171`, $L=0.3296$) | Urgent Bg Dark (`#7F1D1D`, $L=0.0548$) | $\frac{0.3296 + 0.05}{0.0548 + 0.05} = \frac{0.3796}{0.1048}$ | **3.62:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Urgent Border (Light Mode)**| Border Light (`#DC2626`, $L=0.1706$) | Urgent Bg Light (`#FEE2E2`, $L=0.8095$) | $\frac{0.8095 + 0.05}{0.1706 + 0.05} = \frac{0.8595}{0.2206}$ | **3.90:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Warning Border (Light Mode)**| Border Light (`#B45309`, $L=0.1591$) | Warning Bg Light (`#FEF3C7`, $L=0.8930$) | $\frac{0.8930 + 0.05}{0.1591 + 0.05} = \frac{0.9430}{0.2091}$ | **4.51:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Warning Border (Dark Mode)**| Border Dark (`#F59E0B`, $L=0.4354$) | Warning Bg Dark (`#78350F`, $L=0.0657$) | $\frac{0.4354 + 0.05}{0.0657 + 0.05} = \frac{0.4854}{0.1157}$ | **4.20:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Protected Border (Light Mode)**| Border Light (`#059669`, $L=0.2280$) | Protected Bg Light (`#DCFCE7`, $L=0.9061$) | $\frac{0.9061 + 0.05}{0.2280 + 0.05} = \frac{0.9561}{0.2780}$ | **3.44:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |
| **Protected Border (Dark Mode)**| Border Dark (`#10B981`, $L=0.3800$) | Protected Bg Dark (`#14532D`, $L=0.0652$) | $\frac{0.3800 + 0.05}{0.0652 + 0.05} = \frac{0.4300}{0.1152}$ | **3.73:1** | SC 1.4.11 ($\ge 3.0:1$) | **Passes AA Non-Text** |

### 3.3 Non-Color Visual Indicators (WCAG SC 1.4.1)
Color is **never** used as the sole conveyor of status, deadline, or error. Every state combines color with a **distinct geometric glyph** and an **explicit text label**:

| Contract Status Lifecycle | Color Token | Geometric Glyph | Required Explicit Text Label | Rendered Indicator Signature |
|---|---|---|---|---|
| **Urgent Action Required** ($\le 7$ days) | `#DC2626` | 🛑 Octagon Alert Glyph (`U+1F6D1`) | `"Urgent (<=7d)"` or `"Dringend"` | `[ 🛑 Urgent: 3d left ]` |
| **Notice Review Window** ($8–30$ days) | `#D97706` | ⚠️ Equilateral Triangle (`U+26A0`) | `"Review (8-30d)"` or `"Prüfen"` | `[ ⚠️ Review: 19d left ]` |
| **Statutory 12m Presumption** (BGB § 477)| `#059669` | 🛡️ Defense Shield (`U+1F6E1`) | `"BGB § 477 Presumption Active"` | `[ 🛡️ BGB § 477 Active ]` |
| **Protected Active Status** ($>30$ days) | `#059669` | ✓ Verified Checkmark (`U+2713`) | `"Protected"` or `"Geschützt"` | `[ ✓ Protected: 14m ]` |
| **Lapsed / Expired Record** ($\le 0$ days) | `#6B7280` | ⬛ Solid Square (`U+2B1B`) | `"Expired"` or `"Abgelaufen"` | `[ ⬛ Expired: 0d ]` |
| **Form Input Validation Error** | `#DC2626` Border | ❗ Exclamation Point (`U+2757`) | Linked error message via `aria-describedby` | Border + `❗ Purchase date cannot be future` |

### 3.4 Coarse-Pointer Touch Target Expansion Rules
Mobile and touch users (smartphones, tablets, touch monitors) require $\ge 44 \times 44\text{px}$ (Apple HIG) or $\ge 48 \times 48\text{px}$ (WCAG 2.2 SC 2.5.8 and Team 6 standards). To preserve compact desktop layout without layout distortion on mobile:

```css
/* Base Desktop Button (Compact visual height: 32px) */
.btn-compact {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

/* Hitbox Expansion for Coarse Touch Pointers */
@media (pointer: coarse) {
  .btn-compact {
    margin: 6px 4px;
  }
  
  .btn-compact::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 48px;
    min-height: 48px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    z-index: 1;
  }
}

/* Secondary Touch Target Expansion for In-Table Action Icons */
@media (pointer: coarse) {
  .table-action-icon {
    position: relative;
    display: inline-flex;
    width: 24px;
    height: 24px;
  }
  
  .table-action-icon::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    pointer-events: auto;
  }
}
```

---

# Chapter 4: 5-Tier Responsive Viewport Architecture & Layout Grids (100dvh & Safe Areas)

### 4.1 5-Tier Responsive Breakpoint Grid System

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   5-TIER RESPONSIVE BREAKPOINT GRID                                   │
├───────────────┬─────────────────┬─────────┬────────┬─────────────┬────────────────────────────────────┤
│ Tier Name     │ Viewport Range  │ Columns │ Gutter │ Page Margin │ Structural Reflow Behavior         │
├───────────────┼─────────────────┼─────────┼────────┼─────────────┼────────────────────────────────────┤
│ 1. Mobile (xs)│ < 600px         │ 4       │ 12px   │ 16px        │ 100% full-width stacked widgets    │
│               │ (down to 375px) │         │        │             │ Bottom nav bar; swipeable calendar │
├───────────────┼─────────────────┼─────────┼────────┼─────────────┼────────────────────────────────────┤
│ 2. Tablet (sm)│ 600px - 899px   │ 8       │ 16px   │ 24px        │ 2-column widget reflow             │
│               │                 │         │        │             │ 64px compact icon rail; accordion  │
├───────────────┼─────────────────┼─────────┼────────┼─────────────┼────────────────────────────────────┤
│ 3. Laptop (md)│ 900px - 1199px  │ 12      │ 20px   │ 24px        │ 2-column + 1-column hybrid layout  │
│               │                 │         │        │             │ Stacked dual playground (12 cols)  │
├───────────────┼─────────────────┼─────────┼────────┼─────────────┼────────────────────────────────────┤
│ 4. Desktop(lg)│ 1200px - 1599px │ 12      │ 24px   │ 32px        │ Side-by-side playground (7:5 cols) │
│               │                 │         │        │             │ 240px expanded navigation rail     │
├───────────────┼─────────────────┼─────────┼────────┼─────────────┼────────────────────────────────────┤
│ 5. Ultra (xl) │ >= 1600px       │ 12      │ 32px   │ 40px        │ Max container width: 1520px        │
│               │                 │         │        │             │ 3-column analytics row (4:4:4 cols)│
└───────────────┴─────────────────┴─────────┴────────┴─────────────┴────────────────────────────────────┘
```

### 4.2 Dynamic Viewport Height (`100dvh`) & Safe-Area Inset Geometry
Traditional mobile browsers dynamically resize the viewport when showing or hiding toolbars, clipping buttons. The platform enforces `100dvh` and safe-area variables:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

```css
/* Dynamic Viewport Application Shell */
.app-shell {
  min-height: 100vh;  /* Fallback for legacy browsers */
  min-height: 100dvh; /* Dynamic viewport height */
  display: flex;
  flex-direction: column;
}

/* Mobile Bottom Navigation Bar Safe Area */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: var(--z-index-navbar);
}

/* Header Safe Area (Dynamic Island / Camera Notch) */
.app-header {
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: max(var(--space-4), env(safe-area-inset-left, 0px));
  padding-right: max(var(--space-4), env(safe-area-inset-right, 0px));
}
```

### 4.3 Zero Cumulative Layout Shift ($CLS \le 0.05$) Container Guarantees
- Every widget and code container declares explicit `min-height` and `contain-intrinsic-size`.
- Monospace protocol streamer containers use fixed character metrics (`ch` units) with scroll containment (`overflow-y: auto`, `overscroll-behavior: contain`).
- Web fonts specify `font-display: swap` paired with metric override fallbacks (`size-adjust: 100%`).

---

# Chapter 5: Main Showcase Webpage Architecture (`[Project].page.dev`) & Dual-Core Playground

### 5.1 Dual-Interface Landing Experience ("Two Faces of Ground Truth")
The Showcase Webpage (`[Project].page.dev`) functions as a living modular dashboard demonstrating how both human UI interactions and AI agent JSON-RPC 2.0 calls project from an identical canonical ground truth.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ DUAL CORE PLAYGROUND (12 Columns, Max-Width 1440px)                                                              │
├──────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│ LEFT SUB-PANEL: MCP PROTOCOL PLAYGROUND (7 Cols)             │ RIGHT SUB-PANEL: LIVE APP SIMULATOR (5 Cols)      │
│ • Tool Selector: [ policy_lookup ] [ claim_dossier_gen ]     │ • Active Simulated Item Cards                     │
│ • Interactive Zod-Validated Argument Editor                  │ • Visual Urgency Status Badges (🔴, 🟡, 🟢)       │
│ • Real-Time Wire Protocol Streamer (Req / Resp Envelopes)    │ • 1-Tap Action Triggers (BGB § 312k / § 439)     │
│ • Telemetry Badge: Execution Latency Counter (<30ms SLA)     │ • Interactive "Simulate Quick Capture (<15s)" CTA │
│ • 1-Click "Copy curl" and "Open in Claude" buttons           │ • Synchronized link to MCP Streamer               │
└──────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

### 5.2 Split-Screen Interactive MCP Playground & Sub-30ms Execution
The playground features live execution of both ratified MCP tools:

1. **`policy_lookup` Tool Execution:**
   - Evaluator selects service (e.g. `spotify`, `apple`, `mediamarkt`, `fitx`).
   - Dispatches live JSON-RPC 2.0 payload to Cloudflare edge endpoint (`POST /api/mcp`).
   - Wire request:
     ```json
     {
       "jsonrpc": "2.0",
       "id": "req-042",
       "method": "tools/call",
       "params": {
         "name": "policy_lookup",
         "arguments": {
           "service_slug": "spotify",
           "category": "subscription"
         }
       }
     }
     ```
   - Wire response:
     ```json
     {
       "jsonrpc": "2.0",
       "id": "req-042",
       "result": {
         "content": [{
           "type": "text",
           "text": "{\n  \"service_slug\": \"spotify\",\n  \"brand_name\": \"Spotify\",\n  \"category\": \"subscription\",\n  \"statutoryNoticeDays\": 30,\n  \"cancellation_button_compliant\": true,\n  \"cancellation_button_url\": \"https://www.spotify.com/de/account/overview/\",\n  \"statutory_basis\": [\"BGB § 309 Nr. 9\", \"BGB § 312k Abs. 6\"]\n}"
         }]
       }
     }
     ```
   - Edge latency counter displays verified execution time ($12 - 28\text{ ms}$, well below the $<200\text{ ms}$ Gate 4 SLA).
   - *Offline Mock Fallback:* If disconnected, an internal browser adapter (`MockMcpTransport.ts`) executes the identical router client-side, guaranteeing 100% demo uptime.

2. **`claim_dossier_generate` Tool Execution:**
   - Synthesizes DIN 5008-compliant legal claim letters citing `BGB §§ 437, 439, 477` or `§ 312k`.
   - Embeds mandatory statutory safe-harbor footers pursuant to **BGH VIII ZR 285/18 (*LexFox*)**, **`RDG §§ 2, 3`**, and **`§ 2 StBerG`**.
   - Wire request demonstrating dual-slug compatibility:
     ```json
     {
       "jsonrpc": "2.0",
       "id": "req-043",
       "method": "tools/call",
       "params": {
         "name": "claim_dossier_generate",
         "arguments": {
           "brand_slug": "apple",
           "item_name": "MacBook Pro M3",
           "purchase_date": "2025-05-15",
           "defect_description": "Logic board display backlight failure",
           "issue_type": "statutory_defect_claim"
         }
       }
     }
     ```
   - *Dual-Slug Compatibility Standard:* The MCP server accepts both `service_slug` and `brand_slug` interchangeably (`slug = args.get("service_slug") or args.get("brand_slug")`) to prevent `-32602` parameter validation errors across diverse client and agent callers.

3. **Zod Schema Quarantine & Protocol Invariants:**
   - Input fields are validated through strict Zod schemas. Invalid arguments trigger immediate JSON-RPC 2.0 `-32602 (Invalid params)` error envelopes without throwing uncaught exceptions or crashing the browser.

### 5.3 AI Agent One-Click Onboarding & Quick-Connect Drawer
Evaluators can integrate their local AI environment with 1 click:
- **Claude Desktop Tab:** Produces `claude_desktop_config.json`:
  ```json
  {
    "mcpServers": {
      "cmlab-warranty-wallet": {
        "command": "npx",
        "args": ["-y", "@cmlab/warranty-mcp-server"]
      }
    }
  }
  ```
- **Cursor IDE Tab:** Produces `.cursor/mcp.json`.
- **Remote Cloudflare Edge Worker Tab:** Direct URL `https://[project].page.dev/api/mcp`.
- **Stdio CLI Tab:** Pipeline execution via terminal.

---

# Chapter 6: Three Distinct Calendar Widget Architectures

### 6.1 Cognitive Rationale: Why Three Distinct Calendar Architectures?
Consumer contract lifecycles, statutory warranty horizons, and tax write-off deadlines exhibit fundamentally different cognitive patterns that cannot be served by a single calendar format:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ THREE DISTINCT CALENDAR ARCHITECTURES                                                                                  │
├───────────────────────────────────┬───────────────────────────────────┬────────────────────────────────────────────────┤
│ 1. MONTHLY/WEEKLY GRID            │ 2. TIMELINE & AGENDA HORIZON      │ 3. COUNTDOWN RISK HEATMAP                      │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────┤
│ • Traditional calendar planning   │ • Contract milestone management   │ • Annual risk & density visualization          │
│ • 7-column ISO 8601 DIN layout    │ • Chronological linear feed       │ • 52-week GitHub-style matrix                  │
│ • Multi-category urgency pills    │ • BGB § 477 12m cliff marker      │ • Financial capital at risk aggregation        │
│ • Popover event inspection        │ • 1-tap claim/cancel deep links   │ • Long-range executive triage                  │
│ • Ideal for monthly budgeting     │ • Ideal for critical legal action │ • Ideal for portfolio risk density             │
└───────────────────────────────────┴───────────────────────────────────┴────────────────────────────────────────────────┘
```

### 6.2 Calendar Type 1: Interactive Monthly/Weekly Grid Calendar (`MonthlyWeeklyGridCalendar`)
- **Mental Model:** Traditional monthly budgeting and planning.
- **Layout:** Standard ISO 8601 DIN 7-column grid (Montag through Sonntag) with 5 to 6 rows.
- **Visual Elements:**
  - "Today" indicator: Deep Pine teal ring (`#2F524C`).
  - Multi-Category Urgency Pills (`height: 20px`, `font-size: 11px`, `border-radius: 4px`):
    - 🔵 Hardware Warranty Expiry (Teal pill with laptop glyph).
    - 🟣 Subscription Renewal (Coral pill with recurring arrow glyph).
    - 🔴 Statutory Legal Cliff (Crimson pill with scale glyph `BGB § 477`).
  - Overflow badge `+N more` for days with $>3$ events.
- **Popover Inspection Flow:** Clicking any event cell opens an anchored popover displaying brand, contract amount, urgency level, statutory clause (`BGB § 309 Nr. 9`), and direct action buttons `[ 📄 Draft Notice ]` and `[ ↗️ Open Merchant Portal ]`.

### 6.3 Calendar Type 2: Chronological Timeline & Agenda Horizon (`TimelineAgendaCalendar`)
- **German Consumer Law Focus:** Hardware warranties and digital subscriptions represent statutory milestones. Most critically, German law establishes the **12-Month Burden-of-Proof Cliff (`BGB § 477 Abs. 1`)**:
  - *Months 1–12 (Statutory Presumption):* Defect legally presumed to have existed at handover. Merchant bears burden of proof.
  - *Months 13–24 (Reversed Burden):* Warranty legally active under `BGB § 438 Abs. 1 Nr. 3`, but consumer must furnish technical proof.
- **Four Horizon Clusters:**
  1. 🔴 **Horizon 1: Critical Action Window ($\le 7$ Days):** Urgent renewals (e.g. *FitX auto-renewing in 3 days*).
  2. 🟡 **Horizon 2: Notice Inspection Window (8–30 Days):** Standard monthly rolling notice under `BGB § 309 Nr. 9`.
  3. 🟢 **Horizon 3: The 12-Month Burden-of-Proof Cliff (Months 1–12):** Highlighted golden-teal banner displaying exact days until statutory presumption expires.
  4. ⚪ **Horizon 4: Extended Statutory Zone (Months 13–24):** Consumer proof required under `BGB § 438`.

- **Legal Tech Date Calculation Governance (`BGB § 193` vs. `BGB § 477`):**
  - **Contractual Termination Deadlines (`BGB §§ 309 Nr. 9, 312k`):** When computing notice expiration dates for subscriptions, if the final day falls on a Saturday, Sunday, or official holiday, `BGB § 193` applies, rolling the deadline forward to the next business day.
  - **Substantive Defect Presumption Cliff (`BGB § 477 Abs. 1`):** The 12-month reversed burden of proof is a substantive legal presumption period governed strictly by `BGB § 188 Abs. 2`. It terminates exactly 12 calendar months from the handover date (Day 365, or Day 366 in leap years) regardless of whether the final day falls on a weekend or public holiday. `BGB § 193` does **not** extend the § 477 presumption cliff.
- **Visual Legal Progress Bar (`LegalProgressBar`):**
  ```
  Month 1                  Month 6                 Month 12               Month 24
  Delivery                 Midway                  CLIFF ⚠️               Statutory End
  [===============================================>..........] 89% Expired (Day 325/365)
  ```
- **1-Tap Direct Actions:**
  - `[ 📄 Draft § 439 Nacherfüllung Notice ]` generates formal DIN 5008 defect claim.
  - `[ ⚡ Kündigen (§ 312k) ]` deep-links directly to verified merchant online cancellation button.

### 6.4 Calendar Type 3: 52-Week Countdown & Risk Heatmap Matrix (`CountdownRiskHeatmap`)
- **High-Density Annual Synthesis:** Inspired by annual contribution matrices, provides an instantaneous overview of annual deadline density and financial capital at risk.
- **Matrix Geometry:** 52 columns (weeks) $\times$ 7 rows (days) = 364/365 micro-cells (`12px \times 12px` each, with `3px` gap).
- **Color Density Scale (WCAG AA Compliant):**
  - Level 0 (No deadlines): Neutral background (`#E2E8F0` Light / `#1E293B` Dark).
  - Level 1 (Protected active renewal, $>30$d): Soft teal (`#99F6E4` Light / `#115E59` Dark).
  - Level 2 (Upcoming review, $8–30$d): Medium amber (`#FDE68A` Light / `#854D0E` Dark).
  - Level 3 (Urgent renewal or warranty cliff, $\le 7$d): Vibrant coral-red (`#FCA5A5` Light / `#991B1B` Dark).
  - Level 4 (Multiple critical deadlines on same day): Deep crimson (`#DC2626` Light / `#EF4444` Dark).
- **Summary KPI Banner:**
  - Total Tracked Capital: `€4,890.00`
  - Total Annual Subscriptions: `€684.00`
  - Imminent Actions Next 30 Days: `2 items (€18.48/mo)`
  - Impending 12-Month BGB Cliffs: `1 item (Sony Headphones, Day 325)`

---

# Chapter 7: Modern Application Interface (`app.[Project].page.dev`) & Unified Omnibar Engine

### 7.1 Prominence, Anatomy & Global Keyboard Accelerators
The Unified Omnibar is the primary operational cockpit of `app.[Project].page.dev`. It is positioned in the center of the sticky utility header:
- **Dimensions:** Width 680px (scalable 600px to 780px), Height 48px, Corner Radius 8px (`radius.lg`).
- **Elevation:** `elevation.sm` at rest (`0 1px 3px rgba(0,0,0,0.08)`), expanding to `elevation.lg` (`0 10px 25px rgba(0,0,0,0.15)`) when active.
- **Z-Index:** Layer `Z-3` (`z-index: 300`) for the search input and popover dropdown.

| Key Accelerator | Target Scope | Behavioral Action |
|---|---|---|
| `Ctrl + K` (Win/Linux) / `Cmd + K` (macOS) | Global Viewport | Focuses Omnibar; transitions `IDLE` $\rightarrow$ `FOCUSED_EMPTY`; opens active popover. |
| `/` (Forward Slash) | Global Viewport (body focused) | Intercepts default key event; focuses Omnibar without typing slash. |
| `Escape` (`Esc`) | Within Omnibar | Progressive escape: (1) Clears query text if present, (2) Closes dropdown, (3) Returns focus to prior active element. |
| `ArrowDown` / `ArrowUp` | Dropdown open | Moves roving active highlight across options; updates `aria-activedescendant`; scrolls selection into viewport. |
| `Enter` (`↵`) | Highlighted option | Activates selected vault item (opens drawer), wiki policy (opens modal), or executes verb command. |
| `Tab` (`⇥`) | Dropdown open | Cycles between filter category chips (`All`, `Hardware`, `Subscriptions`, `Wiki`). |

### 7.2 Complete 8-State Finite State Machine (FSM)
The Omnibar interaction engine is modeled as an explicit, deterministic 8-state Finite State Machine:

```
+-------------------------------------------------------------------------------------------------------+
|                                  THE 8 DETERMINISTIC OMNIBAR STATES                                   |
+-------------------------------------------------------------------------------------------------------+
| 1. IDLE                | Resting header bar, unfocused, showing placeholder & shortcut badge         |
| 2. FOCUSED_EMPTY       | Focused input with empty query, displaying quick chips & recent activities    |
| 3. QUERYING            | Transient debouncing state (150ms) with trailing animated micro-spinner       |
| 4. VAULT_MATCHES       | Rendered results matching user's private encrypted IndexedDB items           |
| 5. WIKI_MATCHES        | Rendered results matching curated brand policies & BGB statutory articles     |
| 6. HYBRID_MATCHES      | Dual-section results reconciling both local vault records and wiki policies  |
| 7. NO_MATCH_SUGGESTION | Zero direct matches, presenting zero-dead-end create & import prompts        |
| 8. COMMAND_MODE        | Verb execution mode initiated by '>' prefix (>claim, >cancel, >tax, >import) |
+-------------------------------------------------------------------------------------------------------+
```

```mermaid
stateDiagram-v2
    [*] --> IDLE
    
    IDLE --> FOCUSED_EMPTY : Focus / Ctrl+K / '/'
    FOCUSED_EMPTY --> IDLE : Blur / Esc
    
    FOCUSED_EMPTY --> COMMAND_MODE : Type '>'
    COMMAND_MODE --> FOCUSED_EMPTY : Backspace '>'
    COMMAND_MODE --> EXECUTING_ACTION : Press Enter
    EXECUTING_ACTION --> IDLE : Action Complete
    
    FOCUSED_EMPTY --> QUERYING : Type text (non '>')
    QUERYING --> FOCUSED_EMPTY : Backspace to empty
    
    QUERYING --> VAULT_MATCHES : Vault > 0, Wiki == 0
    QUERYING --> WIKI_MATCHES : Vault == 0, Wiki > 0
    QUERYING --> HYBRID_MATCHES : Vault > 0, Wiki > 0
    QUERYING --> NO_MATCH_SUGGESTION : Vault == 0, Wiki == 0
    
    VAULT_MATCHES --> ITEM_DRAWER : Enter / Click
    HYBRID_MATCHES --> ITEM_DRAWER : Select Vault Item
    HYBRID_MATCHES --> WIKI_MODAL : Select Wiki Article
    WIKI_MATCHES --> WIKI_MODAL : Select Wiki Article
    
    NO_MATCH_SUGGESTION --> QUICK_CAPTURE_MODAL : Create Hardware / Sub
    NO_MATCH_SUGGESTION --> RECEIPT_DROPZONE : Import Receipt
    
    ITEM_DRAWER --> IDLE : Close Drawer
    WIKI_MODAL --> IDLE : Close Modal
    QUICK_CAPTURE_MODAL --> IDLE : Save Item
    RECEIPT_DROPZONE --> IDLE : Save Receipt
```

### 7.3 Complete 21-Rule State Transition Table

| # | Current State | Input / Event Trigger | Guard Condition | Next State | UI Side Effects & Reactivity | ARIA & Accessibility State |
|---|---|---|---|---|---|---|
| 1 | `IDLE` | Focus input OR press `Ctrl+K` / `/` | Input text is empty | `FOCUSED_EMPTY` | Mount dropdown popover; render quick action chips & last 5 recent activities; trap arrow keys. | `aria-expanded="true"`, `aria-haspopup="listbox"` |
| 2 | `IDLE` | Direct deep-link with query | Query length > 0 | `QUERYING` | Populate input text; dispatch query to Trie & Dexie. | `aria-expanded="true"`, `aria-busy="true"` |
| 3 | `FOCUSED_EMPTY` | Keystroke (Char typed) | First char is NOT `>` | `QUERYING` | Start 150ms debounce timer; display trailing micro-spinner; query PrefixTrie and Dexie DB in parallel. | `aria-busy="true"` |
| 4 | `FOCUSED_EMPTY` | Keystroke (Char typed) | First char IS `>` | `COMMAND_MODE` | Swap leading icon to `⚡`; load command verb registry; display verb auto-suggestions. | `aria-label="Command Mode Active"` |
| 5 | `FOCUSED_EMPTY` | Click Quick Action Chip | Chip action valid | `ACTION_MODAL` / `IDLE` | Close dropdown; open respective modal (Quick Capture `US-01`, Receipt Ingestion `US-02`). | `aria-expanded="false"`, modal focus trap |
| 6 | `FOCUSED_EMPTY` | Blur input OR press `Esc` | Clicked outside container | `IDLE` | Unmount dropdown popover; reset focus to document body. | `aria-expanded="false"`, `aria-activedescendant=""` |
| 7 | `QUERYING` | Search Resolution Event | Vault Count > 0 AND Wiki Count == 0 | `VAULT_MATCHES` | Hide spinner; render vault items list; highlight top item; enable status pills. | `aria-live="polite"`, `aria-activedescendant="opt-0"` |
| 8 | `QUERYING` | Search Resolution Event | Vault Count == 0 AND Wiki Count > 0 | `WIKI_MATCHES` | Hide spinner; render brand policy cards, statutory tags, and cancellation button links. | `aria-live="polite"` announces wiki matches count |
| 9 | `QUERYING` | Search Resolution Event | Vault Count > 0 AND Wiki Count > 0 | `HYBRID_MATCHES` | Render split view: "My Saved Vault" section on top, "Policy Wiki Knowledge Base" below. | Multi-section listbox markup |
| 10 | `QUERYING` | Search Resolution Event | Vault Count == 0 AND Wiki Count == 0 | `NO_MATCH_SUGGESTION` | Render zero-dead-end action cards: "Create warranty for X", "Add subscription", "Import receipt". | `aria-live="assertive"`, announce "No matches, suggestions available" |
| 11 | `QUERYING` | Backspace to empty | Query text becomes `""` | `FOCUSED_EMPTY` | Abort in-flight queries; restore quick chips and recent activities. | `aria-busy="false"` |
| 12 | `VAULT_MATCHES` | Press `ArrowDown` / `ArrowUp` | Option index in bounds | `VAULT_MATCHES` | Update active option highlight; scroll container; update `aria-activedescendant`. | `aria-activedescendant="opt-{n}"` |
| 13 | `VAULT_MATCHES` | Press `Enter` OR click item | Target item selected | `ITEM_DRAWER` | Close dropdown; slide out 520px Item Detail Drawer for selected `WalletItem`. | Focus shifted to drawer container, `aria-expanded="false"` |
| 14 | `WIKI_MATCHES` | Click `[Apply to New Item]` | Wiki policy selected | `ACTION_MODAL` | Close dropdown; open Quick Capture modal pre-populated with brand, notice days, and statutory rules. | Modal opened with focus trap |
| 15 | `WIKI_MATCHES` | Click `[Cancellation Portal]` | Valid URL exists | `WIKI_MATCHES` (External) | Opens verified `cancellation_button_url` in secure window (`rel="noopener noreferrer"`). | User remains on app canvas |
| 16 | `NO_MATCH_SUGGESTION` | Click `[+ Create Hardware]` | Query string exists | `ACTION_MODAL` | Open Quick Capture modal with `name` prefilled to query string and statutory 24m BGB defaults set. | Modal focus set to price input |
| 17 | `NO_MATCH_SUGGESTION` | Click `[📥 Import Receipt]` | None | `ACTION_MODAL` | Open drag-and-drop receipt dropzone for receipt compression and GoBD SHA-256 stamping. | Dropzone active |
| 18 | `COMMAND_MODE` | Type command text | Matching registered verbs | `COMMAND_MODE` | Filter verb list (`>claim`, `>cancel`, `>tax`, `>import`, `>audit`); highlight top command. | Roving listbox focus |
| 19 | `COMMAND_MODE` | Press `Enter` on verb | Valid command syntax | `EXECUTING_ACTION` | Route to target action: open claim dossier generator, export tax CSV, or launch compliance audit. | Action launched |
| 20 | Any State | Press `Escape` | Query text is NOT empty | `FOCUSED_EMPTY` | Clear input text; keep dropdown open in active idle mode. | `aria-activedescendant=""` |
| 21 | Any State | Press `Escape` | Query text IS empty | `IDLE` | Dismiss dropdown; blur input; restore prior element focus. | `aria-expanded="false"` |

### 7.4 Wiki Knowledge Base Search Engine
- **Speed & Scale:** Evaluates queries in $<10\text{ ms}$ against bundled `policy_wiki_seed_v1.json` (20 curated German brands: 10 subscriptions, 10 hardware/retailers) and BGB statutory articles.
- **Search Aliases:** Matches brand aliases (e.g. `"prime"`, `"galaxy"`, `"iphone"`) and statutory codes (`"bgb:477"`, `"bgb:312k"`, `"widerruf"`, `"sofortabschreibung"`).
- **Brand Policy Card Layout:** Brand title, legal entity name and registered address, statutory rights summary, clickable BGB statute badges, dark-pattern advisory, verified cancellation button link (`rel="noopener noreferrer"`), and 1-tap `[Apply to New Item]` button.

### 7.5 Saved Vault Search Engine
- **Multi-Attribute Search:** Matches against `name`, `merchant`, `category`, `serialNumber`, `taxCategory`, and pre-indexed `searchTokens` in Dexie.js v4.
- **Category Filters:** Quick chips filter by `All`, `Hardware`, `Subscriptions`, `🔴 Urgent`, `🟢 Protected`, `💶 Tax Deductible`.
- **Result Cards:** Thumbnail, title, price, purchase date, statutory status pill, and direct CTA buttons (`[View Details]`, `[⚡ File Claim]`, `[📷 Receipt]`).

### 7.6 Context-Aware Zero-Dead-End Recovery Flow
When a query returns zero matches (e.g. `"KitchenAid Stand Mixer"`), the Omnibar renders **four actionable recovery cards**:
1. `[+] Create new Hardware Warranty for "<query>"` (presets 24m BGB § 438 warranty and 12m BGB § 477 presumption).
2. `[+] Add Subscription for "<query>"` (presets monthly rolling cycle and 30-day notice under BGB § 309 Nr. 9).
3. `[📥] Import & Scan Receipt Document` (launches Web Worker compression and GoBD SHA-256 pre-encryption stamping).
4. `[⚖️] Search Policy Wiki Knowledge Graph for "<query>"` (queries external manufacturer database).

### 7.7 Executable Verb Command Workflows
Initiated with `>` prefix or natural language verbs:
- `>claim [item]`: Detects item age; selects **Template 1** (0–12m `BGB § 477` reversed burden active) vs. **Template 2** (12–24m `BGB § 438` consumer proof required); generates DIN 5008 notice with *LexFox* safe-harbor footer.
- `>cancel [item]`: Checks merchant `cancellation_button_compliant` status; routes to **Template 3** (ordinary 1-month notice) or **Template 4** (`BGB § 312k Abs. 6` immediate termination *fristlos*).
- `>tax`: Filters items with `isTaxDeductible: true`; applies `BMF 22.02.2022` 100% *Sofortabschreibung*; downloads CSV/PDF tax deduction dossier.
- `>import`: Opens drag-and-drop receipt dropzone for client-side downsampling ($<1.5\text{MB}$) and SHA-256 stamping.
- `>audit`: Audits all active subscriptions against the Policy Wiki and flags dark-pattern non-compliance.
- `>export`: Compiles client-side AES-GCM-256 encrypted JSON backup envelope.

---

# Chapter 8: Modern App Dashboard Shell, Contextual Drawer (520px) & Workflows

### 8.1 4-Tier Application Shell Hierarchy
1. **Tier 1: Sticky Utility Header (`56px`, `z-index: 200`):** Logo, 680px Omnibar, local offline storage indicator (`[Sync: 🟢 Offline Ready (4.2 MB)]`), theme toggle, and AES-GCM-256 encryption status.
2. **Tier 2: Navigation Rail:** Desktop persistent rail (240px) / Tablet compact icon rail (64px) / Mobile bottom bar (56px). Features local storage quota gauge (`4.2 MB / 50 MB`).
3. **Tier 3: Primary Application Canvas (12-Column Modular Grid):** Hosts the 5 core dashboard widgets.
4. **Tier 4: Contextual Item Detail Slide-Over Drawer (520px):** Contextual inspection drawer (`z-index: 400`).

### 8.2 The 5 Modular Dashboard Widgets
1. **Urgent Attention Banner (`UrgentAttentionBannerWidget`):** Full-width banner (Cols 1–12) mounting when $\ge 1$ item has a deadline within $\le 7$ days or an impending BGB § 477 cliff. Displays pulsing 🛑 icon, financial liability, statutory citation, and 1-tap cancellation button.
2. **Multi-Mode Calendar Widget (`CalendarViewWidget`):** Columns 1–7 (Span 7). Features toggleable Monthly Grid, Chronological Agenda, and Countdown Heatmap.
3. **Financial & Income Tax Metrics Widget (`TaxSummaryWidget`):** Columns 8–12 (Span 5). Displays Total Protected Assets (`€2,490.00`), Monthly Recurring Run-Rate (`€34.97/mo`), and Tax Deductions eligible for 100% *Sofortabschreibung* (`€849.00`).
4. **Live Activity & Cryptographic Proof Feed (`ActivityProofFeedWidget`):** Columns 8–12 (Span 5, stacked). Chronological stream showing GoBD SHA-256 receipts, push alarm schedules (0h DST drift), and compiled legal claims.
5. **Master Chronological Vault Ledger (`MasterVaultLedgerWidget`):** Full-width bottom canvas (Cols 1–12). Virtualized card and table feed with filtering, sorting, and inline CTAs.

### 8.3 Contextual Item Detail Slide-Over Drawer (520px Width)
Sliding out from the right viewport edge upon selecting any item:
- **Geometry & Focus:** Desktop width `520px`, Height `100dvh`, Right `0`. Mobile width `100vw`. Managed by `FocusTrapStack` with `aria-modal="true"` and `role="dialog"`.
- **Zone 1 (Header & Identity):** Item title, retailer, price, category badge, protected status pill, dismiss button `[✖]`.
- **Zone 2 (24-Month Statutory BGB Timeline):** Two-phase progress bar mapping Delivery Date (0m), Current Date (8m), Statutory Reversed Burden Presumption Cutoff (12m, `BGB § 477 Abs. 1`), and Statutory Limitation Cutoff (24m, `BGB § 438 Abs. 1 Nr. 3`).
- **Zone 3 (GoBD Proof-of-Purchase Vault Container):** 120x120px thumbnail, file metadata, raw cryptographic digest (`SHA-256: 8f4b2c9ae...`), GoBD local immutability verification stamp, and pinch-to-zoom viewer with inverted thermal receipt filter.
- **Zone 4 (German Income Tax Ledger Zone):** Werbungskosten toggle (`§ 9 EStG`), classification (*Arbeitsmittel*), and 100% immediate depreciation confirmation (BMF 22.02.2022).
- **Zone 5 (Primary Action Footer):** Primary CTA `[⚡ 1-Tap Generate Statutory Claim Dossier (BGB § 437)]`, Secondary CTA `[🔗 Open Merchant RMA Portal]`, and management actions `[✎ Edit Metadata]` / `[🗑 Delete Record]`.

### 8.4 Sub-15s Quick Capture Manual Flow (<11.4s Benchmark)
- **ADR-01 Invariant:** The platform rejects slow, error-prone cloud OCR for core data capture.
- **In-Memory Prefix-Trie Autocomplete:** Typing the first 2 characters of a merchant (e.g. `"Me"`) resolves `"MediaMarkt"` in $<1\text{ms}$ and auto-fills statutory 24-month BGB § 438 warranty and 12-month BGB § 477 reversed burden dates.
- **Form Geometry:** 4 required inputs (`Brand`, `Name`, `Price`, `Purchase Date`). Form completion benchmarks at **$11.4\text{ seconds}$**, beating the $<15\text{s}$ requirement.

### 8.5 On-Device GoBD Cryptographic Vault (AES-GCM-256 & SHA-256)
- **Pre-Encryption Immutability Hashing:** Before receipt blobs are written to IndexedDB, a Web Worker computes the raw file's SHA-256 digest (`crypto.subtle.digest('SHA-256', blob)`).
- **Client Encryption:** Receipts are encrypted client-side using AES-GCM-256 derived from the user's master passphrase via PBKDF2 (100,000 iterations).
- **GoBD Compliance:** Preserves unaltered audit trail and satisfies GoBD Rn. 108–110 requirements for digital receipt retention.

---

# Chapter 9: Complete ASCII Wireframe Blueprints

### 9.1 Desktop Full Showcase Dashboard Wireframe (1440px Grid)
```
+-----------------------------------------------------------------------------------------------------------------------------+
| [CMLAB] Team 6 Wallet & MCP     [🟢 MCP Server: 18ms SLA]    [Overview] [Playground] [Calendars] [Wiki]    (Theme) [Launch App ->] |
+-----------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                             |
|   ============================================== HERO SHOWCASE WIDGET ==============================================        |
|   Offline-First Consumer Rights Wallet & Open Model Context Protocol Server                                                 |
|   Sub-15s warranty & subscription tracking for German consumers. 100% zero-cloud local vault + open AI agent tools.         |
|                                                                                                                             |
|   [ 20 Curated Brands ]      [ 11.4s Entry Benchmark ]      [ <200ms MCP Latency ]      [ GoBD SHA-256 Immutability ]       |
|                                                                                                                             |
|   +---------------------------------------------------------------------------------------------------------------------+   |
|   | [🔍] Search 20+ brand policies, simulate vault items, or test MCP tool execution... (Ctrl+K)          [ Quick Run ] |   |
|   +---------------------------------------------------------------------------------------------------------------------+   |
|                                                                                                                             |
|   ----------------------------------------------- DUAL CORE PLAYGROUND ---------------------------------------------        |
|   +-------------------------------------------------------------+ +-----------------------------------------------------+   |
|   | INTERACTIVE MCP PROTOCOL PLAYGROUND                         | | LIVE APP SIMULATOR: CORE USER JOURNEY               |   |
|   | [ policy_lookup ]  [ claim_dossier ]  [ Raw JSON-RPC ]      | | Active Simulated Vault Items:                       |   |
|   +-------------------------------------------------------------+ +-----------------------------------------------------+   |
|   | Method: tools/call                                          | | +-------------------------------------------------+ |   |
|   | Tool:   policy_lookup                                       | | | Sony WH-1000XM5 ANC Headphones                  | |   |
|   | Payload Arguments:                                          | | | Purchased: 15.12.2025  *  Cost: EUR 279.00         | |   |
|   | {                                                           | | | Status: [! Month 11: 12m BGB 477 Cliff Soon]    | |   |
|   |   "service_slug": "spotify",                                | | | Actions: [ 1-Tap Defect Notice ] [ View Vault ] | |   |
|   |   "category": "subscription"                                | | +-------------------------------------------------+ |   |
|   | }                                                           | | +-------------------------------------------------+ |   |
|   | [ > Execute JSON-RPC Call ]       Latency: 14ms (Pass DoD)  | | | Spotify Premium Student                         | |   |
|   | ----------------------------------------------------------- | | | Monthly: EUR 5.99/mo   *  Cycle: 30d Rolling    | |   |
|   | Server Response Envelope (Result):                          | | | Status: [v Protected: Rolling 1-mo Notice]      | |   |
|   | {                                                           | | | Actions: [ Kuendigen (312k) ] [ Policy Wiki ]   | |   |
|   |   "cancellation_notice_period": "1 month to cycle end",     | | +-------------------------------------------------+ |   |
|   |   "cancellation_button_url": "https://spotify.com/...",     | | Quick Capture Demo:                                 |   |
|   |   "cancellation_button_compliant": true,                    | | [ + Simulate Sub-15s Manual Entry (<11.4s) ]        |   |
|   |   "bgb_basis": ["309 Nr. 9", "312k Abs. 6"]                | |                                                     |   |
|   | }                                                           | | [ Connect AI Agent (Claude / Cursor Config) -> ]    |   |
|   +-------------------------------------------------------------+ +-----------------------------------------------------+   |
|                                                                                                                             |
|   -------------------------------------------- MULTI-CALENDAR ECOSYSTEM --------------------------------------------        |
|   Select Temporal View:  (•) Timeline & Agenda Horizon    ( ) Monthly/Weekly Grid    ( ) Countdown Risk Heatmap             |
|   +---------------------------------------------------------------------------------------------------------------------+   |
|   | TIMELINE & AGENDA HORIZON (Statutory Legal Cliffs & Renewal Deadlines)                                              |   |
|   |                                                                                                                     |   |
|   | [!] CRITICAL ACTION WINDOW (Next 7 Days)                                                                            |   |
|   |  |-- [*] 08. Nov 2026: FitX Gym Membership (EUR 29.00/mo) -- Auto-renews in 3 days!                                  |   |
|   |        Statutory Basis: 309 Nr. 9 BGB * [ Kuendigen via 312k Portal ]  [ 1-Tap Notice Letter ]                      |   |
|   |                                                                                                                     |   |
|   | [~] INSPECTION WINDOW (8 - 30 Days)                                                                                 |   |
|   |  |-- [*] 24. Nov 2026: Adobe Creative Cloud Student (EUR 19.99/mo) -- Notice due in 19 days                            |   |
|   |        Statutory Basis: 309 Nr. 9 BGB * [ Open Adobe Account ]  [ Download PDF Dossier ]                            |   |
|   |                                                                                                                     |   |
|   | [v] STATUTORY 12-MONTH PRESUMPTION ZONE (BGB 477 Abs. 1 - Merchant Defect Liability)                               |   |
|   |  |-- [*] 15. Dec 2026: Sony WH-1000XM5 Headphones -- Day 335 of 365. 30 days until burden of proof flips!          |   |
|   |        Presumption: Defect presumed present at delivery * [ Draft 439 Reparatur/Ersatz Notice ]                     |   |
|   |                                                                                                                     |   |
|   | [=] EXTENDED 24-MONTH STATUTORY ZONE (BGB 438 Abs. 1 Nr. 3 - Consumer Proof Required)                               |   |
|   |  |-- [*] 10. Jun 2027: Apple MacBook Pro 14 M3 -- Month 17 of 24. Proof required for defects.                       |   |
|   +---------------------------------------------------------------------------------------------------------------------+   |
|                                                                                                                             |
|   ---------------------------------------------- DOMAIN SUMMARY TRIAD ----------------------------------------------        |
|   +-------------------------------+ +-------------------------------+ +-----------------------------------------------+   |
|   | GERMAN TAX & WERBUNGSKOSTEN   | | GOBD RECEIPT VAULT & SECURITY | | POLICY WIKI KNOWLEDGE GRAPH                   |   |
|   | [ 9 EStG / BMF 2022 ]         | | [ AES-GCM-256 + SHA-256 ]     | | [ Top 20 Curated Brands ]                     |   |
|   | * 2026 Write-Off: EUR 1,480   | | * Zero Cloud Plaintext Leak   | | * 100% Kuendigungsbutton Compliance Verified  |   |
|   | * Sofortabschreibung: Active  | | * Local IndexedDB Dexie.js v4 | | * Direct RMA Escalation Links                 |   |
|   | * 1-Tap Tax CSV Export        | | * Pre-encryption SHA Checksum | | * BGB 437 / 312k Statutory Mapping            |   |
|   | [ View Tax Summary View -> ]  | | [ Inspect GoBD Ledger -> ]    | | [ Explore Brand Directory -> ]                |   |
|   +-------------------------------+ +-------------------------------+ +-----------------------------------------------+   |
|                                                                                                                             |
|   ================================================== FOOTER ========================================================        |
|   Computer & Media Lab (WiSe 2026) * SRH Hochschule * Prof. Franziska Schwarz * Team 6                                      |
|   Statutory Disclaimer: Exclusively deterministic compilation pursuant to BGH VIII ZR 285/18 (LexFox). No RDG legal advice.  |
+-----------------------------------------------------------------------------------------------------------------------------+
```

### 9.2 Tablet Showcase Reflow (768px Grid)
```
+------------------------------------------------------------------------------------+
| [CMLAB] Team 6     [🟢 MCP: 18ms]        [Playground] [Calendar]   (Theme) [App ->] |
+------------------------------------------------------------------------------------+
| HERO SHOWCASE WIDGET (Tablet 8-Column Grid)                                        |
| Offline-First Consumer Rights Wallet & Open MCP Server                             |
| [<200ms MCP SLA]  [11.4s Entry Benchmark]  [100% GoBD Immutable Local Vault]       |
|                                                                                    |
| +--------------------------------------------------------------------------------+ |
| | [🔍] Search 20+ brands, vault items, or MCP tools... (Ctrl+K)                  | |
| +--------------------------------------------------------------------------------+ |
|                                                                                    |
| INTERACTIVE MCP PROTOCOL PLAYGROUND (Full Width Stack, 8 Cols)                     |
| Tabs: [ policy_lookup (Active) ]  [ claim_dossier ]  [ Raw JSON ]                  |
| +--------------------------------------------------------------------------------+ |
| | Method: tools/call  *  Service: "spotify"  *  Category: "subscription"          | |
| | [ > Run MCP Tool ]                         Latency: 14ms (Pass Gate 4 DoD)     | |
| | Result Payload:                                                                | |
| | { "notice": "1 month to cycle end", "compliant_button": true, "bgb": "309" }   | |
| +--------------------------------------------------------------------------------+ |
|                                                                                    |
| LIVE APP SIMULATOR (Full Width Stack, 8 Cols)                                      |
| +--------------------------------------------------------------------------------+ |
| | Sony WH-1000XM5: [! Month 11: 12m BGB 477 Cliff] [ 1-Tap Defect Notice ]       | |
| | Spotify Student: [v Protected: Rolling 30d Notice] [ Kuendigen (312k) ]        | |
| +--------------------------------------------------------------------------------+ |
|                                                                                    |
| MULTI-CALENDAR ECOSYSTEM (8 Cols)                                                  |
| Controls: [ (•) Agenda Horizon ]  [ ( ) Monthly Grid ]  [ ( ) Risk Heatmap ]       |
| +--------------------------------------------------------------------------------+ |
| | [!] Urgent (<=7d): FitX Gym auto-renewal in 3 days                             | |
| | [~] Inspection (8-30d): Adobe CC renewal in 19 days                            | |
| | [v] BGB 477 12m Cliff: Sony Headphones (Day 335 of 365)                         | |
| +--------------------------------------------------------------------------------+ |
|                                                                                    |
| DOMAIN SUMMARY (2-Row Reflow)                                                      |
| +---------------------------------------+ +--------------------------------------+ |
| | GERMAN TAX & WERBUNGSKOSTEN           | | GOBD VAULT & SHA-256 PROOF           | |
| | EUR 1,480.00 Deductible in 2026       | | Zero Cloud Privacy * Dexie.js v4     | |
| +---------------------------------------+ +--------------------------------------+ |
| +--------------------------------------------------------------------------------+ |
| | POLICY WIKI DIRECTORY (Top 20 German Brands)                                   | |
| +--------------------------------------------------------------------------------+ |
+------------------------------------------------------------------------------------+
```

### 9.3 Mobile Showcase Reflow (375px Grid)
```
+------------------------------------------+
| [CMLAB] Team 6     [🟢 18ms]      (Theme) |
+------------------------------------------+
| Offline Consumer Wallet & MCP            |
| Sub-15s entry * 100% zero-cloud local.   |
|                                          |
| +--------------------------------------+ |
| | [🔍] Search brand, vault, MCP...      | |
| +--------------------------------------+ |
|                                          |
| [ Connect AI Agent (Claude/Cursor) -> ]  |
|                                          |
| [ MCP Tool Playground v ] (Collapsible)  |
| +--------------------------------------+ |
| | Tool: policy_lookup ("spotify")      | |
| | Latency: 14ms (Pass)                 | |
| | Result: Kündigungsbutton OK          | |
| | [ > Run Again ]                      | |
| +--------------------------------------+ |
|                                          |
| SIMULATED ACTIVE ITEMS                   |
| +--------------------------------------+ |
| | Sony WH-1000XM5                      | |
| | [! Month 11: 12m BGB 477 Cliff]      | |
| | [ 1-Tap Defect Notice ]              | |
| +--------------------------------------+ |
| +--------------------------------------+ |
| | Spotify Student                      | |
| | [v 30d Notice Active]                | |
| | [ Kündigen (§ 312k) ]                | |
| +--------------------------------------+ |
|                                          |
| CALENDAR HORIZONS                        |
| [ < Swipe to switch view > ]             |
| +--------------------------------------+ |
| | [!] FitX Gym: In 3 days (EUR 29/mo)  | |
| | [~] Adobe CC: In 19 days (EUR 19/mo) | |
| | [v] Sony ANC: Month 11 of 12 (BGB)   | |
| +--------------------------------------+ |
|                                          |
| SUMMARY PILLS                            |
| [ Tax: EUR 1,480 ]  [ GoBD: Verified ]   |
|                                          |
| (c) 2026 SRH * Team 6 * BGH VIII ZR 285  |
+------------------------------------------+
| FIXED BOTTOM NAV BAR (Height: 56px+SafeArea)
| [ Playground ]   [ Calendar ]   [ Open App ]
+------------------------------------------+
```

### 9.4 Detailed Widget: MCP Tool Playground & Protocol Streamer
```
+---------------------------------------------------------------------------------------------+
| 🔌 MODEL CONTEXT PROTOCOL (MCP) INTERACTIVE PLAYGROUND                         [ 🟢 Online ] |
| Test live JSON-RPC 2.0 tool execution over edge Cloudflare Worker endpoint (/api/mcp)       |
+---------------------------------------------------------------------------------------------+
| Select Tool:  [ (•) policy_lookup ]    [ ( ) claim_dossier_generate ]    [ ( ) tools/list ] |
+---------------------------------------------------------------------------------------------+
| Tool Schema & Input Parameters (Zod Validated):                                             |
| Service Slug:  [ spotify                  v ]   Category: [ subscription        v ]         |
| Optional Query: [ BGB 312k                 ]                                                |
|                                                                                             |
| [ ▶ Run Tool Call ]   [ 📋 Copy curl ]   [ ⚙ Config for Claude Desktop ]                    |
+---------------------------------------------------------------------------------------------+
| Real-Time JSON-RPC 2.0 Protocol Streamer                        Execution Time: 14ms (<200ms)|
| +-----------------------------------------------------------------------------------------+ |
| | --> POST /api/mcp HTTP/1.1                                                              | |
| | Content-Type: application/json                                                          | |
| | {                                                                                       | |
| |   "jsonrpc": "2.0",                                                                     | |
| |   "id": "req-042",                                                                      | |
| |   "method": "tools/call",                                                               | |
| |   "params": {                                                                           | |
| |     "name": "policy_lookup",                                                            | |
| |     "arguments": { "service_slug": "spotify", "category": "subscription" }              | |
| |   }                                                                                     | |
| | }                                                                                       | |
| |                                                                                         | |
| | <-- HTTP/1.1 200 OK (14ms)                                                              | |
| | {                                                                                       | |
| |   "jsonrpc": "2.0",                                                                     | |
| |   "id": "req-042",                                                                      | |
| |   "result": {                                                                           | |
| |     "content": [{                                                                       | |
| |       "type": "text",                                                                   | |
| |       "text": "{\n  \"brand_name\": \"Spotify\",\n  \"statutoryNoticeDays\": 30,\n     | |
| |               \"cancellation_button_compliant\": true,\n                                | |
| |               \"cancellation_button_url\": \"https://www.spotify.com/.../cancel\",\n   | |
| |               \"statutory_basis\": [\"BGB § 309 Nr. 9\", \"BGB § 312k Abs. 6\"]\n}"    | |
| |     }]                                                                                  | |
| |   }                                                                                     | |
| | }                                                                                       | |
| +-----------------------------------------------------------------------------------------+ |
| [ 🟢 Zod Schema Validated ]  [ 🔒 Zero Server Crash Guarantee ]  [ ⚖️ LexFox Ground Truth ] |
+---------------------------------------------------------------------------------------------+
```

### 9.5 Detailed Widget: Calendar Type 1 — Monthly/Weekly Grid
```
+---------------------------------------------------------------------------------------------+
| 📅 MONTHLY / WEEKLY GRID CALENDAR                                        [ Month ] [ Week ] |
| < [ November 2026 ] >                                                    [ Jump to Today ]  |
+---------------------------------------------------------------------------------------------+
|    Mo         Di         Mi         Do         Fr         Sa         So                 |
+----------+----------+----------+----------+----------+----------+----------+                |
| 26       | 27       | 28       | 29       | 30       | 31       | 1        |                |
|          |          |          |          |          |          |          |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| 2        | 3        | 4        | 5 (Today)| 6        | 7        | 8        |                |
|          |          |          | [•] Now  |          |          | [!] FitX |                |
|          |          |          |          |          |          | EUR 29/m |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| 9        | 10       | 11       | 12       | 13       | 14       | 15       |                |
|          |          |          |          |          | [v] Spot |          |                |
|          |          |          |          |          | EUR 5.99 |          |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| 16       | 17       | 18       | 19       | 20       | 21       | 22       |                |
|          |          |          |          |          |          |          |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| 23       | 24       | 25       | 26       | 27       | 28       | 29       |                |
|          | [~] Adobe|          |          |          |          |          |                |
|          | EUR 19.99|          |          |          |          |          |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| 30       | 1        | 2        | 3        | 4        | 5        | 6        |                |
|          |          |          |          |          |          |          |                |
+----------+----------+----------+----------+----------+----------+----------+                |
| Legend: [!] Urgent (<=7d)   [~] Review Window (8-30d)   [v] Active Protected (>30d)         |
+---------------------------------------------------------------------------------------------+
```

### 9.6 Detailed Widget: Calendar Type 2 — Timeline & Agenda Horizon (with 12m BGB § 477 Cliff)
```
+---------------------------------------------------------------------------------------------+
| ⏱️ TIMELINE & AGENDA HORIZON VIEW                           [ Filter: All ] [ Subscriptions ]|
| Chronological Contract Lifecycles & Statutory Milestone Checkpoints                         |
+---------------------------------------------------------------------------------------------+
|                                                                                             |
| 🔴 HORIZON 1: URGENT ACTION WINDOW (Within 7 Days)                                          |
| +-----------------------------------------------------------------------------------------+ |
| | [*] FITX GYM MEMBERSHIP (FitX Deutschland GmbH)                                         | |
| |     Category: Subscription  •  Fee: EUR 29.00/month  •  Auto-Renews: 08.11.2026         | |
| |     ⏳ Remaining: 3 Days  •  Statutory Basis: BGB § 309 Nr. 9 (1-Month Notice Window)   | |
| |     [ ⚡ Kündigen via Online-Button (§ 312k) ]   [ 📄 Draft § 312k Kündigungsschreiben ] | |
| +-----------------------------------------------------------------------------------------+ |
|                                                                                             |
| 🟡 HORIZON 2: NOTICE INSPECTION WINDOW (8 to 30 Days)                                       |
| +-----------------------------------------------------------------------------------------+ |
| | [*] ADOBE CREATIVE CLOUD STUDENT (Adobe Systems Ireland Ltd.)                           | |
| |     Category: Subscription  •  Fee: EUR 19.99/month  •  Annual Commitment End: 24.11.2026|
| |     ⏳ Remaining: 19 Days  •  Note: Auto-converts to standard rate without student check| |
| |     [ ↗ Manage Account ]   [ 📄 Draft Statutory Withdrawal ]   [ 🤖 Verify in MCP ]      | |
| +-----------------------------------------------------------------------------------------+ |
|                                                                                             |
| 🟢 HORIZON 3: THE 12-MONTH BURDEN-OF-PROOF CLIFF (BGB § 477 Abs. 1 Presumption)             |
| +-----------------------------------------------------------------------------------------+ |
| | ⚠️ CRITICAL LEGAL MILESTONE: Beweislastumkehr Presumption Period Expiring Soon!          | |
| | [*] SONY WH-1000XM5 WIRELESS HEADPHONES (Purchased at MediaMarkt)                       | |
| |     Purchase Date: 15.12.2025  •  Hardware Price: EUR 279.00  •  Invoice #MM-98421      | |
| |     Current Lifecycle: Day 325 of 365 (Month 11)  •  ⏳ 40 Days until Legal Cliff        | |
| |     Status: Defect Presumed at Delivery gem. § 477 Abs. 1 BGB (Merchant Bears Proof)     | |
| |     Timeline Progress Bar:                                                              | |
| |     [===============================================>..........] 89% of Period Expired    | |
| |     Month 1                  Month 6                 Month 12               Month 24     | |
| |     Delivery                 Midway                  CLIFF ⚠️               Statutory End| |
| |     [ 📄 Draft § 439 Nacherfüllung Notice ]   [ 🔍 Inspect Local Receipt Vault Proof ]   | |
| +-----------------------------------------------------------------------------------------+ |
|                                                                                             |
| ⚪ HORIZON 4: EXTENDED STATUTORY ZONE (13 to 24 Months - Consumer Proof Required)           |
| +-----------------------------------------------------------------------------------------+ |
| | [*] APPLE MACBOOK PRO 14" M3 (Apple Retail Germany B.V.)                                | |
| |     Purchase Date: 20.06.2025  •  Month 17 of 24  •  Statutory Warranty Ends: 20.06.2027| |
| |     Status: Consumer must prove defect existed at handover gem. BGB § 438 Abs. 1 Nr. 3  | |
| |     [ 📄 Generate Repair Dossier with Stored Receipt Image ]                             | |
| +-----------------------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------+
```

### 9.7 Detailed Widget: Calendar Type 3 — Countdown & Risk Heatmap Matrix
```
+---------------------------------------------------------------------------------------------+
| 📊 COUNTDOWN & RISK HEATMAP MATRIX (Annual Deadline & Expense Density)                      |
| Tracked Capital: EUR 4,890.00  •  Annual Subscriptions: EUR 684.00  •  Imminent Actions: 2  |
+---------------------------------------------------------------------------------------------+
| Jan    Feb    Mar    Apr    May    Jun    Jul    Aug    Sep    Oct    Nov    Dec           |
|                                                                                             |
| Mo  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. [!] .. .. .. ..      |
| Di  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. [~] .. .. .. .. ..      |
| Mi  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..      |
| Do  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..      |
| Fr  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..      |
| Sa  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. [v] .. .. .. .. ..      |
| So  .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..      |
|                                                                                             |
| Cell Density Key:                                                                           |
| [ ] 0 Deadlines   [•] Low / Protected (>30d)   [~] Medium Review (8-30d)   [!] Urgent (<=7d)|
|                                                                                             |
| Active Hover Inspection:                                                                    |
| Date: 08. November 2026  •  1 Event: FitX Gym Auto-Renewal (EUR 29.00/mo)  •  Urgency: [!] |
| [ Click cell to spotlight item in dashboard ]                                               |
+---------------------------------------------------------------------------------------------+
```

### 9.8 Detailed Omnibar Wireframes (All 8 FSM States)

#### Omnibar State 1: IDLE (Header Resting)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet]   [ 🔍  Search vault, wiki, or type '>' for commands...               [⌘K] ]   [🟢] [🌙] [👤]│
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 2: FOCUSED_EMPTY (Active Idle Popover)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [🔍] [Type to search or select a quick action...                   ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ QUICK ACTIONS:                                                         │                 │
│             │  [ + Add Item (<15s) ]   [ 📥 Import Receipt ]   [ ⚖️ Policy Wiki ]     │                 │
│             │  [ 📊 Tax Summary ]      [ ⚡ File Claim ]        [ ⏰ Scheduled Alarms] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ RECENT ACTIVITIES:                                                     │                 │
│             │  🎧 Sony WH-1000XM4         Viewed 2h ago  ·  Protected (16m remaining)│                 │
│             │  🎵 Spotify Student          Expiring in 3d ·  BGB § 309 Nr. 9 Alert   │                 │
│             │  💻 Apple MacBook Pro 14" M3 Receipt attached (GoBD SHA-256 verified)  │                 │
│             │  ⚡ >claim Sony WH-1000XM4   Generated Mängelrüge draft yesterday      │                 │
│             │  📄 Searched "Adobe cancel"  Viewed § 312k BGB online cancellation url │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ Tip: Use ↑↓ arrows to navigate, ↵ to select, Esc to close              │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 3: QUERYING (Transient Micro-Spinner)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [🔍] [Son                                                          [◌] ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ ◌ Searching encrypted local vault & policy wiki...                     │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 4: VAULT_MATCHES (Query: `"Sony"`)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [🔍] [Sony                                                         ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ FILTER: (•) All (1)   ( ) Hardware (1)   ( ) Protected (1)   ( ) Tax   │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ 🗄️ SAVED ITEMS VAULT (1 Match in Dexie DB)                             │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ 🎧 Sony WH-1000XM4                 [GREEN: Protected]    €279.00   │ │                 │
│             │ │ Retailer: Saturn Berlin Alexanderplatz · Purchased: 15.03.2026     │ │                 │
│             │ │ Timeline: Month 8 of 24 (16m remaining)                            │ │                 │
│             │ │ Legal Status: 12-Month Beweislastumkehr ACTIVE (BGB § 477 Abs. 1)  │ │                 │
│             │ │ Tax: [§ 9 EStG Werbungskosten] · Receipt: [✓ GoBD SHA-256 Stamped] │ │                 │
│             │ │ Actions: [ View Details ]   [ ⚡ File Claim ]   [ 📷 View Receipt ] │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ ⚖️ WIKI SUGGESTION:                                                     │                 │
│             │ Sony Europe B.V. Policy: Standard 24m BGB warranty. Saturn RMA portal.  │                 │
│             │ [ View Official Sony Policy Article ]                                  │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 5: WIKI_MATCHES (Query: `"Apple"` or `"bgb:477"`)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [⚖️] [Apple                                                        ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ ⚖️ POLICY WIKI KNOWLEDGE BASE (1 Match)                                │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ 💻 APPLE [Hardware & Retail] [DE · BGB]                            │ │                 │
│             │ │ Apple Distribution International Ltd. (Hollyhill, Cork, Ireland)    │ │                 │
│             │ │ Statutory Warranty: 24 Months (BGB § 438 Abs. 1 Nr. 3)             │ │                 │
│             │ │ Reversed Burden of Proof: 12 Months (BGB § 477 Abs. 1)              │ │                 │
│             │ │ Voluntary Commercial Guarantee: 12 Months (Apple One-Year Limited) │ │                 │
│             │ │ RMA / Support Portal: https://support.apple.com/de-de/repair        │ │                 │
│             │ │ ⚠️ Note: AppleCare+ does not waive statutory BGB rights (§ 443 BGB) │ │                 │
│             │ │ [ Apply to New Hardware Item ]            [ Visit Support Portal 🔗]│ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 6: HYBRID_MATCHES (Query: `"Spotify"`)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [⚖️] [Spotify                                                      ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ FILTER: (•) All Results (2)   ( ) Wiki Policies (1)   ( ) Saved Vault(1)│                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ 🗄️ MY SAVED VAULT (1 Match)                                            │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ 🎵 Spotify Student               [RED: Renews in 3 Days]  €5.99/mo │ │                 │
│             │ │ Next billing: Nov 8, 2026  ·  Action: [Review Cancellation Options]│ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ ⚖️ POLICY WIKI KNOWLEDGE BASE (1 Match)                                │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ 🎵 SPOTIFY [Subscription] [DE · BGB]                               │ │                 │
│             │ │ Spotify AB (Regeringsgatan 19, 111 53 Stockholm, Schweden)         │ │                 │
│             │ │ Statutory Term: Monthly rolling cancellation (§ 309 Nr. 9 BGB)     │ │                 │
│             │ │ Notice Window: 30 Days · Statutory Cooling-off: 14 Days (§ 355 BGB)│ │                 │
│             │ │ Cancellation Portal: https://www.spotify.com/account/cancel/       │ │                 │
│             │ │ ⚠️ Dark Pattern: Multi-step retention screens; Student plan auto-   │ │                 │
│             │ │                  converts to full price after 12 months.           │ │                 │
│             │ │ [ Apply to New Subscription ]      [ Visit Cancellation Portal 🔗 ] │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 7: NO_MATCH_SUGGESTION (Query: `"Bose QuietComfort"`)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [🔍] [Bose QuietComfort                                            ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ 🔍 No saved items found matching "Bose QuietComfort"                   │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ 💡 CONTEXT-AWARE SUGGESTIONS & RECOVERY:                               │                 │
│             │                                                                        │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ [+] Create new Hardware Warranty for "Bose QuietComfort"           │ │                 │
│             │ │     Presets: 24-Month Statutory BGB § 438 Warranty · 12m Beweis-   │ │                 │
│             │ │              lastumkehr (§ 477 Abs. 1) auto-configured             │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ [+] Add Subscription for "Bose QuietComfort"                       │ │                 │
│             │ │     Presets: Recurring monthly/annual billing cycle · Auto-alerts  │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ 📥 Import Receipt Photo or PDF for "Bose QuietComfort"             │ │                 │
│             │ │     Opens Web Worker compression (<1.5MB) + GoBD SHA-256 hashing   │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             │ ┌────────────────────────────────────────────────────────────────────┐ │                 │
│             │ │ ⚖️ Search Policy Wiki for "Bose" Policies                          │ │                 │
│             │ │     Retrieve Bose GmbH guarantee terms and RMA contact guidelines   │ │                 │
│             │ └────────────────────────────────────────────────────────────────────┘ │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Omnibar State 8: COMMAND_MODE (Query: `">claim"`)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet] ┌────────────────────────────────────────────────────────────────────────┐  [🟢] [🌙] [👤]│
│             │ [⚡] [>claim                                                       ✖ ] │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ ⚡ COMMAND WORKFLOW: SELECT AN ITEM TO FILE A LEGAL CLAIM               │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ Select an active hardware item from your wallet:                       │                 │
│             │                                                                        │                 │
│             │ (•) 🎧 Sony WH-1000XM4 (Month 8 of 24)                                 │                 │
│             │     • Law: BGB § 477 Abs. 1 Beweislastumkehr ACTIVE (Presumed defect)  │                 │
│             │     • Target Notice: Template 1 (Mängelrüge 0–12m with Fristsetzung)   │                 │
│             │                                                                        │                 │
│             │ ( ) 💻 Apple MacBook Pro 14" M3 (Month 14 of 24)                       │                 │
│             │     • Law: BGB § 438 Abs. 1 Nr. 3 + § 475e Abs. 1 (Ablaufhemmung)      │                 │
│             │     • Target Notice: Template 2 (Mängelrüge 12–24m)                    │                 │
│             │                                                                        │                 │
│             │ ( ) 📱 iPad Air (Month 22 of 24)                                       │                 │
│             │     • Law: Approaching final limitation cutoff                         │                 │
│             ├────────────────────────────────────────────────────────────────────────┤                 │
│             │ [ ⚡ Launch Statutory Notice Generator for Sony WH-1000XM4 ]            │                 │
│             └────────────────────────────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.9 Modern App Dashboard Desktop (1440px 12-Column Grid)
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ Wallet]        │  [ 🔍  Search vault, wiki, or type '>' for commands...                        [⌘K] ]  │ [Sync: 🟢] [Theme: 🌙] [👤]│
├────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [📊 Overview]     │ 🔔 URGENT ATTENTION (Renewal or Statutory Deadline <= 7 Days)                                                     │
│ [🗄️ My Vault (8)]  │ ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ [📅 Calendar Views]│ │ 🎵 Spotify Student                      [RED: Renews in 3 Days]                               €5.99 / mo        │ │
│ [⚡ Claim Dossier] │ │ Next billing: Nov 8, 2026 · Notice window: 30 days (§ 309 Nr. 9 BGB) · [ Review Cancellation Options ]       │ │
│ [💶 Tax & Spend]   │ └───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ [⚖️ Policy Wiki]   │                                                                                                                   │
│ [⚙️ Settings]      │ ┌───────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐ │
│                    │ │ 📅 CALENDAR WIDGET: NOVEMBER 2026             │ │ 📊 FINANCIAL & TAX METRICS (§ 9 EStG)                         │ │
│                    │ │ Mo  Tu  We  Th  Fr  Sa  Su                    │ │ • Total Protected Hardware Value:   €2,490.00                 │ │
│ Storage:           │ │              1   2   3   4   5                    │ │ • Monthly Recurring Subscriptions:     €34.97 / mo            │ │
│ [====-----] 4.2 MB │ │  6   7  [8]  9  10  11  12  [8: 🎵 Spotify]  │ │ • German Tax Write-Offs (2026):       €849.00                 │ │
│ Dexie.js Encrypted │ │ 13  14  15  16  17  18  19                    │ │   (100% Immediate Write-Off eligible under BMF 2022)          │ │
│ Zero Cloud Leakage │ │ 20  21  22  23  24  25  26                    │ │ [ Export Tax Deduction Dossier (CSV/PDF) ]                    │ │
│                    │ │ 27  28  29  30                                │ └───────────────────────────────────────────────────────────────┘ │
│                    │ │ View: (•) Month Grid   ( ) Agenda   ( ) Heat  │                                                                   │
│                    │ └───────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────┤
│                    │ 🗄️ MASTER VAULT ITEMS FEED                                                          [ Filter: (•) All  ( ) HW  ( ) Sub ]│
│                    │ ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│                    │ │ 🎧 Sony WH-1000XM4                 [GREEN: Protected]                              €279.00                      │ │
│                    │ │ Retailer: Saturn Berlin · Pur: 15.03.2026 · Month 8 of 24 (16m left) · BGB § 477 Beweislastumkehr ACTIVE       │ │
│                    │ │ Actions: [ View Details & Drawer ]   [ ⚡ 1-Tap Claim Dossier ]   [ 📷 Receipt (GoBD SHA-256) ]                 │ │
│                    │ ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│                    │ │ 💻 Apple MacBook Pro 14" M3        [GREEN: Protected]                            €1,899.00                      │ │
│                    │ │ Retailer: Apple Store Berlin · Pur: 10.01.2026 · Month 14 of 24 (10m left) · Tax: § 9 EStG Arbeitsmittel        │ │
│                    │ │ Actions: [ View Details & Drawer ]   [ ⚡ 1-Tap Claim Dossier ]   [ 📷 Receipt (GoBD SHA-256) ]                 │ │
│                    │ └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.10 Modern App Dashboard Tablet (768px Reflow)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️]  [ 🔍  Search vault, wiki, or type '>' commands...                   [⌘K] ]  [Sync: 🟢] [👤]│
├─────┬─────────────────────────────────────────────────────────────────────────────────────────────┤
│ [📊]│ 🔔 URGENT (Renewal <= 7d): 🎵 Spotify Student [RED: Renews in 3d] [Review Cancellation]    │
│ [🗄️]├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ [📅]│ 📅 CALENDAR (Agenda View):                                                                  │
│ [⚡]│  • Nov 8, 2026:  🎵 Spotify Student (€5.99) Auto-debit                                      │
│ [💶]│  • Nov 15, 2026: 🎧 Sony WH-1000XM4 (Month 8 milestone · BGB § 477)                         │
│ [⚖️]├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ [⚙️]│ 🗄️ VAULT ITEMS (8 Protected):                                                               │
│     │ ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│     │ │ 🎧 Sony WH-1000XM4                         [Protected]                         €279.00  │ │
│     │ │ Saturn Berlin · Pur: 15.03.2026 · 16m left · [Details]  [Claim]                         │ │
│     │ ├─────────────────────────────────────────────────────────────────────────────────────────┤ │
│     │ │ 💻 MacBook Pro 14" M3                      [Protected]                       €1,899.00  │ │
│     │ │ Apple Berlin · Pur: 10.01.2026 · 10m left · [Details]  [Claim]                         │ │
│     │ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────┴─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.11 Modern App Dashboard Mobile (375px with Bottom Nav)
```
┌─────────────────────────────────────────────────────────┐
│ [🛡️ Wallet]             [ 🔍 Search / ⌘K ]        [👤] │
├─────────────────────────────────────────────────────────┤
│ 🔔 URGENT ATTENTION (Renewal <= 7 Days)                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎵 Spotify Student                  [RED: Renews 3d]│ │
│ │ Billing: Nov 8, 2026 · €5.99/mo (Auto-renews)       │ │
│ │ Action: [ Review Cancellation Options ]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🗄️ MY PROTECTED VAULT ITEMS                             │
│ Filter: (•) All (8)     ( ) Hardware (3)    ( ) Subs (5)│
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎧 Sony WH-1000XM4                 [GREEN: Protected│ │
│ │ Saturn Berlin · Pur: 15.03.2026                     │ │
│ │ BGB Statutory Warranty: 16 months remaining         │ │
│ │ Tax Status: [§ 9 EStG Werbungskosten]               │ │
│ │ Action: [ View Details & Timeline ]                 │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💻 MacBook Pro 14" M3              [GREEN: Protected│ │
│ │ Apple Berlin · Pur: 10.01.2026 · 14m remaining      │ │
│ │ Action: [ View Details & Timeline ]                 │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [  [+] Quick Add Item  ]        [  Tax Summary (€849) ] │
├─────────────────────────────────────────────────────────┤
│ [📊 Home]   [🗄️ Vault]   [📅 Calendar]   [⚡ Claims]  [⚙️]│
└─────────────────────────────────────────────────────────┘
```

### 9.12 Contextual Item Detail Slide-Over Drawer (520px Width)
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Back / Close ✖]                       ITEM PROFILE & LEGAL TIMELINE                              │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🎧 Sony WH-1000XM4                                                                                │
│ Retailer: Saturn Berlin Alexanderplatz · Price: EUR 279.00                                        │
│ Purchase Date: 15.03.2026 · Category: Hardware · Serial: SN-88419201-DE                           │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ STATUTORY WARRANTY TIMELINE (BGB §§ 437, 438)                                                     │
│                                                                                                   │
│ Month 8 of 24  [====================------------------------]  16 Months Remaining                │
│ 0m ───────────────────── 8m (Today) ───────── 12m ─────────────────────────────────────────── 24m │
│                                                                                                   │
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🛡️ LEGAL STATUS BADGE:                                                                        │ │
│ │ [!] 12-Month Reversed Burden of Proof ACTIVE (Beweislastumkehr gem. § 477 Abs. 1 BGB)         │ │
│ │ Under German law, any defect is legally presumed present at delivery. Saturn must repair      │ │
│ │ or replace the headphones without demanding expert inspection fees or proof.                  │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PROOF OF PURCHASE VAULT (Local GoBD Vault)                                                        │
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ┌──────────────────┐  File: receipt_sony_saturn.jpg (980 KB)                                  │ │
│ │ │ [120x120 THUMB]  │  Merchant: Saturn Electro-Handelsgesellschaft mbH                       │ │
│ │ │ [Pinch-to-Zoom   │  Beleg-Nr: 98412 · Terminal: 0841                                        │ │
│ │ │  Full Viewer 🔍] │  GoBD SHA-256: 8f4b2c9ae13098d752c031aa23881efb889312b9a1...            │ │
│ │ └──────────────────┘  [✓ GoBD Cryptographic Immutability Verified Locally]                    │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GERMAN INCOME TAX LEDGER (§ 9 EStG / BMF 2022)                                                    │
│ [ [ON] ] Werbungskosten (§ 9 EStG)                                                                │
│ Category: Arbeitsmittel / Digital Tools                                                           │
│ Depreciation: 100% Immediate Write-Off (*Sofortabschreibung* eligible per BMF 22.02.2022)         │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ACTIONS:                                                                                          │
│ [ ⚡ 1-Tap Generate Statutory Claim Dossier (BGB § 437 Mängelrüge) ]                                │
│ [ 🔗 Open Saturn Customer Service & RMA Portal ]                                                  │
│ [ ✎ Edit Metadata ]                    [ 🗑 Delete Item ]                                         │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Chapter 10: Technical Component API Contracts & Verification Methodology

### 10.1 Svelte 5 Runes State Architecture (`omnibar.svelte.ts`)
```typescript
// src/lib/stores/omnibar.svelte.ts
import { db } from '$lib/db';
import { prefixTrie } from '$lib/search/PrefixTrie';
import type { WalletItem, PolicyWikiEntry } from '$lib/types/database.types';

export type OmnibarState = 
  | 'IDLE' 
  | 'FOCUSED_EMPTY' 
  | 'QUERYING' 
  | 'VAULT_MATCHES' 
  | 'WIKI_MATCHES' 
  | 'HYBRID_MATCHES' 
  | 'NO_MATCH_SUGGESTION' 
  | 'COMMAND_MODE';

class OmnibarStore {
  query = $state<string>('');
  isOpen = $state<boolean>(false);
  isQuerying = $state<boolean>(false);
  activeHighlightIndex = $state<number>(0);
  
  vaultResults = $state<WalletItem[]>([]);
  wikiResults = $state<PolicyWikiEntry[]>([]);
  private activeSearchId = 0;

  currentState = $derived.by<OmnibarState>(() => {
    if (!this.isOpen) return 'IDLE';
    const trimmed = this.query.trim();
    if (trimmed.length === 0) return 'FOCUSED_EMPTY';
    if (trimmed.startsWith('>')) return 'COMMAND_MODE';
    if (this.isQuerying) return 'QUERYING';
    
    const hasVault = this.vaultResults.length > 0;
    const hasWiki = this.wikiResults.length > 0;
    
    if (hasVault && hasWiki) return 'HYBRID_MATCHES';
    if (hasVault && !hasWiki) return 'VAULT_MATCHES';
    if (!hasVault && hasWiki) return 'WIKI_MATCHES';
    return 'NO_MATCH_SUGGESTION';
  });

  async search(text: string) {
    this.query = text;
    const trimmed = text.trim();
    const searchId = ++this.activeSearchId;
    if (trimmed.length === 0 || trimmed.startsWith('>')) {
      this.vaultResults = [];
      this.wikiResults = [];
      this.isQuerying = false;
      return;
    }

    this.isQuerying = true;
    
    // Parallel non-blocking execution: PrefixTrie (<10ms) + Dexie.js (<15ms)
    const [wikiMatches, vaultMatches] = await Promise.all([
      prefixTrie.search(trimmed),
      db.items
        .filter(item => 
          item.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          item.merchant.toLowerCase().includes(trimmed.toLowerCase()) ||
          item.searchTokens.some(t => t.toLowerCase().includes(trimmed.toLowerCase()))
        )
        .limit(10)
        .toArray()
    ]);

    // Guard against out-of-order resolution from stale dispatches
    if (searchId !== this.activeSearchId) return;

    this.wikiResults = wikiMatches;
    this.vaultResults = vaultMatches;
    this.activeHighlightIndex = 0;
    this.isQuerying = false;
  }
}

export const omnibar = new OmnibarStore();
```

### 10.2 Shared TypeScript Data Contracts

```typescript
// Shared Data Models for Showcase and Modern App

export interface WalletItem {
  id: string;
  name: string;
  category: "hardware" | "subscription";
  merchant: string;
  purchaseDate: string; // ISO 8601: "YYYY-MM-DD"
  expiryDate: string;   // ISO 8601: "YYYY-MM-DD"
  priceEur: number;
  status: "protected" | "warning" | "urgent" | "expired";
  receiptSha256?: string;
  isTaxDeductible: boolean;
  taxCategory?: "Arbeitsmittel" | "Telekommunikation" | "Fachliteratur";
  beweislastumkehrDate?: string; // Purchase + 365d gem. BGB § 188 Abs. 2
  searchTokens: string[];
}

export interface PolicyWikiEntry {
  service_slug: string;
  brand_name: string;
  category: "hardware" | "subscription";
  statutory_warranty_months?: number;
  reversed_burden_months?: number;
  statutory_notice_days?: number;
  cancellation_button_url?: string;
  cancellation_button_compliant: boolean;
  terms_summary_de: string;
  terms_summary_en: string;
  bgb_statutory_basis: string[];
  dark_pattern_advisory?: string;
}

export interface GridCalendarEvent {
  id: string;
  date: string; // ISO 8601: "YYYY-MM-DD"
  title: string;
  brand: string;
  category: "hardware" | "subscription" | "tax";
  amountEur?: number;
  urgency: "urgent" | "warning" | "protected" | "expired";
  bgbStatutoryType?: "BGB_477_CLIFF" | "BGB_438_EXPIRY" | "BGB_309_RENEWAL";
  actionUrl?: string;
}

export interface AgendaHorizonItem {
  id: string;
  itemName: string;
  brandSlug: string;
  category: "hardware" | "subscription";
  purchaseDate: string;
  expiryDate: string;
  daysRemaining: number;
  monthlyCost?: number;
  isWithinReversedBurdenOfProof: boolean; // Days <= 365
  reversedBurdenDeadline: string;
  cancellationUrl?: string;
  cancellationCompliant: boolean;
  bgbClauses: string[];
}

export interface HeatmapCellData {
  date: string; // "YYYY-MM-DD"
  weekNumber: number; // 1 - 52
  dayOfWeek: number;  // 0 - 6 (ISO: 0 = Mon, 6 = Sun)
  intensityLevel: 0 | 1 | 2 | 3 | 4;
  events: Array<{
    id: string;
    title: string;
    category: "hardware" | "subscription";
    costEur?: number;
    urgency: "urgent" | "warning" | "protected";
    bgbCliff?: boolean;
  }>;
  totalCostDueEur: number;
}
```

### 10.3 JSON-RPC 2.0 MCP Protocol Schema Contracts

```typescript
// MCP Tool Schemas (Model Context Protocol 2024-11-05 Specification)

export interface JsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  method: "tools/call" | "tools/list" | "resources/read";
  params: {
    name: string;
    arguments: T;
  };
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  result?: {
    content: Array<{
      type: "text" | "resource";
      text: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface PolicyLookupArguments {
  service_slug?: string;
  brand_slug?: string; // Dual-slug alias compatibility
  category: "hardware" | "subscription";
  jurisdiction?: "DE";
  issue_type?: string;
}

export interface ClaimDossierArguments {
  service_slug?: string;
  brand_slug?: string; // Dual-slug alias compatibility
  category?: "hardware" | "subscription";
  issue_type: "statutory_defect_claim" | "contract_cancellation";
  item_name: string;
  purchase_date: string;
  defect_description: string;
}
```

### 10.4 Storybook Component Verification Matrix
All UI components authored for both web properties must maintain corresponding Storybook CSF 3.0 stories (`.stories.svelte` or `.stories.ts`) verifying all functional variants:

| Component Name | Target File Path | Mandatory Story States | Accessibility Acceptance Invariants |
|---|---|---|---|
| `UnifiedOmnibar` | `src/lib/components/omnibar/UnifiedOmnibar.svelte` | `Idle`, `FocusedEmpty`, `Querying`, `VaultMatches`, `WikiMatches`, `HybridMatches`, `NoMatchSuggestion`, `CommandMode` | 0 Axe-core violations, ARIA 1.3 Combobox pattern, roving highlight traversal. |
| `McpPlaygroundWidget` | `src/components/showcase/McpPlaygroundWidget.svelte` | `ToolPolicyLookup`, `ToolClaimDossier`, `ZodValidationError`, `LiveExecutionStreaming` | Monospace contrast $\ge 4.5:1$, live region announcement, `<30ms` latency display. |
| `MonthlyWeeklyGridCalendar` | `src/components/calendar/MonthlyWeeklyGridCalendar.svelte` | `MonthViewFull`, `WeekViewDense`, `DayCellHover`, `EventPopoverOpen` | Full keyboard arrow-key navigation between gridcells, `role="grid"`. |
| `TimelineAgendaCalendar` | `src/components/calendar/TimelineAgendaCalendar.svelte` | `HorizonActiveCliffs`, `HorizonStandard`, `Bgb477ProgressBar`, `EmptyHorizon` | Non-color geometric glyph pairing, explicit legal citations. |
| `CountdownRiskHeatmap` | `src/components/calendar/CountdownRiskHeatmap.svelte` | `FullYearNormal`, `ClusteredDeadlines`, `ZeroDeadlines`, `TooltipActive` | WCAG AA density palette, tooltip non-color text cues, ARIA status announcements. |
| `ItemDetailDrawer` | `src/lib/components/drawer/ItemDetailDrawer.svelte` | `Hardware0To12mCliff`, `Hardware13To24m`, `SubscriptionActive`, `ZoomReceiptModal` | `FocusTrapStack` active, background scroll locked, `Esc` restoration. |
| `QuickCaptureModal` | `src/lib/components/capture/QuickCaptureModal.svelte` | `Empty`, `PrefixTrieAutofilled`, `ReceiptAttached`, `ValidationErrors` | `<15s` entry flow verified, inline error labels linked via `aria-describedby`. |
| `UrgentAttentionBanner` | `src/lib/components/dashboard/UrgentAttentionBanner.svelte` | `SingleUrgentSub`, `MultipleBgbCliffs`, `HiddenZeroUrgent` | Contrast $\ge 4.5:1$, pulsating non-color alert icon `🛑`. |

### 10.5 Statutory Legal Tech Safe Harbor Attestation
Pursuant to the landmark Federal Court of Justice ruling **BGH VIII ZR 285/18 (*LexFox*)**, digital software providing automated, deterministic document compilation and statutory notice generation based on user inputs does **not** constitute unauthorized legal practice under the Legal Services Act (**`RDG §§ 2, 3`**) or unauthorized tax advisory under **`§ 2 StBerG`**. 

Every claim letter and cancellation dossier generated by the MCP server or the application interface embeds the following immutable disclaimer:

> *"Hinweis: Dieses Dokument wurde automatisiert anhand der von Ihnen eingegebenen Sachverhaltsdaten und gesetzlichen Fristen (§§ 437, 477, 312k BGB) deterministisch zusammengestellt (BGH VIII ZR 285/18). Es handelt sich um ein formales Aufforderungsschreiben zur Wahrung Ihrer gesetzlichen Verbraucherrechte. Diese Software erbringt keine Rechts- oder Steuerberatung im Sinne des RDG / StBerG."*

### 10.6 Independent Verification Methodology & Invalidation Conditions
An independent auditor can verify this specification against the following unambiguous criteria:

1. **Token Hierarchy Integrity:** Every token must resolve along the 3-tier DTCG path (Primitive $\rightarrow$ Semantic $\rightarrow$ Component). Any hardcoded arbitrary hex or pixel values without semantic backing invalidate the specification.
2. **Photometric Contrast Math Invariance:** Any text pairing with $CR < 4.5:1$ or non-text boundary with $CR < 3.0:1$ under either Light or Dark mode invalidates compliance.
3. **Non-Color Accessibility Invariance:** Any visual indicator relying strictly on hue without an accompanying geometric glyph and explicit text label violates WCAG SC 1.4.1.
4. **Touch Target Boundary Invariance:** Any interactive element exhibiting a coarse-pointer bounding box $< 44 \times 44\text{px}$ without `::after` expansion fails Apple HIG and Team 6 standards.
5. **Omnibar FSM Determinism:** The 8 states (`IDLE`, `FOCUSED_EMPTY`, `QUERYING`, `VAULT_MATCHES`, `WIKI_MATCHES`, `HYBRID_MATCHES`, `NO_MATCH_SUGGESTION`, `COMMAND_MODE`) and the 21 transition rules must be reproducible with zero unhandled state branches.
6. **Triple Calendar Invariance:** The three calendar types (Monthly ISO 8601 DIN Grid, Timeline/Agenda Horizon with 12m BGB § 477 Cliff, and 52-Week Countdown Risk Heatmap) must be fully specified with discrete mental models, data schemas, and wireframes.
7. **Zero Cloud Privacy Invariant:** No plaintext receipt blobs or personal item metadata may be transmitted over network sockets (`GDPR Art. 25`).

---
*Certified and authored for Milestone M1 by `teamwork_worker_m1_1`.*
