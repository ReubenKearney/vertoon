// WORDWERX companion server.
// Holds the RunPod API key + S3 credentials (never shipped to the browser) and
// exposes a small /api surface the React app calls. Run with `npm run server`.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Load server/.env regardless of CWD. override:true so server/.env (e.g. PORT)
// wins over an ambient PORT injected by a parent (preview/launchers).
loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), '.env'), override: true });
import express from 'express';
import multer from 'multer';
import { createReadStream } from 'node:fs';
import { submitRun, getStatus, cancelJob } from './runpod.js';
import { listLoras, uploadLora, uploadTrainingImage, deleteLora } from './loras.js';
import { buildTrainWorkflow } from './train-workflow.js';
import { saveAsset, getAsset, deleteAsset, getState, patchState, setLink, isLinkKey, assetCount } from './store.js';

const app = express();
// Larger limit: /api/assets receives base64 images.
app.use(express.json({ limit: '60mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

const wrap = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Health ------------------------------------------------------------------
app.get('/api/health', wrap(async (_req, res) => {
  res.json({
    ok: true,
    endpoint: Boolean(process.env.RUNPOD_ENDPOINT_ID),
    s3: Boolean(process.env.RUNPOD_NETWORK_VOLUME_ID),
    store: true,
    assetCount: await assetCount(),
  });
}));

// --- Asset store (offline-first: bytes live on the local server) -------------
// Save a generated image (data URL / base64 / http|s3 url) -> { id, url }.
app.post('/api/assets', wrap(async (req, res) => {
  const { image, origin } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image is required' });
  res.json(await saveAsset(image, origin));
}));

app.get('/api/assets/:id', wrap(async (req, res) => {
  const a = await getAsset(req.params.id);
  if (!a) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Type', a.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  createReadStream(a.path).pipe(res);
}));

app.delete('/api/assets/:id', wrap(async (req, res) => {
  await deleteAsset(req.params.id);
  res.json({ ok: true });
}));

// --- Persisted app state + links (hydration source of truth) -----------------
app.get('/api/state', wrap(async (_req, res) => { res.json(await getState()); }));

app.patch('/api/state', wrap(async (req, res) => {
  await patchState(req.body || {});
  res.json({ ok: true });
}));

// Set one link entry, e.g. POST /api/links/characterLora { key, value }.
app.post('/api/links/:category', wrap(async (req, res) => {
  const { category } = req.params;
  if (!isLinkKey(category)) return res.status(400).json({ error: 'unknown link category' });
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key is required' });
  await setLink(category, key, value);
  res.json({ ok: true });
}));

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
