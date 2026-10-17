import { useEffect, useState } from 'react';
import {
  THEMES,
  THEME_KEYS,
  DEFAULT_THEME,
  THEME_PREFERENCE_KEY,
  applyTheme,
  coerceThemeKey,
} from '../theme/themes';
import type { ThemeKey } from '../theme/themes';
import {
  JOURNAL_NAME_KEY,
  DEFAULT_JOURNAL_NAME,
  MAX_JOURNAL_NAME,
  coerceJournalName,
} from '../prefs';
import { getPreference, setPreference } from '../db/store';
import ArtCanvas from '../components/ArtCanvas';
import { WashCorner } from '../components/decor';

/**
 * Settings: journal name + page theme.
 * The page theme only recolors the app's own chrome. It is fully
 * independent of daily mood: it never touches the saved mood, artwork
 * palette, calendar colors, or journal entries.
 */
export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME);
  const [journalName, setJournalName] = useState(DEFAULT_JOURNAL_NAME);
  const [nameDraft, setNameDraft] = useState(DEFAULT_JOURNAL_NAME);

  useEffect(() => {
    let cancelled = false;
    getPreference<string>(THEME_PREFERENCE_KEY, DEFAULT_THEME).then((t) => {
      if (!cancelled) setTheme(coerceThemeKey(t));
    });
    getPreference<string>(JOURNAL_NAME_KEY, DEFAULT_JOURNAL_NAME).then((n) => {
      if (!cancelled) {
        const clean = coerceJournalName(n);
        setJournalName(clean);
        setNameDraft(clean);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseTheme = (key: ThemeKey) => {
    setTheme(key);
    applyTheme(key);
    void setPreference(THEME_PREFERENCE_KEY, key);
  };

  const nameDirty = nameDraft !== journalName;
  const saveName = () => {
    const clean = coerceJournalName(nameDraft);
    setJournalName(clean);
    setNameDraft(clean);
    void setPreference(JOURNAL_NAME_KEY, clean);
  };
  const cancelName = () => setNameDraft(journalName);

  return (
    <div className="page">
      <header className="page-head settings-head">
        <div className="head-decor" aria-hidden="true">
          <WashCorner />
        </div>
        <h1 className="page-title">Settings</h1>
        <p className="muted">Make Daydrop feel like yours.</p>
      </header>

      <section className="card" aria-label="Journal name">
        <h2 className="section-title">Journal name</h2>
        <p className="muted">Make it yours. You can change it anytime.</p>
        <label className="field-label" htmlFor="journal-name">
          Name
        </label>
        <input
          id="journal-name"
          type="text"
          className="text-input"
          value={nameDraft}
          maxLength={MAX_JOURNAL_NAME}
          onChange={(e) => setNameDraft(e.target.value)}
          aria-describedby="journal-name-count"
          autoComplete="off"
        />
        <p className="char-count" id="journal-name-count" aria-live="polite">
          {nameDraft.trim().length} / {MAX_JOURNAL_NAME}
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!nameDirty}
            onClick={saveName}
          >
            Save name
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!nameDirty}
            onClick={cancelName}
          >
            Cancel
          </button>
        </div>
      </section>

      <section className="card" aria-label="Theme">
        <h2 className="section-title">Theme</h2>
        <p className="muted">Choose your journal&rsquo;s colour theme.</p>
        <p className="muted">
          This changes the overall look and feel of the app — background, accents
          and surfaces. Your moods, artwork, and calendar colors stay the same.
        </p>
        <div className="theme-grid">
          {THEME_KEYS.map((key) => {
            const def = THEMES[key];
            const selected = theme === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                className="theme-card"
                onClick={() => chooseTheme(key)}
              >
                <span className="theme-preview" aria-hidden="true">
                  <ArtCanvas
                    seed={20261017}
                    palette={`preview-${key}`}
                    variant={0}
                    width={240}
                    height={140}
                    label=""
                  />
                </span>
                <span className="theme-name">{def.name}</span>
                <span className="theme-tagline">{def.tagline}</span>
                {selected && <span className="theme-current">Selected</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="About settings">
        <h2 className="section-title">Good to know</h2>
        <p className="muted">
          Your theme and journal name are saved on this device only, alongside
          your journal. Nothing is uploaded or shared.
        </p>
      </section>
    </div>
  );
}
