# 📋 Policy Wiki Schema & Citation Specification

**Document ID:** `DOC-PRD-04-SCHEMA-CITATION` · **Status:** Canonical SSOT  
**Primary Maintainer:** AmirHossein (Product & Legal Lead) · **Audience:** Core Engineers & Autonomous AI Agents

---

## 1. Minimal Data Schema Contract

To minimize token usage and maximize AI parsing speed, all brand knowledge entries in `policy_wiki_seed_v1.json` and client `db.policy_wiki` MUST conform to this exact shape:

### 1.1 Subscription Entity (`category: "subscription"`)
```typescript
interface SubscriptionPolicyRecord {
  slug: string;                           // PK: e.g. "spotify", "mcfit"
  name: string;                           // e.g. "Spotify Premium"
  category: "subscription";
  archetype: "streaming" | "gym" | "software" | "transit" | "telecom";
  defaultPriceEur: number;                // e.g. 10.99
  billingCadence: "monthly" | "yearly";
  initialTermMonths: number;              // Standard minimum contract period (max 24m)
  cancellationNoticeDays: number;         // Days before cycle cutoff (max 30d post-initial)
  cancellationUrl: string;                // Direct self-service portal (BGB § 312k Kündigungsbutton)
  citations: CitationLink[];              // Verified authoritative references
  statutoryBasis: string[];               // e.g. ["BGB § 309 Nr. 9", "BGB § 312k"]
  lastVerifiedUtc: string;                // ISO 8601 YYYY-MM-DD
}
```

### 1.2 Hardware Warranty Entity (`category: "hardware"`)
```typescript
interface WarrantyPolicyRecord {
  slug: string;                           // PK: e.g. "apple", "sony"
  name: string;                           // e.g. "Apple"
  category: "hardware";
  statutoryWarrantyMonths: 24;            // Mandatory German seller liability (BGB § 438)
  reversedBurdenMonths: 12;               // Beweislastumkehr threshold (BGB § 477 Abs. 1)
  commercialGuaranteeMonths?: number;     // Manufacturer voluntary guarantee (BGB § 443)
  commercialGuaranteeScope?: string;      // Summary of manufacturer terms vs statutory rights
  rmaPortalUrl: string;                   // Official repair/support intake portal
  proofRequirements: "receipt_or_invoice" | "serial_only" | "bank_statement_accepted";
  citations: CitationLink[];              // Verified authoritative references
  statutoryBasis: string[];               // e.g. ["BGB § 437", "BGB § 438", "BGB § 477"]
  lastVerifiedUtc: string;                // ISO 8601 YYYY-MM-DD
}
```

---

## 2. Source Credibility & Citation Policy (4 Tiers)

Every entry MUST cite at least one Tier 1 source and one Tier 2 source.

```typescript
interface CitationLink {
  tier: 1 | 2 | 3 | 4;
  label: string;                          // Human-readable title
  url: string;                            // Canonical HTTPS URL
  sectionRef?: string;                    // Exact clause: e.g. "§ 8.2", "Absatz 3"
  contentHashSha256?: string;             // SHA-256 of cited text block for drift detection
}
```

| Tier | Source Authority | Acceptable Domains | Required Citation Usage |
| :---: | :--- | :--- | :--- |
| **Tier 1** | **Primary Corporate Terms** | Official vendor domains (e.g., `apple.com/legal/`, `spotify.com/de/legal/`) | Merchant AGB, warranty policy riders, official cancellation instructions. |
| **Tier 2** | **Statutory Ground Truth** | `gesetze-im-internet.de`, `recht.bund.de`, `eur-lex.europa.eu` | Exact German Civil Code statutes (`BGB §§ 309, 312k, 437, 438, 477`) and EU directives. |
| **Tier 3** | **Regulatory & Consumer Bodies** | `vzbv.de`, `verbraucherzentrale.de`, `bundesnetzagentur.de` | Administrative enforcement notices, consumer alerts, court rulings (*BGH*). |
| **Tier 4** | **Direct Operational Portals** | Official vendor subdomains (e.g., `support.apple.com/repair`, account cancellation pages) | Direct target URLs embedded in the UI and MCP output. |

### Prohibited Sources (Strictly Rejected in PRs)
* ❌ Third-party cancellation brokers (e.g., `aboalarm.de`, `kuendigung.org`, `volders.de`).
* ❌ Affiliate review blogs, SEO aggregator sites, or unverified Reddit/forum posts.
* ❌ Synthetic LLM citations without a verifiable live HTTP 200 endpoint.

---

## 3. Link Sanitization & Validation Invariants
1. **Canonical HTTPS Only:** Every cited URL must use `https://` with valid TLS certificates.
2. **Zero Tracking Tokens:** URLs must be stripped of UTM parameters, session tokens, and affiliate tags (`utm_*`, `fbclid`, `gclid`, `ref`).
3. **Deep-Link Preference:** Link directly to the specific legal subsection or cancellation anchor (e.g., `.../agb#kuendigung`) rather than generic homepage roots.
