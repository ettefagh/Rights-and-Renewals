/**
 * icalGenerator.ts - Dual RFC 5545 iCal Subscription Feed Generator
 * Generates separate calendar feeds for:
 *  1. Subscriptions & Cancellation Guard (`subscriptions.ics`)
 *  2. Warranties & Statutory Legal Deadlines (`warranties.ics`)
 * Ported & adapted from Hable (campusweb) RFC 5545 75-octet folding & deep-link patterns.
 */

import type { WalletItem } from '../types/contracts.js';
import { addDays, addMonthsCalendar, subtractDays } from '../alerts/AlertScheduler.js';
import { rollForwardWerktag } from '../legal/bgbNoticeCompiler.js';

export interface IcalGeneratorOptions {
  baseAppUrl?: string;
  dtstampIso?: string;
  defaultBillingCycle?: 'MONTHLY' | 'YEARLY';
  defaultNoticeDays?: number;
}

export interface CalendarSubscriptionLinks {
  httpsUrl: string;
  webcalUrl: string;
  googleCalendarUrl: string;
}

/**
 * RFC 5545 Section 3.1: Content lines MUST be folded at 75 octets (UTF-8 bytes).
 */
export function foldIcalLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  let result = '';
  let currentLine = '';
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > 75) {
      result += currentLine + '\r\n ';
      currentLine = char;
      currentBytes = charBytes + 1;
    } else {
      currentLine += char;
      currentBytes += charBytes;
    }
  }
  result += currentLine;
  return result;
}

/**
 * RFC 5545 Section 3.3.11: Escape TEXT property values.
 */
export function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Converts YYYY-MM-DD into compact iCal date-time at 09:00:00 local Europe/Berlin (`YYYYMMDDTHHMMSS`).
 */
export function toIcalLocalNineAm(dateStr: string): string {
  const compactDate = dateStr.replace(/-/g, '');
  return `${compactDate}T090000`;
}

/**
 * Builds Apple Calendar (`webcal://`), Google Calendar (`?cid=`), and HTTPS feed URLs
 * matching Hable (`SecureCalendarInput.svelte`).
 */
export function buildCalendarDeepLinks(feedUrl: string): CalendarSubscriptionLinks {
  const httpsUrl = feedUrl.replace(/^webcal:\/\//i, 'https://');
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, 'webcal://');
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  return {
    httpsUrl,
    webcalUrl,
    googleCalendarUrl,
  };
}

function formatDtstamp(dtstampIso?: string): string {
  const iso = dtstampIso ?? new Date().toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * 1. Generates RFC 5545 iCal feed exclusively for Subscriptions (`subscriptions.ics`).
 * Includes recurring billing cycles (`RRULE`) + explicit § 309 Nr. 9 BGB cancellation cutoff events.
 */
export function generateSubscriptionsIcal(
  items: WalletItem[],
  options: IcalGeneratorOptions = {}
): string {
  const baseAppUrl = (options.baseAppUrl ?? 'https://app.cm-lab.de').replace(/\/+$/, '');
  const dtstamp = formatDtstamp(options.dtstampIso);
  const defaultFreq = options.defaultBillingCycle ?? 'MONTHLY';
  const noticeDays = options.defaultNoticeDays ?? 30;

  const subscriptionItems = items.filter(
    (item) => item.category === 'subscription' && item.status !== 'cancelled'
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CM-LAB//Sovereign Consumer Wallet Subscriptions//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CM-LAB Subscriptions & Cancellation Guard',
    'X-WR-TIMEZONE:Europe/Berlin',
    'X-APPLE-CALENDAR-COLOR:#D96B4B',
  ];

  for (const item of subscriptionItems) {
    const cancelUrl = item.cancellationUrl || `${baseAppUrl}/?item=${encodeURIComponent(item.id)}`;
    const noticeCutoffDate = rollForwardWerktag(subtractDays(item.expiryDate, noticeDays));

    // Event A: Recurring Renewal / Billing Event
    lines.push(
      'BEGIN:VEVENT',
      `UID:sub-renewal-${item.id}@cm-lab.de`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${toIcalLocalNineAm(item.purchaseDate)}`,
      `DTEND;TZID=Europe/Berlin:${item.purchaseDate.replace(/-/g, '')}T093000`,
      `RRULE:FREQ=${defaultFreq}`,
      `SUMMARY:${escapeIcalText(`💳 Renewal: ${item.merchantOrProvider} — ${item.title} (€${item.priceGrossEur.toFixed(2)})`)}`,
      `DESCRIPTION:${escapeIcalText(
        `Subscription: ${item.merchantOrProvider} (${item.title})\nAmount: €${item.priceGrossEur.toFixed(2)}\nStatutory Rule: § 309 Nr. 9 BGB (Max 1-month notice after initial term)\nDirect Cancellation (§ 312k BGB): ${cancelUrl}`
      )}`,
      `URL:${cancelUrl}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );

    // Event B: Explicit Cancellation Notice Cutoff Guard (§ 309 Nr. 9 BGB)
    lines.push(
      'BEGIN:VEVENT',
      `UID:sub-cutoff-${item.id}@cm-lab.de`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${toIcalLocalNineAm(noticeCutoffDate)}`,
      `DTEND;TZID=Europe/Berlin:${noticeCutoffDate.replace(/-/g, '')}T100000`,
      `SUMMARY:${escapeIcalText(`⚠️ Cancel Deadline: ${item.merchantOrProvider} (${item.title})`)}`,
      `DESCRIPTION:${escapeIcalText(
        `Last day to cancel ${item.merchantOrProvider} (${item.title}) before renewal on ${item.expiryDate}.\nNotice Period: ${noticeDays} days (§ 309 Nr. 9 BGB).\nAmount at Risk: €${item.priceGrossEur.toFixed(2)}\nCancel Online (§ 312k BGB): ${cancelUrl}`
      )}`,
      `URL:${cancelUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`7 days left to cancel ${item.merchantOrProvider} (€${item.priceGrossEur.toFixed(2)})`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`FINAL DAY tomorrow to cancel ${item.merchantOrProvider} (€${item.priceGrossEur.toFixed(2)})`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcalLine).join('\r\n') + '\r\n';
}

/**
 * 2. Generates RFC 5545 iCal feed exclusively for Warranties & Statutory Returns (`warranties.ics`).
 * Includes 3 non-recurring legal milestones per hardware item (rolled forward via § 193 BGB Werktag):
 *  - Day 14 Widerrufsfrist (§ 355 BGB)
 *  - Day 335 Reversed Burden-of-Proof Cliff (§ 477 BGB)
 *  - Month 24 Statutory Gewährleistung Expiry (§ 438 Abs. 1 Nr. 3 BGB)
 */
export function generateWarrantiesIcal(
  items: WalletItem[],
  options: IcalGeneratorOptions = {}
): string {
  const baseAppUrl = (options.baseAppUrl ?? 'https://app.cm-lab.de').replace(/\/+$/, '');
  const dtstamp = formatDtstamp(options.dtstampIso);

  const hardwareItems = items.filter(
    (item) => item.category === 'hardware' && item.status !== 'cancelled'
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CM-LAB//Sovereign Consumer Wallet Warranties//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CM-LAB Warranties & Legal Deadlines',
    'X-WR-TIMEZONE:Europe/Berlin',
    'X-APPLE-CALENDAR-COLOR:#2F524C',
  ];

  for (const item of hardwareItems) {
    const disputeUrl = `${baseAppUrl}/?dispute=${encodeURIComponent(item.id)}`;

    // Milestone 1: 14-Day Widerrufsfrist (§ 355 BGB)
    const widerrufDate = rollForwardWerktag(addDays(item.purchaseDate, 14));
    lines.push(
      'BEGIN:VEVENT',
      `UID:war-widerruf-${item.id}@cm-lab.de`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${toIcalLocalNineAm(widerrufDate)}`,
      `DTEND;TZID=Europe/Berlin:${widerrufDate.replace(/-/g, '')}T100000`,
      `SUMMARY:${escapeIcalText(`📦 14-Day Return Ends: ${item.title} (${item.merchantOrProvider})`)}`,
      `DESCRIPTION:${escapeIcalText(
        `Statutory 14-day withdrawal deadline (§ 355 BGB Widerrufsfrist, adjusted for § 193 BGB Werktag).\nItem: ${item.title}\nMerchant: ${item.merchantOrProvider}\nPrice: €${item.priceGrossEur.toFixed(2)}\nGenerate Template T2 Withdrawal Notice: ${disputeUrl}`
      )}`,
      `URL:${disputeUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P3D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`3 days left in 14-day return window for ${item.title}`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`1 day left in 14-day return window for ${item.title}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );

    // Milestone 2: Day 335 Reversed Burden-of-Proof Cliff (§ 477 BGB)
    const day335Date = rollForwardWerktag(addDays(item.purchaseDate, 335));
    lines.push(
      'BEGIN:VEVENT',
      `UID:war-day335-${item.id}@cm-lab.de`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${toIcalLocalNineAm(day335Date)}`,
      `DTEND;TZID=Europe/Berlin:${day335Date.replace(/-/g, '')}T100000`,
      `SUMMARY:${escapeIcalText(`⚖️ § 477 BGB Proof Cliff (30d left): ${item.title}`)}`,
      `DESCRIPTION:${escapeIcalText(
        `30 days remaining before the 12-month reversed burden of proof (§ 477 Abs. 1 BGB) expires.\nInspect ${item.title} (${item.merchantOrProvider}) now—any defect reported within 12 months is presumed to have existed at delivery.\nOpen Legal Dispute Drawer (T1): ${disputeUrl}`
      )}`,
      `URL:${disputeUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`§ 477 BGB Burden-of-Proof check for ${item.title}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );

    // Milestone 3: 24-Month Statutory Gewährleistung Expiry (§ 438 Abs. 1 Nr. 3 BGB)
    const warrantyEndRaw = item.expiryDate || addMonthsCalendar(item.purchaseDate, 24);
    const warrantyEndDate = rollForwardWerktag(warrantyEndRaw);
    lines.push(
      'BEGIN:VEVENT',
      `UID:war-expiry-${item.id}@cm-lab.de`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${toIcalLocalNineAm(warrantyEndDate)}`,
      `DTEND;TZID=Europe/Berlin:${warrantyEndDate.replace(/-/g, '')}T100000`,
      `SUMMARY:${escapeIcalText(`🛡️ 24m Warranty Expires: ${item.title} (${item.merchantOrProvider})`)}`,
      `DESCRIPTION:${escapeIcalText(
        `Final day of 24-month statutory warranty (§ 438 Abs. 1 Nr. 3 BGB, adjusted for § 193 BGB Werktag).\nItem: ${item.title} (€${item.priceGrossEur.toFixed(2)})\nMerchant: ${item.merchantOrProvider}\nGenerate Nacherfüllung Notice (§ 439 BGB Template T1): ${disputeUrl}`
      )}`,
      `URL:${disputeUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P30D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`30 days until 24-month warranty expires for ${item.title}`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcalText(`7 days until 24-month warranty expires for ${item.title}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcalLine).join('\r\n') + '\r\n';
}
