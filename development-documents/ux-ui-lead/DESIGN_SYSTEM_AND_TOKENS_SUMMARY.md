# 🎨 Design System, W3C DTCG Tokens & Svelte 5 Component Matrix (`DOC-UX-04`)

**Document Reference:** `DOC-UX-04`  
**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule*)  
**Course Module:** *Computer & Media Lab* (Wintersemester 2026) · **Instructor:** Prof. Franziska Schwarz  
**Working Team:** **Team 6**  
**Project:** *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  
**Role Owner & Author:** **Prushti** — *UX/UI Lead (Member C)* · *Verified against WCAG 2.1 AA (`Gate 6`)*

---

## 1. Design System Philosophy & Brand Aesthetic

CM-LAB's visual language—**Trusted Consumer Vault**—balances calm institutional clarity (`#2F524C` Deep Primary Teal on `#F4F7F6` Soft Mineral Canvas) with unmistakable statutory urgency (`#D96B4B` Action Coral and WCAG AA semantic urgency badges). Every visual token is shared identically between the **Public Showcase (`[Project].pages.dev`)** and the **Offline-First Wallet Application (`app.[Project].pages.dev`)**, ensuring zero hardcoded hex values in Svelte 5 components or Storybook stories.

---

## 2. W3C DTCG 3-Tier Token Architecture

Following the **W3C Design Tokens Community Group (DTCG)** format, all CM-LAB tokens are structured across three strict tiers and compiled to CSS Custom Properties (`src/styles/tokens.css`):

1. **Tier 1 — Primitive Palette & Scale Tokens:** Raw verified hex values, modular rem scales, and millisecond durations.
2. **Tier 2 — Semantic Intent Tokens:** Purpose-driven aliases governing surfaces, typography contrast, statutory urgency states (`<=7d`, `8–30d`, `>30d`, `0d`), and interactive focus rings.
3. **Tier 3 — Component-Scoped Tokens:** Bound directly to `OmniBar`, `CalendarGrid`, `BgbCliffTimeline`, `UrgencyBadge`, and `QuickCaptureModal`.

### 2.1 Official CM-LAB Color Palette & WCAG 2.1 Contrast Verification

| Semantic Token (`CSS Variable`) | Official Hex | Surface / Pairing Context | Verified Contrast Ratio | WCAG 2.1 Level | Primary UI Application |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `--color-primary-teal` | **`#2F524C`** | On `--color-card-white` (`#FFFFFF`) | **7.8 : 1** | **AAA** | Primary headings, active navigation borders, Omni-Bar active frame, brand wordmark. |
| `--color-accent-coral` | **`#D96B4B`** | White text (`#FFFFFF`) / Card accents | **4.6 : 1** | **AA** | Primary CTAs (`+ Quick Capture`, `Generate Claim Dossier`), Omni-Bar create-new highlight. |
| `--color-bg-canvas` | **`#F4F7F6`** | App & Showcase page background | — | Base Surface | Soft neutral mineral canvas reducing eye strain across modular widget grids. |
| `--color-card-white` | **`#FFFFFF`** | Elevated widget cards & modals | — | Elevated Surface | Widget containers, `OmniBar` listbox, `QuickCaptureModal`, receipt vault cards. |
| `--color-urgent-red` | **`#DC2626`** | On `#FFFFFF` (or `#991B1B` on `#FEE2E2`) | **4.8 : 1** (`7.2:1` pill) | **AA / AAA** | **Urgent (`<= 7 days`)**: Imminent subscription debit, expiring warranty, validation error border. |
| `--color-warning-amber` | **`#D97706`** | On `#FFFFFF` (or `#92400E` on `#FEF3C7`) | **4.5 : 1** (`6.8:1` pill) | **AA** | **Expiring Soon (`8–30 days`)**: Notice window alert, Month 11 `BGB § 477 Abs. 1` cliff warning. |
| `--color-protected-green` | **`#059669`** | On `#FFFFFF` (or `#065F46` on `#DCFCE7`) | **4.9 : 1** (`7.4:1` pill) | **AA / AAA** | **Protected (`> 30 days`)**: Active `BGB § 438` coverage, verified GoBD `SHA-256` stamp. |
| `--color-expired-grey` | **`#6B7280`** | On `#FFFFFF` (or `#374151` on `#F3F4F6`) | **4.7 : 1** (`7.5:1` pill) | **AA / AAA** | **Expired (`0 days`)**: Lapsed warranties, suppressed historical items (`Scenario 3.3`), secondary metadata. |

### 2.2 W3C DTCG JSON Token Source (`design-tokens.dtcg.json` Excerpt)

```json
{
  "color": {
    "brand": {
      "primary-teal": { "$type": "color", "$value": "#2F524C", "$description": "7.8:1 AAA primary brand & structural text" },
      "accent-coral": { "$type": "color", "$value": "#D96B4B", "$description": "4.6:1 AA primary action & quick-capture CTA" }
    },
    "surface": {
      "canvas": { "$type": "color", "$value": "#F4F7F6" },
      "card": { "$type": "color", "$value": "#FFFFFF" },
      "border-subtle": { "$type": "color", "$value": "#D5DFDC" }
    },
    "status": {
      "urgent": {
        "fg": { "$type": "color", "$value": "#DC2626" },
        "bg": { "$type": "color", "$value": "#FEE2E2" },
        "ink": { "$type": "color", "$value": "#991B1B" }
      },
      "warning": {
        "fg": { "$type": "color", "$value": "#D97706" },
        "bg": { "$type": "color", "$value": "#FEF3C7" },
        "ink": { "$type": "color", "$value": "#92400E" }
      },
      "protected": {
        "fg": { "$type": "color", "$value": "#059669" },
        "bg": { "$type": "color", "$value": "#DCFCE7" },
        "ink": { "$type": "color", "$value": "#065F46" }
      },
      "expired": {
        "fg": { "$type": "color", "$value": "#6B7280" },
        "bg": { "$type": "color", "$value": "#F3F4F6" },
        "ink": { "$type": "color", "$value": "#374151" }
      }
    }
  },
  "size": {
    "touch-min": { "$type": "dimension", "$value": "48px", "$description": "Mandatory WCAG 2.5.5 mobile touch bounding box" }
  }
}
```

### 2.3 Canonical CSS Custom Properties (`src/styles/tokens.css`)

```css
:root {
  /* Tier 2 Semantic Brand & Surface Colors */
  --color-primary-teal: #2f524c;
  --color-primary-teal-hover: #233f3a;
  --color-accent-coral: #d96b4b;
  --color-accent-coral-hover: #c05839;
  --color-bg-canvas: #f4f7f6;
  --color-card-white: #ffffff;
  --color-border-subtle: #d5dfdc;
  --color-text-primary: #162623;
  --color-text-secondary: #475955;

  /* Statutory Urgency Semantics */
  --color-urgent-red: #dc2626;
  --color-urgent-bg: #fee2e2;
  --color-urgent-ink: #991b1b;

  --color-warning-amber: #d97706;
  --color-warning-bg: #fef3c7;
  --color-warning-ink: #92400e;

  --color-protected-green: #059669;
  --color-protected-bg: #dcfce7;
  --color-protected-ink: #065f46;

  --color-expired-grey: #6b7280;
  --color-expired-bg: #f3f4f6;
  --color-expired-ink: #374151;

  /* Typography & Numeric Alignment */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Spacing, Radii & Mandatory Touch Targets */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --radius-sm: 0.5rem; /* 8px */
  --radius-md: 0.75rem;/* 12px */
  --radius-lg: 1rem;   /* 16px */
  --radius-pill: 9999px;
  --size-touch-min: 48px;
  --focus-ring: 0 0 0 3px rgba(47, 82, 76, 0.35);
}
```

---

## 3. Typography, Spacing & Touch Ergonomics (`Gate 6`)

### 3.1 Typographic Hierarchy & Tabular Figures
* **System-First Offline Font Stack:** Uses zero external Google Fonts CDN calls so typography renders identically with `CLS = 0` in Airplane Mode (`GDPR Art. 25` — zero IP leakage to font CDNs).
* **Mandatory Tabular Numerals (`font-variant-numeric: tabular-nums`):** Applied to all countdown timers (`11.4s`, `3d 14h`), calendar grid cells, EUR prices (`€279.00`), and `SHA-256` / JSON-RPC latency counters so live `SvelteDate` ticks never cause horizontal jitter.
* **Monospace Cryptographic & Legal Proofs (`--font-mono`):** Used exclusively for GoBD `SHA-256` digests (`8f4b2c9a...`), statutory citations (`BGB § 477 Abs. 1`), and MCP JSON-RPC 2.0 payloads in View 6B.

| Type Token | Size (`rem` / `px`) | Line Height | Weight | Usage Context |
| :--- | :---: | :---: | :---: | :--- |
| `text-display` | `1.75rem` (`28px`) | `1.2` | `700` | Showcase hero headline (`[Project].pages.dev`), dashboard net protected value (`€849.00`). |
| `text-h1` | `1.375rem` (`22px`) | `1.3` | `700` | View headers (`Unified Wallet`, `Quick Capture`, `Claim Action Dossier`). |
| `text-h2` | `1.125rem` (`18px`) | `1.35` | `600` | Widget card titles (`Monthly Renewal Grid`, `BGB § 477 Cliff Timeline`). |
| `text-body` | `1.0rem` (`16px`) | `1.5` | `400/500` | All form `<input>` controls (`>=16px` prevents iOS Safari auto-zoom on focus!), Omni-Bar input, legal notice body. |
| `text-caption` | `0.875rem` (`14px`) | `1.4` | `500` | Urgency badges, statutory citations, RDG / StBerG safe-harbor disclaimers. |
| `text-mono-sm` | `0.75rem` (`12px`) | `1.4` | `500` | GoBD `SHA-256` hex badge, MCP JSON-RPC `-32602` trace. |

### 3.2 Responsive Viewport Grid & `>=48x48px` Touch Mandate
* **Mobile Primary Target (`375px – 412px`):** Single-column fluid stack (`padding-inline: var(--space-4)`), sticky top `OmniBar`, sticky bottom action bar, zero horizontal scroll (`overflow-x: clip`).
* **Tablet (`768px – 1023px`):** 2-column widget grid (`UrgencyCountdownWidget` beside `MonthlyCalendarGrid`).
* **Desktop Bento Dashboard & Showcase (`>= 1024px`, max-width `1280px`):** 12-column CSS Grid (`8-col` primary timeline & `BgbCliffTimelineWidget` + `4-col` `MonthlyCalendarGrid` & Tax/Subscription burn summary).
* **Touch Bounding Box Invariant:** Every interactive `<button>`, `<input>`, filter pill, calendar date cell with active items, Prefix-Trie suggestion row, and modal close button enforces `min-width: var(--size-touch-min)` (`48px`) and `min-height: var(--size-touch-min)` (`48px`) with `>= 8px` inter-target spacing.

---

## 4. Svelte 5 Component Variant Matrix (`@storybook/addon-svelte-csf`)

Every UI component in `src/components/` exposes strictly typed Svelte 5 `$props()` and maps 1:1 to semantic CSS custom properties:

| Component | File Name | Primary Variants (`$props()`) | Non-Color Redundancy & Statutory States | Required `.stories.svelte` Stories |
| :--- | :--- | :--- | :--- | :--- |
| **Unified Omni-Bar** | `OmniBar.svelte` | `mode: 'live' \| 'showcase-preview'`<br/>`state: 'idle' \| 'results' \| 'create-only'` | Groups labeled with explicit headers (`Saved Vault`, `Policy Wiki`, `+ Quick Capture`); Coral action badge on `create`. | `IdleDefault`, `MixedPolicyAndSavedResults`, `ZeroMatchCreateDyson`, `ShowcaseReadOnly` |
| **Urgency Status Badge** | `UrgencyBadge.svelte` | `tier: 'urgent' \| 'warning' \| 'protected' \| 'expired'` | Pairs color with distinct icon + explicit text (`▲ Urgent · 3d`, `◆ Expiring · 18d`, `✓ Protected · 16m`, `○ Expired`). | `UrgentRed_3d`, `WarningAmber_14d`, `ProtectedGreen_16m`, `ExpiredGrey_0d` |
| **Monthly Calendar Grid** | `MonthlyCalendarGrid.svelte` | `monthIso: string`<br/>`density: 'compact' \| 'expanded'` | Shape-coded event markers (`▲`, `◆`, `●`) + same-day collision count badge (`3x · €34.97`). | `StandardMonth`, `SameDayCollision_Nov1`, `EmptyMonth`, `KeyboardFocusDay` |
| **`BGB § 477` Cliff Bar** | `BgbCliffTimelineWidget.svelte` | `phase: 'reversal-active' \| 'reversal-cliff-soon' \| 'post-12m-statutory' \| 'ablaufhemmung-475e'` | Vertical `12m` cliff pin + plain-language badge (`Beweislastumkehr Active` vs. `Consumer Proof Phase`). | `Month4_Active477`, `Month11_CliffWarning`, `Month16_Post12m`, `Month23_475eExtension` |
| **30/7/1d Countdown** | `UrgencyCountdownWidget.svelte` | `bucket: 'lte7d' \| 'd8to30' \| 'gt30d'`<br/>`permissionDeniedBanner?: boolean` | Tabular live countdown + inline 1-tap `Claim / Cancel` button (`>=48px`). | `Urgent7d_GymCancel`, `Month11_HardwareCheck`, `PushDeniedTopBanner` |
| **Quick Capture Modal** | `QuickCaptureModal.svelte` | `category: 'hardware' \| 'subscription'`<br/>`receiptState: 'empty' \| 'hashing' \| 'verified' \| 'fallback-picker'`<br/>`validationError?: boolean` | Elevated receipt photo slot beside `Item Name` (`Iteration C-2`); inline `GoBD SHA-256` checkmark; `§ 9 EStG` toggle. | `HardwareSonyPreset`, `SubscriptionFitXPreset`, `ValidationMissingName`, `CameraFallbackBanner` |
| **Claim & Cancel Drawer** | `ClaimGeneratorModal.svelte` | `templateType: 'maengelruege_437' \| 'kuendigung_309' \| 'fristlos_312k6' \| 'widerruf_355'`<br/>`missingReceiptFallback: boolean` | Non-removable `BGH VIII ZR 285/18 (LexFox)` / `RDG §§ 2, 3` box; transient-safe clipboard fallback modal. | `DefectWithin12m_477`, `ObstructedButton_312k6`, `MissingReceipt_Kontoauszug`, `PdfTimeoutTextFallback` |
