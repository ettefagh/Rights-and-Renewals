/** Server-only contract for facts from a verified account-creation source. */
export type AuthoritativeRegistration = {
  sourceEventId: string;
  accountId: string;
  createdAt: string;
  verifiedBy: string;
};

export type DailyRegistrationAggregate = { day: string; registrations: number; source: string };

/** Adapters must be durable and idempotent on sourceEventId; auth material is never accepted. */
export interface RegistrationLedgerAdapter {
  record(event: AuthoritativeRegistration): Promise<'recorded' | 'duplicate'>;
  aggregateDaily(fromDay: string, toDay: string): Promise<DailyRegistrationAggregate[]>;
}

export type RegistrationReport =
  | { status: 'not_configured'; registrations: null; reason: 'no_verified_authoritative_source' }
  | { status: 'configured'; registrations: DailyRegistrationAggregate[] };

export async function readRegistrationReport(
  adapter: RegistrationLedgerAdapter | undefined,
  fromDay: string,
  toDay: string,
): Promise<RegistrationReport> {
  if (!adapter) return { status: 'not_configured', registrations: null, reason: 'no_verified_authoritative_source' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDay) || !/^\d{4}-\d{2}-\d{2}$/.test(toDay) || fromDay > toDay) {
    throw new Error('Invalid daily report range');
  }
  return { status: 'configured', registrations: await adapter.aggregateDaily(fromDay, toDay) };
}
