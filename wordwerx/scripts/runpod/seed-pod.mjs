// Seeds the network volume by spinning up a cheap CPU pod with the volume
// mounted at /workspace, downloading base models at datacenter speed, then
// terminating the pod. SDXL is open; Flux weights are gated (set HF_TOKEN +
// accept licenses on HF). Usage:
//   node scripts/runpod/seed-pod.mjs --volume=<id> --set=sdxl
//   node scripts/runpod/seed-pod.mjs --volume=<id> --set=flux   (needs HF_TOKEN)
import { rp, arg } from './_client.mjs';

const volume = arg('volume', process.env.RUNPOD_NETWORK_VOLUME_ID);
const dc = arg('dc', process.env.RUNPOD_S3_REGION || 'US-KS-2');
const set = arg('set', 'sdxl');
const hf = process.env.HF_TOKEN || '';
if (!volume) { console.error('Provide --volume=<networkVolumeId>'); process.exit(1); }

const SETS = {
  sdxl: [
    ['checkpoints', 'sd_xl_base_1.0.safetensors', 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors'],
  ],
  flux: [
    ['unet', 'flux1-dev.safetensors', 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors'],
    ['vae', 'ae.safetensors', 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors'],
    ['clip', 'clip_l.safetensors', 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors'],
    ['clip', 't5xxl_fp16.safetensors', 'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors'],
    ['style_models', 'flux1-redux-dev.safetensors', 'https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev/resolve/main/flux1-redux-dev.safetensors'],
    ['unet', 'flux1-kontext-dev.safetensors', 'https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev/resolve/main/flux1-kontext-dev.safetensors'],
    ['unet', 'flux1-fill-dev.safetensors', 'https://huggingface.co/black-forest-labs/FLUX.1-Fill-dev/resolve/main/flux1-fill-dev.safetensors'],
  ],
};
const items = SETS[set];
if (!items) { console.error(`Unknown --set=${set} (sdxl|flux)`); process.exit(1); }

const dirs = ['checkpoints', 'unet', 'clip', 'vae', 'loras', 'controlnet', 'ipadapter', 'style_models', 'embeddings', 'clip_vision', 'upscale_models'];
const auth = hf ? `--header="Authorization: Bearer ${hf}"` : '';
const lines = [
  'set -e',
  'apk add --no-cache wget ca-certificates >/dev/null',
  `mkdir -p ${dirs.map(d => `/workspace/models/${d}`).join(' ')}`,
];
for (const [folder, file, url] of items) {
  lines.push(`[ -f /workspace/models/${folder}/${file} ] || wget ${auth} -q -O /workspace/models/${folder}/${file} "${url}"`);
}
lines.push('echo SEED_OK > /workspace/seed_done.txt');
lines.push('echo "==SEED COMPLETE=="');
const script = lines.join(' && ').replace(/ && set -e/, '; set -e');

const pod = await rp('POST', '/pods', {
  name: `seed-${set}`,
  computeType: 'CPU',
  // Try every CPU flavor — availability in S3 datacenters fluctuates.
  cpuFlavorIds: ['cpu3g', 'cpu5g', 'cpu3c', 'cpu5c', 'cpu3m', 'cpu5m'],
  vcpuCount: 2,
  dataCenterIds: [dc],
  networkVolumeId: volume,
  volumeMountPath: '/workspace',
  imageName: 'alpine:3.20',
  containerDiskInGb: 10,
  dockerStartCmd: ['/bin/sh', '-c', script],
});
console.log(`Pod ${pod.id} created (set=${set}). It downloads then exits.`);
console.log(JSON.stringify({ id: pod.id, desiredStatus: pod.desiredStatus, lastStatus: pod.lastStatus, status: pod.status }, null, 0));
