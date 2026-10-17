import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { TONE_COLORS, TONE_LABELS, TONE_ORDER } from '../config';
import type { ToneKey } from '../config';
import { addDaysKey, formatLong, parseDateKey, todayKey, yearOfKey } from '../utils/date';
import { entryCount, listEntries } from '../db/store';
import type { Entry } from '../db/store';
import { navigate } from '../nav';
import ArtCanvas from '../components/ArtCanvas';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Empty-day cells follow the page theme (default #ece5d5); days WITH entries
// always use the mood's TONE_COLORS, identical under every theme.
const EMPTY_CELL = 'var(--cell-empty)';

function buildYearGrid(year: number): string[] {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const startDow = parseDateKey(jan1).getDay(); // 0 = Sunday
  const endDow = parseDateKey(dec31).getDay();
  let key = addDaysKey(jan1, -startDow);
  const endKey = addDaysKey(dec31, 6 - endDow);
  const keys: string[] = [];
  for (;;) {
    keys.push(key);
    if (key === endKey) break;
    key = addDaysKey(key, 1);
  }
  return keys;
}

function monthName(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { month: 'short' });
}

function effectiveTone(entry: Entry): ToneKey {
  return entry.userTone ?? entry.suggestedTones[0]?.tone ?? 'open';
}

export default function CalendarPage() {
  const currentYear = yearOfKey(todayKey());
  const [year, setYear] = useState(currentYear);
  const [byDate, setByDate] = useState<Record<string, Entry>>({});
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [list, n] = await Promise.all([listEntries(), entryCount()]);
      if (cancelled) return;
      const map: Record<string, Entry> = {};
      for (const e of list) map[e.dateKey] = e;
      setByDate(map);
      setCount(n);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeks = useMemo(() => {
    const keys = buildYearGrid(year);
    const out: string[][] = [];
    for (let i = 0; i < keys.length; i += 7) out.push(keys.slice(i, i + 7));
    return out;
  }, [year]);

  const monthLabels = useMemo(
    () =>
      // Label each week by the month of its LAST day (Saturday): a leading
      // partial week (e.g. Dec 28 – Jan 3) is labelled "Jan", so adjacent
      // "Dec"/"Jan" labels can never collide in the narrow columns.
      weeks.map((wk, i) => {
        const m = parseDateKey(wk[6]).getMonth();
        if (i === 0) return monthName(wk[6]);
        const prev = parseDateKey(weeks[i - 1][6]).getMonth();
        return m === prev ? '' : monthName(wk[6]);
      }),
    [weeks]
  );

  const today = todayKey();

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Your year in color</h1>
        <div className="cal-controls">
          <button type="button" className="btn btn-ghost" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
            ‹
          </button>
          <span className="cal-year" aria-live="polite">
            {year}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
            ›
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={year === currentYear}
            onClick={() => setYear(currentYear)}
          >
            This year
          </button>
        </div>
      </header>

      {count === 0 && (
        <section className="card empty-year" aria-label="About the calendar">
          <div className="empty-illustration" aria-hidden="true">
            <ArtCanvas
              seed={17017}
              palette="powder"
              variant={0}
              width={300}
              height={180}
              label=""
            />
          </div>
          <h2>Your year, one square at a time…</h2>
          <p className="muted">
            Each day you journal paints one square in the color of its tone. Start today and
            watch the year fill in.
          </p>
        </section>
      )}

      <div className="cal-scroll">
        <div
          className="cal"
          style={{ '--weeks': weeks.length } as CSSProperties}
          role="group"
          aria-label={`Journal calendar for ${year}`}
        >
          <span className="cal-corner" aria-hidden="true" />
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal-wday" aria-hidden="true">
              {d}
            </span>
          ))}
          {weeks.map((wk, wi) => (
            <Fragment key={wi}>
              <span className="cal-month" aria-hidden="true">
                {monthLabels[wi]}
              </span>
              {wk.map((key) => {
                const entry = byDate[key];
                const tone: ToneKey | null = entry ? effectiveTone(entry) : null;
                const label = entry
                  ? `${formatLong(key)} — ${TONE_LABELS[tone as ToneKey]}`
                  : `${formatLong(key)} — no entry`;
                return (
                  <button
                    key={key}
                    type="button"
                    className={
                      'cal-cell' +
                      (entry ? ' has-entry' : ' is-empty') +
                      (key === today ? ' is-today' : '')
                    }
                    style={
                      entry
                        ? { backgroundColor: TONE_COLORS[tone as ToneKey] }
                        : { backgroundColor: EMPTY_CELL }
                    }
                    aria-label={label}
                    aria-current={key === today ? 'date' : undefined}
                    onClick={() => navigate(`#/entry/${key}`)}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <section className="cal-legend card" aria-label="Tone legend">
        <h2 className="section-title">Legend</h2>
        <ul className="legend-list">
          {TONE_ORDER.map((t) => (
            <li key={t} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: TONE_COLORS[t] }} aria-hidden="true" />
              {TONE_LABELS[t]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
