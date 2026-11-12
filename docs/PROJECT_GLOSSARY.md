# Rights & Renewals — Canonical Project Glossary & UX Lexicon

This document defines the canonical user-facing terminology, mental models, visual indicators, and progressive legal disclosure rules (`*` footnote system) across the **Rights & Renewals** application and public Policy Wiki.

---

## 1. Core Entity Taxonomy: Strictly `Sub` and `Warranty`

The application manages two fundamental everyday domains. Redundant technical tags (`HARDWARE`, `SUBSCRIPTION`, `DAUERSCHULDVERHÄLTNIS`) are never printed as raw text badges on cards.

| Canonical Term | Internal Category | Mental Model | Visual & Card Anatomy |
| :--- | :--- | :--- | :--- |
| **`Sub`** *(Subscription)* | `'subscription'` | **Active Cashflow Outflow:** A recurring contract that automatically deducts money or generates a periodic bill until cancelled. | Ordered by billing concurrency (`Daily` → `Weekly` → `Monthly` → `Quarterly` → `Yearly`) and price descending. Displays a live payment indicator (`● Auto-Pay` or `Invoice Due`) and price with cycle unit (`€5.99 / mo`). |
| **`Warranty`** | `'hardware'` | **Protected Past Purchase:** A one-time physical purchase covered against defects for 24 months. | **Never displays the historical purchase price on dashboard cards** (the purchase is a sunk cost). Instead, displays a **Coverage Lifespan Progress Bar**, remaining coverage time (`7 mos left`), and 1-tap `Receipt` / `Serial No.` counter actions. |

---

## 2. Payment & Cashflow Indicators (Multi-Agent Consensus)

Consumers categorize **sunk asset value** (a paid-off item under warranty) in a completely different mental account than **active cashflow drain** (an upcoming SEPA direct debit, card charge, or recurring invoice).

| Indicator Label | Visual Representation | Meaning & Trigger Condition |
| :--- | :--- | :--- |
| **`● Auto-Pay`** | Pulsing emerald/amber dot + pill badge | Active recurring subscription that automatically deducts payment (`status === 'active'`). |
| **`⚡ Charges in Xd`** | High-contrast amber/red dot + pill badge | Active subscription renewing within $\le 14$ days (`status === 'expiring_soon'`). |
| **`Invoice Due`** | Amber document dot + pill badge | Active recurring contract where the user receives a manual invoice (*Rechnung*) to pay periodically. |
| **`⏹ Auto-Pay Stopped`** | Static muted slate badge | Subscription where cancellation has been submitted (`cancellation_pending`) or completed (`cancelled`). |

---

## 3. Dashboard Metrics: Replacing Institutional Jargon

| Deprecated Jargon | Why It Was Replaced | Canonical Replacement | Definition |
| :--- | :--- | :--- | :--- |
| `Protected Capital (€1,904.99)` | Sounds like hedge-fund jargon and misleadingly added a €1,899 laptop purchase price to a €5.99 monthly Spotify bill. | **`Monthly Auto-Pay`** | Total recurring monthly spend across all active subscriptions (`€/mo`), visualized via an interactive SVG Spend Donut Chart. |
| `Active Items` | Too vague; mixes bills with warranties. | **`Active Subs`** & **`Active Warranties`** | Distinct counts and health rings for recurring subscriptions vs. covered one-time purchases. |
| `Tax Deductible (Top Banner)` | Severe frequency mismatch: taxes are filed once a year, whereas subscriptions and warranties are checked weekly/monthly. | *Moved to Tax Export View & Item Edit Toggle* | Kept out of the primary first-glance dashboard blocks; accessible on demand via the Tax Summary view (`>tax`) and item edit toggle. |

---

## 4. Progressive Legal Disclosure (`*` Footnote System)

Raw German statutory citations (`§ 477 BGB`, `§ 312k BGB`, `§ 309 Nr. 9 BGB`, `GoBD Rn. 108–110`) are essential when compiling formal legal notices, but intimidating when used as primary UI labels.

**Rule:** Primary UI controls and badges use human-friendly terms marked with an asterisk (`*`, `**`, `***`). The **App Footer Glossary** explains each term in one plain-English sentence hyperlinked to the public Policy Wiki (`/wiki`).

| Raw Legal / Technical Term | Friendly UI Label | Footnote Marker | Plain-English Footer Explanation & Wiki Target |
| :--- | :--- | :---: | :--- |
| `§ 477 BGB Cliff` / `Beweislastumkehr` | **`Easy-Claim Period*`** *(12m mark: **`Proof Shift*`**)* | `*` | During the first 12 months of your 2-year statutory warranty (§§ 438, 477 BGB), the seller must prove the item was not defective at delivery. [Read in Wiki →](/wiki) |
| `§ 312k BGB` & `§ 309 Nr. 9 BGB` | **`1-Click Cancel**`** & **`Monthly Cancel Right**`** | `**` | Online providers must offer a direct cancellation page (§ 312k BGB), and auto-renewing contracts can be cancelled monthly with max 1 month's notice (§ 309 Nr. 9 BGB). [Read in Wiki →](/wiki) |
| `GoBD Tamper-Proof Audit Seal (SHA-256)` | **`Verified Receipt***`** | `***` | Your receipt photo is sealed locally on your device with a cryptographic SHA-256 fingerprint (GoBD Rn. 108–110) to prove originality for warranty and tax claims. [Read in Wiki →](/wiki) |

---

## 5. Human-Friendly Date Formatting Rules

Raw ISO-8601 strings (`2026-07-07`) are reserved strictly for machine inputs (`<input type="date">`) and exported CSV/JSON payloads. All human-facing surfaces use natural English dates:
- **Full / Drawer Date:** `July 7th, 2026` (`formatFriendlyDate(iso, 'long')`)
- **Compact Card / Timeline Date:** `Jul 7, 2026` (`formatFriendlyDate(iso, 'short')`)
- **Relative Urgency Badge:** `in 3 days`, `7 mos left`, `1y 4m left` (`formatRelativeRemaining(iso)`)
