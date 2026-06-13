// The join. Given a lore entity id, assemble the unified view across all three
// planes by the shared id:
//   - lore       (identity + prose + portrayal rules)   ← this package
//   - narrative  (which episodes/arcs mention the id)    ← src/world.ts
//   - visual     (visdev variants for the id)            ← src/world.ts
//
// This is the concrete demonstration that one entity (e.g. "echo") is mentioned
// in all three and resolves with zero duplication: each plane is read where it
// is authored and stitched together only here.
import type { LoreEntity, SeriesLore } from './_index';
import { SEASONS, ARCS, VISDEV } from '../src/world';

export interface ResolvedEntity {
  id: string;
  lore: LoreEntity;
  narrative: {
    appearances: Array<{ episode: string; title: string; via: 'log' | 'beat' }>;
    arcs: string[];
  };
  visual: {
    visdevId: string | null;
    lockedVariant: string | null;
    variantCount: number;
  };
  // Portrayal rules that the narrative copilot can later assert per appearance.
  portrayal: string[];
  warnings: string[];
}

// Narrative appearances: scan the seasons board and arc beats for the id or the
// entity name. Authored once in world.ts; never duplicated into the lore file.
function narrativeFor(id: string, name: string, series: string) {
  const appearances: ResolvedEntity['narrative']['appearances'] = [];
  const rx = new RegExp(`\\b${name}\\b`, 'i');

  for (const s of SEASONS as any[]) {
    if (s.series !== series) continue;
    for (const ep of s.episodes as any[]) {
      if (rx.test(ep.log || '')) {
        appearances.push({ episode: ep.id, title: ep.title, via: 'log' });
      }
    }
  }

  const arcs: string[] = [];
  for (const a of ARCS as any[]) {
    // Arc ids in the seed map 1:1 to entity ids for character-arcs (echo, indu,
    // rajni); also catch beats that mention the name.
    const beatHit = Object.values(a.beats || {}).some((b) => rx.test(String(b)));
    if (a.id === id || beatHit) arcs.push(a.label || a.id);
  }

  return { appearances, arcs };
}

function visualFor(id: string) {
  const v = (VISDEV as any[]).find((x) => x.id === id);
  if (!v) return { visdevId: null, lockedVariant: null, variantCount: 0 };
  return {
    visdevId: v.id,
    lockedVariant: v.locked ?? null,
    variantCount: (v.variants || []).length,
  };
}

export function resolveEntity(lore: SeriesLore, id: string): ResolvedEntity {
  const entity = lore.byId.get(id);
  if (!entity) throw new Error(`No lore entity "${id}" in series "${lore.series}"`);

  const name = entity.data.name;
  const narrative = narrativeFor(id, name, lore.series);
  const visual = visualFor(id);
  const portrayal = entity.data.type === 'character' ? entity.data.portrayal : [];

  const warnings: string[] = [];
  if (entity.data.type === 'character' && !visual.visdevId) {
    warnings.push(`character "${id}" has no visual-dev entry`);
  }
  if (entity.data.type === 'character' && narrative.appearances.length === 0) {
    warnings.push(`character "${id}" does not appear in any episode log`);
  }

  return { id, lore: entity, narrative, visual, portrayal, warnings };
}
