# WORDWERX — backlog

## ✅ Done — Vertoon-crafting UX overhaul (webtoon conventions + dynamic-feature impact) — 2026-06-13
Branch `feat/vertoon-ux-overhaul`. Made the crafting UX intuitive by (a) supporting the main webtoon
layout/design conventions and (b) making vertoon's dynamic features visible and discoverable. Seven
shippable phases, all built clean (`npm run build`) and verified end-to-end in a headless-Chrome
drive of the live app (23/23 checks): undo/redo, drag-reorder, gutter, real art in Preview + scrubber,
on-canvas text, presets, baked-motion export — each confirmed in Compose, Preview, **and** the offline
`.html` export.

### What shipped
1. **On-canvas text objects** (`src/text-objects.tsx`) — speech bubbles, captions, SFX placed/dragged/
   resized on the panel, with a tail handle and delivery-driven visual variants (Shouted → jagged,
   Whispered → dashed/faded, Thought → cloud+dots, Voice-over → squared box). Dialogue/caption objects
   are **placement records only**; their text always reads from `panel.dialogue`/`panel.caption`, so the
   Script tab stays the single writing surface and the two can't diverge. Extra balloons + SFX own their
   text. One hook-free renderer (`TextObjectStatic`) + one stylesheet (`TEXT_OBJECT_CSS`) drive Compose,
   Preview, and the export — the export uses `renderToStaticMarkup` (`react-dom` was already a dep).
2. **Undo/redo** (`src/use-history.ts`) — `Ctrl+Z`/`Ctrl+Shift+Z`/`Ctrl+Y`, per-series, change-grouped
   (~500 ms) so typing isn't undone per keystroke, and **skipped inside text fields** so native field
   undo still works. Restores through the existing per-series setters → the 600 ms autosave persists it.
3. **Drag-and-drop reordering** — panels (sequence rail) and layers (grip handles), native HTML5 DnD,
   no new deps. ▴▾ buttons kept as a keyboard fallback.
4. **Per-panel gutter** (`panel.gap`) — the core webtoon pacing/whitespace tool, honored identically in
   the Compose filmstrip (hatched strip when selected), Preview, and the export.
5. **Real layer art in Preview + in-Compose scrubber** (`src/panel-art.tsx`) — see gotcha #1. `ScrubBar`
   replays a panel's reveal/parallax/transition without leaving Compose, reusing `parallaxOffset`.
6. **Effect presets** (`FX_PRESETS` in `data.ts`, `PresetRow` in `effects.tsx`) — one-click curated fx
   stacks; applying replaces existing fx of the same types (no duplicate stacks).
7. **Baked motion in the export** — parallax + reveals + transitions now ship in the offline `.html`
   (previously only a fixed fade), behind a "Bake motion" toggle (default on) and a
   `prefers-reduced-motion` guard. Tap + pacing deliberately **not** baked (tap payload is demo-only;
   scroll-lock pacing fights an arbitrary reader's native scroll).

### Data model (backward-compatible, zero server changes)
New panel fields `gap?` and `textObjects?` are both optional. The server PATCH treats `state.panels`
as opaque, so nothing server-side changed; backward compatibility is pure client-side defaulting via
`effectiveTextObjects(panel)`, which materialises default-positioned bubbles from the dialogue/caption
fields for any panel that has never been touched. A pre-existing Echo series hydrates unchanged.

### Gotchas / lessons learnt
- **Preview never showed the user's art.** It rendered only procedural `<Scene>` placeholders and
  wasn't even passed `links` — so parallax, the flagship feature, was literally invisible on real
  artwork everywhere except the flat Compose thumbnail. `PanelArt` + threading `links` into `<Preview>`
  was a hidden prerequisite for both the scrubber (5) and the baked export (7).
- **Layer art is keyed by index** (`links.layerImage["{panelId}:{i}"]`). Any layer reorder *or delete*
  must remap those keys or art jumps between layers — the **delete case was a pre-existing live bug**
  (deleting a middle layer orphaned/shifted assignments). Both fixed via `syncLayerLinks`.
- **The editable text wrapper collapsed to zero height.** The shared static `.ww-to` is
  `position:absolute`, so the `.ww-to-edit` wrapper had no in-flow content → its selection outline and
  hit area were a zero-height box. Drag still *worked* (DOM event bubbling ignores layout), which is why
  it was easy to miss. Fixed editor-only: `.ww-to-edit .ww-to{position:relative}` — the static surfaces
  (Preview/export) keep absolute positioning untouched.
- **`TextObjectStatic` must stay hook-free** so `renderToStaticMarkup` can reuse it in the export.
  Only the editable wrapper uses state/refs.
- **Parallax math is duplicated** in the export's vanilla rAF loop (no React in the `.html`). It's
  ported verbatim from `preview-engine.ts` and both copies carry a "keep in sync" comment.
- **Verification gotchas** (for the next headless drive): clicking a panel card that has assigned art
  opens the zoom **lightbox**, which then intercepts later clicks — select panels via the `.ww-seqitem`
  rail instead. Post-reload **hydration is async** (a `getState` round-trip), so wait for real art to
  appear rather than a fixed sleep, or the check races the pre-hydration registry seed.

### Known cosmetic follow-ups (not blockers)
- Bubble rotation / free-transform, canvas zoom, snapping guides, and multi-select are out of scope.
- Sound effects still have no audio playback (no audio assets exist) — markers only.
- The new code follows the repo's existing `any` convention (lint debt below).

---

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
