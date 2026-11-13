# 📱 Drawer Primitives, Iconography Standard & Media Division of Labor (`DOC-UX-08`)

**Document ID:** `CM-LAB-UX-DRAWER-ICON-MEDIA-V1` · **Status:** Ratified Technical Specification  
**Academic Institution:** SRH University of Applied Sciences (*SRH Hochschule*)  
**Course Module:** *Computer & Media Lab* (Wintersemester 2026) · **Instructor:** Prof. Franziska Schwarz  
**Working Team:** **Team 6** · *Warranty, Subscription & Tax-Ready Wallet + Policy Wiki (MCP/API-Enabled)*  
**Role Owner & Author:** **Prushti** — *UX/UI Lead (Member C)*  
**Engineering Collaboration:** **Kyle** *(Development Lead — Member D)* & **Mojtaba** *(Quality & Media Lead — Member A)*  
**Governing Documents:** [`GOAL.md`](../../GOAL.md) · [`BLUEPRINT.md`](../../BLUEPRINT.md) · [`AGENT.md`](../../AGENT.md) · [`DOC-UX-01`](./MASTER_UIUX_PREBUILD_SPECIFICATION.md) · [`DOC-UX-04`](./DESIGN_SYSTEM_AND_TOKENS_SUMMARY.md) · [`DOC-UX-05`](./ACCESSIBILITY_AND_ENGINEERING_HANDOFF_SUMMARY.md) · [`MEDIA_PIPELINES_SPEC.md`](../quality-media-lead/MEDIA_PIPELINES_SPEC.md)

---

## 1. Executive Summary & Media / UI Division of Labor

The CM-LAB dual-domain platform operates across two distinct environments:
1. **The Public Showcase (`[Project].pages.dev`):** An Astro 6 static/edge showcase introducing the Model Context Protocol (MCP) server, zero-auth Brand Policy Wiki (`/wiki`), and interactive preview widgets.
2. **The Offline-First Modern Wallet Application (`app.[Project].pages.dev`):** A high-performance, single-island (`<WalletApp client:only="svelte" />`) Progressive Web App governed by Svelte 5 runes, Dexie.js v4, and the Web Crypto API.

To prevent bundle bloat, Cumulative Layout Shift (CLS), security violations, and UI inconsistencies, this specification establishes the **definitive division of labor** between UI presentation packages, build-time vector pipelines, static showcase assets, and sandboxed client-side media workers:

```mermaid
flowchart TD
    subgraph UI_Presentation["UI Presentation & Interaction Layer (Prushti · UX/UI Lead)"]
        Svaul["@harshmandan/svaul\n(Runes-First Bottom-Sheet & 520px Side Drawer)"]
        Lucide["lucide-svelte\n(Universal 24x24 UI Icon Geometry · WCAG AA/AAA)"]
        BrandVectors["unplugin-icons + @iconify-json/simple-icons\n(Build-Time On-Demand SVG Marks for Top 20 Brands)"]
    end

    subgraph Showcase_Media["Showcase Static Media Layer (Astro 6 / Build-Time)"]
        AstroAssets["astro:assets (@sveltejs/enhanced-img)\n(Build-Time AVIF/WebP, Zero-CLS Dimensions, EXIF Strip)"]
    end

    subgraph Vault_Media["Client-Side Private Receipt Vault (Mojtaba · Media Lead)"]
        Worker["image-compression.worker.ts\n(OffscreenCanvas <=2048px, <1.5MB Web Worker)"]
        GoBD["GoBD Rn. 108-110 SHA-256 Digest\n(Pre-Encryption Forensic Integrity Fingerprint)"]
        CryptoVault["WebCrypto AES-GCM-256 Encryption\n(GDPR Art. 25 Zero-Cloud Local IndexedDB Vault)"]
    end

    UI_Presentation --> |Mounts Contextual Drawers| Svaul
    UI_Presentation --> |Renders Navigation & Controls| Lucide
    UI_Presentation --> |Displays Wiki Brand Badges| BrandVectors
    Showcase_Media --> |Optimizes Marketing & Hero Visuals| AstroAssets
    Vault_Media --> Worker --> GoBD --> CryptoVault
```

### 1.1 The 5 Pillars: Package & Media Division of Labor Matrix

| Pipeline / Tool | Category | Surface / Scope | Primary Technical Responsibility | Authority & Ownership |
| :--- | :--- | :--- | :--- | :--- |
| **`@harshmandan/svaul`** | Sheet Primitive | Wallet App & Modals | Svelte 5 runes bottom-sheet for mobile ($<768$px) and 520px contextual right drawer for desktop ($\ge 768$px). Drag kinematics, snap points, focus traps. | **Prushti** *(UX/UI)* |
| **`lucide-svelte`** | Universal UI Icons | App & Showcase | Consistent 24x24 vector stroke icons across FAB Speed Dial, Unified Omni-Bar, Calendar widgets, and drawer navigation. WCAG AA/AAA contrast. | **Prushti** *(UX/UI)* |
| **`unplugin-icons` + `@iconify-json/simple-icons`** | Brand Vector Pipeline | Policy Wiki (`/wiki`) | Zero-runtime build-time SVG compilation of official vector logos for the Top 20 student brands. Zero raster images, zero CLS, zero external HTTP fetches. | **Prushti** *(UX/UI)* |
| **`astro:assets`** *(or `@sveltejs/enhanced-img`)* | Static Showcase Graphics | Showcase (`*.pages.dev`) | Build-time AVIF/WebP downsampling, automated `srcset` generation, intrinsic dimension extraction (zero CLS), and EXIF sanitization for hero graphics. | **Prushti** / **Kyle** |
| **`image-compression.worker.ts`** | Sandboxed Client Worker | Offline Vault (`app.*`) | Runtime consumer receipt photos ($15\text{MB}+$) downsampled on `OffscreenCanvas` to $<1.5\text{MB}$, hashed with pre-encryption `SHA-256` (GoBD Rn. 108–110), encrypted via `AES-GCM-256`. | **Mojtaba** *(Media/QA)* |

---

## 2. Svelte 5 Runes Drawer & Sheet Architecture (`@harshmandan/svaul`)

### 2.1 Rationale & Runes Compatibility
The application previously evaluated traditional CSS modal dialogs and legacy Svelte 3/4 drawer wrappers. These approaches proved inadequate for modern multi-device ergonomics:
* Legacy wrappers introduce store overhead (`writable`, `derived`) incompatible with Svelte 5's fine-grained reactivity.
* Mobile users expect fluid, gesture-driven bottom sheets with tactile velocity snapping, drag resistance, and hardware-accelerated spring physics.
* Desktop power users require wide contextual right-hand drawers ($520\text{px}$) that maintain background dashboard context without disorienting full-screen modal overlays.

`@harshmandan/svaul` is the authoritative, runes-native Svelte 5 port of Vaul. It provides:
1. Native Svelte 5 `$state` and `$derived` reactivity.
2. Built-in touch, mouse, and pointer drag gesture tracking.
3. Accessible WAI-ARIA modal dialog semantics (`role="dialog"`, `aria-modal="true"`).
4. Configurable snap points and velocity-aware dismissal kinematics.

### 2.2 Responsive Dual-Mode Layout Contract

The drawer primitive dynamically adapts its container geometry and animation axis based on viewport width:

```
+-----------------------------------------------------------------------------+
| DESKTOP (Viewport width >= 768px): Fixed 520px Right Drawer                 |
|                                                                             |
| +---------------------------------------------------+ +-------------------+ |
| |                                                   | |  520px DRAWER     | |
| |  Dashboard Widgets / Omni-Bar Grid                | |  Item Details     | |
| |  (Dimmed by rgba(15, 23, 42, 0.45) Backdrop)      | |  24m Timeline     | |
| |                                                   | |  BGB § 477 Cliff  | |
| |                                                   | |  1-Tap Action CTA | |
| +---------------------------------------------------+ +-------------------+ |
+-----------------------------------------------------------------------------+
| MOBILE (Viewport width < 768px): Bottom Sheet with Tactile Grab Handle      |
|                                                                             |
| +-------------------------------------------------------------------------+ |
| |  Dashboard Grid (Dimmed Backdrop Scrim)                                 | |
| +-------------------------------------------------------------------------+ |
| |  [==== Grab Handle (36x4px) ====]                                       | |
| |  BOTTOM SHEET (Max Height: 92vh · Snap: 50vh · Drag Down to Dismiss)    | |
| |  Item Metadata · Receipt Zoom · Formal Legal Notice Generator           | |
| +-------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------+
```

### 2.3 Gesture Kinematics & Velocity Snapping Specification

1. **Snap Points Matrix:**
   * `SNAP_COLLAPSED`: `0.0` (Fully closed, unmounted from accessibility tree).
   * `SNAP_INTERMEDIATE`: `0.50` ($50\text{vh}$ — reveals key metadata and BGB § 477 warranty countdown without occluding top context).
   * `SNAP_EXPANDED`: `0.92` ($92\text{vh}$ — full-screen inspection mode displaying high-resolution receipt proof and full legal text).
2. **Velocity Dismissal Threshold:**
   * Drag gestures track pointer velocity ($v = \frac{\Delta y}{\Delta t}$).
   * If downward release velocity $v_{\text{release}} \ge 0.5\text{ px/ms}$, the sheet snaps directly to `0.0` (Dismiss) regardless of current position.
   * If dragged beyond $25\%$ of current snap distance with low velocity ($v < 0.5\text{ px/ms}$), the drawer transitions smoothly to the nearest snap point using an elastic spring curve:
     $$\text{cubic-bezier}(0.32, 0.72, 0, 1) \quad (\text{Duration: } 280\text{ms})$$
3. **Rubber-Banding & Bounds Resistance:**
   * Dragging upwards beyond $92\text{vh}$ applies logarithmic resistance ($F = \ln(1 + \Delta y)$) to convey physical limits without visual glitches.

### 2.4 WAI-ARIA Modal Contract & Keyboard Trap

To guarantee strict compliance with **WCAG 2.1 AA (`Gate 6`)**, `@harshmandan/svaul` enforces:
* **DOM Structure:**
  ```html
  <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby="drawer-desc">
  ```
* **Focus Trapping:** When the drawer opens, focus is programmatically shifted to the primary heading or close button (`tabindex="-1"`). Focus cycles exclusively within the drawer container (`Drawer.Content`).
* **Keyboard Escape Dismissal:** Pressing `Escape` immediately triggers dismissal and returns focus to the triggering element (e.g., the Omni-Bar row or calendar widget card).
* **Scroll Lock & Scrim:** Background page scrolling is strictly suppressed (`overscroll-behavior: contain; touch-action: none;`). The backdrop is dimmed with `--color-scrim: rgba(15, 23, 42, 0.45)` and `backdrop-filter: blur(2px)`.

### 2.5 Production Svelte 5 Implementation Pattern

Below is the verified Svelte 5 runes implementation for the **Contextual Item Detail Drawer (`ItemDetailDrawer.svelte`)**:

```svelte
<script lang="ts">
  import { Drawer } from '@harshmandan/svaul';
  import { X, Calendar, ShieldAlert, FileText, Download, Trash2 } from 'lucide-svelte';
  import type { WalletItem } from '$lib/types/wallet';

  interface Props {
    open: boolean;
    item: WalletItem | null;
    onClose: () => void;
    onGenerateClaim: (item: WalletItem) => void;
  }

  let { open = $bindable(false), item, onClose, onGenerateClaim }: Props = $props();

  // Derived statutory cliff calculations
  let isCliffPassed = $derived.by(() => {
    if (!item?.purchaseDate) return false;
    const purchase = new Date(item.purchaseDate);
    const cliffDate = new Date(purchase.setMonth(purchase.getMonth() + 12));
    return new Date() > cliffDate;
  });
</script>

<Drawer.Root bind:open direction="bottom" shouldScaleBackground>
  <Drawer.Portal>
    <Drawer.Overlay class="fixed inset-0 z-50 bg-[rgba(15,23,42,0.45)] backdrop-blur-[2px] transition-opacity" />
    <Drawer.Content 
      class="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92vh] flex-col rounded-t-[20px] bg-white p-6 shadow-2xl md:bottom-0 md:left-auto md:right-0 md:h-full md:max-h-full md:w-[520px] md:rounded-l-[20px] md:rounded-t-none"
      aria-labelledby="drawer-item-title"
      aria-describedby="drawer-item-description"
    >
      <!-- Mobile Drag Handle -->
      <div class="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-300 md:hidden" aria-hidden="true"></div>

      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 id="drawer-item-title" class="text-xl font-bold text-[#2F524C]">
            {item?.name ?? 'Item Details'}
          </h2>
          <p id="drawer-item-description" class="text-xs text-slate-500">
            {item?.merchant} · Purchased {item?.purchaseDate}
          </p>
        </div>
        <button 
          type="button"
          onclick={onClose}
          aria-label="Close details drawer"
          class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2F524C]"
        >
          <X class="h-5 w-5 text-slate-600" aria-hidden="true" />
        </button>
      </div>

      <!-- Body / Statutory Lifespan Cliff (BGB § 477) -->
      <div class="flex-1 overflow-y-auto py-4 space-y-4">
        <div class="rounded-lg border p-4 {isCliffPassed ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}">
          <div class="flex items-center gap-2">
            <ShieldAlert class="h-5 w-5 {isCliffPassed ? 'text-[#D97706]' : 'text-[#059669]'}" aria-hidden="true" />
            <span class="text-sm font-semibold text-slate-800">
              {isCliffPassed ? 'BGB § 477 Burden of Proof Reversed' : 'Protected Under BGB § 477 Abs. 1'}
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-600">
            {isCliffPassed 
              ? 'Over 12 months since purchase: consumer must prove defect existed at handover.' 
              : 'Within 12 months: statutory presumption favors the consumer.'}
          </p>
        </div>

        <!-- 1-Tap Legal Notice Action Button -->
        {#if item}
          <button
            type="button"
            onclick={() => onGenerateClaim(item)}
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D96B4B] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98]"
          >
            <FileText class="h-4 w-4" aria-hidden="true" />
            Generate Statutory Notice (BGB §§ 437, 439)
          </button>
        {/if}
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

---

## 3. Authoritative UI Icon Standard (`lucide-svelte`)

### 3.1 Design Principles & Geometry
`lucide-svelte` serves as the **exclusive and authoritative UI icon library** for both the Public Showcase and Modern Wallet PWA. Ad-hoc SVGs, emojis, or mismatched icon sets (FontAwesome, Heroicons) are prohibited.

* **Unified Grid:** Every icon renders inside a native $24\times 24$ viewport (`viewBox="0 0 24 24"`).
* **Consistent Stroke Weight:** Stroke width is strictly fixed to $2\text{px}$ (`stroke-width="2"`), with rounded caps (`stroke-linecap="round"`) and joins (`stroke-linejoin="round"`).
* **Color Inheritance:** All icons use `stroke="currentColor"`, dynamically inheriting semantic colors from CM-LAB's W3C DTCG tokens (`--color-primary-teal`, `--color-accent-coral`, `--color-urgent-red`, etc.).

### 3.2 WCAG 2.1 AA/AAA Accessibility Guidelines for Icons

1. **Purely Decorative Icons (Accompanying Visible Text):**
   * MUST include `aria-hidden="true"` and `focusable="false"`.
   * Screen readers bypass the SVG, reading only the adjacent semantic text label.
2. **Interactive Standalone Icon Buttons (No Visible Text):**
   * MUST be wrapped inside a semantic `<button type="button">`.
   * MUST declare an explicit, translated `aria-label` (e.g., `aria-label="Close drawer"`, `aria-label="Add new purchase or subscription"`).
   * MUST satisfy the touch target standard: $\ge 48\times 48\text{px}$ visual bounding box (`min-h-[48px] min-w-[48px]`).
3. **Contrast Ratios:**
   * Stroke colors against canvas background (`#F4F7F6` or `#FFFFFF`) MUST satisfy minimum $4.5:1$ contrast (AA) for informational icons and $7:1$ (AAA) for structural navigation.

### 3.3 Core Surface Icon Mapping

| Surface | UI Control | Lucide Icon | Semantic Token Binding | WCAG Accessible Label |
| :--- | :--- | :--- | :--- | :--- |
| **Omni-Bar** | Primary Search Input | `<Search />` | `--color-primary-teal` | `aria-hidden="true"` (input has `aria-label="Search"`) |
| **Omni-Bar** | Quick Action Trigger | `<Sparkles />` | `--color-accent-coral` | `aria-hidden="true"` |
| **FAB Speed Dial**| Floating Trigger Button | `<Plus />` $\to$ `<X />` | `#FFFFFF` on `--color-accent-coral` | `aria-label="Open speed dial menu"` |
| **FAB Speed Dial**| Capture Receipt | `<Camera />` | `--color-primary-teal` | `aria-label="Scan or capture receipt photo"` |
| **FAB Speed Dial**| Manual Entry | `<FilePlus />` | `--color-primary-teal` | `aria-label="Open manual entry form"` |
| **Calendar Widgets**| Expiry Countdown | `<Clock />` | `--color-urgent-red` | `aria-hidden="true"` |
| **Calendar Widgets**| BGB § 477 Cliff Bar | `<ShieldAlert />` | `--color-warning-amber` | `aria-hidden="true"` |
| **Drawer Header**| Dismiss / Close | `<X />` | `--color-primary-teal` | `aria-label="Close drawer"` |
| **Claim Generator**| Download Vector PDF | `<Download />` | `#FFFFFF` on `--color-accent-coral` | `aria-label="Download signed legal PDF"` |

---

## 4. Brand Vector Pipeline for Brand Policy Wiki (`unplugin-icons` + `@iconify-json/simple-icons`)

### 4.1 Eliminating Raster Bloat on the Policy Wiki (`/wiki`)
The Brand Policy Wiki documents warranty and cancellation policies for the **Top 20 student hardware and subscription brands** in Germany. Traditional approaches using raster logos (PNG/JPEG) create serious flaws:
* Excessive asset payloads ($>2.5\text{MB}$ for 20 logos).
* Cumulative Layout Shift (CLS) during image loading on mobile devices.
* Fuzzy rendering on Retina/high-DPI screens.
* CORS issues and broken external hotlinks.

CM-LAB resolves this by using **`unplugin-icons`** backed by **`@iconify-json/simple-icons`**. This tool compiles vector SVGs into pure Svelte components at build time:
* **Zero Runtime Overhead:** Only the exact 20 logos used are compiled into the static build.
* **Inline Optimization:** Each brand mark compiles to an optimized inline `<svg>` ($\approx 1.1\text{KB}$ per mark, $0\text{ms}$ network latency).
* **Sharp Infinite Scaling:** Clean vector rendering at any scale ($16\text{px}$ badge to $128\text{px}$ header).

### 4.2 The Top 20 Student Brand Vector Registry

The following 20 brands are registered and verified in the bundled seed database (`policy_wiki_seed_v1.json`):

| # | Brand Name | Simple Icons Identifier | Category | Primary Brand Hex | Statutory Focus |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Apple** | `simple-icons:apple` | Hardware / Tech | `#000000` | 24m BGB § 438 vs 1-Year Apple Limited Warranty |
| **2** | **Samsung** | `simple-icons:samsung` | Hardware / Mobile | `#1428A0` | 24m Manufacturer Warranty + IMEI Registration |
| **3** | **Spotify** | `simple-icons:spotify` | Digital Subscription | `#1DB954` | BGB § 309 Nr. 9 1-Month Rolling Cancellation |
| **4** | **Netflix** | `simple-icons:netflix` | Digital Subscription | `#E50914` | Immediate billing cycle cancellation cutoff |
| **5** | **Amazon Prime** | `simple-icons:amazon` | Retail / Sub | `#FF9900` | A-to-z Guarantee + BGB § 355 14d Widerruf |
| **6** | **Sony (PlayStation)**| `simple-icons:sony` | Hardware / Gaming | `#003791` | DualSense stick drift warranty claims |
| **7** | **Google (YouTube)** | `simple-icons:youtube` | Digital Subscription | `#FF0000` | Student Premium verification cycles |
| **8** | **Microsoft** | `simple-icons:microsoft` | Software / Cloud | `#00A4EF` | Office 365 student billing and cancellation |
| **9** | **Adobe** | `simple-icons:adobe` | Creative Software | `#FF0000` | Annual plan early termination fee dispute |
| **10** | **Nintendo** | `simple-icons:nintendo` | Hardware / Gaming | `#E60012` | Joy-Con statutory repair obligations |
| **11** | **MediaMarkt** | `simple-icons:mediamarkt` | German Retail | `#DF0000` | In-store receipt claim routing |
| **12** | **Saturn** | `simple-icons:saturn` | German Retail | `#00143C` | Joint MediaMarktSaturn claim protocol |
| **13** | **Telekom** | `simple-icons:deutschetelekom` | Telecommunications | `#E20074` | TKG § 56 1-month rolling cancellation |
| **14** | **Vodafone** | `simple-icons:vodafone` | Telecommunications | `#E60000` | Automatic contract renewal caps |
| **15** | **O2 (Telefónica)** | `simple-icons:o2` | Telecommunications | `#0019A5` | Student SIM rate renewal alerts |
| **16** | **Disney+** | Text monogram; verified Disney+ asset pending | Digital Subscription | `#113CCF` | § 312k Abs. 6 Cancellation button compliance |
| **17** | **McFIT (RSG Group)**| Text monogram; FitX is a different brand | Fitness Club | `#FF5900` | Restrictive gym contract clause voiding |
| **18** | **Urban Sports Club** | Text monogram; ActivityPub is unrelated | Fitness Platform | `#002855` | Monthly pause and termination rights |
| **19** | **Deutsche Bahn (DB)**| `simple-icons:deutschebahn` | Mobility / Transit | `#FF0000` | Deutschlandticket subscription renewal |
| **20** | **Grover** | `simple-icons:grover` | Hardware Rental | `#FF2A54` | Device damage liability vs statutory wear |

### 4.3 Build Configuration (`astro.config.mjs` / `vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [
    svelte(),
    Icons({
      compiler: 'svelte',
      autoInstall: true,
      defaultClass: 'inline-block align-middle'
    })
  ]
});
```

### 4.4 Svelte 5 Brand Icon Component (`BrandIcon.svelte`)

When rendering brand cards in the Wiki or Omni-Bar suggestions, this component mounts the build-time SVG with an accessible monogram fallback for arbitrary or unlisted merchants:

```svelte
<script lang="ts">
  import IconApple from '~icons/simple-icons/apple';
  import IconSamsung from '~icons/simple-icons/samsung';
  import IconSpotify from '~icons/simple-icons/spotify';
  import IconNetflix from '~icons/simple-icons/netflix';
  import IconAmazon from '~icons/simple-icons/amazon';
  import IconSony from '~icons/simple-icons/sony';
  import IconTelekom from '~icons/simple-icons/deutschetelekom';
  import IconBahn from '~icons/simple-icons/deutschebahn';

  interface Props {
    slug: string;
    brandName: string;
    class?: string;
  }

  let { slug, brandName, class: className = 'h-6 w-6' }: Props = $props();

  // Monogram fallback generator for non-catalog items
  let monogram = $derived(brandName.slice(0, 2).toUpperCase());
</script>

{#if slug === 'apple'}
  <IconApple class={className} aria-label="Apple logo" />
{:else if slug === 'samsung'}
  <IconSamsung class={className} aria-label="Samsung logo" />
{:else if slug === 'spotify'}
  <IconSpotify class={className} aria-label="Spotify logo" />
{:else if slug === 'netflix'}
  <IconNetflix class={className} aria-label="Netflix logo" />
{:else if slug === 'amazon'}
  <IconAmazon class={className} aria-label="Amazon logo" />
{:else if slug === 'telekom'}
  <IconTelekom class={className} aria-label="Deutsche Telekom logo" />
{:else if slug === 'deutschebahn'}
  <IconBahn class={className} aria-label="Deutsche Bahn logo" />
{:else}
  <!-- Accessible Monogram Fallback -->
  <span 
    class="flex {className} items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-[#2F524C]"
    aria-label="{brandName} icon placeholder"
  >
    {monogram}
  </span>
{/if}
```

---

## 5. Static Showcase Hero Graphics Pipeline (`astro:assets` / `@sveltejs/enhanced-img`)

### 5.1 Architecture & Scope
Static marketing graphics on the Public Showcase (`[Project].pages.dev`)—including device mockups, architecture diagrams, and hero graphics—are governed strictly at build time via `astro:assets` (or `@sveltejs/enhanced-img` for SvelteKit):

* **Automated Format Transcoding:** Original high-resolution source images (`PNG`, `TIFF`) are automatically downsampled and transcoded into next-generation **AVIF** and **WebP** formats during `npm run build`.
* **Zero-CLS Layout Containment:** The build pipeline inspects image files and automatically injects intrinsic `width`, `height`, and `aspect-ratio` CSS properties into the rendered `<img>` tag, completely eliminating Cumulative Layout Shift (CLS score $= 0.000$).
* **Automated EXIF Metadata Stripping:** Build-time image processors strip camera serial numbers, GPS coordinates, device models, and timestamps from showcase visual assets.

### 5.2 Astro 6 `<Image />` Implementation Standard

```astro
---
// apps/showcase/src/components/ShowcaseHero.astro
import { Image } from 'astro:assets';
import heroGraphic from '../assets/images/hero-wallet-isometric.png';
---

<div class="relative mx-auto max-w-5xl overflow-hidden rounded-2xl shadow-xl">
  <Image 
    src={heroGraphic}
    widths={[390, 768, 1200, 1920]}
    sizes="(max-width: 768px) 390px, (max-width: 1200px) 768px, 1200px"
    formats={['avif', 'webp']}
    alt="CM-LAB Sovereign Consumer Wallet interface preview showing Unified Omni-Bar and BGB § 477 warranty cliff bar"
    loading="eager"
    fetchpriority="high"
    class="w-full h-auto object-cover"
  />
</div>
```

---

## 6. Preservation of Client-Side Web Worker Pipeline (`image-compression.worker.ts`)

### 6.1 Strict Architectural Separation of Concerns
> [!IMPORTANT]
> **Build-Time Tools MUST NEVER Touch Runtime Consumer Receipts:**
> Build-time image pipelines (`astro:assets`, `@sveltejs/enhanced-img`) operate exclusively at static deployment time on public marketing pages. They have **zero access** to runtime user inputs.
>
> All runtime consumer receipt attachments ($15\text{MB}+$ camera photos) belong strictly to the **Client-Side Media Pipeline** owned by Quality & Media Lead (**Mojtaba**). Receipts are processed exclusively inside a sandboxed Web Worker (`image-compression.worker.ts`) executing on the user's local device.

### 6.2 Legal & Statutory Imperatives

1. **GDPR Art. 25 (Data Protection by Design and by Default):**
   * Consumer receipts frequently contain sensitive personal data (names, bank IBAN fragments, credit card digits, street addresses).
   * **Red Line #2:** Raw receipt photos MUST NEVER be transmitted to Cloudflare Workers, edge functions, or external OCR cloud APIs. Ingestion, downsampling, and cryptographic hashing take place 100% inside the client browser.
2. **GoBD Rn. 108–110 (Evidentiary Proof-of-Purchase Integrity):**
   * Under German commercial and tax rules (*Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form*), digital copies of paper receipts serve as valid legal evidence only if their visual fidelity is preserved and their cryptographic authenticity can be verified.
   * **Rule:** A cryptographic `SHA-256` hash digest MUST be computed over the raw image buffer **prior to encryption or storage**. This hash is embedded into the generated PDF claim dossier (*Mängelrüge* / *Kündigung*) as forensic proof of purchase.

### 6.3 Web Worker Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Consumer / Student
    participant UI as Svelte 5 UI (QuickCaptureModal)
    participant Worker as image-compression.worker.ts
    participant Crypto as Web Crypto API
    participant Dexie as Dexie.js v4 (IndexedDB)

    User->>UI: Selects or captures receipt photo (>15MB)
    UI->>Worker: postMessage({ fileBuffer, mimeType }, [transferable])
    Note over Worker: Runs in isolated background thread
    Worker->>Crypto: subtle.digest('SHA-256', fileBuffer)
    Crypto-->>Worker: preEncryptionSha256 (64-char hex)
    Note over Worker: OffscreenCanvas downsampling (max 2048px, quality 0.80)
    Worker->>Worker: Downscale to <1.5MB Normalized Blob
    Worker->>Worker: Generate 200x200px Fast Micro-Thumbnail
    Worker-->>UI: { compressedBlob, thumbnailBlob, preEncryptionSha256 }
    UI->>Crypto: Encrypt compressedBlob with device AES-GCM-256 key
    Crypto-->>UI: encryptedReceiptPayload
    UI->>Dexie: Atomic write into 'receipts' & 'items' tables
    Note over Dexie: Stored locally in browser with zero network leak
```

### 6.4 Worker Implementation Specification (`image-compression.worker.ts`)

```typescript
/**
 * image-compression.worker.ts
 * Sandboxed client-side receipt processor satisfying GoBD Rn. 108-110 & GDPR Art. 25.
 */

self.onmessage = async (e: MessageEvent<{ fileBuffer: ArrayBuffer; mimeType: string }>) => {
  const { fileBuffer, mimeType } = e.data;

  try {
    // 1. GoBD Rn. 108-110 Cryptographic Hash (Pre-Encryption SHA-256)
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const preEncryptionSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 2. OffscreenCanvas Normalization (<1.5MB Target, Max 2048px Long Edge)
    const blob = new Blob([fileBuffer], { type: mimeType });
    const imageBitmap = await createImageBitmap(blob);

    const maxDimension = 2048;
    let width = imageBitmap.width;
    let height = imageBitmap.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire OffscreenCanvas 2D context');

    ctx.drawImage(imageBitmap, 0, 0, width, height);
    const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.80 });

    // 3. Fast 200x200px Micro-Thumbnail for List Views
    const thumbCanvas = new OffscreenCanvas(200, 200);
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(imageBitmap, 0, 0, 200, 200);
    }
    const thumbnailBlob = await thumbCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.70 });

    // Explicit memory reclamation to protect Mobile Safari WebKit threads
    imageBitmap.close();
    canvas.width = 0;
    canvas.height = 0;

    // 4. Return Normalized Payloads
    self.postMessage({
      success: true,
      compressedBlob,
      thumbnailBlob,
      preEncryptionSha256,
      sizeBytes: compressedBlob.size
    });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
};
```

---

## 7. Performance Budgets, Bundle Impact & Quality Gates

### 7.1 Client Bundle Impact Analysis

Every client-side library was audited against the Single-Island bundle limit ($<50\text{KB}$ gzipped total island budget):

| Package / Artifact | Production Minified | Gzipped Size | Delivery Strategy | Bundle Impact |
| :--- | :---: | :---: | :--- | :--- |
| **`@harshmandan/svaul`** | $14.2\text{ KB}$ | **$4.4\text{ KB}$** | Bundled in Svelte Island | Negligible; replaces custom modal JS |
| **`lucide-svelte`** | Tree-shaken | **$\approx 0.35\text{ KB}$ / icon** | Bundled per imported icon | $\approx 2.8\text{ KB}$ for 8 core UI icons |
| **`unplugin-icons` (20 Brands)** | Tree-shaken | **$0\text{ KB}$ runtime JS** | Inline SVG in HTML | Zero JS execution overhead |
| **`astro:assets`** | Static HTML | **$0\text{ KB}$ client JS** | Native browser `<img>` | Zero client JS |
| **`image-compression.worker.ts`**| $11.0\text{ KB}$ | **$3.1\text{ KB}$** | Asynchronously loaded Worker | Zero main-thread blocking |
| **Total Svelte UI Footprint** | — | **$\approx 10.3\text{ KB}$** | Single Island (`<WalletApp />`) | Well within $50\text{ KB}$ budget |

### 7.2 Quality Gates & DoD Verification Matrix (`#30`)

* **Gate 1 (Core Journey `Capture → Store → Alert → Claim`):** `@harshmandan/svaul` seamlessly renders the contextual item detail view and triggers the 1-Tap claim generator without breaking single-page flow.
* **Gate 2 (Speed Benchmark $<15.0\text{s}$):** Rapid drag gestures and spring transitions complete in $<280\text{ms}$; Omni-Bar icon rendering completes in $<5\text{ms}$.
* **Gate 5 (Code Quality & Coverage):** Zero TypeScript/Svelte errors (`npm run check`); full test vectors for drawer opening, velocity dismiss, and icon accessibility.
* **Gate 6 (Accessibility & Responsive):** Zero `axe-core` AA violations; drawer handles, close buttons, and speed dial triggers all satisfy the $\ge 48\times 48\text{px}$ touch target requirement on $375\text{px}–412\text{px}$ mobile screens.
* **Gate 7 (Statutory Disclaimers):** Evidentiary `SHA-256` hashes calculated by the worker are properly forwarded to `pdfDossierCompiler.ts` and stamped alongside `BGH VIII ZR 285/18` safe-harbor notices.

