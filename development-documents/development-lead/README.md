# ⚙️ Full-Stack Architecture & Engineering

**Role Title:** Development Lead  
**Role Owner:** **Kyle**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 22h Total (6h `US-02` Storage Engine + 16h `US-03` Proactive Push Alert Engine)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

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
