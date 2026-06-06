# WORDWERX × RunPod — testing plan

Runnable checklist for the RunPod image-generation + LoRA functionality. Tiers
go cheapest → most expensive. Status: ✅ passed · ⏳ partial · ❌ not run ·
🔧 fixed during testing.

Live endpoint: `r2elijbwjilywz` (invoke host `api.runpod.ai`). Secrets in
`server/.env`. Helper to read env in shell:
`PAT=$(grep '^RUNPOD_API_KEY=' server/.env | cut -d= -f2)`.

---

## Tier 0 — Static / build (local, free)

| # | Check | Command | Expected |
|---|---|---|---|
| 0.1 | Frontend typecheck + bundle | `npm run build` | exit 0, `dist/` emitted |
| 0.2 | Provisioning scripts parse | `for f in scripts/runpod/*.mjs; do node --check "$f"; done` | no errors |
| 0.3 | Server boots + secrets load | `npm run server` → `curl localhost:8787/api/health` | `{ok:true,endpoint:true,s3:true}` |
| 0.4 | No secrets in client bundle | `npm run build && grep -rEi 'rpa_\|rps_\|ghp_\|hf_[A-Za-z0-9]{20}\|RUNPOD_API_KEY' dist/` | empty |

## Tier 1 — Server API (local server, cheap GPU)

| # | Check | How | Expected |
|---|---|---|---|
| 1.1 | Generate SDXL | `POST /api/generate` (SDXL graph) → poll `/api/jobs/:id` | COMPLETED, base64 PNG |
| 1.2 | Generate Flux | same with Flux graph | COMPLETED, PNG |
| 1.3 | LoRA list | `GET /api/loras` | `{loras:[...]}`, no error |
| 1.4 | LoRA upload | `POST /api/loras` (multipart .safetensors) | `{name}`, then appears in list |
| 1.5 | LoRA delete | `DELETE /api/loras/:name` | `{ok:true}`, gone from list |
| 1.6 | Cancel job | submit, `POST /api/jobs/:id/cancel` | status CANCELLED |
| 1.7 | Bad workflow | submit `{workflow:{"1":{}}}` | job FAILED, error returned (no hang) |
| 1.8 | Missing model | reference a non-seeded ckpt | ComfyUI error surfaced in output |
| 1.9 | Large LoRA (manual) | upload a >500 MB file | multipart upload succeeds |

## Tier 2 — Workflow validation (on the endpoint)

The `src/workflows` builders for edit/controlnet/train are *representative* —
this tier confirms the node `class_type`s and wiring match the installed nodes,
and fixes them where they don't.

| # | Workflow | Prereq | Expected |
|---|---|---|---|
| 2.1 | `txt2img-flux` / `txt2img-sdxl` | seeded | PNG (✅ already) |
| 2.2 | `dataset-batch` | seeded | N images in `output.images` |
| 2.3 | LoRA-driven gen (`LoraLoader`) | a LoRA on volume | runs; output differs with LoRA |
| 2.4 | `expression-edit` (Flux Kontext) | Kontext seeded; ref image | edited image; nodes resolve |
| 2.5 | `perspective-consistent` (ControlNet) | ControlNet weights seeded | image; preprocessor + CN resolve |
| 2.6 | IPAdapter consistency | IPAdapter weights seeded | runs; nodes resolve |
| 2.7 | `train-lora-flux` (FluxTrainer) | tiny dataset | graph validates; (short run) writes `.safetensors` |

## Tier 3 — End-to-end UI (manual, via the run task → Chrome)

Run **Tasks: Run Task → "WORDWERX: Restart dev server + open Chrome"**, then:
- Library: prompt → pick workflow + LoRA → Generate → image renders; `Queued→Generated`; failure → `Rejected`.
- LoRA Manager: upload `.safetensors` → list → selectable in Library and affects output. Train → progress → new LoRA appears.
- Visual Dev: variant gen, expression edit, lock-variant → LoRA link.

## Tier 4 — Non-functional

- Cold start / autoscale to 0: `GET api.runpod.ai/v2/{id}/health` worker counts.
- Concurrency: submit 3+ jobs → scales toward `workersMax:3`.
- Cost: `GET rest.runpod.io/v1/billing/endpoints` + volume storage.
- Security: `/api` local-only; `server/.env` never served; no secrets in bundle (0.4).

## Prerequisites / fixtures
- Seed ControlNet + IPAdapter weights (for 2.5 / 2.6).
- A real character LoRA, a canonical face image, a location image, a tiny training set.

---

## Results log — run 2026-06-06

**Tier 0** — ✅ all: build (exit 0), scripts parse, `/api/health` `{ok,endpoint:true,s3:true}`, no secrets in `dist/`.

**Tier 1** — ✅ all:
- 1.1/1.2 generate SDXL + Flux → COMPLETED with PNG (raw + via `/api/generate`).
- 1.3/1.4/1.5 LoRA list/upload/delete (incl. a real 163 MB upload) → ✅.
- 1.6 cancel → CANCELLED. 1.7 bad workflow → FAILED "node NoSuchNode does not exist". 1.8 missing model → FAILED "ckpt_name not in [...]" (also confirms Flux lives under `unet/`). All fail fast, no hangs.

**Tier 2**:
- 2.1 txt2img-flux / -sdxl → ✅ PASS.
- 2.2 dataset-batch (flux, count 4) → ✅ PASS (4 images).
- 2.3 LoRA-gen (SDXL + real `pixel-art-xl` LoRA) → ✅ PASS.
- 2.4 expression-edit (Flux Kontext, ref image) → ✅ PASS (representative graph correct as-is).
- 2.5 perspective-consistent (ControlNet) → ✅ **PASS**. Switched preprocessor to `CannyEdgePreprocessor` and seeded `flux-canny-controlnet.safetensors` (InstantX, streamed HF→S3). Full run: base image → canny → Flux ControlNet → output image.
- 2.7 train-lora-flux (FluxTrainer) → 🔧 fixed 3 real graph bugs in `server/train-workflow.ts`:
  1. numeric params were strings (caused 500) → build as object with numbers;
  2. missing terminal output node → added `FluxTrainEnd`;
  3. ~20 missing required inputs across Optimizer/Dataset/Init nodes → filled from FluxTrainer source defaults.
  Now **passes full ComfyUI validation and reaches execution**, then fails at runtime inside the node: `InitFluxLoRATraining: 'FluxNetworkTrainer' object has no attribute 'num_train_epochs'`.
  **Follow-up:** pin a known-good `ComfyUI-FluxTrainer` commit in the worker Dockerfile (or paste a known-good exported training graph) and re-run a short real-dataset train. Our graph wiring is otherwise correct.

### Outstanding
- Seed `models/ipadapter/` weights to enable IPAdapter workflows (no app workflow uses them yet).
- Pin FluxTrainer version for 2.7; then a real short training run.
- Tier 3 (UI) is manual via the run task.
