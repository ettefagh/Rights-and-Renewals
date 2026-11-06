# ⚙️ Full-Stack Architecture & Engineering

**Role Title:** Development Lead  
**Role Owner:** **Kyle**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 22h Total (6h `US-02` Storage Engine + 16h `US-03` Proactive Push Alert Engine)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 📚 Development Lead Engineering Specification Suite

All technical specifications in this directory are strictly scoped to **Development Lead (Kyle — Member D)** responsibilities, cleanly separated from Quality/Media Lead (**Mojtaba**) domains:

| Spec ID | Engineering Document | Primary Engineering Scope & Deliverables | Mapped Issues / ADRs |
| :---: | :--- | :--- | :--- |
| **`DEV-00`** | [**`00_Development_Lead_Role_and_Deliverables_Matrix.md`**](./00_Development_Lead_Role_and_Deliverables_Matrix.md) | Pure Development Lead Role Charter, Cross-Team Boundary Separation Matrix (excluding Quality/Media Lead domains), 22h Sprint Capacity Reconciliation (`6h US-02` + `16h US-03`), Causal `ADR-01` & `ADR-03`, and Walkthrough A (`#25`, Participant Alpha) Telemetry Log. | `#1`, `#2`, `#5`, `#6`, `#10`, `#12`, `#13`, `#16`, `#18`, `#20`, `#25`, `#27`, `#29` |
| **`DEV-01`** | [**`01_Frontend_Architecture_and_Reactive_State_Engine.md`**](./01_Frontend_Architecture_and_Reactive_State_Engine.md) | Hybrid Astro 6 + Svelte 5 Runes Island Architecture (`<WalletApp client:only="svelte" />`, ~11.8 KB gzip) across Views 1–6, Reactive State Engine (`wallet.svelte.ts` with `createSubscriber` over Dexie v4 `liveQuery`), Sub-15s Manual Entry Engine (`11.4s` verified, `<10ms` Prefix-Trie brand typeahead, zero OCR), and Proactive 30/7/1-Day Push Alert Scheduler with Dynamic CEST/CET DST Recalibration ($0\text{h}$ drift). | `US-01` (`#4`), `US-03` (`#2`, `#6`), `D-1` (`#18`), `R-1` (`#13`), `ADR-01` (`#27`), `ADR-04` |
| **`DEV-02`** | [**`02_Offline_First_Local_Database_Architecture.md`**](./02_Offline_First_Local_Database_Architecture.md) | Dexie.js v4 / IndexedDB Schema (`items`, `receipt_blobs`, `alarm_schedules`, `policy_wiki`, `dispute_history`), `<200ms` Atomic Multi-Store RW Transactions, Orphan Blob Garbage Collection, Web Crypto `AES-GCM-256` Zero-Knowledge Storage, and `GoBD Rn. 108–110` `SHA-256` Immutability Verification. | `US-01` (`#1`), `US-02` (`#5` 6h Vault DB), `D-1` (`#18`), `ADR-01` (`#27`) |
| **`DEV-03`** | [**`03_MCP_Server_and_JSON_RPC_Integration_Spec.md`**](./03_MCP_Server_and_JSON_RPC_Integration_Spec.md) | Open Model Context Protocol (MCP) JSON-RPC 2.0 Server over `stdio` & HTTP `SSE` (`<200ms` latency), `policy_lookup` & `claim_dossier_generate` Tool Schemas (Draft-07 & Zod), Deterministic `-32602` Error Handling, Top 20 Student Brand Policy Wiki Seed, and View 6 Explorer Bridge. | `US-07` (`#10`), `D-3` (`#20`), `R-4` (`#16`), `ADR-03` (`#29`), `Gate 4 DoD` (`#30`) |
| **`DEV-04`** | [**`04_Production_Engineering_Build_Pipelines_and_Security_Posture.md`**](./04_Production_Engineering_Build_Pipelines_and_Security_Posture.md) | Strict TypeScript/Vite 6 Offline PWA Build Pipeline (`<150KB` gzipped), GitHub Actions CI/CD Enforcing the 7-Gate Definition of Done (`#30`), `connect-src 'self'` CSP Zero-Network/Zero-OCR Guardrail, W3C Transient User Activation Clipboard & HTML5 Camera Fallbacks, and STRIDE Threat Model. | `R-1` (`#13`), `R-3` (`#15`), `R-5` (`#17`), `DoD` (`#30`) |

---

## 🎯 Role Objectives & Engineering Mandate

As **Development Lead**, **Kyle** is responsible for the offline-first client architecture, sandboxed local database storage, notification alarm scheduling, and the implementation of the open Model Context Protocol (MCP) server:

1. **Offline-First Local Storage Engine:** Implement sandboxed SQLite / IndexedDB client data store supporting instant $<200$ms writes, full airplane-mode persistence, and encrypted blob storage (`US-01`, `US-02`).
2. **Proactive 30/7/1-Day Push Alert Scheduler (`US-03`):**
   * Deterministic local notifications triggered at `T-30d`, `T-7d`, and `T-1d` at `09:00 AM` local time.
   * **Dynamic CEST/CET DST Recalibration:** Recompute target alarm epochs across Daylight Saving Time transitions ensuring $0\text{h}$ drift.
   * Deep-linking directly into View 3 (Item Detail) and View 4 (Action Generator).
   * Graceful in-app fallback banners when browser push permissions are denied.
3. **Open Model Context Protocol (MCP) Server (`US-07`, Deliverable `D-3`):**
   * JSON-RPC 2.0 protocol over stdio / HTTP SSE.
   * Expose standardized tools: `policy_lookup` and `claim_dossier_generate`.
   * Runtime payload validation via typed Zod schemas with standard `-32602` (`Invalid params`) error handling.
4. **End-to-End Core User Journey (`D-1`):** Connect the 4-stage pipeline: **Capture $\rightarrow$ Store $\rightarrow$ Alert $\rightarrow$ Act**.
5. **External Walkthrough A Coordination (`#25`):** Conduct usability test with Participant Alpha (Master's student & *Werkstudentin*, €249 monitor, tax toggle, BGB § 438 expiry).

---

## 📋 Assigned GitHub Issues & Ownership

| Issue | Title | Story Points | Column Status | Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#1**](https://github.com/ettefagh/CM-LAB/issues/1) | `[Panel A Core Story US1] Rapid Manual Capture & Receipt Vault` | 10 SP | `3. In Progress` | Co-owner with Prushti & Mojtaba; database storage pipeline |
| [**#2**](https://github.com/ettefagh/CM-LAB/issues/2) | `[Panel A Core Story US2] Proactive Dual Expiry Alert Engine` | 8 SP | `3. In Progress` | Primary owner for AC2 (Scheduler & DST recalibration) |
| [**#5**](https://github.com/ettefagh/CM-LAB/issues/5) | `[Backlog US-02] Receipt Attachment Vault (Offline Storage)` | 5 SP | `3. In Progress` | 6h IndexedDB/SQLite blob vault implementation |
| [**#6**](https://github.com/ettefagh/CM-LAB/issues/6) | `[Backlog US-03] Dual Expiry & Renewal Reminders (30/7/1d)` | 5 SP | `2. Ready (Sprint 1)` | 16h push alert scheduler & alarm dispatch engine |
| [**#10**](https://github.com/ettefagh/CM-LAB/issues/10) | `[Backlog US-07] Open MCP / API Interface (JSON-RPC 2.0)` | 5 SP | `1. Backlog` | 16h MCP server implementation for Session 6 |
| [**#12**](https://github.com/ettefagh/CM-LAB/issues/12) | `[Backlog US-09] [WON'T-HAVE] Automated OCR Receipt Scanning` | 13 SP | `1. Backlog` | Explicitly deferred to Phase 2 to protect MVP scope |
| [**#13**](https://github.com/ettefagh/CM-LAB/issues/13) | `[Risk R-1] OCR Cost Trap & Onboarding Churn Guardrail` | — | `4. In Review / QA` | Strict manual-first architecture guardrail |
| [**#16**](https://github.com/ettefagh/CM-LAB/issues/16) | `[Risk R-4] MCP Protocol Fragility & Schema Hallucinations` | — | `2. Ready (Sprint 1)` | Zod runtime schema validation & `-32602` error handling |
| [**#18**](https://github.com/ettefagh/CM-LAB/issues/18) | `[Deliverable D-1] Working Core User Journey Implementation` | — | `3. In Progress` | Lead developer for full end-to-end user pipeline |
| [**#20**](https://github.com/ettefagh/CM-LAB/issues/20) | `[Deliverable D-3] Policy Wiki v1 Seed & Open MCP Spec` | — | `4. In Review / QA` | JSON-RPC 2.0 tool definitions & Draft-07 schemas |
| [**#25**](https://github.com/ettefagh/CM-LAB/issues/25) | `[Walkthrough A] External User Test — Participant Alpha` | — | `5. Done` | Completed test with working student (€249 monitor) |
| [**#27**](https://github.com/ettefagh/CM-LAB/issues/27) | `[ADR-01] Pivot from OCR Scanning to Manual-First Flow` | — | `5. Done` | Co-owner with Jeetkumar & Mojtaba |
| [**#29**](https://github.com/ettefagh/CM-LAB/issues/29) | `[ADR-03] Deterministic BGB Claim Generator & MCP Wiki` | — | `5. Done` | Technical architecture for deterministic MCP endpoints |

---

## 🗄️ Database Schema & Data Models

### Item Record Schema (`items` Table / Store)
```typescript
export interface WalletItem {
  id: string;                         // UUID v4
  name: string;                       // "Sony WH-1000XM4"
  category: 'hardware' | 'subscription';
  purchaseDate: string;               // ISO 8601 (YYYY-MM-DD)
  expiryDate: string;                 // ISO 8601 (Auto-calculated or user override)
  cancellationCutoffDate?: string;    // ISO 8601 (For subscriptions: T-30d)
  statutoryWarrantyMonths: number;    // Default 24 (BGB § 438)
  priceEur: number;                   // 249.00
  merchant: string;                   // "MediaMarkt"
  isTaxDeductible: boolean;           // true (Werbungskosten § 9 EStG)
  taxCategory?: 'Arbeitsmittel' | 'Fachliteratur' | 'Software';
  receiptBlobId?: string;             // Foreign key to receipts store
  receiptSha256?: string;             // GoBD cryptographic hash
  createdAt: string;                  // ISO 8601 timestamp
  updatedAt: string;                  // ISO 8601 timestamp
}
```

---

## 🤖 Model Context Protocol (MCP) JSON-RPC 2.0 Spec

The system exposes an open Model Context Protocol server enabling autonomous AI coding assistants and consumer agents to retrieve verified ground-truth policy terms and generate legally sound dispute packages without hallucinations:

* **Tool 1: `policy_lookup`:**
  * Inputs: `service_slug: string` (e.g. `"spotify-student"`), `category?: string`.
  * Outputs: Statutory cancellation notice window (`BGB § 309 Nr. 9`), warranty rules (`BGB § 438`), direct cancellation button URL (`BGB § 312k`), and RMA endpoints.
* **Tool 2: `claim_dossier_generate`:**
  * Inputs: `item_name: string`, `defect_description: string`, `purchase_date: string`, `merchant: string`.
  * Outputs: Formal plain-text & markdown *Mängelrüge* citing `BGB §§ 437, 439, 477 Abs. 1` with legal disclaimer under `BGH VIII ZR 285/18`.
