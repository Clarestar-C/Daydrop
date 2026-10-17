# Daydrop

**Daydrop** is an emotional-wellness watercolor journaling Progressive Web App, built for
Hack the Valley 11 (University of Toronto Scarborough, Oct 16–18, 2026).

The concept: **turn one sentence about your day into a watercolor artwork, a gentle
soundscape, and a square on your personal yearly emotional calendar.**

Daydrop is a personal emotional-reflection tool. It is **not** a diagnostic or clinical
mental-health application, and it never claims to know your true emotional state.

## Quick start

Prerequisites: Node.js 18+ and npm.

```bash
cd daydrop
npm install
npm run dev      # local dev server (hot reload)
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build locally
```

No backend, account, API key, or paid service is required. Everything runs on-device.

## Project structure

```
src/
  config.ts            # App name, theme colors, tone labels/colors — change the name here
  main.tsx             # entry point
  App.tsx              # hash router, sidebar/drawer nav, theme restore, storage banner
  nav.ts               # tiny navigate() helper
  styles.css           # design tokens + base styles
  components.css       # component/page styles (mobile-first)
  pages/
    TodayPage.tsx      # home: greeting, journal card, composer → art result flow
    CalendarPage.tsx   # GitHub-style yearly calendar
    JournalPage.tsx    # reverse-chron journal history + data controls
    EntryPage.tsx      # single-day detail: art, tone, soundscape, edit/delete
    SettingsPage.tsx   # journal name + page theme picker
  components/
    ArtCanvas.tsx      # deterministic canvas renderer wrapper
    ToneChips.tsx      # tone selector (user choice always wins)
    SoundscapeControls.tsx  # play/stop, volume, mute
    ConfirmDialog.tsx  # accessible confirmation modal
    InstallPrompt.tsx  # PWA install / iOS Add-to-Home-Screen guidance
    icons.tsx          # inline SVG icons (no emoji art)
    decor.tsx          # original decorative SVGs (wash, sprig, cloud, moon)
  art/watercolor.ts    # seeded Canvas 2D watercolor generator
  audio/engine.ts      # Web Audio soundscape engine (3 original presets)
  emotion/analyze.ts   # local lexicon tone analysis (clearly-labeled fallback)
  db/store.ts          # IndexedDB persistence (idb) + in-memory fallback
  prefs.ts             # journal-name preference helpers
  theme/themes.ts      # page theme definitions (CSS-variable sets)
  utils/date.ts        # local-time date-key helpers (no UTC shifts)
public/icons/          # PWA icons (generated with PIL during the hackathon)
.smoke/test.ts         # node smoke tests (engines + store fallback)
```

## Emotion analysis — what it is and isn't

The MVP ships a **local lexicon/phrase-matching fallback** (`src/emotion/analyze.ts`),
exposed through a replaceable interface:

```ts
analyzeTone(text: string): {
  tones: { tone: ToneKey; score: number }[];
  method: 'lexicon';
  confidence: 'high' | 'medium' | 'low';
  note: string;
}
```

- It counts matches from small curated word lists (plus weighted bigrams like
  "burned out") per tone: joy, calm, sadness, anxiety, frustration.
- It can return **multiple tones** or a low-confidence "mixed feelings" result.
- The UI always presents it as a suggestion: *"A possible interpretation — change it
  if it doesn't feel right."* The user's own selection **always** determines the
  saved calendar color.
- It never infers a diagnosis or assigns a clinical severity score.

**Why not a real in-browser model?** We investigated Transformers.js. A usable
text-emotion model (e.g. a distilled BERT emotion classifier) is ~100 MB+ of weights,
needs a separate download on first run, adds seconds of load/parsing on mobile, and
ONNX/WASM runtime compatibility is fragile across phones — all unacceptable for a
hackathon MVP PWA that must work offline from a ~260 KB app shell. The `EmotionResult`
interface is deliberately model-shaped so a future `analyze.ts` can swap in a local
model without touching the UI. No model weights are bundled, so there are **no model
licensing requirements** for the current build.

## The bloom reveal ritual (opt-in sound)

Opening a saved entry first shows the paper with a choice: **"Reveal with
sound"** or **"Reveal quietly"**. Navigating to an entry never starts audio by
itself. On the explicit tap, blooms grow **one by one** like pigment blooming
into paper: each starts as a tiny, faint pool and expands outward into its
final irregular shape over ~1–1.3s (inner layers unfurl first, edges diffuse
softly, neighbors overlap and build up with multiply blending), with the next
bloom starting before the previous finishes (~4–6s total, scaled to bloom
count, then a short granulation/wash fade). A quiet, dismissible cue —
*"Take a moment — breathe at your own pace."* — may appear (no prescribed
pattern, no therapeutic claims). Tapping the artwork, or a "Show full artwork"
button, completes the reveal immediately. Under `prefers-reduced-motion` the
artwork renders instantly with no animation.

Implementation notes:

- `src/art/watercolor.ts` separates generation (`generateComposition`) from
  painting (`paintCompositionBase` / `paintBloomLayers` / `paintBloomGrowth` /
  `paintCompositionFinish`). `paintBloomGrowth(ctx, bloom, p)` grows one bloom
  organically (p in [0,1]); at p = 1 it replays the exact one-pass operations,
  so thumbnails and finished frames are pixel-identical (verified by the smoke
  test for the seed×palette×variant matrix).
- `ArtCanvas` takes optional `reveal` / `preview` props; Journal/Calendar
  thumbnails and the Today preview keep the instant one-pass render.
- Sound starts only from the explicit "Reveal with sound" tap (a valid Web Audio
  gesture), with a ~3s fade-in synced to the blooms. A persisted `soundEnabled`
  preference (IndexedDB `meta` store) remembers the user's mute choice. If audio
  fails to start, the artwork still reveals fully and a quiet inline note says so.
- All animation frames and timers are cancelled on unmount/navigation; audio
  nodes are released on stop/unmount.

## Privacy design (important)

- Journal text **never leaves the device**: there are zero network calls in the app
  (`fetch`/`XHR`/`sendBeacon` do not appear anywhere in `src/`).
- The service worker **precaches the app shell only** (JS/CSS/HTML/icons/manifest);
  there is deliberately **no** runtime caching, so journal content can never end up in
  the SW cache.
- Text is never written to the console, never placed in URLs or browser history, and
  never sent to any third-party AI service. There are no API keys or secrets.
- Data lives in IndexedDB (`daydrop-db`, store `entries`, keyed by local date
  `YYYY-MM-DD`). If IndexedDB is unavailable (e.g. private browsing), the app falls
  back to in-memory storage and shows a notice that entries last only for the session.
- "Delete all journal data" (Journal page → Privacy & data) wipes the store after an
  explicit checkbox-gated confirmation.
- Clearing browser data or uninstalling the app **may remove journal entries**.
  Browser-local storage is **not** encrypted and should not be treated as fully secure.

## PWA + GitHub Pages deployment

- `vite.config.ts` uses `base: './'` (relative asset paths) so the app works under any
  repository subpath, e.g. `https://<user>.github.io/daydrop/`.
- `vite-plugin-pwa` generates `manifest.webmanifest` (name/short name/theme colors from
  `src/config.ts`), app icons, and the service worker (`generateSW`, app-shell precache).
- Hash routing (`#/`, `#/calendar`, `#/journal`, `#/entry/2026-10-16`) means page refresh
  and deep links work on GitHub Pages with no server rewrites.
- Install: Chromium shows an **Install Daydrop** button via `beforeinstallprompt`;
  iOS Safari gets **Share → Add to Home Screen** instructions.

### Deploying

1. Push this folder's contents to a GitHub repo (default branch `main`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` runs `npm ci`, `npm run build`,
   and deploys `dist/` to Pages automatically.

## Page themes & journal name

Settings (`#/settings`) offers a **journal name** (default "My Journal", max
20 chars, used in the Home greeting and journal card) and **page themes**:
Daybreak (the classic warm-ivory default) plus Ocean Mist, Secret Garden,
Lavender Dream, Peach Sunrise, Rosewater, and Moonlight (a dark theme).

Themes are pure CSS-variable overrides (`[data-theme="<key>"]` in
`src/styles.css`, defined in `src/theme/themes.ts`) — no component styles are
duplicated. The choice applies immediately, persists in the on-device meta
store, and restores on launch.

**Theme ↔ mood independence is a hard rule:** the page theme never changes the
saved mood, artwork palette, calendar colors, or entries. Mood artwork always
uses the fixed `TONE_COLORS` and mood palettes; only the app chrome recolors.
Body-text contrast is ≥ 4.5:1 in every theme (verified by automated checks in
`.smoke/test.ts`).

## Sharing (all local, all explicit)

**Share this bloom** (on every entry page): builds a polished 1080×1350 PNG
from the saved artwork data (deterministic one-pass render — works even before
or mid animation) with the date, journal name, an optional mood label, the
tagline "A little moment from my day.", and "Made with Daydrop" branding.
Controls: preview, "Include mood label" toggle (default on), **Download PNG**,
**Share…** (native share sheet where supported, automatic download fallback),
and **Copy share text** (Wordle-style compact text with a mood square; manual
select-and-copy fallback if the clipboard is blocked).

**Share my year in color** (`#/export`, Export nav item): pick a year, preview a
1600×2000 card with the real year grid (actual saved mood colors; empty days
stay empty — nothing fabricated), compact named mood legend, and the recorded
day count. Download / Share… / **Copy year summary** (year, count, 12-square
month strip). Empty years export an honest "No entries yet" card.

Privacy rules for sharing: everything renders on an offscreen canvas on-device;
**journal text is never included** in any image or copied text; nothing is
posted or sent unless you tap a button; no analytics, no uploads, no accounts.

## Accessibility

Semantic HTML, keyboard-accessible controls, visible focus indicators, aria labels on
icon buttons, tone legend with names (never color-only), `prefers-reduced-motion`
support (art entrance + transition wash degrade gracefully), ≥44 px touch targets, and
the full flow works with sound off.

## Dependencies

| Package | Why |
|---|---|
| `react`, `react-dom` | UI |
| `idb` | tiny promise wrapper for IndexedDB |
| `vite`, `@vitejs/plugin-react`, `typescript` | build toolchain |
| `vite-plugin-pwa` | manifest + service worker generation |
| `canvas` (dev only) | node-canvas for the `.smoke/` pixel-determinism tests |

No webfonts, no analytics, no UI frameworks, no router library.
