// Tier-2 workflow validation harness.
// Submits each src/workflows builder's ACTUAL output to the live endpoint and
// categorizes the outcome so representative graphs (Kontext/ControlNet/Trainer)
// can be validated/fixed:
//   PASS        - COMPLETED with images
//   NEEDS-MODEL - graph valid, a referenced model file isn't on the volume
//   BAD-GRAPH   - a node class_type/input is wrong (must fix the builder)
//   FAIL        - other error
// Run: npx tsx scripts/runpod/test-workflows.ts
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  txt2imgFlux, txt2imgSDXL, datasetBatch, expressionEdit, perspectiveConsistent,
} from '../../src/workflows/index.ts';
import { buildTrainWorkflow } from '../../server/train-workflow.ts';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, '..', '..', 'server', '.env') });

const EP = process.env.RUNPOD_ENDPOINT_ID!;
const KEY = process.env.RUNPOD_API_KEY!;
const BASE = `https://api.runpod.ai/v2/${EP}`;
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function submit(workflow: unknown, images?: any[]): Promise<string> {
  const r = await fetch(`${BASE}/run`, { method: 'POST', headers: H, body: JSON.stringify({ input: { workflow, images } }) });
  const j: any = await r.json();
  if (!j.id) throw new Error('no job id: ' + JSON.stringify(j));
  return j.id;
}
async function poll(id: string, timeoutMs = 8 * 60 * 1000): Promise<any> {
  const t0 = Date.now();
  for (;;) {
    const j: any = await (await fetch(`${BASE}/status/${id}`, { headers: H })).json();
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status)) return j;
    if (Date.now() - t0 > timeoutMs) return { status: 'TIMEOUT' };
    await new Promise(r => setTimeout(r, 5000));
  }
}
function categorize(res: any): string {
  if (res.status === 'COMPLETED') {
    const n = res.output?.images?.length ?? 0;
    return `PASS (${n} image${n === 1 ? '' : 's'})`;
  }
  const blob = JSON.stringify(res.error ?? res.output ?? res).toLowerCase();
  if (/not in list|does not exist|invalid.*not in|value not in list|required input is missing|return type mismatch/.test(blob)
      && !/checkpoint|unet|lora|controlnet|vae|clip|\.safetensors/.test(blob)) return 'BAD-GRAPH: ' + blob.slice(0, 180);
  if (/not found|cannot find|no such file|\.safetensors|checkpoint|unet|controlnet|does not exist/.test(blob)) return 'NEEDS-MODEL: ' + blob.slice(0, 180);
  return `${res.status}: ` + blob.slice(0, 200);
}

async function run(label: string, workflow: unknown, images?: any[]) {
  try {
    const id = await submit(workflow, images);
    const res = await poll(id);
    console.log(`\n### ${label}\n  ${categorize(res)}`);
    return res;
  } catch (e: any) {
    console.log(`\n### ${label}\n  ERROR ${e.message}`);
    return null;
  }
}

// 1) Base image for edit/perspective ref (also re-confirms SDXL txt2img).
console.log('Generating a base reference image (SDXL)...');
const baseRes = await run('2.1 txt2img-sdxl (base ref)', txt2imgSDXL({ positive: 'a quiet solarpunk alley at dusk, lanterns, wet cobblestones', steps: 20 }));
const baseImg = baseRes?.output?.images?.[0]?.data;
const refImages = baseImg ? [{ name: 'ref.png', image: baseImg }] : undefined;

// 2) dataset-batch (Flux)
await run('2.2 dataset-batch (flux, count 4)', datasetBatch({ positive: 'character turnaround sheet, neutral background', count: 4 }));

// 3) expression-edit (Flux Kontext) — needs ref image
if (refImages) await run('2.4 expression-edit (kontext)', expressionEdit({ refImageName: 'ref.png', instruction: 'make the character smile warmly' }), refImages);
else console.log('\n### 2.4 expression-edit\n  SKIPPED (no base image)');

// 4) perspective-consistent (ControlNet) — needs ref image
if (refImages) await run('2.5 perspective-consistent (controlnet, lineart)', perspectiveConsistent({ refImageName: 'ref.png', positive: 'same alley from a high angle' }), refImages);
else console.log('\n### 2.5 perspective\n  SKIPPED (no base image)');

// 5) train-lora-flux graph — validate node schema (cancel quickly once progressing)
try {
  const wf = buildTrainWorkflow({ name: 'schema_probe', datasetPath: '/runpod-volume/training/__nonexistent__', steps: 1, rank: 4 });
  const id = await submit(wf);
  // give it ~90s to either error on node validation or start the trainer
  let res: any = { status: 'IN_QUEUE' };
  for (let i = 0; i < 9; i++) {
    res = await (await fetch(`${BASE}/status/${id}`, { headers: H })).json();
    if (['COMPLETED', 'FAILED'].includes(res.status)) break;
    await new Promise(r => setTimeout(r, 10000));
  }
  await fetch(`${BASE}/cancel/${id}`, { method: 'POST', headers: H });
  console.log(`\n### 2.7 train-lora-flux (FluxTrainer schema)\n  status=${res.status} :: ${categorize(res)}`);
} catch (e: any) { console.log(`\n### 2.7 train-lora-flux\n  ERROR ${e.message}`); }

console.log('\n--- done ---');
