// Lore frontmatter schemas. Each lore file is markdown with a YAML frontmatter
// block (the machine-readable identity) plus a prose body (the human read).
//
// The schemas below validate the frontmatter. They are the single contract that
// makes the lore both human-authorable (write nice prose, a few obvious fields)
// and machine-trustworthy (every field is typed, every cross-reference checked).
//
// Design rule: lore OWNS identity. It does not own appearances (narrative owns
// those) or visual variants (the visual workspace owns those). Those planes
// attach to a lore entity by its `id`. See lore/README for the ownership model.
import { z } from 'zod';

// A stable within-series slug. Lowercase, kebab-case. This is the join key that
// narrative (BIBLE / seasons / arcs) and visual (VISDEV / links) reference.
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be lowercase kebab-case (e.g. "the-locus")');

// A typed relationship to another lore entity in the same series. `to` is
// validated against the entity index at load time, so it can never dangle.
const Relationship = z.object({
  to: Id,
  as: z.string().min(1), // e.g. "sister", "owned-by", "home-of"
});

// Authoring status. Drives the "what still needs work" view and lets the
// consolidate step mark provisional entries.
const Status = z.enum(['draft', 'review', 'locked']);

// Every entity shares this core. `type` discriminates the per-type extensions.
const Core = {
  id: Id,
  type: z.string(),
  name: z.string().min(1),
  aka: z.array(z.string()).default([]), // alternate spellings — kills Walan/Wulan drift
  status: Status.default('draft'),
  version: z.union([z.string(), z.number()]).optional(),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
  relationships: z.array(Relationship).default([]),
  // Housekeeping captured ON the entity instead of in a graveyard at the bottom
  // of one giant doc. The loader can surface these as a live open-questions feed.
  open_questions: z.array(z.string()).default([]),
};

export const CharacterSchema = z
  .object({
    ...Core,
    type: z.literal('character'),
    role: z.string().optional(),
    // Canon portrayal rules. Unlike free prose, these are checkable: the
    // narrative copilot can assert every appearance obeys them.
    portrayal: z.array(z.string()).default([]),
  })
  .strict();

export const CitySchema = z
  .object({
    ...Core,
    type: z.literal('city'),
    location: z.string().optional(),
    power: z.string().optional(),
    threat: z.string().optional(),
    population: z.number().optional(),
    banner: z
      .object({ primary: z.string(), secondary: z.string().optional() })
      .partial()
      .optional(),
  })
  .strict();

// The discriminated union the loader validates each file against. New entity
// types (org, location, tech, food, story, glossary) slot in here as the
// migration proceeds — the slice ships character + city to prove the shape.
export const EntitySchema = z.discriminatedUnion('type', [CharacterSchema, CitySchema]);

export type Character = z.infer<typeof CharacterSchema>;
export type City = z.infer<typeof CitySchema>;
export type Entity = z.infer<typeof EntitySchema>;

// A loaded entity = validated frontmatter + the prose body + provenance.
export interface LoreEntity {
  data: Entity;
  body: string; // the markdown prose after the frontmatter
  series: string; // owning series id (from the directory)
  file: string; // repo-relative path, for error messages
}
