// Builds a ComfyUI-FluxTrainer workflow that trains a LoRA from a dataset
// folder on the network volume and writes the resulting .safetensors into
// models/loras/ (so it's immediately usable by generation workflows).
//
// NOTE: FluxTrainer node graphs are version-sensitive. This is a representative
// graph; validate it once against the installed node version by exporting a
// known-good training workflow from a live ComfyUI (Export > API) and pasting
// it here. Placeholders below are substituted from the train request.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TrainConfig {
  name: string;            // output lora name (without extension)
  datasetPath: string;     // /runpod-volume/training/<name>
  triggerWord?: string;
  steps?: number;          // default 1500
  rank?: number;           // network dim, default 32
  learningRate?: number;   // default 1e-4
  resolution?: number;     // default 1024
}

export function buildTrainWorkflow(cfg: TrainConfig): unknown {
  const raw = readFileSync(join(__dirname, 'workflows', 'train-lora-flux.json'), 'utf8');
  const filled = raw
    .replaceAll('{{OUTPUT_NAME}}', cfg.name)
    .replaceAll('{{DATASET_PATH}}', cfg.datasetPath)
    .replaceAll('{{TRIGGER_WORD}}', cfg.triggerWord || cfg.name)
    .replaceAll('{{STEPS}}', String(cfg.steps ?? 1500))
    .replaceAll('{{RANK}}', String(cfg.rank ?? 32))
    .replaceAll('{{LEARNING_RATE}}', String(cfg.learningRate ?? 0.0001))
    .replaceAll('{{RESOLUTION}}', String(cfg.resolution ?? 1024));
  return JSON.parse(filled);
}
