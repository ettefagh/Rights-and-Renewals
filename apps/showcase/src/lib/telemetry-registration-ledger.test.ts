import { describe, expect, it, vi } from 'vitest';
import { readRegistrationReport, type RegistrationLedgerAdapter } from './telemetry-registration-ledger';

describe('authoritative registration ledger contract', () => {
  it('reports not_configured rather than fabricating zero registrations', async () => {
    expect(await readRegistrationReport(undefined, '2026-11-01', '2026-11-07')).toEqual({
      status: 'not_configured', registrations: null, reason: 'no_verified_authoritative_source',
    });
  });
  it('validates date bounds and delegates daily aggregates to the durable adapter', async () => {
    const aggregateDaily = vi.fn(async () => [{ day: '2026-11-07', registrations: 4, source: 'authoritative-ledger' }]);
    const adapter = { aggregateDaily, record: vi.fn() } satisfies RegistrationLedgerAdapter;
    expect(await readRegistrationReport(adapter, '2026-11-01', '2026-11-07')).toMatchObject({ status: 'configured', registrations: [{ registrations: 4 }] });
    expect(aggregateDaily).toHaveBeenCalledWith('2026-11-01', '2026-11-07');
    await expect(readRegistrationReport(adapter, 'bad', '2026-11-07')).rejects.toThrow('Invalid daily report range');
  });
});
