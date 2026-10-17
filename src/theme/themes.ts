// Page themes for Daydrop — independent of daily mood.
// A theme only changes the app's own chrome (backgrounds, surfaces, text,
// buttons, borders, decorative accents) via CSS variables. It never touches
// mood artwork: TONE_COLORS, mood palettes, calendar squares and saved
// entries are identical under every theme.

export type ThemeKey =
  | 'daybreak'
  | 'ocean-mist'
  | 'secret-garden'
  | 'lavender-dream'
  | 'peach-sunrise'
  | 'rosewater'
  | 'moonlight';

export const DEFAULT_THEME: ThemeKey = 'daybreak';
export const THEME_PREFERENCE_KEY = 'theme';

export interface ThemeDef {
  key: ThemeKey;
  name: string;
  tagline: string;
  /** CSS variable overrides applied under [data-theme="<key>"]. */
  vars: Record<string, string>;
  /** Pigment set for the theme's live watercolor preview card. */
  preview: string[];
}

/** Every theme must define all of these variables (checked in smoke tests). */
export const REQUIRED_THEME_VARS = [
  'paper',
  'paper-2',
  'ink',
  'ink-soft',
  'line',
  'accent',
  'accent-deep',
  'on-accent',
  'ink-inverse',
  'veil-text',
  'banner',
  'cell-empty',
  'danger',
  'danger-deep',
  'rose',
  'blush',
  'lavender',
  'powder',
  'peach',
  'sage',
] as const;

const daybreak: ThemeDef = {
  key: 'daybreak',
  name: 'Daybreak',
  tagline: 'The classic warm ivory journal',
  vars: {
    paper: '#faf6ee',
    'paper-2': '#fffdf8',
    ink: '#3e3548',
    'ink-soft': '#66707f',
    line: '#e7dcc9',
    accent: '#5e7ba0',
    'accent-deep': '#6d4f80',
    'on-accent': '#fffdf8',
    'ink-inverse': '#fffdf8',
    'veil-text': '#fffdf8',
    banner: '#f6ead2',
    'cell-empty': '#ece5d5',
    danger: '#b3564d',
    'danger-deep': '#9c4a43',
    rose: '#e8a2b8',
    blush: '#f7dee4',
    lavender: '#7e93ad',
    powder: '#9db9d9',
    peach: '#f0c49c',
    sage: '#a9c6a4',
  },
  preview: ['#e8a2b8', '#a9c6a4', '#9db9d9'],
};

export const THEMES: Record<ThemeKey, ThemeDef> = {
  daybreak,
  'ocean-mist': {
    key: 'ocean-mist',
    name: 'Ocean Mist',
    tagline: 'Powder blue, misty teal, cloud white',
    vars: {
      paper: '#f1f6f9',
      'paper-2': '#ffffff',
      ink: '#1f3440',
      'ink-soft': '#546e7e',
      line: '#d2e2ea',
      accent: '#2a6f88',
      'accent-deep': '#1f5a70',
      'on-accent': '#ffffff',
      'ink-inverse': '#ffffff',
      'veil-text': '#fffdf8',
      banner: '#dcebf1',
      'cell-empty': '#e1ebef',
      danger: '#b3564d',
      'danger-deep': '#9c4a43',
      rose: '#d9a7b8',
      blush: '#f0dce4',
      lavender: '#8fa3c8',
      powder: '#9db9d9',
      peach: '#eec9a8',
      sage: '#a9c6a4',
    },
    preview: ['#9db9d9', '#6fa8a5', '#d7e6ec'],
  },
  'secret-garden': {
    key: 'secret-garden',
    name: 'Secret Garden',
    tagline: 'Sage, moss, warm cream',
    vars: {
      paper: '#f5f2e6',
      'paper-2': '#fffdf5',
      ink: '#2c3a26',
      'ink-soft': '#5b6951',
      line: '#dbd3b8',
      accent: '#476b38',
      'accent-deep': '#36552b',
      'on-accent': '#ffffff',
      'ink-inverse': '#ffffff',
      'veil-text': '#fffdf8',
      banner: '#e8e3ca',
      'cell-empty': '#e9e3cd',
      danger: '#b3564d',
      'danger-deep': '#9c4a43',
      rose: '#d9a7a0',
      blush: '#f2e2d2',
      lavender: '#8b9a7e',
      powder: '#a8bfa0',
      peach: '#e8c49a',
      sage: '#a9c6a4',
    },
    preview: ['#a9c6a4', '#7d8f69', '#e6dfc4'],
  },
  'lavender-dream': {
    key: 'lavender-dream',
    name: 'Lavender Dream',
    tagline: 'Lavender, periwinkle, pale lilac',
    vars: {
      paper: '#f4f1fa',
      'paper-2': '#ffffff',
      ink: '#352e4e',
      'ink-soft': '#655c85',
      line: '#dbd3ed',
      accent: '#5a4fa8',
      'accent-deep': '#463d86',
      'on-accent': '#ffffff',
      'ink-inverse': '#ffffff',
      'veil-text': '#fffdf8',
      banner: '#e3dbf2',
      'cell-empty': '#e5dff1',
      danger: '#b3564d',
      'danger-deep': '#9c4a43',
      rose: '#c99ab8',
      blush: '#e8d8ec',
      lavender: '#a893d4',
      powder: '#9d8fd0',
      peach: '#e5c2d4',
      sage: '#a9bfa8',
    },
    preview: ['#b9a8d9', '#8f97c4', '#e6dcf4'],
  },
  'peach-sunrise': {
    key: 'peach-sunrise',
    name: 'Peach Sunrise',
    tagline: 'Peach, blush, warm honey',
    vars: {
      paper: '#fdf4ea',
      'paper-2': '#fffdf8',
      ink: '#4a3220',
      'ink-soft': '#81654b',
      line: '#edd9c2',
      accent: '#a05e1d',
      'accent-deep': '#7f4c15',
      'on-accent': '#ffffff',
      'ink-inverse': '#ffffff',
      'veil-text': '#fffdf8',
      banner: '#f6e6cf',
      'cell-empty': '#f1e4cf',
      danger: '#b3564d',
      'danger-deep': '#9c4a43',
      rose: '#e5a08e',
      blush: '#f7ddd0',
      lavender: '#c49a7e',
      powder: '#d4af8a',
      peach: '#f0c49c',
      sage: '#b3bf9a',
    },
    preview: ['#f0c49c', '#e8a2a2', '#eec25e'],
  },
  rosewater: {
    key: 'rosewater',
    name: 'Rosewater',
    tagline: 'Dusty rose, mauve, ivory',
    vars: {
      paper: '#faf1ee',
      'paper-2': '#fffdfb',
      ink: '#472e35',
      'ink-soft': '#7c5e65',
      line: '#e6d0cf',
      accent: '#93465a',
      'accent-deep': '#763848',
      'on-accent': '#ffffff',
      'ink-inverse': '#ffffff',
      'veil-text': '#fffdf8',
      banner: '#f2dcd8',
      'cell-empty': '#eedfd9',
      danger: '#b3564d',
      'danger-deep': '#9c4a43',
      rose: '#d99aa8',
      blush: '#f2d9d6',
      lavender: '#b08a96',
      powder: '#c49aa4',
      peach: '#e8bfae',
      sage: '#b3ab9c',
    },
    preview: ['#d99aa8', '#b57e8c', '#f4e6de'],
  },
  moonlight: {
    key: 'moonlight',
    name: 'Moonlight',
    tagline: 'Indigo night, misty blue, soft silver',
    vars: {
      paper: '#20263a',
      'paper-2': '#2a3250',
      ink: '#e9edf7',
      'ink-soft': '#a9b4d0',
      line: '#3a4468',
      accent: '#93a8dd',
      'accent-deep': '#7b90c9',
      'on-accent': '#1b2133',
      'ink-inverse': '#1b2133',
      'veil-text': '#fffdf8',
      banner: '#2c3554',
      'cell-empty': '#2e3656',
      danger: '#d98a80',
      'danger-deep': '#b3564d',
      rose: '#8e6f8e',
      blush: '#4a4468',
      lavender: '#6f7fae',
      powder: '#7d90c2',
      peach: '#8e7f72',
      sage: '#6f8a7d',
    },
    preview: ['#5a6b9e', '#8fa3d9', '#ccd5ea'],
  },
};

export const THEME_KEYS: ThemeKey[] = [
  'daybreak',
  'ocean-mist',
  'secret-garden',
  'lavender-dream',
  'peach-sunrise',
  'rosewater',
  'moonlight',
];

export function coerceThemeKey(key: string | null | undefined): ThemeKey {
  return key && key in THEMES ? (key as ThemeKey) : DEFAULT_THEME;
}

/** Apply the theme by setting data-theme on <html>. Daybreak = attribute removed. */
export function applyTheme(key: ThemeKey): void {
  if (typeof document === 'undefined') return;
  if (key === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', key);
  }
}
