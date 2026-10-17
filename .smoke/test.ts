// Daydrop engine smoke test — bundled with esbuild, run under plain node.
// Verifies: seed determinism, watercolor pixel determinism, analyzeTone
// behavior, date helpers (leap day + year boundary), and the IDB
// memory-fallback store path.
import { createCanvas } from 'canvas';
import {
  seedFromString,
  renderWatercolor,
  NEUTRAL_PALETTE,
  PALETTES,
  palettesForTone,
  defaultPaletteForTone,
  generateComposition,
  paintBloomLayers,
  paintBloomGrowth,
  paintCompositionBase,
  paintCompositionFinish,
} from '../src/art/watercolor';
import { TONE_COLORS, TONE_ORDER } from '../src/config';
import type { ToneKey } from '../src/config';
import {
  THEMES,
  THEME_KEYS,
  DEFAULT_THEME,
  REQUIRED_THEME_VARS,
  coerceThemeKey,
  applyTheme,
} from '../src/theme/themes';
import {
  JOURNAL_NAME_KEY,
  DEFAULT_JOURNAL_NAME,
  MAX_JOURNAL_NAME,
  coerceJournalName,
} from '../src/prefs';
import {
  MOOD_SQUARES,
  DAY_TAGLINE,
  BLOOM_CARD_W,
  BLOOM_CARD_H,
  YEAR_CARD_W,
  YEAR_CARD_H,
  formatDayShare,
  formatYearShare,
  buildYearGridData,
  drawBloomCard,
  drawYearCard,
  cardTheme,
} from '../src/share/card';
import { analyzeTone, ANALYSIS_NOTE } from '../src/emotion/analyze';
import {
  localDateKey,
  todayKey,
  parseDateKey,
  isValidDateKey,
  formatLong,
  addDaysKey,
  yearOfKey,
} from '../src/utils/date';
import {
  getStorageState,
  isIndexedDBUsable,
  getEntry,
  saveEntry,
  deleteEntry,
  listEntries,
  entryCount,
  deleteAllData,
  getPreference,
  setPreference,
} from '../src/db/store';

let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---- seed determinism ----
check('seedFromString empty string = FNV-1a offset basis', seedFromString('') === 2166136261);
check('seedFromString deterministic', seedFromString('hello daydrop') === seedFromString('hello daydrop'));
check('seedFromString differs per input', seedFromString('a') !== seedFromString('b'));
check('seedFromString is uint32', Number.isInteger(seedFromString('x')) && seedFromString('x') >= 0 && seedFromString('x') <= 0xffffffff);

// ---- watercolor determinism ----
function renderToDataURL(seed: number, variant: number): string {
  const canvas = createCanvas(320, 240);
  renderWatercolor(canvas as unknown as HTMLCanvasElement, { seed, palette: 'rose', variant });
  return canvas.toDataURL();
}
const seed = seedFromString('determinism check');
const url1 = renderToDataURL(seed, 3);
const url2 = renderToDataURL(seed, 3);
const url3 = renderToDataURL(seed, 4);
check('renderWatercolor same inputs → same dataURL', url1 === url2);
check('renderWatercolor different variant → different pixels', url1 !== url3);
check('renderWatercolor dataURL non-trivial length', url1.length > 5000, `len=${url1.length}`);
const neutralCanvas = createCanvas(160, 160);
renderWatercolor(neutralCanvas as unknown as HTMLCanvasElement, {
  seed,
  palette: NEUTRAL_PALETTE,
  variant: 0,
});
check('renderWatercolor neutral palette renders', neutralCanvas.toDataURL().length > 1000);
// Unknown palette falls back to 'mist' instead of throwing.
const oddCanvas = createCanvas(160, 160);
renderWatercolor(oddCanvas as unknown as HTMLCanvasElement, {
  seed,
  palette: 'nope' as never,
  variant: 0,
});
check('renderWatercolor unknown palette falls back gracefully', oddCanvas.toDataURL().length > 1000);
// Progressive paint (base → blooms → finish) must be pixel-identical to one-pass.
function renderProgressive(palette: 'rose' | 'sage', variant: number): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d');
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx as unknown as CanvasRenderingContext2D, comp, 320, 240);
  comp.blooms.forEach((bloom, i) => {
    // Simulate the reveal: paint in layer chunks, like ArtCanvas does.
    for (let from = 0; from < bloom.layers.length; from += 3) {
      paintBloomLayers(ctx as unknown as CanvasRenderingContext2D, bloom, from, from + 3);
    }
    void i;
  });
  paintCompositionFinish(ctx as unknown as CanvasRenderingContext2D, comp, 320, 240);
  return canvas.toDataURL();
}
function renderOnePass(palette: 'rose' | 'sage', variant: number): string {
  const canvas = createCanvas(320, 240);
  renderWatercolor(canvas as unknown as HTMLCanvasElement, { seed, palette, variant });
  return canvas.toDataURL();
}
check('progressive paint ≡ one-pass (rose v3)', renderProgressive('rose', 3) === renderOnePass('rose', 3));
check('progressive paint ≡ one-pass (sage v1)', renderProgressive('sage', 1) === renderOnePass('sage', 1));
check(
  'generateComposition bloom count in range',
  (() => {
    const comp = generateComposition(seed, 'rose', 0, 320, 240);
    return comp.blooms.length >= 5 && comp.blooms.length <= 9 && comp.blooms.every((b) => b.layers.length >= 8);
  })(),
);

// ---- organic growth: a fully-grown bloom is pixel-identical to one-pass ----
type Ctx2D = CanvasRenderingContext2D;
function renderGrowthFinal(palette: 'rose' | 'lavender' | 'neutral', variant: number): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d') as unknown as Ctx2D;
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  // Simulate the reveal's settled state: every bloom at progress = 1.
  for (const bloom of comp.blooms) paintBloomGrowth(ctx, bloom, 1);
  paintCompositionFinish(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
check('growth p=1 ≡ one-pass (rose v3)', renderGrowthFinal('rose', 3) === renderOnePass('rose', 3));
check('growth p=1 ≡ one-pass (lavender v0)', renderGrowthFinal('lavender', 0) === renderOnePass('lavender', 0));
check('growth p=1 ≡ one-pass (neutral v2)', renderGrowthFinal('neutral', 2) === renderOnePass('neutral', 2));

// Growth is deterministic: same bloom, same progress → same pixels.
function renderGrowthAt(palette: 'rose', variant: number, progress: number): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d') as unknown as Ctx2D;
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  for (const bloom of comp.blooms) paintBloomGrowth(ctx, bloom, progress);
  return canvas.toDataURL();
}
check(
  'growth deterministic at p=0.45',
  renderGrowthAt('rose', 3, 0.45) === renderGrowthAt('rose', 3, 0.45),
);
// A bloom at p=0 is a tiny faint pool: it marks the paper, but is far from final.
function renderBaseOnly(): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d') as unknown as Ctx2D;
  const comp = generateComposition(seed, 'rose', 3, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
const baseUrl = renderBaseOnly();
const growthZero = renderGrowthAt('rose', 3, 0);
const growthEarly = renderGrowthAt('rose', 3, 0.15);
const growthFinal = renderGrowthAt('rose', 3, 1);
check('growth p=0 paints nothing (≡ blank base)', growthZero === baseUrl);
check('growth p=0.15 marks the paper (tiny faint pool)', growthEarly !== baseUrl);
check('growth p=0.15 differs from grown final', growthEarly !== growthFinal);
check('growth p=1 without finish ≡ grown final', growthFinal === renderGrowthAt('rose', 3, 1));

// Finishing-pass alphaScale=1 is identical to the default call.
function renderFinishScaled(alphaScale: number): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d') as unknown as Ctx2D;
  const comp = generateComposition(seed, 'sage', 1, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  paintCompositionFinish(ctx, comp, 320, 240, alphaScale);
  return canvas.toDataURL();
}
function renderFinishDefault(): string {
  const canvas = createCanvas(320, 240);
  const ctx = canvas.getContext('2d') as unknown as Ctx2D;
  const comp = generateComposition(seed, 'sage', 1, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  paintCompositionFinish(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
check('finish alphaScale=1 ≡ default finish', renderFinishScaled(1) === renderFinishDefault());
check('finish alphaScale=0.5 differs from full finish', renderFinishScaled(0.5) !== renderFinishDefault());

// ---- analyzeTone ----
const joy = analyzeTone('I had a wonderful day full of laughter and joy with friends');
check('analyzeTone joy sentence → joy top', joy.tones[0].tone === 'joy', JSON.stringify(joy.tones));
check('analyzeTone joy sentence confidence medium', joy.confidence === 'medium');
const veryJoy = analyzeTone('happy joyful wonderful amazing beautiful delightful');
check('analyzeTone concentrated joy → high confidence', veryJoy.tones[0].tone === 'joy' && veryJoy.confidence === 'high', JSON.stringify(veryJoy));
const anx = analyzeTone('I feel so anxious and overwhelmed about everything right now');
check('analyzeTone anxiety sentence → anxiety top', anx.tones[0].tone === 'anxiety', JSON.stringify(anx.tones));
const flat = analyzeTone('The meeting was okay, nothing special happened today at all');
check('analyzeTone flat sentence → mixed fallback', flat.tones[0].tone === 'mixed' && flat.confidence === 'low', JSON.stringify(flat));
check('analyzeTone note is the suggestion copy', joy.note === ANALYSIS_NOTE);
check('analyzeTone method is lexicon', joy.method === 'lexicon');
const bigram = analyzeTone('I am completely burned out after this long day');
check('analyzeTone bigram "burned out" scores sadness', bigram.tones[0].tone === 'sadness', JSON.stringify(bigram.tones));

// ---- date helpers ----
check('localDateKey leap day', localDateKey(new Date(2024, 1, 29)) === '2024-02-29');
check('todayKey format', /^\d{4}-\d{2}-\d{2}$/.test(todayKey()));
check('addDaysKey leap day forward', addDaysKey('2024-02-28', 1) === '2024-02-29');
check('addDaysKey leap day → Mar 1', addDaysKey('2024-02-29', 1) === '2024-03-01');
check('addDaysKey year boundary', addDaysKey('2024-12-31', 1) === '2025-01-01');
check('addDaysKey negative across year', addDaysKey('2024-01-01', -1) === '2023-12-31');
check('isValidDateKey rejects 2023-02-29', !isValidDateKey('2023-02-29'));
check('isValidDateKey rejects 2024-02-30', !isValidDateKey('2024-02-30'));
check('isValidDateKey accepts 2024-02-29', isValidDateKey('2024-02-29'));
let threw = false;
try {
  parseDateKey('2023-02-29');
} catch {
  threw = true;
}
check('parseDateKey throws on non-leap Feb 29', threw);
check('parseDateKey local midnight', (() => {
  const d = parseDateKey('2026-10-16');
  return d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 16 && d.getHours() === 0;
})());
check('formatLong', formatLong('2026-10-16') === 'Friday, October 16, 2026', formatLong('2026-10-16'));
check('yearOfKey', yearOfKey('2024-02-29') === 2024);

// ---- store (node has no indexedDB → memory fallback path) ----
async function storeChecks(): Promise<void> {
  check('isIndexedDBUsable false in node', !isIndexedDBUsable());
  await saveEntry({
    id: 'e1',
    dateKey: '2026-10-16',
    text: 'smoke test entry',
    suggestedTones: [{ tone: 'joy', score: 0.8 }],
    analysisMethod: 'lexicon',
    userTone: null,
    artSeed: 123,
    artPalette: 'rose',
    artVariant: 0,
    soundscape: 'soft-pad',
    createdAt: 1,
    updatedAt: 2,
  });
  check('memory fallback engaged', getStorageState() === 'memory');
  const got = await getEntry('2026-10-16');
  check('save/get roundtrip', got !== null && got.text === 'smoke test entry' && got.artSeed === 123);
  check('entryCount 1', (await entryCount()) === 1);
  await saveEntry({
    id: 'e2',
    dateKey: '2026-10-15',
    text: 'older entry',
    suggestedTones: [],
    analysisMethod: 'lexicon',
    userTone: 'calm',
    artSeed: 7,
    artPalette: 'sage',
    artVariant: 1,
    soundscape: 'airy-drone',
    createdAt: 1,
    updatedAt: 1,
  });
  const list = await listEntries();
  check('listEntries dateKey descending', list.length === 2 && list[0].dateKey === '2026-10-16' && list[1].dateKey === '2026-10-15');
  await deleteEntry('2026-10-16');
  check('deleteEntry removes', (await getEntry('2026-10-16')) === null);
  await deleteAllData();
  check('deleteAllData empties', (await entryCount()) === 0);
  let invalidThrew = false;
  try {
    await saveEntry({
      id: 'bad',
      dateKey: '2023-02-29',
      text: 'x',
      suggestedTones: [],
      analysisMethod: 'lexicon',
      userTone: null,
      artSeed: 0,
      artPalette: 'mist',
      artVariant: 0,
      soundscape: 'soft-pad',
      createdAt: 0,
      updatedAt: 0,
    });
  } catch {
    invalidThrew = true;
  }
  check('saveEntry rejects invalid dateKey', invalidThrew);
  // Preferences roundtrip (memory fallback in node).
  check('getPreference fallback default', (await getPreference('soundEnabled', true)) === true);
  await setPreference('soundEnabled', false);
  check('setPreference/getPreference roundtrip', (await getPreference('soundEnabled', true)) === false);
  await deleteAllData();
  check('deleteAllData keeps preferences', (await getPreference('soundEnabled', true)) === false);
  // Theme + journal name preferences roundtrip (memory fallback in node).
  check('theme preference default', (await getPreference('theme', DEFAULT_THEME)) === DEFAULT_THEME);
  await setPreference('theme', 'moonlight');
  check('theme preference roundtrip', (await getPreference('theme', DEFAULT_THEME)) === 'moonlight');
  await setPreference(JOURNAL_NAME_KEY, 'Sunny Days');
  check(
    'journal name preference roundtrip',
    coerceJournalName(await getPreference<string | null>(JOURNAL_NAME_KEY, null)) === 'Sunny Days'
  );
}

// ---- mood → palette: the artwork renderer must receive the mood's palette ----
// Every tone maps to a non-empty palette list whose entries all exist, and
// the default palette's bloom pigments come from that palette (or a shaded
// variant of one of its colors).
const EXPECTED_DEFAULT: Record<ToneKey, string> = {
  joy: 'honey',
  calm: 'sage',
  sadness: 'powder',
  anxiety: 'periwinkle',
  frustration: 'coral',
  mixed: 'neutral',
  open: 'neutral',
};
for (const tone of TONE_ORDER) {
  const list = palettesForTone(tone);
  check(`palettesForTone(${tone}) non-empty and all known`, list.length > 0 && list.every((k) => k in PALETTES));
  check(`defaultPaletteForTone(${tone}) = ${EXPECTED_DEFAULT[tone]}`, defaultPaletteForTone(tone) === EXPECTED_DEFAULT[tone]);
}
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function parseFill(fill: string): [number, number, number] | null {
  const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(fill);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (/^#[0-9a-f]{6}$/i.test(fill)) return hexToRgb(fill);
  return null;
}
/** True when fill is a palette color or a darkened shade of one (granulation). */
function fillFromPalette(fill: string, colors: string[]): boolean {
  const rgb = parseFill(fill);
  if (!rgb) return false;
  return colors.some((c) => {
    const [r, g, b] = hexToRgb(c);
    const [fr, fg, fb] = rgb;
    // shaded fills scale channels down by a factor in [0.7, 1.0]
    if (fr > r || fg > g || fb > b) return false;
    const ratios = [r ? fr / r : 1, g ? fg / g : 1, b ? fb / b : 1].filter((x) => x <= 1);
    return ratios.length > 0 && ratios.every((x) => x >= 0.7);
  });
}
for (const tone of TONE_ORDER) {
  const palette = defaultPaletteForTone(tone);
  const colors = PALETTES[palette].colors;
  const comp = generateComposition(seedFromString(`palette ${tone}`), palette, 0, 320, 240);
  const fills: string[] = [];
  for (const b of comp.blooms) {
    fills.push(b.color);
    for (const l of b.layers) fills.push(l.fill);
  }
  for (const g of comp.granules) fills.push(g.fill);
  for (const w of comp.washes) fills.push(w.fill);
  const bad = fills.filter((f) => !fillFromPalette(f, colors));
  check(`artwork for mood ${tone} uses only its palette (${palette})`, bad.length === 0, bad.slice(0, 3).join(','));
}
// Distinct moods get distinct default palettes (no single blue-everywhere).
const defaults = TONE_ORDER.map(defaultPaletteForTone);
check('distinct moods have distinct default palettes', new Set(defaults).size >= 5, defaults.join(','));

// ---- page themes: definitions complete, contrast accessible ----
check('DEFAULT_THEME is daybreak', DEFAULT_THEME === 'daybreak');
check('six named themes + daybreak', THEME_KEYS.length === 7 && THEME_KEYS[0] === 'daybreak');
for (const key of THEME_KEYS) {
  const def = THEMES[key];
  check(`theme ${key} defined with name+tagline`, !!def && def.name.length > 0 && def.tagline.length > 0);
  const missing = (REQUIRED_THEME_VARS as readonly string[]).filter((v) => !(v in def.vars));
  check(`theme ${key} defines all required vars`, missing.length === 0, missing.join(','));
  const badHex = Object.entries(def.vars).filter(([, h]) => !/^#[0-9a-f]{6}$/i.test(h));
  check(`theme ${key} vars are valid hex`, badHex.length === 0, badHex.map(([v]) => v).join(','));
  check(`theme ${key} has 3 preview pigments`, def.preview.length === 3);
}
check("coerceThemeKey falls back to default", coerceThemeKey('nope') === DEFAULT_THEME);
check("coerceThemeKey keeps valid key", coerceThemeKey('moonlight') === 'moonlight');
// applyTheme is a no-op without a DOM — must not throw in node.
let applyThrew = false;
try {
  applyTheme('ocean-mist');
} catch {
  applyThrew = true;
}
check('applyTheme safe without document', !applyThrew);

function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number): number => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 0xff) + 0.7152 * f((n >> 8) & 0xff) + 0.0722 * f(n & 0xff);
}
function contrast(a: string, b: string): number {
  const x = relLum(a);
  const y = relLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const key of THEME_KEYS) {
  const v = THEMES[key].vars;
  const rBody = contrast(v.ink, v.paper);
  const rBody2 = contrast(v.ink, v['paper-2']);
  const rSoft = contrast(v['ink-soft'], v.paper);
  const rBtn = contrast(v['on-accent'], v.accent);
  check(`theme ${key} body text ≥ 4.5:1`, rBody >= 4.5, rBody.toFixed(2));
  check(`theme ${key} body on surface ≥ 4.5:1`, rBody2 >= 4.5, rBody2.toFixed(2));
  check(`theme ${key} muted text ≥ 4.5:1`, rSoft >= 4.5, rSoft.toFixed(2));
  check(`theme ${key} button text ≥ 3:1`, rBtn >= 3.0, rBtn.toFixed(2));
}
// Theme choice never leaks into mood data: TONE_COLORS untouched by themes.
check('TONE_COLORS independent of themes', TONE_COLORS.joy === '#e8a2b8' && TONE_COLORS.sadness === '#93a8c8');

// ---- journal name preference ----
check('coerceJournalName trims', coerceJournalName('  Sunny Days  ') === 'Sunny Days');
check('coerceJournalName caps at 20', coerceJournalName('x'.repeat(30)).length === MAX_JOURNAL_NAME);
check('coerceJournalName blank → default', coerceJournalName('   ') === DEFAULT_JOURNAL_NAME);
check('coerceJournalName null → default', coerceJournalName(null) === DEFAULT_JOURNAL_NAME);

// ---- share text formats (exact strings; never contain journal text) ----
check(
  'formatDayShare today exact',
  formatDayShare({ dateKey: '2026-10-17', mood: 'calm', isToday: true }) ===
    'Daydrop · Oct 17\n' + "Today's bloom: Calm\n" + '🟩\n' + DAY_TAGLINE,
);
check(
  'formatDayShare historical exact',
  formatDayShare({ dateKey: '2026-10-12', mood: 'joy', isToday: false }) ===
    'Daydrop · Oct 12\nThis bloom: Joyful\n🟨\n' + DAY_TAGLINE,
);
check(
  'every tone has a distinct mood square',
  TONE_ORDER.every((t) => MOOD_SQUARES[t].length > 0) &&
    new Set(TONE_ORDER.map((t) => MOOD_SQUARES[t])).size === TONE_ORDER.length,
);
check(
  'formatYearShare exact',
  formatYearShare({
    year: 2026,
    recorded: 128,
    monthDominant: ['calm', 'joy', null, 'sadness', 'calm', 'calm', 'joy', null, null, null, null, null],
  }) ===
    'Daydrop · 2026 in Color\n128 days recorded\nJ F M A M J J A S O N D\n' +
      '🟩🟨⬜🟦🟩🟩🟨⬜⬜⬜⬜⬜',
);
check(
  'formatYearShare empty year honest',
  formatYearShare({ year: 2025, recorded: 0, monthDominant: Array(12).fill(null) }) ===
    'Daydrop · 2025 in Color\n0 days recorded\nJ F M A M J J A S O N D\n' + '⬜'.repeat(12),
);

// ---- year grid data: real entries only, nothing fabricated ----
{
  const fixture: Record<string, ToneKey> = {
    '2024-01-01': 'calm',
    '2024-02-29': 'joy', // leap day
    '2024-12-31': 'sadness',
    '2023-12-31': 'anxiety', // padding week, outside the year
  };
  const grid = buildYearGridData(2024, fixture);
  check('year grid recorded counts in-year entries only', grid.recorded === 3, `got ${grid.recorded}`);
  const find = (key: string) => grid.weeks.flat().find((d) => d.dateKey === key);
  check('leap day 2024-02-29 keeps its mood', find('2024-02-29')?.tone === 'joy');
  check('padding day outside year has no tone', find('2023-12-31')?.tone === null && find('2023-12-31')?.inYear === false);
  check('missing day stays empty (never fabricated)', find('2024-06-15')?.tone === null && find('2024-06-15')?.inYear === true);
  check('grid weeks are full 7-day rows', grid.weeks.every((w) => w.length === 7));
  check(
    'grid starts on a Sunday',
    parseDateKey(grid.weeks[0][0].dateKey).getDay() === 0,
    grid.weeks[0][0].dateKey,
  );
  check('month dominant moods', grid.monthDominant[0] === 'calm' && grid.monthDominant[1] === 'joy' && grid.monthDominant[11] === 'sadness');
  check('empty months have no dominant mood', grid.monthDominant[2] === null && grid.monthDominant[5] === null);
  const empty = buildYearGridData(2025, {});
  check('empty year: 0 recorded, all months null', empty.recorded === 0 && empty.monthDominant.every((m) => m === null));
}

// ---- share card painting (node-canvas): non-blank, mood-aware ----
function countPaintedPixels(canvas: { getContext: (t: string) => unknown }): number {
  const ctx = canvas.getContext('2d') as {
    getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
  };
  const { data } = ctx.getImageData(0, 0, BLOOM_CARD_W, BLOOM_CARD_H);
  // Paper is #faf6ee (250,246,238); count pixels clearly different from it.
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - 250) > 18 || Math.abs(data[i + 1] - 246) > 18 || Math.abs(data[i + 2] - 238) > 18) {
      n++;
    }
  }
  return n;
}
{
  const make = (w: number, h: number) => createCanvas(w, h) as unknown as HTMLCanvasElement;
  const theme = cardTheme(); // node: falls back to Daybreak values
  const card = createCanvas(BLOOM_CARD_W, BLOOM_CARD_H);
  const ctx = card.getContext('2d') as unknown as CanvasRenderingContext2D;
  drawBloomCard(
    ctx,
    BLOOM_CARD_W,
    BLOOM_CARD_H,
    {
      seed: 12345,
      palette: 'honey',
      variant: 0,
      dateKey: '2026-10-17',
      journalName: 'My Journal',
      mood: 'joy',
      theme,
    },
    make,
  );
  check('bloom card paints artwork pixels', countPaintedPixels(card) > 50000, `painted=${countPaintedPixels(card)}`);
  // Mood-hidden card still renders (no throw) and differs from mood-shown.
  const card2 = createCanvas(BLOOM_CARD_W, BLOOM_CARD_H);
  const ctx2 = card2.getContext('2d') as unknown as CanvasRenderingContext2D;
  drawBloomCard(
    ctx2, BLOOM_CARD_W, BLOOM_CARD_H,
    { seed: 12345, palette: 'honey', variant: 0, dateKey: '2026-10-17', journalName: 'My Journal', mood: null, theme },
    make,
  );
  check(
    'mood-hidden card renders and differs',
    countPaintedPixels(card2) > 50000 && card.toDataURL() !== card2.toDataURL(),
  );
  // Year card paints cells from real data.
  const ycard = createCanvas(YEAR_CARD_W, YEAR_CARD_H);
  const yctx = ycard.getContext('2d') as unknown as CanvasRenderingContext2D;
  const ygrid = buildYearGridData(2024, { '2024-01-01': 'calm', '2024-02-29': 'joy' });
  drawYearCard(yctx, YEAR_CARD_W, YEAR_CARD_H, { year: 2024, journalName: 'My Journal', grid: ygrid, theme });
  const ydata = (yctx as unknown as { getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray } }).getImageData(0, 0, YEAR_CARD_W, YEAR_CARD_H).data;
  let yn = 0;
  for (let i = 0; i < ydata.length; i += 40) {
    if (Math.abs(ydata[i] - 250) > 18 || Math.abs(ydata[i + 1] - 246) > 18 || Math.abs(ydata[i + 2] - 238) > 18) yn++;
  }
  check('year card paints grid pixels', yn > 1000, `painted~${yn * 10}`);
  // Empty year card renders honestly without throwing.
  const ecard = createCanvas(YEAR_CARD_W, YEAR_CARD_H);
  const ectx = ecard.getContext('2d') as unknown as CanvasRenderingContext2D;
  drawYearCard(ectx, YEAR_CARD_W, YEAR_CARD_H, {
    year: 2025, journalName: 'My Journal', grid: buildYearGridData(2025, {}), theme,
  });
  check('empty year card renders', ecard.toDataURL().length > 10000);
}

async function prefChecks() {
  await setPreference('sidebarCollapsed', true);
  check('sidebarCollapsed pref roundtrip', (await getPreference('sidebarCollapsed', false)) === true);
  await setPreference('sidebarCollapsed', false);
  check('sidebarCollapsed pref reset', (await getPreference('sidebarCollapsed', true)) === false);
}

Promise.all([storeChecks(), prefChecks()]).then(() => {
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
});
