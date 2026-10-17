// Small user preferences (journal name). Stored locally via the meta store
// in db/store.ts — same privacy posture as everything else: on-device only.

export const JOURNAL_NAME_KEY = 'journalName';
export const DEFAULT_JOURNAL_NAME = 'My Journal';
export const MAX_JOURNAL_NAME = 20;

/** Normalize a stored/candidate journal name: trim, cap length, fall back. */
export function coerceJournalName(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().slice(0, MAX_JOURNAL_NAME);
  return trimmed.length > 0 ? trimmed : DEFAULT_JOURNAL_NAME;
}
