# 🎨 UX/UI Interaction Design & Accessibility

**Role Title:** UX/UI Lead  
**Role Owner:** **Prushti**  
**Working Team:** **Team 6** · *Computer & Media Lab* (SRH Hochschule WiSe 2026)  
**Assigned Capacity:** 26h Total (16h `US-01` Manual Entry UI + 10h `US-04` Unified Dashboard)  
**Active Milestone:** Session 5 — MVP Scope Lock & Working Core User Journey Gate  

---

## 🎯 Role Objectives & Design Mandate

As **UX/UI Lead**, **Prushti** is responsible for user interaction design, mobile-first responsive layouts, design tokens, WCAG 2.1 AA accessibility compliance, paper prototype iteration, and end-user walkthrough coordination:

1. **Sub-15-Second Manual Entry Flow (`US-01`):** Design the frictionless 3-field modal (Item Name with brand autocomplete, Purchase Date, Category) enabling users to log hardware or subscriptions in $<15$s (`11.4s` benchmark verified in Session 4 peer lab).
2. **Unified Dashboard & Urgency Status Badges (`US-04`):** Design the chronological combined feed with color-coded urgency pills:
   * **Red (`Urgent`):** $\le 7$ days remaining (immediate action required).
   * **Amber (`Expiring Soon`):** $8–30$ days remaining (inspection window).
   * **Green (`Protected`):** $> 30$ days remaining (active coverage).
   * **Grey (`Expired`):** $0$ days remaining (archived / lapsed).
3. **WCAG 2.1 AA Accessibility Standards:**
   * Minimum color contrast ratio $\ge 4.5:1$ for normal text and $\ge 3:1$ for large text/badges.
   * Touch targets $\ge 48\times 48\text{px}$ across mobile viewports ($375\text{px}–412\text{px}$).
4. **Peer Lab Usability Iterations (Session 4 with Team 7):**
   * `C-1`: Brand typeahead autocomplete (reduced entry from 38.0s to 11.4s).
   * `C-2`: Primary receipt photo container elevated next to Item Name.
   * `C-3`: Unified visual BGB § 477 warranty timeline highlighting 12-month reversed burden of proof.
5. **External Walkthrough B Coordination (`#26`):** Conduct usability testing with Participant Beta (7 active subscriptions, gym renewal in 7 days, 1-tap § 312k Abs. 6 cancellation notice).

---

## 📋 Assigned GitHub Issues & Ownership

| Issue | Title | Story Points | Column Status | Focus |
| :---: | :--- | :---: | :---: | :--- |
| [**#1**](https://github.com/ettefagh/CM-LAB/issues/1) | `[Panel A Core Story US1] Rapid Manual Capture & Receipt Vault` | 10 SP | `3. In Progress` | Primary owner for AC1 (UI interaction & autocomplete) |
| [**#2**](https://github.com/ettefagh/CM-LAB/issues/2) | `[Panel A Core Story US2] Proactive Dual Expiry Alert Engine` | 8 SP | `3. In Progress` | Co-owner for AC1 (Dashboard timeline & urgency badges) |
| [**#4**](https://github.com/ettefagh/CM-LAB/issues/4) | `[Backlog US-01] Manual Entry (<15s Structured Flow)` | 5 SP | `3. In Progress` | 16h direct UI build for Quick Capture modal |
| [**#7**](https://github.com/ettefagh/CM-LAB/issues/7) | `[Backlog US-04] Unified Overview & Urgency Status Badges` | 3 SP | `3. In Progress` | 10h direct UI build for 4–6 responsive views |
| [**#13**](https://github.com/ettefagh/CM-LAB/issues/13) | `[Risk R-1] OCR Cost Trap & Onboarding Churn Guardrail` | — | `4. In Review / QA` | UI mitigation via brand typeahead autocomplete |
| [**#18**](https://github.com/ettefagh/CM-LAB/issues/18) | `[Deliverable D-1] Working Core User Journey Implementation` | — | `3. In Progress` | Navigation & layout across Views 1–5 |
| [**#22**](https://github.com/ettefagh/CM-LAB/issues/22) | `[Peer Lab Iteration C-1] Brand Typeahead Autocomplete` | — | `5. Done` | Tested with Team 7; reduced entry to 11.4s |
| [**#23**](https://github.com/ettefagh/CM-LAB/issues/23) | `[Peer Lab Iteration C-2] Elevate Receipt Photo Container` | — | `5. Done` | Positioned receipt container beside name input |
| [**#24**](https://github.com/ettefagh/CM-LAB/issues/24) | `[Peer Lab Iteration C-3] Unified Visual BGB § 477 Timeline` | — | `5. Done` | Visual progress bar with 12-month legal checkpoint |
| [**#26**](https://github.com/ettefagh/CM-LAB/issues/26) | `[Walkthrough B] External User Test — Participant Beta` | — | `5. Done` | Usability test completed with student managing 7 subs |
| [**#28**](https://github.com/ettefagh/CM-LAB/issues/28) | `[ADR-02] Unifying Subscriptions Alongside Hardware` | — | `5. Done` | Co-owner with AmirHossein on unified UI architecture |

---

## 🎨 Design System Tokens & Color Palette

| Token Name | Hex Code | Purpose / Application | Contrast Ratio (on `#FFFFFF`) |
| :--- | :---: | :--- | :---: |
| `color-primary-teal` | `#2F524C` | Primary headers, active tab borders, brand typography | **7.8:1** (AAA) |
| `color-accent-coral` | `#D96B4B` | Primary CTAs, active highlights, key action links | **4.6:1** (AA) |
| `color-bg-canvas` | `#F4F7F6` | Main application background (soft neutral) | — |
| `color-card-white` | `#FFFFFF` | Elevated card surfaces and modal dialogs | — |
| `color-urgent-red` | `#DC2626` | Urgent badge ($\le 7$d), critical warnings | **4.8:1** (AA) |
| `color-warning-amber` | `#D97706` | Expiring soon badge ($8–30$d), notice window alerts | **4.5:1** (AA) |
| `color-protected-green`| `#059669` | Active protected badge ($>30$d), completed checks | **4.9:1** (AA) |
| `color-expired-grey` | `#6B7280` | Expired / archived records, neutral metadata | **4.7:1** (AA) |

---

## 📱 6 Core Application Views (Information Architecture)

1. **View 1: Unified Wallet Dashboard:** Chronological timeline of hardware warranties and recurring subscriptions with instant category pills and search filtering.
2. **View 2: Quick Capture Modal:** Sub-15-second 3-field entry form with brand autocomplete typeahead, receipt photo container, and German tax toggle.
3. **View 3: Item Detail & Receipt Vault View:** Visual statutory BGB progress bar (highlighting 12-month reversed burden of proof) and edge-to-edge pinch-to-zoom receipt viewer.
4. **View 4: 1-Tap Claim & Cancellation Action View:** Contextual action screen generating formal statutory notices citing BGB §§ 437/312k with embedded receipt image.
5. **View 5: Subscriptions & Tax Summary View:** Cumulative monthly subscription spend tracker and German tax *Werbungskosten* export preview.
6. **View 6: Policy Wiki & MCP Explorer:** Student brand knowledge base directory and interactive MCP JSON-RPC 2.0 tool execution sandbox.
