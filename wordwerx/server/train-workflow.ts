// Builds a ComfyUI-FluxTrainer workflow that trains a LoRA from a dataset
// folder on the network volume and writes the resulting .safetensors into
// models/loras/ (so it's immediately usable by generation workflows).
//
// Built as an object (not string-substituted JSON) so numeric inputs stay
// numbers — FluxTrainer's nodes reject string widget values and 500 at queue.
//
// NOTE: FluxTrainer node graphs are version-sensitive. Validate against the
// installed node version by exporting a known-good training workflow from a live
// ComfyUI (Export > API) if the schema drifts.

export interface TrainConfig {
  name: string;            // output lora name (without extension)
  datasetPath: string;     // /runpod-volume/training/<name>
  triggerWord?: string;
  steps?: number;          // default 1500
  rank?: number;           // network dim, default 32
  learningRate?: number;   // default 1e-4
  resolution?: number;     // default 1024
}

export function buildTrainWorkflow(cfg: TrainConfig): Record<string, unknown> {
  const steps = cfg.steps ?? 1500;
  const rank = cfg.rank ?? 32;
  const lr = cfg.learningRate ?? 0.0001;
  const res = cfg.resolution ?? 1024;
  const trigger = cfg.triggerWord || cfg.name;

  return {
    '1': { class_type: 'FluxTrainModelSelect', inputs: {
      transformer: 'flux1-dev.safetensors', vae: 'ae.safetensors',
      clip_l: 'clip_l.safetensors', t5: 't5xxl_fp16.safetensors',
    } },
    '2': { class_type: 'TrainDatasetGeneralConfig', inputs: {
      color_aug: false, flip_aug: false, shuffle_caption: false, caption_dropout_rate: 0.0,
      alpha_mask: false,
    } },
    '3': { class_type: 'TrainDatasetAdd', inputs: {
      dataset_config: ['2', 0], width: res, height: res, batch_size: 1,
      dataset_path: cfg.datasetPath, class_tokens: trigger, num_repeats: 10,
      enable_bucket: true, bucket_no_upscale: false, min_bucket_reso: 256, max_bucket_reso: 1024,
    } },
    '4': { class_type: 'OptimizerConfig', inputs: {
      optimizer_type: 'adamw8bit', max_grad_norm: 1.0, lr_scheduler: 'constant', lr_warmup_steps: 0,
      lr_scheduler_num_cycles: 1, lr_scheduler_power: 1.0, min_snr_gamma: 5.0, extra_optimizer_args: '',
    } },
    '5': { class_type: 'InitFluxLoRATraining', inputs: {
      flux_models: ['1', 0], dataset: ['3', 0], optimizer_settings: ['4', 0],
      output_name: cfg.name, output_dir: '/runpod-volume/models/loras',
      network_dim: rank, network_alpha: rank, learning_rate: lr, max_train_steps: steps,
      gradient_checkpointing: 'enabled', gradient_dtype: 'bf16', save_dtype: 'bf16',
      attention_mode: 'sdpa', apply_t5_attn_mask: true, cache_latents: 'disabled',
      cache_text_encoder_outputs: 'disabled', blocks_to_swap: 0, weighting_scheme: 'logit_normal',
      logit_mean: 0.0, logit_std: 1.0, mode_scale: 1.29, timestep_sampling: 'sigmoid',
      sigmoid_scale: 1.0, model_prediction_type: 'raw', guidance_scale: 1.0,
      discrete_flow_shift: 1.0, highvram: false, fp8_base: true, sample_prompts: '',
    } },
    '6': { class_type: 'FluxTrainLoop', inputs: { network_trainer: ['5', 0], steps } },
    '7': { class_type: 'FluxTrainSave', inputs: {
      network_trainer: ['6', 0], save_state: false, copy_to_comfy_lora_folder: false,
    } },
    // Terminal OUTPUT node — without it ComfyUI rejects the prompt ("no outputs").
    '8': { class_type: 'FluxTrainEnd', inputs: { network_trainer: ['7', 0], save_state: false } },
  };
}
