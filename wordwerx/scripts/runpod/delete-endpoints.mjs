// Deletes the named existing endpoints (and optionally their templates).
// SAFETY: requires explicit ids AND --confirm. Run list-endpoints.mjs first.
//   node scripts/runpod/delete-endpoints.mjs --ids=ID1,ID2 --confirm
import { rp, arg, confirmFlag } from './_client.mjs';

const ids = (arg('ids', '') || '').split(',').map(s => s.trim()).filter(Boolean);
if (!ids.length) {
  console.error('Provide --ids=ID1,ID2 (see list-endpoints.mjs).');
  process.exit(1);
}
if (!confirmFlag()) {
  console.error(`Refusing to delete without --confirm. Would delete: ${ids.join(', ')}`);
  process.exit(1);
}

const templateIds = (arg('templates', '') || '').split(',').map(s => s.trim()).filter(Boolean);

for (const id of ids) {
  // Capture the endpoint's template before deletion (for optional cleanup).
  let tmpl;
  try { tmpl = (await rp('GET', `/endpoints/${id}`)).templateId; } catch { /* ignore */ }
  // Scale to zero first (some endpoints reject deletion while workers exist).
  try { await rp('PATCH', `/endpoints/${id}`, { workersMin: 0, workersMax: 0 }); } catch (e) { console.warn(`  (scale-down skipped: ${e.message})`); }
  await rp('DELETE', `/endpoints/${id}`);
  console.log(`Deleted endpoint ${id}`);
  if (tmpl && !templateIds.includes(tmpl)) templateIds.push(tmpl);
}

if (templateIds.length) {
  for (const tid of templateIds) {
    try { await rp('DELETE', `/templates/${tid}`); console.log(`Deleted template ${tid}`); }
    catch (e) { console.warn(`  (template ${tid} not deleted: ${e.message})`); }
  }
}
console.log('\nDone. Verify in the console that only the intended endpoints remain.');
