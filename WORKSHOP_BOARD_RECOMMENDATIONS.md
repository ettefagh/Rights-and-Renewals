# Workshop Board: Warranty, Subscription & Tax-Ready Wallet
**Workshop Canvas:** 4 Panels (Sharpen the Idea, Backlog & Criteria, Route + Risks, Commit & Governance)  
**Project:** Warranty & Subscription Wallet + Policy Wiki (MCP/API-Enabled)  
**Academic Institution:** SRH University of Applied Sciences — *Computer & Media Lab* (Instructor: Franziska Schwarz)  
**Active Course Milestone:** **Session 5 (MVP Development & Scope Control)**  
**Version:** 2.0 (Integrated Milestone 1 Specification)  
**Date:** October 2026  

---

# 1 / SHARPEN THE IDEA · 20 min

### A. Discovery and Technical Feedback Integration

Our product strategy is grounded in direct empirical evidence from 4 target user interviews and rigorous technical de-risking evaluated during architectural reviews:

1. **User Discovery & Interview Insights:**
   * **Person 1 (Laptop Screen Defect — Hardware & Receipt Loss):**
     * *Observation:* Experienced an intermittent laptop screen flickering defect 14 months after purchase. Spent days searching across multiple university and personal email inboxes, photo libraries, and physical paper folders, unable to locate the original invoice. Had zero awareness of the 2-year statutory warranty window under EU Directive (EU) 2019/771 transposed into German civil law (BGB §§ 437, 438, 439, 477 Abs. 1 [12-month reversed burden of proof / *Beweislastumkehr*], § 475e [suspension of expiry / *Ablaufhemmung*]) versus Apple's 1-year commercial guarantee.
     * *Strategic Takeaway:* Passive paper filing fails. The MVP must provide an instant, encrypted digital receipt vault paired with automated statutory and commercial expiration calculations.
   * **Person 2 (Phone Charger Failure — Action Paralysis & Obfuscated Fine Print):**
     * *Observation:* Snapped a photo of the receipt at purchase and stored it in the smartphone camera roll (buried under 15,000 photos). When the peripheral failed after 9 months, the user suffered complete *action paralysis*: did not know whether to contact the retailer (Saturn) or the manufacturer (Anker), was intimidated by corporate RMA portals, and let the claim lapse.
     * *Strategic Takeaway:* Photo storage alone does NOT solve consumer problems. Users face cognitive friction and legal intimidation. The app must bridge the gap from *storage* to *action* by automatically generating 1-tap statutory claim packages with embedded proof.
   * **Person 3 (Washing Machine Repair — Reminder Priority & Faded Paper):**
     * *Observation:* Kept a thermal paper bill in a kitchen drawer; after 18 months the chemical ink had faded into complete illegibility. Stated verbatim: *"I want reminders more than storage."* The user only realized a warranty had existed weeks after coverage had expired.
     * *Strategic Takeaway:* Proactive, multi-stage push alerts (dispatched at 30, 7, and 1 day prior to expiration/renewal) deliver far higher consumer value than a passive archive. Digital capture must preserve receipt evidence before thermal ink degrades.
   * **Person 4 (German Tax Organization Need — Werbungskosten / Einkommensteuererklärung):**
     * *Observation:* German university student and part-time employee (*Werkstudentin*) emphasized that organizing receipts throughout the calendar year is critical for the annual German income tax return (*Einkommensteuererklärung*). Tech equipment, laptops, second monitors, study literature, and software subscriptions (Adobe Creative Cloud, GitHub, Microsoft 365) qualify as income-related expenses (*Werbungskosten* under § 9 EStG) or *Sonderausgaben*, generating substantial tax refunds or tax loss carryforwards (*Verlustvortrag*). Furthermore, under the **BMF Guidance of 22.02.2022 (BStBl I 2022 S. 187)**, digital assets (computers, hardware, software) qualify for **1-year immediate 100% depreciation (*Sofortabschreibung*)**, superseding the historical €800 GWG ceiling. Receipts are routinely lost, forfeiting hundreds of euros in legitimate tax write-offs.
     * *Strategic Takeaway:* Incorporate a simple "Tax-Relevant / Werbungskosten" tag and structured export preparation into the manual entry flow. This connects daily purchase logging with high-value annual tax organization, pre-flagging items eligible for 1-year immediate write-off while initiating research into German tax compliance (GoBD immutability via client-side SHA-256 hash checks, WISO/Taxfix export formats).

2. **Technical Discipline & Architectural Feedback:**
   * **Manual-First MVP Discipline (Avoiding OCR Fragility & Vision Token Costs):**
     * *The Problem:* Automated OCR receipt scanning on mobile cameras is notoriously fragile when confronted with crumpled receipts, faded thermal paper, multi-item supermarket receipts, skewed angles, and low lighting. Crucially, over 95% of retail receipts do **not** print warranty duration—only purchase date, store name, item, and price. Furthermore, multimodal LLM vision APIs (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5) cost between **$0.02 and $0.15 per scan**, creating an unsustainable burn rate for a free consumer utility and inducing catastrophic onboarding churn when scanning fails.
     * *Adopted Solution:* Strictly enforce a structured **manual-first entry flow (<15 seconds)** with typeahead search for top student/popular brands. Receipt capture serves strictly as a **stored proof photo attachment** in a local encrypted vault. Warranty duration is auto-populated from our pre-seeded brand database. Automated AI/OCR receipt scanning is explicitly classified as a Won't-Have for MVP and deferred to post-MVP Phase 2 testing.
   * **Subscription Bleed & The Auto-Renewal Trap:**
     * *The Problem:* Major hardware purchases occur infrequently (1–3 times per year), resulting in steep drop-off if restricted to warranties alone. Conversely, university students and young households manage between 5 and 12 recurring digital subscriptions (Spotify, Netflix, Amazon Prime Student, Adobe CC, Gyms, cloud storage) and bleed €200–€500 annually on forgotten auto-renewals and obscure cancellation notice windows.
     * *Adopted Solution:* Unify physical warranties and recurring digital subscriptions in one single wallet dashboard under the identical 4-stage engine (Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Act). Enforce proactive renewal alerts (30, 7, and 1 day) and provide 1-tap statutory cancellation notices under the German Fair Consumer Contracts Act (*Gesetz für faire Verbraucherverträge*, § 309 Nr. 9 BGB) and the online cancellation button mandate (§ 312k BGB), including the immediate statutory right of termination without notice under **§ 312k Abs. 6 BGB (*fristloses Kündigungsrecht*)** if a merchant fails to provide a compliant cancellation button.
   * **AI Defensibility via the Policy Wiki & Model Context Protocol (MCP):**
     * *The Problem:* General conversational AI models (ChatGPT, Claude, Gemini) have short context windows, suffer from "lost-in-the-middle" recall degradation across 50-page legal terms, cannot monitor device deadlines over time, and frequently hallucinate statutory filing deadlines and legal section numbers ("Failure of Legal Warrant").
     * *Adopted Solution:* Warranty Wallet builds the defensible **Structured Ground-Truth Knowledge Graph** of verified warranty policies, statutory consumer rights (BGB §§ 437, 438, 439, 477 Abs. 1 [12-month reversed burden of proof / *Beweislastumkehr*], § 475e [suspension of expiry / *Ablaufhemmung*]; EU Directive (EU) 2019/771), cancellation notice periods, and direct RMA support endpoints. Beyond the mobile UI, this Policy Wiki is exposed via an open **Model Context Protocol (MCP)** server and REST API, establishing Warranty Wallet as the indispensable data layer that autonomous AI agents query to execute verified consumer admin without hallucinations.

---

### B. Revised Problem Statement, Useful Outcome & North Star Metrics

* **Revised Problem Statement:**
  > *"Consumers forfeit hundreds of euros every year because physical paper receipts fade into illegibility, digital purchase invoices are scattered and lost across disparate email accounts, and statutory warranty expirations and subscription auto-renewal deadlines pass completely unnoticed. Furthermore, consumers lack an organized, verifiable record of deductible receipts for annual German tax returns (Werbungskosten), and when an appliance breaks or a contract renews, manufacturer warranty procedures, cancellation windows, and statutory consumer rights are intentionally obscured by corporate dark patterns and complex legal fine print."*

* **Useful Outcome (Value Proposition):**
  > *"Warranty & Subscription Wallet enables users to manually log hardware purchases and recurring subscriptions in under 15 seconds with secure receipt photo attachments, eliminates missed deadlines through proactive 30-, 7-, and 1-day alerts, and generates legally compliant 1-tap claim dossiers and cancellation letters citing statutory German/EU consumer protection laws (BGB §§ 437, 438, 439, 477 Abs. 1 [12-month Beweislastumkehr], § 475e [Ablaufhemmung], § 309 Nr. 9, § 312k Abs. 6 [fristlose Kündigung] and EU Directive (EU) 2019/771). In addition, its curated Subscription & Warranty Policy Wiki provides an open Model Context Protocol (MCP) and REST API data layer that prevents autonomous AI agents from hallucinating on consumer legal rights."*

* **North Star Metrics:**
  1. **Primary Metric (Value Protected):** Cumulative Net Euro (€) Value Saved / Recovered per User (sum of repaired/replaced hardware under warranty claims + avoided unwanted subscription renewal charges + organized tax-deductible write-offs).
  2. **Efficiency & Onboarding Metric:** Median Manual Entry Time $\mathbf{<15\text{ seconds}}$ per item (from modal open to record saved with photo attachment).
  3. **Dispute Resolution Metric:** $\mathbf{\ge 90\%}$ Acceptance Rate of generated 1-tap claim and cancellation packages without procedural rejection by retailers/service providers.
  4. **Retention Metric:** $\mathbf{\ge 40\%}$ 30-Day Retention Rate driven by recurring monthly subscription renewal tracking.

---

### C. Three Core MVP Features & Explicit Exclusions

Adhering strictly to the official "Computer & Media Lab" course definition of an MVP—**the smallest useful version of the product, 4–6 meaningful views, 3 core features, and at least two purposeful media formats**—the MVP encompasses:

```
+---------------------------------------------------------------------------------------------------+
|                                     THREE CORE MVP FEATURES                                       |
+-------------------------------+-----------------------------------+-------------------------------+
|    1. QUICK MANUAL LOG &      |       2. DUAL EXPIRY &            |   3. 1-TAP CLAIM & CANCEL     |
|    PHOTO ATTACHMENT VAULT     |          RENEWAL ALERTS           |      ACTION GENERATOR         |
|       [CAPTURE & STORE]       |              [ALERT]              |         [CLAIM / ACT]         |
+-------------------------------+-----------------------------------+-------------------------------+
| * Fast 3-field entry (<15s)   | * Unified product & sub cards     | * 1-tap statutory claim draft |
| * Photo attachment vault      | * Urgency countdown badges        | * 1-tap cancellation notice   |
| * Tax-relevant tag (Germany)  | * 30, 7, 1-day push notifications | * Direct RMA & support links  |
| * Top student brand defaults  | * Auto-renewal calendar warnings  | * Auto-attached receipt proof |
+-------------------------------+-----------------------------------+-------------------------------+
|                       PLATFORM ASSET: POLICY WIKI & MCP / API INTERFACE                           |
|  Pre-structured warranty & subscription terms (cancellation windows, refund policies, legal rights)|
|  Exposed via Model Context Protocol (MCP) & API for autonomous AI agents & third-party services.  |
+---------------------------------------------------------------------------------------------------+
```

#### The 3 Core MVP Features
1. **Core Feature 1: Quick Manual Log & Photo Attachment Vault (Capture & Store)**
   * **Structured 3-Field Entry (<15s):** Fast, frictionless input (Item/Service Name, Category [Hardware / Subscription], Purchase/Start Date, Price) with instant typeahead auto-complete for top student/popular brands (Apple, Samsung, Sony, Spotify, Netflix, Adobe). Automatically auto-fills statutory and commercial warranty durations.
   * **Secure Photo Attachment Vault:** Receipt camera capture or gallery picker functions strictly as an attached, encrypted visual proof file (JPEG/PNG, compressed <1.5MB). Zero OCR blocking or dependency—the record is saved instantly with guaranteed 100% data fidelity and full offline persistence.
   * **German Tax-Relevant Tagging & 1-Year Depreciation:** Simple toggle to flag study- or work-related expenses (*Werbungskosten* under § 9 EStG), identifying digital equipment (laptops, software, displays) eligible for 1-year 100% immediate depreciation (*Sofortabschreibung*) under BMF Guidance of 22.02.2022 (BStBl I S. 187), while anchoring receipt photos with client-side SHA-256 cryptographic hashes for GoBD immutability compliance.
2. **Core Feature 2: Dual Expiry & Auto-Renewal Alerts (Alert)**
   * **Unified Wallet Dashboard:** Chronological tracking of hardware warranty expirations alongside recurring subscription billing/renewal dates.
   * **Proactive Notification Engine:** Automated local push alerts dispatched deterministically at **30 days, 7 days, and 1 day** before warranty expiration or subscription renewal (e.g., *"Your Spotify Student subscription renews in 7 days. Tap to review terms or cancel"*).
   * **Visual Urgency Countdown Badges:** High-contrast status badges (`Expires in 5 days!`, `Renews tomorrow`) color-coded by urgency (Green: >30d, Amber: 8–30d, Red: $\le$7d, Grey: Expired).
3. **Core Feature 3: 1-Tap Claim & Cancellation Action Generator (Claim / Act)**
   * **Statutory Warranty Claim Dossier:** Generates a formal, legally grounded notice of defect (*Mängelrüge*) citing statutory consumer non-conformity rights under German civil law (BGB §§ 437, 438, 439; EU Directive (EU) 2019/771). Automatically incorporates the statutory reversed burden-of-proof presumption under **§ 477 Abs. 1 BGB** (presumption of defect at delivery if reported within 12 months) and invokes the 4-month suspension of expiry (**§ 475e Abs. 1 BGB *Ablaufhemmung***) if the defect manifested near the end of the 2-year limitation window.
   * **1-Tap Subscription Cancellation Notice:** Formats a formal termination letter (*Kündigungsschreiben*) under the German Fair Consumer Contracts Act (§ 309 Nr. 9 BGB) and the online cancellation button mandate (§ 312k BGB). If the service provider fails to offer a compliant online cancellation button and confirmation page, the generator explicitly invokes **§ 312k Abs. 6 BGB** granting the consumer an immediate statutory right of termination without notice (**fristloses Kündigungsrecht**), with direct deep-links to verified provider cancellation portals.
   * **Automated Evidence Bundling:** Merges customer details, device serial number, defect description, and the attached high-resolution receipt photo into a ready-to-file package.

#### Platform Asset: Subscription & Warranty Policy Wiki with MCP / API Interface
* **Curated Ground-Truth Policy Database:** Standardized repository compiling verified statutory warranty terms (BGB §§ 437, 438, 439, 477 Abs. 1), statutory 14-day cooling-off revocation rights (§ 312g BGB), commercial guarantee conditions, and subscription cancellation notice windows (§ 309 Nr. 9, § 312k BGB) with direct escalation URLs. Initial focus: Top 20 popular/student services (Spotify, Netflix, Amazon Prime Student, Adobe Creative Cloud, Gyms like McFit/FitX, AppleCare).
* **Model Context Protocol (MCP) Server Endpoint (JSON-RPC 2.0):** Standardized MCP server interface enabling autonomous AI agents (in Claude Desktop, Gemini CLI, or custom multi-agent systems) to query verified legal ground-truth and programmatically compile dispute dossiers without hallucination. All tools implement typed Zod and JSON Schema (Draft-07) specifications over `tools/list` and `tools/call`:

```json
{
  "tools": [
    {
      "name": "policy_lookup",
      "description": "Retrieves verified statutory warranty terms (BGB §§ 437, 438, 477 Abs. 1), statutory cooling-off rights (§ 312g BGB), and subscription cancellation rules (§ 309 Nr. 9, § 312k BGB) for a specific merchant, brand, or service provider in the curated Policy Wiki knowledge graph.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "service_slug": {
            "type": "string",
            "description": "Standardized lowercase identifier for the brand, merchant, or service provider (e.g., 'apple', 'spotify', 'netflix', 'mediamarkt', 'amazon-prime', 'fitx', 'adobe')."
          },
          "category": {
            "type": "string",
            "enum": ["hardware", "subscription"],
            "description": "Category distinguishing physical product warranty terms from recurring digital subscription policies."
          },
          "jurisdiction": {
            "type": "string",
            "enum": ["DE", "EU"],
            "default": "DE",
            "description": "Target legal jurisdiction governing statutory rights (default: 'DE' for German BGB)."
          },
          "issue_type": {
            "type": "string",
            "enum": ["statutory_warranty", "commercial_guarantee", "cancellation_window", "cooling_off_period"],
            "description": "Specific policy domain to query. If omitted, returns all applicable policies for the entity."
          }
        },
        "required": ["service_slug", "category"],
        "additionalProperties": false
      }
    },
    {
      "name": "claim_dossier_generate",
      "description": "Drafts a legally grounded statutory notice of defect (Mängelrüge gem. §§ 437, 439, 477 Abs. 1 BGB) or formal subscription termination letter (Kündigung gem. § 309 Nr. 9, § 312k BGB) with structured evidence placeholders, statutory citations, and merchant escalation details.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "service_slug": {
            "type": "string",
            "description": "Standardized lowercase identifier of the merchant, manufacturer, or subscription provider (e.g., 'apple', 'mediamarkt', 'spotify', 'adobe')."
          },
          "category": {
            "type": "string",
            "enum": ["hardware", "subscription"],
            "description": "Distinguishes between a hardware warranty defect claim and a subscription cancellation notice."
          },
          "jurisdiction": {
            "type": "string",
            "enum": ["DE", "EU"],
            "default": "DE",
            "description": "Target legal jurisdiction governing dispute citations (default: 'DE')."
          },
          "issue_type": {
            "type": "string",
            "enum": ["statutory_defect_claim", "contract_cancellation", "cooling_off_revocation"],
            "description": "Type of formal legal notice to compile."
          },
          "item_name": {
            "type": "string",
            "description": "Full commercial product or plan name (e.g., 'Sony WH-1000XM4 Wireless Headphones', 'Spotify Premium Student Plan')."
          },
          "purchase_date": {
            "type": "string",
            "format": "date",
            "description": "ISO 8601 purchase date or contract commencement date (YYYY-MM-DD). Determines applicability of the 12-month reversed burden of proof under § 477 Abs. 1 BGB."
          },
          "defect_description": {
            "type": "string",
            "description": "Factual description of the hardware defect or specific grounds for contract cancellation."
          },
          "contract_or_serial_number": {
            "type": "string",
            "description": "Hardware serial number, IMEI, customer reference ID, or subscription contract number."
          },
          "has_proof_of_purchase": {
            "type": "boolean",
            "default": false,
            "description": "Indicates whether authentic proof of purchase (receipt, invoice, or bank statement) is attached to the dispute dossier."
          },
          "proof_type": {
            "type": "string",
            "enum": ["receipt_photo", "bank_statement", "order_confirmation", "none"],
            "default": "none",
            "description": "Type of evidentiary proof attached under German civil evidentiary standards (Kassenbon, Kontoauszug, or Bestellbestätigung)."
          }
        },
        "required": [
          "service_slug",
          "category",
          "jurisdiction",
          "issue_type",
          "item_name",
          "purchase_date",
          "defect_description"
        ],
        "additionalProperties": false
      }
    }
  ]
}
```

* **JSON-RPC 2.0 Transport Example (`tools/call` for `policy_lookup`):**
```json
// Request:
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "policy_lookup",
    "arguments": {
      "service_slug": "spotify",
      "category": "subscription",
      "jurisdiction": "DE",
      "issue_type": "cancellation_window"
    }
  }
}

// Response:
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"entity\": \"Spotify\",\n  \"plan\": \"Premium Student\",\n  \"billing_cycle\": \"monthly\",\n  \"notice_period\": \"1 month to billing cycle end (§ 309 Nr. 9 BGB)\",\n  \"cooling_off_days\": 14,\n  \"cooling_off_statute\": \"§ 312g BGB\",\n  \"cancellation_button_url\": \"https://www.spotify.com/account/subscription/cancel/\",\n  \"non_compliance_remedy\": \"Immediate cancellation without notice pursuant to § 312k Abs. 6 BGB if online cancellation button is absent or obstructed.\"\n}"
      }
    ]
  }
}
```

#### The 4–6 Meaningful Views (Course Requirement: 5 Core User Views + 1 Platform Tool)
1. **View 1: Unified Wallet Dashboard (Timeline View)** — Chronological card feed displaying active hardware warranties and recurring subscriptions, category filter toggles, search bar, and dynamic color-coded urgency countdown badges.
2. **View 2: Quick Capture Modal / View** — Streamlined manual entry form (<15s) with curated brand typeahead, category selector, purchase/renewal date picker, billing cycle, and German tax-deductible toggle (`isTaxDeductible`).
3. **View 3: Item Detail & Receipt Vault View** — Comprehensive product/subscription profile combining statutory (§§ 437, 477 BGB) vs. commercial guarantee coverage timelines, direct vendor support links, and an integrated high-contrast receipt photo viewer with offline pinch-to-zoom inspection.
4. **View 4: 1-Tap Claim & Cancellation Action View** — Step-by-step interactive legal notice generator rendering pre-drafted statutory defect notices (§ 477 Abs. 1 BGB) or termination letters (§ 312k Abs. 6 BGB), editable text fields, receipt proof preview, and 1-tap PDF / plaintext export options.
5. **View 5: Subscriptions & Tax Summary View** — Dedicated analytics and tracking screen displaying recurring monthly/annual spend, renewal calendar schedule, and a filtered *Werbungskosten* tax export table (§ 9 EStG / BMF 2022 Sofortabschreibung) with CSV export.
6. **Platform Tool (View 6): Policy Wiki Directory & MCP Endpoint Explorer** — Developer and administrative interface providing a searchable directory of pre-seeded brand terms and an interactive testing console for JSON-RPC Model Context Protocol (MCP) endpoints (`policy_lookup`, `claim_dossier_generate`).

#### The Two Purposeful Media Formats (Course Requirement)
* **Media Format 1 (Input/Vault Asset): User-Captured Receipt Image** — High-contrast image (JPEG/PNG) captured via mobile camera or gallery picker, compressed client-side (<1.5MB) and encrypted locally, serving as authentic proof of purchase without OCR intervention.
* **Media Format 2 (Output/Action Asset): System-Generated Statutory Claim & Cancellation PDF/Text Package** — Formally formatted PDF document and structured plain-text dossier containing formal legal notices, statutory citations (BGB §§ 437, 439, 477 Abs. 1, 475e, 309 Nr. 9, 312k Abs. 6; EU Directive (EU) 2019/771), defect statements, and the embedded receipt image thumbnail, formatted for direct submission to retailers, manufacturers, or service providers.

#### Explicit Out-of-Scope Exclusions (Discipline Rule: *"Hold core features until they work end to end"*)
1. **Automated AI/OCR Receipt Scanning:** Strictly excluded from MVP; user inputs data manually. OCR text extraction will be researched and benchmarked post-MVP in Phase 2 once the core claim loop is validated.
2. **Automated Tax Filing & Direct Calculation (ELSTER API):** Direct tax computation and transmission via the German tax office (ELSTER/ERiC) are excluded due to regulatory compliance under the German Tax Advisory Act (*Steuerberatungsgesetz*). We provide receipt tagging and export preparation only.
3. **Open Banking & Bank Account Scraping (Plaid / Tink / FinAPI):** Excluded to eliminate banking compliance overhead (PSD2, BaFin), credential storage security risks, and third-party API instability.
4. **Second-Hand Resale Marketplace & Retailer B2B Portals:** Excluded to maintain 100% focus on consumer purchase protection and subscription management.

---

### D. Sticky Note: "We will change this because..."

> **"We will change our initial product scope to: (1) user manual input first with receipt capture serving solely as an attachment proof vault, (2) adding subscription tracking alongside warranties backed by an MCP-enabled Policy Wiki, and (3) initiating tax-receipt research (Germany), BECAUSE:**
> 
> 1. **Data Entry Reliability:** OCR on crumpled, skewed, or faded receipts suffers from high failure rates and burns expensive AI vision tokens ($0.02–$0.15/scan). Fast manual entry (<15s) with photo backup guarantees 100% data fidelity, zero token cost, and sub-15s onboarding. OCR is isolated as a post-MVP test spike.
> 2. **Continuous Subscription Engagement:** Hardware warranties are logged only 1–3 times per year, whereas subscriptions renew monthly. Adding subscription tracking and cancellation tools prevents auto-renewal traps year-round and maintains continuous weekly user retention.
> 3. **AI Defensibility via MCP/API:** General AI models have short context windows, static training data, and hallucinate legal deadlines and statutory terms. By exposing our verified Policy Wiki via the Model Context Protocol (MCP) and REST API, Warranty Wallet becomes the indispensable, real-time ground-truth data layer for AI agents.
> 4. **German Tax Organization Need (Werbungskosten & BMF 2022 1-Year Depreciation):** User discovery revealed that organizing receipts for the annual German tax return is a major pain point for students and young professionals. Leveraging the BMF Guidance of 22.02.2022 allowing 1-year 100% immediate depreciation (*Sofortabschreibung*) of digital equipment under § 9 EStG delivers immediate financial value, while adhering to GoBD immutability principles and deferring complex ELSTER filing."

#### Detailed Justification of the 4 Rationale Pillars
* **Pillar 1: Data Entry Reliability (Manual-First <15s vs. Unreliable OCR):**
  Unbounded OCR receipt scanning is fraught with edge-case vulnerabilities: faded thermal paper, wrinkled receipts, complex multi-line grocery invoices, low-contrast smartphone photos, and multi-currency formats. Crucially, receipts do not print warranty duration. Forcing users through an OCR scan that misreads dates and misses warranty durations creates severe onboarding friction and burns costly multimodal vision tokens ($0.02–$0.15/scan). The manual-first architecture requires only 3 fields (Brand, Item Name, Purchase Date), completed in <15 seconds, while the receipt photo is archived securely as uncompromised proof.
* **Pillar 2: Continuous Subscription Engagement (Preventing Auto-Renewal Traps):**
  Hardware products have a very low purchase frequency (1–3 times a year per consumer), resulting in steep drop-off after initial logging. In contrast, university students and young households manage 5 to 12 recurring subscriptions (Spotify, Netflix, Prime Student, Adobe, gym memberships, software trials). Unifying digital subscriptions with physical warranties under the exact same 4-stage pipeline (Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Act) solves the user retention deficit, elevates weekly active usage, and shields consumers from deceptive cancellation dark patterns and unexpected auto-renewal fees.
* **Pillar 3: AI Defensibility via MCP (Structured Ground-Truth Knowledge Base):**
  General AI models (ChatGPT, Claude, Gemini) cannot independently replace Warranty Wallet because they suffer from context window degradation ("lost-in-the-middle" recall drop across long legal PDFs), lack proactive background timers, and frequently fabricate statutory deadlines or section numbers ("Failure of Legal Warrant"). By compiling a structured, queryable knowledge graph of verified brand warranty terms and subscription cancellation rules and exposing it via the open Model Context Protocol (MCP), Warranty Wallet turns general AI models from competitors into consumers of our data layer.
* **Pillar 4: German Tax Organization Need (Werbungskosten Deductions & BMF 2022 Sofortabschreibung):**
  In Germany, university students (especially in secondary degree programs / *Zweitstudium* or *Master*) and working students (*Werkstudenten*) can deduct education- and work-related hardware, software, and study expenses from their taxable income as *Werbungskosten* (under § 9 EStG), often resulting in substantial tax refunds or tax loss carryforwards (*Verlustvortrag*). Crucially, under the updated **BMF Guidance of 22.02.2022 (BStBl I 2022 S. 187)**, digital assets (computers, notebooks, tablets, monitors, and software) qualify for a standard useful life of **1 year**, allowing **100% immediate depreciation (*Sofortabschreibung*)** in the acquisition year without being capped by the €800 GWG limit. Enabling users to flag receipts as "Tax-Relevant / Werbungskosten" during manual entry satisfies an acute administrative need. Furthermore, digital receipts are hashed (SHA-256) locally to respect GoBD immutability standards (*Unveränderbarkeit* gem. GoBD Rn. 108–110). To prevent regulatory liability, the application operates strictly within automated legal tech document assembly boundaries (**BGH VIII ZR 285/18**) and displays clear disclaimers that it does not provide individual legal representation under §§ 2, 3 RDG or tax advice under § 2 StBerG.

---

# 2 / BACKLOG · 25 min

### A. MoSCoW Prioritized Sprint Backlog

* **Official Team Roles (SRH Computer & Media Lab — Slide 28):**
  * **Member A (Project Manager):** Sprint planning, velocity tracking, board governance, stakeholder reporting.
  * **Member B (UX/UI Lead):** User journey, UI wireframes, design systems, accessibility, mobile responsiveness.
  * **Member C (Product / Research Lead & Policy Wiki):** User needs, brand/subscription policy curation, German tax research.
  * **Member D (Development & Quality/Media Lead):** Full-stack implementation, automated testing, media assets, claim documentation.

| # | User Story Title & Narrative | MoSCoW Priority | SP | Est. Hours | Assigned Owner | Supporting Role |
| :-: | :--- | :---: | :-: | :-: | :--- | :--- |
| **1** | **Manual Warranty & Sub Entry:**<br>As a user, I want to manually enter hardware or subscription details with smart autocomplete defaults in <15s, so that I can reliably track my renewal and warranty deadlines without OCR friction. | **Must-Have** | **5** | 16h | **Member B** *(UX/UI Lead)* | Member D *(Dev)* |
| **2** | **Receipt Attachment Vault:**<br>As a user, I want to attach and store receipt photos securely offline, so that I have digital proof of purchase ready for claims or tax records with zero OCR blocking. | **Must-Have** | **5** | 16h | **Member D** *(Dev & Quality/Media)* | Member B *(UX/UI)* |
| **3** | **Dual Expiry & Renewal Reminders:**<br>As a user, I want proactive alerts at 30, 7, and 1 day before warranties expire or subscriptions renew, so that I never miss cancellation deadlines or return windows. | **Must-Have** | **5** | 16h | **Member D** *(Dev & Quality/Media)* | Member A *(PM)* |
| **4** | **Unified Overview & Urgency Status Badges:**<br>As a user, I want a unified chronological dashboard across 4–6 meaningful views with color-coded urgency status badges, so that I can immediately identify expiring items. | **Must-Have** | **3** | 10h | **Member B** *(UX/UI Lead)* | Member D *(Dev)* |
| **5** | **1-Tap Claim & Cancellation Generator:**<br>As a user, I want to generate a formal statutory warranty claim (citing BGB §§ 437, 439, 477 Abs. 1, 475e / EU Directive 2019/771) or cancellation notice (citing § 309 Nr. 9, § 312k Abs. 6 BGB) with attached receipts in one tap, so that I can enforce consumer rights without legal expertise. | **Must-Have** | **5** | 18h | **Member D** *(Dev Lead, 10h)* &<br>**Member C** *(Policy/Legal, 8h)* | Member B *(UX/UI)* |
| **6** | **Subscription & Warranty Policy Wiki:**<br>As a user, I want a curated database of cancellation notice rules, cooling-off periods, and warranty terms for top student/popular services (Spotify, Prime, Netflix, Gyms, Adobe), so that I know my rights without digging through fine print. | **Should-Have** | **5** | 18h | **Member C** *(Product / Research Lead)* | Member D *(Dev)* |
| **7** | **MCP / API Interface for AI Agents:**<br>As a developer/AI agent, I want to query the Policy Wiki and trigger claim dossier generation via standardized Model Context Protocol (MCP) tools (`policy_lookup`, `claim_dossier_generate`) over JSON-RPC 2.0, so that autonomous AI agents can retrieve verified ground-truth policy rules and programmatically draft dispute packages. | **Should-Have** | **5** | 16h | **Member D** *(Dev & Quality/Media)* | Member A *(PM)* |
| **8** | **German Tax-Relevant Tagging & Export:**<br>As a German student/taxpayer, I want to tag eligible items with *Werbungskosten* tax categories and export an organized PDF/CSV summary, so that I have clean documentation for my annual Einkommensteuererklärung. | **Could-Have** | **3** | 10h | **Member C** *(Product / Research Lead)* | Member D *(Dev)* |
| **9** | **Automated OCR Receipt Scan:**<br>As a user, I want the app to automatically extract merchant, date, and amount from receipt photos using AI vision/OCR. | **Won't-Have (MVP)**<br>*(Deferred to Phase 2)* | **13** | 45h | **Member D** *(Dev & Quality/Media)* | Member C *(Product)* |

#### Sprint Capacity & Story Point Totals:
* **Must-Have Core Total (Session 5 Active Milestone Focus):** **23 Story Points | 76h Direct Story Implementation (92h Total Team Sprint Capacity)**
  * **Direct User Story Implementation Budget (76 Hours — Matches Backlog Table):**
    * *Member B (UX/UI Lead):* **26h** (Story 1: 16h manual entry & brand autocomplete UI, Story 4: 10h dashboard views & urgency status badges).
    * *Member C (Product / Research Lead):* **8h** (Story 5: statutory legal notice authoring, BGB citations §§ 437, 439, 477 Abs. 1, 475e, 309 Nr. 9, 312k Abs. 6, and policy dispute templates).
    * *Member D (Dev & Quality/Media Lead):* **42h** (Story 2: 16h receipt vault & encrypted storage, Story 3: 16h notification alarm scheduler, Story 5: 10h client-side PDF renderer & plaintext fallback).
    * *Subtotal Direct Story Implementation:* $26\text{h} + 8\text{h} + 42\text{h} = \mathbf{76\text{ Hours}}$ (exactly equals the sum of Stories 1–5 in the backlog table).
  * **Cross-Functional Sprint Support & Governance Budget (16 Hours Overhead):**
    * *Member A (Project Manager):* **10h** (MoSCoW sprint planning, GitHub 5-column board tracking, daily standup syncs, Definition of Done verification).
    * *Member C (Product / Research Lead):* **6h** (Policy Wiki top student brands seed curation, German tax § 9 EStG research brief, legal advisor consultation prep).
    * *Subtotal Sprint Overhead & Governance:* $10\text{h} + 6\text{h} = \mathbf{16\text{ Hours}}$.
  * **Total Team Sprint Commitment Reconciliation ($\mathbf{76\text{h Story Execution} + 16\text{h Overhead} = 92\text{ Total Team Hours}}$):**
    * *Member A (Project Manager):* **10h** ($10.9\%$ of total team effort)
    * *Member B (UX/UI Lead):* **26h** ($28.3\%$ of total team effort)
    * *Member C (Product / Research Lead):* **14h** ($15.2\%$ of total team effort: 8h Story 5 statutory notices + 6h research overhead)
    * *Member D (Development & Quality/Media Lead):* **42h** ($45.7\%$ of total team effort: 16h Story 2 + 16h Story 3 + 10h Story 5 engine)
    * *Team Sprint Total:* $10\text{h} + 26\text{h} + 14\text{h} + 42\text{h} = \mathbf{92\text{ Hours}}$ ($\sum = 100.0\%$).
* **Should-Have Total:** 10 Story Points (~34 Hours) — Scheduled for Session 6.
* **Could-Have Total:** 3 Story Points (~10 Hours) — Scheduled for Session 7.
* **Won't-Have Total:** 13 Story Points (~45 Hours) — Isolated post-MVP test spike.
* **Total Product Backlog:** **49 Story Points (~165 Story Hours direct / 181 Total Hours including Session 5 overhead)**.

---

### B. Complete Given/When/Then Acceptance Criteria for Must-Haves

#### Story 1: Manual Warranty & Subscription Entry (<15s Structured Flow)
* **Scenario 1.1: Standard Manual Entry Flow (<15s Benchmark)**
  * **Given** the user is on the main dashboard and taps "Add Item",
  * **When** the user enters an item name (e.g., "Sony Headphones"), selects category "Hardware", picks a purchase date, and taps "Save",
  * **Then** the record is created in local storage in <200ms, statutory warranty expiration is automatically set to 24 months from purchase, and the user returns to the dashboard in under 15 seconds total interaction time.
* **Scenario 1.2: Typeahead Autocomplete with Pre-Seeded Student/Popular Defaults**
  * **Given** the user is on the manual entry form,
  * **When** the user types at least 3 characters into the item name field matching a curated brand/service (e.g., "Spo" for "Spotify Premium Student"),
  * **Then** a dropdown suggests the matching template, and upon selection, automatically pre-populates category ("Subscription"), billing cycle ("Monthly"), trial/notice window ("1 month / cancel anytime"), and statutory cooling-off period ("14 days").
* **Scenario 1.3: Edge Case — Missing Mandatory Fields & Form Validation**
  * **Given** the user opens the "Add Item" form,
  * **When** the user attempts to tap "Save" without providing an item name or purchase date,
  * **Then** the form prevents submission, highlights missing fields with accessible high-contrast error styling, and displays inline validation messages ("Item name and date are required") without clearing valid inputs.
* **Scenario 1.4: Edge Case — Future Purchase Date Rejection**
  * **Given** the user selects a purchase date from the date picker,
  * **When** the selected date is in the future relative to the device clock,
  * **Then** the form displays an inline error: "Purchase date cannot be in the future (for upcoming renewals, please set as Subscription Start/Renewal Date)", preventing corrupt warranty calculations.
* **Scenario 1.5: Tax-Relevant / Werbungskosten Toggle Flagging (`isTaxDeductible`)**
  * **Given** the user is logging an item in the Quick Capture modal (View 2) that qualifies as a deductible education- or work-related expense (e.g., "ThinkPad Laptop" or "JetBrains All Products Pack"),
  * **When** the user switches the "Tax-Relevant / Werbungskosten" toggle to active (`isTaxDeductible: true`),
  * **Then** the form dynamically displays an optional tax category selector (defaulting to "Arbeitsmittel / Digital Work Equipment" pursuant to § 9 EStG), and upon tapping "Save", the item entity is persisted in local storage with `isTaxDeductible: true` and `taxCategory: "Arbeitsmittel"`, a high-contrast tax indicator pill ("Werbungskosten") is rendered on the item card in View 1, and the record is immediately indexed for the Subscriptions & Tax Summary export view (View 5) without initiating automated ELSTER filing.
* **Scenario 1.6: Edge Case — Custom Non-Standard Warranty Duration**
  * **Given** the user purchased an item with an extended 3-year commercial warranty or 6-month refurbished guarantee,
  * **When** the user toggles "Custom Duration" and enters "36 months",
  * **Then** the app overrides the default statutory duration, sets the expiry date to exactly 36 months from purchase date, and stores the custom terms without breaking the alert calculation.

#### Story 2: Receipt Attachment Vault (Photo Proof Stored Securely without OCR Dependency)
* **Scenario 2.1: Camera Capture & Local Photo Attachment**
  * **Given** the user is creating or editing an item in the wallet,
  * **When** the user taps "Attach Receipt Photo" and captures an image via the device camera or selects an existing photo from the photo gallery,
  * **Then** the image is compressed client-side to <1.5MB (JPEG/WebP, max 2048px on longest edge), a local thumbnail is rendered in the form within 500ms, and the file is saved to the app's sandboxed local storage without initiating any OCR processing or blocking the save flow.
* **Scenario 2.2: Offline Receipt Viewing & Pinch-to-Zoom Inspection**
  * **Given** an item has an attached receipt stored in the local vault,
  * **When** the user views the item detail screen while the device is offline and taps the receipt thumbnail,
  * **Then** the photo opens in an edge-to-edge modal viewer supporting smooth double-tap and pinch-to-zoom gestures, displaying full legibility of invoice date, serial number, and store line items.
* **Scenario 2.3: Edge Case — Oversized File or Corrupted Image Upload**
  * **Given** the user attempts to upload a high-resolution raw camera image or PDF exceeding 15MB,
  * **When** the file is selected via the file picker,
  * **Then** the client-side media processor automatically downsamples and compresses the image to under 1.5MB; if the file is corrupted or an unsupported format (e.g., .exe, .zip), the app displays a clear toast notification: "Unsupported file format. Please upload a JPG, PNG, or PDF invoice", without crashing.
* **Scenario 2.4: Edge Case — Web/PWA Camera Permission Rejection & HTML5 File Capture Fallback**
  * **Given** the user is running the application in a mobile web browser or progressive web app (PWA) environment where native WebRTC camera permissions (`navigator.mediaDevices.getUserMedia`) are denied, blocked, or unsupported,
  * **When** the user taps "Attach Receipt Photo" / "Take Photo" and the browser encounters a camera permission error,
  * **Then** the app catches the rejection gracefully without crashing, displays an informative toast notification ("Direct camera stream blocked; switching to native device capture"), and activates the native HTML5 file capture fallback (`<input type="file" accept="image/*" capture="environment">`), allowing the user to seamlessly invoke the native device camera or file gallery without throwing unhandled exceptions or blocking receipt vault storage.
* **Scenario 2.5: Edge Case — Receipt Replacement or Deletion Confirmation**
  * **Given** an item already has an attached receipt,
  * **When** the user taps "Delete Receipt" or "Replace Photo",
  * **Then** the app displays a confirmation dialogue ("Are you sure you want to remove this proof of purchase? Claims cannot be auto-generated without proof."), and upon confirmation, purges the orphaned image file from local storage to prevent memory leaks.

#### Story 3: Dual Expiry & Renewal Reminders (30, 7, and 1 Day Proactive Push Alerts)
* **Scenario 3.1: Scheduled Push Notifications Triggering**
  * **Given** an active item with an expiration or auto-renewal date,
  * **When** the device system clock reaches 30 days, 7 days, and 1 day prior to the recorded date at 09:00 AM local time,
  * **Then** a local push alert is triggered displaying the item name, days remaining, and actionable copy:
    - *30 Days:* "Your warranty for [Sony Headphones] expires in 30 days. Test your device for intermittent defects now."
    - *7 Days:* "Heads up! [Spotify Student] auto-renews in 7 days for €5.99/mo. Tap to review cancellation terms."
    - *1 Day:* "Urgent: [Gym Membership] renewal cutoff is tomorrow. Tap to generate 1-tap cancellation notice."
* **Scenario 3.2: Direct Notification Action Deep-Linking**
  * **Given** the user receives a 7-day or 1-day alert on their lock screen,
  * **When** the user taps the notification,
  * **Then** the app launches directly into the specific Item Detail view with the "Generate Claim" or "Cancel Subscription" action sheet already highlighted.
* **Scenario 3.3: Edge Case — Item Already Expired upon Entry**
  * **Given** the user enters a legacy appliance purchased 3 years ago whose warranty has already expired,
  * **When** the item is saved,
  * **Then** the system marks the item status as "Expired", suppresses all future notification scheduling for this item, and displays a neutral badge ("Warranty Expired") without generating erroneous past-dated alerts.
* **Scenario 3.4: Edge Case — System Push Notifications Disabled at OS Level**
  * **Given** the user has denied system notification permissions in their OS settings,
  * **When** an item approaches 30, 7, or 1 day to renewal/expiry,
  * **Then** the app falls back to displaying high-visibility in-app banner alerts and badge counters on the wallet dashboard tab ("2 urgent deadlines pending"), alongside a persistent helper prompt offering to re-enable push notifications.
* **Scenario 3.5: Edge Case — Daylight Saving Time (DST) Transitions & Dynamic Wall-Clock Alarm Recalibration**
  * **Given** an alert scheduled for 09:00 AM local wall-clock time on a target date traversing a Daylight Saving Time (DST) boundary (e.g., Central European Summer Time [CEST] transitioning to Central European Time [CET], +1h / -1h) or when the user changes system timezones,
  * **When** the background alarm scheduler runs its daily evaluation routine or receives a system broadcast event (`TIMEZONE_CHANGED` / `TIME_SET`),
  * **Then** the scheduler dynamically recomputes the target alarm epoch using the local wall-clock time specification (`YYYY-MM-DD 09:00:00` in the user's active local timezone) rather than executing a static, unadjusted UTC epoch delta calculated at item creation, guaranteeing that notifications fire at precisely 09:00 AM local wall-clock time without suffering a $\pm 1$-hour sleep-disrupting DST drift.

#### Story 4: Unified Overview & Urgency Status Badges (4–6 Meaningful Views)
* **Scenario 4.1: Unified Chronological Dashboard with Urgency Badges (View 1)**
  * **Given** a user has multiple warranties and subscriptions logged,
  * **When** the user opens the main Dashboard (View 1),
  * **Then** items are rendered in a combined chronological feed sorted by nearest expiration/renewal deadline, each tagged with distinct category pills ("Hardware" vs. "Subscription") and color-coded urgency badges:
    - *Red ("Urgent"):* $\le 7$ days remaining.
    - *Amber ("Expiring Soon"):* 8 to 30 days remaining.
    - *Green ("Protected"):* $> 30$ days remaining.
    - *Grey ("Expired / Inactive"):* 0 days remaining.
* **Scenario 4.2: Navigation Across 4–6 Meaningful Views (Course MVP Rubric: 5 User Views + 1 Platform Tool)**
  * **Given** the application is running,
  * **When** the user navigates through the primary UI navigation bar,
  * **Then** the app provides 5 distinct, purposeful user-facing views plus 1 developer platform inspection tool (satisfying the 4–6 meaningful view rubric without naming divergence):
    - *View 1: Unified Wallet Dashboard (Timeline View):* Unified active card feed with search, category filtering, and urgency countdowns.
    - *View 2: Quick Capture Modal / View:* Streamlined manual entry form (<15s) with student brand typeahead, receipt photo capture, and `isTaxDeductible` toggle.
    - *View 3: Item Detail & Receipt Vault View:* Full product specs, statutory warranty rights breakdown (§§ 437, 477 BGB), vendor links, and pinch-to-zoom receipt viewer.
    - *View 4: 1-Tap Claim & Cancellation Action View:* Step-by-step legal notice generator (§ 477 Abs. 1, § 312k Abs. 6 BGB) with editable text and PDF preview.
    - *View 5: Subscriptions & Tax Summary View:* Monthly spend summary, recurring renewal calendar, and German Werbungskosten tax export table (§ 9 EStG / BMF 2022).
    - *Platform Tool (View 6): Policy Wiki Directory & MCP Endpoint Explorer:* Admin and developer tool for browsing verified policy rules and testing live JSON-RPC MCP tool endpoints.
* **Scenario 4.3: Edge Case — Empty Wallet State (First-Time User Experience)**
  * **Given** a new user launches the app with zero stored records,
  * **When** View 1 (Dashboard) loads,
  * **Then** the view displays a clean, friendly empty state with an illustrative graphic, a clear value proposition statement ("No active warranties or subscriptions yet. Stop losing money on forgotten renewals!"), and a prominent one-tap quick-start action: "Add Your First Purchase (+)".
* **Scenario 4.4: Edge Case — Multi-Category Filtering and Search Resilience**
  * **Given** a user with 25+ stored items across various categories,
  * **When** the user types a query in the search bar (e.g., "Apple") and toggles the "Expiring Soon" filter,
  * **Then** the list filters instantly (<50ms) to display only matching items; if no matches are found, the app displays "No items match 'Apple' under Expiring Soon" with a 1-tap "Clear Filters" button.
* **Scenario 4.5: Edge Case — Identical Expiry Deadlines Collision**
  * **Given** three subscriptions all renewing on the exact same date (e.g., 1st of next month),
  * **When** displayed on the Dashboard and Calendar view,
  * **Then** items are grouped cleanly under a single date header with cumulative monthly billing sum calculated (e.g., "Nov 1 — 3 Renewals: €34.97 total"), preventing card overlap or visual clipping.

#### Story 5: 1-Tap Claim & Cancellation Action Generator (Statutory Notices with Attached Proof)
* **Scenario 5.1: 1-Tap Statutory Hardware Warranty Claim Dossier**
  * **Given** an active hardware item with an attached receipt proof,
  * **When** the user taps "Generate Claim", inputs a 1-sentence description of the defect (e.g., "Left earbud stopped charging after normal use"), and taps "Create Dossier",
  * **Then** the app generates a formal statutory defect notice (*Mängelrüge*) citing statutory consumer rights (BGB §§ 437, 439; EU Directive (EU) 2019/771), explicitly incorporates the statutory 12-month reversed burden of proof under **§ 477 Abs. 1 BGB (*Beweislastumkehr*)** if within 1 year of delivery, invokes the 4-month suspension of expiry under **§ 475e Abs. 1 BGB (*Ablaufhemmung*)** if the defect manifested near the 24-month limit, embeds the receipt photo thumbnail, inserts device serial number and purchase date, and offers 1-tap options: "Download PDF Dossier", "Copy Email Draft", or "Open Support Portal".
* **Scenario 5.2: 1-Tap Subscription Cancellation Notice**
  * **Given** an active digital subscription (e.g., "Adobe Creative Cloud" or "FitX Gym"),
  * **When** the user taps "Cancel Subscription" and confirms cancellation intent,
  * **Then** the app generates a formal termination letter (*Kündigungsschreiben*) citing German BGB § 309 Nr. 9 (fair cancellation terms / max 1-month notice after initial term) and the statutory "Kündigungsbutton" mandate (§ 312k BGB). If the service provider fails to offer a compliant online cancellation button and confirmation page, the letter explicitly invokes the statutory right of immediate termination without notice (**§ 312k Abs. 6 BGB *fristloses Kündigungsrecht***), auto-populates contract/customer number, and opens the service's direct cancellation web portal in a secure webview.
* **Scenario 5.3: Edge Case — Missing Cash Register Receipt & German Civil Evidentiary Proof (Kontoauszug / Card Slip)**
  * **Given** an item logged without an attached receipt photo in the vault,
  * **When** the user taps "Generate Claim Dossier",
  * **Then** the app displays an informative evidentiary modal grounded in German Civil Law (BGB): *"No receipt photo attached. Note: Under German civil law, a physical cash register receipt (Kassenbon) is not mandatory—bank account statements (Kontoauszug), credit card receipts, order confirmation emails, or witness testimony (Zeugenbeweis) constitute legally sufficient proof of purchase. Would you like to attach an alternative proof document now, or export a text-only notice?"*, and upon selection, generates the claim dossier embedding an evidentiary proof block: `[ATTACH PROOF OF PURCHASE: KASSENBON, KONTOAUSZUG, OR ORDER CONFIRMATION]`.
* **Scenario 5.4: Edge Case — Service Not Found in Pre-Seeded Wiki (Custom Merchant Fallback)**
  * **Given** the user entered a local independent business or obscure service not present in the curated Policy Wiki,
  * **When** the user generates a claim or cancellation notice,
  * **Then** the generator uses a universal statutory template compliant with general German civil law (BGB), prompts the user for the merchant's support email or mailing address, and leaves custom policy fields clearly highlighted for manual entry.
* **Scenario 5.5: Edge Case — Asynchronous PDF Generation Failure, Transient User Activation & Safe Clipboard Fallback**
  * **Given** a mobile browser or low-memory device environment where client-side PDF rendering fails or times out asynchronously within a canvas worker,
  * **When** the application catches the asynchronous rendering exception,
  * **Then** the app avoids direct programmatic clipboard execution (preventing browser `NotAllowedError` exceptions caused by expired W3C transient user activation tokens), displays a dedicated error recovery modal rendering the full text dossier in a selectable text area (`<textarea readonly>`), presents an explicit interactive button *"Copy Text Dossier to Clipboard"* (which invokes `navigator.clipboard.writeText()` within a fresh, user-initiated click gesture), and immediately initiates a direct `.txt` file download fallback (`data:text/plain;charset=utf-8`).

#### Story 7: MCP / API Interface for Autonomous AI Agents (JSON-RPC 2.0 Endpoint)
* **Scenario 7.1: Model Context Protocol Tool Discovery (`tools/list`)**
  * **Given** an external AI agent or client (e.g., Claude Desktop, Gemini CLI, or custom autonomous orchestrator) connected to the Warranty Wallet MCP server via stdio or SSE transport,
  * **When** the client dispatches a JSON-RPC 2.0 discovery request with method `"tools/list"`,
  * **Then** the server responds in <200ms with a valid JSON-RPC 2.0 response returning formal definitions for both `"policy_lookup"` and `"claim_dossier_generate"`, each declaring a typed `"inputSchema"` with comprehensive parameter descriptions conforming to JSON Schema Draft-07.
* **Scenario 7.2: Querying Ground-Truth Policy Rules via `policy_lookup`**
  * **Given** an AI agent requiring verified cancellation or statutory warranty rules for a registered merchant or subscription service (e.g., `service_slug: "spotify"`, `category: "subscription"`),
  * **When** the agent invokes `"tools/call"` with tool `"policy_lookup"` supplying valid parameters,
  * **Then** the server returns a deterministic ground-truth payload containing statutory notice periods (§ 309 Nr. 9 BGB), cancellation button URLs (§ 312k BGB), and 14-day cooling-off rights (§ 312g BGB), eliminating hallucinated legal terms.
* **Scenario 7.3: Programmatic Dispute Dossier Compilation via `claim_dossier_generate`**
  * **Given** an AI agent assisting a consumer with a defective hardware purchase within 12 months of acquisition,
  * **When** the agent calls `"tools/call"` with tool `"claim_dossier_generate"` providing `item_name`, `purchase_date`, and `defect_description`,
  * **Then** the server validates the input payload against the typed Zod schema, incorporates the 12-month reversed burden of proof (§ 477 Abs. 1 BGB) and statutory remediation rights (§§ 437, 439 BGB), and returns a complete, formal notice of defect with evidentiary placeholder blocks.
* **Scenario 7.4: Edge Case — Malformed Request Payload & JSON-RPC Error Handling**
  * **Given** an AI agent submits a `"tools/call"` request with missing mandatory fields (e.g., omitting `category` or providing an invalid date string),
  * **When** the MCP server executes schema validation,
  * **Then** the server rejects the request with a standard JSON-RPC 2.0 error code `-32602` (Invalid params) containing structured Zod validation issue paths, preventing corrupted data generation without crashing the server process.

---

# 3 / ROUTE + RISKS · 20 min

### A. Milestone Roadmap (Completed S1–S4 through Exam S10)

```
+---------------------------------------------------------------------------------------------------+
|                                     COURSE MILESTONE ROADMAP                                      |
+-------------+------------------------------------+--------------------------------+---------------+
| Session     | Milestone Focus                    | Key Deliverables               | Status        |
+-------------+------------------------------------+--------------------------------+---------------+
| **S1**      | Team Agreement & Roles             | Charter, Slide 28 role mapping | **COMPLETED** |
| **S2**      | Problem & User Discovery           | 4 user interviews, idea matrix | **COMPLETED** |
| **S3**      | Investor Pitch Deck v1             | 6 widescreen pitch slides      | **COMPLETED** |
| **S4**      | Wireframes & Design Sign-Off       | Visual design, UX journeys     | **COMPLETED** |
| **S5**      | **MVP Working Core User Journey**  | **4-6 views, 2 media formats** | **ACTIVE**    |
| **S6**      | External Usability Testing         | >= 3 external student tests    | UPCOMING      |
| **S7**      | Mid-Sprint Iteration               | Feedback backlog & Wiki alpha  | UPCOMING      |
| **S8**      | Release Candidate & Feature Freeze | Hardened build, zero sev-1 bugs| UPCOMING      |
| **S9**      | Portfolio Submission & Rehearsal   | Code repository, tax dossier   | UPCOMING      |
| **S10**     | Final Viva Examination             | 10m problem / 5m demo / 10m Q&A| UPCOMING      |
+-------------+------------------------------------+--------------------------------+---------------+
```

* **Sessions 1–4 (Completed Milestones):**
  * *Session 1:* Team agreement, initial role mapping (Slide 28), and project domain definition.
  * *Session 2:* Problem framing, user discovery interviews (Person 1–4), and idea tournament selection.
  * *Session 3:* Investor pitch deck v1 (6 widescreen slides) and technical research dossier.
  * *Session 4:* Wireframes, user journey flows, and visual design sign-off.
* **Session 5 (Active Milestone — MVP Scope Control Gate):**
  * Deliver functional **"working core user journey"** (Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Claim) across **4–6 meaningful views**.
  * Integrate **2 purposeful media formats**: (1) Stored receipt image in vault, and (2) Generated claim/cancellation PDF/text dossier with embedded receipt proof.
  * Seed Policy Wiki v1 with top student services and establish the Model Context Protocol (MCP) server endpoint specification.
  * Deliver German tax research brief and *Werbungskosten* receipt tagging schema.
* **Session 6 (User Testing & Empirical Validation):**
  * Conduct structured usability testing with $\mathbf{\ge 3\text{ external users}}$ (university students managing real warranties and subscriptions).
  * Measure onboarding speed (target $<15$s manual entry) and claim generation completion rates.
  * Prioritize user feedback into rapid refinement backlog.
* **Session 7 (Mid-Sprint Refinement & Policy Wiki Expansion):**
  * Implement high-priority usability fixes from Session 6 testing.
  * Expand Policy Wiki to 20 top student brands and refine MCP JSON-RPC schemas.
* **Session 8 (Release Candidate & Feature Freeze):**
  * Code freeze across all core modules; zero critical bugs.
  * End-to-end integration of consumer wallet frontend and autonomous AI agent MCP server.
  * Rehearsal of live investor demo with real hardware claim scenarios.
* **Session 9 (Portfolio Compilation & Final Submission):**
  * Complete code repository freeze with test suite ($\ge 75\%$ coverage).
  * Submission of project portfolio, architectural documentation, and user testing report.
  * Dress rehearsal of the final presentation and individual Q&A defense.
* **Session 10 (Final Viva Examination):**
  * Official examination structure (25 minutes total):
    * **10 min:** Problem statement, empirical evidence, and strategic foundation presentation.
    * **5 min:** Live end-to-end core journey demo (Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Claim).
    * **10 min:** Individual Q&A defense across assigned roles (Members A–D).

---

### B. Top 5 Prioritized Project Risks & Mitigations

| Risk ID | Title & Description | Category | Severity | Likelihood | Assigned Owner | Concrete Mitigation Strategy & Architectural Guardrails | Invalidation / Trigger Indicator |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **R-1** | **OCR Vision Token Cost Trap & Onboarding Churn**<br>Thermal receipts, glare, and wrinkles cause high OCR error rates; multimodal vision APIs burn $0.02–$0.15/scan and stall onboarding. | Technical / Financial | **Critical** | High | **Member D** *(Dev Lead)* &<br>**Member B** *(UX/UI)* | **Strict Manual-First Architecture:** MVP uses 100% manual 3-field entry with brand typeahead. Receipt photo is saved strictly as an attached proof asset with zero OCR blocking. OCR is completely deferred to Phase 2. | Manual entry stopwatch test exceeds 15s; user testing reports frustration typing data. |
| **R-2** | **Subscription Dark Patterns & Shifting Cancellation Terms**<br>Merchants conceal cancellation buttons, bury terms in 50-page PDFs, and alter renewal notice windows without notice. | Product / Legal | **High** | High | **Member C** *(Product / Research Lead)* | **Curated Pre-Seeded Policy Wiki & Statutory Remedies:** Pre-populate verified statutory cancellation rules (e.g., German BGB § 309 Nr. 9 rolling monthly cancellations, § 312k BGB Kündigungsbutton, and § 312k Abs. 6 BGB *fristloses Kündigungsrecht* if button is missing) for top 20 student services; provide direct cancellation URL deep-links. | Merchants reject generated cancellation letters; broken cancellation portal URLs. |
| **R-3** | **Regulatory Liability: Legal Services Act (RDG) & Tax Advisory (StBerG)**<br>Generating defect notices and tax tagging risks unauthorized legal practice under RDG §§ 2, 3 or tax advisory liabilities under § 2 StBerG. | Legal / Compliance | **Medium** | Medium | **Member C** *(Product Lead)* &<br>**Member A** *(PM)* | **Automated Legal Tech Boundaries (BGH VIII ZR 285/18) & Mandatory Disclaimers:** Restrict tool strictly to automated document assembly from user inputs as permitted under BGH VIII ZR 285/18 (LexFox doctrine). Render mandatory RDG disclaimer ("Automated organizational tool; not bespoke legal counsel under §§ 2, 3 RDG") on claim/cancel exports and tax disclaimer ("Receipt organization tool; not formal tax advice under § 2 StBerG") on tax views. | Legal advisor flags unauthorized practice of law; user expects individualized legal/tax counsel. |
| **R-4** | **MCP / Agent Protocol Integration Fragility**<br>External LLMs hallucinate parameters, misinterpret dynamic API responses, or fail to parse loose JSON structures. | Technical / Architecture | **Medium** | Medium | **Member D** *(Dev Lead)* &<br>**Member A** *(PM)* | **Strict Model Context Protocol (MCP) Schemas:** Enforce deterministic JSON-RPC 2.0 tool schemas (`policy_lookup`, `claim_dossier_generate`) with typed Zod runtime validation and JSON Schema (Draft-07) specifications. Agents receive guaranteed ground-truth data layers, preventing hallucinations. | Agent test calls return JSON schema validation errors or unhandled exceptions. |
| **R-5** | **Scope Creep Across Hardware, Subs, and Taxes**<br>Attempting automated bank scraping (Plaid/Tink), live ELSTER tax filing, and full resale marketplaces derails the Session 5 & Session 8 deadlines. | Project Governance | **Critical** | High | **Member A** *(Project Manager)* | **Enforced MoSCoW Boundaries & WIP Limits:** Strictly enforce MVP boundary to: (1) Manual Entry + Vault, (2) 30/7/1-Day Alerts, and (3) 1-Tap Claim/Cancel. Tax is strictly limited to receipt tagging and export. Maintain WIP limit $\le 2$ per member. | Sprint velocity drops below 18 SP/sprint; unapproved PRs touch out-of-scope integrations. |

---

# 4 / COMMIT · 10 min

### A. Project Governance & Tracking Structure

* **Project Manager:** **Member A** (Planning, coordination, board governance, velocity tracking, stakeholder reports).
* **Official Course Project Board (SRH Slide 29):**
  * Official 5-column structure:
    $$\mathbf{[Backlog]} \longrightarrow \mathbf{[Ready]} \longrightarrow \mathbf{[In\ Progress\ (WIP\ limit:\ 2)]} \longrightarrow \mathbf{[Review]} \longrightarrow \mathbf{[Done]}$$
  * Automated GitHub Actions enforce branch protection rules: pull requests require review from Member D (code hygiene) or Member B (UI accessibility) before merging to `main`.

---

### B. Immediate Active Session 5 Deliverables & Hard Deadlines

| Deliverable Target | Description & Deliverable Media Formats | Assigned Owner | Supporting Role | Hard Deadline |
| :--- | :--- | :--- | :--- | :--- |
| **Working Core User Journey Implementation** | Functional end-to-end pipeline: **Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Claim** across 4–6 meaningful views (View 1: Unified Wallet Dashboard, View 2: Quick Capture Modal / View, View 3: Item Detail & Receipt Vault View, View 4: 1-Tap Claim & Cancellation Action View, View 5: Subscriptions & Tax Summary View, plus View 6: Policy Wiki Directory & MCP Endpoint Explorer tool). | **Member D** *(Dev Lead)* | **Member B** *(UX/UI)* | **Active Session 5 Gate** |
| **Media Format Integration** | **Media 1:** Receipt photo vault with client-side compression (<1.5MB) & offline zoom viewer.<br>**Media 2:** 1-tap claim & cancellation dossier generator exporting formatted PDF and text files with embedded proof thumbnail. | **Member D** *(Dev/Media, 10h)* &<br>**Member C** *(Legal Notice Templates, 8h)* | **Member B** *(UX/UI)* | **Active Session 5 Gate** |
| **Policy Wiki Seed & MCP Endpoint Spec** | Curated JSON knowledge base of top student services (Spotify, Prime Student, Netflix, FitX/McFIT, Adobe, AppleCare) and Model Context Protocol (MCP) server tool specification implementing concrete JSON-RPC 2.0 schemas for `policy_lookup` and `claim_dossier_generate` with typed inputSchema parameters (`service_slug`, `jurisdiction`, `issue_type`). | **Member C** *(Product Lead)* | **Member D** *(Dev Lead)* | **Active Session 5 Gate** |
| **German Tax Receipt Research Brief & Tagging Schema** | Research brief on German tax deduction criteria (*Werbungskosten*, § 9 EStG, BMF Guidance 22.02.2022 1-year Sofortabschreibung for digital equipment, *Arbeitsmittel*, GoBD immutability with SHA-256 receipt hashing) + database tagging schema (`isTaxDeductible`, `taxCategory`, `fiscalYear`, `sofortabschreibungEligible`, `receiptSha256`). | **Member C** *(Product Lead)* | **Member A** *(PM)* | **Active Session 5 Gate** |

---

### C. Academic Mentor & Infrastructure Support Requirements

1. **Academic Mentors (SRH University):**
   * **Software Engineering Advisor:** 30-min architecture review covering offline IndexedDB local storage, background notification scheduling, and Model Context Protocol (MCP) server compliance.
   * **Business Law / Tax Advisor:** 20-min consultation verifying statutory citations (BGB §§ 437, 438, 439, 477 Abs. 1 [Beweislastumkehr], 475e [Ablaufhemmung], 309 Nr. 9, 312g, 312k Abs. 6 [fristlose Kündigung]), reviewing automated legal tech boundaries under BGH VIII ZR 285/18, and confirming mandatory disclaimer language under §§ 2, 3 RDG and § 2 StBerG alongside BMF 2022 digital asset depreciation rules.
2. **Infrastructure & Test Fleet:**
   * Local development environment: Node.js / Vite / TypeScript with local SQLite / IndexedDB sandboxes.
   * Deployment: Vercel staging preview linked to GitHub repo.
   * Device testing pool: 2 physical mobile devices (1 iOS Safari, 1 Android Chrome) + desktop viewport validation.

---

### D. Comprehensive Definition of Done (DoD) Checklist

* [ ] **1. Session 5 Core User Journey Checkpoint:**
  * The full 4-stage pipeline (**Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Claim**) operates end-to-end without unhandled runtime exceptions.
  * All 4–6 meaningful views (View 1: Unified Wallet Dashboard, View 2: Quick Capture Modal / View, View 3: Item Detail & Receipt Vault View, View 4: 1-Tap Claim & Cancellation Action View, View 5: Subscriptions & Tax Summary View, plus View 6: Policy Wiki Directory & MCP Endpoint Explorer tool) are navigable and functional.
  * Both required media formats are verified: (1) Stored receipt image in offline vault, and (2) Generated statutory claim/cancellation PDF/text dossier.
* [ ] **2. Manual Entry Speed Benchmark (<15s):**
  * New item or subscription logged in under 15 seconds by a first-time user (verified via stopwatch across 3 test runs).
  * Zero reliance on OCR scanning or external AI vision APIs for initial entry.
  * Autocomplete typeahead triggers on $\ge 3$ characters and pre-fills category and duration in 1 tap.
* [ ] **3. Gherkin Acceptance Criteria Pass Rate (100% on Must-Haves):**
  * All Given/When/Then scenarios for Stories 1, 2, 3, 4, and 5 pass automated unit tests or documented manual test suites.
  * Edge cases (missing mandatory fields, future dates, oversized files, permission rejections, expired items, empty state) handled gracefully with user-friendly error banners and zero application crashes.
* [ ] **4. MCP / API Protocol Validation:**
  * Model Context Protocol (MCP) server implements official JSON-RPC 2.0 tools (`policy_lookup`, `claim_dossier_generate`).
  * All tool payloads strictly conform to typed Zod / JSON Schema (Draft-07) `inputSchema` specifications with validated parameters (`service_slug`, `category`, `jurisdiction`, `issue_type`).
  * Query response time $<200$ms with deterministic ground-truth output and standard JSON-RPC 2.0 error handling (`-32602` Invalid params).
* [ ] **5. Code Hygiene & Test Coverage ($\ge 75\%$):**
  * Zero TypeScript compiler errors (`tsc --noEmit`).
  * Zero ESLint errors or high-severity warnings.
  * Minimum 75% test coverage (`vitest` / `jest`) across date calculations, notification thresholds, and statutory citation string generators.
  * Zero hardcoded secrets, API tokens, or PII committed in git history.
* [ ] **6. Mobile Viewport Responsiveness & Accessibility:**
  * Flawless layout across viewports: 375px (iPhone SE), 390px/393px (iPhone 14/15), 412px (Pixel/Galaxy), and desktop.
  * Zero horizontal page scrolling or unexpected layout shift.
  * Touch targets adhere to WCAG 2.1 AA ($\ge 48 \times 48$ px); color contrast ratio $\ge 4.5:1$ for text and status badges.
* [ ] **7. Legal Disclaimers & Data Privacy:**
  * Mandatory legal disclaimer rendered on all claim and cancellation documents: *"Warranty Wallet operates strictly as an automated organizational software tool for consumer rights documentation under BGH VIII ZR 285/18 jurisprudence on automated legal drafting. It does not provide individualized legal representation, bespoke legal assessment, or formal legal advice under §§ 2, 3 RDG (Rechtsdienstleistungsgesetz)."*
  * Mandatory tax disclaimer rendered on tax export views: *"Receipt organization tool for tax preparation; not formal tax advice under § 2 StBerG (Steuerberatungsgesetz)."*
  * 100% offline-first local data storage: receipt images and personal details remain sandboxed on the client device.

---
*(A synced master copy is permanently saved to your workspace at [`WORKSHOP_BOARD_RECOMMENDATIONS.md`](file:///c:/Users/admin/Documents/antigravity/optimistic-bardeen/WORKSHOP_BOARD_RECOMMENDATIONS.md)).*
