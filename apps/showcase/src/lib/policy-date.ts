export type PolicyVerifiedDateValidation =
  | { valid: true; date: string }
  | { valid: false; reason: string };

const ISO_DATETIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function validatePolicyVerifiedDate(
  value: unknown,
  today = new Date(),
): PolicyVerifiedDateValidation {
  if (typeof value !== 'string') {
    return { valid: false, reason: 'must be an ISO 8601 date and time' };
  }

  const match = ISO_DATETIME_PATTERN.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) {
    return { valid: false, reason: 'must be a valid ISO 8601 date and time' };
  }

  const date = match[1];
  const calendarDateTimestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    Number.isNaN(calendarDateTimestamp) ||
    new Date(calendarDateTimestamp).toISOString().slice(0, 10) !== date
  ) {
    return { valid: false, reason: 'must contain a valid calendar date' };
  }

  if (date > today.toISOString().slice(0, 10)) {
    return { valid: false, reason: 'cannot be in the future' };
  }

  return { valid: true, date };
}
