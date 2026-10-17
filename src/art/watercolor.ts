// Generative watercolor for Daydrop — Canvas 2D, fully deterministic.
// Same {seed, palette, variant} inputs → identical pixels, every time.
// No text is ever drawn; compositions are abstract pigment blooms on paper.
//
// Generation (generateComposition) is separated from painting so the entry
// page can reveal blooms one by one. The one-pass renderWatercolor path
// replays the exact same operations in the exact same order, so its pixels
// are unchanged.

import type { ToneKey } from '../config';

export type PaletteKey =
  | 'blush'
  | 'rose'
  | 'lavender'
  | 'powder'
  | 'peach'
  | 'sage'
  | 'mist'
  | 'dusk'
  | 'honey'
  | 'periwinkle'
  | 'coral'
  | 'seafoam'
  | 'preview-daybreak'
  | 'preview-ocean-mist'
  | 'preview-secret-garden'
  | 'preview-lavender-dream'
  | 'preview-peach-sunrise'
  | 'preview-rosewater'
  | 'preview-moonlight'
  | 'neutral';

export const NEUTRAL_PALETTE: PaletteKey = 'neutral';

export const PALETTES: Record<PaletteKey, { label: string; colors: string[] }> = {
  blush: {
    label: 'Blush',
    colors: ['#f3c6d3', '#e8a2b8', '#f7dee4', '#e5b8c4', '#f0d3da'],
  },
  rose: {
    label: 'Rose',
    colors: ['#e8a2b8', '#d97f9c', '#f0bcc9', '#c96f8e', '#eec3cd'],
  },
  // Kept the 'lavender' key for stored entries; the pigments are now muted
  // slate/powder/dusty blues rather than purple.
  lavender: {
    label: 'Blue Haze',
    colors: ['#7e93ad', '#a7b8cc', '#8ba3c2', '#6f87a8', '#9db4d6'],
  },
  powder: {
    label: 'Powder',
    colors: ['#9db9d9', '#8aa9cf', '#b9cde6', '#7f9cc2', '#aebfdc'],
  },
  peach: {
    label: 'Peach',
    colors: ['#f0c49c', '#e8ab78', '#f7d9ba', '#df9c66', '#f2cfae'],
  },
  sage: {
    label: 'Sage',
    colors: ['#a9c6a4', '#93b48e', '#c2d6bd', '#83a37e', '#b4ccb0'],
  },
  mist: {
    label: 'Mist',
    colors: ['#cfd4d6', '#bcc3c7', '#dde1e2', '#aeb7bb', '#c9d2d4'],
  },
  dusk: {
    label: 'Dusk',
    colors: ['#8b93b8', '#98a0c4', '#7d88ad', '#a8aec9', '#8f9ab5'],
  },
  honey: {
    label: 'Honey',
    colors: ['#eec25e', '#e2a94f', '#f4d48c', '#d99f45', '#f0cf82'],
  },
  periwinkle: {
    label: 'Periwinkle',
    colors: ['#8f97c4', '#a3a8cf', '#7e86b8', '#b0b4d6', '#99a0c9'],
  },
  coral: {
    label: 'Coral',
    colors: ['#d98873', '#cf7f86', '#e5a68d', '#c4706f', '#e0b09a'],
  },
  seafoam: {
    label: 'Seafoam',
    colors: ['#a9c9b8', '#93b8a4', '#c2d9cb', '#86ad99', '#b8d2c2'],
  },
  neutral: {
    label: 'Neutral',
    colors: ['#e9e2d4', '#d9d0bf', '#f4efe3', '#cfc6b4', '#e2d8c8', '#fbf7ee'],
  },
  // Theme preview pigments — used only for the Settings preview cards.
  // Never offered as mood palettes and never saved to entries.
  'preview-daybreak': {
    label: 'Daybreak preview',
    colors: ['#e8a2b8', '#a9c6a4', '#9db9d9', '#f0c9d4', '#bcd2b8'],
  },
  'preview-ocean-mist': {
    label: 'Ocean Mist preview',
    colors: ['#9db9d9', '#6fa8a5', '#d7e6ec', '#8fb8c9', '#a9cfc9'],
  },
  'preview-secret-garden': {
    label: 'Secret Garden preview',
    colors: ['#a9c6a4', '#7d8f69', '#e6dfc4', '#93a97e', '#c2d6bd'],
  },
  'preview-lavender-dream': {
    label: 'Lavender Dream preview',
    colors: ['#b9a8d9', '#8f97c4', '#e6dcf4', '#a394c9', '#b3b9d9'],
  },
  'preview-peach-sunrise': {
    label: 'Peach Sunrise preview',
    colors: ['#f0c49c', '#e8a2a2', '#eec25e', '#e5b183', '#f2d48e'],
  },
  'preview-rosewater': {
    label: 'Rosewater preview',
    colors: ['#d99aa8', '#b57e8c', '#f4e6de', '#c48a98', '#e8d5cc'],
  },
  'preview-moonlight': {
    label: 'Moonlight preview',
    colors: ['#5a6b9e', '#8fa3d9', '#ccd5ea', '#4e5f8f', '#a9bce6'],
  },
};

/**
 * Restrained palette suggestions per tone — aesthetic starting points, not
 * rigid 1:1 claims, and never a diagnosis. The user always picks freely.
 * The first palette in each list is the default for that mood; the
 * artwork, mood chip and calendar swatch all follow the user's chosen mood.
 */
export function palettesForTone(tone: ToneKey): PaletteKey[] {
  switch (tone) {
    case 'joy':
      return ['honey', 'peach', 'blush'];
    case 'calm':
      return ['sage', 'seafoam', 'mist'];
    case 'sadness':
      return ['powder', 'dusk', 'mist'];
    case 'anxiety':
      return ['periwinkle', 'lavender', 'dusk'];
    case 'frustration':
      return ['coral', 'rose', 'peach'];
    case 'mixed':
      return ['neutral', 'mist', 'powder'];
    case 'open':
      return ['neutral', 'mist', 'blush'];
  }
}

/** Default palette for a mood — the single source of truth for mood → art. */
export function defaultPaletteForTone(tone: ToneKey): PaletteKey {
  return palettesForTone(tone)[0] ?? NEUTRAL_PALETTE;
}

/** FNV-1a 32-bit hash → uint32. Used to derive art seeds from entry content. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Cryptographically random seed for "surprise me" compositions. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Slightly darken a hex color by factor f (0..1). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Composition model — everything the PRNG decides, captured up front.
// The rand() call order here mirrors the original one-pass renderer exactly,
// so replays are pixel-identical to it.
// ---------------------------------------------------------------------------

export interface Pt {
  x: number;
  y: number;
}

export interface BloomLayer {
  pts: Pt[];
  alpha: number;
  fill: string;
}

export interface BloomSpec {
  cx: number;
  cy: number;
  r: number;
  color: string;
  layers: BloomLayer[];
}

export interface Granule {
  x: number;
  y: number;
  alpha: number;
  fill: string;
  r: number;
}

export interface WashSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  alpha: number;
  fill: string;
}

export interface PaperSpeck {
  x: number;
  y: number;
  alpha: number;
  s: number;
}

export interface Composition {
  paper: PaperSpeck[];
  blooms: BloomSpec[];
  granules: Granule[];
  washes: WashSpec[];
}

export function generateComposition(
  seed: number,
  palette: PaletteKey,
  variant: number,
  W: number,
  H: number,
): Composition {
  // Unknown palettes (e.g. stale stored data) fall back to 'mist'.
  const paletteDef = PALETTES[palette] ?? PALETTES.mist;
  const colors = paletteDef.colors;

  const rand = mulberry32((seed ^ Math.imul(variant, 0x9e3779b9)) >>> 0);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const minWH = Math.min(W, H);
  const margin = minWH * 0.14;

  // (a) Paper speckle.
  const paper: PaperSpeck[] = [];
  const speckleCount = Math.floor((W * H) / 900);
  for (let i = 0; i < speckleCount; i++) {
    const alpha = 0.05 + rand() * 0.08;
    const s = 1 + rand() * 1.6;
    const x = rand() * W;
    const y = rand() * H;
    paper.push({ x, y, alpha, s });
  }

  // Leave one quiet quadrant: blooms are biased away from it for negative space.
  const quietQuadrant = Math.floor(rand() * 4); // 0 TL, 1 TR, 2 BL, 3 BR
  const inQuiet = (x: number, y: number): boolean => {
    const left = x < W / 2;
    const top = y < H / 2;
    const q = top ? (left ? 0 : 1) : left ? 2 : 3;
    return q === quietQuadrant;
  };
  const bloomCenter = (): { x: number; y: number } => {
    // Try a few times to land outside the quiet quadrant.
    for (let tries = 0; tries < 6; tries++) {
      const x = margin + rand() * (W - margin * 2);
      const y = margin + rand() * (H - margin * 2);
      if (!inQuiet(x, y)) return { x, y };
    }
    return { x: margin + rand() * (W - margin * 2), y: margin + rand() * (H - margin * 2) };
  };

  // (b) 5–9 large pigment blooms, layered bezier blobs with 'multiply' overlap.
  const blooms: BloomSpec[] = [];
  const bloomCount = 5 + Math.floor(rand() * 5);
  for (let b = 0; b < bloomCount; b++) {
    const { x, y } = bloomCenter();
    const baseR = minWH * (0.09 + rand() * 0.13);
    const color = pick(colors);
    const layerCount = 8 + Math.floor(rand() * 7);
    const layers: BloomLayer[] = [];
    for (let l = 0; l < layerCount; l++) {
      const t = l / layerCount; // 0 inner → 1 outer
      const r = baseR * (0.35 + t * 0.85);
      // Pigment pools toward the center: alpha falls off toward the edge.
      const alpha = 0.16 * (1 - t * 0.75) + 0.03;
      const fill = l % 3 === 2 ? shade(color, 0.96) : color;
      // NB: the offset rands are consumed before the blob-point jitters,
      // exactly matching the original argument-evaluation order.
      const ocx = x + (rand() - 0.5) * baseR * 0.16;
      const ocy = y + (rand() - 0.5) * baseR * 0.16;
      const pts: Pt[] = [];
      const points = 9;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const jitter = 0.72 + rand() * 0.56; // irregular edge
        pts.push({ x: ocx + Math.cos(angle) * r * jitter, y: ocy + Math.sin(angle) * r * jitter });
      }
      layers.push({ pts, alpha, fill });
    }
    blooms.push({ cx: x, cy: y, r: baseR, color, layers });
  }

  // (c) Granulation — ~400 tiny darker speckles clustered near bloom edges.
  const granules: Granule[] = [];
  for (let i = 0; i < 400; i++) {
    const bloom = pick(blooms);
    const angle = rand() * Math.PI * 2;
    const dist = bloom.r * (0.55 + rand() * 0.6);
    const x = bloom.cx + Math.cos(angle) * dist;
    const y = bloom.cy + Math.sin(angle) * dist;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    const alpha = 0.05 + rand() * 0.1;
    const fill = shade(bloom.color, 0.82);
    const r = 0.8 + rand() * 2.2;
    granules.push({ x, y, alpha, fill, r });
  }

  // (d) 2–3 broad light wash ellipses at very low alpha.
  const washes: WashSpec[] = [];
  for (let i = 0; i < 3; i++) {
    const { x, y } = bloomCenter();
    const rx = W * (0.2 + rand() * 0.3);
    const ry = H * (0.14 + rand() * 0.2);
    const alpha = 0.05 + rand() * 0.05;
    const fill = pick(colors);
    const rot = rand() * Math.PI;
    washes.push({ x, y, rx, ry, rot, alpha, fill });
  }

  return { paper, blooms, granules, washes };
}

// ---------------------------------------------------------------------------
// Painters — replay a Composition onto a canvas context.
// ---------------------------------------------------------------------------

/** Smooth closed blob curve through pts (quadratic midpoints), as before. */
function traceBlob(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[0].x + pts[n - 1].x) / 2, (pts[0].y + pts[n - 1].y) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.closePath();
}

/** Warm ivory paper base + subtle speckle. */
export function paintCompositionBase(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  W: number,
  H: number,
): void {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#faf6ee';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#e7dcc9';
  for (const s of comp.paper) {
    ctx.globalAlpha = s.alpha;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

/**
 * Paint layers [from, to) of a single bloom with 'multiply' overlap.
 * Painting the full range at alphaScale 1 reproduces the bloom exactly as
 * the one-pass renderer did; alphaScale < 1 gives a soft fade-in during the
 * reveal animation (the finished frame is still pixel-identical).
 */
export function paintBloomLayers(
  ctx: CanvasRenderingContext2D,
  bloom: BloomSpec,
  from: number,
  to: number,
  alphaScale = 1,
): void {
  ctx.globalCompositeOperation = 'multiply';
  const end = Math.min(to, bloom.layers.length);
  for (let l = Math.max(0, from); l < end; l++) {
    const layer = bloom.layers[l];
    ctx.globalAlpha = layer.alpha * alphaScale;
    ctx.fillStyle = layer.fill;
    traceBlob(ctx, layer.pts);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Paint one whole bloom (all its layers). */
export function paintCompositionBloom(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  index: number,
): void {
  const bloom = comp.blooms[index];
  if (!bloom) return;
  paintBloomLayers(ctx, bloom, 0, bloom.layers.length);
}

/** Clamp a number to [0, 1]. */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** smoothstep ease over [0, 1] — slow organic start, gentle settle. */
function smooth01(v: number): number {
  const p = clamp01(v);
  return p * p * (3 - 2 * p);
}

/** Centroid of a blob's points — the organic center it grows from. */
function centroid(pts: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * Paint a single bloom mid-growth at progress p in [0, 1].
 *
 * The bloom unfurls from the inside out: inner (denser) layers start first
 * as a tiny, faint pool, and outer layers follow, each expanding its own
 * irregular jittered outline around its own center — so growth keeps the
 * organic shape rather than scaling a circle. A faint, slightly wider
 * "wet edge" wash diffuses the growing rim and fades to nothing as the
 * bloom settles.
 *
 * Determinism: at p >= 1 every layer is painted with the exact one-pass
 * operations (no transforms), so paintBloomGrowth(ctx, bloom, 1) is
 * pixel-identical to paintBloomLayers over the full range.
 */
export function paintBloomGrowth(
  ctx: CanvasRenderingContext2D,
  bloom: BloomSpec,
  progress: number,
): void {
  ctx.globalCompositeOperation = 'multiply';
  const p = smooth01(progress);
  const L = bloom.layers.length;
  const LEAD = 0.35; // inner layers lead; outer layers lag (pigment wicks outward)

  for (let l = 0; l < L; l++) {
    const layer = bloom.layers[l];
    const q = smooth01((p - (l / L) * LEAD) / (1 - LEAD));
    if (q <= 0) continue;
    ctx.globalAlpha = q >= 1 ? layer.alpha : layer.alpha * clamp01(q * 2.2);
    ctx.fillStyle = layer.fill;
    if (q >= 1) {
      // Settled layer: byte-exact replay of the one-pass renderer.
      traceBlob(ctx, layer.pts);
      ctx.fill();
      continue;
    }
    const c = centroid(layer.pts);
    const scale = 0.06 + 0.94 * q; // tiny pool → full irregular shape
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(scale, scale);
    ctx.translate(-c.x, -c.y);
    traceBlob(ctx, layer.pts);
    ctx.fill();
    ctx.restore();
  }

  // Wet edge: faint diffusion around the growing rim, gone by p = 1.
  const outer = bloom.layers[L - 1];
  const outerQ = smooth01((p - ((L - 1) / L) * LEAD) / (1 - LEAD));
  if (outerQ > 0 && outerQ < 1) {
    const haloAlpha = 0.05 * (1 - outerQ);
    if (haloAlpha > 0.0005) {
      const c = centroid(outer.pts);
      const s = (0.06 + 0.94 * outerQ) * 1.07;
      ctx.globalAlpha = haloAlpha;
      ctx.fillStyle = bloom.color;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(s, s);
      ctx.translate(-c.x, -c.y);
      traceBlob(ctx, outer.pts);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** Granulation, washes, and the paper-tone vignette — the finishing pass. */
export function paintCompositionFinish(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  W: number,
  H: number,
  alphaScale = 1,
): void {
  ctx.globalCompositeOperation = 'multiply';
  for (const g of comp.granules) {
    ctx.globalAlpha = g.alpha * alphaScale;
    ctx.fillStyle = g.fill;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  for (const w of comp.washes) {
    ctx.globalAlpha = w.alpha * alphaScale;
    ctx.fillStyle = w.fill;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, w.rx, w.ry, w.rot, 0, Math.PI * 2);
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.42,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(247,241,232,0)');
  vignette.addColorStop(1, 'rgba(231,220,201,0.35)');
  ctx.globalAlpha = alphaScale;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * One-pass render — the same operations in the same order as the original
 * renderer, so output is pixel-identical for the same inputs. Used for
 * thumbnails and anywhere the reveal animation is not wanted.
 */
export function renderWatercolor(
  canvas: HTMLCanvasElement,
  opts: { seed: number; palette: PaletteKey; variant: number },
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  if (W <= 0 || H <= 0) return;

  const comp = generateComposition(opts.seed, opts.palette, opts.variant, W, H);
  paintCompositionBase(ctx, comp, W, H);
  for (let i = 0; i < comp.blooms.length; i++) {
    paintCompositionBloom(ctx, comp, i);
  }
  paintCompositionFinish(ctx, comp, W, H);
}
