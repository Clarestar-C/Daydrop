import { useEffect, useMemo, useState } from 'react';
import { MAX_CHARS, TONE_COLORS, TONE_LABELS } from '../config';
import type { ToneKey } from '../config';
import { formatLong, todayKey } from '../utils/date';
import { NEUTRAL_PALETTE, defaultPaletteForTone } from '../art/watercolor';
import { PRESETS } from '../audio/engine';
import type { PresetKey } from '../audio/engine';
import { deleteEntry, getEntry, getPreference, saveEntry, setPreference } from '../db/store';
import type { Entry } from '../db/store';
import { navigate } from '../nav';
import ArtCanvas from '../components/ArtCanvas';
import ToneChips from '../components/ToneChips';
import SoundscapeControls from '../components/SoundscapeControls';
import ConfirmDialog from '../components/ConfirmDialog';
import ShareSection from '../components/ShareSection';
import { DEFAULT_JOURNAL_NAME, JOURNAL_NAME_KEY, coerceJournalName } from '../prefs';

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

function coercePreset(preset: string): PresetKey {
  return (PRESET_KEYS as string[]).includes(preset) ? (preset as PresetKey) : 'soft-pad';
}

function effectiveTone(entry: Entry): ToneKey {
  return entry.userTone ?? entry.suggestedTones[0]?.tone ?? 'open';
}

function stamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EntryPage({ dateKey }: { dateKey: string }) {
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [showTones, setShowTones] = useState(false);
  // Reveal state: the artwork is offered as an explicit choice — sound or quiet.
  const [revealChoice, setRevealChoice] = useState<'pending' | 'sound' | 'quiet'>('pending');
  const [playSignal, setPlaySignal] = useState(0);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [revealDone, setRevealDone] = useState(false);
  const [cueDismissed, setCueDismissed] = useState(false);
  // Persisted sound preference; null while loading.
  const [soundEnabled, setSoundEnabled] = useState<boolean | null>(null);
  const [journalName, setJournalName] = useState(DEFAULT_JOURNAL_NAME);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setEntry(undefined);
    setEditing(false);
    setShowTones(false);
    setRevealChoice('pending');
    setPlaySignal(0);
    setAudioNote(null);
    setRevealDone(false);
    setCueDismissed(false);
    setSoundEnabled(null);
    (async () => {
      const e = await getEntry(dateKey);
      const snd = await getPreference<boolean>('soundEnabled', true);
      const jn = await getPreference<string>(JOURNAL_NAME_KEY, DEFAULT_JOURNAL_NAME);
      if (!cancelled) {
        setEntry(e);
        setSoundEnabled(snd);
        setJournalName(coerceJournalName(jn));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  // Escape closes the lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const persist = async (patch: Partial<Entry>) => {
    if (!entry) return;
    const next: Entry = { ...entry, ...patch, updatedAt: Date.now() };
    await saveEntry(next);
    setEntry(next);
  };

  const isToday = dateKey === todayKey();

  if (entry === undefined || soundEnabled === null) {
    return (
      <div className="page">
        <div className="card" aria-busy="true">
          <p className="muted">Opening this day…</p>
        </div>
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">{formatLong(dateKey)}</h1>
        </header>
        <section className="card empty-state" aria-label="No entry">
          <h2>Nothing saved for this day yet.</h2>
          {isToday && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('#/')}>
              Write today&rsquo;s sentence
            </button>
          )}
          {!isToday && (
            <p className="muted">This day has no entry.</p>
          )}
        </section>
      </div>
    );
  }

  const tone = effectiveTone(entry);
  const preset = coercePreset(entry.soundscape);

  // The reveal is always the user's explicit choice — navigating here is not
  // consent to play audio. "Reveal with sound" starts the soundscape as part
  // of the tap gesture (valid for Web Audio); "Reveal quietly" stays silent.
  const startQuietReveal = () => setRevealChoice('quiet');
  const startSoundReveal = () => {
    setRevealChoice('sound');
    setPlaySignal((s) => s + 1);
  };
  const revealActive = revealChoice !== 'pending' && !revealDone;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">{formatLong(dateKey)}</h1>
      </header>

      <div className="art-wrap card">
        {revealChoice === 'pending' ? (
          <div className="reveal-pending">
            <ArtCanvas
              seed={entry.artSeed}
              palette={entry.artPalette}
              variant={entry.artVariant}
              width={900}
              height={560}
              preview
              label="Watercolor paper, waiting to be revealed"
            />
            <div className="reveal-choice" role="group" aria-label="How would you like to view this entry?">
              <p className="reveal-invite">Your watercolor is ready.</p>
              <div className="btn-row reveal-btns">
                <button type="button" className="btn btn-primary" onClick={startSoundReveal}>
                  Reveal with sound
                </button>
                <button type="button" className="btn btn-ghost" onClick={startQuietReveal}>
                  Reveal quietly
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="art-clickable"
              onClick={() => {
                if (revealDone) {
                  setLightbox(true);
                } else {
                  // Tapping mid-reveal completes it immediately.
                  setRevealDone(true);
                }
              }}
              aria-label={revealDone ? 'View larger watercolor' : 'Show full artwork immediately'}
            >
              <ArtCanvas
                seed={entry.artSeed}
                palette={entry.artPalette}
                variant={entry.artVariant}
                width={900}
                height={560}
                label={`Watercolor artwork reflecting ${TONE_LABELS[tone].toLowerCase()}`}
                reveal={revealActive}
                onRevealComplete={() => setRevealDone(true)}
              />
            </button>
            {revealActive && !reducedMotion && (
              <div className="reveal-skip-row">
                <button type="button" className="btn btn-ghost" onClick={() => setRevealDone(true)}>
                  Show full artwork
                </button>
              </div>
            )}
            {revealActive && !cueDismissed && !reducedMotion && (
              <div className="breath-cue" role="status">
                <span className="breath-text">Take a moment — breathe at your own pace.</span>
                <button
                  type="button"
                  className="breath-dismiss"
                  aria-label="Dismiss"
                  onClick={() => setCueDismissed(true)}
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <section className="card" aria-label="Tone">
        <div className="tone-row">
          <p className="tone-tag">
            <span className="chip-dot" style={{ backgroundColor: TONE_COLORS[tone] }} aria-hidden="true" />
            {TONE_LABELS[tone]}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => setShowTones((s) => !s)} aria-expanded={showTones}>
            Change
          </button>
        </div>
        {showTones && (
          <ToneChips
            value={tone}
            onChange={(t) => {
              // The chosen mood is the source of truth: artwork palette,
              // mood chip and calendar swatch all follow it. Seed and text
              // are untouched, so the composition stays deterministic.
              void persist({ userTone: t, artPalette: defaultPaletteForTone(t) });
            }}
          />
        )}
      </section>

      <section className="card" aria-label="Palette">
        <h2 className="section-title">Palette</h2>
        <div className="palette-row">
          <button
            type="button"
            className="palette-btn"
            onClick={() => {
              /* kept as-is; nothing to change */
            }}
          >
            Keep this palette
          </button>
          <button
            type="button"
            className="palette-btn"
            onClick={() => {
              void persist({ artVariant: entry.artVariant + 1 });
            }}
          >
            Try another interpretation
          </button>
          <button
            type="button"
            className="palette-btn"
            onClick={() => {
              void persist({ artPalette: NEUTRAL_PALETTE });
            }}
          >
            Use a neutral palette
          </button>
        </div>
      </section>

      <section className="card" aria-label="Soundscape">
        <h2 className="section-title">Soundscape</h2>
        <SoundscapeControls
          preset={preset}
          playSignal={playSignal}
          onPlayResult={(ok) => {
            if (!ok) {
              setAudioNote('Sound could not start on this device — enjoy the artwork quietly.');
            }
          }}
          initialMuted={!soundEnabled}
          onMutedChange={(m) => {
            setSoundEnabled(!m);
            void setPreference('soundEnabled', !m);
          }}
        />
        {audioNote && (
          <p className="audio-note" role="status">
            {audioNote}
          </p>
        )}
        <div className="preset-chips" role="group" aria-label="Choose a soundscape">
          {PRESET_KEYS.map((pk) => (
            <button
              key={pk}
              type="button"
              className="preset-chip"
              aria-pressed={preset === pk}
              onClick={() => {
                void persist({ soundscape: pk });
              }}
            >
              {PRESETS[pk].label}
            </button>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Share this bloom">
        <h2 className="section-title">Share this bloom</h2>
        <ShareSection entry={entry} journalName={journalName} />
      </section>

      <section className="card" aria-label="Your words">
        {editing ? (
          <div className="editor">
            <label className="visually-hidden" htmlFor="entry-edit">
              Edit your entry
            </label>
            <textarea
              id="entry-edit"
              className="journal-text"
              maxLength={MAX_CHARS}
              rows={5}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
            <p className="char-count" aria-live="polite">
              {draftText.length} / {MAX_CHARS}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={draftText.trim().length === 0}
                onClick={() => setConfirmReplace(true)}
              >
                Save changes
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="entry-text">{entry.text}</p>
            <p className="entry-meta">
              Saved {stamp(entry.createdAt)}
              {entry.updatedAt > entry.createdAt && ` · Updated ${stamp(entry.updatedAt)}`}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setDraftText(entry.text);
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </div>
          </>
        )}
      </section>

      {lightbox && (
        <div className="modal-overlay lightbox-overlay" onClick={() => setLightbox(false)}>
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Watercolor, larger view"
            onClick={(e) => e.stopPropagation()}
          >
            <ArtCanvas
              seed={entry.artSeed}
              palette={entry.artPalette}
              variant={entry.artVariant}
              width={1200}
              height={750}
              label={`Watercolor artwork reflecting ${TONE_LABELS[tone].toLowerCase()}, enlarged`}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setLightbox(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReplace}
        title={isToday ? "Replace today's entry?" : 'Replace this entry?'}
        message="Your new words will replace what is saved. This cannot be undone."
        confirmLabel="Replace entry"
        danger
        onConfirm={async () => {
          await persist({ text: draftText });
          setEditing(false);
          setConfirmReplace(false);
        }}
        onCancel={() => setConfirmReplace(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        message={`This will permanently remove your entry for ${formatLong(dateKey)}.`}
        confirmLabel="Delete entry"
        danger
        onConfirm={async () => {
          await deleteEntry(dateKey);
          navigate('#/');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
