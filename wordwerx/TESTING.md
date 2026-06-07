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
- 2.7 train-lora-flux (FluxTrainer) → ✅ **PASS** (see Tier 8). Fixed 3 real graph bugs in `server/train-workflow.ts`: numeric params were strings (caused a 500) → build as object with numbers; missing terminal output node → added `FluxTrainEnd`; ~20 missing required inputs → filled from FluxTrainer source defaults. The earlier `num_train_epochs` AttributeError was a **dataset artifact** of probing with an empty dataset path — `init_train` reads it (nodes.py:636) only after computing it from `len(train_dataloader)` (train_network.py:773). With a real dataset it computes fine. **No image rebuild needed.**

### Outstanding
- Seed `models/ipadapter/` weights to enable IPAdapter workflows (no app workflow uses them yet).
- Tier 3 (UI) is manual via the run task.

---

## Tiers 5–9 — UI/UX × backend (offline-first)

**Tier 5 — Store (free, automated):** ✅ all.
- `POST /api/assets` → `{id,url}` writes `server/store/assets/<id>.png` + db row.
- `GET /api/assets/:id` → bytes + `Content-Type`.
- `PATCH /api/state` + `POST /api/links/*` merge; `GET /api/state` reflects them.
- Survives **server restart** (db.json on disk); `/api/health` → `{store:true, assetCount}`.

**Tier 6 — Offline (manual, the core requirement):**
1. `npm run dev:all` (or the VS Code task). Generate in Library → confirm a file appears in `server/store/assets/`.
2. Block `api.runpod.ai` (or pull Wi-Fi); keep the server running.
3. Refresh → thumbnails / portraits / canonical / panel art re-render from `/api/assets/*` (hydrated from `/api/state`).
4. Edit (rename, reorder, lock, appearance) persists; Preview renders the real images.
5. Publish → Export offline comic `.html`; open it in airplane mode → renders, devtools Network shows **0 external requests**.
6. Generate buttons show an "offline" badge and are disabled; re-enable when back online.

**Tier 7 — Wired surfaces (manual, online):**
- Library: prompt → workflow + LoRA → Generate → image renders; cancel works; failure → toast.
- Visual Dev board: generate variant → appears with art; Reject; Lock → canonical recorded.
- Visual Dev sheets: "Generate expressions" on a locked subject → Kontext edits the canonical → cells fill.
- Visual Dev Locations: load a location image → "Generate angle" → gallery.
- Narrative Bible: pick/assign a LoRA; "Generate portrait" → portrait shows in hero + roster, persists; LoRA flows into variant gen.
- Publish: assign library art to panels → export.

**Tier 8 — Training E2E:** ✅ **PASS** — real run: 5 generated images + 20 steps, rank 8, via `POST /api/loras/train` → reached `IN_PROGRESS` (past `init_train`) → FluxTrainer wrote `smoke_lora_rank8_bf16.safetensors` (76.7 MB) to `models/loras/`. Note: the worker-comfyui handler expects an **image** output, so a training job reports "no outputs"/FAILED even on success — the train UI therefore verifies success by the LoRA appearing (and uses the real `_rank{N}_bf16` filename), and `listLoras` hides intermediate `-stepNNNNN` checkpoints. Train UI writes the character→LoRA link on success.

**Tier 9 — Non-functional:** `npm run build` clean (exit 0); no secrets in `dist/`; publish size shown is the real computed byte size (downscale option); `db.json` + assets survive restart.

### Run log (Tiers 5–9)
- Tier 5: ✅ automated (store POST/GET/state/links, restart-persistence).
- Tier 8: ✅ real training run completed; LoRA written + listed.
- Tiers 6, 7: ⏳ manual UI pass via the VS Code run task (offline + each surface).
- Tier 9: ✅ build clean, no secrets in bundle.
