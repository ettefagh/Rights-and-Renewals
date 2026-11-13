export type CaptureCategory = 'hardware' | 'subscription';

export interface CaptureValidationInput {
  category: CaptureCategory;
  title: string;
  merchant: string;
  purchaseDate: string;
  price: string;
  cancellationUrl: string;
  includeInTaxSummary: boolean;
  workUsePercent: number | string;
}

export type CaptureField = 'title' | 'merchant' | 'purchaseDate' | 'price' | 'cancellationUrl' | 'workUsePercent';
export type CaptureValidationErrors = Partial<Record<CaptureField, string>>;
export type CaptureValidationScope = 'details' | 'extras' | 'all';

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export function validateCaptureDetails(input: CaptureValidationInput, today = new Date(), scope: CaptureValidationScope = 'all'): CaptureValidationErrors {
  const errors: CaptureValidationErrors = {};
  if (scope !== 'extras') {
    if (!input.title.trim()) errors.title = 'Enter a name for this item.';
    if (!input.merchant.trim()) errors.merchant = input.category === 'subscription' ? 'Enter the subscription provider.' : 'Enter the store or brand.';

    if (!isRealDate(input.purchaseDate)) {
      errors.purchaseDate = 'Enter a valid date.';
    } else {
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (input.purchaseDate > todayIso) errors.purchaseDate = 'Date cannot be in the future.';
    }
  }

  if (scope !== 'extras' && input.category === 'subscription') {
    const price = Number(input.price.trim().replace(',', '.'));
    if (!input.price.trim() || !Number.isFinite(price) || price <= 0) {
      errors.price = 'Enter a recurring price greater than zero.';
    }
  } else if (scope !== 'details' && input.category === 'hardware' && input.includeInTaxSummary && input.price.trim()) {
    const price = Number(input.price.trim().replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) errors.price = 'Enter a valid purchase price.';
  }

  const cancellationUrl = input.cancellationUrl.trim();
  if (scope !== 'extras' && input.category === 'subscription' && cancellationUrl) {
    try {
      const parsed = new URL(cancellationUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('unsafe protocol');
    } catch {
      errors.cancellationUrl = 'Enter a valid http or https URL.';
    }
  }

  if (scope !== 'details' && input.includeInTaxSummary) {
    const percent = Number(input.workUsePercent);
    if ((typeof input.workUsePercent === 'string' && input.workUsePercent.trim() === '')
      || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      errors.workUsePercent = 'Enter a percentage from 0 to 100.';
    }
  }

  return errors;
}

export function firstCaptureError(errors: CaptureValidationErrors): CaptureField | undefined {
  return (['title', 'merchant', 'purchaseDate', 'price', 'cancellationUrl', 'workUsePercent'] as const)
    .find((field) => errors[field]);
}
