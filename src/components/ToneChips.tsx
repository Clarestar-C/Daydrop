import { TONE_COLORS, TONE_LABELS, TONE_ORDER } from '../config';
import type { ToneKey } from '../config';

interface ToneChipsProps {
  value: ToneKey | null;
  onChange: (tone: ToneKey) => void;
}

/** Selectable tone chips, one per entry in TONE_ORDER (includes Mixed feelings + Left open). */
export default function ToneChips({ value, onChange }: ToneChipsProps) {
  return (
    <div className="tone-chips" role="group" aria-label="Choose a tone">
      {TONE_ORDER.map((tone) => (
        <button
          key={tone}
          type="button"
          className="chip"
          aria-pressed={value === tone}
          onClick={() => onChange(tone)}
        >
          <span
            className="chip-dot"
            style={{ backgroundColor: TONE_COLORS[tone] }}
            aria-hidden="true"
          />
          {TONE_LABELS[tone]}
        </button>
      ))}
    </div>
  );
}
