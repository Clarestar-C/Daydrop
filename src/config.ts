// App-wide constants. Pure data — safe to import from vite.config.ts (build-only)
// and from any runtime module. The UI layer depends on these exact exports.
export const APP_NAME = 'Daydrop';
export const APP_SHORT_NAME = 'Daydrop';
export const APP_DESCRIPTION =
  'Turn one sentence about your day into a watercolor, a soundscape, and a square on your yearly emotional calendar.';
export const THEME_COLOR = '#f7f1e8';
export const BACKGROUND_COLOR = '#faf6ee';

export type ToneKey = 'joy' | 'calm' | 'sadness' | 'anxiety' | 'frustration' | 'mixed' | 'open';

export const TONE_ORDER: ToneKey[] = ['joy', 'calm', 'sadness', 'anxiety', 'frustration', 'mixed', 'open'];

export const TONE_LABELS: Record<ToneKey, string> = {
  joy: 'Joyful',
  calm: 'Calm',
  sadness: 'Low',
  anxiety: 'Anxious',
  frustration: 'Frustrated',
  mixed: 'Mixed feelings',
  open: 'Left open',
};

export const TONE_COLORS: Record<ToneKey, string> = {
  joy: '#e8a2b8',
  calm: '#a9c6a4',
  sadness: '#93a8c8',
  anxiety: '#7e93ad', // muted slate blue — never bright
  frustration: '#e0a58c',
  mixed: '#a7b8cc', // powder blue-grey
  open: '#cfc6b8',
};

export const MAX_CHARS = 280;
