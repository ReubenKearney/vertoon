# WORDWERX — per-series workbench (as built)

_Implemented 2026-06-10 on branch `feat/per-series-workbench`._

## Why

The workbench used to be hardcoded to the seed series **"Echo's Location"**. `App.tsx` gated
every other series behind a `PlaceholderWS`, the seed content (`CHARACTERS`, `SEASONS`, `ARCS`,
`BIBLE`, `VISDEV`, `PANELS`, `LIBRARY`, `EPISODE`) was imported as module globals **inside the
components**, and the persisted store was one global blob. A series created in the Series
workspace had nowhere to keep its own characters/panels/assets.

Now any series — the seed or a brand-new blank one — drives the whole workbench, fully isolated
from Echo. A non-seed series resolves to blank content and an empty store partition, so "new
series" needs no special reset code.

## The three moving parts

### 1. Content registry — `src/series-data.ts`
`getSeriesContent(id, series)` returns a `SeriesContent` bundle
(`characters / seasons / arcs / bible / visdev / panels / library / episode`):
- `echo` → `ECHO_CONTENT` (references the existing seed constants still defined in
  `src/data.ts` / `src/world.ts`).
- anything else → `blankContent(series)` — empty arrays/maps, with an `episode` derived from the
  series' own metadata (title/genre/tagline).

Generic, non-series-specific modules stay global: `EFFECT_TYPES` / `mkFx` (`data.ts`) and the
canned co-pilot Q&A `COPILOT` / `COPILOT_X`.

### 2. App state — `src/App.tsx`
- **Editable content** is kept in per-series maps `panelsBySeries` / `libraryBySeries` /
  `charactersBySeries` (`Record<seriesId, any[]>`), lazily seeded from the registry. Derived
  `panels` / `library` / `characters` plus value-or-updater setters write back to the active
  series' slot.
- **Static content** (`seasons / arcs / bible / visdev / episode`) is resolved per active series
  via `getSeriesContent(...)` in a `useMemo` and passed down as props.
- **Store hydration** re-runs whenever `activeSeries` changes (fetches that series' `links` /
  `appearance` / `visdevExtra` / `library`); the workspace components carry `key={activeSeries}`
  so their internal state (e.g. visdev's hydrate ref, selected ids) resets cleanly on switch.
- The `isEcho` gate and `PlaceholderWS` are removed; `Series.createSeries` makes the new series
  active and opens Narrative.

### 3. Per-series store — `server/store.ts`, `server/index.ts`, `src/services/store.ts`
- `db.json` shape is now `{ assets, series: { <id>: { links, state } } }`. **Assets stay global**
  (content-addressed blobs; links point into them).
- `readDb` **migrates** the old flat `{ assets, links, state }` blob into `series.echo` on first
  read (one-way; existing Echo store keeps working).
- `getState` / `patchState` / `setLink` take a leading `seriesId`; the API reads `?series=<id>`
  (default `echo`); the frontend wrapper appends `?series=<id>`. `App.tsx` injects `activeSeries`.

## Components threaded (globals → props)
`narrative.tsx`, `visdev.tsx`, `loras.tsx`, `stages.tsx`, `preview.tsx`, `series.tsx` now take
their series content as props and render empty states for a blank series. Two new affordances make
the blank-series loop drivable:
- **Add character** in Narrative → Characters.
- **Add subject** in Visual Dev, plus auto-creation of a subject from a character when you click
  **"Develop in Visual Dev"** in Narrative — so the loop connects:
  add character → appearance → generate variant → lock canonical (the existing `lockVariant`
  already writes `visdevCanonical` + `characterPortrait`, which feeds the Narrative portrait).
`compose.tsx` is content-agnostic (only `mkFx`); it gained a **no-panels empty state** so it no
longer crashes for a blank series.

## Known limitations (see `BACKLOG.md`)
- The **series catalogue** and in-memory `panels`/`characters` are **not persisted across reload**
  — only the store-backed per-series `links`/`appearance`/`visdevExtra`/`library` survive. A new
  series disappears on refresh.
- Bible depth fields and co-pilot content are seed/Echo-flavoured only.
- Pre-existing button-nested-in-button warning in the series switcher.

## Verify
`npm run dev:all` → Series → ＋ New series → walk: add character → appearance → Develop in Visual
Dev → Compose ＋ New panel → Publish. Switch to Echo and back to confirm isolation. `npm run build`
type-checks clean.
