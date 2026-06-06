// Lists current serverless endpoints + templates so you can confirm which two
// to delete before running delete-endpoints.mjs.
//   node scripts/runpod/list-endpoints.mjs
import { rp } from './_client.mjs';

const endpoints = await rp('GET', '/endpoints');
console.log('\n=== Serverless endpoints ===');
for (const e of endpoints) {
  console.log(`- ${e.name}  id=${e.id}  template=${e.templateId || '-'}  volume=${e.networkVolumeId || '-'}`);
}
console.log(`\n${endpoints.length} endpoint(s).`);
console.log('\nNext: confirm the two ids to remove, then:');
console.log('  node scripts/runpod/delete-endpoints.mjs --ids=ID1,ID2 --confirm\n');
