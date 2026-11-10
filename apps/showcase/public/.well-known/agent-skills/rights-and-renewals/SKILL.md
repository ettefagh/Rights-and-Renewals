---
name: rights-and-renewals
description: Progressive-disclosure workflow skill for German consumer statutory warranty rights, BGB § 477 12-month burden of proof cliffs, BGB § 312k subscription cancellations, and preliminary tax screening under § 9 EStG.
---

# Rights & Renewals Agent Skill

Use this skill when an autonomous AI agent needs to evaluate German consumer rights, warranty periods, subscription cancellation terms, or asset tax deductibility.

## Core Capability Overview

The Rights & Renewals MCP server provides 5 authoritative tools:

1. **`policy_lookup`**: Look up goods or subscription policies with applicable statutory references and available provider sources.
2. **`claim_dossier_generate`**: Draft a German goods-defect notice or an ordinary contract cancellation for review before sending.
3. **`statutory_law_lookup`**: Access verbatim German Civil Code (BGB) articles:
   - § 434: Sachmangel (Material defect definition)
   - § 437: Rechte des Käufers bei Mängeln (Remedies catalogue)
   - § 438: Verjährung der Mängelansprüche (24-month statutory limitation)
   - § 439: Nacherfüllung (Repair or replacement)
   - § 475e: Ablaufhemmung (Limitation suspension)
   - § 477: Beweislastumkehr (12-month reversed burden of proof cliff)
   - § 309 Nr. 9: Laufzeit und Kündigungsfristen bei Dauerschuldverhältnissen
   - § 312k: Kündigungsbutton im elektronischen Geschäftsverkehr
   - § 355: Widerrufsrecht bei Verbraucherverträgen (14-day cooling-off)
4. **`subscription_category_rules`**: Query statutory maximum initial contract term (24m) and rolling 1-month cancellation notice windows under BGB § 309 Nr. 9 & § 312k.
5. **`tax_deductibility_check`**: Screen work or study expenses under § 9 EStG. Generic subscriptions require manual review. Specified computer equipment and acquired software may qualify for the BMF one-year useful life.

## Recommended Workflow

1. Identify whether user inquiry relates to a **purchase defect** or a **subscription contract**.
2. For defect claims:
   - Call `policy_lookup` with brand slug (e.g. `"apple"`, `"sony"`).
   - Calculate elapsed time from purchase date to check BGB § 477 cliff (12 months).
   - Call `claim_dossier_generate` with product details to compile standard Mängelrüge.
3. For subscription cancellations:
   - Call `subscription_category_rules` with category (e.g. `"streaming"`, `"gym"`, `"telecom"`).
   - Check if contract started before or after 01.03.2022 (Gesetz für faire Verbraucherverträge).
   - Check the provider's cancellation instructions. To draft ordinary cancellation, use issue_type: contract_cancellation and contract_name.
4. For tax write-offs:
   - Call `tax_deductibility_check` with asset name, gross price, and professional/academic usage percent.
