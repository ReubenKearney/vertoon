# WORDWERX — backlog

## ✅ Done — Per-series workbench (create + drive a blank series) — 2026-06-10
Branch `feat/per-series-workbench`. The app is no longer hardcoded to the seed series
**"Echo's Location"**; any series — including a brand-new blank one — drives the whole
workbench (Narrative / Visual Dev / Compose / Publish) with full data isolation from Echo.
See `PER_SERIES.md` for the as-built architecture. Verified end-to-end in the browser:
create blank series → add character → appearance → Develop in Visual Dev (subject
auto-created, brief pulled through) → Compose/Story/Library/Preview/Publish all render
per-series with no Echo leakage; Echo stays intact across series switches.

---

## ✅ Done — Persistence + per-series authoring depth — 2026-06-11
Branch `feat/per-series-workbench`. Items 1–3 below are implemented and verified end-to-end in
the browser (create series → add/rename character → edit bible → reload → switch back: everything
hydrates; Echo stays isolated and intact). See `PER_SERIES.md` for the updated architecture.

### 1. Persist the series catalogue + per-series panels/characters/bible across reload ✅
- **Catalogue** persists via a new global `GET/PUT /api/series` (`catalogue` field in `server/store.ts`).
  `App.tsx` loads it on mount; on first run (catalogue `null`) it seeds the store from the built-in
  `SERIES`, and persists any create/reorder (debounced). Offline failures keep the in-memory seed
  and never clobber a real catalogue.
- **panels / characters / bible** are now part of per-series `SeriesState` (`server/store.ts`),
  persisted with the existing debounced `patchState` (alongside `library`) and hydrated on series
  switch in `App.tsx`. A new series — and its cast/panels/bible — now survives a refresh.

### 2. Fix button-nested-in-button in the series switcher ✅
`.ww-series-switch` is now a `<div role="button" tabIndex=0>` (with Enter/Space handling) instead of
a `<button>`, so the dropdown's `<button>` items aren't nested in a button. Verified: 0 nested
buttons in the DOM, no hydration error, dropdown still opens/switches. Added `cursor:pointer` to the
rule (the only thing lost vs the `button` reset).

### 3. Per-series authoring depth ✅
- **Bible fields** (name / role / desc + wants / flaw / voice / secret / arc) are now inline-editable
  and persisted per series (`updateCharacter` / `updateBible` in `App.tsx`; editable fields +
  `.ww-bp-edit*` styling in `narrative.tsx` / `styles2.css`). Relationships stay read-only (editing
  that graph is a heavier follow-up — see below).
- **Co-pilot** is scoped to the seed: for non-Echo series the canned Echo Q&A chips are hidden and
  free-text replies fall back to an honest generic message instead of citing Echo's beats/palette
  (`seed` prop + `genericReply` in `copilot.tsx`).
- **Seasons/Arc board** seeds one starter season + episode + throughline for a blank series
  (`blankContent` in `series-data.ts`) so the grid reads as a startable scaffold.

Also fixed a latent `<Bible>` crash this surfaced: when the cast hydrates in after mount, the
internal `selId` lagged behind `chars`, so the profile indexed an undefined character and threw on
`c.tint`. `narrative.tsx` now falls back to the first character when `selId` is stale.

---

## Next session

### Lint debt (carried over)
The repo fails `@typescript-eslint/no-explicit-any` across the board (≈398 errors, incl. untouched
files like `world.ts:1`). New per-series code follows the same `any` convention. `npm run build`
type-checks clean; only `npm run lint` fails. Cleaning it is a dedicated typing pass — not specific
to any feature — so it's deliberately left out of the persistence work.

### Smaller leftovers
- **Relationships editing** in the bible is still read-only (the rest of the bible is editable now).
- **Season/Arc edits aren't persisted** — the board is seeded and editable, but `ArcBoard` keeps its
  edits in local component state (lost on remount/series-switch). Lift to per-series state + persist
  if real season authoring is wanted.
- **Series config drawer** (`SeriesDrawer` palette/canon edits) still only flashes "Saved" — not
  wired to `setSeries`, so config edits don't persist.
