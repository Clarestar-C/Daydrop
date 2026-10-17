// "Share My Year in Color" — export the calendar year as a high-res PNG
// built locally from ACTUAL saved mood data. Missing days stay empty;
// nothing is fabricated. No journal text is included. No network, no upload.

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_JOURNAL_NAME, JOURNAL_NAME_KEY, coerceJournalName } from '../prefs';
import type { ToneKey } from '../config';
import { todayKey, yearOfKey } from '../utils/date';
import { getPreference, listEntries } from '../db/store';
import type { Entry } from '../db/store';
import {
  buildYearGridData,
  copyText,
  downloadCanvas,
  formatYearShare,
  renderYearCard,
  shareCanvas,
} from '../share/card';
import type { YearGrid } from '../share/card';
import ShareButtons from '../components/ShareButtons';

function effectiveTone(entry: Entry): ToneKey {
  return entry.userTone ?? entry.suggestedTones[0]?.tone ?? 'open';
}

export default function ExportPage() {
  const currentYear = yearOfKey(todayKey());
  const [year, setYear] = useState(currentYear);
  const [years, setYears] = useState<number[]>([currentYear]);
  const [tonesByDate, setTonesByDate] = useState<Record<string, ToneKey>>({});
  const [journalName, setJournalName] = useState(DEFAULT_JOURNAL_NAME);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [list, name] = await Promise.all([
        listEntries(),
        getPreference<string>(JOURNAL_NAME_KEY, DEFAULT_JOURNAL_NAME),
      ]);
      if (cancelled) return;
      const tones: Record<string, ToneKey> = {};
      const yearSet = new Set<number>([currentYear]);
      for (const e of list) {
        tones[e.dateKey] = effectiveTone(e);
        yearSet.add(yearOfKey(e.dateKey));
      }
      setTonesByDate(tones);
      setYears([...yearSet].sort((a, b) => b - a));
      setJournalName(coerceJournalName(name));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  const grid: YearGrid = useMemo(
    () => buildYearGridData(year, tonesByDate),
    [year, tonesByDate],
  );

  // Build the full-res card offscreen whenever inputs change; paint preview.
  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    setCopyFallback(null);
    try {
      const card = renderYearCard({ year, journalName, grid });
      if (cancelled) return;
      cardRef.current = card;
      const preview = previewRef.current;
      if (preview) {
        const pctx = preview.getContext('2d');
        if (pctx) {
          pctx.clearRect(0, 0, preview.width, preview.height);
          pctx.drawImage(card, 0, 0, preview.width, preview.height);
        }
      }
    } catch {
      if (!cancelled) setStatus('Could not build the year card on this device.');
    }
    return () => {
      cancelled = true;
    };
  }, [year, journalName, grid]);

  const filename = `daydrop-${year}-in-color.png`;

  const handleDownload = async () => {
    const card = cardRef.current;
    if (!card || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await downloadCanvas(card, filename);
      setStatus('Downloaded. Check your downloads folder.');
    } catch {
      setStatus('Download failed on this device.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const card = cardRef.current;
    if (!card || busy) return;
    setBusy(true);
    setStatus(null);
    const result = await shareCanvas(card, filename, {
      title: `${journalName} · ${year} in color`,
      text: `${year} in color — ${grid.recorded} days recorded.`,
    });
    if (result === 'shared') setStatus('Shared.');
    else if (result === 'downloaded') setStatus('Sharing is not available here — downloaded instead.');
    else if (result !== 'cancelled') setStatus('Sharing failed on this device.');
    setBusy(false);
  };

  const handleCopy = async () => {
    if (busy) return;
    setBusy(true);
    const text = formatYearShare({
      year,
      recorded: grid.recorded,
      monthDominant: grid.monthDominant,
    });
    const ok = await copyText(text);
    if (ok) {
      setCopyFallback(null);
      setStatus('Copied to clipboard.');
    } else {
      setCopyFallback(text);
      setStatus(null);
    }
    setBusy(false);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Share my year in color</h1>
        <p className="muted">
          A high-resolution image of your year, built on this device from your saved entries.
          Journal text is never included.
        </p>
      </header>

      <section className="card" aria-label="Choose a year">
        <div className="export-year-row">
          <label className="export-year-label" htmlFor="export-year">
            Year
          </label>
          <select
            id="export-year"
            className="export-year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="muted" aria-live="polite">
            {grid.recorded === 0
              ? `No entries yet in ${year}`
              : `${grid.recorded} day${grid.recorded === 1 ? '' : 's'} recorded`}
          </span>
        </div>
      </section>

      <section className="card" aria-label="Year card preview">
        <div className="share-preview-wrap share-preview-year">
          <canvas
            ref={previewRef}
            width={400}
            height={500}
            className="share-preview"
            role="img"
            aria-label={`Preview of the ${year} in color share card`}
          />
        </div>
        <ShareButtons
          onDownload={handleDownload}
          onShare={handleShare}
          onCopy={handleCopy}
          copyLabel="Copy year summary"
          busy={busy}
          status={status}
          copyFallback={copyFallback}
        />
      </section>
    </div>
  );
}
