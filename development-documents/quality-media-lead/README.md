# 🧪 Quality Assurance & Dual Purposeful Media Formats

**Role Title:** Quality / Media Lead  
**Role Owner:** **Mojtaba**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 20h Total (10h `US-02` Media Format 1 + 10h `US-05` Media Format 2)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 🎯 Role Objectives & Media/QA Mandate

As **Quality / Media Lead**, **Mojtaba** is responsible for the design, implementation, and verification of the course's **two required purposeful media formats**, automated testing suite ($\ge 75\%$ coverage), and release quality sign-off:

1. **Media Format 1 — Client-Side Encrypted Receipt Photo Vault (`US-02`):**
   * Client-side compression downsampling oversized images ($15\text{MB}+$) to $<1.5\text{MB}$ (`JPEG/WebP`, max dimension $2048\text{px}$) in $<500\text{ms}$.
   * Client-side cryptographic `SHA-256` hashing ensuring immutability under **GoBD Rn. 108–110**.
   * Edge-to-edge modal viewer with smooth offline pinch-to-zoom inspection for line items and serial numbers with zero OCR dependencies.
   * Fallback to native HTML5 `<input type="file" accept="image/*" capture="environment">` if WebRTC camera permissions are denied.
2. **Media Format 2 — 1-Tap Statutory Claim & Cancellation Dossier Generator (`US-05`):**
   * Client-side document compiler producing formatted statutory PDF and plain-text claim packages (*Mängelrüge* citing `BGB §§ 437, 439, 477 Abs. 1` or *Kündigungsschreiben* citing `§ 309 Nr. 9, § 312k Abs. 6`).
   * Embeds receipt photo thumbnail, metadata table, and mandatory **BGH VIII ZR 285/18 / RDG §§ 2, 3** disclaimer.
   * Resilient fallback modal with `<textarea readonly>`, user-activated `Copy to Clipboard` button, and `.txt` file download to prevent browser clipboard security exceptions.
3. **Database Maintenance & Automated AI Agent Pipeline (`DOC-QA-02`):**
   * Co-owns [**`DATABASE_UPDATE_PIPELINE.md`**](./DATABASE_UPDATE_PIPELINE.md) defining weekly HTTP liveness checks, monthly AGB SHA-256 diff scans, and autonomous Cloud AI Agent (Spark / Jules) pull requests with human-in-the-loop review.
4. **Automated Testing Suite ($\ge 75\%$ Coverage):**
   * Unit and integration testing with Vitest/Jest.
   * Mock system clock testing validating deterministic push alert firing across CEST/CET Daylight Saving Time boundaries ($0\text{h}$ drift).
   * Schema validation tests for Zod and MCP JSON-RPC 2.0 endpoints.
5. **Definition of Done Verification:** Partner with Jeetkumar (PM) to audit all 7 quality gates prior to marking issues `5. Done`.

---

## 📋 Assigned GitHub Issues & Ownership

| Issue | Title | Story Points | Column Status | Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#1**](https://github.com/ettefagh/CM-LAB/issues/1) | `[Panel A Core Story US1] Rapid Manual Capture & Receipt Vault` | 10 SP | `3. In Progress` | Co-owner for AC2 (Client compression & SHA-256 hashing) |
| [**#3**](https://github.com/ettefagh/CM-LAB/issues/3) | `[Panel A Core Story US3] 1-Tap Statutory Claim & Cancel Generator` | 5 SP | `2. Ready (Sprint 1)` | Primary owner for AC2 (Dossier export & clipboard fallback) |
| [**#5**](https://github.com/ettefagh/CM-LAB/issues/5) | `[Backlog US-02] Receipt Attachment Vault (Offline Proof & Hash)` | 5 SP | `3. In Progress` | 10h direct implementation of Media Format 1 pipeline |
| [**#8**](https://github.com/ettefagh/CM-LAB/issues/8) | `[Backlog US-05] 1-Tap Claim & Cancellation Generator` | 5 SP | `2. Ready (Sprint 1)` | 10h direct implementation of Media Format 2 engine |
| [**#11**](https://github.com/ettefagh/CM-LAB/issues/11) | `[Backlog US-08] German Tax Tagging & Werbungskosten Export` | 3 SP | `1. Backlog` | Tax CSV/PDF export formatter support |
| [**#12**](https://github.com/ettefagh/CM-LAB/issues/12) | `[Backlog US-09] [WON'T-HAVE] Automated OCR Receipt Scanning` | 13 SP | `1. Backlog` | Co-owner on benchmarking failure evidence (42% failure) |
| [**#13**](https://github.com/ettefagh/CM-LAB/issues/13) | `[Risk R-1] OCR Cost Trap & Onboarding Churn Guardrail` | — | `4. In Review / QA` | Verification of receipt vault without OCR blocking |
| [**#16**](https://github.com/ettefagh/CM-LAB/issues/16) | `[Risk R-4] MCP Protocol Fragility & Schema Hallucinations` | — | `2. Ready (Sprint 1)` | Integration testing of Zod validation & JSON-RPC errors |
| [**#19**](https://github.com/ettefagh/CM-LAB/issues/19) | `[Deliverable D-2] Dual Purposeful Media Formats Integration` | — | `3. In Progress` | Master deliverable lead for Media Formats 1 & 2 |
| [**#23**](https://github.com/ettefagh/CM-LAB/issues/23) | `[Peer Lab Iteration C-2] Elevate Receipt Photo Container` | — | `5. Done` | Verified 100% attachment rate in Session 4 peer testing |
| [**#25**](https://github.com/ettefagh/CM-LAB/issues/25) | `[Walkthrough A] External User Test — Participant Alpha` | — | `5. Done` | Verified SHA-256 hash & receipt storage under 12.1s |
| [**#27**](https://github.com/ettefagh/CM-LAB/issues/27) | `[ADR-01] Pivot from OCR Scanning to Manual-First Flow` | — | `5. Done` | Quality & benchmarking data contributor |
| [**#30**](https://github.com/ettefagh/CM-LAB/issues/30) | `[Governance & DoD] Team 6 Sprint Capacity Reconciliation (92h)` | — | `4. In Review / QA` | Test suite coverage ($\ge 75\%$) & Gate 5/7 sign-off |

---

## 📷 Media Processing Pipeline Architecture

```
[Raw User Input] (Camera / File Picker, 15MB+)
       │
       ▼
[Web Worker Downsampler] (Max dimension: 2048px, Quality: 0.82)
       │
       ├─► Output: <1.5MB JPEG / WebP Blob
       │
       ├─► [Crypto Subtle API] ──► SHA-256 Digest (64-char Hex String)
       │
       └─► [Thumbnail Generator] ─► 120x120px Base64 Cache (<500ms)
```

---

## 📄 Statutory Claim Dossier Compiler (Media Format 2)

* **PDF Layout Structure:**
  1. **Header Banner:** Formal German legal notice header (*Mängelrüge gem. BGB §§ 437, 439* or *Kündigungsschreiben gem. BGB § 309 Nr. 9 / § 312k Abs. 6*).
  2. **Metadata Grid:** Customer Name, Merchant Name, Purchase Date, Item Serial / SKU, Defect Description.
  3. **Embedded Proof Asset:** Downsampled thumbnail of authenticated receipt photo with verified `SHA-256` checksum.
  4. **Legal Citations & Remedy:** Explicit demand for remedy within 14 calendar days (*angemessene Frist zur Nacherfüllung*).
  5. **Footer Disclaimer:** Mandatory automated drafting notice under **BGH VIII ZR 285/18** / **§§ 2, 3 RDG**.
* **Resilience Mechanism:** If client PDF worker times out, modal gracefully presents readonly `<textarea>` with one-click clipboard copy and `.txt` download button.
