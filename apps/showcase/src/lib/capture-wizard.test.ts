import { describe, expect, it } from 'vitest';
import { firstCaptureError, validateCaptureDetails, type CaptureValidationInput } from '../../../app/src/lib/capture-wizard';

const valid = (overrides: Partial<CaptureValidationInput> = {}): CaptureValidationInput => ({
  category: 'hardware',
  title: 'Headphones',
  merchant: 'Audio shop',
  purchaseDate: '2026-10-20',
  price: '',
  cancellationUrl: '',
  includeInTaxSummary: false,
  workUsePercent: 50,
  ...overrides
});

describe('capture wizard validation', () => {
  it('requires a title, merchant and real non-future date for purchases', () => {
    expect(validateCaptureDetails(valid({ title: '  ', merchant: '', purchaseDate: '2026-02-30' }), new Date(2026, 10, 12))).toEqual({
      title: 'Enter a name for this item.',
      merchant: 'Enter the store or brand.',
      purchaseDate: 'Enter a valid date.'
    });
    expect(validateCaptureDetails(valid({ purchaseDate: '2026-12-01' }), new Date(2026, 10, 12)).purchaseDate)
      .toBe('Date cannot be in the future.');
  });

  it('requires a provider and positive recurring price for subscriptions', () => {
    expect(validateCaptureDetails(valid({ category: 'subscription', merchant: ' ', price: '0' })).merchant)
      .toBe('Enter the subscription provider.');
    expect(validateCaptureDetails(valid({ category: 'subscription', price: '0' })).price)
      .toBe('Enter a recurring price greater than zero.');
    expect(validateCaptureDetails(valid({ category: 'subscription', price: '12,50' }))).toEqual({});
  });

  it('accepts only optional http(s) cancellation URLs and bounded tax use percentages', () => {
    expect(validateCaptureDetails(valid({ category: 'subscription', price: '5', cancellationUrl: 'javascript:alert(1)' })).cancellationUrl)
      .toBe('Enter a valid http or https URL.');
    expect(validateCaptureDetails(valid({ includeInTaxSummary: true, workUsePercent: 101 })).workUsePercent)
      .toBe('Enter a percentage from 0 to 100.');
    expect(validateCaptureDetails(valid({ includeInTaxSummary: true, workUsePercent: '' })).workUsePercent)
      .toBe('Enter a percentage from 0 to 100.');
    expect(validateCaptureDetails(valid({ includeInTaxSummary: true, workUsePercent: 0 }))).toEqual({});
    expect(validateCaptureDetails(valid({ includeInTaxSummary: true, price: '-1' })).price)
      .toBe('Enter a valid purchase price.');
  });

  it('returns the first field to focus without causing persistence', () => {
    const errors = validateCaptureDetails(valid({ title: '', merchant: '' }));
    expect(firstCaptureError(errors)).toBe('title');
    // Validation is a pure projection: it has no callback/store input and cannot save a draft.
    expect(Object.keys(errors)).toEqual(['title', 'merchant']);
  });

  it('validates only visible step fields and ignores subscription-only data for purchases', () => {
    const retainedSubscriptionValues = valid({
      category: 'hardware',
      title: '',
      merchant: '',
      purchaseDate: '',
      cancellationUrl: 'javascript:alert(1)',
      includeInTaxSummary: true,
      workUsePercent: 101,
      price: '-4'
    });

    expect(validateCaptureDetails(retainedSubscriptionValues, new Date(2026, 10, 12), 'details'))
      .toEqual({ title: 'Enter a name for this item.', merchant: 'Enter the store or brand.', purchaseDate: 'Enter a valid date.' });
    expect(validateCaptureDetails(retainedSubscriptionValues, new Date(2026, 10, 12), 'extras'))
      .toEqual({ price: 'Enter a valid purchase price.', workUsePercent: 'Enter a percentage from 0 to 100.' });
    expect(validateCaptureDetails(retainedSubscriptionValues)).toEqual({
      title: 'Enter a name for this item.',
      merchant: 'Enter the store or brand.',
      purchaseDate: 'Enter a valid date.',
      price: 'Enter a valid purchase price.',
      workUsePercent: 'Enter a percentage from 0 to 100.'
    });
  });
});
