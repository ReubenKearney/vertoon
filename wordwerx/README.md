# WORDWERX

A creative workbench for **vertoons** — vertical-scroll animated comics. One app
takes a series end to end: write the bible and script, develop each character's
look, generate art on a cloud GPU, compose scroll-driven panels, preview, and
publish a single self-contained page.

The seed series is **"Echo's Location"** — a solarpunk sci-fi mystery about a
city AI (Echo, voice-only, no avatar) and the journalist who stumbles into its
machinery. Echo is fully spec'd; three sibling series ship as light placeholders.

## Stack

- **Frontend** — Vite + React 19 + TypeScript SPA (`src/`). Real ES modules;
  `src/App.tsx` is the shell and owns nearly all state.
- **Companion server** — Express (`server/`). Holds the RunPod + S3 secrets
  (never shipped to the browser) and exposes a small `/api` surface. Doubles as a
  local, offline-first asset + state store.
- **Lore pipeline** — a per-series markdown world repository compiled to a typed
  bundle (`lore/`).
- **Generation** — workflow-agnostic ComfyUI on RunPod Serverless, plus in-app
  LoRA upload + training. See [RUNPOD_SETUP.md](RUNPOD_SETUP.md).

Offline-first: only image generation needs the cloud. Writing, composing,
preview, and publish all work with no internet.

## Run it

```bash
npm install
cp server/.env.example server/.env    # then fill in RunPod secrets — see RUNPOD_SETUP.md
npm run dev:all                       # Vite (5173) + companion server (8787) together
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` →
`http://localhost:8787`, so keep `PORT=8787` in `server/.env`.

| Script | Does |
|---|---|
| `npm run dev:all` | Vite + companion server together — the normal way to run |
| `npm run dev` | Vite only (UI runs; generation/persistence calls fail without the server) |
| `npm run server` | companion server only (`tsx watch server/index.ts`) |
| `npm run lore:gen` | re-validate lore + regenerate `CONSOLIDATED.md` and `src/lore.generated.ts` |
| `npm run build` | `tsc -b && vite build` (also the typecheck) |
| `npm run lint` | ESLint |

> Generation and persistence need the companion server **and** a filled-in
> `server/.env`. Without them the UI still runs; only the network calls fail, and
> they fail soft.

## The app — four workspaces

A single left navigator: a series switcher on top, then four workspaces. The
hierarchy is **Series → Seasons → Episodes → Panels**.

| Workspace | Sub-pages | For |
|---|---|---|
| **Series** ◈ | _(single page)_ | The catalogue: create, configure, and switch the active series; cross-series status. |
| **Narrative** ✎ | Characters · Lore · Seasons · Storyboard · Script | The bible and the writing: cast + portrayal rules, the lore repository, the season/arc board, the beat sheet, the panel-by-panel script. |
| **Visual Dev** ◎ | Prototype board · Model sheets · Locations · LoRAs | Develop and lock each subject's look, build model sheets, and manage character / series LoRAs. |
| **Production** ▦ | Story · Library · Compose · Preview · Publish | The pipeline: generate plates, compose scroll effects on panels, preview, and export. |

**Sherlock**, a context-aware story co-pilot, rides alongside Narrative / Visual
/ Production (off on Series). It is currently a high-fidelity **mock** — canned
and keyword-improvised replies tuned for the Echo seed; it falls back to an
honest generic reply on other series. Per-series tuning is on the way
(`src/copilot.tsx`).

## Data & persistence

- **Built-in registry** — hand-authored TypeScript seed in `src/world.ts`
  (`SERIES`, `SEASONS`, `ARCS`, `BIBLE`, `VISDEV`, `COPILOT_X`) and `src/data.ts`
  (effect vocabulary, co-pilot seeds, Echo's panels/library).
- **Per-series content** — `getSeriesContent(id)` in `src/series-data.ts`
  resolves a series id to its editable bundle (panels, library, cast, bible,
  seasons, arcs, episode, visdev). Only Echo is seeded; every new series starts
  blank. Components read through this, never by hardcoding Echo.
- **State is namespaced per series.** `App.tsx` holds the editable content in
  `…BySeries` maps and persists it to the companion server (debounced); it
  re-hydrates on reload. Undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) spans the
  per-series content.
- **The store** (`server/store/`) — `db.json` (catalogue + per-series state +
  links) and `assets/<id>.png` (generated image bytes). The app references
  compact `/api/assets/<id>` URLs, never base64. Gitignored; `STORE_DIR`
  overrides the location.
- **Links** join an entity id to its visual artefacts: character → LoRA, the
  series-default style LoRA, the locked canonical, portraits, and panel art.

## `/api` surface (companion server)

State, links, and lore routes are namespaced per series via `?series=<id>`
(default `echo`). Generation, store, and offline-first detail in
[RUNPOD_SETUP.md](RUNPOD_SETUP.md).

| Group | Routes |
|---|---|
| Health | `GET /api/health` |
| Assets | `POST` · `GET` · `DELETE /api/assets[/:id]` |
| Catalogue | `GET` · `PUT /api/series` |
| State + links | `GET` · `PATCH /api/state` · `POST /api/links/:category` · `POST /api/series-lora` |
| Lore | `GET` · `POST /api/lore` · `PUT` · `DELETE /api/lore/:id` |
| Generation | `POST /api/generate` · `GET /api/jobs/:id` · `POST /api/jobs/:id/cancel` · `GET /api/balance` |
| LoRAs | `GET` · `POST` · `DELETE /api/loras[/:name]` · `POST /api/loras/train` |

## Subsystem docs

- **[RUNPOD_SETUP.md](RUNPOD_SETUP.md)** — provisioning the ComfyUI endpoint +
  network volume, the offline asset store, and every gotcha baked into
  `scripts/runpod/`.
- **[lore/README.md](lore/README.md)** — the lore data model, the
  frontmatter-as-contract design, and the `lore:gen` pipeline.

## Layout

```
wordwerx/
  src/                 React SPA
    App.tsx            shell: navigator, per-series state, persistence, undo/redo
    world.ts           built-in registry (SERIES/SEASONS/ARCS/BIBLE/VISDEV/COPILOT_X)
    series-data.ts     getSeriesContent() — per-series editable bundle
    data.ts            effect vocabulary, COPILOT seeds, Echo panels/library
    narrative.tsx visdev.tsx series.tsx compose.tsx preview.tsx stages.tsx
    lore.tsx           the Lore workspace (CRUD over /api/lore)
    loras.tsx          the LoRA manager (Visual Dev → LoRAs)
    copilot.tsx        Sherlock (mock co-pilot)
    scenes.tsx         CSS-only "Scene" artwork by kind
    services/          HTTP layer (store · runpod · lore · online · publish · trainset)
    workflows/         per-use-case ComfyUI workflow builders
    lore.generated.ts  GENERATED by lore:gen — do not edit
  server/              Express companion server (secrets + offline store)
  lore/                per-series markdown world repository + build pipeline
  scripts/runpod/      RunPod provisioning scripts
  RUNPOD_SETUP.md      generation / RunPod / offline-store guide
```

> Working with an AI agent in this repo? See [CLAUDE.md](CLAUDE.md). The
> `../project/` folder is a historical design-handoff bundle — it describes an
> earlier prototype and no longer matches the code.
