// ComfyUI workflow builders — one per WORDWERX use case. Each returns an
// API-format ComfyUI graph (the shape produced by "Export (API)") that the
// companion server forwards verbatim to the endpoint. Because the workflow
// travels with every call, the same endpoint serves every use case.
//
// The txt2img graphs are stable. The Kontext / ControlNet graphs are
// representative — validate them once against your installed node versions by
// exporting a known-good graph from a live ComfyUI and pasting it in.

export type UseCase =
  | 'txt2img-flux'
  | 'txt2img-sdxl'
  | 'dataset-batch'
  | 'expression-edit'
  | 'perspective-consistent';

export interface LoraRef { name: string; strength?: number }

interface BaseParams {
  positive: string;
  negative?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  lora?: LoraRef;
}

const rnd = () => Math.floor(Math.random() * 2 ** 31);

// --- Flux txt2img -------------------------------------------------------------
export function txt2imgFlux(p: BaseParams): Record<string, any> {
  const seed = p.seed ?? rnd();
  const g: Record<string, any> = {
    '10': { class_type: 'UNETLoader', inputs: { unet_name: 'flux1-dev.safetensors', weight_dtype: 'default' } },
    '11': { class_type: 'DualCLIPLoader', inputs: { clip_name1: 't5xxl_fp16.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' } },
    '12': { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
    '13': { class_type: 'CLIPTextEncode', inputs: { clip: ['11', 0], text: p.positive } },
    '14': { class_type: 'FluxGuidance', inputs: { conditioning: ['13', 0], guidance: 3.5 } },
    '15': { class_type: 'CLIPTextEncode', inputs: { clip: ['11', 0], text: p.negative ?? '' } },
    '16': { class_type: 'EmptySD3LatentImage', inputs: { width: p.width ?? 1024, height: p.height ?? 1024, batch_size: 1 } },
    '17': { class_type: 'KSampler', inputs: { model: ['10', 0], positive: ['14', 0], negative: ['15', 0], latent_image: ['16', 0], seed, steps: p.steps ?? 20, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    '18': { class_type: 'VAEDecode', inputs: { samples: ['17', 0], vae: ['12', 0] } },
    '19': { class_type: 'SaveImage', inputs: { images: ['18', 0], filename_prefix: 'wordwerx' } },
  };
  if (p.lora) {
    g['20'] = { class_type: 'LoraLoaderModelOnly', inputs: { model: ['10', 0], lora_name: p.lora.name, strength_model: p.lora.strength ?? 0.9 } };
    g['17'].inputs.model = ['20', 0];
  }
  return g;
}

// --- SDXL txt2img -------------------------------------------------------------
export function txt2imgSDXL(p: BaseParams): Record<string, any> {
  const seed = p.seed ?? rnd();
  const g: Record<string, any> = {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '2': { class_type: 'CLIPTextEncode', inputs: { clip: ['1', 1], text: p.positive } },
    '3': { class_type: 'CLIPTextEncode', inputs: { clip: ['1', 1], text: p.negative ?? 'lowres, bad anatomy, worst quality' } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width: p.width ?? 1024, height: p.height ?? 1024, batch_size: 1 } },
    '5': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], seed, steps: p.steps ?? 28, cfg: 6.5, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1 } },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'wordwerx' } },
  };
  if (p.lora) {
    g['8'] = { class_type: 'LoraLoader', inputs: { model: ['1', 0], clip: ['1', 1], lora_name: p.lora.name, strength_model: p.lora.strength ?? 0.9, strength_clip: p.lora.strength ?? 0.9 } };
    g['5'].inputs.model = ['8', 0];
    g['2'].inputs.clip = ['8', 1];
    g['3'].inputs.clip = ['8', 1];
  }
  return g;
}

// --- Bulk dataset for LoRA training (Flux, batch via batch_size) --------------
export function datasetBatch(p: BaseParams & { count?: number }): Record<string, any> {
  const g = txt2imgFlux(p);
  (g['16'] as any).inputs.batch_size = Math.min(p.count ?? 8, 16);
  (g['19'] as any).inputs.filename_prefix = 'wordwerx_dataset';
  return g;
}

// --- Flux img2img (re-frame / variation of a reference at a given strength) ---
// denoise low (~0.4) = close to source; high (~0.8) = freer re-interpretation.
export function img2imgFlux(p: { refImageName: string; positive: string; denoise?: number; steps?: number; seed?: number }): Record<string, any> {
  const seed = p.seed ?? rnd();
  return {
    '1': { class_type: 'LoadImage', inputs: { image: p.refImageName } },
    '10': { class_type: 'UNETLoader', inputs: { unet_name: 'flux1-dev.safetensors', weight_dtype: 'default' } },
    '11': { class_type: 'DualCLIPLoader', inputs: { clip_name1: 't5xxl_fp16.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' } },
    '12': { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
    '13': { class_type: 'VAEEncode', inputs: { pixels: ['1', 0], vae: ['12', 0] } },
    '14': { class_type: 'CLIPTextEncode', inputs: { clip: ['11', 0], text: p.positive } },
    '15': { class_type: 'FluxGuidance', inputs: { conditioning: ['14', 0], guidance: 3.5 } },
    '16': { class_type: 'CLIPTextEncode', inputs: { clip: ['11', 0], text: '' } },
    '17': { class_type: 'KSampler', inputs: { model: ['10', 0], positive: ['15', 0], negative: ['16', 0], latent_image: ['13', 0], seed, steps: p.steps ?? 24, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: p.denoise ?? 0.65 } },
    '18': { class_type: 'VAEDecode', inputs: { samples: ['17', 0], vae: ['12', 0] } },
    '19': { class_type: 'SaveImage', inputs: { images: ['18', 0], filename_prefix: 'wordwerx_reangle' } },
  };
}

// --- Expression edit (Flux Kontext: ref image + instruction) ------------------
// REPRESENTATIVE — validate node names against your Kontext build.
export function expressionEdit(p: { refImageName: string; instruction: string; seed?: number }): Record<string, any> {
  const seed = p.seed ?? rnd();
  return {
    '1': { class_type: 'LoadImage', inputs: { image: p.refImageName } },
    '2': { class_type: 'FluxKontextImageScale', inputs: { image: ['1', 0] } },
    '3': { class_type: 'UNETLoader', inputs: { unet_name: 'flux1-kontext-dev.safetensors', weight_dtype: 'default' } },
    '4': { class_type: 'DualCLIPLoader', inputs: { clip_name1: 't5xxl_fp16.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' } },
    '5': { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
    '6': { class_type: 'VAEEncode', inputs: { pixels: ['2', 0], vae: ['5', 0] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 0], text: p.instruction } },
    '8': { class_type: 'ReferenceLatent', inputs: { conditioning: ['7', 0], latent: ['6', 0] } },
    '9': { class_type: 'FluxGuidance', inputs: { conditioning: ['8', 0], guidance: 2.5 } },
    '10': { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['7', 0] } },
    '11': { class_type: 'KSampler', inputs: { model: ['3', 0], positive: ['9', 0], negative: ['10', 0], latent_image: ['6', 0], seed, steps: 20, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    '12': { class_type: 'VAEDecode', inputs: { samples: ['11', 0], vae: ['5', 0] } },
    '13': { class_type: 'SaveImage', inputs: { images: ['12', 0], filename_prefix: 'wordwerx_expr' } },
  };
}

// --- Perspective-consistent location regen (extract lines -> ControlNet) ------
// REPRESENTATIVE — validate preprocessor + controlnet model names.
export function perspectiveConsistent(p: {
  refImageName: string;
  positive: string;
  negative?: string;
  controlType?: 'canny' | 'depth';
  strength?: number;
  seed?: number;
}): Record<string, any> {
  const seed = p.seed ?? rnd();
  const pre = p.controlType === 'depth'
    ? { class_type: 'DepthAnythingV2Preprocessor', inputs: { image: ['1', 0], resolution: 1024 } }
    : { class_type: 'CannyEdgePreprocessor', inputs: { image: ['1', 0], low_threshold: 100, high_threshold: 200, resolution: 1024 } };
  const cnModel = p.controlType === 'depth' ? 'flux-depth-controlnet.safetensors' : 'flux-canny-controlnet.safetensors';
  return {
    '1': { class_type: 'LoadImage', inputs: { image: p.refImageName } },
    '2': pre,
    '3': { class_type: 'UNETLoader', inputs: { unet_name: 'flux1-dev.safetensors', weight_dtype: 'default' } },
    '4': { class_type: 'DualCLIPLoader', inputs: { clip_name1: 't5xxl_fp16.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' } },
    '5': { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
    '6': { class_type: 'ControlNetLoader', inputs: { control_net_name: cnModel } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 0], text: p.positive } },
    '8': { class_type: 'FluxGuidance', inputs: { conditioning: ['7', 0], guidance: 3.5 } },
    '9': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 0], text: p.negative ?? '' } },
    '10': { class_type: 'ControlNetApplyAdvanced', inputs: { positive: ['8', 0], negative: ['9', 0], control_net: ['6', 0], image: ['2', 0], strength: p.strength ?? 0.7, start_percent: 0, end_percent: 0.8, vae: ['5', 0] } },
    '11': { class_type: 'EmptySD3LatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
    '12': { class_type: 'KSampler', inputs: { model: ['3', 0], positive: ['10', 0], negative: ['10', 1], latent_image: ['11', 0], seed, steps: 24, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1 } },
    '13': { class_type: 'VAEDecode', inputs: { samples: ['12', 0], vae: ['5', 0] } },
    '14': { class_type: 'SaveImage', inputs: { images: ['13', 0], filename_prefix: 'wordwerx_persp' } },
  };
}

// --- Catalog (drives the UI pickers) -----------------------------------------
export interface UseCaseMeta { id: UseCase; label: string; blurb: string; needsRefImage: boolean }
export const USE_CASES: UseCaseMeta[] = [
  { id: 'txt2img-flux', label: 'Prototype (Flux)', blurb: 'Rapid character / scene design from a prompt.', needsRefImage: false },
  { id: 'txt2img-sdxl', label: 'Prototype (SDXL)', blurb: 'Faster / cheaper drafts, big LoRA ecosystem.', needsRefImage: false },
  { id: 'dataset-batch', label: 'Dataset batch', blurb: 'Generate many variations to train a LoRA.', needsRefImage: false },
  { id: 'expression-edit', label: 'Expression edit', blurb: 'Change a canonical character’s expression (Kontext).', needsRefImage: true },
  { id: 'perspective-consistent', label: 'New perspective', blurb: 'Regenerate a location from another angle via its lines.', needsRefImage: true },
];
