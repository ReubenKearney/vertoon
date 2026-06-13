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
| Identity — name, aka, palette, prose, portrayal, relationships | **lore** (this folder)     | `id`       |
| Appearances & beats — which episodes/arcs        | **narrative** (`src/world.ts`) | references `id` |
| Variants, locked ref, LoRA, portrait             | **visual** (`VISDEV` + links)  | references `id` |

So `echo` is one entity mentioned in all three: the lore file declares who Echo
is; the seasons board says which episodes she's in; the visual board holds her
plates. `_resolve.ts` stitches them together on demand. `npm run lore:gen` prints
the unified card for `echo` as a proof of this join.

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

Slice shipped: `character` + `city` schemas, the loader/resolver/consolidate/gen
pipeline, and three real files (`echo`, `wulan`, `sulawesi`). Remaining work:
the other entity types (org, location, tech, food, story, glossary), porting the
rest of the canon doc, and wiring `src/world.ts` to derive `BIBLE`/`SERIES` from
`LORE` so there is a single source of truth.
