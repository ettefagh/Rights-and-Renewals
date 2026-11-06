/**
 * AlertScheduler.ts - Proactive Notification Scheduler (09:00 Europe/Berlin Wall-Clock)
 * CM-LAB: Sovereign Consumer Rights, Subscription & Tax-Ready Wallet PWA
 */

import type {
  WalletItem,
  AlarmScheduleRecord,
  ReminderType,
  AlarmStatus,
} from '../types/contracts.js';

export interface AlertSchedulerOptions {
  now?: Date;
  timezone?: string; // Default: 'Europe/Berlin'
  targetHour?: number; // Default: 9
  targetMinute?: number; // Default: 0
  includePast?: boolean; // Default: false (suppresses expired alarms)
}

/**
 * Derives the exact UTC millisecond epoch for 09:00:00 wall-clock time in Europe/Berlin
 * on any target calendar date string (YYYY-MM-DD), with 0h drift across CET/CEST transitions.
 */
export function computeWallClockEpoch(
  targetDateString: string,
  hour = 9,
  minute = 0,
  timezone = 'Europe/Berlin'
): number {
  const parts = targetDateString.split('-');
  const yearStr = parts[0] ?? '1970';
  const monthStr = parts[1] ?? '01';
  const dayStr = parts[2] ?? '01';

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 1. Initial UTC anchor
  const tempUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const tempDate = new Date(tempUtc);

  // 2. Resolve local time components in target timezone via Intl API
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedParts = formatter.formatToParts(tempDate);
  const getPart = (type: string) =>
    formattedParts.find((p) => p.type === type)?.value ?? '00';

  const localYear = parseInt(getPart('year'), 10);
  const localMonth = parseInt(getPart('month'), 10);
  const localDay = parseInt(getPart('day'), 10);
  const localHour = parseInt(getPart('hour'), 10);
  const localMinute = parseInt(getPart('minute'), 10);

  // 3. Compute offset difference in ms
  const localEpoch = Date.UTC(
    localYear,
    localMonth - 1,
    localDay,
    localHour,
    localMinute,
    0
  );
  const offsetMs = localEpoch - tempUtc;

  // 4. Invert offset: target UTC epoch
  let resultEpoch = tempUtc - offsetMs;

  // 5. Verification & convergence check
  const checkParts = formatter.formatToParts(new Date(resultEpoch));
  const checkHour = parseInt(
    checkParts.find((p) => p.type === 'hour')?.value ?? '00',
    10
  );
  const checkMinute = parseInt(
    checkParts.find((p) => p.type === 'minute')?.value ?? '00',
    10
  );
  const hourDiff = checkHour - hour;
  const minDiff = checkMinute - minute;
  if (hourDiff !== 0 || minDiff !== 0) {
    resultEpoch -= hourDiff * 3600000 + minDiff * 60000;
  }

  return resultEpoch;
}

/**
 * Adds calendar days to an ISO YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] || '1970', 10);
  const m = parseInt(parts[1] || '01', 10);
  const d = parseInt(parts[2] || '01', 10);

  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0]!;
}

/**
 * Subtracts calendar days from an ISO YYYY-MM-DD string.
 */
export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

/**
 * Adds calendar months with BGB § 188 Abs. 3 month-clamping precision (e.g. 2028-02-29 + 12m -> 2029-02-28).
 */
export function addMonthsCalendar(dateStr: string, months: number): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] || '1970', 10);
  const m = parseInt(parts[1] || '01', 10);
  const d = parseInt(parts[2] || '01', 10);

  const totalMonths = m - 1 + months;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1; // 1-indexed

  // Determine max days in target month
  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(d, maxDays);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
}

/**
 * Computes deterministic alert schedules for a WalletItem:
 * - T-30d, T-7d, T-1d before expiryDate
 * - Day 335 BGB § 477 cutoff for hardware items
 */
export function computeAlertSchedule(
  item: WalletItem,
  optionsOrNow?: AlertSchedulerOptions | Date
): AlarmScheduleRecord[] {
  let options: AlertSchedulerOptions = {};
  if (optionsOrNow instanceof Date) {
    options = { now: optionsOrNow };
  } else if (optionsOrNow) {
    options = optionsOrNow;
  }

  const nowEpoch = options.now ? options.now.getTime() : Date.now();
  const timezone = options.timezone ?? 'Europe/Berlin';
  const targetHour = options.targetHour ?? 9;
  const targetMinute = options.targetMinute ?? 0;
  const includePast = options.includePast ?? false;

  const schedules: AlarmScheduleRecord[] = [];

  // 1. Determine target expiry date
  const baseExpiryDate = item.expiryDate;

  // Standard 30d, 7d, 1d triggers
  const standardTriggers: Array<{ offset: number; type: ReminderType }> = [
    { offset: 30, type: '30_days_before' },
    { offset: 7, type: '7_days_before' },
    { offset: 1, type: '1_day_before' },
  ];

  for (const trigger of standardTriggers) {
    const triggerDateStr = subtractDays(baseExpiryDate, trigger.offset);
    const scheduledEpochMs = computeWallClockEpoch(
      triggerDateStr,
      targetHour,
      targetMinute,
      timezone
    );
    const isPast = scheduledEpochMs <= nowEpoch;

    if (!isPast || includePast) {
      schedules.push({
        id: `alarm_${item.id}_${trigger.type}`,
        itemId: item.id,
        reminderType: trigger.type,
        scheduledEpochMs,
        status: isPast ? 'dismissed' : 'pending',
      });
    }
  }

  // 2. Hardware-specific trigger: Day 335 BGB § 477 Reversed Burden of Proof Cliff
  if (item.category === 'hardware' && item.purchaseDate) {
    // Day 335 from purchase date (or 30 days before the 12-month cutoff)
    const day335DateStr = addDays(item.purchaseDate, 335);
    const day335Epoch = computeWallClockEpoch(
      day335DateStr,
      targetHour,
      targetMinute,
      timezone
    );
    const isPast = day335Epoch <= nowEpoch;

    if (!isPast || includePast) {
      schedules.push({
        id: `alarm_${item.id}_day_335_reversal_cliff`,
        itemId: item.id,
        reminderType: 'day_335_reversal_cliff',
        scheduledEpochMs: day335Epoch,
        status: isPast ? 'dismissed' : 'pending',
      });
    }
  }

  // Sort chronologically by scheduledEpochMs
  return schedules.sort((a, b) => a.scheduledEpochMs - b.scheduledEpochMs);
}
