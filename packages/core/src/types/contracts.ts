/**
 * contracts.ts - Canonical Domain Entities and Data Transfer Objects
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

export type ItemCategory = 'hardware' | 'subscription' | 'other';

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type PaymentMethodType = 'auto_pay' | 'invoice';

export type ItemStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'claimed'
  | 'cancelled'
  | 'cancellation_pending';

export type TaxCategory =
  | 'arbeitsmittel'
  | 'software_saas'
  | 'telekommunikation'
  | 'fachliteratur'
  | 'other';

export type ReminderType =
  | '30_days_before'
  | '7_days_before'
  | '1_day_before'
  | 'day_335_reversal_cliff'
  | 'custom';

export type AlarmStatus = 'pending' | 'delivered' | 'dismissed' | 'cancelled';

export type LegalTemplateId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

/**
 * Primary Wallet Item entity stored in Dexie `items` store.
 */
export interface WalletItem {
  id: string;
  title: string;
  category: ItemCategory;
  brandSlug: string;
  /** Explicit user-selected published catalog plan. Never inferred from the provider name. */
  policyPlanId?: string | undefined;
  merchantOrProvider: string;
  serialNumber?: string | undefined; // Hardware Serial/E-Nr./IMEI for retail counter actions
  barcodeValue?: string | undefined; // Scannable POS barcode (Code 128 / EAN / Invoice)
  purchaseDate: string; // ISO 8601 YYYY-MM-DD
  expiryDate: string; // ISO 8601 YYYY-MM-DD (Warranty end or Subscription renewal)
  priceGrossEur: number;
  billingCycle?: BillingCycle | undefined; // Subscription concurrency ('daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')
  paymentType?: PaymentMethodType | undefined; // 'auto_pay' (automatic deduction) or 'invoice' (manual invoice)
  isTaxDeductible: boolean;
  taxCategory?: TaxCategory | undefined;
  beruflicheNutzungProzent?: number | undefined; // 0 to 100 (Default 50 or 100 for mixed use)
  receiptSha256?: string | undefined; // 64-character pre-encryption GoBD hash
  receiptBlobId?: string | undefined; // Reference to ReceiptVaultBlob.id
  status: ItemStatus;
  searchTokens: string[]; // Autocomplete tokens for *searchTokens compound index
  notes?: string | undefined;
  cancellationUrl?: string | undefined;
  hasProofOfPurchase: boolean;
  createdAt: number; // Unix epoch ms
  updatedAt: number; // Unix epoch ms
}

/**
 * Encrypted receipt binary payload stored in Dexie `receipt_blobs` store.
 * Fully encrypted at rest via WebCrypto AES-GCM-256.
 */
export interface ReceiptVaultBlob {
  id: string;
  itemId: string;
  encryptedBlob: Uint8Array;
  ivHex: string; // 24-character hex string representing 12-byte CSPRNG IV
  mimeType: string;
  byteLength: number;
  sha256: string; // Pre-encryption forensic digest (GoBD Rn. 108-110)
  thumbnailBase64?: string | undefined; // <8KB unencrypted low-res micro-thumbnail for fast list views
  createdAt: number;
}

/**
 * Scheduled notification record stored in Dexie `alarm_schedules` store.
 * Standardized to 09:00 Europe/Berlin wall-clock time.
 */
export interface AlarmScheduleRecord {
  id: string;
  itemId: string;
  reminderType: ReminderType;
  scheduledEpochMs: number;
  status: AlarmStatus;
  notifiedAt?: number | undefined;
}

/**
 * Verified Brand Policy entry stored in Dexie `policy_wiki` store.
 * Bundled statically in `policy_wiki_seed_v1.json` for zero-auth boot.
 */
export interface PolicyWikiEntry {
  brandSlug: string;
  brandName: string;
  category: ItemCategory;
  statutoryWarrantyMonths: number; // 24 months (BGB § 438)
  commercialGuaranteeMonths: number; // Voluntary manufacturer warranty
  cancellationNoticeMonths: number; // Statutory max 1 month (BGB § 309 Nr. 9)
  cancellationButtonCompliant: boolean; // BGB § 312k 2-step button audit
  cancellationUrl?: string | undefined;
  supportEmail?: string | undefined;
  legalNotes: string;
  verifiedDate: string; // ISO 8601 YYYY-MM-DD
  searchAliases: string[];
}

/**
 * Audit log of compiled legal notices and claim submissions.
 */
export interface DisputeLogEntry {
  id: string;
  itemId: string;
  templateId: LegalTemplateId;
  generatedText: string;
  recipientEmailOrAddress: string;
  dateGenerated: string; // ISO 8601 string
  receiptSha256?: string | undefined;
}
