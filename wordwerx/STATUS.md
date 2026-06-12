# WORDWERX — feature status

Ground truth for the RunPod image-generation + UI integration. Updated 2026-06-13.

## Backend (RunPod)
| Feature | Status |
|---|---|
| All-purpose endpoint `r2elijbwjilywz` (Flux + SDXL + Kontext + ControlNet) | ✅ live |
| Network volume `kg91ldcpe4` (models + LoRAs) | ✅ |
| Companion server `/api/generate · /jobs · /loras · /loras/train` | ✅ |
| Asset store `/api/assets · /state · /links/*` (offline-first) | ✅ |
| Seeded models: SDXL, Flux dev/Kontext/Fill/Redux, Flux Canny ControlNet | ✅ |
| IPAdapter | ⛔ nodes baked in, weights not seeded, no app workflow |

## Workflows (validated on the endpoint)
| Workflow | Status |
|---|---|
| txt2img Flux / SDXL | ✅ |
| dataset-batch | ✅ |
| LoRA-driven generation | ✅ |
| expression-edit (Kontext) | ✅ |
| perspective-consistent (ControlNet) | ✅ |
| LoRA training (FluxTrainer) | ✅ real run completed |

## UI surfaces (wired to backend + persisted)
| Surface | Status |
|---|---|
| Library — generate (workflow + LoRA, live images) | ✅ |
| LoRA Manager — upload + train (links character→LoRA) | ✅ |
| Narrative Bible — per-character LoRA + Generate portrait | ✅ |
| Visual Dev — variant generation + lock→canonical | ✅ |
| Visual Dev — expression sheets (Kontext) | ✅ |
| Visual Dev — Locations (perspective) | ✅ |
| Publish — assign panel art + export offline `.html` | ✅ |
| Series — create from scratch; seasons/arc board + config drawer persisted per series | ✅ (verified 2026-06-12) |
| Episode — from-scratch E2E: character → generated portrait → panel art → offline `.html` export | ✅ (verified 2026-06-13, real generation) |

## Offline-first
| Capability | Status |
|---|---|
| Generated images saved locally (`server/store/assets`) | ✅ |
| State + links persist + re-hydrate on refresh | ✅ |
| Edit / preview / publish work offline | ✅ (design); ⏳ manual Tier-6 confirmation |
| Generate gated when offline | ✅ |

## Known follow-ups
- IPAdapter: seed weights + add an app workflow if identity-transfer is wanted.
- Tiers 6 & 7 (offline + per-surface) need a manual UI pass (see TESTING.md).
- Panel art is assigned in Publish; a richer Compose assignment could come later.
