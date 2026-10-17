// Download / native-share / copy-text buttons shared by the entry share
// section and the Export page. All actions are explicit user taps; nothing
// is ever posted automatically.

interface ShareButtonsProps {
  onDownload: () => void;
  onShare: () => void;
  onCopy: () => void;
  copyLabel: string;
  busy: boolean;
  status: string | null;
  /** When clipboard copy fails, show this text in a selectable fallback. */
  copyFallback: string | null;
}

export default function ShareButtons({
  onDownload,
  onShare,
  onCopy,
  copyLabel,
  busy,
  status,
  copyFallback,
}: ShareButtonsProps) {
  return (
    <div className="share-actions">
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onDownload}>
          {busy ? 'Preparing…' : 'Download PNG'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onShare}>
          Share…
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCopy}>
          {copyLabel}
        </button>
      </div>
      {status && (
        <p className="share-status" role="status">
          {status}
        </p>
      )}
      {copyFallback !== null && (
        <div className="share-fallback">
          <p className="muted">
            Copy didn&rsquo;t work on this device — select the text below and copy it manually.
          </p>
          <textarea
            className="journal-text share-fallback-text"
            readOnly
            rows={6}
            value={copyFallback}
            onFocus={(e) => e.target.select()}
            aria-label="Share text to copy manually"
          />
        </div>
      )}
    </div>
  );
}
