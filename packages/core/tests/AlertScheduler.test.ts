import { describe, it, expect } from 'vitest';
import {
  computeAlertSchedule,
  computeWallClockEpoch,
  addDays,
  subtractDays,
  addMonthsCalendar,
} from '../src/alerts/AlertScheduler.js';
import type { WalletItem } from '../src/types/contracts.js';

describe('AlertScheduler - 09:00 Europe/Berlin Wall-Clock Engine', () => {
  const baseHardwareItem: WalletItem = {
    id: 'hw-001',
    title: 'ThinkPad T14',
    category: 'hardware',
    brandSlug: 'lenovo',
    merchantOrProvider: 'CampusPoint',
    purchaseDate: '2026-03-15',
    expiryDate: '2028-03-15',
    priceGrossEur: 1200.0,
    isTaxDeductible: true,
    status: 'active',
    searchTokens: ['thinkpad'],
    hasProofOfPurchase: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('ALERT-02 & ALERT-03: schedules Day 335 cliff at 09:00 Europe/Berlin with 0h DST drift', () => {
    const alerts = computeAlertSchedule(
      baseHardwareItem,
      new Date('2026-03-15T00:00:00Z')
    );
    const cliffAlert = alerts.find(
      (a) => a.reminderType === 'day_335_reversal_cliff'
    );

    expect(cliffAlert).toBeDefined();
    // In Europe/Berlin, on 2027-02-13 (CET = UTC+1), 09:00:00 CET is 08:00:00 UTC
    const date = new Date(cliffAlert!.scheduledEpochMs);
    const berlinFormatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatted = berlinFormatter.format(date);
    expect(formatted).toContain('09:00');
    expect(formatted).toContain('13.02.2027');
  });

  it('ALERT-01: schedules T-30d, T-7d, T-1d for subscriptions', () => {
    const subItem: WalletItem = {
      ...baseHardwareItem,
      id: 'sub-001',
      category: 'subscription',
      purchaseDate: '2026-04-01',
      expiryDate: '2027-04-15',
    };
    const alerts = computeAlertSchedule(
      subItem,
      new Date('2026-04-01T00:00:00Z')
    );
    expect(alerts.map((a) => a.reminderType)).toEqual(
      expect.arrayContaining(['30_days_before', '7_days_before', '1_day_before'])
    );
  });

  it('ALERT-03 & ALERT-04: verifies 09:00 wall-clock precision in both summer CEST and winter CET', () => {
    const summerEpoch = computeWallClockEpoch('2026-07-15', 9, 0, 'Europe/Berlin');
    const winterEpoch = computeWallClockEpoch('2026-01-15', 9, 0, 'Europe/Berlin');

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    expect(formatter.format(new Date(summerEpoch))).toBe('09:00');
    expect(formatter.format(new Date(winterEpoch))).toBe('09:00');

    // In summer (CEST = UTC+2), 09:00 is 07:00 UTC
    expect(new Date(summerEpoch).toISOString()).toContain('T07:00:00.000Z');
    // In winter (CET = UTC+1), 09:00 is 08:00 UTC
    expect(new Date(winterEpoch).toISOString()).toContain('T08:00:00.000Z');
  });

  it('ALERT-05: verifies 0h drift across spring and autumn DST transition dates', () => {
    // Spring transition: 2026-03-29 (23h day)
    const springEpoch = computeWallClockEpoch('2026-03-29', 9, 0, 'Europe/Berlin');
    // Autumn transition: 2026-10-25 (25h day)
    const autumnEpoch = computeWallClockEpoch('2026-10-25', 9, 0, 'Europe/Berlin');

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    expect(formatter.format(new Date(springEpoch))).toBe('09:00');
    expect(formatter.format(new Date(autumnEpoch))).toBe('09:00');
  });

  it('ALERT-06: marks past alarms as dismissed or suppresses them', () => {
    const pastItem: WalletItem = {
      ...baseHardwareItem,
      purchaseDate: '2024-01-01',
      expiryDate: '2026-01-01',
    };
    // If includePast is false and now is after expiry
    const suppressed = computeAlertSchedule(pastItem, {
      now: new Date('2026-03-01T00:00:00Z'),
      includePast: false,
    });
    expect(suppressed).toHaveLength(0);

    const included = computeAlertSchedule(pastItem, {
      now: new Date('2026-03-01T00:00:00Z'),
      includePast: true,
    });
    expect(included.length).toBeGreaterThan(0);
    expect(included.every((a) => a.status === 'dismissed')).toBe(true);
  });

  it('ALERT-07: adds calendar months with BGB leap year clamping (§ 188 Abs. 3)', () => {
    // Leap day + 12m clamps to Feb 28
    expect(addMonthsCalendar('2028-02-29', 12)).toBe('2029-02-28');
    // Leap day + 24m clamps to Feb 28
    expect(addMonthsCalendar('2028-02-29', 24)).toBe('2030-02-28');
    // Leap day + 48m lands on next leap year Feb 29
    expect(addMonthsCalendar('2028-02-29', 48)).toBe('2032-02-29');

    expect(addDays('2026-01-01', 10)).toBe('2026-01-11');
    expect(subtractDays('2026-01-11', 10)).toBe('2026-01-01');
  });

  it('ALERT-08: covers default options, custom timezone, and fallback handlers', () => {
    // Calling with no options (exercises defaults)
    const futureItem: WalletItem = {
      ...baseHardwareItem,
      id: 'sub-future',
      category: 'subscription',
      expiryDate: '2099-01-01',
    };
    const defaultAlerts = computeAlertSchedule(futureItem);
    expect(defaultAlerts.length).toBe(3);

    // Calling with custom options
    const customAlerts = computeAlertSchedule(futureItem, {
      timezone: 'UTC',
      targetHour: 14,
      targetMinute: 30,
      includePast: true,
    });
    expect(customAlerts.length).toBe(3);
    const firstEpoch = customAlerts[0]!.scheduledEpochMs;
    const utcIso = new Date(firstEpoch).toISOString();
    expect(utcIso).toContain('T14:30:00.000Z');

    // Fallbacks for empty date parts
    expect(addDays('', 1)).toBeDefined();
    expect(addMonthsCalendar('', 1)).toBeDefined();
  });
});
