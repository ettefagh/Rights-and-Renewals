# Consolidated Design System, Tokens & Visual Architecture Summary

**Framework Identifier:** `CONS-DS-TOK-003`  
**Consolidation Level:** Executive Milestone 3 Synthesis  
**Target Application:** ApexCloud Autonomous Infrastructure Cockpit  
**Target Directory:** `ui_ux_prebuild_framework/consolidated/`  
**Reference Source Directory:** `ui_ux_prebuild_framework/03_design_system_and_tokens/` (Features F20–F24)  

---

## 1. W3C DTCG 3-Tier Design Token Architecture

ApexCloud enforces the W3C Design Tokens Community Group (DTCG) specification structure:
`{Category}.{Property}.{Variant}.{State}`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3-TIER TOKEN RESOLUTION PIPELINE                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PRIMITIVE TOKENS (Raw Literals, Unopinionated)                           │
│    e.g., color.primitive.blue.600 (#2563EB), neutral.500 (#64748B)         │
│          space.4 (16px), font.size.sm (14px), radius.md (6px)               │
│                                 │                                           │
│                                 ▼                                           │
│ 2. SEMANTIC TOKENS (Contextual Intent & Theme Inversion)                    │
│    e.g., color.interactive.brand.default -> {color.primitive.blue.600}      │
│          color.border.default (Light)     -> {color.primitive.neutral.500}   │
│          color.text.muted (Light)         -> {color.primitive.neutral.550}   │
│                                 │                                           │
│                                 ▼                                           │
│ 3. COMPONENT TOKENS (Component-Scoped Bindings)                             │
│    e.g., button.primary.bg.default        -> {color.interactive.brand.def}  │
│          table.row.border.default         -> {color.border.default}         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Remediated Photometric Color Tokens (WCAG AA Mathematical Proofs)
To guarantee strict compliance with WCAG SC 1.4.3 ($\ge 4.5:1$ text) and SC 1.4.11 ($\ge 3.0:1$ non-text boundary), all semantic tokens resolve to verified relative luminances ($L$):

| Semantic Token Name | Light Theme Binding | Dark Theme Binding | Measured Contrast Ratio | WCAG Compliance Standard |
|---|---|---|---|---|
| `color.surface.canvas` | `{neutral.50}` (`#F8FAFC`, $L=0.954$) | `{neutral.900}` (`#0F172A`, $L=0.009$) | Base Canvas | Baseline Surface |
| `color.surface.card` | `{neutral.0}` (`#FFFFFF`, $L=1.000$) | `{neutral.800}` (`#1E293B`, $L=0.022$) | Structural Container | Baseline Card |
| `color.surface.subtle` | `{neutral.100}` (`#F1F5F9`, $L=0.908$) | `{neutral.800}` (`#1E293B`, $L=0.022$) | Secondary Container | Subtle Background |
| `color.text.primary` | `{neutral.900}` (`#0F172A`) | `{neutral.50}` (`#F8FAFC`) | **15.4:1 (L) / 14.8:1 (D)** | Passes Level AAA |
| `color.text.secondary` | `{neutral.600}` (`#475569`) | `{neutral.300}` (`#CBD5E1`) | **7.1:1 (L) / 6.8:1 (D)** | Passes Level AAA |
| `color.text.muted` | `{neutral.550}` (`#57687E`, $L=0.134$) | `{neutral.400}` (`#94A3B8`, $L=0.360$) | **5.2:1 (L) / 5.7:1 (D)** | Passes Level AA (on Subtle & Card) |
| `color.border.default` | `{neutral.500}` (`#64748B`, $L=0.171$) | `{neutral.400}` (`#94A3B8`, $L=0.360$) | **4.6:1 (L) / 5.7:1 (D)** | Passes SC 1.4.11 Non-Text Boundary |
| `color.border.focus` | `{blue.600}` (`#2563EB`) | `{blue.500}` (`#3B82F6`) | **4.8:1 (L) / 4.5:1 (D)** | Passes SC 2.4.11 Focus Indicator |

---

## 2. Component Variant Matrices & Mobile Touch Architecture

### 2.1 Core Component Matrix Overview
- **Action Button (`ApexButton`):** Sizes: `xs` (28px), `sm` (32px), `md` (40px), `lg` (48px), `xl` (56px). Variants: `solid`, `outline`, `ghost`, `link`. Intents: `brand`, `secondary`, `success`, `warning`, `danger`.
- **Form Text Field (`ApexTextField`):** Sizes: `sm` (32px), `md` (40px), `lg` (48px). Validation states: `default`, `focus`, `error`, `success`, `disabled`. Built-in password reveal eye toggle and character counter.
- **Modal Dialog (`ApexModalDialog`):** Width scales: `sm` (400px), `md` (600px), `lg` (800px), `xl` (1140px), `fullscreen` (mobile fallback). Scroll containment: `inside` (body scrolls) vs `outside`.
- **Enterprise Data Table (`ApexDataTable`):** Densities: `compact` (36px row), `regular` (48px row), `relaxed` (60px row). Virtualized scrolling maintains $\ge 50\text{ fps}$ at 10,000+ records.

### 2.2 Mobile Touch Target Hit-Area Recipe (`::after` Pseudo-Element)
To satisfy Apple HIG ($44 \times 44\text{px}$) and WCAG 2.2 SC 2.5.8 ($24 \times 24\text{px}$ min) without blowing up dense desktop data tables, compact buttons implement an invisible CSS touch expansion layer:

```css
@media (pointer: coarse) {
  .apex-btn--xs,
  .apex-btn--sm {
    position: relative;
  }

  .apex-btn--xs::after,
  .apex-btn--sm::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
    pointer-events: auto;
  }
}
```

---

## 3. Universal 8-State Component Lifecycle Matrix

Every interactive component implements eight deterministic states in strict priority order:
1. **Disabled:** Visual opacity 0.45, `cursor: not-allowed`, pointer events disabled.
2. **Loading / Busy:** Width locked to prevent CLS, label replaced with centered spinner, `aria-busy="true"`.
3. **Active (Pressed):** Scale micro-compression `transform: scale(0.98)`, surface darkens.
4. **Focus (Visible):** 2px brand focus ring (`#2563EB`), 2px outer offset.
5. **Hover:** Surface tint transition over 150ms.
6. **Error / Invalid:** 2px Crimson outline (`#EF4444`), trailing error icon, linked message.
7. **Empty State:** Friendly calm illustration, contextual explanation, primary action trigger.
8. **Default (Rest):** Standard baseline styling.

---

## 4. Responsive Grid, Safe Area Insets & Motion Specifications

### 4.1 5-Tier Responsive Breakpoint Model
| Tier | Breakpoint Window | Column Count | Gutter Width | Page Margin | Primary Target Device |
|---|---|---|---|---|---|
| `xs` | $< 600\text{px}$ | 4 Columns | 12px | 16px | Mobile Phones (Portrait) |
| `sm` | $600\text{px} - 899\text{px}$ | 8 Columns | 16px | 24px | Small Tablets / Mobile Landscape |
| `md` | $900\text{px} - 1199\text{px}$ | 12 Columns | 20px | 24px | Large Tablets / Small Laptops |
| `lg` | $1200\text{px} - 1599\text{px}$| 12 Columns | 24px | 32px | Standard Desktop Monitors |
| `xl` | $\ge 1600\text{px}$ | 12 Columns | 32px | 40px | Ultra-Wide Workstation Displays |

### 4.2 Mandatory Safe Area Inset & Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```
- Safe Area Equations:
  ```css
  .apex-page-container {
    padding-top: max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
  .apex-bottom-nav {
    height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
  ```
- Dynamic Viewport Units: Mandate `100dvh` over `100vh` to eliminate mobile browser URL-bar clipping.

### 4.3 Motion Design & Reduced Motion Tokens
- **Duration Scale:** `motion.duration.instant` (100ms), `fast` (150ms), `normal` (250ms), `slow` (350ms), `deliberate` (500ms).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Deceleration entry curve), `cubic-bezier(0.7, 0, 0.84, 0)` (Acceleration exit curve).
- **Reduced Motion Invariant:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
