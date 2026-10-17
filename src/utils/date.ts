// Date helpers — all keys are local-calendar "YYYY-MM-DD" strings.
// Never use UTC conversion: journal entries belong to the day the user lived them.

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True if `key` is a well-formed YYYY-MM-DD date that actually exists on the calendar. */
export function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Round-trip through a local Date to catch e.g. 2024-02-30.
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Format a local Date as YYYY-MM-DD (local time — no UTC shift). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's key in local time. */
export function todayKey(): string {
  return localDateKey(new Date());
}

/** Parse a date key into a Date at local midnight. Throws on invalid input. */
export function parseDateKey(key: string): Date {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid date key: ${key}`);
  }
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a date key by n days (n may be negative), returned as a date key. */
export function addDaysKey(key: string, n: number): string {
  const dt = parseDateKey(key);
  dt.setDate(dt.getDate() + n);
  return localDateKey(dt);
}

/** The calendar year a date key belongs to, e.g. 2026. */
export function yearOfKey(key: string): number {
  return parseDateKey(key).getFullYear();
}

/** Long display form, e.g. "Friday, October 16, 2026". */
export function formatLong(key: string): string {
  const dt = parseDateKey(key);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
