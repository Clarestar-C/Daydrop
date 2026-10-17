// Daydrop soundscapes — gentle ambience for the bloom reveal.
// Beach and rain are bundled local audio files; chimes are synthesized
// live with Web Audio. Everything plays from the device — nothing is
// streamed and nothing leaves the device.
//
// The tone→preset mapping is aesthetic only: it suggests a mood, it does not
// interpret or respond to the user's emotions in any clinical sense.

import type { ToneKey } from '../config';

export type PresetKey = 'soft-pad' | 'gentle-chimes' | 'airy-drone';

export const PRESETS: Record<PresetKey, { label: string; description: string }> = {
  'soft-pad': {
    label: 'Beach',
    description: 'Gentle waves, looped softly.',
  },
  'gentle-chimes': {
    label: 'Gentle Chimes',
    description: 'Sparse pentatonic plucks that drift by every few seconds.',
  },
  'airy-drone': {
    label: 'Rain',
    description: 'Soft rainfall, looped softly.',
  },
};

/** Aesthetic starting suggestion per tone — not a rule, the user picks freely. */
export function presetForTone(tone: ToneKey): PresetKey {
  switch (tone) {
    case 'joy':
      return 'gentle-chimes';
    case 'calm':
      return 'airy-drone';
    case 'sadness':
      return 'soft-pad';
    case 'anxiety':
      return 'airy-drone';
    case 'frustration':
      return 'soft-pad';
    case 'mixed':
      return 'gentle-chimes';
    case 'open':
      return 'soft-pad';
  }
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w['AudioContext'] ?? w['webkitAudioContext']) as typeof AudioContext | undefined;
  return ctor ?? null;
}

/** Peak amplitude for -18 dBFS: chimes never exceed this. */
const CHIME_PEAK = Math.pow(10, -18 / 20);
/** Master output ceiling: always ≤ 0.5. */
const MASTER_MAX = 0.5;

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private playing = false;
  private preset: PresetKey | null = null;
  private volume = 0.8;
  private muted = false;

  /**
   * Start a preset. Must be called from a user gesture (or within its
   * activation window); creates/resumes the context.
   * `fadeSeconds` controls the master fade-in swell (default 2s).
   * Returns false when Web Audio is unavailable so callers can fall back
   * to a silent experience.
   */
  play(preset: PresetKey, opts?: { volume?: number; fadeSeconds?: number }): boolean {
    const Ctor = audioContextCtor();
    if (!Ctor) return false; // no Web Audio in this environment
    if (opts?.volume !== undefined) this.setVolume(opts.volume);

    if (this.playing && this.preset === preset) return true;
    // Switching presets: tear down the old graph first.
    if (this.ctx) this.hardStop();

    const gen = ++this.generation;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;
    this.nodes.push(master);

    // Fade in — always ramped, never a hard jump (no clicks).
    const target = this.effectiveLevel();
    // setTargetAtTime converges ~95% in 3τ; default τ=2.0 keeps the original
    // gentle swell. fadeSeconds overrides for a timed ramp (e.g. entry reveal).
    const tau = opts?.fadeSeconds ? Math.max(0.3, opts.fadeSeconds / 3) : 2.0;
    master.gain.setTargetAtTime(target, ctx.currentTime, tau);

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    switch (preset) {
      case 'soft-pad':
        this.buildSample(ctx, master, `${import.meta.env.BASE_URL}audio/beach.mpeg`);
        break;
      case 'gentle-chimes':
        this.buildGentleChimes(ctx, master, gen);
        break;
      case 'airy-drone':
        this.buildSample(ctx, master, `${import.meta.env.BASE_URL}audio/rain.aac`);
        break;
    }

    this.playing = true;
    this.preset = preset;
    return true;
  }

  /** Stop: ramp to silence over ~1.5s, then release every node and the context. */
  stop(): void {
    if (!this.ctx || !this.master) {
      this.playing = false;
      this.preset = null;
      return;
    }
    const gen = this.generation;
    const ctx = this.ctx;
    const master = this.master;
    this.playing = false;
    this.preset = null;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.5); // ~1.5s to silence
    setTimeout(() => {
      if (this.generation === gen) this.teardown();
    }, 1600);
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyLevel();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyLevel();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  currentPreset(): PresetKey | null {
    return this.preset;
  }

  /** Full release: stop everything and drop the context. Safe to call anytime. */
  dispose(): void {
    this.hardStop();
    this.playing = false;
    this.preset = null;
  }

  // ---- internals ----

  private effectiveLevel(): number {
    return this.muted ? 0 : this.volume * MASTER_MAX;
  }

  private applyLevel(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.effectiveLevel(), this.ctx.currentTime, 0.3);
  }

  /** Immediate teardown of the current graph (used on preset switch / dispose). */
  private hardStop(): void {
    this.generation++;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.teardown();
  }

  private teardown(): void {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped — fine
      }
      try {
        s.disconnect();
      } catch {
        // already disconnected — fine
      }
    }
    this.sources = [];
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        // already disconnected — fine
      }
    }
    this.nodes = [];
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
  }

  private trackSource(s: AudioScheduledSourceNode): void {
    this.sources.push(s);
  }

  private trackNode(n: AudioNode): void {
    this.nodes.push(n);
  }

  /** Play a bundled ambience recording, looped gently. Local file, no network. */
  private buildSample(ctx: AudioContext, master: GainNode, url: string): void {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('audio not found');
        return r.arrayBuffer();
      })
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuf) => {
        if (!this.playing || this.ctx !== ctx) return; // stopped/switched meanwhile
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.loop = true;
        src.connect(master);
        src.start();
        this.trackSource(src);
      })
      .catch(() => undefined); // stay quiet on failure — artwork still works
  }

  /** gentle-chimes: pentatonic sine plucks, sparse, peak ≤ -18 dBFS. */
  private buildGentleChimes(ctx: AudioContext, master: GainNode, gen: number): void {
    // A-major pentatonic, two octaves.
    const scale = [440.0, 493.88, 554.37, 659.25, 739.99, 880.0];
    let step = 0;

    const pluck = (): void => {
      if (this.generation !== gen || !this.playing) return;
      const f = scale[step % scale.length];
      step += 1 + Math.floor(Math.random() * 3); // wander, never repeat mechanically

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(CHIME_PEAK, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 3.8);
      this.trackSource(osc);
      this.trackNode(g);

      // Schedule the next pluck 4–9s out.
      const nextIn = 4000 + Math.random() * 5000;
      this.schedulerTimer = setTimeout(pluck, nextIn);
    };

    // First pluck shortly after the pad fades in.
    this.schedulerTimer = setTimeout(pluck, 1200);
  }
}

/** Shared engine instance for the app. */
export const soundscape = new SoundscapeEngine();
