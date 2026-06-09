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

## Next session — items discovered while building the above

### 1. Persist the series catalogue + per-series panels/characters across reload
**Highest-value follow-up.** Today only the *store-backed* per-series data survives a reload
(`links` / `appearance` / `visdevExtra` / `library`, namespaced by series id in `server/store.ts`).
The **series list itself** and the in-memory `panelsBySeries` / `charactersBySeries` maps in
`src/App.tsx` are seeded fresh on every load, so a newly created series — and any panels/cast
added to it — disappears on refresh (and its store partition is orphaned under a random id).
To do:
- Persist the series catalogue (add a `series[]` catalogue to the store, or a new `/api/series`).
- Persist `panels` and `characters` per series (extend `SeriesState` in `server/store.ts` to carry
  them, or fold them into the existing per-series `state`), and hydrate them on series switch in
  `src/App.tsx` alongside `library`.
- Give new series a stable id that the store partition keys on (already random in `series.tsx`,
  just needs to be persisted with the catalogue).

### 2. Fix button-nested-in-button in the series switcher
`.ww-series-switch` (a `<button>`, ~`src/App.tsx:178`) contains the dropdown whose
`.ww-series-menu-item`s are also `<button>`s → invalid HTML + a React hydration error in the
console. Make the outer element a `<div role="button">` (or move the menu out of the button).
Pre-existing; surfaced during verification. (Flagged as a background task chip.)

### 3. Per-series authoring depth (currently blank/seed-only)
- **Bible fields** (wants / flaw / voice / secret / arc / relationships) are read-only seed text;
  a blank character shows them empty. Make them editable + persisted per series if we want real
  authoring for non-seed series.
- **Co-pilot** content (`COPILOT` / `COPILOT_X`) is Echo-flavoured canned Q&A for every series.
  Either scope it per series or hide/relabel it for non-seed series.
- **Seasons/Arc board** starts fully empty for a blank series (the `＋ Episode` / `＋ Throughline`
  buttons build from zero). Consider seeding one empty season so the grid reads better.

### 4. Lint debt
The repo fails `@typescript-eslint/no-explicit-any` across the board (≈398 errors, incl. untouched
files like `world.ts:1`). New per-series code follows the same `any` convention. If we want a clean
`npm run lint`, that's a dedicated typing pass — not specific to this feature.

Files (this feature): `src/series-data.ts` (new), `src/App.tsx`, `src/narrative.tsx`, `src/visdev.tsx`,
`src/loras.tsx`, `src/stages.tsx`, `src/preview.tsx`, `src/compose.tsx`, `src/series.tsx`,
`src/services/store.ts`, `server/store.ts`, `server/index.ts`.
