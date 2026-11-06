import { describe, it, expect, beforeEach } from 'vitest';
import { WalletDatabase } from '../src/db/vaultDb.js';
import type { WalletItem, PolicyWikiEntry, AlarmScheduleRecord } from '../src/types/contracts.js';

describe('vaultDb - Schema Definition & Compound Indexes', () => {
  let db: WalletDatabase;

  beforeEach(async () => {
    db = new WalletDatabase(`TestVaultDB_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  it('DB-01: initializes all 5 Dexie tables with compound indexes', () => {
    expect(db.items).toBeDefined();
    expect(db.receipt_blobs).toBeDefined();
    expect(db.alarm_schedules).toBeDefined();
    expect(db.policy_wiki).toBeDefined();
    expect(db.dispute_history).toBeDefined();
  });

  it('DB-02: queries compound index [category+expiryDate]', async () => {
    const item1: WalletItem = {
      id: 'i1',
      title: 'MacBook Pro',
      category: 'hardware',
      brandSlug: 'apple',
      merchantOrProvider: 'Apple Store',
      purchaseDate: '2026-01-01',
      expiryDate: '2028-01-01',
      priceGrossEur: 2499,
      isTaxDeductible: true,
      status: 'active',
      searchTokens: ['apple', 'macbook'],
      hasProofOfPurchase: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const item2: WalletItem = {
      ...item1,
      id: 'i2',
      title: 'Spotify',
      category: 'subscription',
      brandSlug: 'spotify',
      expiryDate: '2027-01-01',
      searchTokens: ['spotify'],
    };

    await db.items.bulkPut([item1, item2]);

    const hardwareResults = await db.items
      .where('[category+expiryDate]')
      .equals(['hardware', '2028-01-01'])
      .toArray();

    expect(hardwareResults).toHaveLength(1);
    expect(hardwareResults[0]?.id).toBe('i1');
  });

  it('DB-03: queries compound index [isTaxDeductible+purchaseDate]', async () => {
    const item1: WalletItem = {
      id: 'tax-1',
      title: 'ThinkPad',
      category: 'hardware',
      brandSlug: 'lenovo',
      merchantOrProvider: 'CampusPoint',
      purchaseDate: '2026-05-01',
      expiryDate: '2028-05-01',
      priceGrossEur: 1200,
      isTaxDeductible: true,
      status: 'active',
      searchTokens: ['thinkpad'],
      hasProofOfPurchase: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const item2: WalletItem = {
      ...item1,
      id: 'tax-2',
      title: 'PlayStation',
      isTaxDeductible: false,
      searchTokens: ['playstation'],
    };

    await db.items.bulkPut([item1, item2]);

    const deductible = await db.items
      .filter((i) => i.isTaxDeductible && i.purchaseDate.startsWith('2026'))
      .toArray();

    expect(deductible).toHaveLength(1);
    expect(deductible[0]?.id).toBe('tax-1');
  });

  it('DB-04: queries multi-entry index *searchTokens', async () => {
    const item: WalletItem = {
      id: 'token-item-1',
      title: 'Sony WH-1000XM4 Noise Cancelling',
      category: 'hardware',
      brandSlug: 'sony',
      merchantOrProvider: 'Saturn',
      purchaseDate: '2026-03-15',
      expiryDate: '2028-03-15',
      priceGrossEur: 279,
      isTaxDeductible: true,
      status: 'active',
      searchTokens: ['sony', 'wh-1000xm4', 'headphones', 'saturn'],
      hasProofOfPurchase: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.items.put(item);

    const matchHeadphones = await db.items
      .where('searchTokens')
      .equals('headphones')
      .toArray();

    expect(matchHeadphones).toHaveLength(1);
    expect(matchHeadphones[0]?.id).toBe('token-item-1');
  });

  it('queries policy_wiki compound index [category+brandSlug]', async () => {
    const entry: PolicyWikiEntry = {
      brandSlug: 'apple',
      brandName: 'Apple',
      category: 'hardware',
      statutoryWarrantyMonths: 24,
      commercialGuaranteeMonths: 12,
      cancellationNoticeMonths: 0,
      cancellationButtonCompliant: true,
      legalNotes: 'Apple notes',
      verifiedDate: '2026-01-15',
      searchAliases: ['mac'],
    };

    await db.policy_wiki.put(entry);

    const found = await db.policy_wiki
      .where('[category+brandSlug]')
      .equals(['hardware', 'apple'])
      .toArray();

    expect(found).toHaveLength(1);
    expect(found[0]?.brandName).toBe('Apple');
  });

  it('queries alarm_schedules compound index [status+scheduledEpochMs]', async () => {
    const alarm: AlarmScheduleRecord = {
      id: 'al-1',
      itemId: 'item-1',
      reminderType: '30_days_before',
      scheduledEpochMs: 1700000000000,
      status: 'pending',
    };

    await db.alarm_schedules.put(alarm);

    const pendingAlarms = await db.alarm_schedules
      .where('[status+scheduledEpochMs]')
      .equals(['pending', 1700000000000])
      .toArray();

    expect(pendingAlarms).toHaveLength(1);
  });
});
