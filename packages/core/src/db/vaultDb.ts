/**
 * vaultDb.ts - Dexie.js v4 IndexedDB Schema Definition & Compound Indexes
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
  WalletItem,
  ReceiptVaultBlob,
  AlarmScheduleRecord,
  PolicyWikiEntry,
  DisputeLogEntry,
} from '../types/contracts.js';

export class WalletDatabase extends Dexie {
  items!: EntityTable<WalletItem, 'id'>;
  receipt_blobs!: EntityTable<ReceiptVaultBlob, 'id'>;
  alarm_schedules!: EntityTable<AlarmScheduleRecord, 'id'>;
  policy_wiki!: EntityTable<PolicyWikiEntry, 'brandSlug'>;
  dispute_history!: EntityTable<DisputeLogEntry, 'id'>;

  constructor(dbName = 'WarrantyWalletDB') {
    super(dbName);
    this.version(1).stores({
      items:
        'id, category, expiryDate, purchaseDate, isTaxDeductible, status, receiptBlobId, [category+expiryDate], [isTaxDeductible+purchaseDate], *searchTokens',
      receipt_blobs: 'id, itemId, sha256',
      alarm_schedules:
        'id, itemId, status, scheduledEpochMs, [status+scheduledEpochMs]',
      policy_wiki: 'brandSlug, category, brandName, [category+brandSlug]',
      dispute_history: 'id, itemId, dateGenerated',
    });
  }
}

export const vaultDb = new WalletDatabase();
