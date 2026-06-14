# Lore

The canonical, per-series world repository. Each lore entity is a markdown file:
**YAML frontmatter** (machine-readable identity) + **prose body** (the human
read). You author small, beautiful, git-diffable files; a build step validates
them and emits everything the app and the docs need.

## Layout

```
lore/
  _schema.ts        Zod schemas (one per entity type) — the contract
  _index.ts         loader: read + validate + enforce unique ids + check links
  _resolve.ts       the join: lore ↔ narrative ↔ visual by shared id
  _consolidate.ts   emits the single CONSOLIDATED.md per series
  _gen.ts           build entry — `npm run lore:gen`
  <series>/         one folder per series (echo, tide, quartz, …)
    characters/  cities/  orgs/  locations/  tech/  food/  story/  glossary/
    CONSOLIDATED.md   GENERATED — do not hand-edit
```

Run `npm run lore:gen` after editing. It writes each `CONSOLIDATED.md` and
`src/lore.generated.ts` (the typed bundle the app imports — no runtime parsing).

## The ownership model (why there's no duplication)

An entity exists on three planes. Each fact is authored **once**, where it lives,
and the planes join on a shared per-series `id`:

| Fact                                             | Authored in                | Keyed on   |
| ------------------------------------------------ | -------------------------- | ---------- |
| Identity — name, aka, prose, portrayal, relationships | **lore** (this folder)     | `id`       |
| Appearances & beats — which episodes/arcs        | **narrative** (`src/world.ts`) | references `id` |
| Variants, locked ref, LoRA, portrait, palette    | **visual** (`VISDEV` + links)  | references `id` |

So `echo` is one entity mentioned in all three: the lore file declares who Echo
is; the seasons board says which episodes she's in; the visual board holds her
plates. `_resolve.ts` stitches them together on demand. `npm run lore:gen` prints
the unified card for `echo` as a proof of this join.

## Field model

Every entity file is **YAML frontmatter + prose body**. Frontmatter is validated
**strictly** (unknown keys are rejected) against the schema in `_schema.ts`:

- **Shared core** — required and identical for every type, because the loader
  relies on them for all entities:
  - `id` — lowercase kebab-case, unique within the series (the join key)
  - `type` — one of `character`, `city`, `org`, `location`, `tech`, `food`,
    `story`, `glossary`
  - `name` — display name
  - `relationships` — `{ to, as }[]`; every `to` must resolve to a real entity
    in the same series (default `[]`)
- **Optional metadata** — allowed on any type, never required: `aka` (default
  `[]`), `status` (`draft` | `review` | `locked`, default `draft`), `version`,
  `open_questions` (default `[]`).
- **Type-specific** —
  - `character`: `role`, `portrayal` (default `[]`)
  - `city`: `location`, `power`, `threat`, `population`, `banner`
    (`{ primary?, secondary? }`)
  - `org` / `location` / `tech` / `food` / `story` / `glossary`: no extra fields
    yet — core + metadata only.

The prose body (everything after the frontmatter) is free markdown and optional.

## Authoring rules

- **`id`** is lowercase kebab-case and unique within a series. It is the join
  key — changing it is a rename across all three planes.
- **`aka`** captures alternate spellings (e.g. Wulan's `[Walan]`) so stray
  references can be caught instead of silently drifting.
- **`relationships`** targets are validated — a link to a non-existent entity
  fails the build. (This is why a partial slice trims relationships to migrated
  entities; they're restored as the targets land.)
- **`portrayal`** holds canon rules as discrete, checkable statements (vs free
  prose), so the narrative copilot can assert each appearance obeys them.
- **`open_questions`** lives on the entity, not in a graveyard at the bottom of
  one doc. The consolidate step gathers them into a live "Open Canon Questions"
  list.

## Status of the migration

Shipped: schemas for all entity types (`character`, `city`, `org`, `location`,
`tech`, `food`, `story`, `glossary`), the loader/resolver/consolidate/gen
pipeline, and three real files (`echo`, `wulan`, `sulawesi`). `character` and
`city` carry type-specific fields; the rest are core + metadata only until they
need their own. Remaining work: porting the rest of the canon doc, and wiring
`src/world.ts` to derive `BIBLE`/`SERIES` from `LORE` so there is a single
source of truth.
