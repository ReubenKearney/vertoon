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

## ✅ Done — From-scratch series hardening — 2026-06-12
Direct on `main`. Audit of the create-a-series-from-scratch flow (first time exercised since the
wireframe handoff) found three real defects and a cluster of Echo leftovers; all fixed and verified
end-to-end in a headless-browser walkthrough (12/12 checks + 4/4 edge probes — create series → add
character → dialogue speaker → seasons/arc edits → config drawer → reload → Echo isolation).

### 1. Season/Arc board edits persist per series ✅
`ArcBoard` is now controlled by App's per-series state (`seasonsBySeries` / `arcsBySeries`, same
pattern as panels/characters), hydrated from and persisted to per-series `SeriesState`
(`seasons` / `arcs` fields in `server/store.ts`). Episode renames, added episodes/throughlines, and
beat cells survive series switches and reloads. Empty-seasons guard added.

### 2. Series config drawer actually saves ✅
`SeriesDrawer` "Save configuration" now passes `{ palette, canon }` through an `onSave` prop into
`setSeries` (persisted by the existing debounced catalogue PUT). Canon rules are editable in the
drawer (one-per-line textarea, same as the create modal).

### 3. De-Echo'd defaults shown to every series ✅
- "＋ Add dialogue" defaulted the speaker to `NEELAI` (an Echo character) — now the first cast
  member, falling back to `NARRATOR` for a zero-cast series.
- Story stage rendered Echo's hardcoded portrayal rules + throughlines for any series — now rendered
  from the active series' `canon` (catalogue) and `arcs` (per-series state), with empty states.
- Beat Sheet "Peak" stat was hardcoded `Crisis · Ep 08` — now computed from the actual beats.
- Script/Beat headers hardcoded "Ep 01" — now `episode.number`.
- Library generation prompt was Echo's world ("Sulawesi access tunnel…") — now starts empty.
- Co-pilot generic reply claimed to be "tuned to Echo's Location" — now names the active series.
- LoRA form placeholders `echo_v1` / `echo` — now generic.

---

## ✅ Done — Episode from scratch, end-to-end with real generation — 2026-06-13
Direct on `main`. The core product loop is now proven for a brand-new series with REAL image
generation (16/16 automated checks, $0.02 RunPod spend): create series → add character + appearance
→ Visual Dev: generate variant (SDXL) → lock canonical (portrait flows back to Narrative) → name the
episode on the Seasons board → write panels + dialogue in Script → Library: generate scene art →
Compose: assign art to panel layers → Publish → exported `.html` opened fresh from disk in a
hard-offline browser (all network blocked): both panels render real base64 art, dialogue, scroll
reveal, zero requests, zero errors.

### Fix shipped with this pass
- **Episode metadata follows the Seasons board** — `episode.title` was hardcoded `'Untitled episode'`
  in `blankContent` with no way to change it, so every new-series export shipped untitled. App now
  derives the episode from the first episode of the first season (no Echo regression — its seed
  titles already matched).

### Notes
- `server/.env` must hold `RUNPOD_API_KEY` (see RUNPOD_SETUP.md). It is gitignored with no history —
  **edit it in place, never recreate it**; a blank-secrets rewrite during an earlier session is how
  the key went missing.
- Known cosmetic gaps, not blockers: the Generate button is enabled even when the endpoint/key is
  missing (`canGenerate` only checks reachability — errors surface at click time); the Publish poster
  thumbnail only reads legacy `panelImage` links, so layer-assigned art doesn't preview there.

---

## Next session

### Lint debt (carried over)
The repo fails `@typescript-eslint/no-explicit-any` across the board (≈398 errors, incl. untouched
files like `world.ts:1`). New per-series code follows the same `any` convention. `npm run build`
type-checks clean; only `npm run lint` fails. Cleaning it is a dedicated typing pass — not specific
to any feature — so it's deliberately left out of the persistence work.

### Smaller leftovers
- **Relationships editing** in the bible is still read-only (the rest of the bible is editable now).
- **Scene system is still Echo's** — `SCRIPT_SCENES` / `COVER_SCENES` and the panel default scene
  (`tunnels`) are the seed series' procedural placeholder vectors. They work as generic placeholders
  until real art is assigned; a per-series scene library is a feature, not a bug fix.
- **Co-pilot is canned** — non-Echo series get an honest generic reply; real per-series AI tuning is
  future work.
- App initially mounts with `activeSeries='echo'` (invisible — landing page is the Series hub).
