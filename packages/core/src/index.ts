/**
 * index.ts - Headless TypeScript Domain Engine for CM-LAB Sovereign Consumer Wallet
 * Re-exports all canonical contracts, crypto, database, search, alerts, legal, tax, media, MCP, and telemetry modules.
 */

// 1. Contracts & Canonical DTOs
export type {
  ItemCategory,
  ItemStatus,
  BillingCycle,
  PaymentMethodType,
  TaxCategory,
  ReminderType,
  AlarmStatus,
  LegalTemplateId,
  WalletItem,
  ReceiptVaultBlob,
  AlarmScheduleRecord,
  PolicyWikiEntry,
  DisputeLogEntry,
} from './types/contracts.js';

export { policySeedData } from './data/policyWikiSeed.js';

// 2. Cryptographic Vault & GoBD Hashing
export {
  generateVaultKey,
  encryptReceiptBlob,
  decryptReceiptBlob,
  computeSha256Hex,
  getOrCreateMasterKey,
  bufferToHex,
  hexToBytes,
  GoBDIntegrityError,
} from './crypto/cryptoVault.js';

export type { EncryptedPayload } from './crypto/cryptoVault.js';

// 3. IndexedDB Vault Database & ACID Multi-Store Persistence
export { vaultDb, WalletDatabase } from './db/vaultDb.js';

export {
  saveWalletItemWithReceiptAndAlarms,
  replaceOrDeleteReceiptAtomically,
  deleteWalletItemCascade,
  purgeOrphanReceiptBlobs,
} from './db/persistenceService.js';
export type { SaveItemPayload } from './db/persistenceService.js';

// 4. Autocomplete Prefix Trie & Tokenizer
export { PrefixTrie } from './search/PrefixTrie.js';

// 5. Alert & Notification Scheduler (09:00 Europe/Berlin Wall-Clock)
export {
  computeWallClockEpoch,
  addDays,
  subtractDays,
  addMonthsCalendar,
  computeAlertSchedule,
} from './alerts/AlertScheduler.js';
export type { AlertSchedulerOptions } from './alerts/AlertScheduler.js';

// 6. Deterministic BGB Statutory Notice Compiler
export {
  LEXFOX_SAFE_HARBOR_DE,
  LEXFOX_SAFE_HARBOR_EN,
  isGermanPublicHoliday,
  isWerktag,
  rollForwardWerktag,
  calculateRemedyDeadline,
  selectTemplate,
  compileBgbNotice,
} from './legal/bgbNoticeCompiler.js';
export type {
  NoticeLanguage,
  RemedyChoice,
  NoticeIssueType,
  ConsumerParty,
  MerchantParty,
  NoticeCompilationParams,
  CompiledLegalNotice,
} from './legal/bgbNoticeCompiler.js';

// 7. Income Tax Engine & ELSTER CSV Compiler
export {
  STBERG_SAFE_HARBOR_DE,
  STBERG_SAFE_HARBOR_EN,
  isBmf2022SofortabschreibungEligible,
  calculateWerbungskosten,
  calculateAnnualTaxSummary,
} from './tax/werbungskostenEngine.js';
export type {
  StudentTaxRegime,
  WriteOffType,
  TaxCalculationResult,
  AnnualTaxSummary,
} from './tax/werbungskostenEngine.js';

export {
  formatGermanNumber,
  escapeCsvField,
  generateElsterCsv,
} from './tax/elsterCsvCompiler.js';

// 8. Media & PDF Dossier Compiler
export {
  compilePlaintextDossier,
  compilePdfDossier,
} from './media/pdfDossierCompiler.js';
export type {
  DossierParams,
  CompiledDossierResult,
} from './media/pdfDossierCompiler.js';

// 9. Open MCP Server JSON-RPC 2.0 Dispatcher
export {
  dispatchJsonRpc,
  listMcpTools,
  handlePolicyLookup,
  handleStatutoryLawLookup,
  handleSubscriptionCategoryRules,
  handleTaxDeductibilityCheck,
  PolicyLookupInputSchema,
  StatutoryLawLookupInputSchema,
  SubscriptionCategoryRulesInputSchema,
  TaxDeductibilityCheckInputSchema,
} from './mcp/jsonRpcDispatcher.js';
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcError,
  McpToolContent,
  McpToolCallResult,
  McpToolDefinition,
  PolicyLookupInput,
  StatutoryLawLookupInput,
  SubscriptionCategoryRulesInput,
  TaxDeductibilityCheckInput,
} from './mcp/jsonRpcDispatcher.js';

// 10. Privacy-First Edge Telemetry (WAE)
export { formatWaeEvent, recordEdgeMetric } from './telemetry/edgeMetrics.js';
export type {
  TelemetryEvent,
  WaeDataPoint,
  AnalyticsEngineDataset,
  CloudflareEnvWithAnalytics,
} from './telemetry/edgeMetrics.js';

// 11. Dual RFC 5545 iCal Subscription Generator (Subscriptions vs. Warranties)
export {
  foldIcalLine,
  escapeIcalText,
  toIcalLocalNineAm,
  buildCalendarDeepLinks,
  generateSubscriptionsIcal,
  generateWarrantiesIcal,
} from './calendar/icalGenerator.js';
export type {
  IcalGeneratorOptions,
  CalendarSubscriptionLinks,
} from './calendar/icalGenerator.js';

// 12. Counter & Cancellation Action Utilities
export { copyToClipboardSafe } from './utils/safeClipboard.js';
export { generateBarcodeSvg } from './utils/barcodeSvg.js';

