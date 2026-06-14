// Build-time entry point: `npm run lore:gen`.
//   1. load + validate all series lore (throws on any schema / id / link error)
//   2. write each series' CONSOLIDATED.md (the human read)
//   3. emit src/lore.generated.ts (the typed bundle the app imports — zero
//      runtime parsing cost, build-time guarantees)
//   4. print the unified resolve() card for one entity as a proof of the join
// Steps 1-3 live in _emit.ts (regenerate) so the server can reuse them.
import { regenerate } from './_emit';
import { loadAllLore } from './_index';
import { resolveEntity } from './_resolve';

function main() {
  const { series, entities } = regenerate();

  // (4) proof of the join for the slice: echo across all three planes.
  const lore = loadAllLore();
  const echo = lore.get('echo');
  if (echo?.byId.has('echo')) {
    const r = resolveEntity(echo, 'echo');
    console.log('\n— unified entity card (proves lore ↔ narrative ↔ visual join) —');
    console.log(`  id:        ${r.id}  (${r.lore.data.name})`);
    console.log(`  lore:      ${r.lore.file}  [${r.lore.data.status}]`);
    console.log(`  narrative: appears in ${r.narrative.appearances.length} ep(s): ` +
      r.narrative.appearances.map((a) => a.episode).join(', '));
    console.log(`             arcs: ${r.narrative.arcs.join(' | ')}`);
    console.log(`  visual:    visdev=${r.visual.visdevId} locked=${r.visual.lockedVariant} ` +
      `variants=${r.visual.variantCount}`);
    console.log(`  portrayal: ${r.portrayal.length} canon rule(s)`);
    if (r.warnings.length) console.log(`  warnings:  ${r.warnings.join('; ')}`);
  }

  console.log(`\n✓ lore: ${series} series, ${entities} entities validated → ` +
    `CONSOLIDATED.md + src/lore.generated.ts`);
}

main();
