// "Share Today's Bloom" — per-entry image + text sharing.
// Works for ANY saved entry date, not just today. Renders the share card
// from the SAVED artwork data (seed/palette/variant) via the deterministic
// one-pass renderer, so it works even before/mid reveal animation.
// Privacy: journal text is never included in any share output.

import { useEffect, useRef, useState } from 'react';
import type { ToneKey } from '../config';
import { todayKey } from '../utils/date';
import type { Entry } from '../db/store';
import {
  DAY_TAGLINE,
  copyText,
  downloadCanvas,
  formatDayShare,
  renderBloomCard,
  shareCanvas,
} from '../share/card';
import ShareButtons from './ShareButtons';

function effectiveTone(entry: Entry): ToneKey {
  return entry.userTone ?? entry.suggestedTones[0]?.tone ?? 'open';
}

export default function ShareSection({
  entry,
  journalName,
}: {
  entry: Entry;
  journalName: string;
}) {
  const [includeMood, setIncludeMood] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLCanvasElement | null>(null);

  const tone = effectiveTone(entry);

  // (Re)build the full-res card whenever its inputs change; paint a scaled
  // preview. Runs offscreen — never touches the animated artwork canvas.
  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    setCopyFallback(null);
    try {
      const card = renderBloomCard({
        seed: entry.artSeed,
        palette: entry.artPalette,
        variant: entry.artVariant,
        dateKey: entry.dateKey,
        journalName,
        mood: includeMood ? tone : null,
        tagline: DAY_TAGLINE,
      });
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
      if (!cancelled) setStatus('Could not build the share card on this device.');
    }
    return () => {
      cancelled = true;
    };
  }, [entry.artSeed, entry.artPalette, entry.artVariant, entry.dateKey, journalName, includeMood, tone]);

  const filename = `daydrop-${entry.dateKey}.png`;

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
      title: `${journalName} · bloom`,
      text: `${DAY_TAGLINE}`,
    });
    if (result === 'shared') setStatus('Shared.');
    else if (result === 'downloaded') setStatus('Sharing is not available here — downloaded instead.');
    else if (result !== 'cancelled') setStatus('Sharing failed on this device.');
    setBusy(false);
  };

  const handleCopy = async () => {
    if (busy) return;
    setBusy(true);
    const text = formatDayShare({
      dateKey: entry.dateKey,
      mood: tone,
      isToday: entry.dateKey === todayKey(),
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
    <div className="share-section">
      <div className="share-preview-wrap">
        <canvas
          ref={previewRef}
          width={300}
          height={375}
          className="share-preview"
          role="img"
          aria-label="Preview of the share card"
        />
      </div>
      <label className="share-toggle">
        <input
          type="checkbox"
          checked={includeMood}
          onChange={(e) => setIncludeMood(e.target.checked)}
        />
        <span>Include mood label</span>
      </label>
      <p className="muted share-privacy-note">
        Your journal text is never included in shared images or text.
      </p>
      <ShareButtons
        onDownload={handleDownload}
        onShare={handleShare}
        onCopy={handleCopy}
        copyLabel="Copy share text"
        busy={busy}
        status={status}
        copyFallback={copyFallback}
      />
    </div>
  );
}
