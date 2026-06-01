# WORDWERX — Workbench Expansion · Build Plan & Hand-off

This file is the source of truth for expanding the WORDWERX vertoon workbench from a
single-episode **Production pipeline** into a full multi-series workbench with four UXs.
Each phase is sized for **one focused session**. Read this file first, do the phase, then
update the "STATUS" + "HAND-OFF NOTES" at the bottom before ending.

---

## 0. The four UXs (what we're building)

1. **Series-level** — create & configure whole comics; cross-series production status.
2. **Narrative** — character bible, season/arc board, episode beat sheet, panel-by-panel script.
3. **Visual Development** — asset prototyping board, character model sheets, lock-to-canonical workflow.
4. **Production pipeline** — the EXISTING 5-stage app (Story · Library · Compose · Preview · Publish). **Do not rebuild.**

## 1. Locked decisions (from the user — do not re-litigate)

- **Navigation:** a single left **navigator** sidebar. Top = **series switcher** (pick the active comic).
  Below it, every **first-level page** (Series overview, Narrative, Visual, Production) and its
  **second-level pages** (sub-tabs) are reachable from the same submenu — workspaces expand to
  reveal their sub-pages. One app, nested nav. (Replaces the old 78px icon rail.)
- **Hierarchy:** Series → Seasons → Episodes → Panels.
- **Scope:** all three new UXs, built **in depth**, but delivered in **distinct phases** (this doc).
- **Variations:** none — commit to ONE strong design per UX.
- **Data:** keep **Echo's Location** fully spec'd; the 3 sibling series stay **light placeholders**.
- **Co-pilot:** present & context-aware in **Narrative + Visual only**. NOT in Series-level. (Stays in Production as today.)
- **Interactivity:** **high fidelity** — create series, edit beats, generate & lock assets all work on mock data.
- **Aesthetic:** locked to the existing system (deep-dark, violet `--accent`/teal `--accent2`,
  Space Grotesk display + JetBrains Mono, phone-frame vertoon vocabulary). Match `app/styles.css`.

## 2a. BRAND (user-supplied logo system — `app/brand/`)

- **Mark:** two interlocking speech bubbles with weaving tails. Top bubble **Charcoal `#1F2937`**
  ("WORD"), bottom bubble **Electric Blue `#2563EB`** ("WERX"), white text. Tagline: *creative workbench for vertoons.*
- Files: `wordwerx-logo.svg` (primary lockup), `wordwerx-compact.svg` (stacked), `wordwerx-icon.svg`
  (bubbles only — use in the nav/avatar), `wordwerx-system.svg` (full sheet).
- **Brand palette:** Charcoal `#1F2937` · Electric Blue `#2563EB` · White `#FFFFFF`.
- **Decision:** default `--accent` shifts from violet `#7b61ff` → **brand blue `#2563EB`**. Violet stays
  as a selectable Tweak option. `--accent2` teal `#16d6b4` stays (cinematic scene colour, not brand).
- Use the `BrandMark` inline-SVG component (the two bubbles) wherever the old `W` logo box was; use the
  full `wordwerx-logo.svg` via `<img>` only in large/marketing spots (e.g. Series header, Publish poster).
- Keep the mark on charcoal/dark backgrounds; the bubbles already read on `--bg`.

## 2. Visual system quick-reference (already in `app/styles.css`)

- Tokens: `--bg #080a10 · --bg2 #0d1018 · --bg3 #141828 · --raise · --line · --ink/ink2/ink3`,
  `--accent #7b61ff · --accent2 #16d6b4`, `--font-disp` (Space Grotesk), `--font-mono` (JetBrains Mono).
- Shared React primitives on `window` (in `app/ui.jsx`): `cx`, `fxColor`, `FxChip`, `StateDot`,
  `AssetThumb`, `PlaceholderTag`.
- `Scene` component (`app/scenes.jsx`) renders atmospheric CSS-only "art" placeholders by `kind`
  (e.g. `dusk_skyline`, `tunnels`, `lantern_hub`, `echo_call`, `rescue`, `logbook`). Reuse for all covers/thumbs.
- `Copilot` (`app/copilot.jsx`) is keyed by a context string; seeds live in `window.COPILOT` (5 production
  stages) and `window.COPILOT_X` (`series`/`narrative`/`visual`). Helper fns `stageLabel/stageHint/pickAction`
  must learn the new contexts when a workspace mounts the co-pilot.

## 3. Data model (already written — `app/world.jsx`, on `window`)

- `SERIES[]` — catalogue. `echo` is `active:true` & fully spec'd; `tide`,`quartz`,`lantern` are light.
  Fields: id,title,genre,tagline,status,hue,cover(scene),format,seasons,episodes,published,panels,
  progress,palette[],styleKey,pov,updated,canon[].
- `SEASONS[]` — Echo S1 "Counting Heads" (6 eps, statuses) + light S2.
- `ARCS[]` — 4 throughlines, each with `.beats{ep1..ep6}` (drives the arc board).
- `BIBLE{charId}` — deep fields: wants,flaw,voice,secret,arc,rels[[toId,label]] (merges onto `CHARACTERS`).
- `VISDEV[]` — subjects (Neelai, Wulan, Echo-voice, Lantern Hub, Resin Logbook): brief, locked(version|null),
  variants[{v,scene,hue,state,note}], sheet{poses[],expressions[],palette[]}, history[{v,when,who}].
- Existing (`app/data.jsx`): `EFFECT_TYPES`, `mkFx`, `CHARACTERS`, `EPISODE`, `PANELS`, `LIBRARY`, `COPILOT`.
  Note `PANELS[0]` (`p0`, scene `parallax_demo`) is a DEMO panel — filter it out of narrative/story views
  (helper `storyPanels()` in `app/narrative.jsx`).

## 4. File map

| File | Role | Status |
|---|---|---|
| `app/world.jsx` | new data (series/seasons/arcs/bible/visdev/copilot_x) | ✅ done |
| `app/styles2.css` | CSS for all 3 new workspaces + new nav | ✅ done |
| `app/series.jsx` | Series workspace (`Series`) | ✅ done (needs wiring) |
| `app/narrative.jsx` | Narrative workspace (`Narrative`) | ✅ first pass (needs wiring + polish) |
| `app/visdev.jsx` | Visual Dev workspace (`VisualDev`) | ❌ not started |
| `app/app.jsx` | shell — MUST be restructured for the navigator | ❌ not started |
| `WORDWERX.html` | script tags — add world/series/narrative/visdev + styles2 | ❌ not wired |

---

## 5. PHASES

### Phase 1 — Nav shell + Series-level  ← DO THIS FIRST
**Goal:** the new navigator works; Series workspace is complete and reachable. Other workspaces can be stubs.
1. Add to `WORDWERX.html`: `<link app/styles2.css>` and `<script>` tags for `world.jsx`, `series.jsx`,
   `narrative.jsx`, `visdev.jsx` (load `world` right after `data`; load the workspace files before `app.jsx`).
2. Restructure `app/app.jsx`:
   - State: `activeSeries` (default `'echo'`), `page` (e.g. `'series'|'narr/cast'|'vis/board'|'prod/compose'`).
   - Left **navigator** (new markup, styled in styles2.css under "navigator"): series switcher button at top
     (shows active series, opens a series menu), then a nested list: **Series overview**, **Narrative**
     (Characters/Arcs/Beats/Script), **Visual** (Prototype board/Model sheets), **Production**
     (Story/Library/Compose/Preview/Publish). Active page highlighted; workspace groups expandable.
   - Topbar: show active series + (for episode pages) the active episode. Keep Preview/Publish actions on Production.
   - Render the right component by `page`. Mount `<Copilot context=...>` ONLY for narrative/visual/production pages.
   - Keep all existing production stage components working exactly as before.
3. Wire `Series` props: `series,setSeries,activeId,setActive,onOpen,flash`. "Open series" sets active +
   routes to `narr/cast` (or production). Creating/configuring already work in `series.jsx`.
4. Co-pilot: extend `app/copilot.jsx` `stageLabel/stageHint/pickAction` to accept `series`(no copilot),
   `narrative`,`visual`. Merge `COPILOT_X` lookups.
5. **Acceptance:** switch active series; create a series (appears in gallery); open configure drawer;
   navigate to every page via the navigator; no console errors; Production unchanged.

### Phase 2 — Narrative (deepen `app/narrative.jsx`)
First pass already exists (Characters/Arcs/Beats/Script). Tighten & extend:
- Characters: portrayal-rules block per series-canon; relationship graph reads well; arc shows mid-point.
- Arcs: confirm board reads down (episode) and across (arc); empty cells de-emphasised.
- Beats: act grouping + tension curve correct; make "Insert beat" actually add a beat (mock) & re-number.
- Script: edits persist to shared `PANELS` (already wired via setPanels) and reflect in Compose/Preview.
- Co-pilot context `narrative` (seeds in `COPILOT_X.narrative`) wired through the shell.
- **Acceptance:** all four sub-pages reachable + interactive; co-pilot answers narrative prompts.

### Phase 3 — Visual Development (build `app/visdev.jsx`, export `VisualDev`)
Data is ready in `VISDEV`. Build two sub-pages + lock workflow:
- **Prototype board:** subject list (left) + variant grid (right). A generate bar adds candidate variants
  (mock, staggered like `Library.generate`). Each non-locked variant has **Lock as canonical** → sets
  `locked`, demotes the previous lock, prepends a history entry. Style-key lock indicator (pinned palette).
- **Model sheets:** for the locked subject — hero plate, pose row, expression row, palette swatches,
  and a **version history** timeline (`history[]`). Empty state when `locked==null` ("nothing locked yet").
- Co-pilot context `visual` (seeds in `COPILOT_X.visual`): off-model flag + "lock the Lantern Hub" actions.
- **Acceptance:** generate variants; lock one (history updates, previous lock demoted); model sheet shows
  the locked reference; co-pilot answers visual prompts.

---

## 6. STATUS  (update at end of each session)

- **2026-05-31 (session 1):** Data + CSS + series/narrative authored.
- **2026-05-31 (session 2): PHASE 1 COMPLETE + brand.** Logo system incorporated (brand assets in
  `app/brand/`, inline `BrandMark` in nav, default accent → electric blue `#2563EB`). `app.jsx`
  rewritten: WORDWERX navigator (brand mark + series switcher menu + nested workspace nav exposing all
  first/second-level pages) + routing + co-pilot contexts (off on Series). `WORDWERX.html` wired
  (`styles2.css`, `world/series/narrative/visdev` scripts). `copilot.jsx` learns narrative/visual.
  Narrative + VisualDev now take controlled `tab/setTab` from the navigator. Sibling series render a
  light `PlaceholderWS`. Series workspace fully interactive (switch / create / configure). Narrative
  first-pass fully reachable & interactive. Verified: no console errors; screenshots good.
- **2026-05-31 (session 3): PHASE 3 COMPLETE.** `app/visdev.jsx` fully built out (replaces scaffold).
  Prototype board: subject sidebar with Scene thumbnails + lock-state dots; variant inspector with
  narrative brief (from `BIBLE`), generate bar, full variant grid (lock/reject/restore actions),
  history timeline. Lock workflow: sets `subject.locked`, demotes previous lock, prepends history,
  fires toast. Model sheets tab: hero art, poses grid, expressions grid (or notes for locations/props),
  palette swatches, lock history; unlocked subjects in "Awaiting lock" list. Deep-link from Characters
  tab ("Develop X's look in Visual Dev →") pre-selects the subject in the board — wired via new
  `visualSelId` state + `preselect` prop in `app.jsx`. Sherlock deerstalker hat icon (replaces pipe).
  All checklist items from `VISUAL_DEV_HANDOFF.md` complete. Verified: no console errors.

## 7. HAND-OFF NOTES  (free-form, latest first)

- **2026-06-01 (session 4): PHASE 2 COMPLETE.** ScriptEditor in `app/narrative.jsx` now has full
  insert/delete/append: `mkPanel`, `rebuild`, `insertAfter(id)`, `del(id)`, `append()` wired to ＋/✕
  buttons per panel and "＋ Add panel at end" footer. Beat-type and scene selectors added to the
  script panel bar. "✕ Remove dialogue" button added as the inverse of "＋ Add dialogue". CSS for
  `.ww-spanel-sel`, `.ww-spanel-ops` added to `styles2.css`. BeatSheet was already fully wired
  (insert/delete/move/rebuild) from a prior session — no changes needed there.
  **All phases complete. No remaining work.**
