"use strict";

// .smoke/test.ts
var import_canvas = require("canvas");

// src/art/watercolor.ts
var NEUTRAL_PALETTE = "neutral";
var PALETTES = {
  blush: {
    label: "Blush",
    colors: ["#f3c6d3", "#e8a2b8", "#f7dee4", "#e5b8c4", "#f0d3da"]
  },
  rose: {
    label: "Rose",
    colors: ["#e8a2b8", "#d97f9c", "#f0bcc9", "#c96f8e", "#eec3cd"]
  },
  // Kept the 'lavender' key for stored entries; the pigments are now muted
  // slate/powder/dusty blues rather than purple.
  lavender: {
    label: "Blue Haze",
    colors: ["#7e93ad", "#a7b8cc", "#8ba3c2", "#6f87a8", "#9db4d6"]
  },
  powder: {
    label: "Powder",
    colors: ["#9db9d9", "#8aa9cf", "#b9cde6", "#7f9cc2", "#aebfdc"]
  },
  peach: {
    label: "Peach",
    colors: ["#f0c49c", "#e8ab78", "#f7d9ba", "#df9c66", "#f2cfae"]
  },
  sage: {
    label: "Sage",
    colors: ["#a9c6a4", "#93b48e", "#c2d6bd", "#83a37e", "#b4ccb0"]
  },
  mist: {
    label: "Mist",
    colors: ["#cfd4d6", "#bcc3c7", "#dde1e2", "#aeb7bb", "#c9d2d4"]
  },
  dusk: {
    label: "Dusk",
    colors: ["#8b93b8", "#98a0c4", "#7d88ad", "#a8aec9", "#8f9ab5"]
  },
  honey: {
    label: "Honey",
    colors: ["#eec25e", "#e2a94f", "#f4d48c", "#d99f45", "#f0cf82"]
  },
  periwinkle: {
    label: "Periwinkle",
    colors: ["#8f97c4", "#a3a8cf", "#7e86b8", "#b0b4d6", "#99a0c9"]
  },
  coral: {
    label: "Coral",
    colors: ["#d98873", "#cf7f86", "#e5a68d", "#c4706f", "#e0b09a"]
  },
  seafoam: {
    label: "Seafoam",
    colors: ["#a9c9b8", "#93b8a4", "#c2d9cb", "#86ad99", "#b8d2c2"]
  },
  neutral: {
    label: "Neutral",
    colors: ["#e9e2d4", "#d9d0bf", "#f4efe3", "#cfc6b4", "#e2d8c8", "#fbf7ee"]
  },
  // Theme preview pigments — used only for the Settings preview cards.
  // Never offered as mood palettes and never saved to entries.
  "preview-daybreak": {
    label: "Daybreak preview",
    colors: ["#e8a2b8", "#a9c6a4", "#9db9d9", "#f0c9d4", "#bcd2b8"]
  },
  "preview-ocean-mist": {
    label: "Ocean Mist preview",
    colors: ["#9db9d9", "#6fa8a5", "#d7e6ec", "#8fb8c9", "#a9cfc9"]
  },
  "preview-secret-garden": {
    label: "Secret Garden preview",
    colors: ["#a9c6a4", "#7d8f69", "#e6dfc4", "#93a97e", "#c2d6bd"]
  },
  "preview-lavender-dream": {
    label: "Lavender Dream preview",
    colors: ["#b9a8d9", "#8f97c4", "#e6dcf4", "#a394c9", "#b3b9d9"]
  },
  "preview-peach-sunrise": {
    label: "Peach Sunrise preview",
    colors: ["#f0c49c", "#e8a2a2", "#eec25e", "#e5b183", "#f2d48e"]
  },
  "preview-rosewater": {
    label: "Rosewater preview",
    colors: ["#d99aa8", "#b57e8c", "#f4e6de", "#c48a98", "#e8d5cc"]
  },
  "preview-moonlight": {
    label: "Moonlight preview",
    colors: ["#5a6b9e", "#8fa3d9", "#ccd5ea", "#4e5f8f", "#a9bce6"]
  }
};
function palettesForTone(tone) {
  switch (tone) {
    case "joy":
      return ["honey", "peach", "blush"];
    case "calm":
      return ["sage", "seafoam", "mist"];
    case "sadness":
      return ["powder", "dusk", "mist"];
    case "anxiety":
      return ["periwinkle", "lavender", "dusk"];
    case "frustration":
      return ["coral", "rose", "peach"];
    case "mixed":
      return ["neutral", "mist", "powder"];
    case "open":
      return ["neutral", "mist", "blush"];
  }
}
function defaultPaletteForTone(tone) {
  return palettesForTone(tone)[0] ?? NEUTRAL_PALETTE;
}
function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed2) {
  let a = seed2 >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round((n >> 16 & 255) * f);
  const g = Math.round((n >> 8 & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}
function generateComposition(seed2, palette, variant, W, H) {
  const paletteDef = PALETTES[palette] ?? PALETTES.mist;
  const colors = paletteDef.colors;
  const rand = mulberry32((seed2 ^ Math.imul(variant, 2654435769)) >>> 0);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const minWH = Math.min(W, H);
  const margin = minWH * 0.14;
  const paper = [];
  const speckleCount = Math.floor(W * H / 900);
  for (let i = 0; i < speckleCount; i++) {
    const alpha = 0.05 + rand() * 0.08;
    const s = 1 + rand() * 1.6;
    const x = rand() * W;
    const y = rand() * H;
    paper.push({ x, y, alpha, s });
  }
  const quietQuadrant = Math.floor(rand() * 4);
  const inQuiet = (x, y) => {
    const left = x < W / 2;
    const top = y < H / 2;
    const q = top ? left ? 0 : 1 : left ? 2 : 3;
    return q === quietQuadrant;
  };
  const bloomCenter = () => {
    for (let tries = 0; tries < 6; tries++) {
      const x = margin + rand() * (W - margin * 2);
      const y = margin + rand() * (H - margin * 2);
      if (!inQuiet(x, y)) return { x, y };
    }
    return { x: margin + rand() * (W - margin * 2), y: margin + rand() * (H - margin * 2) };
  };
  const blooms = [];
  const bloomCount = 5 + Math.floor(rand() * 5);
  for (let b = 0; b < bloomCount; b++) {
    const { x, y } = bloomCenter();
    const baseR = minWH * (0.09 + rand() * 0.13);
    const color = pick(colors);
    const layerCount = 8 + Math.floor(rand() * 7);
    const layers = [];
    for (let l = 0; l < layerCount; l++) {
      const t = l / layerCount;
      const r = baseR * (0.35 + t * 0.85);
      const alpha = 0.16 * (1 - t * 0.75) + 0.03;
      const fill = l % 3 === 2 ? shade(color, 0.96) : color;
      const ocx = x + (rand() - 0.5) * baseR * 0.16;
      const ocy = y + (rand() - 0.5) * baseR * 0.16;
      const pts = [];
      const points = 9;
      for (let i = 0; i < points; i++) {
        const angle = i / points * Math.PI * 2;
        const jitter = 0.72 + rand() * 0.56;
        pts.push({ x: ocx + Math.cos(angle) * r * jitter, y: ocy + Math.sin(angle) * r * jitter });
      }
      layers.push({ pts, alpha, fill });
    }
    blooms.push({ cx: x, cy: y, r: baseR, color, layers });
  }
  const granules = [];
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
  const washes = [];
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
function traceBlob(ctx, pts) {
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
function paintCompositionBase(ctx, comp, W, H) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#faf6ee";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e7dcc9";
  for (const s of comp.paper) {
    ctx.globalAlpha = s.alpha;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}
function paintBloomLayers(ctx, bloom, from, to, alphaScale = 1) {
  ctx.globalCompositeOperation = "multiply";
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
function paintCompositionBloom(ctx, comp, index) {
  const bloom = comp.blooms[index];
  if (!bloom) return;
  paintBloomLayers(ctx, bloom, 0, bloom.layers.length);
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth01(v) {
  const p = clamp01(v);
  return p * p * (3 - 2 * p);
}
function centroid(pts) {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}
function paintBloomGrowth(ctx, bloom, progress) {
  ctx.globalCompositeOperation = "multiply";
  const p = smooth01(progress);
  const L = bloom.layers.length;
  const LEAD = 0.35;
  for (let l = 0; l < L; l++) {
    const layer = bloom.layers[l];
    const q = smooth01((p - l / L * LEAD) / (1 - LEAD));
    if (q <= 0) continue;
    ctx.globalAlpha = q >= 1 ? layer.alpha : layer.alpha * clamp01(q * 2.2);
    ctx.fillStyle = layer.fill;
    if (q >= 1) {
      traceBlob(ctx, layer.pts);
      ctx.fill();
      continue;
    }
    const c = centroid(layer.pts);
    const scale = 0.06 + 0.94 * q;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(scale, scale);
    ctx.translate(-c.x, -c.y);
    traceBlob(ctx, layer.pts);
    ctx.fill();
    ctx.restore();
  }
  const outer = bloom.layers[L - 1];
  const outerQ = smooth01((p - (L - 1) / L * LEAD) / (1 - LEAD));
  if (outerQ > 0 && outerQ < 1) {
    const haloAlpha = 0.05 * (1 - outerQ);
    if (haloAlpha > 5e-4) {
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
function paintCompositionFinish(ctx, comp, W, H, alphaScale = 1) {
  ctx.globalCompositeOperation = "multiply";
  for (const g of comp.granules) {
    ctx.globalAlpha = g.alpha * alphaScale;
    ctx.fillStyle = g.fill;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
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
    Math.max(W, H) * 0.72
  );
  vignette.addColorStop(0, "rgba(247,241,232,0)");
  vignette.addColorStop(1, "rgba(231,220,201,0.35)");
  ctx.globalAlpha = alphaScale;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
function renderWatercolor(canvas, opts) {
  const ctx = canvas.getContext("2d");
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

// src/config.ts
var APP_NAME = "Daydrop";
var TONE_ORDER = ["joy", "calm", "sadness", "anxiety", "frustration", "mixed", "open"];
var TONE_LABELS = {
  joy: "Joyful",
  calm: "Calm",
  sadness: "Low",
  anxiety: "Anxious",
  frustration: "Frustrated",
  mixed: "Mixed feelings",
  open: "Left open"
};
var TONE_COLORS = {
  joy: "#e8a2b8",
  calm: "#a9c6a4",
  sadness: "#93a8c8",
  anxiety: "#7e93ad",
  // muted slate blue — never bright
  frustration: "#e0a58c",
  mixed: "#a7b8cc",
  // powder blue-grey
  open: "#cfc6b8"
};

// src/theme/themes.ts
var DEFAULT_THEME = "daybreak";
var REQUIRED_THEME_VARS = [
  "paper",
  "paper-2",
  "ink",
  "ink-soft",
  "line",
  "accent",
  "accent-deep",
  "on-accent",
  "ink-inverse",
  "veil-text",
  "banner",
  "cell-empty",
  "danger",
  "danger-deep",
  "rose",
  "blush",
  "lavender",
  "powder",
  "peach",
  "sage"
];
var daybreak = {
  key: "daybreak",
  name: "Daybreak",
  tagline: "The classic warm ivory journal",
  vars: {
    paper: "#faf6ee",
    "paper-2": "#fffdf8",
    ink: "#3e3548",
    "ink-soft": "#66707f",
    line: "#e7dcc9",
    accent: "#5e7ba0",
    "accent-deep": "#6d4f80",
    "on-accent": "#fffdf8",
    "ink-inverse": "#fffdf8",
    "veil-text": "#fffdf8",
    banner: "#f6ead2",
    "cell-empty": "#ece5d5",
    danger: "#b3564d",
    "danger-deep": "#9c4a43",
    rose: "#e8a2b8",
    blush: "#f7dee4",
    lavender: "#7e93ad",
    powder: "#9db9d9",
    peach: "#f0c49c",
    sage: "#a9c6a4"
  },
  preview: ["#e8a2b8", "#a9c6a4", "#9db9d9"]
};
var THEMES = {
  daybreak,
  "ocean-mist": {
    key: "ocean-mist",
    name: "Ocean Mist",
    tagline: "Powder blue, misty teal, cloud white",
    vars: {
      paper: "#f1f6f9",
      "paper-2": "#ffffff",
      ink: "#1f3440",
      "ink-soft": "#546e7e",
      line: "#d2e2ea",
      accent: "#2a6f88",
      "accent-deep": "#1f5a70",
      "on-accent": "#ffffff",
      "ink-inverse": "#ffffff",
      "veil-text": "#fffdf8",
      banner: "#dcebf1",
      "cell-empty": "#e1ebef",
      danger: "#b3564d",
      "danger-deep": "#9c4a43",
      rose: "#d9a7b8",
      blush: "#f0dce4",
      lavender: "#8fa3c8",
      powder: "#9db9d9",
      peach: "#eec9a8",
      sage: "#a9c6a4"
    },
    preview: ["#9db9d9", "#6fa8a5", "#d7e6ec"]
  },
  "secret-garden": {
    key: "secret-garden",
    name: "Secret Garden",
    tagline: "Sage, moss, warm cream",
    vars: {
      paper: "#f5f2e6",
      "paper-2": "#fffdf5",
      ink: "#2c3a26",
      "ink-soft": "#5b6951",
      line: "#dbd3b8",
      accent: "#476b38",
      "accent-deep": "#36552b",
      "on-accent": "#ffffff",
      "ink-inverse": "#ffffff",
      "veil-text": "#fffdf8",
      banner: "#e8e3ca",
      "cell-empty": "#e9e3cd",
      danger: "#b3564d",
      "danger-deep": "#9c4a43",
      rose: "#d9a7a0",
      blush: "#f2e2d2",
      lavender: "#8b9a7e",
      powder: "#a8bfa0",
      peach: "#e8c49a",
      sage: "#a9c6a4"
    },
    preview: ["#a9c6a4", "#7d8f69", "#e6dfc4"]
  },
  "lavender-dream": {
    key: "lavender-dream",
    name: "Lavender Dream",
    tagline: "Lavender, periwinkle, pale lilac",
    vars: {
      paper: "#f4f1fa",
      "paper-2": "#ffffff",
      ink: "#352e4e",
      "ink-soft": "#655c85",
      line: "#dbd3ed",
      accent: "#5a4fa8",
      "accent-deep": "#463d86",
      "on-accent": "#ffffff",
      "ink-inverse": "#ffffff",
      "veil-text": "#fffdf8",
      banner: "#e3dbf2",
      "cell-empty": "#e5dff1",
      danger: "#b3564d",
      "danger-deep": "#9c4a43",
      rose: "#c99ab8",
      blush: "#e8d8ec",
      lavender: "#a893d4",
      powder: "#9d8fd0",
      peach: "#e5c2d4",
      sage: "#a9bfa8"
    },
    preview: ["#b9a8d9", "#8f97c4", "#e6dcf4"]
  },
  "peach-sunrise": {
    key: "peach-sunrise",
    name: "Peach Sunrise",
    tagline: "Peach, blush, warm honey",
    vars: {
      paper: "#fdf4ea",
      "paper-2": "#fffdf8",
      ink: "#4a3220",
      "ink-soft": "#81654b",
      line: "#edd9c2",
      accent: "#a05e1d",
      "accent-deep": "#7f4c15",
      "on-accent": "#ffffff",
      "ink-inverse": "#ffffff",
      "veil-text": "#fffdf8",
      banner: "#f6e6cf",
      "cell-empty": "#f1e4cf",
      danger: "#b3564d",
      "danger-deep": "#9c4a43",
      rose: "#e5a08e",
      blush: "#f7ddd0",
      lavender: "#c49a7e",
      powder: "#d4af8a",
      peach: "#f0c49c",
      sage: "#b3bf9a"
    },
    preview: ["#f0c49c", "#e8a2a2", "#eec25e"]
  },
  rosewater: {
    key: "rosewater",
    name: "Rosewater",
    tagline: "Dusty rose, mauve, ivory",
    vars: {
      paper: "#faf1ee",
      "paper-2": "#fffdfb",
      ink: "#472e35",
      "ink-soft": "#7c5e65",
      line: "#e6d0cf",
      accent: "#93465a",
      "accent-deep": "#763848",
      "on-accent": "#ffffff",
      "ink-inverse": "#ffffff",
      "veil-text": "#fffdf8",
      banner: "#f2dcd8",
      "cell-empty": "#eedfd9",
      danger: "#b3564d",
      "danger-deep": "#9c4a43",
      rose: "#d99aa8",
      blush: "#f2d9d6",
      lavender: "#b08a96",
      powder: "#c49aa4",
      peach: "#e8bfae",
      sage: "#b3ab9c"
    },
    preview: ["#d99aa8", "#b57e8c", "#f4e6de"]
  },
  moonlight: {
    key: "moonlight",
    name: "Moonlight",
    tagline: "Indigo night, misty blue, soft silver",
    vars: {
      paper: "#20263a",
      "paper-2": "#2a3250",
      ink: "#e9edf7",
      "ink-soft": "#a9b4d0",
      line: "#3a4468",
      accent: "#93a8dd",
      "accent-deep": "#7b90c9",
      "on-accent": "#1b2133",
      "ink-inverse": "#1b2133",
      "veil-text": "#fffdf8",
      banner: "#2c3554",
      "cell-empty": "#2e3656",
      danger: "#d98a80",
      "danger-deep": "#b3564d",
      rose: "#8e6f8e",
      blush: "#4a4468",
      lavender: "#6f7fae",
      powder: "#7d90c2",
      peach: "#8e7f72",
      sage: "#6f8a7d"
    },
    preview: ["#5a6b9e", "#8fa3d9", "#ccd5ea"]
  }
};
var THEME_KEYS = [
  "daybreak",
  "ocean-mist",
  "secret-garden",
  "lavender-dream",
  "peach-sunrise",
  "rosewater",
  "moonlight"
];
function coerceThemeKey(key) {
  return key && key in THEMES ? key : DEFAULT_THEME;
}
function applyTheme(key) {
  if (typeof document === "undefined") return;
  if (key === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", key);
  }
}

// src/prefs.ts
var JOURNAL_NAME_KEY = "journalName";
var DEFAULT_JOURNAL_NAME = "My Journal";
var MAX_JOURNAL_NAME = 20;
function coerceJournalName(value) {
  const trimmed = (value ?? "").trim().slice(0, MAX_JOURNAL_NAME);
  return trimmed.length > 0 ? trimmed : DEFAULT_JOURNAL_NAME;
}

// src/utils/date.ts
var DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateKey(key) {
  if (!DATE_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayKey() {
  return localDateKey(/* @__PURE__ */ new Date());
}
function parseDateKey(key) {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid date key: ${key}`);
  }
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDaysKey(key, n) {
  const dt = parseDateKey(key);
  dt.setDate(dt.getDate() + n);
  return localDateKey(dt);
}
function yearOfKey(key) {
  return parseDateKey(key).getFullYear();
}
function formatLong(key) {
  const dt = parseDateKey(key);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// src/share/card.ts
var DAY_TAGLINE = "A little moment from my day.";
var MOOD_SQUARES = {
  joy: "\u{1F7E8}",
  calm: "\u{1F7E9}",
  sadness: "\u{1F7E6}",
  anxiety: "\u{1F7EA}",
  frustration: "\u{1F7E7}",
  mixed: "\u{1F7EB}",
  open: "\u2B1C"
};
var BLOOM_CARD_W = 1080;
var BLOOM_CARD_H = 1350;
var YEAR_CARD_W = 1600;
var YEAR_CARD_H = 2e3;
function coercePalette(palette) {
  return Object.prototype.hasOwnProperty.call(PALETTES, palette) ? palette : NEUTRAL_PALETTE;
}
function cardTheme() {
  const read = (name, fallback) => {
    if (typeof document === "undefined") return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    paper: read("--paper", "#faf6ee"),
    paper2: read("--paper-2", "#fffdf8"),
    ink: read("--ink", "#3e3548"),
    inkSoft: read("--ink-soft", "#66707f"),
    line: read("--line", "#e7dcc9"),
    accent: read("--accent", "#5e7ba0")
  };
}
function formatShortDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}
function formatLongDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
function centerText(ctx, text, cx, y, font, fill) {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, cx, y);
}
function fitFont(ctx, text, basePx, family, maxWidth) {
  let px = basePx;
  const style = (p) => `${p}px ${family}`;
  ctx.font = style(px);
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = style(px);
  }
  return style(px);
}
var SERIF = "Georgia, 'Times New Roman', serif";
var SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
function drawBloomCard(ctx, W, H, opts, makeCanvas) {
  const t = opts.theme ?? cardTheme();
  const tagline = opts.tagline ?? DAY_TAGLINE;
  const cx = W / 2;
  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  centerText(
    ctx,
    opts.journalName.toUpperCase(),
    cx,
    118,
    fitFont(ctx, opts.journalName.toUpperCase(), 34, SANS, W - 200),
    t.inkSoft
  );
  const artSize = 880;
  const artX = Math.round((W - artSize) / 2);
  const artY = 165;
  const art = makeCanvas(artSize, artSize);
  renderWatercolor(art, {
    seed: opts.seed,
    palette: coercePalette(opts.palette),
    variant: opts.variant
  });
  ctx.drawImage(art, artX, artY);
  centerText(ctx, formatLongDate(opts.dateKey), cx, artY + artSize + 78, `46px ${SERIF}`, t.ink);
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
    ctx.textAlign = "left";
    ctx.fillText(label, startX + dotR * 2 + gap, y);
    y += 62;
  }
  centerText(ctx, tagline, cx, y + 8, `italic 30px ${SERIF}`, t.inkSoft);
  centerText(ctx, `Made with ${APP_NAME}`, cx, H - 62, `22px ${SANS}`, t.inkSoft);
}
function buildYearKeys(year) {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const startDow = parseDateKey(jan1).getDay();
  const endDow = parseDateKey(dec31).getDay();
  let key = addDaysKey(jan1, -startDow);
  const endKey = addDaysKey(dec31, 6 - endDow);
  const keys = [];
  for (; ; ) {
    keys.push(key);
    if (key === endKey) break;
    key = addDaysKey(key, 1);
  }
  return keys;
}
function buildYearGridData(year, tones) {
  const keys = buildYearKeys(year);
  const weeks = [];
  let recorded = 0;
  const monthCounts = {};
  for (let i = 0; i < keys.length; i += 7) {
    const wk = [];
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
  const monthDominant = [];
  for (let m = 0; m < 12; m++) {
    const counts = monthCounts[m];
    if (!counts) {
      monthDominant.push(null);
      continue;
    }
    let best = null;
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
function drawYearCard(ctx, W, H, opts) {
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
  ctx.font = `24px ${SANS}`;
  ctx.fillStyle = t.inkSoft;
  ctx.textAlign = "left";
  let prevMonth = -1;
  grid.weeks.forEach((wk, wi) => {
    const sat = parseDateKey(wk[6].dateKey);
    const m = sat.getMonth();
    const satYear = sat.getFullYear();
    if (satYear === year && m !== prevMonth) {
      const name = sat.toLocaleDateString("en-US", { month: "short" });
      ctx.fillText(name, marginX + wi * colW, gridTop - 14);
    }
    if (satYear === year) prevMonth = m;
  });
  const emptyFill = t.paper2 === t.paper ? "#e9e1cf" : t.line;
  grid.weeks.forEach((wk, wi) => {
    wk.forEach((day, di) => {
      const x = marginX + wi * colW;
      const y = gridTop + di * rowH;
      if (!day.inYear) {
        return;
      }
      ctx.fillStyle = day.tone ? TONE_COLORS[day.tone] : emptyFill;
      ctx.fillRect(x, y, cell, cell);
    });
  });
  const gridBottom = gridTop + 7 * rowH;
  const countLabel = grid.recorded === 0 ? `No entries yet in ${year}` : `${grid.recorded} day${grid.recorded === 1 ? "" : "s"} recorded`;
  centerText(ctx, countLabel, cx, gridBottom + 78, `36px ${SERIF}`, t.ink);
  const legendY = gridBottom + 140;
  ctx.font = `26px ${SANS}`;
  const items = TONE_ORDER.map((k) => ({ k, label: TONE_LABELS[k] }));
  const rows = [items.slice(0, 4), items.slice(4)];
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
      ctx.textAlign = "left";
      ctx.fillText(it.label, x + 32, y);
      x += widths[ii];
    });
  });
  centerText(ctx, `Made with ${APP_NAME}`, cx, H - 60, `22px ${SANS}`, t.inkSoft);
}
function formatDayShare(opts) {
  const lines = [
    `${APP_NAME} \xB7 ${formatShortDate(opts.dateKey)}`,
    `${opts.isToday ? "Today's" : "This"} bloom: ${TONE_LABELS[opts.mood]}`,
    MOOD_SQUARES[opts.mood],
    opts.tagline ?? DAY_TAGLINE
  ];
  return lines.join("\n");
}
function formatYearShare(opts) {
  const squares = opts.monthDominant.map((m) => m ? MOOD_SQUARES[m] : "\u2B1C").join("");
  const dayWord = opts.recorded === 1 ? "day" : "days";
  return [
    `${APP_NAME} \xB7 ${opts.year} in Color`,
    `${opts.recorded} ${dayWord} recorded`,
    "J F M A M J J A S O N D",
    squares
  ].join("\n");
}

// src/emotion/analyze.ts
var ANALYSIS_NOTE = "A possible interpretation \u2014 change it if it doesn't feel right.";
var JOY = [
  "joy",
  "joyful",
  "happy",
  "happiness",
  "glad",
  "delighted",
  "excited",
  "excitement",
  "love",
  "loved",
  "lovely",
  "wonderful",
  "amazing",
  "great",
  "awesome",
  "fantastic",
  "fun",
  "laugh",
  "laughed",
  "laughing",
  "smile",
  "smiled",
  "grateful",
  "thankful",
  "proud",
  "celebrat",
  "party",
  "win",
  "won",
  "beautiful",
  "sunny",
  "bright"
];
var CALM = [
  "calm",
  "peaceful",
  "peace",
  "relaxed",
  "relax",
  "restful",
  "rest",
  "quiet",
  "serene",
  "gentle",
  "soft",
  "slow",
  "unhurried",
  "content",
  "ease",
  "easy",
  "balanced",
  "grounded",
  "mindful",
  "breathe",
  "breathing",
  "nap",
  "sleepy",
  "cozy",
  "warm",
  "steady",
  "still",
  "meditat"
];
var SADNESS = [
  "sad",
  "sadness",
  "cry",
  "cried",
  "crying",
  "tears",
  "lonely",
  "alone",
  "miss",
  "missed",
  "missing",
  "grief",
  "grieving",
  "loss",
  "lost",
  "empty",
  "down",
  "blue",
  "heavy",
  "heartbreak",
  "hurt",
  "painful",
  "sorrow",
  "melancholy",
  "disappointed",
  "hopeless",
  "tired",
  "weary",
  "exhausted"
];
var ANXIETY = [
  "anxious",
  "anxiety",
  "worry",
  "worried",
  "worrying",
  "nervous",
  "stress",
  "stressed",
  "stressful",
  "panic",
  "panicked",
  "fear",
  "afraid",
  "scared",
  "overwhelm",
  "overwhelmed",
  "overwhelming",
  "tense",
  "restless",
  "uneasy",
  "dread",
  "doubt",
  "uncertain",
  "uncertainty",
  "insomnia",
  "racing"
];
var FRUSTRATION = [
  "frustrat",
  "annoyed",
  "annoying",
  "irritat",
  "angry",
  "anger",
  "mad",
  "furious",
  "rage",
  "upset",
  "bothered",
  "unfair",
  "stuck",
  "argued",
  "argument",
  "fight",
  "blamed",
  "hate",
  "hated",
  "ugh",
  "ridiculous",
  "waste",
  "blocked",
  "delay",
  "late",
  "broke",
  "broken",
  "fail",
  "failed"
];
var BIGRAMS = {
  "burned out": "sadness",
  "burnt out": "sadness",
  "good day": "joy",
  "great day": "joy",
  "bad day": "sadness",
  "rough day": "frustration",
  "long day": "frustration",
  "stressed out": "anxiety",
  "fed up": "frustration",
  "pissed off": "frustration",
  "calm down": "calm",
  "deeply grateful": "joy",
  "so proud": "joy",
  "cheer up": "joy",
  "fell apart": "sadness",
  "could not sleep": "anxiety",
  "couldn't sleep": "anxiety",
  "peace of mind": "calm",
  "at ease": "calm"
};
var SCORED_TONES = ["joy", "calm", "sadness", "anxiety", "frustration"];
var WORDLISTS = {
  joy: JOY,
  calm: CALM,
  sadness: SADNESS,
  anxiety: ANXIETY,
  frustration: FRUSTRATION
};
var BIGRAM_WEIGHT = 3;
var WORD_WEIGHT = 1;
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z' ]/g, " ");
}
function analyzeTone(text) {
  const normalized = normalize(text);
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const totalWords = Math.max(tokens.length, 1);
  const scores = {
    joy: 0,
    calm: 0,
    sadness: 0,
    anxiety: 0,
    frustration: 0
  };
  for (const token of tokens) {
    for (const tone of SCORED_TONES) {
      for (const word of WORDLISTS[tone]) {
        if (token === word || word.length > 4 && token.startsWith(word)) {
          scores[tone] += WORD_WEIGHT;
          break;
        }
      }
    }
  }
  for (const [phrase, tone] of Object.entries(BIGRAMS)) {
    if (normalized.includes(phrase)) {
      scores[tone] += BIGRAM_WEIGHT;
    }
  }
  const ranked = SCORED_TONES.map((tone) => ({
    tone,
    score: Math.min(1, scores[tone] / totalWords)
  })).filter((t) => t.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (ranked.length === 0) {
    return {
      tones: [{ tone: "mixed", score: 0.2 }],
      method: "lexicon",
      confidence: "low",
      note: ANALYSIS_NOTE
    };
  }
  const top = ranked[0].score;
  const confidence = top >= 0.5 ? "high" : top >= 0.25 ? "medium" : "low";
  return { tones: ranked, method: "lexicon", confidence, note: ANALYSIS_NOTE };
}

// node_modules/idb/build/index.js
var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBIndex,
    IDBObjectStore,
    IDBCursor,
    IDBDatabase,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = ["advance", "continue", "continuePrimaryKey"].map((method) => IDBCursor.prototype[method]));
}
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(this.request);
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (!Object.is(newValue, value)) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = {};
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods[prop])
    return cachedMethods[prop];
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  return cachedMethods[prop] = method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
var advanceMethodProps = ["advance", "continue", "continuePrimaryKey"];
var methodMap = {};
var advanceResults = /* @__PURE__ */ new WeakMap();
var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
var cursorIteratorTraps = {
  get(target, prop) {
    if (!advanceMethodProps.includes(prop))
      return target[prop];
    let cachedFunc = methodMap[prop];
    if (!cachedFunc) {
      cachedFunc = methodMap[prop] = function(...args) {
        advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
      };
    }
    return cachedFunc;
  }
};
async function* iterate(...args) {
  let cursor = this;
  if (!(cursor instanceof IDBCursor)) {
    cursor = await cursor.openCursor(...args);
  }
  if (!cursor)
    return;
  cursor = cursor;
  const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
  ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
  reverseTransformCache.set(proxiedCursor, unwrap(cursor));
  while (cursor) {
    yield proxiedCursor;
    cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
    advanceResults.delete(proxiedCursor);
  }
}
function isIteratorProp(target, prop) {
  return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get(target, prop, receiver) {
    if (isIteratorProp(target, prop))
      return iterate;
    return oldTraps.get(target, prop, receiver);
  },
  has(target, prop) {
    return isIteratorProp(target, prop) || oldTraps.has(target, prop);
  }
}));

// src/db/store.ts
var DB_NAME = "daydrop-db";
var DB_VERSION = 2;
var STORE = "entries";
var META = "meta";
var storageState = "ok";
var dbPromise = null;
var memoryStore = /* @__PURE__ */ new Map();
var memoryMeta = /* @__PURE__ */ new Map();
function getStorageState() {
  return storageState;
}
function isIndexedDBUsable() {
  return typeof indexedDB !== "undefined";
}
function useMemoryFallback() {
  storageState = "memory";
  dbPromise = null;
}
async function getDb() {
  if (storageState === "memory") return null;
  if (!isIndexedDBUsable()) {
    useMemoryFallback();
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db2) {
        if (!db2.objectStoreNames.contains(STORE)) {
          const store = db2.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("by-date", "dateKey", { unique: false });
        }
        if (!db2.objectStoreNames.contains(META)) {
          db2.createObjectStore(META, { keyPath: "key" });
        }
      }
    }).catch(() => {
      useMemoryFallback();
      return null;
    });
  }
  const db = await dbPromise;
  if (!db) {
    useMemoryFallback();
    return null;
  }
  return db;
}
function validateEntry(entry) {
  if (!entry.id || typeof entry.id !== "string") {
    throw new Error("Entry must have a non-empty id");
  }
  if (!isValidDateKey(entry.dateKey)) {
    throw new Error(`Invalid dateKey: ${entry.dateKey}`);
  }
}
async function getEntry(dateKey) {
  const db = await getDb();
  if (!db) {
    for (const entry of memoryStore.values()) {
      if (entry.dateKey === dateKey) return entry;
    }
    return null;
  }
  const found = await db.getAllFromIndex(STORE, "by-date", dateKey);
  return found[0] ?? null;
}
async function saveEntry(entry) {
  validateEntry(entry);
  const db = await getDb();
  if (!db) {
    memoryStore.set(entry.id, entry);
    return;
  }
  await db.put(STORE, entry);
}
async function deleteEntry(dateKey) {
  const db = await getDb();
  if (!db) {
    for (const [id, entry] of memoryStore) {
      if (entry.dateKey === dateKey) memoryStore.delete(id);
    }
    return;
  }
  const existing = await getEntry(dateKey);
  if (existing) {
    await db.delete(STORE, existing.id);
  }
}
async function listEntries() {
  const db = await getDb();
  if (!db) {
    return [...memoryStore.values()].sort((a, b) => a.dateKey < b.dateKey ? 1 : -1);
  }
  const all = await db.getAllFromIndex(STORE, "by-date");
  return all.reverse();
}
async function entryCount() {
  const db = await getDb();
  if (!db) return memoryStore.size;
  return db.count(STORE);
}
async function deleteAllData() {
  const db = await getDb();
  if (!db) {
    memoryStore.clear();
    return;
  }
  await db.clear(STORE);
}
async function getPreference(key, fallback) {
  const db = await getDb();
  if (!db) {
    return memoryMeta.has(key) ? memoryMeta.get(key) : fallback;
  }
  const row = await db.get(META, key);
  return row ? row.value : fallback;
}
async function setPreference(key, value) {
  const db = await getDb();
  if (!db) {
    memoryMeta.set(key, value);
    return;
  }
  await db.put(META, { key, value });
}

// .smoke/test.ts
var failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` \u2014 ${detail}` : ""}`);
  }
}
check("seedFromString empty string = FNV-1a offset basis", seedFromString("") === 2166136261);
check("seedFromString deterministic", seedFromString("hello daydrop") === seedFromString("hello daydrop"));
check("seedFromString differs per input", seedFromString("a") !== seedFromString("b"));
check("seedFromString is uint32", Number.isInteger(seedFromString("x")) && seedFromString("x") >= 0 && seedFromString("x") <= 4294967295);
function renderToDataURL(seed2, variant) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  renderWatercolor(canvas, { seed: seed2, palette: "rose", variant });
  return canvas.toDataURL();
}
var seed = seedFromString("determinism check");
var url1 = renderToDataURL(seed, 3);
var url2 = renderToDataURL(seed, 3);
var url3 = renderToDataURL(seed, 4);
check("renderWatercolor same inputs \u2192 same dataURL", url1 === url2);
check("renderWatercolor different variant \u2192 different pixels", url1 !== url3);
check("renderWatercolor dataURL non-trivial length", url1.length > 5e3, `len=${url1.length}`);
var neutralCanvas = (0, import_canvas.createCanvas)(160, 160);
renderWatercolor(neutralCanvas, {
  seed,
  palette: NEUTRAL_PALETTE,
  variant: 0
});
check("renderWatercolor neutral palette renders", neutralCanvas.toDataURL().length > 1e3);
var oddCanvas = (0, import_canvas.createCanvas)(160, 160);
renderWatercolor(oddCanvas, {
  seed,
  palette: "nope",
  variant: 0
});
check("renderWatercolor unknown palette falls back gracefully", oddCanvas.toDataURL().length > 1e3);
function renderProgressive(palette, variant) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  comp.blooms.forEach((bloom, i) => {
    for (let from = 0; from < bloom.layers.length; from += 3) {
      paintBloomLayers(ctx, bloom, from, from + 3);
    }
    void i;
  });
  paintCompositionFinish(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
function renderOnePass(palette, variant) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  renderWatercolor(canvas, { seed, palette, variant });
  return canvas.toDataURL();
}
check("progressive paint \u2261 one-pass (rose v3)", renderProgressive("rose", 3) === renderOnePass("rose", 3));
check("progressive paint \u2261 one-pass (sage v1)", renderProgressive("sage", 1) === renderOnePass("sage", 1));
check(
  "generateComposition bloom count in range",
  (() => {
    const comp = generateComposition(seed, "rose", 0, 320, 240);
    return comp.blooms.length >= 5 && comp.blooms.length <= 9 && comp.blooms.every((b) => b.layers.length >= 8);
  })()
);
function renderGrowthFinal(palette, variant) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  for (const bloom of comp.blooms) paintBloomGrowth(ctx, bloom, 1);
  paintCompositionFinish(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
check("growth p=1 \u2261 one-pass (rose v3)", renderGrowthFinal("rose", 3) === renderOnePass("rose", 3));
check("growth p=1 \u2261 one-pass (lavender v0)", renderGrowthFinal("lavender", 0) === renderOnePass("lavender", 0));
check("growth p=1 \u2261 one-pass (neutral v2)", renderGrowthFinal("neutral", 2) === renderOnePass("neutral", 2));
function renderGrowthAt(palette, variant, progress) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, palette, variant, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  for (const bloom of comp.blooms) paintBloomGrowth(ctx, bloom, progress);
  return canvas.toDataURL();
}
check(
  "growth deterministic at p=0.45",
  renderGrowthAt("rose", 3, 0.45) === renderGrowthAt("rose", 3, 0.45)
);
function renderBaseOnly() {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, "rose", 3, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
var baseUrl = renderBaseOnly();
var growthZero = renderGrowthAt("rose", 3, 0);
var growthEarly = renderGrowthAt("rose", 3, 0.15);
var growthFinal = renderGrowthAt("rose", 3, 1);
check("growth p=0 paints nothing (\u2261 blank base)", growthZero === baseUrl);
check("growth p=0.15 marks the paper (tiny faint pool)", growthEarly !== baseUrl);
check("growth p=0.15 differs from grown final", growthEarly !== growthFinal);
check("growth p=1 without finish \u2261 grown final", growthFinal === renderGrowthAt("rose", 3, 1));
function renderFinishScaled(alphaScale) {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, "sage", 1, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  paintCompositionFinish(ctx, comp, 320, 240, alphaScale);
  return canvas.toDataURL();
}
function renderFinishDefault() {
  const canvas = (0, import_canvas.createCanvas)(320, 240);
  const ctx = canvas.getContext("2d");
  const comp = generateComposition(seed, "sage", 1, 320, 240);
  paintCompositionBase(ctx, comp, 320, 240);
  paintCompositionFinish(ctx, comp, 320, 240);
  return canvas.toDataURL();
}
check("finish alphaScale=1 \u2261 default finish", renderFinishScaled(1) === renderFinishDefault());
check("finish alphaScale=0.5 differs from full finish", renderFinishScaled(0.5) !== renderFinishDefault());
var joy = analyzeTone("I had a wonderful day full of laughter and joy with friends");
check("analyzeTone joy sentence \u2192 joy top", joy.tones[0].tone === "joy", JSON.stringify(joy.tones));
check("analyzeTone joy sentence confidence medium", joy.confidence === "medium");
var veryJoy = analyzeTone("happy joyful wonderful amazing beautiful delightful");
check("analyzeTone concentrated joy \u2192 high confidence", veryJoy.tones[0].tone === "joy" && veryJoy.confidence === "high", JSON.stringify(veryJoy));
var anx = analyzeTone("I feel so anxious and overwhelmed about everything right now");
check("analyzeTone anxiety sentence \u2192 anxiety top", anx.tones[0].tone === "anxiety", JSON.stringify(anx.tones));
var flat = analyzeTone("The meeting was okay, nothing special happened today at all");
check("analyzeTone flat sentence \u2192 mixed fallback", flat.tones[0].tone === "mixed" && flat.confidence === "low", JSON.stringify(flat));
check("analyzeTone note is the suggestion copy", joy.note === ANALYSIS_NOTE);
check("analyzeTone method is lexicon", joy.method === "lexicon");
var bigram = analyzeTone("I am completely burned out after this long day");
check('analyzeTone bigram "burned out" scores sadness', bigram.tones[0].tone === "sadness", JSON.stringify(bigram.tones));
check("localDateKey leap day", localDateKey(new Date(2024, 1, 29)) === "2024-02-29");
check("todayKey format", /^\d{4}-\d{2}-\d{2}$/.test(todayKey()));
check("addDaysKey leap day forward", addDaysKey("2024-02-28", 1) === "2024-02-29");
check("addDaysKey leap day \u2192 Mar 1", addDaysKey("2024-02-29", 1) === "2024-03-01");
check("addDaysKey year boundary", addDaysKey("2024-12-31", 1) === "2025-01-01");
check("addDaysKey negative across year", addDaysKey("2024-01-01", -1) === "2023-12-31");
check("isValidDateKey rejects 2023-02-29", !isValidDateKey("2023-02-29"));
check("isValidDateKey rejects 2024-02-30", !isValidDateKey("2024-02-30"));
check("isValidDateKey accepts 2024-02-29", isValidDateKey("2024-02-29"));
var threw = false;
try {
  parseDateKey("2023-02-29");
} catch {
  threw = true;
}
check("parseDateKey throws on non-leap Feb 29", threw);
check("parseDateKey local midnight", (() => {
  const d = parseDateKey("2026-10-16");
  return d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 16 && d.getHours() === 0;
})());
check("formatLong", formatLong("2026-10-16") === "Friday, October 16, 2026", formatLong("2026-10-16"));
check("yearOfKey", yearOfKey("2024-02-29") === 2024);
async function storeChecks() {
  check("isIndexedDBUsable false in node", !isIndexedDBUsable());
  await saveEntry({
    id: "e1",
    dateKey: "2026-10-16",
    text: "smoke test entry",
    suggestedTones: [{ tone: "joy", score: 0.8 }],
    analysisMethod: "lexicon",
    userTone: null,
    artSeed: 123,
    artPalette: "rose",
    artVariant: 0,
    soundscape: "soft-pad",
    createdAt: 1,
    updatedAt: 2
  });
  check("memory fallback engaged", getStorageState() === "memory");
  const got = await getEntry("2026-10-16");
  check("save/get roundtrip", got !== null && got.text === "smoke test entry" && got.artSeed === 123);
  check("entryCount 1", await entryCount() === 1);
  await saveEntry({
    id: "e2",
    dateKey: "2026-10-15",
    text: "older entry",
    suggestedTones: [],
    analysisMethod: "lexicon",
    userTone: "calm",
    artSeed: 7,
    artPalette: "sage",
    artVariant: 1,
    soundscape: "airy-drone",
    createdAt: 1,
    updatedAt: 1
  });
  const list = await listEntries();
  check("listEntries dateKey descending", list.length === 2 && list[0].dateKey === "2026-10-16" && list[1].dateKey === "2026-10-15");
  await deleteEntry("2026-10-16");
  check("deleteEntry removes", await getEntry("2026-10-16") === null);
  await deleteAllData();
  check("deleteAllData empties", await entryCount() === 0);
  let invalidThrew = false;
  try {
    await saveEntry({
      id: "bad",
      dateKey: "2023-02-29",
      text: "x",
      suggestedTones: [],
      analysisMethod: "lexicon",
      userTone: null,
      artSeed: 0,
      artPalette: "mist",
      artVariant: 0,
      soundscape: "soft-pad",
      createdAt: 0,
      updatedAt: 0
    });
  } catch {
    invalidThrew = true;
  }
  check("saveEntry rejects invalid dateKey", invalidThrew);
  check("getPreference fallback default", await getPreference("soundEnabled", true) === true);
  await setPreference("soundEnabled", false);
  check("setPreference/getPreference roundtrip", await getPreference("soundEnabled", true) === false);
  await deleteAllData();
  check("deleteAllData keeps preferences", await getPreference("soundEnabled", true) === false);
  check("theme preference default", await getPreference("theme", DEFAULT_THEME) === DEFAULT_THEME);
  await setPreference("theme", "moonlight");
  check("theme preference roundtrip", await getPreference("theme", DEFAULT_THEME) === "moonlight");
  await setPreference(JOURNAL_NAME_KEY, "Sunny Days");
  check(
    "journal name preference roundtrip",
    coerceJournalName(await getPreference(JOURNAL_NAME_KEY, null)) === "Sunny Days"
  );
}
var EXPECTED_DEFAULT = {
  joy: "honey",
  calm: "sage",
  sadness: "powder",
  anxiety: "periwinkle",
  frustration: "coral",
  mixed: "neutral",
  open: "neutral"
};
for (const tone of TONE_ORDER) {
  const list = palettesForTone(tone);
  check(`palettesForTone(${tone}) non-empty and all known`, list.length > 0 && list.every((k) => k in PALETTES));
  check(`defaultPaletteForTone(${tone}) = ${EXPECTED_DEFAULT[tone]}`, defaultPaletteForTone(tone) === EXPECTED_DEFAULT[tone]);
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function parseFill(fill) {
  const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(fill);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (/^#[0-9a-f]{6}$/i.test(fill)) return hexToRgb(fill);
  return null;
}
function fillFromPalette(fill, colors) {
  const rgb = parseFill(fill);
  if (!rgb) return false;
  return colors.some((c) => {
    const [r, g, b] = hexToRgb(c);
    const [fr, fg, fb] = rgb;
    if (fr > r || fg > g || fb > b) return false;
    const ratios = [r ? fr / r : 1, g ? fg / g : 1, b ? fb / b : 1].filter((x) => x <= 1);
    return ratios.length > 0 && ratios.every((x) => x >= 0.7);
  });
}
for (const tone of TONE_ORDER) {
  const palette = defaultPaletteForTone(tone);
  const colors = PALETTES[palette].colors;
  const comp = generateComposition(seedFromString(`palette ${tone}`), palette, 0, 320, 240);
  const fills = [];
  for (const b of comp.blooms) {
    fills.push(b.color);
    for (const l of b.layers) fills.push(l.fill);
  }
  for (const g of comp.granules) fills.push(g.fill);
  for (const w of comp.washes) fills.push(w.fill);
  const bad = fills.filter((f) => !fillFromPalette(f, colors));
  check(`artwork for mood ${tone} uses only its palette (${palette})`, bad.length === 0, bad.slice(0, 3).join(","));
}
var defaults = TONE_ORDER.map(defaultPaletteForTone);
check("distinct moods have distinct default palettes", new Set(defaults).size >= 5, defaults.join(","));
check("DEFAULT_THEME is daybreak", DEFAULT_THEME === "daybreak");
check("six named themes + daybreak", THEME_KEYS.length === 7 && THEME_KEYS[0] === "daybreak");
for (const key of THEME_KEYS) {
  const def = THEMES[key];
  check(`theme ${key} defined with name+tagline`, !!def && def.name.length > 0 && def.tagline.length > 0);
  const missing = REQUIRED_THEME_VARS.filter((v) => !(v in def.vars));
  check(`theme ${key} defines all required vars`, missing.length === 0, missing.join(","));
  const badHex = Object.entries(def.vars).filter(([, h]) => !/^#[0-9a-f]{6}$/i.test(h));
  check(`theme ${key} vars are valid hex`, badHex.length === 0, badHex.map(([v]) => v).join(","));
  check(`theme ${key} has 3 preview pigments`, def.preview.length === 3);
}
check("coerceThemeKey falls back to default", coerceThemeKey("nope") === DEFAULT_THEME);
check("coerceThemeKey keeps valid key", coerceThemeKey("moonlight") === "moonlight");
var applyThrew = false;
try {
  applyTheme("ocean-mist");
} catch {
  applyThrew = true;
}
check("applyTheme safe without document", !applyThrew);
function relLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
}
function contrast(a, b) {
  const x = relLum(a);
  const y = relLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const key of THEME_KEYS) {
  const v = THEMES[key].vars;
  const rBody = contrast(v.ink, v.paper);
  const rBody2 = contrast(v.ink, v["paper-2"]);
  const rSoft = contrast(v["ink-soft"], v.paper);
  const rBtn = contrast(v["on-accent"], v.accent);
  check(`theme ${key} body text \u2265 4.5:1`, rBody >= 4.5, rBody.toFixed(2));
  check(`theme ${key} body on surface \u2265 4.5:1`, rBody2 >= 4.5, rBody2.toFixed(2));
  check(`theme ${key} muted text \u2265 4.5:1`, rSoft >= 4.5, rSoft.toFixed(2));
  check(`theme ${key} button text \u2265 3:1`, rBtn >= 3, rBtn.toFixed(2));
}
check("TONE_COLORS independent of themes", TONE_COLORS.joy === "#e8a2b8" && TONE_COLORS.sadness === "#93a8c8");
check("coerceJournalName trims", coerceJournalName("  Sunny Days  ") === "Sunny Days");
check("coerceJournalName caps at 20", coerceJournalName("x".repeat(30)).length === MAX_JOURNAL_NAME);
check("coerceJournalName blank \u2192 default", coerceJournalName("   ") === DEFAULT_JOURNAL_NAME);
check("coerceJournalName null \u2192 default", coerceJournalName(null) === DEFAULT_JOURNAL_NAME);
check(
  "formatDayShare today exact",
  formatDayShare({ dateKey: "2026-10-17", mood: "calm", isToday: true }) === "Daydrop \xB7 Oct 17\nToday's bloom: Calm\n\u{1F7E9}\n" + DAY_TAGLINE
);
check(
  "formatDayShare historical exact",
  formatDayShare({ dateKey: "2026-10-12", mood: "joy", isToday: false }) === "Daydrop \xB7 Oct 12\nThis bloom: Joyful\n\u{1F7E8}\n" + DAY_TAGLINE
);
check(
  "every tone has a distinct mood square",
  TONE_ORDER.every((t) => MOOD_SQUARES[t].length > 0) && new Set(TONE_ORDER.map((t) => MOOD_SQUARES[t])).size === TONE_ORDER.length
);
check(
  "formatYearShare exact",
  formatYearShare({
    year: 2026,
    recorded: 128,
    monthDominant: ["calm", "joy", null, "sadness", "calm", "calm", "joy", null, null, null, null, null]
  }) === "Daydrop \xB7 2026 in Color\n128 days recorded\nJ F M A M J J A S O N D\n\u{1F7E9}\u{1F7E8}\u2B1C\u{1F7E6}\u{1F7E9}\u{1F7E9}\u{1F7E8}\u2B1C\u2B1C\u2B1C\u2B1C\u2B1C"
);
check(
  "formatYearShare empty year honest",
  formatYearShare({ year: 2025, recorded: 0, monthDominant: Array(12).fill(null) }) === "Daydrop \xB7 2025 in Color\n0 days recorded\nJ F M A M J J A S O N D\n" + "\u2B1C".repeat(12)
);
{
  const fixture = {
    "2024-01-01": "calm",
    "2024-02-29": "joy",
    // leap day
    "2024-12-31": "sadness",
    "2023-12-31": "anxiety"
    // padding week, outside the year
  };
  const grid = buildYearGridData(2024, fixture);
  check("year grid recorded counts in-year entries only", grid.recorded === 3, `got ${grid.recorded}`);
  const find = (key) => grid.weeks.flat().find((d) => d.dateKey === key);
  check("leap day 2024-02-29 keeps its mood", find("2024-02-29")?.tone === "joy");
  check("padding day outside year has no tone", find("2023-12-31")?.tone === null && find("2023-12-31")?.inYear === false);
  check("missing day stays empty (never fabricated)", find("2024-06-15")?.tone === null && find("2024-06-15")?.inYear === true);
  check("grid weeks are full 7-day rows", grid.weeks.every((w) => w.length === 7));
  check(
    "grid starts on a Sunday",
    parseDateKey(grid.weeks[0][0].dateKey).getDay() === 0,
    grid.weeks[0][0].dateKey
  );
  check("month dominant moods", grid.monthDominant[0] === "calm" && grid.monthDominant[1] === "joy" && grid.monthDominant[11] === "sadness");
  check("empty months have no dominant mood", grid.monthDominant[2] === null && grid.monthDominant[5] === null);
  const empty = buildYearGridData(2025, {});
  check("empty year: 0 recorded, all months null", empty.recorded === 0 && empty.monthDominant.every((m) => m === null));
}
function countPaintedPixels(canvas) {
  const ctx = canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, BLOOM_CARD_W, BLOOM_CARD_H);
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - 250) > 18 || Math.abs(data[i + 1] - 246) > 18 || Math.abs(data[i + 2] - 238) > 18) {
      n++;
    }
  }
  return n;
}
{
  const make = (w, h) => (0, import_canvas.createCanvas)(w, h);
  const theme = cardTheme();
  const card = (0, import_canvas.createCanvas)(BLOOM_CARD_W, BLOOM_CARD_H);
  const ctx = card.getContext("2d");
  drawBloomCard(
    ctx,
    BLOOM_CARD_W,
    BLOOM_CARD_H,
    {
      seed: 12345,
      palette: "honey",
      variant: 0,
      dateKey: "2026-10-17",
      journalName: "My Journal",
      mood: "joy",
      theme
    },
    make
  );
  check("bloom card paints artwork pixels", countPaintedPixels(card) > 5e4, `painted=${countPaintedPixels(card)}`);
  const card2 = (0, import_canvas.createCanvas)(BLOOM_CARD_W, BLOOM_CARD_H);
  const ctx2 = card2.getContext("2d");
  drawBloomCard(
    ctx2,
    BLOOM_CARD_W,
    BLOOM_CARD_H,
    { seed: 12345, palette: "honey", variant: 0, dateKey: "2026-10-17", journalName: "My Journal", mood: null, theme },
    make
  );
  check(
    "mood-hidden card renders and differs",
    countPaintedPixels(card2) > 5e4 && card.toDataURL() !== card2.toDataURL()
  );
  const ycard = (0, import_canvas.createCanvas)(YEAR_CARD_W, YEAR_CARD_H);
  const yctx = ycard.getContext("2d");
  const ygrid = buildYearGridData(2024, { "2024-01-01": "calm", "2024-02-29": "joy" });
  drawYearCard(yctx, YEAR_CARD_W, YEAR_CARD_H, { year: 2024, journalName: "My Journal", grid: ygrid, theme });
  const ydata = yctx.getImageData(0, 0, YEAR_CARD_W, YEAR_CARD_H).data;
  let yn = 0;
  for (let i = 0; i < ydata.length; i += 40) {
    if (Math.abs(ydata[i] - 250) > 18 || Math.abs(ydata[i + 1] - 246) > 18 || Math.abs(ydata[i + 2] - 238) > 18) yn++;
  }
  check("year card paints grid pixels", yn > 1e3, `painted~${yn * 10}`);
  const ecard = (0, import_canvas.createCanvas)(YEAR_CARD_W, YEAR_CARD_H);
  const ectx = ecard.getContext("2d");
  drawYearCard(ectx, YEAR_CARD_W, YEAR_CARD_H, {
    year: 2025,
    journalName: "My Journal",
    grid: buildYearGridData(2025, {}),
    theme
  });
  check("empty year card renders", ecard.toDataURL().length > 1e4);
}
async function prefChecks() {
  await setPreference("sidebarCollapsed", true);
  check("sidebarCollapsed pref roundtrip", await getPreference("sidebarCollapsed", false) === true);
  await setPreference("sidebarCollapsed", false);
  check("sidebarCollapsed pref reset", await getPreference("sidebarCollapsed", true) === false);
}
Promise.all([storeChecks(), prefChecks()]).then(() => {
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `
${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
});
