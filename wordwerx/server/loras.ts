// LoRA storage on the RunPod network volume via its S3-compatible gateway.
// Files land in models/loras/ and become immediately usable by any workflow
// (ComfyUI reads them through extra_model_paths.yaml).
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';

const LORA_PREFIX = 'models/loras/';

function bucket(): string {
  const id = process.env.RUNPOD_NETWORK_VOLUME_ID;
  if (!id) throw new Error('RUNPOD_NETWORK_VOLUME_ID is not set');
  return id;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const { RUNPOD_S3_ENDPOINT, RUNPOD_S3_REGION, RUNPOD_S3_ACCESS_KEY, RUNPOD_S3_SECRET_KEY } = process.env;
  if (!RUNPOD_S3_ENDPOINT || !RUNPOD_S3_ACCESS_KEY || !RUNPOD_S3_SECRET_KEY) {
    throw new Error('RunPod S3 env vars are not set (RUNPOD_S3_ENDPOINT / _ACCESS_KEY / _SECRET_KEY)');
  }
  _client = new S3Client({
    endpoint: RUNPOD_S3_ENDPOINT,
    region: RUNPOD_S3_REGION || 'US-KS-2',
    credentials: { accessKeyId: RUNPOD_S3_ACCESS_KEY, secretAccessKey: RUNPOD_S3_SECRET_KEY },
    forcePathStyle: true,
  });
  // RunPod's S3 gateway rejects list requests that carry a trailing slash on the
  // bucket or the SDK's default delimiter/encoding-type/x-id params ("Invalid
  // object path"). Strip them so ListObjectsV2 works. Only touches list calls.
  _client.middlewareStack.add(
    (next) => async (args: any) => {
      const r = args.request;
      if (r && r.query && r.query['list-type']) {
        if (typeof r.path === 'string' && r.path.length > 1) r.path = r.path.replace(/\/+$/, '');
        delete r.query['delimiter'];
        delete r.query['encoding-type'];
        delete r.query['x-id'];
      }
      return next(args);
    },
    { step: 'build', name: 'runpodListFix' },
  );
  return _client;
}

export interface LoraEntry { name: string; size: number; lastModified?: string }

/** List every .safetensors LoRA on the volume. */
export async function listLoras(): Promise<LoraEntry[]> {
  const out = await client().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: LORA_PREFIX }));
  return (out.Contents || [])
    .filter(o => o.Key && o.Key.endsWith('.safetensors'))
    .map(o => ({
      name: o.Key!.slice(LORA_PREFIX.length),
      size: o.Size || 0,
      lastModified: o.LastModified?.toISOString(),
    }));
}

/** Stream-upload a LoRA (multipart handles files > 500 MB automatically). */
export async function uploadLora(filename: string, body: Readable | Buffer): Promise<string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = LORA_PREFIX + (safe.endsWith('.safetensors') ? safe : safe + '.safetensors');
  const upload = new Upload({
    client: client(),
    params: { Bucket: bucket(), Key: key, Body: body, ContentType: 'application/octet-stream' },
    partSize: 64 * 1024 * 1024,
  });
  await upload.done();
  return key.slice(LORA_PREFIX.length);
}

/** Upload a training image into a per-LoRA dataset folder, returns volume path. */
export async function uploadTrainingImage(loraName: string, filename: string, body: Buffer): Promise<string> {
  const safeLora = loraName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `training/${safeLora}/${safeFile}`;
  await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body }));
  // Path as seen inside the worker.
  return `/runpod-volume/${key}`;
}

export async function deleteLora(name: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: LORA_PREFIX + name }));
}
