/**
 * persistenceService.ts - Multi-Store ACID Transactions, Cascading Purges & Orphan GC
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import type { WalletDatabase } from './vaultDb.js';
import { vaultDb } from './vaultDb.js';
import type {
  WalletItem,
  ReceiptVaultBlob,
  AlarmScheduleRecord,
} from '../types/contracts.js';

export interface SaveItemPayload {
  item: WalletItem;
  receiptBlob?: ReceiptVaultBlob;
  alarmSchedules?: AlarmScheduleRecord[];
}

/**
 * Persists a wallet item along with its encrypted receipt blob and notification alarms
 * inside a single atomic ACID Dexie transaction.
 */
export async function saveWalletItemWithReceiptAndAlarms(
  payload: SaveItemPayload,
  db: WalletDatabase = vaultDb
): Promise<void> {
  const { item, receiptBlob, alarmSchedules } = payload;

  await db.transaction(
    'rw',
    [db.items, db.receipt_blobs, db.alarm_schedules],
    async () => {
      // 1. If an encrypted receipt is attached, write it first
      if (receiptBlob) {
        await db.receipt_blobs.put(receiptBlob);
        item.receiptBlobId = receiptBlob.id;
        item.receiptSha256 = receiptBlob.sha256;
        item.hasProofOfPurchase = true;
      }

      // 2. Write the item record
      await db.items.put(item);

      // 3. Write or overwrite alarm schedules if provided
      if (alarmSchedules && alarmSchedules.length > 0) {
        for (const alarm of alarmSchedules) {
          await db.alarm_schedules.put(alarm);
        }
      }
    }
  );
}

/**
 * Atomically replaces or unlinks an existing receipt blob, preventing orphaned blobs.
 */
export async function replaceOrDeleteReceiptAtomically(
  itemId: string,
  newReceiptBlob?: ReceiptVaultBlob,
  db: WalletDatabase = vaultDb
): Promise<void> {
  await db.transaction('rw', [db.items, db.receipt_blobs], async () => {
    const item = await db.items.get(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found for receipt update`);
    }

    // Delete existing blob if present
    if (item.receiptBlobId) {
      await db.receipt_blobs.delete(item.receiptBlobId);
    }

    if (newReceiptBlob) {
      await db.receipt_blobs.put(newReceiptBlob);
      item.receiptBlobId = newReceiptBlob.id;
      item.receiptSha256 = newReceiptBlob.sha256;
      item.hasProofOfPurchase = true;
    } else {
      item.receiptBlobId = undefined;
      item.receiptSha256 = undefined;
      item.hasProofOfPurchase = false;
    }

    item.updatedAt = Date.now();
    await db.items.put(item);
  });
}

/**
 * Cascading deletion: atomically removes item and all associated receipt blobs,
 * alarm schedules, and dispute history records.
 */
export async function deleteWalletItemCascade(
  itemId: string,
  db: WalletDatabase = vaultDb
): Promise<void> {
  await db.transaction(
    'rw',
    [db.items, db.receipt_blobs, db.alarm_schedules, db.dispute_history],
    async () => {
      const item = await db.items.get(itemId);

      // 1. Delete receipt blobs
      if (item?.receiptBlobId) {
        await db.receipt_blobs.delete(item.receiptBlobId);
      }
      const matchingBlobs = await db.receipt_blobs
        .where('itemId')
        .equals(itemId)
        .toArray();
      for (const blob of matchingBlobs) {
        await db.receipt_blobs.delete(blob.id);
      }

      // 2. Delete alarm schedules
      const matchingAlarms = await db.alarm_schedules
        .where('itemId')
        .equals(itemId)
        .toArray();
      for (const alarm of matchingAlarms) {
        await db.alarm_schedules.delete(alarm.id);
      }

      // 3. Delete dispute history
      const matchingDisputes = await db.dispute_history
        .where('itemId')
        .equals(itemId)
        .toArray();
      for (const dispute of matchingDisputes) {
        await db.dispute_history.delete(dispute.id);
      }

      // 4. Delete the item record
      await db.items.delete(itemId);
    }
  );
}

/**
 * Garbage Collector: identifies and deletes any receipt blobs not referenced by any item.
 * Returns count of purged orphan blobs.
 */
export async function purgeOrphanReceiptBlobs(
  db: WalletDatabase = vaultDb
): Promise<number> {
  return await db.transaction('rw', [db.items, db.receipt_blobs], async () => {
    const allItems = await db.items.toArray();
    const referencedBlobIds = new Set(
      allItems.map((i) => i.receiptBlobId).filter((id): id is string => Boolean(id))
    );
    const validItemIds = new Set(allItems.map((i) => i.id));

    const allBlobs = await db.receipt_blobs.toArray();
    let purgedCount = 0;

    for (const blob of allBlobs) {
      const isReferenced =
        referencedBlobIds.has(blob.id) || validItemIds.has(blob.itemId);
      if (!isReferenced) {
        await db.receipt_blobs.delete(blob.id);
        purgedCount++;
      }
    }

    return purgedCount;
  });
}
