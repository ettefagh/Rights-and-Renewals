# Consolidated Information Architecture & Interaction Design Summary

**Framework Identifier:** `CONS-IA-INT-002`  
**Consolidation Level:** Executive Milestone 2 Synthesis  
**Target Application:** ApexCloud Autonomous Infrastructure Cockpit  
**Target Directory:** `ui_ux_prebuild_framework/consolidated/`  
**Reference Source Directory:** `ui_ux_prebuild_framework/02_information_architecture_and_interaction/` (Features F11–F19)  

---

## 1. Executive Information Architecture & Canonical Sitemap

The ApexCloud navigation taxonomy is organized into six functional operational domains structured around a deterministic 3-tier URI pattern:
`/:domain/:orgId/:resource/:subresource`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MASTER SITEMAP & DOMAIN TAXONOMY TREE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PUBLIC / AUTHENTICATION (AuthLayout)                                     │
│    ├── /login ──────────────────────────────► [SCR-AUTH-001: Login & SSO]    │
│    ├── /sso/callback ───────────────────────► [SCR-AUTH-002: Callback Handl] │
│    ├── /invite/accept ──────────────────────► [SCR-AUTH-003: Invite Ingress] │
│    └── /recover-password ───────────────────► [SCR-AUTH-004: Emergency Rec] │
│                                                                             │
│ 2. EXECUTIVE DASHBOARDS (DashboardLayout)                                   │
│    └── /org/:orgId/overview ────────────────► [SCR-DASH-001: SLA Cockpit]   │
│                                                                             │
│ 3. INCIDENT MANAGEMENT & TOPOLOGY (DashboardLayout)                         │
│    ├── /org/:orgId/incidents ───────────────► [SCR-INCD-001: Triage Ledger]  │
│    ├── /org/:orgId/incidents/:id ───────────► [SCR-INCD-002: Forensic View]  │
│    ├── /org/:orgId/incidents/:id/topology ──► [SCR-INCD-003: Graph Visual]   │
│    └── [Drawer Overlay on SCR-INCD-003] ────► [SCR-INCD-004: Correlated RC] │
│                                                                             │
│ 4. DATA PIPELINE ORCHESTRATION (DashboardLayout / FullscreenFocusLayout)     │
│    ├── /org/:orgId/pipelines ───────────────► [SCR-PIPE-001: DAG Inventory] │
│    ├── /org/:orgId/pipelines/new ───────────► [SCR-PIPE-002: Visual Canvas] │
│    ├── /org/:orgId/pipelines/:id ───────────► [SCR-PIPE-003: Live View]     │
│    ├── /org/:orgId/pipelines/:id/runs/:runId► [SCR-PIPE-004: Telemetry Wat] │
│    └── [Modal Overlay on SCR-PIPE-002] ─────► [SCR-PIPE-005: Pre-Flight Mod]│
│                                                                             │
│ 5. OBSERVABILITY & TELEMETRY (DashboardLayout)                              │
│    ├── /org/:orgId/observability ───────────► [SCR-OBSV-001: Metric Explor] │
│    ├── /org/:orgId/observability/traces ────► [SCR-OBSV-002: Dist Traces]   │
│    └── /org/:orgId/observability/logs ──────► [SCR-OBSV-003: Live-Tail Log] │
│                                                                             │
│ 6. AUTOMATION RUNBOOKS (DashboardLayout)                                    │
│    ├── /org/:orgId/runbooks ────────────────► [SCR-RUNB-001: Runbook Catal] │
│    ├── /org/:orgId/runbooks/new ────────────► [SCR-RUNB-002: Policy Editor] │
│    └── /org/:orgId/runbooks/:id/history ────► [SCR-RUNB-003: Execution Aud] │
│                                                                             │
│ 7. SETTINGS & GOVERNANCE (DashboardLayout)                                  │
│    ├── /org/:orgId/settings ────────────────► [SCR-SETT-001: General Config]│
│    ├── /org/:orgId/settings/rbac ───────────► [SCR-SETT-002: Member Matrix] │
│    ├── /org/:orgId/settings/audit ──────────► [SCR-SETT-003: Forensic Ledger]
│    └── /org/:orgId/settings/billing ────────► [SCR-SETT-004: Cloud Billing] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Breakpoint Navigation Shell & Stacking Governance

### 2.1 View Shell Hierarchy
- **Level 1 (Top Utility Header, Height: 48px, Sticky):** Tenant switcher, global command search trigger (`Cmd+K`), WebSocket sync status pill, user profile avatar.
- **Level 2 (Persistent Left Navigation Rail):**
  - Desktop ($\ge 1200\text{px}$): 240px expanded with text labels and unread badge counts.
  - Tablet ($600\text{px} - 1199\text{px}$): 64px icon rail with hover flyouts.
  - Mobile ($< 600\text{px}$): Replaced by persistent 5-item bottom navigation bar (height: `calc(56px + env(safe-area-inset-bottom))`).
- **Level 3 (Primary Content Canvas):** Responsive 12-column grid hosting tables, graphs, or Monaco editors.
- **Level 4 (Contextual Inspector Drawer, Width: 420px–540px):** Slides in from the right edge with high-density node diagnostics and raw logs.

### 2.2 Modal Stacking Governance & Scroll Locking Contract
To prevent stacking collisions and focus leaks:
1. **Strict Stacking Limit ($\le 2$ Layers):** A primary modal may open exactly ONE child confirmation dialog or date-picker popover. Attempting to spawn a third layer throws an architectural error.
2. **Focus Trap Isolation (`FocusTrapStack`):** When a child dialog mounts, the parent modal's trap pauses via `FocusTrapStack.push(childTrap)`. Closing the child dialog resumes the parent trap.
3. **Reference Counted Scroll Lock (`bodyScrollLockCount`):**
   ```typescript
   let bodyScrollLockCount = 0;
   export function lockBodyScroll(): void {
     if (bodyScrollLockCount === 0) {
       document.body.style.overflow = 'hidden';
       document.body.style.touchAction = 'none';
     }
     bodyScrollLockCount++;
   }
   export function unlockBodyScroll(): void {
     bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
     if (bodyScrollLockCount === 0) {
       document.body.style.overflow = '';
       document.body.style.touchAction = '';
     }
   }
   ```

### 2.3 Unified 11-Tier Z-Index Strata Table
| Layer | Z-Index Token | Numeric Value | UI Component Scope & DOM Container |
|---|---|---|---|
| Z-0 | `z-index.base` | `0` | Base Application Canvas (Normal DOM Flow) |
| Z-1 | `z-index.sticky` | `100` | In-page sticky table header freezes, sub-headers |
| Z-2 | `z-index.navbar` | `200` | Global top navigation bar, persistent left sidebar rail shell |
| Z-3 | `z-index.dropdown`| `300` | Comboboxes, select menus, autocomplete popovers |
| Z-4 | `z-index.drawer` | `400` | Sliding contextual inspector drawer (`#drawer-root` via Portal) |
| Z-5 | `z-index.backdrop`| `500` | Dimmed modal scrim, drawer overlay floor (`#backdrop-root`) |
| Z-6 | `z-index.modal` | `600` | Primary center modal dialogs, workflow node config canvas (`#modal-root`) |
| Z-7 | `z-index.submodal`| `700` | Child confirmation dialogs, stacked popovers (`#submodal-root`) |
| Z-8 | `z-index.toast` | `800` | Floating notification toasts, system snackbars (`#toast-root`) |
| Z-9 | `z-index.tooltip`| `900` | Hover/focus tooltips, cursor coordinate trackers |
| Z-10| `z-index.takeover`| `1000`| Severe system takeover, emergency critical maintenance overlay (`#system-overlay-root`) |

---

## 3. End-to-End User Flows & State Machines

### 3.1 Core Incident Remediation User Flow
```
[ Alert Ingress / Notification ]
              │
              ▼
    [ SCR-INCD-001: Incident Triage Ledger ] ──► (Filter by SEV-1, Cluster us-east-1)
              │
              ▼
    [ SCR-INCD-002: Incident Forensic Detail ] ──► (Inspect Blast Radius, 42 Pods Down)
              │
              ▼
    [ SCR-INCD-003: Incident Topology Canvas ] ──► (Click Failing Database Node)
              │
              ▼
    [ SCR-INCD-004: Root-Cause Drawer ] ──► [ Click "Trigger Remediation Runbook" ]
              │
              ▼
    [ SCR-PIPE-005: Pre-Flight Dry-Run Modal ] ──► [ Review Synthetic Check & Confirm ]
              │
              ▼
    [ SCR-RUNB-003: Runbook Execution Trail ] ──► (Stream Live Stdout logs; Status: SUCCESS)
```

### 3.2 Form Validation State Machine
Forms enforce a 6-state finite state machine (*Pristine $\rightarrow$ Dirty $\rightarrow$ Validating $\rightarrow$ Valid $\rightarrow$ Submitting $\rightarrow$ Submitted*):
- Validation triggers: Sync rules evaluate `onBlur`; async checks (e.g. uniqueness) evaluate `onChange` debounced at 300ms.
- Submitting: CTA button activates `isLoading={true}` (centered spinner, fixed width, disabled pointer events).

### 3.3 Global System Macro States (Including 408 Client Timeout)
All 24 screens adhere to the Global System State Engine:
- **Offline (Status 0):** Sticky Amber bar; mutations queued in `IndexedDB`.
- **401 Session Expiry:** In-place modal re-auth preserves form and view state.
- **403 Forbidden:** In-page shield card with "Request Access" CTA.
- **408 Client Timeout:** Client request aborts after **10,000ms default** (`AbortSignal.timeout(10000)`); ephemeral toast prompts `[Retry Now]`; resets `isLoading: false`.
- **429 Throttled:** Ephemeral toast displays real-time countdown timer.
- **500 / 503 Server Error:** Fallback card with Incident Reference ID and copy error button.
- **Scheduled Maintenance:** Full-screen modal takeover (`z-index: 1000`).

---

## 4. Keyboard Navigation & Accessibility Specifications

1. **Logical Tab Sequence:** Skip-to-content link $\rightarrow$ Global Utility Header $\rightarrow$ Left Navigation Rail $\rightarrow$ Breadcrumb Trail $\rightarrow$ Main Canvas $\rightarrow$ Inspector Drawer.
2. **Roving Tabindex Widget Rule:** Composite toolbars, tabs, and radio groups contain exactly ONE focusable element (`tabindex="0"`); siblings have `tabindex="-1"`. Arrow keys cycle focus within the group.
3. **Esc Key Hierarchy:** Dismisses tooltips first $\rightarrow$ closes child confirmation $\rightarrow$ closes primary modal $\rightarrow$ closes drawer $\rightarrow$ resets active search input.
