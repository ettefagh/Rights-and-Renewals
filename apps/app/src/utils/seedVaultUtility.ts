import {
  saveWalletItemWithReceiptAndAlarms,
  computeAlertSchedule,
  getOrCreateMasterKey,
  encryptReceiptBlob,
  type WalletItem,
  type ReceiptVaultBlob,
} from '@cmlab/core';

export async function populateSampleStudentVault(): Promise<number> {
  const masterKey = await getOrCreateMasterKey();

  // Synthetic 1x1 PNG receipt proof bytes for demonstration proof-of-purchase
  const mockReceiptPngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x51, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const now = new Date();
  const formatIso = (d: Date) => d.toISOString().split('T')[0]!;

  // 1. Spotify Premium Student (Urgent renewal in 3 days)
  const spotifyPurchase = new Date(now);
  spotifyPurchase.setFullYear(now.getFullYear() - 1);
  const spotifyRenewal = new Date(now);
  spotifyRenewal.setDate(now.getDate() + 3);

  const spotifyItem: WalletItem = {
    id: 'sample-sub-spotify',
    title: 'Spotify Premium Student',
    category: 'subscription',
    brandSlug: 'spotify',
    merchantOrProvider: 'Spotify AB',
    purchaseDate: formatIso(spotifyPurchase),
    expiryDate: formatIso(spotifyRenewal),
    priceGrossEur: 5.99,
    status: 'expiring_soon',
    isTaxDeductible: false,
    notes: 'Kunden-Nr: SPOT-DE-8839219',
    cancellationUrl: 'https://www.spotify.com/account/subscription/cancel/',
    hasProofOfPurchase: false,
    searchTokens: ['spotify', 'music', 'streaming', 'student'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const spotifyAlarms = computeAlertSchedule(spotifyItem, { now });
  await saveWalletItemWithReceiptAndAlarms({
    item: spotifyItem,
    alarmSchedules: spotifyAlarms,
  });

  // 2. Apple MacBook Pro 14" M3 (Hardware, 17 months in, 100% tax deductible Arbeitsmittel)
  const macbookPurchase = new Date(now);
  macbookPurchase.setMonth(now.getMonth() - 17);
  const macbookExpiry = new Date(macbookPurchase);
  macbookExpiry.setMonth(macbookPurchase.getMonth() + 24);

  const macbookEncrypted = await encryptReceiptBlob(mockReceiptPngBytes, masterKey);
  const macbookReceiptBlob: ReceiptVaultBlob = {
    id: 'blob-macbook-sample',
    itemId: 'sample-hw-macbook',
    encryptedBlob: macbookEncrypted.ciphertext,
    ivHex: macbookEncrypted.ivHex,
    mimeType: 'image/png',
    byteLength: mockReceiptPngBytes.byteLength,
    sha256: macbookEncrypted.sha256,
    createdAt: Date.now(),
  };

  const macbookItem: WalletItem = {
    id: 'sample-hw-macbook',
    title: 'Apple MacBook Pro 14" M3 (16GB, 512GB)',
    category: 'hardware',
    brandSlug: 'apple',
    merchantOrProvider: 'Apple Store Berlin',
    serialNumber: 'C02G80XYZ0GP',
    barcodeValue: '4012345678901',
    purchaseDate: formatIso(macbookPurchase),
    expiryDate: formatIso(macbookExpiry),
    priceGrossEur: 1899.0,
    status: 'active',
    isTaxDeductible: true,
    taxCategory: 'arbeitsmittel',
    beruflicheNutzungProzent: 100,
    receiptSha256: macbookEncrypted.sha256,
    receiptBlobId: macbookReceiptBlob.id,
    hasProofOfPurchase: true,
    searchTokens: ['apple', 'macbook', 'laptop', 'm3', 'pro'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const macbookAlarms = computeAlertSchedule(macbookItem, { now });
  await saveWalletItemWithReceiptAndAlarms({
    item: macbookItem,
    receiptBlob: macbookReceiptBlob,
    alarmSchedules: macbookAlarms,
  });

  // 3. MediaMarkt USB-C 8-in-1 Hub (Hardware, 4 months old, active BGB § 477 reversed burden of proof)
  const hubPurchase = new Date(now);
  hubPurchase.setMonth(now.getMonth() - 4);
  const hubExpiry = new Date(hubPurchase);
  hubExpiry.setMonth(hubPurchase.getMonth() + 24);

  const hubEncrypted = await encryptReceiptBlob(mockReceiptPngBytes, masterKey);
  const hubReceiptBlob: ReceiptVaultBlob = {
    id: 'blob-hub-sample',
    itemId: 'sample-hw-hub',
    encryptedBlob: hubEncrypted.ciphertext,
    ivHex: hubEncrypted.ivHex,
    mimeType: 'image/png',
    byteLength: mockReceiptPngBytes.byteLength,
    sha256: hubEncrypted.sha256,
    createdAt: Date.now(),
  };

  const hubItem: WalletItem = {
    id: 'sample-hw-hub',
    title: 'MediaMarkt ISY USB-C 8-in-1 Hub',
    category: 'hardware',
    brandSlug: 'mediamarkt',
    merchantOrProvider: 'MediaMarkt Berlin',
    serialNumber: 'MM-ISY-USB8-4491',
    barcodeValue: '4043192004918',
    purchaseDate: formatIso(hubPurchase),
    expiryDate: formatIso(hubExpiry),
    priceGrossEur: 39.99,
    status: 'active',
    isTaxDeductible: true,
    taxCategory: 'arbeitsmittel',
    beruflicheNutzungProzent: 100,
    receiptSha256: hubEncrypted.sha256,
    receiptBlobId: hubReceiptBlob.id,
    hasProofOfPurchase: true,
    searchTokens: ['mediamarkt', 'hub', 'usb-c', 'isy', 'adapter'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const hubAlarms = computeAlertSchedule(hubItem, { now });
  await saveWalletItemWithReceiptAndAlarms({
    item: hubItem,
    receiptBlob: hubReceiptBlob,
    alarmSchedules: hubAlarms,
  });

  return 3;
}
