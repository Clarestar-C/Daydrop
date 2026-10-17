import { useEffect, useRef } from 'react';
import {
  NEUTRAL_PALETTE,
  PALETTES,
  generateComposition,
  paintBloomGrowth,
  paintCompositionBase,
  paintCompositionBloom,
  paintCompositionFinish,
  renderWatercolor,
} from '../art/watercolor';
import type { PaletteKey } from '../art/watercolor';

interface ArtCanvasProps {
  seed: number;
  palette: string;
  variant: number;
  className?: string;
  label?: string;
  width?: number;
  height?: number;
  /**
   * When true, blooms fade in one by one after the paper base is painted.
   * Turning `reveal` back to false repaints the finished artwork instantly
   * (used for tap-to-complete). Under prefers-reduced-motion the artwork
   * always renders instantly via the one-pass path.
   */
  reveal?: boolean;
  /** Paint only the paper base — a calm placeholder before the user starts the reveal. */
  preview?: boolean;
  /** Called as each bloom starts appearing: (index, total). */
  onBloomIndex?: (index: number, total: number) => void;
  /** Called when the full composition (including the finishing pass) is done. */
  onRevealComplete?: () => void;
}

function coercePalette(palette: string): PaletteKey {
  return Object.prototype.hasOwnProperty.call(PALETTES, palette)
    ? (palette as PaletteKey)
    : NEUTRAL_PALETTE;
}

// Reveal choreography — organic blooming. Each bloom grows over ~1–1.3s
// (deterministic per-bloom variation); the next bloom starts less than half
// way through the previous one, so the painting develops continuously.
// Total reveal scales with bloom count (~4–6s), then a short finishing fade.
// Turning `reveal` back to false (tap-to-complete) repaints the finished
// artwork instantly via the one-pass renderer.
const bloomGrowMs = (i: number): number => 1000 + ((i * 173) % 300); // 1000–1300ms
const STAGGER = 0.45; // next bloom starts 45% through the previous one
const FIRST_BLOOM_DELAY_MS = 250;
const FINISH_FADE_MS = 400;

const smooth = (p: number): number => p * p * (3 - 2 * p); // smoothstep ease

/**
 * Renders a generative watercolor wash onto a canvas.
 * Scales the backing store for devicePixelRatio. With `reveal`, blooms grow
 * organically one by one (pigment blooming into the paper); otherwise (and
 * under reduced-motion) the one-pass renderer paints everything immediately.
 * The finished frame is pixel-identical either way.
 */
export default function ArtCanvas({
  seed,
  palette,
  variant,
  className,
  label,
  width = 640,
  height = 400,
  reveal = false,
  preview = false,
  onBloomIndex,
  onRevealComplete,
}: ArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep callbacks fresh without retriggering the effect.
  const bloomCbRef = useRef(onBloomIndex);
  bloomCbRef.current = onBloomIndex;
  const completeCbRef = useRef(onRevealComplete);
  completeCbRef.current = onRevealComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal = coercePalette(palette);
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (preview && !reveal) {
      // Paper base only — the quiet state before the user starts the reveal.
      const comp = generateComposition(seed, pal, variant, canvas.width, canvas.height);
      paintCompositionBase(ctx, comp, canvas.width, canvas.height);
      return;
    }

    if (!reveal || reducedMotion) {
      renderWatercolor(canvas, { seed, palette: pal, variant });
      completeCbRef.current?.();
      return;
    }

    // Organic bloom reveal: the paper base is pre-rendered offscreen, and a
    // second "settled" layer accumulates each bloom exactly as the one-pass
    // renderer paints it. Per frame we draw the settled layer (one drawImage)
    // plus only the one or two blooms currently growing, so mobile stays
    // smooth. When the reveal ends, the one-pass renderer paints the exact
    // final frame — pixel-identical to the saved composition.
    const W = canvas.width;
    const H = canvas.height;
    const comp = generateComposition(seed, pal, variant, W, H);
    const base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    const baseCtx = base.getContext('2d');
    if (baseCtx) paintCompositionBase(baseCtx, comp, W, H);
    // Settled layer: base + every bloom whose growth has completed, painted
    // with the exact one-pass operations (order preserved).
    const settled = document.createElement('canvas');
    settled.width = W;
    settled.height = H;
    const settledCtx = settled.getContext('2d');
    if (settledCtx) {
      if (baseCtx) settledCtx.drawImage(base, 0, 0);
      else paintCompositionBase(settledCtx, comp, W, H);
    }

    const total = comp.blooms.length;
    const startAt: number[] = [];
    const growMs: number[] = [];
    let t = FIRST_BLOOM_DELAY_MS;
    let bloomsEnd = t;
    for (let i = 0; i < total; i++) {
      growMs.push(bloomGrowMs(i));
      startAt.push(t);
      bloomsEnd = t + growMs[i];
      t += growMs[i] * STAGGER;
    }
    const finishFadeStart = bloomsEnd;
    const endAt = finishFadeStart + FINISH_FADE_MS;
    const fired = new Array<boolean>(total).fill(false);
    const isSettled = new Array<boolean>(total).fill(false);

    let raf = 0;
    let done = false;
    const t0 = performance.now();

    const finish = () => {
      if (done) return;
      done = true;
      renderWatercolor(canvas, { seed, palette: pal, variant });
      completeCbRef.current?.();
    };

    const frame = (now: number) => {
      if (done) return;
      const el = now - t0;
      if (el >= endAt) {
        finish();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(settled, 0, 0);
      let allSettled = true;
      for (let i = 0; i < total; i++) {
        const st = startAt[i];
        if (el < st) {
          allSettled = false;
          break; // starts are ascending; nothing later has begun
        }
        if (!fired[i]) {
          fired[i] = true;
          bloomCbRef.current?.(i, total);
        }
        const p = (el - st) / growMs[i];
        if (p >= 1) {
          if (!isSettled[i]) {
            // Growth complete: bake the bloom into the settled layer with
            // the exact one-pass operations, and paint the exact final bloom
            // on this frame too (no one-frame gap). Later frames pick it up
            // from the settled drawImage, so no per-frame repaint cost.
            if (settledCtx) paintCompositionBloom(settledCtx, comp, i);
            isSettled[i] = true;
            paintBloomGrowth(ctx, comp.blooms[i], 1);
          }
        } else {
          allSettled = false;
          paintBloomGrowth(ctx, comp.blooms[i], p);
        }
      }
      if (allSettled) {
        // Gentle fade of granulation, washes and vignette — then the final
        // snap to the exact one-pass frame.
        const fp = smooth((el - finishFadeStart) / FINISH_FADE_MS);
        if (fp > 0) paintCompositionFinish(ctx, comp, W, H, fp);
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);

    return () => {
      done = true;
      window.cancelAnimationFrame(raf);
    };
  }, [seed, palette, variant, width, height, reveal, preview]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label ?? 'Watercolor artwork'}
      className={className ? `art-canvas art-enter ${className}` : 'art-canvas art-enter'}
    />
  );
}
