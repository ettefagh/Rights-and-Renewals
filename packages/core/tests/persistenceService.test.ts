import { describe, it, expect, beforeEach } from 'vitest';
import { WalletDatabase } from '../src/db/vaultDb.js';
import {
  saveWalletItemWithReceiptAndAlarms,
  replaceOrDeleteReceiptAtomically,
  deleteWalletItemCascade,
  purgeOrphanReceiptBlobs,
} from '../src/db/persistenceService.js';
import type {
  WalletItem,
  ReceiptVaultBlob,
  AlarmScheduleRecord,
  DisputeLogEntry,
} from '../src/types/contracts.js';

describe('persistenceService - ACID Multi-Store, Cascading Purges & GC', () => {
  let db: WalletDatabase;

  const mockItem: WalletItem = {
    id: 'item-uuid-001',
    title: 'Sony WH-1000XM4',
    category: 'hardware',
    brandSlug: 'sony',
    merchantOrProvider: 'Saturn',
    purchaseDate: '2026-03-15',
    expiryDate: '2028-03-15',
    priceGrossEur: 279.0,
    isTaxDeductible: true,
    taxCategory: 'arbeitsmittel',
    beruflicheNutzungProzent: 50,
    status: 'active',
    searchTokens: ['sony', 'wh-1000xm4', 'headphones', 'saturn'],
    hasProofOfPurchase: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockBlob: ReceiptVaultBlob = {
    id: 'blob-uuid-001',
    itemId: 'item-uuid-001',
    encryptedBlob: new Uint8Array([1, 2, 3, 4]),
    ivHex: 'a'.repeat(24),
    mimeType: 'image/jpeg',
    byteLength: 4,
    sha256: 'b'.repeat(64),
    createdAt: Date.now(),
  };

  const mockAlarms: AlarmScheduleRecord[] = [
    {
      id: 'alarm-001',
      itemId: 'item-uuid-001',
      reminderType: '30_days_before',
      scheduledEpochMs: 1803718800000,
      status: 'pending',
    },
  ];

  beforeEach(async () => {
    db = new WalletDatabase(`TestPersistenceDB_${Date.now()}_${Math.random()}`);
    await db.open();
  });

  it('DB-05: atomically writes item, receipt blob, and alarms in single ACID transaction', async () => {
    await saveWalletItemWithReceiptAndAlarms(
      {
        item: { ...mockItem },
        receiptBlob: mockBlob,
        alarmSchedules: mockAlarms,
      },
      db
    );

    const savedItem = await db.items.get('item-uuid-001');
    const savedBlob = await db.receipt_blobs.get('blob-uuid-001');
    const savedAlarms = await db.alarm_schedules
      .where('itemId')
      .equals('item-uuid-001')
      .toArray();

    expect(savedItem).toBeDefined();
    expect(savedItem?.receiptBlobId).toBe('blob-uuid-001');
    expect(savedItem?.hasProofOfPurchase).toBe(true);
    expect(savedBlob).toBeDefined();
    expect(savedAlarms).toHaveLength(1);
  });

  it('DB-07: atomically replaces receipt blob and deletes previous blob', async () => {
    await saveWalletItemWithReceiptAndAlarms(
      { item: { ...mockItem }, receiptBlob: mockBlob },
      db
    );

    const replacementBlob: ReceiptVaultBlob = {
      id: 'blob-uuid-002',
      itemId: 'item-uuid-001',
      encryptedBlob: new Uint8Array([5, 6, 7]),
      ivHex: 'c'.repeat(24),
      mimeType: 'image/webp',
      byteLength: 3,
      sha256: 'd'.repeat(64),
      createdAt: Date.now(),
    };

    await replaceOrDeleteReceiptAtomically(
      'item-uuid-001',
      replacementBlob,
      db
    );

    expect(await db.receipt_blobs.get('blob-uuid-001')).toBeUndefined();
    expect(await db.receipt_blobs.get('blob-uuid-002')).toBeDefined();
    const updatedItem = await db.items.get('item-uuid-001');
    expect(updatedItem?.receiptBlobId).toBe('blob-uuid-002');
    expect(updatedItem?.receiptSha256).toBe('d'.repeat(64));
    expect(updatedItem?.hasProofOfPurchase).toBe(true);
  });

  it('DB-08: atomically unlinks receipt when replacementBlob is undefined', async () => {
    await saveWalletItemWithReceiptAndAlarms(
      { item: { ...mockItem }, receiptBlob: mockBlob },
      db
    );

    await replaceOrDeleteReceiptAtomically('item-uuid-001', undefined, db);

    expect(await db.receipt_blobs.get('blob-uuid-001')).toBeUndefined();
    const updatedItem = await db.items.get('item-uuid-001');
    expect(updatedItem?.receiptBlobId).toBeUndefined();
    expect(updatedItem?.receiptSha256).toBeUndefined();
    expect(updatedItem?.hasProofOfPurchase).toBe(false);
  });

  it('DB-09: throws error when replacing receipt for non-existent item', async () => {
    await expect(
      replaceOrDeleteReceiptAtomically('non-existent-id', mockBlob, db)
    ).rejects.toThrow('Item non-existent-id not found for receipt update');
  });

  it('DB-10: performs cascading deletion of item, receipt blobs, alarms, and dispute logs', async () => {
    await saveWalletItemWithReceiptAndAlarms(
      {
        item: { ...mockItem },
        receiptBlob: mockBlob,
        alarmSchedules: mockAlarms,
      },
      db
    );

    const dispute: DisputeLogEntry = {
      id: 'disp-001',
      itemId: 'item-uuid-001',
      templateId: 'T1',
      generatedText: 'Dispute notice',
      recipientEmailOrAddress: 'saturn@example.com',
      dateGenerated: '2026-03-20',
    };
    await db.dispute_history.put(dispute);

    await deleteWalletItemCascade('item-uuid-001', db);

    expect(await db.items.get('item-uuid-001')).toBeUndefined();
    expect(await db.receipt_blobs.get('blob-uuid-001')).toBeUndefined();
    expect(
      await db.alarm_schedules
        .where('itemId')
        .equals('item-uuid-001')
        .count()
    ).toBe(0);
    expect(
      await db.dispute_history
        .where('itemId')
        .equals('item-uuid-001')
        .count()
    ).toBe(0);
  });

  it('DB-11: purges orphan receipt blobs leaving valid items intact', async () => {
    await saveWalletItemWithReceiptAndAlarms(
      { item: { ...mockItem }, receiptBlob: mockBlob },
      db
    );

    const orphanBlob: ReceiptVaultBlob = {
      id: 'orphan-blob-999',
      itemId: 'non-existent-item',
      encryptedBlob: new Uint8Array([9, 9, 9]),
      ivHex: 'e'.repeat(24),
      mimeType: 'image/png',
      byteLength: 3,
      sha256: 'f'.repeat(64),
      createdAt: Date.now(),
    };
    await db.receipt_blobs.put(orphanBlob);

    const purgedCount = await purgeOrphanReceiptBlobs(db);
    expect(purgedCount).toBe(1);
    expect(await db.receipt_blobs.get('orphan-blob-999')).toBeUndefined();
    expect(await db.receipt_blobs.get('blob-uuid-001')).toBeDefined();
  });
});
