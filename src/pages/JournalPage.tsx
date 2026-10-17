import { useEffect, useState } from 'react';
import { TONE_COLORS, TONE_LABELS } from '../config';
import type { ToneKey } from '../config';
import { formatLong } from '../utils/date';
import { deleteAllData, deleteEntry, listEntries } from '../db/store';
import type { Entry } from '../db/store';
import { navigate } from '../nav';
import ArtCanvas from '../components/ArtCanvas';
import ConfirmDialog from '../components/ConfirmDialog';

const SNIPPET_LEN = 120;

function effectiveTone(entry: Entry): ToneKey {
  return entry.userTone ?? entry.suggestedTones[0]?.tone ?? 'open';
}

function snippet(text: string): string {
  return text.length > SNIPPET_LEN ? `${text.slice(0, SNIPPET_LEN)}…` : text;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [ackWipe, setAckWipe] = useState(false);

  const load = async () => {
    const list = await listEntries();
    list.sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.createdAt - a.createdAt);
    setEntries(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteEntry(deleting.dateKey);
    setDeleting(null);
    await load();
  };

  const doWipe = async () => {
    await deleteAllData();
    setConfirmWipe(false);
    setAckWipe(false);
    await load();
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Journal</h1>
      </header>

      {loading && (
        <div className="card" aria-busy="true">
          <p className="muted">Opening your journal…</p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <section className="card empty-state" aria-label="No entries">
          <div className="empty-illustration" aria-hidden="true">
            <ArtCanvas
              seed={71017}
              palette="blush"
              variant={1}
              width={300}
              height={180}
              label=""
            />
          </div>
          <h2>No entries yet</h2>
          <p className="muted">
            Your first sentence becomes your first watercolor. One small
            sentence a day is all it takes.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('#/')}>
            Write today&rsquo;s sentence
          </button>
        </section>
      )}

      {!loading && entries.length > 0 && (
        <ul className="journal-list">
          {entries.map((entry) => {
            const tone = effectiveTone(entry);
            return (
              <li key={entry.id} className="card journal-item">
                <div className="journal-art">
                  <ArtCanvas
                    seed={entry.artSeed}
                    palette={entry.artPalette}
                    variant={entry.artVariant}
                    width={240}
                    height={240}
                    label={`Watercolor for ${formatLong(entry.dateKey)}`}
                  />
                </div>
                <div className="journal-meta">
                  <p className="journal-date">{formatLong(entry.dateKey)}</p>
                  <p className="tone-tag">
                    <span
                      className="chip-dot"
                      style={{ backgroundColor: TONE_COLORS[tone] }}
                      aria-hidden="true"
                    />
                    {TONE_LABELS[tone]}
                  </p>
                  <p className="snippet">{snippet(entry.text)}</p>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => navigate(`#/entry/${entry.dateKey}`)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => navigate(`#/entry/${entry.dateKey}`)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger-text"
                      onClick={() => setDeleting(entry)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card privacy-section" aria-label="Privacy and data">
        <h2 className="section-title">Privacy &amp; data</h2>
        <p className="muted">
          Your entries live only in this browser, on this device. Clearing browser data or
          uninstalling the app may remove them. Storage here is local and not encrypted.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmWipe(true)}>
          Delete all journal data
        </button>
      </section>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this entry?"
        message={
          deleting
            ? `This will permanently remove your entry for ${formatLong(deleting.dateKey)}.`
            : ''
        }
        confirmLabel="Delete entry"
        danger
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => setDeleting(null)}
      />

      {confirmWipe && (
        <div className="modal-overlay" onClick={() => setConfirmWipe(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wipe-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="wipe-title" className="modal-title">
              Delete all journal data?
            </h2>
            <p className="modal-msg">
              This removes every entry from this device. This cannot be undone.
            </p>
            <label className="wipe-check">
              <input
                type="checkbox"
                checked={ackWipe}
                onChange={(e) => setAckWipe(e.target.checked)}
              />
              I understand this cannot be undone
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmWipe(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!ackWipe}
                onClick={() => {
                  void doWipe();
                }}
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
