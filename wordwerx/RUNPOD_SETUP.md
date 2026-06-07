# WORDWERX × RunPod — all-purpose ComfyUI image generation

This wires WORDWERX to a single, workflow-agnostic RunPod Serverless ComfyUI
endpoint. Every generation call carries its own ComfyUI workflow JSON, so one
endpoint serves prototyping, dataset batches, expression edits, perspective
regen, LoRA-driven character consistency, and in-app LoRA training.

```
Browser (Vite)  ──/api──▶  companion server (holds secrets)  ──▶  RunPod endpoint (GPU, ComfyUI)
                                       └── S3 ──▶  network volume  /runpod-volume/models/{...,loras}
```

## Pieces

| Path | What it is |
|---|---|
| `../../worker-comfyui-allpurpose/` | Docker worker: ComfyUI + all custom nodes. Models/LoRAs live on the volume. |
| `server/` | Local Node companion server. Holds the RunPod API key + S3 creds. |
| `scripts/runpod/` | Provisioning: delete old endpoints, make volume, seed models, create endpoint. |
| `src/services/runpod.ts` | Frontend HTTP layer (`/api/*`). |
| `src/workflows/` | Per-use-case ComfyUI workflow builders. |
| `src/loras.tsx` | LoRA Manager (Visual Dev → LoRAs): list / upload / train. |

## One-time setup

1. **Secrets** — `cp server/.env.example server/.env` and fill in:
   - `RUNPOD_API_KEY` (console → Settings → API Keys)
   - `RUNPOD_S3_ACCESS_KEY` / `RUNPOD_S3_SECRET_KEY` (console → Settings → S3 API Keys)
2. **Replace the old endpoints**
   ```bash
   node scripts/runpod/list-endpoints.mjs                 # note the two ids
   node scripts/runpod/delete-endpoints.mjs --ids=ID1,ID2 --confirm
   ```
3. **Network volume** (must be an S3 datacenter: US-KS-2 / EU-CZ-1 / US-CA-2)
   ```bash
   node scripts/runpod/create-volume.mjs --name=wordwerx-models --size=250 --dc=US-KS-2
   # copy the printed RUNPOD_NETWORK_VOLUME_ID / S3 endpoint / region into server/.env
   ```
4. **Seed models** — recommended via a pod that mounts the volume:
   ```bash
   node scripts/runpod/seed-models.mjs --print > seed.sh   # run inside a pod web terminal (HF_TOKEN set)
   ```
5. **Build & push the worker** (or point a RunPod template at the worker repo):
   ```bash
   cd ../../worker-comfyui-allpurpose
   docker build -t <you>/worker-comfyui-allpurpose:latest .
   docker push <you>/worker-comfyui-allpurpose:latest
   ```
6. **Create the endpoint** (writes `RUNPOD_ENDPOINT_ID` into `server/.env`):
   ```bash
   node scripts/runpod/create-endpoint.mjs \
     --image=docker.io/<you>/worker-comfyui-allpurpose:latest \
     --volume=$RUNPOD_NETWORK_VOLUME_ID --dc=US-KS-2
   ```

## Run

```bash
npm install
npm run dev:all      # Vite + companion server together
```

Open the app → **Production → Library** to generate, or **Visual Dev → LoRAs**
to upload/train a LoRA. Pick a workflow + LoRA in the Library generate bar.

## Live deployment (provisioned 2026-06-06)

| Resource | Value |
|---|---|
| Endpoint | `wordwerx-allpurpose` · id `r2elijbwjilywz` |
| Template | `8klqg51oob` |
| Network volume | `wordwerx-models` · id `kg91ldcpe4` · 250 GB · **US-KS-2** |
| Worker image | `ghcr.io/reubenkearney/worker-comfyui-allpurpose:latest` (private; pulled via RunPod registry auth `cmq22iwyg000pl4cqqmkptaxs`) |
| GitHub repo | `github.com/ReubenKearney/worker-comfyui-allpurpose` (CI builds the image) |
| GPUs | A100 80GB PCIe / H100 PCIe / A100 SXM 80GB / H100 NVL / RTX PRO 6000 Blackwell |
| Seeded models | SDXL base · Flux: dev + Kontext + Fill + Redux + t5xxl/clip_l/ae |
| S3 (LoRA) | access key = the RunPod **user id** (`user_…`), secret `rps_…`; endpoint `s3api-us-ks-2.runpod.io`, region `US-KS-2` |

Smoke-tested end to end: both **SDXL** and **Flux** txt2img return valid PNGs via
raw `/run` and the companion server's `/api/generate`; LoRA **upload → list →
delete** verified through `/api/loras`.

## Local asset store / offline-first

The companion server doubles as a local, offline asset store so editing/preview/
publishing work without internet (only generation needs the cloud GPU).

- Generated image bytes are saved to `server/store/assets/<id>.png`; the app
  references compact `/api/assets/<id>` URLs, never base64.
- App state deltas + links (character→LoRA, portraits, locked canonicals, panel
  art) persist in `server/store/db.json` and re-hydrate on refresh.
- Routes: `POST/GET/DELETE /api/assets[/:id]`, `GET/PATCH /api/state`,
  `POST /api/links/:category`; `/api/health` reports `{store, assetCount}`.
- `STORE_DIR` (in `server/.env`, default `store`) sets the location. The dir is
  gitignored.
- **Publish** (`src/services/publish.ts`) inlines each panel's assigned image as
  base64 into one self-contained `.html` with baked scroll-reveal → opens offline.
- Training jobs write a `.safetensors` (no image), so the worker reports "no
  outputs"/FAILED even on success — the train UI verifies success by the LoRA
  appearing and uses the real `<name>_rank{N}_bf16.safetensors` filename.

## Gotchas learned (baked into the scripts)

- **Invoke host is `api.runpod.ai`** (not `api.runpod.io`, which is only the
  management REST + GraphQL). The companion server uses `.ai`.
- **The endpoint is pinned to the volume's datacenter.** Only request GPUs that
  DC stocks — US-KS-2 has A100/H100/RTX PRO 6000 Blackwell, *not* L40S/A6000/4090.
- **GHCR image stays private**; RunPod pulls it via a `containerRegistryAuth`
  (GHCR username + a PAT with `read:packages`) referenced by the template.
- **Pushing `.github/workflows/*` needs a token with the Workflows permission.**
- The companion server loads `server/.env` explicitly (not CWD `.env`).
- **RunPod S3 access key is your account `user_…` id** (not the short key id),
  paired with the `rps_…` secret shown once at creation.
- **RunPod S3 list quirk:** ListObjects rejects a trailing slash on the bucket
  and the SDK's `delimiter`/`encoding-type`/`x-id` params ("Invalid object
  path"). `server/loras.ts` strips them via a middleware so listing works.
- Seeding runs on a throwaway CPU pod (`seed-pod.mjs`); CPU stock in S3
  datacenters fluctuates, so it tries all cpu flavors.

## Notes
- Verify the base image tag in `worker-comfyui-allpurpose/Dockerfile` against the
  latest at hub.docker.com/r/runpod/worker-comfyui/tags.
- The Kontext / ControlNet / FluxTrainer graphs in `src/workflows/` and
  `server/workflows/train-lora-flux.json` are representative — validate them once
  against your installed node versions (export a known-good graph via
  ComfyUI → Export (API) and paste in).
- Set S3 output env on the endpoint to get `s3_url` outputs instead of base64
  for large batches (the frontend handles both via `imageSrc`).
