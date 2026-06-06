// Creates the network volume that holds all models + LoRAs.
// Must be in an S3-enabled datacenter (US-KS-2, EU-CZ-1, US-CA-2) so the app
// can upload/list LoRAs via the S3 API.
//   node scripts/runpod/create-volume.mjs --name=wordwerx-models --size=250 --dc=US-KS-2
import { rp, arg } from './_client.mjs';

const name = arg('name', 'wordwerx-models');
const size = Number(arg('size', '250'));        // GB
const dataCenterId = arg('dc', 'US-KS-2');

const S3_DCS = ['US-KS-2', 'EU-CZ-1', 'US-CA-2'];
if (!S3_DCS.includes(dataCenterId)) {
  console.warn(`WARNING: ${dataCenterId} is not S3-enabled. LoRA upload needs one of ${S3_DCS.join(', ')}.`);
}

const vol = await rp('POST', '/networkvolumes', { name, size, dataCenterId });
console.log(`Created network volume "${name}"  id=${vol.id}  size=${size}GB  dc=${dataCenterId}`);
console.log('\nAdd to server/.env:');
console.log(`  RUNPOD_NETWORK_VOLUME_ID=${vol.id}`);
console.log(`  RUNPOD_S3_ENDPOINT=https://s3api-${dataCenterId.toLowerCase()}.runpod.io`);
console.log(`  RUNPOD_S3_REGION=${dataCenterId}`);
console.log('\nNext: seed-models.mjs, then create-endpoint.mjs --volume=' + vol.id);
