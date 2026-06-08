# WORDWERX — backlog (next-session items)

## Series configuration — create a blank series from scratch (test end-to-end)
**Next session.** Walk through the **Series** workspace (`src/series.tsx`) and
create a brand-new, *blank* series from scratch, then drive it through the whole
workbench to confirm everything works for a non-seed series.

Why: today the app is hardcoded to the seed series **"Echo's Location"** (`isEcho`
in `src/App.tsx`). Every other series renders `PlaceholderWS` — Narrative, Visual
Dev, Compose, Publish, and the image/asset wiring only light up for `echo`. The
store links (`characterLora`, `visdevVariant`, `panelImage`, `layerImage`, …) and
the `visdevExtra`/`appearance`/`library` state are also effectively global, not
scoped per series.

To do:
- Add a "New series" flow that creates an empty series (no seed characters/
  panels/visdev) and makes it the active one.
- Make Narrative / Visual Dev / Compose / Publish work for *any* active series,
  not just `echo` (remove/relax the `isEcho` gate; provide empty-state UIs).
- Scope persisted state + store links **per series** (key by series id) so a new
  series starts blank and doesn't share Echo's characters/assets/links.
- Verify the full loop on the blank series: add a character → write appearance →
  Visual Dev generate variant → lock canonical → model sheet poses → LoRA →
  Compose panels + assign layer art → Publish offline export.

Files: `src/series.tsx`, `src/App.tsx` (series gating + per-series state), `src/world.ts`/`src/data.ts` (seed vs blank), `src/services/store.ts` + `server/store.ts` (per-series link namespacing).
