import React from 'react';
import { cx } from '../ui';
import {
  USE_CASES, txt2imgFlux, txt2imgSDXL, datasetBatch, expressionEdit, perspectiveConsistent,
  type UseCase,
} from '../workflows';
import { submitWorkflow, pollJob, imageSrc, listLoras, type Lora } from '../services/runpod';
import { saveAsset } from '../services/store';

export interface GenResult { id: string; url: string }

export interface GenerationPanelProps {
  workflows: UseCase[];                 // which use cases to offer (>=1)
  initialPrompt?: string;
  promptLabel?: string;                 // textarea placeholder hint
  showLora?: boolean;                   // show LoRA picker
  lora?: string;                        // forced LoRA (e.g. a character's); used even if picker hidden
  refImage?: string;                    // data URL — required for edit/perspective workflows
  count?: number;                       // dataset-batch size
  online?: boolean;                     // false => Generate disabled
  buttonLabel?: string;
  flash?: (m: string) => void;
  onResult: (assets: GenResult[], ctx: { useCase: UseCase; prompt: string; lora?: string }) => void | Promise<void>;
}

function buildWorkflow(useCase: UseCase, o: { prompt: string; lora?: string; count?: number; controlType?: 'canny' | 'depth' }): unknown {
  const loraRef = o.lora ? { name: o.lora, strength: 0.9 } : undefined;
  switch (useCase) {
    case 'txt2img-sdxl': return txt2imgSDXL({ positive: o.prompt, lora: loraRef });
    case 'dataset-batch': return datasetBatch({ positive: o.prompt, count: o.count ?? 8, lora: loraRef });
    case 'expression-edit': return expressionEdit({ refImageName: 'ref.png', instruction: o.prompt });
    case 'perspective-consistent': return perspectiveConsistent({ refImageName: 'ref.png', positive: o.prompt, controlType: o.controlType });
    default: return txt2imgFlux({ positive: o.prompt, lora: loraRef });
  }
}

export function GenerationPanel(p: GenerationPanelProps) {
  const [useCase, setUseCase] = React.useState<UseCase>(p.workflows[0]);
  const [prompt, setPrompt] = React.useState(p.initialPrompt ?? '');
  const [lora, setLora] = React.useState(p.lora ?? '');
  const [loras, setLoras] = React.useState<Lora[]>([]);
  const [controlType, setControlType] = React.useState<'canny' | 'depth'>('canny');
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const jobRef = React.useRef<string | null>(null);
  const cancelledRef = React.useRef(false);

  React.useEffect(() => { if (p.showLora) listLoras().then(setLoras).catch(() => {}); }, [p.showLora]);
  React.useEffect(() => { if (p.initialPrompt !== undefined) setPrompt(p.initialPrompt); }, [p.initialPrompt]);
  React.useEffect(() => { if (p.lora !== undefined) setLora(p.lora); }, [p.lora]);

  const meta = USE_CASES.find(u => u.id === useCase);
  const needsRef = meta?.needsRefImage;
  const missingRef = needsRef && !p.refImage;
  const offline = p.online === false;
  const effectiveLora = p.lora ?? (p.showLora ? lora : undefined);
  const canRun = !busy && !offline && !missingRef && prompt.trim().length > 0;

  async function run() {
    setBusy(true); setStatus('Submitting…'); cancelledRef.current = false;
    try {
      const wf = buildWorkflow(useCase, { prompt, lora: effectiveLora || undefined, count: p.count, controlType });
      const images = p.refImage ? [{ name: 'ref.png', image: p.refImage }] : undefined;
      const jobId = await submitWorkflow(wf, images);
      jobRef.current = jobId;
      const res = await pollJob(jobId, { onTick: s => setStatus(s.status) });
      const outs = res.output?.images ?? [];
      const saved: GenResult[] = [];
      for (const im of outs) saved.push(await saveAsset(imageSrc(im), { workflow: useCase, prompt, lora: effectiveLora }));
      await p.onResult(saved, { useCase, prompt, lora: effectiveLora || undefined });
      p.flash?.(`Generated ${saved.length} image${saved.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      if (cancelledRef.current) p.flash?.('Generation cancelled');
      else p.flash?.('Generation failed: ' + e.message);
    } finally { setBusy(false); setStatus(null); jobRef.current = null; }
  }

  async function cancel() {
    if (!jobRef.current) return;
    cancelledRef.current = true;
    try { await fetch(`/api/jobs/${jobRef.current}/cancel`, { method: 'POST' }); } catch { /* */ }
    setStatus('Cancelling…');
  }

  return (
    <div className="ww-gen">
      <div className="ww-gen-head"><span className="ww-cop-orb" /> Generate {offline && <span className="ww-offline">offline</span>}</div>
      <textarea className="ww-gen-prompt" value={prompt} rows={3}
        placeholder={p.promptLabel || (needsRef ? 'Describe the edit / new angle…' : 'Describe the image…')}
        onChange={e => setPrompt(e.target.value)} />
      <div className="ww-gen-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {p.workflows.length > 1 && (
          <select className="ww-filter" value={useCase} onChange={e => setUseCase(e.target.value as UseCase)} title="Workflow">
            {p.workflows.map(w => <option key={w} value={w}>{USE_CASES.find(u => u.id === w)?.label || w}</option>)}
          </select>
        )}
        {useCase === 'perspective-consistent' && (
          <select className="ww-filter" value={controlType} onChange={e => setControlType(e.target.value as any)} title="Control">
            <option value="canny">Lines (canny)</option>
            <option value="depth">Depth</option>
          </select>
        )}
        {p.showLora && (
          <select className="ww-filter" value={lora} onChange={e => setLora(e.target.value)} title="Character LoRA">
            <option value="">No LoRA</option>
            {loras.map(l => <option key={l.name} value={l.name}>{l.name.replace('.safetensors', '')}</option>)}
          </select>
        )}
        <div className="ww-gen-style">
          {offline ? 'Offline — generation paused' : missingRef ? 'Needs a reference image' : status || (p.lora ? `LoRA: ${p.lora.replace('.safetensors', '')}` : 'Ready')}
        </div>
        {busy
          ? <button className="ww-gen-btn" onClick={cancel}>Cancel</button>
          : <button className={cx('ww-gen-btn', !canRun && 'is-offline')} onClick={run} disabled={!canRun}>{p.buttonLabel || '✦ Generate'}</button>}
      </div>
    </div>
  );
}
