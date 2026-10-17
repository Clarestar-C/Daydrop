# Daydrop — test checklist

Automated: `npm run build` (runs `tsc --noEmit` + `vite build`) must pass with 0 errors.
Engine smoke tests: `npx esbuild .smoke/test.ts --bundle --platform=node --format=cjs
--external:canvas --outfile=.smoke/run.cjs && node .smoke/run.cjs` — 54 checks covering
seed/RNG determinism, watercolor pixel determinism (incl. organic-growth final ≡
one-pass), lexicon analysis, date helpers
(leap day 2024-02-29, year boundary), and the IndexedDB memory-fallback store path.

The rest is manual. Check each box in a real browser (mobile viewport + desktop).

## Definition-of-done walkthrough
- [ ] Open the app (fresh profile) → Today page shows greeting, date, prompt.
- [ ] Type a sentence (counter counts to 280; button disabled when empty).
- [ ] "Turn into art" → brief wash transition → watercolor appears with a suggested tone
      + "A possible interpretation — change it if it doesn't feel right."
- [ ] Pick a different tone chip → save → entry page opens showing the art.
- [ ] Go to Calendar → today's square is colored with the chosen tone; today has a ring.
- [ ] Refresh the page → entry still there; open the square → **same artwork** (seeded).
- [ ] Edit the text (confirm the replace dialog) → updated; delete the entry (confirm).
- [ ] Journal page reflects each change (list updates, empty state returns).

## Today flow
- [ ] Existing-entry day shows "You've already captured today" with View/Edit (no silent overwrite).
- [ ] "Skip for today" navigates away and saves nothing.
- [ ] "Back to editing" from the result screen discards the draft art (nothing saved).
- [ ] Palette controls: "Try another interpretation" visibly changes the art; "Use a neutral
      palette" switches to neutrals; re-render is deterministic per (seed, palette, variant).
- [ ] Soundscape: preset chips switch presets; play starts only on tap; stop/volume/mute work;
      navigating away stops audio (no leaks, no autoplay on load).

## Calendar
- [ ] Year grid: 7 rows (Sun–Sat), month labels change at the right columns, Jan 1 / Dec 31 align.
- [ ] Leap year: Feb 29, 2024 renders exactly once in 2024, absent in 2023/2025.
- [ ] Prev/next year + "This year" buttons work; horizontal scroll on narrow screens.
- [ ] Cells are keyboard-focusable with full aria-labels ("October 16, 2026 — Joyful" /
      "— no entry"); legend shows swatch + tone name.
- [ ] Empty days are neutral and distinct; empty days are not treated as a mood.
- [ ] New user sees the "Your year, one square at a time…" empty state.

## Journal & entry
- [ ] Entries list newest-first with mini art, date, tone tag, snippet; Open/Edit/Delete work.
- [ ] Entry page: lightbox enlarges art; tone change saves immediately; soundscape plays the
      entry's preset; timestamps show Saved/Updated.
- [ ] Delete flows require explicit confirmation; "Delete all journal data" requires the
      checkbox before the confirm button enables.

## PWA / offline
- [ ] `manifest.webmanifest` serves with relative icon paths; install prompt appears in
      Chromium (`beforeinstallprompt`); iOS shows Add-to-Home-Screen instructions.
- [ ] After first load, airplane mode → app shell still opens and saved entries load
      (IndexedDB is local).
- [ ] Refresh on `#/calendar` and `#/entry/<date>` works (hash routing, no 404).

## Privacy spot-checks
- [ ] DevTools Network: zero requests after load except the app shell itself.
- [ ] DevTools Console: no journal text ever logged.
- [ ] Application → Cache Storage: no entry text in the SW cache; IndexedDB holds entries only.
- [ ] Private/incognito window: app shows the session-only storage notice and still works.

## Accessibility
- [ ] Full flow completable keyboard-only with visible focus.
- [ ] `prefers-reduced-motion`: no wash animation, art appears without fade.
- [ ] Tone meaning never carried by color alone (labels everywhere).
- [ ] Touch targets ≥ 44 px on mobile nav and primary buttons.
- [ ] Drawer: hamburger opens it, focus moves inside, Tab cycles, Escape/scrim/link closes it,
      focus returns to the hamburger.

## Themes, journal name & navigation (manual — no live browser in this session)
- [ ] Each of the 7 themes full-bleed at 390×844: background, cards, buttons, borders,
      selected states all recolor; body text contrast looks strong everywhere.
- [ ] Theme preview cards show a small watercolor wash per theme; selected card has a ring
      + "Selected" badge (not color-only).
- [ ] Pick Moonlight → refresh → theme persists; journal entries, calendar colors, mood
      chips, and artwork palettes are unchanged (theme never touches mood data).
- [ ] Change the journal name in Settings (try >20 chars, try blank) → Home greeting and
      journal card update; refresh → name persists.
- [ ] Desktop ≥1024px: left sidebar with droplet logo, 5 nav items, quote, sprig; content
      column sits right of it with no overlap.
- [ ] Mobile <1024px: compact top bar; hamburger opens the drawer; decorations are subtle
      and never cover text or controls; no sideways scrolling.
- [ ] Home hero: greeting + journal name with ♡, journal card, "Open Journal →" scrolls to
      and focuses the composer (or opens today's entry if it exists); 3 mini-features row.

## Sharing, sidebar & layout (manual — verified in headless Chromium, needs real-device pass)
- [x] Desktop: `.app-main` margin-left is exactly the sidebar width (240px/72px);
      no horizontal overflow; content centered in the available area (checked 1280px).
- [x] Brand click collapses/expands the sidebar; rail shows icon-only links with tooltips;
      preference persists (smoke-tested roundtrip).
- [x] Entry share section renders preview + mood toggle + Download/Share/Copy buttons.
- [x] Download PNG produced `daydrop-2026-10-17.png` (621 KB) containing the correct artwork,
      date, mood label, tagline, and journal name — and no journal text.
- [x] Copy share text wrote the exact expected string to the clipboard.
- [x] Export page: year selector, live year-card preview with legend + recorded count,
      Download/Share/Copy-year-summary buttons all present.
- [ ] Real phone: tap **Share…** on an entry → native share sheet appears with the PNG.
- [ ] Real phone: **Download PNG** saves to the photo library / files app.
- [ ] Clipboard blocked (e.g. non-secure context): the manual select-and-copy fallback
      textarea appears with the correct text.
- [ ] Historical entry (not today): share card shows that day's date/artwork/mood.
- [ ] Export a year with zero entries: page shows the honest empty state and the PNG
      reads "No entries yet in {year}".
- [ ] Collapse the sidebar on Home, Journal, Calendar, Entry, Settings, Export: no overlap,
      no jump, smooth recentering; refresh → collapsed state persists.
- [ ] Mobile: drawer still works (no permanent sidebar width); share/export layouts fit 390px.
