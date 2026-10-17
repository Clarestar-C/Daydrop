import { useEffect, useRef, useState } from 'react';
import { MAX_CHARS, TONE_LABELS } from '../config';
import type { ToneKey } from '../config';
import { formatLong, todayKey } from '../utils/date';
import { ANALYSIS_NOTE, analyzeTone } from '../emotion/analyze';
import { NEUTRAL_PALETTE, defaultPaletteForTone, palettesForTone, randomSeed } from '../art/watercolor';
import { PRESETS, presetForTone } from '../audio/engine';
import type { PresetKey } from '../audio/engine';
import { getEntry, getPreference, saveEntry } from '../db/store';
import type { Entry, ToneScore } from '../db/store';
import { JOURNAL_NAME_KEY, DEFAULT_JOURNAL_NAME, coerceJournalName } from '../prefs';
import { navigate } from '../nav';
import ArtCanvas from '../components/ArtCanvas';
import ToneChips from '../components/ToneChips';
import SoundscapeControls from '../components/SoundscapeControls';
import InstallPrompt from '../components/InstallPrompt';
import { MoonCrescent, Sprig, WashCorner } from '../components/decor';
import { DropletIcon, FloralIcon, PencilIcon, SparkleIcon } from '../components/icons';

type Phase = 'loading' | 'compose' | 'transition' | 'result' | 'existing';

interface Draft {
  seed: number;
  palette: string;
  variant: number;
  tones: ToneScore[];
  confidence: 'high' | 'medium' | 'low';
  preset: PresetKey;
}

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [text, setText] = useState('');
  const [existing, setExisting] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [chosenTone, setChosenTone] = useState<ToneKey>('open');
  const [chosenPalette, setChosenPalette] = useState<string>(NEUTRAL_PALETTE);
  const [variant, setVariant] = useState(0);
  const [chosenPreset, setChosenPreset] = useState<PresetKey>('soft-pad');
  const [saving, setSaving] = useState(false);
  const [journalName, setJournalName] = useState(DEFAULT_JOURNAL_NAME);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const key = todayKey();
  const empty = text.trim().length === 0;

  useEffect(() => {
    let cancelled = false;
    getEntry(key).then((entry) => {
      if (cancelled) return;
      if (entry) {
        setExisting(entry);
        setPhase('existing');
      } else {
        setPhase('compose');
      }
    });
    getPreference<string>(JOURNAL_NAME_KEY, DEFAULT_JOURNAL_NAME).then((n) => {
      if (!cancelled) setJournalName(coerceJournalName(n));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // "Open Journal" — go to today's entry if it exists, otherwise scroll to
  // the composer and focus it.
  const openJournal = () => {
    if (phase === 'existing' && existing) {
      navigate(`#/entry/${key}`);
      return;
    }
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('journal-compose')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => textAreaRef.current?.focus({ preventScroll: true }), reduced ? 0 : 450);
  };

  // Transition wash timing; skipped (near-instant) under reduced motion.
  useEffect(() => {
    if (phase !== 'transition') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setPhase('result'), reduced ? 60 : 900);
    return () => window.clearTimeout(id);
  }, [phase]);

  const turnIntoArt = () => {
    if (empty) return;
    // The lexicon analysis reads the text locally; it is never logged or sent anywhere.
    const result = analyzeTone(text);
    const top: ToneKey = result.tones[0]?.tone ?? 'open';
    const palettes = palettesForTone(top);
    const palette = palettes[0] ?? NEUTRAL_PALETTE;
    const preset = presetForTone(top);
    setDraft({ seed: randomSeed(), palette, variant: 0, tones: result.tones, confidence: result.confidence, preset });
    setChosenTone(top);
    setChosenPalette(palette);
    setVariant(0);
    setChosenPreset(preset);
    setPhase('transition');
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      // Stable id = local dateKey: one entry per day, and IndexedDB `put`
      // overwrites rather than duplicating if a save ever repeats.
      await saveEntry({
        id: key,
        dateKey: key,
        text,
        suggestedTones: draft.tones,
        analysisMethod: 'lexicon',
        userTone: chosenTone,
        artSeed: draft.seed,
        artPalette: chosenPalette,
        artVariant: variant,
        soundscape: chosenPreset,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      navigate(`#/entry/${key}`);
    } finally {
      setSaving(false);
    }
  };

  const topTone: ToneKey = draft?.tones[0]?.tone ?? 'open';
  const keepActive = draft !== null && chosenPalette === draft.palette && variant === draft.variant;
  const neutralActive = chosenPalette === NEUTRAL_PALETTE;

  return (
    <div className="page">
      {(phase === 'loading' || phase === 'compose' || phase === 'existing') && (
        <div className="today-hero-wrap">
          <div className="today-decor today-decor-tr" aria-hidden="true">
            <WashCorner />
          </div>
          <div className="today-decor today-decor-moon" aria-hidden="true">
            <MoonCrescent />
          </div>
          <header className="hero">
            <p className="hero-kicker">{greetingForHour(new Date().getHours())},</p>
            <h1 className="hero-title">
              {journalName}{' '}
              <span className="hero-heart" aria-hidden="true">
                ♡
              </span>
            </h1>
            <p className="hero-prompt">What&rsquo;s on your mind today?</p>
            <p className="date-line">{formatLong(key)}</p>
          </header>

          <section className="card journal-card" aria-label="Your journal">
            <div className="journal-card-head">
              <h2>{journalName}</h2>
              <PencilIcon className="pencil-affordance" />
            </div>
            <p className="muted">A quiet space for your thoughts, feelings and colors.</p>
            <button type="button" className="btn btn-primary btn-pill" onClick={openJournal}>
              Open Journal <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="mini-features" aria-label="What you can do here">
            <div className="mini-feature">
              <DropletIcon className="mini-icon" />
              <p>
                <strong>Express Yourself</strong>
                <span>Turn a sentence into art</span>
              </p>
            </div>
            <div className="mini-feature">
              <FloralIcon className="mini-icon" />
              <p>
                <strong>Watch It Bloom</strong>
                <span>See pigment bloom into paper</span>
              </p>
            </div>
            <div className="mini-feature">
              <SparkleIcon className="mini-icon" />
              <p>
                <strong>Keep Your Moments</strong>
                <span>A private yearly mosaic</span>
              </p>
            </div>
          </section>

          <div className="today-decor today-decor-bl" aria-hidden="true">
            <Sprig />
          </div>
          <div className="today-decor today-decor-br" aria-hidden="true">
            <Sprig />
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="card" aria-busy="true">
          <p className="muted">Gathering today…</p>
        </div>
      )}

      {phase === 'existing' && existing && (
        <section className="card" aria-label="Today's entry">
          <h2>You&rsquo;ve already captured today.</h2>
          <p className="muted">
            Saving again will replace it only after confirmation.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`#/entry/${key}`)}>
              View entry
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`#/entry/${key}`)}>
              Edit entry
            </button>
          </div>
        </section>
      )}

      {phase === 'compose' && (
        <section className="card" id="journal-compose" aria-label="Today's reflection">
          <label className="prompt-label" htmlFor="today-text">
            What stayed with you today?
          </label>
          <textarea
            id="today-text"
            ref={textAreaRef}
            className="journal-text"
            placeholder="Today, I felt…"
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          <div className="composer-row">
            <span className="char-count" aria-live="polite">
              {text.length} / {MAX_CHARS}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={empty}
            onClick={turnIntoArt}
          >
            Turn into art
          </button>
          <p className="privacy-note">
            Your words stay on this device. Nothing is uploaded or sent anywhere.
          </p>
          <button type="button" className="text-button" onClick={() => navigate('#/calendar')}>
            Skip for today
          </button>
        </section>
      )}

      {phase === 'transition' && (
        <div className="wash" aria-hidden="true" />
      )}

      {phase === 'result' && draft && (
        <section aria-label="Your watercolor">
          <div className="art-wrap card">
            <ArtCanvas
              seed={draft.seed}
              palette={chosenPalette}
              variant={variant}
              label={`Watercolor artwork reflecting ${TONE_LABELS[chosenTone].toLowerCase()}`}
            />
          </div>

          <div className="card interp">
            <h2 className="interp-label">A possible interpretation</h2>
            <p className="interp-tone">{TONE_LABELS[topTone]}</p>
            <p className="analysis-note">{ANALYSIS_NOTE}</p>
            <p className="confidence-note">This is only a suggestion.</p>
          </div>

          <div className="card">
            <h2 className="section-title">Does this feel right?</h2>
            <ToneChips
              value={chosenTone}
              onChange={(t) => {
                // The chosen mood is the source of truth: the artwork
                // palette follows it deterministically (seed unchanged).
                setChosenTone(t);
                setChosenPalette(defaultPaletteForTone(t));
              }}
            />
          </div>

          <div className="card">
            <h2 className="section-title">The palette</h2>
            <div className="palette-row">
              <button
                type="button"
                className="palette-btn"
                data-active={keepActive || undefined}
                aria-pressed={keepActive}
                onClick={() => {
                  setChosenPalette(draft.palette);
                  setVariant(draft.variant);
                }}
              >
                Keep this palette
              </button>
              <button
                type="button"
                className="palette-btn"
                data-active={!keepActive && !neutralActive || undefined}
                aria-pressed={!keepActive && !neutralActive}
                onClick={() => setVariant((v) => v + 1)}
              >
                Try another interpretation
              </button>
              <button
                type="button"
                className="palette-btn"
                data-active={neutralActive || undefined}
                aria-pressed={neutralActive}
                onClick={() => setChosenPalette(NEUTRAL_PALETTE)}
              >
                Use a neutral palette
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title">A sound for it</h2>
            <SoundscapeControls preset={chosenPreset} />
            <div className="preset-chips" role="group" aria-label="Choose a soundscape">
              {PRESET_KEYS.map((pk) => (
                <button
                  key={pk}
                  type="button"
                  className="preset-chip"
                  aria-pressed={chosenPreset === pk}
                  onClick={() => setChosenPreset(pk)}
                >
                  {PRESETS[pk].label}
                </button>
              ))}
            </div>
          </div>

          <div className="btn-row sticky-save">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => {
                void save();
              }}
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setDraft(null);
                setPhase('compose');
              }}
            >
              Back to editing
            </button>
          </div>
        </section>
      )}

      <InstallPrompt />
    </div>
  );
}
