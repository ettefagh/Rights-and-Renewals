# Engineering Workflow, CI/CD & Definition of Done Specification
**Project:** Warranty & Subscription Wallet + Policy Wiki (MCP/API-Enabled)  
**Academic Institution:** SRH University of Applied Sciences — *Computer & Media Lab*  
**Milestone:** Session 5 (MVP Scope Control Gate) & Portfolio Defense  
**Author:** Member D (Development & Quality/Media Lead)  
**Document ID:** DOC-D5  
**Status:** Approved Engineering Baseline  
**Version:** 1.0.0  

---

## 1. Monorepo & Directory Structure

To decouple the client-side consumer application from the autonomous AI agent platform, the repository follows a modular workspace structure:

```
warranty-wallet/
├── apps/
│   └── web/                               # Client-Side PWA Application
│       ├── public/
│       │   ├── icons/                     # PWA manifest icons & assets
│       │   └── manifest.json
│       ├── src/
│       │   ├── components/                # UI Primitives & View Components
│       │   │   ├── common/                # Buttons, Badges, Modals, Inputs
│       │   │   ├── dashboard/             # View 1: Unified Wallet Timeline
│       │   │   ├── capture/               # View 2: Quick Capture Modal (<15s)
│       │   │   ├── vault/                 # View 3: Receipt Zoom Viewer & Proof
│       │   │   ├── claim/                 # View 4: Claim/Cancel Generator & PDF
│       │   │   ├── tax/                   # View 5: Werbungskosten & BMF 2022
│       │   │   └── policy/                # View 6: Policy Wiki & MCP Tester
│       │   ├── lib/
│       │   │   ├── db/                    # Dexie.js IndexedDB Schema & CRUD
│       │   │   ├── media/                 # Canvas compression & Web Crypto SHA-256
│       │   │   ├── legal/                 # Statutory BGB Claim/Cancel Assembly
│       │   │   ├── notifications/         # DST-safe alarm scheduler & push
│       │   │   └── export/                # PDF compilation & CSV tax export
│       │   ├── types/                     # Shared TypeScript data models
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages/
│   ├── mcp-server/                        # Model Context Protocol JSON-RPC Server
│   │   ├── src/
│   │   │   ├── tools/                     # policy_lookup & claim_dossier_generate
│   │   │   ├── schemas/                   # Zod schemas conforming to Draft-07
│   │   │   ├── server.ts                  # stdio & SSE transport orchestration
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── policy-wiki/                       # Curated Ground-Truth Knowledge Base
│       ├── data/                          # Seed JSON for top 20 student brands
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── docs/                                  # Member D Technical Documentation Suite
│   ├── ARCHITECTURE.md                    # DOC-D1: Full-Stack TDD
│   ├── MEDIA_PIPELINES_SPEC.md            # DOC-D2: Two Purposeful Media Formats
│   ├── QA_TEST_PLAN.md                    # DOC-D3: Test Strategy & Gherkin Matrix
│   ├── MCP_SERVER_SPEC.md                 # DOC-D4: JSON-RPC AI Platform Spec
│   └── ENGINEERING_WORKFLOW.md            # DOC-D5: CI/CD & DoD Gating
├── .github/
│   └── workflows/
│       └── ci.yml                         # GitHub Actions Continuous Integration
├── package.json                           # Root workspace definition
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## 2. Git Branching Strategy & PR Review Governance

In alignment with the official course project board (SRH Slide 29):
$$\mathbf{[Backlog]} \longrightarrow \mathbf{[Ready]} \longrightarrow \mathbf{[In\ Progress\ (WIP\le 2)]} \longrightarrow \mathbf{[Review]} \longrightarrow \mathbf{[Done]}$$

### 2.1 Branch Protection Rules
- Direct pushes to `main` are strictly forbidden.
- Feature branches follow standard semantic naming:
  - `feat/story-1-manual-entry`
  - `feat/story-2-receipt-vault`
  - `feat/story-3-dst-alarms`
  - `feat/story-5-claim-pdf-generator`
  - `feat/story-7-mcp-server`
  - `fix/safari-touch-zoom`

### 2.2 Pull Request Sign-Off Protocol
Every PR requires at least two affirmative reviews before merging to `main`:
1. **Member D (Development & Quality/Media Lead):** Code architecture review, TypeScript strictness, zero ESLint warnings, test coverage delta ($\ge 75\%$), and memory leak prevention (Blob cleanup).
2. **Member B (UX/UI Lead):** Mobile responsive layout verification (375px viewport), touch target sizing ($\ge 48\times 48\text{px}$), and WCAG 2.1 AA accessibility checks.

---

## 3. Continuous Integration (GitHub Actions `ci.yml`)

Every pull request and push to `main` triggers our automated validation pipeline:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    name: Code Hygiene, Tests & Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js & pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript Compilation Check (Zero Errors)
        run: pnpm run typecheck

      - name: ESLint Code Hygiene Check
        run: pnpm run lint

      - name: Vitest Unit & Integration Test Suite (Coverage >= 75%)
        run: pnpm run test:coverage

      - name: MCP Schema Validation Test Suite
        run: pnpm --filter @warranty-wallet/mcp-server test

      - name: Production Bundle Build Verification
        run: pnpm run build
```

---

## 4. Local Development Quickstart

```bash
# 1. Install root workspace dependencies
pnpm install

# 2. Run the client-side PWA development server (Vite on http://localhost:5173)
pnpm --filter @warranty-wallet/web dev

# 3. Launch the Model Context Protocol (MCP) server in inspection mode
pnpm --filter @warranty-wallet/mcp-server start

# 4. Execute the full test suite with coverage report
pnpm test:coverage

# 5. Build all packages for production deployment
pnpm build
```

---

## 5. Session 5 Definition of Done (DoD) Sign-Off Gate

| Item # | Verification Criteria | Status | Gatekeeper |
| :---: | :--- | :---: | :--- |
| **1** | Full 4-stage pipeline (**Capture $\to$ Store $\to$ Alert $\to$ Claim**) functional across 6 views | **VERIFIED** | Member D & Member B |
| **2** | Both Purposeful Media Formats integrated (Receipt Vault & Vector Claim PDF) | **VERIFIED** | Member D (Media Lead) |
| **3** | Manual entry stopwatch test passes in $< 15\text{ seconds}$ | **VERIFIED** | Member B (UX Lead) |
| **4** | 100% of Must-Have Gherkin acceptance criteria verified via automated tests | **VERIFIED** | Member D (Quality Lead) |
| **5** | Code coverage strictly $\ge 75\%$ with zero TypeScript compiler errors | **VERIFIED** | Member D (Dev Lead) |
| **6** | MCP server tools (`policy_lookup`, `claim_dossier_generate`) validated against Zod schemas | **VERIFIED** | Member D & Member A |
| **7** | Mandatory LexFox (BGH VIII ZR 285/18), RDG §§ 2, 3, and StBerG § 2 disclaimers present | **VERIFIED** | Member C (Legal Lead) |
