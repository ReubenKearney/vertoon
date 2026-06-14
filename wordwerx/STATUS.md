# WORDWERX — feature status

Ground truth for the RunPod image-generation + UI integration. Updated 2026-06-13
(latest: vertoon-crafting UX overhaul — see BACKLOG.md).

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
| Publish — assign panel art + export offline `.html` (with baked motion: parallax/reveal/transition) | ✅ |
| Series — create from scratch; seasons/arc board + config drawer persisted per series | ✅ (verified 2026-06-12) |
| Episode — from-scratch E2E: character → generated portrait → panel art → offline `.html` export | ✅ (verified 2026-06-13, real generation) |
| Compose — vertoon-crafting UX: on-canvas text (bubbles/captions/SFX), drag-reorder panels+layers, per-panel gutter, in-Compose motion scrubber, effect presets, undo/redo | ✅ (verified 2026-06-13, 23/23 headless drive) |
| Preview — renders the user's real layer art with live parallax (was procedural placeholders only) | ✅ |

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
- Text-object polish: bubble rotation / free-transform, canvas zoom, snapping guides, multi-select
  are out of scope so far (see BACKLOG "Vertoon-crafting UX overhaul").
- Sound effects are markers only — no audio playback (no audio assets exist).
