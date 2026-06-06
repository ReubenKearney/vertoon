// WORDWERX companion server.
// Holds the RunPod API key + S3 credentials (never shipped to the browser) and
// exposes a small /api surface the React app calls. Run with `npm run server`.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Load server/.env regardless of the process working directory.
loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });
import express from 'express';
import multer from 'multer';
import { submitRun, getStatus, cancelJob } from './runpod.js';
import { listLoras, uploadLora, uploadTrainingImage, deleteLora } from './loras.js';
import { buildTrainWorkflow } from './train-workflow.js';

const app = express();
app.use(express.json({ limit: '25mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

const wrap = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Health ------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    endpoint: Boolean(process.env.RUNPOD_ENDPOINT_ID),
    s3: Boolean(process.env.RUNPOD_NETWORK_VOLUME_ID),
  });
});

// --- Generation --------------------------------------------------------------
// Body: { workflow, images? } -> { jobId }
app.post('/api/generate', wrap(async (req, res) => {
  const { workflow, images } = req.body || {};
  if (!workflow) return res.status(400).json({ error: 'workflow is required' });
  const job = await submitRun({ workflow, images });
  res.json({ jobId: job.id, status: job.status });
}));

// Poll a job. -> { status, output? }
app.get('/api/jobs/:id', wrap(async (req, res) => {
  res.json(await getStatus(req.params.id));
}));

app.post('/api/jobs/:id/cancel', wrap(async (req, res) => {
  res.json(await cancelJob(req.params.id));
}));

// --- LoRAs -------------------------------------------------------------------
app.get('/api/loras', wrap(async (_req, res) => {
  res.json({ loras: await listLoras() });
}));

// Upload an existing .safetensors. multipart field name: "file"
app.post('/api/loras', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const name = await uploadLora(req.file.originalname, req.file.buffer);
  res.json({ name });
}));

app.delete('/api/loras/:name', wrap(async (req, res) => {
  await deleteLora(req.params.name);
  res.json({ ok: true });
}));

// Train a new LoRA. multipart: field "images" (many) + JSON field "config".
// 1) push dataset images to the volume, 2) submit a FluxTrainer workflow.
app.post('/api/loras/train', upload.array('images', 200), wrap(async (req, res) => {
  const cfg = JSON.parse((req.body?.config as string) || '{}');
  if (!cfg.name) return res.status(400).json({ error: 'config.name is required' });
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: 'at least one training image is required' });

  for (const f of files) await uploadTrainingImage(cfg.name, f.originalname, f.buffer);
  const datasetPath = `/runpod-volume/training/${cfg.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const workflow = buildTrainWorkflow({ ...cfg, datasetPath });
  const job = await submitRun({ workflow });
  res.json({ jobId: job.id, status: job.status, expectedLora: `${cfg.name}.safetensors` });
}));

// --- Error handler -----------------------------------------------------------
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server]', err?.message || err);
  res.status(500).json({ error: String(err?.message || err) });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`WORDWERX companion server on http://localhost:${port}`));
