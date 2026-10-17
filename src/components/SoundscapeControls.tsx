import { useEffect, useRef, useState } from 'react';
import { PRESETS, soundscape } from '../audio/engine';
import type { PresetKey } from '../audio/engine';
import { PlayIcon, StopIcon } from './icons';

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

function coercePreset(preset: string): PresetKey {
  return (PRESET_KEYS as string[]).includes(preset) ? (preset as PresetKey) : 'soft-pad';
}

interface SoundscapeControlsProps {
  preset: string;
  compact?: boolean;
  /**
   * Gesture-driven start: when the parent increments this (in direct response
   * to a user tap, e.g. "Reveal with sound"), playback begins with a gentle
   * fade. Audio never starts on mount — there is no autoplay.
   */
  playSignal?: number;
  /** Reports whether the signaled start succeeded (false → show a quiet note). */
  onPlayResult?: (ok: boolean) => void;
  /** Initial mute state (e.g. from the persisted sound preference). */
  initialMuted?: boolean;
  /** Notifies the parent when the user toggles mute, so it can persist it. */
  onMutedChange?: (muted: boolean) => void;
}

/**
 * Play/stop, volume and mute controls for the ambient soundscape.
 * Never autoplays: sound starts only from an explicit user gesture
 * (the play button or a parent `playSignal`). Stops the engine on unmount.
 */
export default function SoundscapeControls({
  preset,
  compact,
  playSignal = 0,
  onPlayResult,
  initialMuted = false,
  onMutedChange,
}: SoundscapeControlsProps) {
  const pk = coercePreset(preset);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(initialMuted);
  const lastSignal = useRef(0);
  const resultCbRef = useRef(onPlayResult);
  resultCbRef.current = onPlayResult;
  const mutedCbRef = useRef(onMutedChange);
  mutedCbRef.current = onMutedChange;

  const start = (fadeSeconds?: number): boolean => {
    soundscape.setMuted(muted);
    soundscape.setVolume(volume / 100);
    const ok = soundscape.play(pk, { volume: volume / 100, fadeSeconds });
    setPlaying(ok);
    return ok;
  };

  // Parent-requested start, always downstream of a user tap.
  useEffect(() => {
    if (playSignal > lastSignal.current) {
      lastSignal.current = playSignal;
      const ok = start(3); // ~3s swell, synced with the bloom reveal
      resultCbRef.current?.(ok);
    }
    // Only re-run when the signal changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playSignal]);

  // Stop playback when this control leaves the screen.
  useEffect(() => {
    return () => {
      soundscape.stop();
    };
  }, []);

  // If the preset changes mid-playback, restart with the new one.
  useEffect(() => {
    if (playing) {
      soundscape.play(pk, { volume: volume / 100 });
    }
    // Only re-run when the preset key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pk]);

  const toggle = () => {
    if (playing) {
      soundscape.stop();
      setPlaying(false);
    } else {
      start();
    }
  };

  const onVolume = (v: number) => {
    setVolume(v);
    soundscape.setVolume(v / 100);
  };

  const onMute = () => {
    const next = !muted;
    setMuted(next);
    soundscape.setMuted(next);
    mutedCbRef.current?.(next);
  };

  return (
    <div className={compact ? 'sound sound-compact' : 'sound'}>
      <button
        type="button"
        className="sound-play"
        aria-pressed={playing}
        aria-label={playing ? `Stop ${PRESETS[pk].label} soundscape` : `Play ${PRESETS[pk].label} soundscape`}
        onClick={toggle}
      >
        {playing ? <StopIcon className="sound-icon" /> : <PlayIcon className="sound-icon" />}
      </button>
      <div className="sound-main">
        <span className="sound-preset">{PRESETS[pk].label}</span>
        <input
          type="range"
          className="sound-slider"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-label="Soundscape volume"
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </div>
      <button
        type="button"
        className="sound-mute"
        aria-pressed={muted}
        aria-label={muted ? 'Unmute soundscape' : 'Mute soundscape'}
        onClick={onMute}
      >
        {muted ? 'Muted' : 'Mute'}
      </button>
    </div>
  );
}
