# Technical Design Document (TDD): Warranty & Subscription Wallet

**Project:** Warranty & Subscription Wallet  
**Institution:** SRH University — Computer & Media Lab (Milestone 5)  
**Author:** Member D — *Development & Quality/Media Lead* (in collaboration with Members A, B, C)  
**Document Version:** 1.0.0  
**Status:** Production Baseline  
**Target Environment:** EU-Central (Frankfurt `eu-central-1`), Kubernetes / Cloud Run, PostgreSQL 16, S3/MinIO Encrypted Vault  

---

## 1. Executive Summary & Architectural Goals

### 1.1 Problem Statement
European consumers lose hundreds of euros annually due to forgotten subscription renewals, faded thermal paper receipts, and missed statutory warranty windows (*Gewährleistung* under § 437 BGB in Germany / EU Directive 2019/771, alongside commercial manufacturer guarantees). Existing solutions either require invasive bank account scraping (PSD2 privacy trade-offs) or manual spreadsheet entry that users abandon within weeks.

### 1.2 Solution Overview
The **Warranty & Subscription Wallet** is a privacy-first, offline-capable Progressive Web & Mobile Application (PWA / Capacitor) paired with an intelligent media processing backend. Users capture physical or digital receipts via camera, PDF upload, or email forwarding; the system sanitizes, enhances, and encrypts the receipt media, extracts structured warranty and subscription metadata via a hybrid OCR + Vision-Language Model (VLM) pipeline, schedules proactive multi-channel renewal/expiry reminders, generates legally formatted **Warranty Claim PDF Dossiers**, and exposes a secure **Model Context Protocol (MCP) Server** for conversational AI workflows.

### 1.3 Core Architectural Goals & Non-Functional Requirements (NFRs)

| Goal Category | Architectural Principle | Target Service Level Objective (SLO) / Metric |
| :--- | :--- | :--- |
| **1. Privacy-First & GDPR Native** | Zero bank-credential scraping; envelope encryption (AES-256-GCM) for all receipt blobs; strict EU data residency; deterministic PII redaction prior to external VLM calls; instant cryptographic erasure (GDPR Art. 17). | $100\%$ of receipt blobs encrypted with per-asset DEKs; Account erasure completed in $< 60\text{ s}$. |
| **2. Offline-First Resilience** | Local IndexedDB + Encrypted OPFS cache on client devices allows viewing active warranties, barcodes, and cached receipt proofs inside retail stores with zero cellular reception. | Core wallet read & claim QR display functional at $0\text{ Mbps}$ connectivity; background sync conflict resolution via Hybrid Logical Clocks (HLC). |
| **3. High-Accuracy Media & OCR Pipeline** | Computer-vision pre-processing (EXIF stripping, perspective deskew, CLAHE contrast normalization, pHash deduplication) feeds a two-stage OCR + structured VLM extractor with field-level confidence scoring. | Receipt pre-processing $< 800\text{ ms}$ (p95); End-to-end OCR/VLM extraction $< 3.8\text{ s}$ (p95); Field F1 score $\ge 0.92$ on German/English receipts. |
| **4. Deterministic Legal Document Output** | Server-side PDF/A-1b synthesis engine produces tamper-evident warranty claim dossiers embedding statutory consumer rights citations, defect evidence, and high-DPI receipt proof. | Claim PDF generation latency $< 1.5\text{ s}$ (p95); $100\%$ PDF/A-1b archival validation compliance. |
| **5. AI & Agent Interoperability (MCP)** | Standardized Model Context Protocol (MCP) server enables users to query their wallet, forecast subscription burn rates, and draft claim notices safely from local or enterprise AI assistants. | JSON-RPC 2.0 MCP tool execution $< 350\text{ ms}$ (p95); zero raw PII leakage in unauthenticated prompts. |
| **6. High Availability & Observability** | Stateless horizontal scaling for API and media workers; idempotent mutation endpoints; distributed OpenTelemetry tracing and Prometheus metrics. | System availability $\ge 99.9\%$; Core CRUD API latency $< 120\text{ ms}$ (p95). |

---

## 2. High-Level System Architecture

### 2.1 System Context & Container Topology

The system follows a **Modular Service-Oriented Architecture (SOA)** deployed as containerized workloads behind an API Gateway, separating synchronous low-latency user transactions from CPU/GPU-intensive asynchronous media and OCR pipelines.

```mermaid
flowchart TD
    subgraph Clients["Client Tier (Offline-Capable)"]
        PWA["Mobile & Web PWA\n(Next.js 15 / React 19 / IndexedDB)"]
        Scanner["Client Camera & WebAssembly Scanner\n(Live Edge Detection & Barcode Reader)"]
        MCPHost["AI Assistant / MCP Host\n(Claude Desktop / IDE / Local Agent)"]
    end

    subgraph Edge["API Gateway & Edge Security Tier"]
        WAF["Cloudflare / Envoy WAF & Rate Limiter\n(TLS 1.3, DDoS Protection)"]
        APIGW["API Gateway & Auth Proxy\n(OAuth2 / OIDC, WebAuthn Passkeys, JWT)"]
    end

    subgraph CoreServices["Core Application Services Tier (Node.js / TypeScript & Python)"]
        WarrantySvc["Warranty Lifecycle Service\n(Statutory § 437 BGB & Commercial Rules)"]
        SubSvc["Subscription Tracker Service\n(Billing Cycles, Burn Rate, Price Hike Detection)"]
        ClaimSvc["Claim PDF Generator Service\n(PDF/A-1b Renderer, QR Seal, Legal Templates)"]
        NotifySvc["Notification & Reminder Engine\n(BullMQ Scheduler, WebPush, Email, CalDAV/iCal)"]
        MCPSvc["MCP Server Interface\n(warranty-wallet-mcp: Tools, Resources, Prompts)"]
    end

    subgraph MediaPipeline["Receipt Media Ingestion & AI Pipeline (Async Workers)"]
        IngestAPI["Presigned Upload & Virus/Magic-Byte Gate"]
        Queue[["Redis / BullMQ Event Bus &\nJob Queue (Streams)"]]
        CVWorker["Media Pre-Processing Worker (Python/OpenCV)\n(EXIF Strip, Deskew, CLAHE, WebP Pyramid, pHash)"]
        OCRWorker["Hybrid OCR & VLM Extraction Worker\n(PaddleOCR + Structured LLM / JSON Schema)"]
    end

    subgraph DataTier["Persistence & Cryptographic Storage Tier (EU-Central)"]
        PG[("PostgreSQL 16 Primary + Read Replica\n(Relational Entities, JSONB, pgvector)")]
        Vault[("Encrypted S3 / MinIO Object Vault\n(AES-256-GCM Receipt Masters & Claim PDFs)")]
        KMS["HashiCorp Vault / AWS KMS\n(Envelope Encryption KEK Store)"]
        RedisCache[("Redis 7 Cluster\n(Idempotency Keys, Rate Limits, Job State)")]
    end

    PWA <-->|"HTTPS / REST + SSE"| WAF
    Scanner -->|"Cropped Frame / Multipart"| PWA
    MCPHost <-->|"MCP (Stdio / Streamable HTTP + OAuth)"| WAF
    WAF --> APIGW

    APIGW --> WarrantySvc
    APIGW --> SubSvc
    APIGW --> ClaimSvc
    APIGW --> NotifySvc
    APIGW --> IngestAPI
    APIGW --> MCPSvc

    IngestAPI -->|"1. Encrypt DEK via KMS"| KMS
    IngestAPI -->|"2. Store Raw Encrypted Blob"| Vault
    IngestAPI -->|"3. Enqueue Media Job"| Queue

    Queue --> CVWorker
    CVWorker <-->|"Read/Write Derivatives"| Vault
    CVWorker -->|"Enqueue Normalized Tensor"| Queue
    Queue --> OCRWorker
    OCRWorker -->|"Write Extracted Fields & Confidence"| PG
    OCRWorker -->|"Publish SSE Progress"| RedisCache

    WarrantySvc <--> PG
    SubSvc <--> PG
    ClaimSvc <--> PG
    ClaimSvc <-->|"Fetch Decrypted Receipt & Store PDF"| Vault
    ClaimSvc <--> KMS
    NotifySvc <--> PG
    NotifySvc <--> RedisCache
    MCPSvc <-->|"Scoped Read / Draft Calls"| WarrantySvc
    MCPSvc <-->|"Scoped Read / Analytics"| SubSvc
    MCPSvc <-->|"Trigger Claim Draft"| ClaimSvc
```

### 2.2 Component Responsibilities

1. **Client Tier (Mobile/Web PWA):**
   - Built with **Next.js 15 (App Router) / React 19** and **TypeScript**, packaged with Service Workers and **Dexie.js (IndexedDB)** for offline read/write queueing.
   - Includes a client-side lightweight **WebAssembly boundary detector** to guide the user's camera frame over physical receipts before upload, reducing server-side OCR errors.
2. **API Gateway & Auth Proxy:**
   - Terminates TLS 1.3, enforces strict token bucket rate limits, validates `Idempotency-Key` headers against Redis, and authenticates users via **WebAuthn/Passkeys** or OAuth2/OIDC with short-lived JWT access tokens ($15\text{ min}$) and rotated HTTP-only refresh tokens.
3. **Warranty Lifecycle Service:**
   - Manages product warranties, automatically computing dual tracks for European consumers:
     - **Statutory Warranty (*Gesetzliche Gewährleistung*):** Automatically defaults to 24 months from purchase/delivery date for new goods in the EU/Germany (12 months for refurbished goods if contractually agreed), including the 12-month burden-of-proof reversal milestone (*Beweislastumkehr* under § 477 BGB).
     - **Commercial Guarantee (*Herstellergarantie / AppleCare / Extended Protection*):** Tracks custom durations, deductibles, and provider claim portals.
4. **Subscription Tracker Service:**
   - Tracks recurring digital and physical subscriptions (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `BIANNUAL`, `YEARLY`), trial conversion dates, notice periods (*Kündigungsfrist*, e.g., German Fair Consumer Contracts Act — max 1-month notice after initial term), multi-currency normalization (ECB exchange rates to EUR), and monthly/annual burn-rate analytics.
5. **Receipt Media Ingestion Pipeline (CV + OCR/VLM Workers):**
   - Isolated Python 3.12 microservices consuming jobs from Redis/BullMQ.
   - **Stage 1 (Media Pre-processing):** Validates MIME magic bytes, strips all EXIF/GPS metadata, converts PDFs to 300 DPI images via `pypdfium2`, runs OpenCV contour detection + 4-point perspective transform (deskew), applies CLAHE adaptive histogram equalization for faded thermal paper, generates a 400px WebP thumbnail, and computes SHA-256 + 64-bit `pHash`.
   - **Stage 2 (Hybrid OCR & VLM Extraction):** Runs **PaddleOCR (DE/EN models)** for fast layout-aware text extraction and bounding boxes, followed by a structured schema extraction pass (via local **Qwen2.5-VL / Llama-3.2-Vision** or zero-retention EU-hosted Gemini 2.5 Flash / GPT-4o-mini with strict JSON Schema output) after regex/NER redaction of IBANs and payment card PANs.
6. **Claim PDF Generator Service:**
   - Synthesizes a formal **Warranty Claim Dossier (PDF/A-1b)** using WeasyPrint / ReportLab. Embeds structured product & defect metadata, formal legal notice text in German or English citing § 437 / § 439 BGB (repair or replacement demand — *Nacherfüllung*), high-resolution receipt proof with bounding-box highlights around the relevant line item, and a cryptographic SHA-256 verification footer.
7. **Notification & Reminder Engine:**
   - Evaluates scheduled triggers via BullMQ repeatable jobs and time-zone aware cron workers. Dispatches reminders at configurable lead times (e.g., 30 days, 14 days, 7 days, and 2 days before warranty expiry or subscription cancellation deadline) via Web Push (VAPID), transactional email (EU-hosted Postmark/SES), and subscribable encrypted **iCal / CalDAV feeds**.
8. **MCP Server Interface (`warranty-wallet-mcp`):**
   - Implements the **Model Context Protocol (2025-03-26 spec)** over Streamable HTTP and stdio transports, allowing authorized AI assistants to inspect wallet summaries, detect duplicate subscriptions, check whether a broken appliance is still under warranty, and trigger a draft warranty claim PDF.

---

## 3. Technology Stack & Justification Matrix

Every technology choice is evaluated against SRH Computer & Media Lab engineering criteria: type safety, media processing performance, EU compliance, and operational simplicity.

| Layer / Domain | Selected Technology | Alternatives Considered | Engineering Justification |
| :--- | :--- | :--- | :--- |
| **Frontend / Client** | **Next.js 15 (React 19), TypeScript 5.x, Tailwind CSS, Dexie.js (IndexedDB)** | Flutter, React Native, Vue/Nuxt | Single codebase delivering desktop web + installable mobile PWA; native WebAssembly support for camera receipt framing; Dexie.js enables deterministic offline caching of warranties and receipt thumbnails. |
| **Core API Backend** | **Node.js 22 LTS + Fastify + TypeScript + Zod** | Go (Gin), Spring Boot, NestJS | Fastify provides near-Go HTTP throughput ($>45\text{k req/s}$) with native JSON Schema / OpenAPI 3.1 code generation and end-to-end TypeScript schema sharing (`Zod`) with the frontend and MCP server. |
| **Media & OCR Workers** | **Python 3.12 + OpenCV + PyMuPDF/pypdfium2 + PaddleOCR + Pydantic** | Node.js Sharp + Tesseract.js | Python is the undisputed industry standard for computer vision and document AI. OpenCV + PaddleOCR vastly outperform Tesseract on skewed, creased German thermal receipts. |
| **Structured Extraction** | **Hybrid: PaddleOCR + Structured VLM (Gemini 2.5 Flash EU / Local Qwen2.5-VL)** | Pure Regex, AWS Textract | Pure regex fails on varied merchant layouts; cloud OCR alone misses warranty duration semantics (e.g., *"3 Jahre Herstellergarantie"*). Hybrid OCR+VLM with Pydantic JSON Schema enforcement achieves $>92\%$ F1 at minimal cost. |
| **Claim PDF Engine** | **WeasyPrint + Pikepdf (PDF/A-1b Compliance)** | Puppeteer (Headless Chrome), PDFKit | Headless Chrome consumes $>500\text{ MB}$ RAM per worker and does not natively emit archival PDF/A-1b metadata. WeasyPrint + Pikepdf generates print-grade CSS Paged Media PDFs in $<400\text{ ms}$ with strict archival profiles. |
| **Primary Database** | **PostgreSQL 16 (with `pgcrypto`, `pg_trgm`, `pgvector`)** | MongoDB, MySQL, DynamoDB | ACID transactions for financial/subscription tracking, rich `JSONB` indexing for variable OCR payloads, `pg_trgm` for fuzzy merchant search, and `pgvector` for semantic product/receipt search via MCP. |
| **Async Queue & Cache** | **Redis 7 + BullMQ** | RabbitMQ, Apache Kafka | Kafka is operationally heavy for this scale. Redis 7 + BullMQ provides atomic delayed jobs (ideal for subscription renewal reminders), dead-letter queues (DLQ), job retries with exponential backoff, and SSE pub/sub. |
| **Object Storage & KMS** | **MinIO / AWS S3 (`eu-central-1`) + HashiCorp Vault / KMS** | Database BLOBs, Firebase Storage | Storing 10 MB receipts in PostgreSQL bloats WAL logs and backups. S3-compatible object storage with server-side + application-level AES-256-GCM envelope encryption guarantees zero-trust durability. |
| **Testing & QA Stack** | **Vitest, Cucumber.js (BDD), Playwright, Testcontainers, k6** | Jest, Cypress, JMeter | Vitest is 4x faster than Jest; Testcontainers spins up real ephemeral PostgreSQL + MinIO + Redis instances in CI; Playwright tests real mobile camera/upload viewports; k6 scripts load scenarios in TypeScript. |

---

## 4. Data Architecture & Entity-Relationship Diagram

### 4.1 Entity-Relationship Diagram (Mermaid `erDiagram`)

```mermaid
erDiagram
    USERS ||--o{ WARRANTIES : "owns"
    USERS ||--o{ SUBSCRIPTIONS : "tracks"
    USERS ||--o{ RECEIPT_MEDIA_ASSETS : "uploads"
    USERS ||--o{ WARRANTY_CLAIMS : "files"
    USERS ||--o{ NOTIFICATION_SCHEDULES : "receives"
    USERS ||--o{ AUDIT_LOGS : "generates"

    RECEIPT_MEDIA_ASSETS ||--o{ WARRANTIES : "proves_purchase"
    RECEIPT_MEDIA_ASSETS ||--o{ SUBSCRIPTIONS : "proves_billing"
    WARRANTIES ||--o{ WARRANTY_CLAIMS : "has_claims"
    RECEIPT_MEDIA_ASSETS ||--o{ WARRANTY_CLAIMS : "attached_to"
    WARRANTIES ||--o{ NOTIFICATION_SCHEDULES : "triggers_expiry_alert"
    SUBSCRIPTIONS ||--o{ NOTIFICATION_SCHEDULES : "triggers_renewal_alert"

    USERS {
        uuid id PK
        varchar email UK
        varchar display_name
        char locale
        char preferred_currency
        uuid kms_master_key_ref
        timestamptz gdpr_consent_at
        timestamptz deleted_at
        timestamptz created_at
    }

    RECEIPT_MEDIA_ASSETS {
        uuid id PK
        uuid user_id FK
        varchar storage_bucket
        varchar storage_object_key UK
        varchar thumbnail_object_key
        varchar original_mime_type
        bigint byte_size
        char sha256_checksum
        bigint phash_64
        bytea encrypted_dek
        bytea encryption_iv
        bytea encryption_auth_tag
        varchar processing_status
        numeric ocr_confidence_score
        jsonb extracted_payload
        timestamptz created_at
    }

    WARRANTIES {
        uuid id PK
        uuid user_id FK
        uuid primary_receipt_id FK
        varchar product_name
        varchar brand_name
        varchar model_number
        varchar serial_number
        varchar category
        varchar merchant_name
        numeric purchase_price
        char currency
        date purchase_date
        date delivery_date
        date statutory_warranty_end_date
        date burden_of_proof_reversal_date
        date commercial_guarantee_end_date
        varchar commercial_guarantee_provider
        varchar status
        jsonb metadata
        timestamptz created_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        uuid latest_receipt_id FK
        varchar service_name
        varchar provider_name
        varchar category
        numeric billing_amount
        char currency
        numeric normalized_monthly_eur
        varchar billing_interval
        date start_date
        date trial_end_date
        date next_billing_date
        int cancellation_notice_days
        date latest_cancellation_date
        varchar cancellation_url
        varchar status
        timestamptz created_at
    }

    WARRANTY_CLAIMS {
        uuid id PK
        uuid user_id FK
        uuid warranty_id FK
        uuid receipt_asset_id FK
        varchar claim_reference_code UK
        varchar claim_type
        varchar legal_remedy_requested
        text defect_description
        date defect_observed_date
        varchar pdf_object_key
        char pdf_sha256_seal
        varchar status
        timestamptz generated_at
        timestamptz submitted_at
    }

    NOTIFICATION_SCHEDULES {
        uuid id PK
        uuid user_id FK
        uuid warranty_id FK
        uuid subscription_id FK
        varchar notification_type
        varchar channel
        timestamptz scheduled_for
        int lead_time_days
        varchar idempotency_key UK
        varchar delivery_status
        timestamptz sent_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar actor_type
        varchar action
        varchar target_entity_type
        uuid target_entity_id
        inet client_ip_masked
        jsonb diff_metadata
        timestamptz occurred_at
    }
```

### 4.2 Production PostgreSQL 16 DDL Schema

The following SQL DDL defines the complete relational schema, including custom enums, check constraints, foreign key cascades for GDPR compliance, trigram indexes for search, and partial indexes for active reminder scheduling.

```sql
-- ============================================================================
-- PostgreSQL 16 Schema: Warranty & Subscription Wallet (Milestone 5)
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- Custom Enumerated Types
-- ============================================================================
CREATE TYPE media_processing_status AS ENUM (
    'UPLOADED',
    'PREPROCESSING',
    'OCR_EXTRACTING',
    'AWAITING_CONFIRMATION',
    'VERIFIED',
    'FAILED_UNREADABLE',
    'QUARANTINED'
);

CREATE TYPE warranty_status AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',
    'CLAIM_IN_PROGRESS',
    'EXPIRED',
    'ARCHIVED'
);

CREATE TYPE billing_interval_type AS ENUM (
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'BIANNUAL',
    'YEARLY',
    'CUSTOM_DAYS'
);

CREATE TYPE subscription_status AS ENUM (
    'TRIAL',
    'ACTIVE',
    'PAUSED',
    'CANCELLATION_PENDING',
    'CANCELLED'
);

CREATE TYPE claim_type_enum AS ENUM (
    'STATUTORY_GEWAEHRLEISTUNG',
    'COMMERCIAL_HERSTELLERGARANTIE',
    'EXTENDED_INSURANCE'
);

CREATE TYPE claim_remedy_enum AS ENUM (
    'REPAIR_NACHBESSERUNG',
    'REPLACEMENT_ERSATZLIEFERUNG',
    'PRICE_REDUCTION_MINDERUNG',
    'RESCISSION_RUECKTRITT'
);

CREATE TYPE claim_status_enum AS ENUM (
    'DRAFT',
    'PDF_GENERATED',
    'SUBMITTED_TO_MERCHANT',
    'APPROVED',
    'REJECTED',
    'RESOLVED'
);

CREATE TYPE notification_channel_enum AS ENUM (
    'WEB_PUSH',
    'EMAIL',
    'ICAL_FEED',
    'IN_APP'
);

CREATE TYPE notification_delivery_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED_RETRYING',
    'DEAD_LETTER',
    'CANCELLED'
);

-- ============================================================================
-- 1. Table: users
-- ============================================================================
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password_hash           TEXT, -- Nullable for pure WebAuthn/Passkey or OAuth accounts
    display_name            VARCHAR(120) NOT NULL,
    locale                  CHAR(5) NOT NULL DEFAULT 'de-DE',
    timezone                VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',
    preferred_currency      CHAR(3) NOT NULL DEFAULT 'EUR',
    kms_key_alias           VARCHAR(128) NOT NULL, -- Pointer to user's KEK for crypto-shredding
    ical_feed_token_hash    CHAR(64) UNIQUE,
    gdpr_consent_version    VARCHAR(32) NOT NULL,
    gdpr_consent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at           TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ, -- Soft-delete marker prior to async crypto-shred completion
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. Table: receipt_media_assets
-- ============================================================================
CREATE TABLE receipt_media_assets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_bucket          VARCHAR(128) NOT NULL,
    storage_object_key      VARCHAR(512) NOT NULL UNIQUE,
    thumbnail_object_key    VARCHAR(512),
    original_filename       VARCHAR(255) NOT NULL,
    original_mime_type      VARCHAR(64) NOT NULL,
    byte_size               BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 15728640), -- Max 15 MB
    page_count              INT NOT NULL DEFAULT 1 CHECK (page_count >= 1),
    sha256_checksum         CHAR(64) NOT NULL,
    phash_64                BIGINT, -- 64-bit DCT perceptual hash for near-duplicate detection
    -- Envelope Encryption Metadata (AES-256-GCM)
    encrypted_dek           BYTEA NOT NULL, -- Data Encryption Key wrapped by KMS KEK
    encryption_iv           BYTEA NOT NULL, -- 12-byte GCM initialization vector
    encryption_auth_tag     BYTEA NOT NULL, -- 16-byte GCM authentication tag
    exif_stripped           BOOLEAN NOT NULL DEFAULT TRUE CHECK (exif_stripped = TRUE),
    -- OCR & VLM Pipeline State
    processing_status       media_processing_status NOT NULL DEFAULT 'UPLOADED',
    ocr_engine_version      VARCHAR(64),
    ocr_confidence_score    NUMERIC(4, 3) CHECK (ocr_confidence_score >= 0.000 AND ocr_confidence_score <= 1.000),
    extracted_payload       JSONB NOT NULL DEFAULT '{}'::jsonb, -- Structured merchant, items, tax, raw bounding boxes
    embedding               VECTOR(768), -- Semantic embedding for MCP natural language search
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipts_user_status ON receipt_media_assets (user_id, processing_status);
CREATE INDEX idx_receipts_user_sha256 ON receipt_media_assets (user_id, sha256_checksum);
CREATE INDEX idx_receipts_user_phash ON receipt_media_assets (user_id, phash_64) WHERE phash_64 IS NOT NULL;
CREATE INDEX idx_receipts_extracted_gin ON receipt_media_assets USING GIN (extracted_payload);

-- ============================================================================
-- 3. Table: warranties
-- ============================================================================
CREATE TABLE warranties (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    primary_receipt_id                  UUID REFERENCES receipt_media_assets(id) ON DELETE SET NULL,
    product_name                        VARCHAR(255) NOT NULL,
    brand_name                          VARCHAR(128),
    model_number                        VARCHAR(128),
    serial_number                       VARCHAR(128),
    ean_gtin                            VARCHAR(32),
    category                            VARCHAR(64) NOT NULL DEFAULT 'ELECTRONICS',
    merchant_name                       VARCHAR(255) NOT NULL,
    merchant_address                    TEXT,
    merchant_contact_email              VARCHAR(255),
    purchase_price                      NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    currency                            CHAR(3) NOT NULL DEFAULT 'EUR',
    purchase_date                       DATE NOT NULL,
    delivery_date                       DATE NOT NULL,
    is_used_or_refurbished              BOOLEAN NOT NULL DEFAULT FALSE,
    -- Statutory EU / German Consumer Law (§ 437 / § 438 / § 477 BGB)
    statutory_warranty_months           INT NOT NULL DEFAULT 24 CHECK (statutory_warranty_months >= 0),
    statutory_warranty_end_date         DATE NOT NULL,
    burden_of_proof_reversal_date       DATE NOT NULL, -- Typically delivery_date + 12 months under § 477 BGB
    -- Commercial Guarantee (Herstellergarantie)
    has_commercial_guarantee            BOOLEAN NOT NULL DEFAULT FALSE,
    commercial_guarantee_months         INT DEFAULT 0 CHECK (commercial_guarantee_months >= 0),
    commercial_guarantee_end_date       DATE,
    commercial_guarantee_provider       VARCHAR(255),
    commercial_guarantee_terms_url      TEXT,
    status                              warranty_status NOT NULL DEFAULT 'ACTIVE',
    notes                               TEXT,
    metadata                            JSONB NOT NULL DEFAULT '{}'::jsonb,
    version                             INT NOT NULL DEFAULT 1, -- Optimistic concurrency control
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_warranty_dates CHECK (delivery_date >= purchase_date),
    CONSTRAINT chk_statutory_end CHECK (statutory_warranty_end_date >= delivery_date)
);

CREATE INDEX idx_warranties_user_status ON warranties (user_id, status);
CREATE INDEX idx_warranties_expiry ON warranties (statutory_warranty_end_date, commercial_guarantee_end_date)
    WHERE status IN ('ACTIVE', 'EXPIRING_SOON');
CREATE INDEX idx_warranties_search_trgm ON warranties USING GIN (
    (product_name || ' ' || COALESCE(brand_name, '') || ' ' || merchant_name) gin_trgm_ops
);

-- ============================================================================
-- 4. Table: subscriptions
-- ============================================================================
CREATE TABLE subscriptions (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latest_receipt_id               UUID REFERENCES receipt_media_assets(id) ON DELETE SET NULL,
    service_name                    VARCHAR(255) NOT NULL,
    provider_name                   VARCHAR(255) NOT NULL,
    plan_tier                       VARCHAR(128),
    category                        VARCHAR(64) NOT NULL DEFAULT 'SOFTWARE_SAAS',
    billing_amount                  NUMERIC(12, 2) NOT NULL CHECK (billing_amount >= 0),
    currency                        CHAR(3) NOT NULL DEFAULT 'EUR',
    normalized_monthly_eur          NUMERIC(12, 2) NOT NULL CHECK (normalized_monthly_eur >= 0),
    billing_interval                billing_interval_type NOT NULL DEFAULT 'MONTHLY',
    custom_interval_days            INT CHECK (custom_interval_days IS NULL OR custom_interval_days > 0),
    start_date                      DATE NOT NULL,
    trial_end_date                  DATE,
    next_billing_date               DATE NOT NULL,
    cancellation_notice_days        INT NOT NULL DEFAULT 30 CHECK (cancellation_notice_days >= 0),
    latest_cancellation_date        DATE NOT NULL, -- Computed: next_billing_date - cancellation_notice_days
    auto_renews                     BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_url                TEXT,
    payment_method_label            VARCHAR(64), -- e.g., "Visa •••• 4242" or "PayPal" (Never full PAN)
    status                          subscription_status NOT NULL DEFAULT 'ACTIVE',
    metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
    version                         INT NOT NULL DEFAULT 1,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sub_cancellation_date CHECK (latest_cancellation_date <= next_billing_date)
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions (next_billing_date, latest_cancellation_date)
    WHERE status IN ('TRIAL', 'ACTIVE');

-- ============================================================================
-- 5. Table: warranty_claims
-- ============================================================================
CREATE TABLE warranty_claims (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warranty_id                 UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
    receipt_asset_id            UUID NOT NULL REFERENCES receipt_media_assets(id) ON DELETE RESTRICT,
    claim_reference_code        VARCHAR(32) NOT NULL UNIQUE, -- e.g., "WSW-2026-8F92A"
    claim_type                  claim_type_enum NOT NULL DEFAULT 'STATUTORY_GEWAEHRLEISTUNG',
    legal_remedy_requested      claim_remedy_enum NOT NULL DEFAULT 'REPAIR_NACHBESSERUNG',
    defect_description          TEXT NOT NULL,
    defect_observed_date        DATE NOT NULL,
    claim_language              CHAR(5) NOT NULL DEFAULT 'de-DE',
    recipient_name              VARCHAR(255) NOT NULL,
    recipient_address           TEXT,
    recipient_email             VARCHAR(255),
    pdf_storage_bucket          VARCHAR(128),
    pdf_object_key              VARCHAR(512),
    pdf_sha256_seal             CHAR(64), -- Cryptographic integrity hash of generated PDF/A-1b
    encrypted_pdf_dek           BYTEA,
    encryption_pdf_iv           BYTEA,
    encryption_pdf_auth_tag     BYTEA,
    status                      claim_status_enum NOT NULL DEFAULT 'DRAFT',
    generated_at                TIMESTAMPTZ,
    submitted_at                TIMESTAMPTZ,
    resolved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_user_warranty ON warranty_claims (user_id, warranty_id);

-- ============================================================================
-- 6. Table: notification_schedules
-- ============================================================================
CREATE TABLE notification_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warranty_id         UUID REFERENCES warranties(id) ON DELETE CASCADE,
    subscription_id     UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    notification_type   VARCHAR(64) NOT NULL, -- e.g., 'WARRANTY_EXPIRY_30D', 'SUB_CANCEL_DEADLINE_7D', 'PROOF_REVERSAL_14D'
    channel             notification_channel_enum NOT NULL DEFAULT 'WEB_PUSH',
    scheduled_for       TIMESTAMPTZ NOT NULL,
    lead_time_days      INT NOT NULL CHECK (lead_time_days >= 0),
    idempotency_key     VARCHAR(160) NOT NULL UNIQUE, -- Format: "{entity_id}:{notification_type}:{channel}:{target_date}"
    delivery_status     notification_delivery_status NOT NULL DEFAULT 'PENDING',
    retry_count         INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_single_target_entity CHECK (
        (warranty_id IS NOT NULL AND subscription_id IS NULL) OR
        (warranty_id IS NULL AND subscription_id IS NOT NULL)
    )
);

CREATE INDEX idx_notifications_pending_schedule ON notification_schedules (scheduled_for)
    WHERE delivery_status IN ('PENDING', 'FAILED_RETRYING');
CREATE INDEX idx_notifications_user ON notification_schedules (user_id, scheduled_for DESC);

-- ============================================================================
-- 7. Table: audit_logs
-- ============================================================================
CREATE TABLE audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type          VARCHAR(32) NOT NULL, -- 'USER', 'SYSTEM_WORKER', 'MCP_AGENT'
    actor_identifier    VARCHAR(128) NOT NULL, -- Session ID, Worker Name, or MCP Client ID
    action              VARCHAR(64) NOT NULL, -- e.g., 'RECEIPT_DECRYPTED', 'CLAIM_PDF_EXPORTED', 'GDPR_ERASURE_EXECUTED'
    target_entity_type  VARCHAR(64) NOT NULL,
    target_entity_id    UUID,
    client_ip_masked    INET, -- Anonymized to /24 (IPv4) or /48 (IPv6) for GDPR compliance
    diff_metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_time ON audit_logs (user_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_action_time ON audit_logs (action, occurred_at DESC);
```

---

## 5. Core Workflows & Sequence Diagrams

### 5.1 Receipt Media Lifecycle State Machine

Every uploaded receipt transitions through a deterministic state machine managed by the Media Ingestion Pipeline and user confirmation flow.

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : "1. Presigned Upload Complete + Magic-Byte Validated"
    UPLOADED --> QUARANTINED : "Malicious Payload / Invalid Header"
    UPLOADED --> PREPROCESSING : "2. CV Worker Dequeues Job"
    PREPROCESSING --> OCR_EXTRACTING : "3. EXIF Stripped, Deskewed, CLAHE, pHash Computed"
    PREPROCESSING --> FAILED_UNREADABLE : "Corrupt Stream / Zero Contrast"
    OCR_EXTRACTING --> AWAITING_CONFIRMATION : "4. PaddleOCR + VLM JSON Extracted (Confidence Scored)"
    OCR_EXTRACTING --> FAILED_UNREADABLE : "OCR Timeout / No Text Detected"
    AWAITING_CONFIRMATION --> VERIFIED : "5. User Confirms / Edits Extracted Warranty or Subscription"
    FAILED_UNREADABLE --> AWAITING_CONFIRMATION : "Manual Entry Fallback Linked to Image"
    VERIFIED --> [*]
```

### 5.2 Workflow 1: Receipt Upload -> Media Pre-processing -> OCR/VLM Extraction -> User Confirmation

```mermaid
sequenceDiagram
    autonumber
    actor User as "User (PWA Client)"
    participant API as "API Gateway & Ingest Service"
    participant KMS as "KMS / Vault (KEK)"
    participant S3 as "Encrypted S3/MinIO Vault"
    participant Queue as "Redis / BullMQ + SSE"
    participant CV as "CV Media Worker (OpenCV)"
    participant OCR as "OCR & VLM Worker"
    participant DB as "PostgreSQL 16"

    User->>API: POST /api/v1/receipts/upload (Multipart + Idempotency-Key)
    API->>API: Validate Magic Bytes (JPEG/PNG/WEBP/PDF <= 15MB)
    API->>API: Strip EXIF/GPS Metadata in-memory before persistence
    API->>KMS: GenerateDataKey(AES_256) under User KEK
    KMS-->>API: Plaintext DEK + Encrypted DEK
    API->>API: Encrypt receipt bytes with AES-256-GCM (DEK, 12B IV)
    API->>S3: PUT s3://vault/u/{userId}/r/{receiptId}.enc
    S3-->>API: 200 OK (ETag)
    API->>DB: INSERT receipt_media_assets (status='UPLOADED', encrypted_dek, iv, tag)
    API->>Queue: Enqueue 'media.preprocess' {receiptId}
    API-->>User: 202 Accepted {receipt_id, status: "UPLOADED", sse_url}

    User->>Queue: Subscribe SSE /api/v1/receipts/{receiptId}/events

    Queue->>CV: Consume 'media.preprocess' {receiptId}
    CV->>DB: UPDATE status='PREPROCESSING'
    CV->>Queue: Emit SSE {status: "PREPROCESSING", step: "Deskewing & enhancing"}
    CV->>S3: GET encrypted blob & decrypt in tmpfs via KMS DEK
    CV->>CV: Auto-crop + 4-point Perspective Deskew + CLAHE Contrast
    CV->>CV: Compute SHA-256 & 64-bit DCT pHash (check near-duplicates)
    CV->>CV: Generate 400px WebP Thumbnail & encrypt with DEK
    CV->>S3: PUT encrypted master derivative & thumbnail
    CV->>Queue: Enqueue 'media.ocr_extract' {receiptId, phash_warning}

    Queue->>OCR: Consume 'media.ocr_extract' {receiptId}
    OCR->>DB: UPDATE status='OCR_EXTRACTING'
    OCR->>Queue: Emit SSE {status: "OCR_EXTRACTING", step: "Extracting line items"}
    OCR->>OCR: Run PaddleOCR (DE/EN) -> Text blocks + Bounding Boxes
    OCR->>OCR: Redact PAN/IBAN regex -> Invoke Structured VLM (JSON Schema)
    OCR->>OCR: Compute field-level confidence scores & statutory dates (§ 437 BGB)
    OCR->>DB: UPDATE status='AWAITING_CONFIRMATION', extracted_payload, ocr_confidence_score
    OCR->>Queue: Emit SSE {status: "AWAITING_CONFIRMATION", payload, confidence, duplicate_warning}

    Queue-->>User: Render Interactive Verification Form (Low-confidence fields highlighted)
    User->>API: POST /api/v1/receipts/{receiptId}/confirm (Verified Warranty/Subscription DTO)
    API->>DB: BEGIN TX -> UPDATE receipt status='VERIFIED' -> INSERT warranty & notification_schedules -> COMMIT
    API-->>User: 201 Created {warranty_id, statutory_warranty_end_date, burden_of_proof_reversal_date}
```

### 5.3 Workflow 2: Deterministic Warranty Claim PDF/A-1b Generation

```mermaid
sequenceDiagram
    autonumber
    actor User as "User (PWA / MCP Agent)"
    participant API as "Claim PDF Service"
    participant DB as "PostgreSQL 16"
    participant KMS as "KMS / Vault"
    participant S3 as "Encrypted S3/MinIO Vault"
    participant PDF as "WeasyPrint + Pikepdf Engine"

    User->>API: POST /api/v1/warranties/{warrantyId}/claims (defect_description, remedy, language)
    API->>DB: SELECT warranty, user, receipt_media_assets WHERE warranty.id = warrantyId
    API->>API: Evaluate Legal Regime (§ 437 / § 439 BGB vs Commercial Guarantee)
    API->>API: Check § 477 BGB Burden of Proof Reversal (delivery_date + 12m >= defect_observed_date)
    API->>S3: GET encrypted receipt master
    API->>KMS: Decrypt receipt DEK & verify GCM Auth Tag
    API->>API: Crop & highlight relevant receipt line item bounding box (300 DPI PNG in-memory)
    API->>PDF: Render HTML/CSS Paged Template (DE/EN Legal Notice + QR Verification Code + Receipt Proof)
    PDF->>PDF: Convert to PDF/A-1b archival standard & compute SHA-256 document seal
    PDF-->>API: PDF/A-1b Byte Buffer + pdf_sha256_seal
    API->>KMS: GenerateDataKey(AES_256) for Claim PDF
    API->>S3: PUT encrypted Claim PDF to s3://vault/u/{userId}/claims/{claimId}.pdf.enc
    API->>DB: INSERT warranty_claims & audit_logs (action='CLAIM_PDF_EXPORTED')
    API-->>User: 201 Created {claim_id, claim_reference_code, pdf_sha256_seal, download_url}
```

### 5.4 Workflow 3: Proactive Subscription Renewal & Warranty Expiry Alerting

```mermaid
sequenceDiagram
    autonumber
    participant Cron as "BullMQ Scheduler Worker"
    participant DB as "PostgreSQL 16"
    participant Redis as "Redis 7 (Idempotency Lock)"
    participant Push as "WebPush / Email / CalDAV Dispatcher"
    actor User as "User Device"

    Cron->>DB: SELECT * FROM notification_schedules WHERE delivery_status='PENDING' AND scheduled_for <= NOW() FOR UPDATE SKIP LOCKED LIMIT 100
    loop For each due notification schedule
        Cron->>Redis: SET idempotency_key "LOCKED" NX EX 86400
        alt Idempotency Key Already Exists
            Cron->>DB: UPDATE delivery_status='SENT' (Skip duplicate dispatch)
        else First Dispatch Attempt
            Cron->>DB: UPDATE delivery_status='PROCESSING'
            Cron->>Push: Dispatch Payload (e.g., "Netflix renews in 7 days — Cancel by 2026-11-09 to save €17.99/mo")
            alt Delivery Succeeds
                Push-->>User: Push Notification / Email Delivered
                Cron->>DB: UPDATE delivery_status='SENT', sent_at=NOW()
            else Transient Network Error
                Cron->>DB: UPDATE delivery_status='FAILED_RETRYING', retry_count = retry_count + 1, scheduled_for = NOW() + backoff
            end
        end
    end
```

---

## 6. REST & MCP API Contract Specifications

### 6.1 Global API Conventions, Rate Limiting & Idempotency

- **Base URL:** `https://api.wallet.srh-lab.eu/api/v1`
- **Authentication:** `Authorization: Bearer <JWT>` (signed with EdDSA / Ed25519).
- **Idempotency:** All state-mutating requests (`POST`, `PUT`, `PATCH`) require an `Idempotency-Key: <UUIDv4>` header. Keys and responses are cached in Redis for 24 hours per `user_id` to prevent duplicate receipt jobs or duplicate warranty records during flaky mobile network retries.
- **Rate Limiting (Token Bucket via Redis):**
  - Standard CRUD endpoints: `120 requests / minute / user` (Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
  - Media Upload & OCR Ingestion (`POST /receipts/upload`): `15 requests / minute / user` (burst of 5).
  - Claim PDF Generation (`POST /warranties/{id}/claims`): `10 requests / minute / user`.
- **Standard Error Envelope (RFC 9457 Problem Details):**
  ```json
  {
    "type": "https://api.wallet.srh-lab.eu/errors/duplicate-receipt",
    "title": "Potential Duplicate Receipt Detected",
    "status": 409,
    "detail": "Receipt matches perceptual hash (Hamming distance 2) of receipt 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d uploaded on 2026-10-14.",
    "instance": "/api/v1/receipts/upload",
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
  }
  ```

### 6.2 Core REST Endpoint Matrix

| Method & Path | Purpose | Auth Scope | Success Status | Error Codes |
| :--- | :--- | :--- | :---: | :--- |
| `POST /api/v1/receipts/upload` | Upload receipt image/PDF, strip EXIF, encrypt to Vault, and trigger async CV+OCR pipeline. | `receipts:write` | `202 Accepted` | `400`, `409` (Duplicate SHA256), `413` (>15MB), `415` (Invalid MIME), `429` |
| `GET /api/v1/receipts/{id}/events` | Server-Sent Events (SSE) stream emitting real-time OCR/VLM pipeline states & extracted JSON. | `receipts:read` | `200 OK` (`text/event-stream`) | `401`, `404` |
| `POST /api/v1/receipts/{id}/confirm` | Confirm user-reviewed OCR fields and atomically create a `Warranty` or `Subscription`. | `warranties:write` | `201 Created` | `400`, `404`, `409`, `422` |
| `GET /api/v1/warranties` | List warranties with filters (`status`, `category`, `expiring_within_days`, `q` trigram search). | `warranties:read` | `200 OK` | `400`, `401` |
| `POST /api/v1/warranties/{id}/claims` | Generate a PDF/A-1b Warranty Claim Dossier with legal citations and embedded receipt proof. | `claims:write` | `201 Created` | `400`, `404`, `422`, `429` |
| `GET /api/v1/subscriptions/analytics` | Calculate monthly/annual EUR burn rate, category breakdown, and upcoming cancellation deadlines. | `subscriptions:read` | `200 OK` | `401` |
| `DELETE /api/v1/users/me` | Execute GDPR Art. 17 Right to Erasure (cryptographic KEK destruction + S3/DB purge). | `account:delete` + Re-auth | `202 Accepted` | `401`, `403` |

### 6.3 Detailed Endpoint Payload Specifications

#### A. `POST /api/v1/receipts/upload` -> `202 Accepted`
**Request Headers:**
```http
POST /api/v1/receipts/upload HTTP/1.1
Authorization: Bearer eyJhbGciOiJFZERTQSI...
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Content-Type: multipart/form-data; boundary=---ReceiptBoundary
```

**Response (`202 Accepted`) & Subsequent SSE Final Payload (`AWAITING_CONFIRMATION`):**
```json
{
  "receipt_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "processing_status": "AWAITING_CONFIRMATION",
  "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "duplicate_check": {
    "is_exact_duplicate": false,
    "near_duplicate_receipt_id": null,
    "phash_hamming_distance": 28
  },
  "ocr_confidence_score": 0.942,
  "extracted_payload": {
    "document_classification": "WARRANTY_PRODUCT_RECEIPT",
    "merchant": {
      "name": "MediaMarkt Saturn Deutschland GmbH",
      "address": "Alexanderplatz 8, 10178 Berlin",
      "confidence": 0.98
    },
    "transaction": {
      "purchase_date": "2026-10-15",
      "currency": "EUR",
      "total_amount": 649.00,
      "vat_amount": 103.62,
      "confidence": 0.96
    },
    "line_items": [
      {
        "description": "Sony WH-1000XM5 Wireless Noise Cancelling Kopfhörer",
        "brand_name": "Sony",
        "model_number": "WH-1000XM5/B",
        "serial_number": "S01-5892341-X",
        "unit_price": 329.00,
        "quantity": 1,
        "suggested_category": "ELECTRONICS",
        "statutory_warranty_months": 24,
        "detected_commercial_guarantee_months": 12,
        "bounding_box_norm": [0.12, 0.38, 0.88, 0.46],
        "confidence": 0.91
      }
    ]
  }
}
```

#### B. `POST /api/v1/warranties/{id}/claims` -> `201 Created`
**Request Payload:**
```json
{
  "claim_type": "STATUTORY_GEWAEHRLEISTUNG",
  "legal_remedy_requested": "REPLACEMENT_ERSATZLIEFERUNG",
  "defect_description": "Right earcup active noise cancellation emits a continuous high-pitched feedback whistle and Bluetooth disconnects after 5 minutes of playback.",
  "defect_observed_date": "2026-11-01",
  "claim_language": "de-DE"
}
```

**Response (`201 Created`):**
```json
{
  "claim_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "claim_reference_code": "WSW-2026-94F1C",
  "status": "PDF_GENERATED",
  "legal_assessment": {
    "applicable_statute": "§§ 437 Nr. 1, 439 BGB (Nacherfüllung)",
    "within_statutory_period": true,
    "within_burden_of_proof_reversal_window": true,
    "burden_of_proof_note": "Defect occurred within 12 months of delivery (§ 477 BGB); defect is legally presumed to have existed at delivery."
  },
  "pdf_artifact": {
    "standard": "PDF/A-1b",
    "sha256_seal": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    "presigned_download_url": "https://api.wallet.srh-lab.eu/api/v1/claims/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/download?token=...",
    "expires_in_seconds": 900
  }
}
```

### 6.4 Model Context Protocol (MCP) Server Specification (`warranty-wallet-mcp`)

To satisfy modern AI interoperability requirements, Member D exposes an MCP Server adhering to the JSON-RPC 2.0 MCP specification:
- **MCP Resources:**
  - `wallet://warranties/active` — Summary of all active and expiring warranties.
  - `wallet://subscriptions/summary` — Recurring cashflow, burn rate, and upcoming cancellation deadlines.
- **MCP Tools:**
  - `search_warranties(query: string, include_expired?: boolean)` — Hybrid trigram + `pgvector` semantic search over products and receipt line items.
  - `analyze_subscription_spend(category?: string)` — Computes annualized spend, identifies overlapping services (e.g., multiple music/cloud storage tiers), and flags upcoming notice deadlines.
  - `prepare_warranty_claim_draft(warranty_id: string, defect_description: string, preferred_remedy: string)` — Validates statutory coverage and generates a preview claim PDF link (requires explicit user confirmation in UI before external dispatch).

---

## 7. Security, Privacy & GDPR Compliance Architecture

### 7.1 Envelope Encryption Hierarchy (AES-256-GCM)

Receipts and warranty claim dossiers contain sensitive personal and financial data (home addresses, serial numbers, purchase habits). Relying solely on storage-layer disk encryption is insufficient. We enforce **Application-Layer Envelope Encryption**:

```mermaid
flowchart TD
    subgraph KMS["HashiCorp Vault / AWS KMS (eu-central-1)"]
        RootHSM["Hardware Security Module (HSM)\nMaster Root Key"]
        UserKEK["Per-User Key Encryption Key (KEK)\nkms_key_alias: user/{user_id}"]
        RootHSM -->|"Derives / Protects"| UserKEK
    end

    subgraph AppMemory["Media Worker Ephemeral RAM (tmpfs)"]
        DEK["Per-Receipt Data Encryption Key (DEK)\n256-bit CSPRNG Key"]
        Cipher["AES-256-GCM Cipher\n(12-byte IV + 16-byte Auth Tag)"]
    end

    subgraph Storage["Persistence Layer"]
        PGMeta[("PostgreSQL: receipt_media_assets\nStores: encrypted_dek, iv, auth_tag")]
        S3Blob[("MinIO / S3 Object Vault\nStores: Ciphertext Receipt Bytes Only")]
    end

    UserKEK -->|"Wraps (Encrypts) DEK"| DEK
    DEK -->|"Key Input"| Cipher
    DEK -.->|"Wrapped DEK Stored"| PGMeta
    Cipher -->|"Authenticated Ciphertext"| S3Blob
```

1. **Per-Asset DEK:** Every uploaded receipt and every generated Claim PDF gets a unique, cryptographically random 256-bit Data Encryption Key (DEK) and 96-bit (12-byte) Initialization Vector (IV).
2. **Per-User KEK:** The DEK is encrypted ("wrapped") using a **per-user Key Encryption Key (KEK)** managed inside KMS (`eu-central-1`). The plaintext DEK is zeroed from memory immediately after encryption.
3. **Zero-Trust Object Storage:** Even if an attacker compromises the S3/MinIO bucket, they only obtain raw AES-256-GCM ciphertext without the wrapped DEKs (stored in PostgreSQL) or the user KEKs (stored in HSM/KMS).

### 7.2 Deterministic PII Redaction & Zero-Retention AI Policy
Before any OCR text is passed to a Vision-Language Model for structured JSON normalization:
- **Camera EXIF Stripping:** All `GPSLatitude`, `GPSLongitude`, `Make`, `Model`, and `CameraSerialNumber` tags are stripped in memory at the upload gateway (`exif_stripped = TRUE` enforced by DB constraint).
- **Pre-VLM Regex/NER Sanitization:** Credit/debit card PANs (`\b(?:\d[ -]*?){13,19}\b`), German/EU IBANs (`\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b`), and personal phone numbers are masked to `[REDACTED_PAYMENT_ID]` before leaving the OCR worker.
- **EU Data Residency & Zero Training:** Any cloud VLM fallback is pinned strictly to `eu-central-1` (Frankfurt) endpoints with enterprise zero-data-retention (ZDR) headers enabled.

### 7.3 GDPR Regulatory Mapping (Articles 15, 17, 20, 25, 32)

| GDPR Article | Requirement | Technical Implementation in Warranty & Subscription Wallet |
| :--- | :--- | :--- |
| **Art. 15 & 20** | Right of Access & Data Portability | `GET /api/v1/users/me/export` compiles an asynchronous encrypted ZIP archive containing all warranties, subscriptions, audit logs (`JSON`/`CSV`), and decrypted original receipts + Claim PDFs. |
| **Art. 17** | Right to Erasure (*"Right to be Forgotten"*) | `DELETE /api/v1/users/me` performs **Cryptographic Shredding**: (1) Immediately schedules destruction of the user's KEK in KMS (rendering all backups and S3 objects permanently undecryptable), (2) Deletes S3 objects, and (3) Executes `DELETE FROM users WHERE id = $1` (cascading across all child tables). |
| **Art. 25** | Privacy by Design & Default | No PSD2 bank login required; EXIF GPS stripped by default; IP addresses in `audit_logs` masked to `/24` IPv4 or `/48` IPv6; MCP server redacts payment identifiers. |
| **Art. 32** | Security of Processing | TLS 1.3 in transit; AES-256-GCM envelope encryption at rest; WebAuthn Passkey support; strict Content-Security-Policy (CSP) and OWASP ASVS Level 2 controls. |

---

## 8. Deployment, Observability & CI/CD Topology

### 8.1 Cloud-Native Deployment & Observability Architecture

```mermaid
flowchart TD
    subgraph GitHub["CI/CD Pipeline (GitHub Actions)"]
        Commit["Git Push / PR"] --> QualityGate["Lint, Typecheck, Vitest Unit\n& Testcontainers Integration"]
        QualityGate --> OCRBench["Golden Receipt OCR/VLM Benchmark\n(F1 >= 0.92 Gate)"]
        OCRBench --> E2EGate["Playwright E2E & Cucumber BDD\n+ Trivy Container Security Scan"]
        E2EGate --> Registry["Push Signed OCI Images to GHCR\n(Cosign + SBOM)"]
    end

    subgraph Runtime["EU-Central Production Cluster (Kubernetes / Cloud Run)"]
        Ingress["Envoy / NGINX Ingress Controller"]
        APIPods["Core API & MCP Pods\n(HPA: 2-10 Replicas)"]
        CVPods["Media & OCR Worker Pods\n(KEDA Queue-Depth Autoscaler)"]
        PDFPods["Claim PDF Worker Pods"]
        Ingress --> APIPods
    end

    subgraph Observability["Observability & Telemetry Stack (OpenTelemetry)"]
        OTel["OpenTelemetry Collector\n(Traces, Metrics, Structured Logs)"]
        Prom["Prometheus\n(Time-Series Metrics)"]
        Tempo["Grafana Tempo\n(Distributed Tracing)"]
        Loki["Grafana Loki\n(PII-Redacted JSON Logs)"]
        Grafana["Grafana Dashboards & Alertmanager\n(SLO Burn-Rate Alerts)"]
    end

    Registry -->|"ArgoCD / Blue-Green Deploy"| Runtime
    APIPods -->|"OTLP gRPC"| OTel
    CVPods -->|"OTLP gRPC"| OTel
    PDFPods -->|"OTLP gRPC"| OTel
    OTel --> Prom
    OTel --> Tempo
    OTel --> Loki
    Prom --> Grafana
    Tempo --> Grafana
    Loki --> Grafana
```

### 8.2 Key Prometheus Metrics & Alerting SLAs

Member D instruments all services using the **OpenTelemetry SDK**, exporting golden signals to Prometheus and Grafana:

1. **Media & OCR Pipeline Metrics:**
   - `wallet_receipt_preprocess_duration_seconds` (Histogram: buckets `0.1, 0.25, 0.5, 0.8, 1.5, 3.0`) — **Alert if p95 > 1.0s for 5m**.
   - `wallet_ocr_extraction_duration_seconds` (Histogram: buckets `0.5, 1.0, 2.0, 3.8, 6.0, 10.0`) — **Alert if p95 > 4.5s for 5m**.
   - `wallet_ocr_confidence_score` (Histogram) — Tracks field confidence drift across merchant types.
   - `wallet_receipt_pipeline_failures_total{stage, reason}` (Counter) — Tracks corrupt uploads vs. VLM timeouts.
2. **Claim PDF & Reminder Engine Metrics:**
   - `wallet_claim_pdf_generation_duration_seconds` (Histogram) — **SLO: p95 < 1.5s**.
   - `wallet_notification_dispatch_lag_seconds` (Gauge) — Delay between `scheduled_for` and actual dispatch.
   - `wallet_bullmq_dlq_depth{queue_name}` (Gauge) — **Critical Alert if Dead-Letter Queue > 0**.
3. **MCP Server & API Health Metrics:**
   - `wallet_http_request_duration_seconds{route, method, status}` — **SLO: Core CRUD p95 < 120ms**.
   - `wallet_mcp_tool_invocations_total{tool_name, status}` — Tracks AI agent tool usage and error rates.

### 8.3 Local Developer & SRH Lab Demo Environment (`docker-compose.yml`)

To guarantee 100% reproducibility during SRH University grading and peer code reviews, the entire stack boots locally with a single command (`docker compose up --build`) provisioning:
- `postgres:16-alpine` (with `pgvector` and automated migration runner + demo seed data)
- `redis:7-alpine` (BullMQ job queues + SSE pub/sub)
- `minio/minio` (Local S3-compatible encrypted Receipt Vault)
- `vault:1.17` (Local dev KMS for envelope encryption testing)
- `api-server` (Fastify REST + MCP SSE endpoint)
- `media-ocr-worker` (Python 3.12 + OpenCV + PaddleOCR)
- `web-pwa` (Next.js 15 frontend)
