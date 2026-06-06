// Registers a template pointing at the all-purpose worker image and creates the
// single endpoint with the network volume attached. Writes the new endpoint id
// into server/.env.
//   node scripts/runpod/create-endpoint.mjs \
//     --image=docker.io/<you>/worker-comfyui-allpurpose:latest \
//     --volume=<networkVolumeId> --dc=US-KS-2
import { readFileSync, writeFileSync } from 'node:fs';
import { rp, arg, ENV_FILE } from './_client.mjs';

const image = arg('image');
const volume = arg('volume', process.env.RUNPOD_NETWORK_VOLUME_ID);
const dc = arg('dc', process.env.RUNPOD_S3_REGION || 'US-KS-2');
const name = arg('name', 'wordwerx-allpurpose');
const registryAuthId = arg('registryAuthId', process.env.RUNPOD_REGISTRY_AUTH_ID);
// Flux + training want a roomy (>=24-48GB) GPU. IMPORTANT: the endpoint is
// pinned to the network volume's datacenter, so these MUST be GPUs that the DC
// actually stocks. US-KS-2 (an S3 datacenter) stocks A100 80GB / H100 / RTX PRO
// 6000 Blackwell — NOT L40S/A6000/4090. Check stock per DC before changing.
const gpuTypeIds = (arg('gpus', 'NVIDIA A100 80GB PCIe,NVIDIA H100 PCIe,NVIDIA A100-SXM4-80GB,NVIDIA H100 NVL,NVIDIA RTX PRO 6000 Blackwell Server Edition')).split(',');

if (!image) { console.error('Provide --image=<registry/image:tag>'); process.exit(1); }
if (!volume) { console.error('Provide --volume=<networkVolumeId> (or set it in server/.env)'); process.exit(1); }

// 1) Template
const tmpl = await rp('POST', '/templates', {
  name: `${name}-tmpl`,
  imageName: image,
  isServerless: true,
  containerDiskInGb: 20,
  // env is an object map per the RunPod OpenAPI schema.
  env: { REFRESH_WORKER: 'false' },
  ...(registryAuthId ? { containerRegistryAuthId: registryAuthId } : {}),
});
console.log(`Template ${tmpl.id}`);

// 2) Endpoint with the volume attached (datacenter pinned by the volume).
const ep = await rp('POST', '/endpoints', {
  name,
  templateId: tmpl.id,
  computeType: 'GPU',
  gpuTypeIds,
  networkVolumeId: volume,
  dataCenterIds: [dc],
  workersMin: 0,
  workersMax: 3,
  idleTimeout: 5,
  flashboot: true,
  scalerType: 'QUEUE_DELAY',
  scalerValue: 4,
});
console.log(`Endpoint ${ep.id}`);

// 3) Persist endpoint id into server/.env
let env = readFileSync(ENV_FILE, 'utf8');
env = /^RUNPOD_ENDPOINT_ID=.*$/m.test(env)
  ? env.replace(/^RUNPOD_ENDPOINT_ID=.*$/m, `RUNPOD_ENDPOINT_ID=${ep.id}`)
  : env + `\nRUNPOD_ENDPOINT_ID=${ep.id}\n`;
writeFileSync(ENV_FILE, env);
console.log(`\nWrote RUNPOD_ENDPOINT_ID=${ep.id} to server/.env. The all-purpose endpoint is live.`);
