// Frontend HTTP layer — the single place the app talks to the companion server.
// No secrets here; everything goes through the local /api proxy (vite.config.ts).

export interface GenImage { filename: string; type: 'base64' | 's3_url'; data: string }

/** Turn a worker output image into something an <img src> can render. */
export function imageSrc(img: GenImage): string {
  if (img.type === 's3_url') return img.data;
  return img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`;
}

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body;
}

export interface RefImage { name: string; image: string } // image: data URL or base64

/** Submit a workflow; returns the job id. */
export async function submitWorkflow(workflow: unknown, images?: RefImage[]): Promise<string> {
  const body = await jsonOrThrow(await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, images }),
  }));
  return body.jobId as string;
}

export interface JobResult { status: string; output?: { images?: GenImage[]; [k: string]: unknown } }

/** Poll a job until terminal state. Calls onTick with each raw status. */
export async function pollJob(
  jobId: string,
  opts: { onTick?: (s: JobResult) => void; intervalMs?: number; timeoutMs?: number } = {},
): Promise<JobResult> {
  const { onTick, intervalMs = 2000, timeoutMs = 15 * 60 * 1000 } = opts;
  const started = performance.now();
  for (;;) {
    const s = (await jsonOrThrow(await fetch(`/api/jobs/${jobId}`))) as JobResult;
    onTick?.(s);
    if (s.status === 'COMPLETED') return s;
    if (s.status === 'FAILED' || s.status === 'CANCELLED') {
      throw new Error(`Job ${s.status}: ${JSON.stringify((s as any).error ?? s.output ?? '')}`);
    }
    if (performance.now() - started > timeoutMs) throw new Error('Job timed out');
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

/** Convenience: submit + poll, returns the output images. */
export async function generate(
  workflow: unknown,
  opts: { images?: RefImage[]; onStatus?: (s: string) => void } = {},
): Promise<GenImage[]> {
  const jobId = await submitWorkflow(workflow, opts.images);
  const res = await pollJob(jobId, { onTick: s => opts.onStatus?.(s.status) });
  return res.output?.images ?? [];
}

// --- LoRAs -------------------------------------------------------------------
export interface Lora { name: string; size: number; lastModified?: string }

export async function listLoras(): Promise<Lora[]> {
  const body = await jsonOrThrow(await fetch('/api/loras'));
  return body.loras as Lora[];
}

export async function uploadLora(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const body = await jsonOrThrow(await fetch('/api/loras', { method: 'POST', body: fd }));
  return body.name as string;
}

export interface TrainConfig {
  name: string;
  triggerWord?: string;
  steps?: number;
  rank?: number;
  learningRate?: number;
  resolution?: number;
}

/** Upload a dataset + kick off training. Returns the training job id. */
export async function trainLora(cfg: TrainConfig, images: File[]): Promise<{ jobId: string; expectedLora: string }> {
  const fd = new FormData();
  fd.append('config', JSON.stringify(cfg));
  for (const img of images) fd.append('images', img);
  const body = await jsonOrThrow(await fetch('/api/loras/train', { method: 'POST', body: fd }));
  return body as { jobId: string; expectedLora: string };
}
