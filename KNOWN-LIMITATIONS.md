# Daydrop — known limitations & incomplete features

## Deliberate MVP scope cuts
- **Emotion analysis is a lexicon fallback, not AI.** The UI says so ("A possible
  interpretation — change it if it doesn't feel right"). A genuine in-browser model was
  evaluated and deferred: ~100 MB+ weights, slow mobile load, fragile WASM/ONNX support.
  `src/emotion/analyze.ts` exposes a model-shaped interface so a local model can replace
  it later without UI changes.
- **One entry per day.** Editing replaces the day's entry (with confirmation); there is
  no entry history or versioning within a day.
- **No accounts, cloud sync, sharing, or export.** Data lives only in this browser.
- **No notifications, reminders, streaks, or gamification** — by design.
- **No clinical features.** Not a diagnostic tool; no severity scores, no crisis resources
  page (consider adding a static resources link before any public launch beyond the demo).

## Technical limitations
- **Storage is not encrypted or backed up.** Clearing browser data or uninstalling the
  PWA may permanently remove journal entries. IndexedDB can also be evicted by the
  browser under storage pressure.
- **Private browsing / blocked storage** falls back to an in-memory store: entries work
  but vanish when the tab closes (a notice is shown).
- **Soundscapes need Web Audio + a user gesture.** Very old browsers get a silent app;
  everything else remains fully usable. Sound is strictly opt-in ("Reveal with
  sound"); if a browser blocks the start, the artwork still reveals and a quiet
  inline note says so.
- **Bloom reveal is entry-page only** and disabled under `prefers-reduced-motion`
  (instant render). The "Take a moment" cue is a gentle, dismissible caption —
  not a guided pattern, and it makes no therapeutic claims.
- **Support info lives on the About page** (`#/about`), not in the footer: the 988
  Suicide Crisis Helpline (call or text 9-8-8, 24/7, English/French) is a verified
  Canadian resource, presented as static information. Daydrop does not detect
  crisis or diagnose. Review the resource if demoing outside Canada.
- **Watercolor art is abstract generative pigment**, rendered at canvas resolution —
  not a high-DPI print asset. Re-opening an entry re-renders from the stored seed
  (deterministic), not from a saved image.
- **PWA install behavior varies by browser/OS** (prompt support, icon masking, offline
  scope). iOS gets Add-to-Home-Screen instructions rather than an automatic prompt.
- **Offline covers the app shell + local data.** First load requires network; the
  emotion lexicon and art engine are bundled so they work offline after that.
- **Accessibility:** tested against the checklist manually; no formal screen-reader or
  audit pass has been done yet.

## Unverified
- The full definition-of-done walkthrough (write → art → save → calendar → refresh →
  reopen → edit → delete) was verified at the engine level (145 automated checks,
  including growth-final ≡ one-pass pixel equivalence, theme contrast, and
  palette-per-mood) and by code review, but **not yet driven end-to-end in a live
  browser** in this build session — run `TEST-CHECKLIST.md` on a phone + desktop
  before the demo. In particular, eyeball: each of the 7 themes full-bleed at
  390×844 (theme grid, drawer, greeting, journal card), the theme preview cards,
  decoration placement/opacity, the sidebar at ≥1024px, and contrast in situ.
- The saved theme restores asynchronously on launch (a brief flash of the default
  Daybreak theme is possible on first paint).
- GitHub Pages deployment workflow is configured but **not yet executed** against a real
  repository (no repo was created in this session).
