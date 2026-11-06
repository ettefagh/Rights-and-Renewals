import { describe, it, expect } from 'vitest';
import {
  foldIcalLine,
  escapeIcalText,
  toIcalLocalNineAm,
  buildCalendarDeepLinks,
  generateSubscriptionsIcal,
  generateWarrantiesIcal,
} from '../src/calendar/icalGenerator.js';
import type { WalletItem } from '../src/types/contracts.js';

describe('Dual RFC 5545 iCal Subscription Generator (icalGenerator.ts)', () => {
  const sampleItems: WalletItem[] = [
    {
      id: 'sub-spotify-01',
      title: 'Premium Student',
      category: 'subscription',
      brandSlug: 'spotify',
      merchantOrProvider: 'Spotify',
      purchaseDate: '2026-01-15',
      expiryDate: '2026-12-15',
      priceGrossEur: 5.99,
      isTaxDeductible: false,
      status: 'active',
      searchTokens: ['spotify', 'premium'],
      cancellationUrl: 'https://www.spotify.com/de/account/subscription/',
      hasProofOfPurchase: false,
      createdAt: 1730000000000,
      updatedAt: 1730000000000,
    },
    {
      id: 'hw-macbook-01',
      title: 'MacBook Pro 14 M4',
      category: 'hardware',
      brandSlug: 'apple',
      merchantOrProvider: 'Apple Store',
      purchaseDate: '2026-03-02',
      expiryDate: '2028-03-02',
      priceGrossEur: 1999.0,
      isTaxDeductible: true,
      taxCategory: 'arbeitsmittel',
      beruflicheNutzungProzent: 80,
      status: 'active',
      searchTokens: ['apple', 'macbook'],
      hasProofOfPurchase: true,
      createdAt: 1730000000000,
      updatedAt: 1730000000000,
    },
  ];

  it('folds lines strictly at 75 UTF-8 octets per RFC 5545', () => {
    const longLine =
      'DESCRIPTION:This is a very long description with German umlauts äöüß that exceeds 75 bytes in UTF-8 encoding.';
    const folded = foldIcalLine(longLine);
    const segments = folded.split('\r\n');
    expect(segments.length).toBeGreaterThan(1);
    const encoder = new TextEncoder();
    for (const seg of segments) {
      expect(encoder.encode(seg).length).toBeLessThanOrEqual(75);
    }
  });

  it('escapes RFC 5545 special characters', () => {
    expect(escapeIcalText('A, B; C\\D\nNext')).toBe('A\\, B\\; C\\\\D\\nNext');
  });

  it('formats local 09:00 Europe/Berlin timestamp', () => {
    expect(toIcalLocalNineAm('2026-11-06')).toBe('20261106T090000');
  });

  it('builds webcal://, Google Calendar, and https:// deep links', () => {
    const links = buildCalendarDeepLinks('https://app.cm-lab.de/api/ical/subscriptions/tok123.ics');
    expect(links.httpsUrl).toBe('https://app.cm-lab.de/api/ical/subscriptions/tok123.ics');
    expect(links.webcalUrl).toBe('webcal://app.cm-lab.de/api/ical/subscriptions/tok123.ics');
    expect(links.googleCalendarUrl).toContain('https://calendar.google.com/calendar/r?cid=');
  });

  it('generates Subscriptions iCal feed exclusively with subscription items, RRULE, and cancellation cutoff', () => {
    const ics = generateSubscriptionsIcal(sampleItems, {
      dtstampIso: '2026-11-06T12:00:00Z',
    });
    expect(ics).toContain('X-WR-CALNAME:CM-LAB Subscriptions & Cancellation Guard');
    expect(ics).toContain('X-APPLE-CALENDAR-COLOR:#D96B4B');
    expect(ics).toContain('UID:sub-renewal-sub-spotify-01@cm-lab.de');
    expect(ics).toContain('RRULE:FREQ=MONTHLY');
    expect(ics).toContain('UID:sub-cutoff-sub-spotify-01@cm-lab.de');
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('TRIGGER:-P1D');
    // Must NOT include hardware warranty items
    expect(ics).not.toContain('hw-macbook-01');
  });

  it('generates Warranties iCal feed exclusively with hardware items and 3 statutory milestones (14d, Day 335, 24m)', () => {
    const ics = generateWarrantiesIcal(sampleItems, {
      dtstampIso: '2026-11-06T12:00:00Z',
    });
    expect(ics).toContain('X-WR-CALNAME:CM-LAB Warranties & Legal Deadlines');
    expect(ics).toContain('X-APPLE-CALENDAR-COLOR:#2F524C');
    expect(ics).toContain('UID:war-widerruf-hw-macbook-01@cm-lab.de');
    expect(ics).toContain('UID:war-day335-hw-macbook-01@cm-lab.de');
    expect(ics).toContain('UID:war-expiry-hw-macbook-01@cm-lab.de');
    // Must NOT include subscription items
    expect(ics).not.toContain('sub-spotify-01');
  });
});
