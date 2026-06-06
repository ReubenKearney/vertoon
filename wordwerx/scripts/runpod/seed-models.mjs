// Seeds the network volume with the base models for Flux.1-dev, SDXL and Flux
// Kontext/Redux/Fill. Two ways to run this:
//
//  (A) Recommended — run ON a RunPod pod that has the volume mounted at
//      /workspace, where downloads are fast and local. Print the script:
//        node scripts/runpod/seed-models.mjs --print > seed.sh
//      then run seed.sh inside the pod's web terminal.
//
//  (B) From your machine over the S3 API (slower; uploads each file). Set the
//      RUNPOD_S3_* vars in server/.env, then:
//        node scripts/runpod/seed-models.mjs --s3
//
// A HuggingFace token (HF_TOKEN) is needed for gated Flux weights.
import { arg } from './_client.mjs';

const MODELS = [
  // [destFolder, filename, url]
  ['unet',         'flux1-dev.safetensors',   'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors'],
  ['vae',          'ae.safetensors',          'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors'],
  ['clip',         'clip_l.safetensors',      'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors'],
  ['clip',         't5xxl_fp16.safetensors',  'https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors'],
  ['style_models', 'flux1-redux-dev.safetensors',  'https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev/resolve/main/flux1-redux-dev.safetensors'],
  ['unet',         'flux1-kontext-dev.safetensors','https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev/resolve/main/flux1-kontext-dev.safetensors'],
  ['unet',         'flux1-fill-dev.safetensors',   'https://huggingface.co/black-forest-labs/FLUX.1-Fill-dev/resolve/main/flux1-fill-dev.safetensors'],
  ['checkpoints',  'sd_xl_base_1.0.safetensors',   'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors'],
  ['vae',          'sdxl_vae.safetensors',         'https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors'],
];

if (arg('print') !== undefined || process.argv.includes('--print')) {
  // Emit a bash script to run inside a pod (volume at /workspace).
  console.log('#!/usr/bin/env bash\nset -euo pipefail\nROOT=/workspace/models');
  console.log('AUTH=${HF_TOKEN:+--header="Authorization: Bearer $HF_TOKEN"}');
  for (const [folder, file, url] of MODELS) {
    console.log(`mkdir -p "$ROOT/${folder}"`);
    console.log(`[ -f "$ROOT/${folder}/${file}" ] || wget $AUTH -O "$ROOT/${folder}/${file}" "${url}"`);
  }
  console.log('echo "Seeding complete. Also create $ROOT/loras and $ROOT/controlnet and $ROOT/ipadapter."');
  console.log('mkdir -p "$ROOT/loras" "$ROOT/controlnet" "$ROOT/ipadapter" "$ROOT/embeddings"');
  process.exit(0);
}

if (process.argv.includes('--s3')) {
  console.log('S3 seeding streams each base model through your machine and is slow for the multi-GB Flux/T5 weights.');
  console.log('Strongly prefer the pod route:');
  console.log('  node scripts/runpod/seed-models.mjs --print > seed.sh   # then run inside a pod with the volume mounted');
  process.exit(0);
}

console.log('Usage:');
console.log('  node scripts/runpod/seed-models.mjs --print > seed.sh   (recommended: run in a pod)');
console.log('  node scripts/runpod/seed-models.mjs --s3                (notes on the slower S3 route)');
