import { describe, expect, it } from 'vitest';
import { validatePolicyVerifiedDate } from './policy-date.js';

describe('validatePolicyVerifiedDate', () => {
  const today = new Date('2026-11-10T12:00:00Z');

  it('accepts valid dates through today and returns the calendar date', () => {
    expect(validatePolicyVerifiedDate('2026-11-10T00:00:00Z', today)).toEqual({
      valid: true,
      date: '2026-11-10',
    });
    expect(validatePolicyVerifiedDate('2026-11-09T08:15+01:00', today)).toEqual({
      valid: true,
      date: '2026-11-09',
    });
  });

  it('rejects future dates before they can be published', () => {
    expect(validatePolicyVerifiedDate('2026-11-11T00:00:00Z', today)).toEqual({
      valid: false,
      reason: 'cannot be in the future',
    });
  });

  it('rejects invalid calendar dates and malformed datetime values', () => {
    expect(validatePolicyVerifiedDate('2026-02-30T00:00:00Z', today).valid).toBe(false);
    expect(validatePolicyVerifiedDate('2026-11-10', today).valid).toBe(false);
    expect(validatePolicyVerifiedDate(undefined, today).valid).toBe(false);
  });
});
