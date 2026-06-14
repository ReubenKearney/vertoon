# WORDWERX — guide for AI agents

A creative workbench for **vertoons** (vertical-scroll animated comics): write a
series, develop its look, generate art on a cloud GPU, compose, preview, publish.
Seed series: **"Echo's Location."**

Read [README.md](README.md) for the full tour. This file is the fast orientation
plus the rules that keep you from breaking things.

## ⚠️ Ignore the `../project/` handoff docs

`../project/` (`HANDOFF.md`, `VISUAL_DEV_HANDOFF.md`, `CLAUDE.md`, `README.md`,
`chats/`) is a **historical design-handoff bundle**. It describes a dead
prototype: a single `WORDWERX.html` with inline React + Babel, `app/*.jsx` files,
and `window.*` sharing. **None of that exists anymore** — the app was rebuilt as
the Vite + React + TypeScript project you're in. Don't follow those docs, and
don't reintroduce `app/*.jsx` or `window.*` globals.

## Architecture

- **Frontend** — Vite + React 19 + TypeScript SPA in `src/`. Real ES modules.
  `src/App.tsx` is the shell and owns almost all state.
- **Companion server** — Express in `server/`. Holds the RunPod + S3 secrets
  (never sent to the browser) and serves `/api`. Also the offline asset/state
  store (`server/store/`).
- **Lore pipeline** — `lore/`: per-series markdown world repo → zod-validated →
  `src/lore.generated.ts`.
- **Generation** — workflow-agnostic ComfyUI on RunPod Serverless. See
  [RUNPOD_SETUP.md](RUNPOD_SETUP.md).

Vite proxies `/api` → `localhost:8787`. Offline-first: only generation needs the
cloud; everything else fails soft when the server is unreachable.

## Run / verify

```bash
npm install
npm run dev:all     # Vite (5173) + companion server (8787)
npm run lore:gen    # after editing any lore/*.md
npm run build       # tsc -b && vite build — the typecheck
npm run lint
```

Needs `server/.env` (copy `server/.env.example`, keep `PORT=8787`). There is **no
test suite** — verify changes by running the app or `npm run build`.

## Conventions (match the existing code)

- **State lives in `App.tsx`**, namespaced per series (`panelsBySeries`, etc.)
  and resolved through `getSeriesContent(activeSeries)` (`src/series-data.ts`).
  New editable content follows that pattern and persists to the server (debounced)
  → re-hydrates on load. Don't hardcode the Echo seed inside components; go
  through `series-data.ts`.
- **Built-in seed data** is hand-authored TS in `src/world.ts`
  (`SERIES/SEASONS/ARCS/BIBLE/VISDEV/COPILOT_X`) and `src/data.ts`. Echo is fully
  spec'd; siblings are light.
- **Server calls** go through `src/services/*` (`store`, `runpod`, `lore`,
  `online`, `publish`, `trainset`) — not inline `fetch`. They already fail soft
  offline.
- **Artwork** uses the CSS-only `<Scene kind="…">` / `<SeriesCover>` from
  `src/scenes.tsx` — never a raw `<img>` for panel art.
- **Styling** — base tokens in `src/styles.css` (don't edit); add to
  `src/styles2.css`. Class prefix `ww-`. Accent `#2563EB`; teal `#16d6b4` marks
  locked / active states.
- **The Sherlock co-pilot (`src/copilot.tsx`) is a mock** — keyword `improvise()`
  + canned `COPILOT` / `COPILOT_X` seeds tuned for Echo. There is **no live LLM
  call.** Keep replies honest for non-Echo series (it already falls back to a
  generic reply when `seed` is off).

## Lore — the one subsystem with strict validation

`lore/<series>/<type>/<id>.md` = YAML frontmatter (zod-checked in
`lore/_schema.ts`) + prose body. The contract: `id` is the per-series join key,
and every `relationships.to` must resolve or the build fails.

- Edit a file → `npm run lore:gen` (validates, then rewrites `CONSOLIDATED.md` and
  `src/lore.generated.ts`).
- Or edit live in-app (**Narrative → Lore**) → `POST/PUT/DELETE /api/lore` writes
  the markdown, re-validates the whole series, regenerates the bundle, and **rolls
  the file back** if validation fails (`lore/_store.ts`).
- `world.ts` is **not** yet derived from lore — the two run side by side and join
  by `id` at use-site. See [lore/README.md](lore/README.md).

## Map

| Path | Role |
|---|---|
| `src/App.tsx` | shell: navigator, per-series state, persistence, undo/redo |
| `src/{narrative,visdev,series,compose,preview,stages,lore,loras}.tsx` | the four workspaces' pages |
| `src/{world,data,series-data}.ts` | seed registry + per-series content resolver |
| `src/services/` · `src/workflows/` | API layer + ComfyUI workflow builders |
| `src/copilot.tsx` · `src/scenes.tsx` | mock co-pilot · CSS-only artwork |
| `server/` | Express: secrets, `/api`, offline store (`store/db.json` + `assets/`) |
| `lore/` | markdown world repo + `_schema`/`_index`/`_resolve`/`_consolidate`/`_emit`/`_store`/`_gen` |
| `scripts/runpod/` | RunPod endpoint / volume / model provisioning |
| `RUNPOD_SETUP.md` | generation, RunPod, and offline-store guide |
