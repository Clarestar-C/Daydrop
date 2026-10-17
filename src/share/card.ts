// Share-card generation for Daydrop — 100% local canvas rendering.
// Privacy: only artwork pixels, dates, mood labels and the journal name
// are ever drawn. Journal text is NEVER included in any share output.
// No network calls, no analytics.

import { NEUTRAL_PALETTE, PALETTES, renderWatercolor } from '../art/watercolor';
import type { PaletteKey } from '../art/watercolor';
import { APP_NAME, TONE_COLORS, TONE_LABELS, TONE_ORDER } from '../config';
import type { ToneKey } from '../config';
import { addDaysKey, parseDateKey } from '../utils/date';

export const DAY_TAGLINE = 'A little moment from my day.';

/** Watercolor-inspired square per mood for text sharing. */
export const MOOD_SQUARES: Record<ToneKey, string> = {
  joy: '🟨',
  calm: '🟩',
  sadness: '🟦',
  anxiety: '🟪',
  frustration: '🟧',
  mixed: '🟫',
  open: '⬜',
};

export const BLOOM_CARD_W = 1080;
export const BLOOM_CARD_H = 1350;
export const YEAR_CARD_W = 1600;
export const YEAR_CARD_H = 2000;

export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement;

function domMakeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function coercePalette(palette: string): PaletteKey {
  return Object.prototype.hasOwnProperty.call(PALETTES, palette)
    ? (palette as PaletteKey)
    : NEUTRAL_PALETTE;
}

export interface CardTheme {
  paper: string;
  paper2: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
}

/** Read theme colors from CSS variables (fall back to Daybreak values). */
export function cardTheme(): CardTheme {
  const read = (name: string, fallback: string): string => {
    if (typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    paper: read('--paper', '#faf6ee'),
    paper2: read('--paper-2', '#fffdf8'),
    ink: read('--ink', '#3e3548'),
    inkSoft: read('--ink-soft', '#66707f'),
    line: read('--line', '#e7dcc9'),
    accent: read('--accent', '#5e7ba0'),
  };
}

/** "Oct 17" style short label for a YYYY-MM-DD key. */
export function formatShortDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** "Saturday, October 17, 2026" style long label for a YYYY-MM-DD key. */
export function formatLongDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function centerText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  font: string,
  fill: string,
): void {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, cx, y);
}

/** Shrink a font to fit maxWidth; returns the font string to use. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  basePx: number,
  family: string,
  maxWidth: number,
): string {
  let px = basePx;
  const style = (p: number) => `${p}px ${family}`;
  ctx.font = style(px);
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = style(px);
  }
  return style(px);
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export interface BloomCardOpts {
  seed: number;
  palette: string;
  variant: number;
  dateKey: string;
  journalName: string;
  /** Null hides the mood label (privacy choice). */
  mood: ToneKey | null;
  tagline?: string;
  theme?: CardTheme;
  makeCanvas?: MakeCanvas;
}

/**
 * Paint a "Today's Bloom" share card onto ctx (pure paint — testable with
 * node-canvas). Layout 1080×1350. Uses the deterministic one-pass renderer,
 * so the card matches the saved artwork exactly, even mid-animation.
 */
export function drawBloomCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opts: BloomCardOpts,
  makeCanvas: MakeCanvas,
): void {
  const t = opts.theme ?? cardTheme();
  const tagline = opts.tagline ?? DAY_TAGLINE;
  const cx = W / 2;

  // Paper background + hairline frame.
  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Journal name, small caps feel.
  centerText(
    ctx,
    opts.journalName.toUpperCase(),
    cx,
    118,
    fitFont(ctx, opts.journalName.toUpperCase(), 34, SANS, W - 200),
    t.inkSoft,
  );

  // Artwork — deterministic one-pass render of the SAVED composition.
  const artSize = 880;
  const artX = Math.round((W - artSize) / 2);
  const artY = 165;
  const art = makeCanvas(artSize, artSize);
  renderWatercolor(art as unknown as HTMLCanvasElement, {
    seed: opts.seed,
    palette: coercePalette(opts.palette),
    variant: opts.variant,
  });
  ctx.drawImage(art as unknown as CanvasImageSource, artX, artY);

  // Date.
  centerText(ctx, formatLongDate(opts.dateKey), cx, artY + artSize + 78, `46px ${SERIF}`, t.ink);

  // Optional mood label with color dot.
  let y = artY + artSize + 140;
  if (opts.mood) {
    const label = TONE_LABELS[opts.mood];
    const color = TONE_COLORS[opts.mood];
    ctx.font = `34px ${SANS}`;
    const tw = ctx.measureText(label).width;
    const dotR = 15;
    const gap = 18;
    const total = dotR * 2 + gap + tw;
    const startX = cx - total / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX + dotR, y - 11, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `34px ${SANS}`;
    ctx.fillStyle = t.inkSoft;
    ctx.textAlign = 'left';
    ctx.fillText(label, startX + dotR * 2 + gap, y);
    y += 62;
  }

  // Tagline.
  centerText(ctx, tagline, cx, y + 8, `italic 30px ${SERIF}`, t.inkSoft);

  // Footer branding.
  centerText(ctx, `Made with ${APP_NAME}`, cx, H - 62, `22px ${SANS}`, t.inkSoft);
}

/** Render a finished bloom card canvas (browser). */
export function renderBloomCard(opts: BloomCardOpts): HTMLCanvasElement {
  const make = opts.makeCanvas ?? domMakeCanvas;
  const canvas = make(BLOOM_CARD_W, BLOOM_CARD_H);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  drawBloomCard(ctx, BLOOM_CARD_W, BLOOM_CARD_H, opts, make);
  return canvas;
}

// ---------------------------------------------------------------------------
// Year-in-color grid
// ---------------------------------------------------------------------------

export interface YearDay {
  dateKey: string;
  inYear: boolean;
  tone: ToneKey | null; // null = no entry (never fabricated)
}

export interface YearGrid {
  weeks: YearDay[][];
  /** Entries actually recorded within the year. */
  recorded: number;
  /** Dominant mood per month (0=Jan), null when the month has no entries. */
  monthDominant: (ToneKey | null)[];
}

function buildYearKeys(year: number): string[] {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const startDow = parseDateKey(jan1).getDay();
  const endDow = parseDateKey(dec31).getDay();
  let key = addDaysKey(jan1, -startDow);
  const endKey = addDaysKey(dec31, 6 - endDow);
  const keys: string[] = [];
  for (;;) {
    keys.push(key);
    if (key === endKey) break;
    key = addDaysKey(key, 1);
  }
  return keys;
}

/**
 * Build the year grid from REAL entries only. `tones` maps dateKey → tone.
 * Missing days stay null; nothing is invented.
 */
export function buildYearGridData(
  year: number,
  tones: Record<string, ToneKey>,
): YearGrid {
  const keys = buildYearKeys(year);
  const weeks: YearDay[][] = [];
  let recorded = 0;
  const monthCounts: Record<number, Partial<Record<ToneKey, number>>> = {};
  for (let i = 0; i < keys.length; i += 7) {
    const wk: YearDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = keys[i + d];
      const dt = parseDateKey(key);
      const inYear = dt.getFullYear() === year;
      const tone = tones[key] ?? null;
      if (inYear && tone) {
        recorded++;
        const m = dt.getMonth();
        monthCounts[m] = monthCounts[m] ?? {};
        monthCounts[m][tone] = (monthCounts[m][tone] ?? 0) + 1;
      }
      wk.push({ dateKey: key, inYear, tone: inYear ? tone : null });
    }
    weeks.push(wk);
  }
  const monthDominant: (ToneKey | null)[] = [];
  for (let m = 0; m < 12; m++) {
    const counts = monthCounts[m];
    if (!counts) {
      monthDominant.push(null);
      continue;
    }
    let best: ToneKey | null = null;
    let bestN = 0;
    for (const tone of TONE_ORDER) {
      const n = counts[tone] ?? 0;
      if (n > bestN) {
        bestN = n;
        best = tone;
      }
    }
    monthDominant.push(best);
  }
  return { weeks, recorded, monthDominant };
}

export interface YearCardOpts {
  year: number;
  journalName: string;
  grid: YearGrid;
  theme?: CardTheme;
  makeCanvas?: MakeCanvas;
}

/**
 * Paint the "Year in Color" card (pure paint — testable). Layout 1600×2000.
 */
export function drawYearCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opts: YearCardOpts,
): void {
  const t = opts.theme ?? cardTheme();
  const { year, grid } = opts;
  const cx = W / 2;

  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  centerText(ctx, opts.journalName.toUpperCase(), cx, 112, fitFont(ctx, opts.journalName.toUpperCase(), 32, SANS, W - 300), t.inkSoft);
  centerText(ctx, `${year} in Color`, cx, 190, `68px ${SERIF}`, t.ink);

  const nCols = grid.weeks.length;
  const marginX = 96;
  const gridTop = 260;
  const gridW = W - marginX * 2;
  const colW = gridW / nCols;
  const gap = Math.max(3, Math.min(7, colW * 0.22));
  const cell = colW - gap;
  const rowH = cell + gap;

  // Month labels above the first column of each month.
  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = t.inkSoft;
  ctx.textAlign = 'left';
  let prevMonth = -1;
  grid.weeks.forEach((wk, wi) => {
    const sat = parseDateKey(wk[6].dateKey);
    const m = sat.getMonth();
    const satYear = sat.getFullYear();
    if (satYear === year && m !== prevMonth) {
      const name = sat.toLocaleDateString('en-US', { month: 'short' });
      ctx.fillText(name, marginX + wi * colW, gridTop - 14);
    }
    if (satYear === year) prevMonth = m;
  });

  // Day cells.
  const emptyFill = t.paper2 === t.paper ? '#e9e1cf' : t.line;
  grid.weeks.forEach((wk, wi) => {
    wk.forEach((day, di) => {
      const x = marginX + wi * colW;
      const y = gridTop + di * rowH;
      if (!day.inYear) {
        return; // padding days outside the year stay blank
      }
      ctx.fillStyle = day.tone ? TONE_COLORS[day.tone] : emptyFill;
      ctx.fillRect(x, y, cell, cell);
    });
  });
  const gridBottom = gridTop + 7 * rowH;

  // Recorded count.
  const countLabel =
    grid.recorded === 0
      ? `No entries yet in ${year}`
      : `${grid.recorded} day${grid.recorded === 1 ? '' : 's'} recorded`;
  centerText(ctx, countLabel, cx, gridBottom + 78, `36px ${SERIF}`, t.ink);

  // Compact legend: dot + name, two rows.
  const legendY = gridBottom + 140;
  ctx.font = `26px ${SANS}`;
  const items = TONE_ORDER.map((k) => ({ k, label: TONE_LABELS[k] }));
  const rows: typeof items[] = [items.slice(0, 4), items.slice(4)];
  rows.forEach((row, ri) => {
    const widths = row.map((it) => 20 + 12 + ctx.measureText(it.label).width + 44);
    const totalW = widths.reduce((a, b) => a + b, 0);
    let x = cx - totalW / 2;
    const y = legendY + ri * 52;
    row.forEach((it, ii) => {
      ctx.fillStyle = TONE_COLORS[it.k];
      ctx.beginPath();
      ctx.arc(x + 10, y - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.inkSoft;
      ctx.textAlign = 'left';
      ctx.fillText(it.label, x + 32, y);
      x += widths[ii];
    });
  });

  centerText(ctx, `Made with ${APP_NAME}`, cx, H - 60, `22px ${SANS}`, t.inkSoft);
}

/** Render a finished year card canvas (browser). */
export function renderYearCard(opts: YearCardOpts): HTMLCanvasElement {
  const make = opts.makeCanvas ?? domMakeCanvas;
  const canvas = make(YEAR_CARD_W, YEAR_CARD_H);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  drawYearCard(ctx, YEAR_CARD_W, YEAR_CARD_H, opts);
  return canvas;
}

// ---------------------------------------------------------------------------
// Wordle-style text sharing (no journal text, ever)
// ---------------------------------------------------------------------------

export interface DayShareOpts {
  dateKey: string;
  mood: ToneKey;
  isToday: boolean;
  tagline?: string;
}

/** Compact text card for one day. Exact format is covered by smoke tests. */
export function formatDayShare(opts: DayShareOpts): string {
  const lines = [
    `${APP_NAME} · ${formatShortDate(opts.dateKey)}`,
    `${opts.isToday ? "Today's" : 'This'} bloom: ${TONE_LABELS[opts.mood]}`,
    MOOD_SQUARES[opts.mood],
    opts.tagline ?? DAY_TAGLINE,
  ];
  return lines.join('\n');
}

export interface YearShareOpts {
  year: number;
  recorded: number;
  monthDominant: (ToneKey | null)[];
}

/** Compact year summary with a 12-square month strip. */
export function formatYearShare(opts: YearShareOpts): string {
  const squares = opts.monthDominant.map((m) => (m ? MOOD_SQUARES[m] : '⬜')).join('');
  const dayWord = opts.recorded === 1 ? 'day' : 'days';
  return [
    `${APP_NAME} · ${opts.year} in Color`,
    `${opts.recorded} ${dayWord} recorded`,
    'J F M A M J J A S O N D',
    squares,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Download / native share / clipboard (browser only)
// ---------------------------------------------------------------------------

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Trigger a PNG download. Local only — no upload. */
export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after a tick so the download can start.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

/**
 * Try the native share sheet with the PNG file; fall back to download.
 * Only ever called from an explicit user tap.
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  share: { title: string; text: string },
): Promise<ShareResult> {
  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas);
  } catch {
    return 'unavailable';
  }
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (typeof navigator.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: share.title, text: share.text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Share sheet failed — fall through to download.
    }
  }
  try {
    await downloadCanvas(canvas, filename);
    return 'downloaded';
  } catch {
    return 'unavailable';
  }
}

/** Copy text; returns false when the clipboard API is unavailable/blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
