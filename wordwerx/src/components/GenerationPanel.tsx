import React from 'react';
import { cx } from '../ui';
import {
  USE_CASES, txt2imgFlux, txt2imgSDXL, datasetBatch, expressionEdit, perspectiveConsistent,
  type UseCase,
} from '../workflows';
import { submitWorkflow, pollJob, imageSrc, listLoras, type Lora } from '../services/runpod';
import { saveAsset } from '../services/store';
import { useUI } from '../ui-context';

export interface GenResult { id: string; url: string }

export interface GenerationPanelProps {
  workflows: UseCase[];                 // which use cases to offer (>=1)
  initialPrompt?: string;
  prompt?: string;                      // controlled prompt (persisted by parent)
  onPromptChange?: (v: string) => void;
  negative?: string;                    // controlled negative
  onNegativeChange?: (v: string) => void;
  promptLabel?: string;                 // textarea placeholder hint
  showLora?: boolean;                   // show LoRA picker
  lora?: string;                        // forced LoRA (e.g. a character's); used even if picker hidden
  refImage?: string;                    // data URL — required for edit/perspective workflows
  count?: number;                       // dataset-batch size
  online?: boolean;                     // false => Generate disabled
  buttonLabel?: string;
  plainBgDefault?: boolean;             // default the "plain background" toggle on
  fullBody?: boolean;                   // force full-body framing (character refs)
  negativeDefault?: string;
  flash?: (m: string) => void;
  onPending?: (n: number) => void;      // n placeholder slots while generating (0 = done)
  onResult: (assets: GenResult[], ctx: { useCase: UseCase; prompt: string; lora?: string }) => void | Promise<void>;
}

// Per-model capabilities + best-practice defaults.
function modelOf(useCase: UseCase): 'flux' | 'sdxl' {
  return useCase === 'txt2img-sdxl' ? 'sdxl' : 'flux';
}
const MODEL_DEFAULTS = {
  flux: { steps: 20, negatives: false },   // distilled: cfg=1, no negative prompt
  sdxl: { steps: 28, negatives: true },
} as const;
const FULL_BODY = ', full-body shot, head to toe, entire body and feet visible, full-length, standing, centered';

interface AdvOpts { prompt: string; lora?: string; count?: number; controlType?: 'canny' | 'depth'; negative?: string; seed?: number; steps?: number; width?: number; height?: number }

function buildWorkflow(useCase: UseCase, o: AdvOpts): unknown {
  const loraRef = o.lora ? { name: o.lora, strength: 0.9 } : undefined;
  const base = { positive: o.prompt, negative: o.negative, seed: o.seed, steps: o.steps, width: o.width, height: o.height, lora: loraRef };
  switch (useCase) {
    case 'txt2img-sdxl': return txt2imgSDXL(base);
    case 'dataset-batch': return datasetBatch({ ...base, count: o.count ?? 8 });
    case 'expression-edit': return expressionEdit({ refImageName: 'ref.png', instruction: o.prompt, seed: o.seed });
    case 'perspective-consistent': return perspectiveConsistent({ refImageName: 'ref.png', positive: o.prompt, negative: o.negative, controlType: o.controlType, seed: o.seed });
    default: return txt2imgFlux(base);
  }
}

const PLAIN_BG = ', isolated subject on a plain neutral light-grey studio background, clean backdrop, full body, even lighting';

export function GenerationPanel(p: GenerationPanelProps) {
  const ui = useUI();
  const [useCase, setUseCase] = React.useState<UseCase>(p.workflows[0]);
  const [internalPrompt, setInternalPrompt] = React.useState(p.initialPrompt ?? '');
  const prompt = p.prompt !== undefined ? p.prompt : internalPrompt;
  const setPrompt = (v: string) => (p.onPromptChange ? p.onPromptChange(v) : setInternalPrompt(v));
  const [lora, setLora] = React.useState(p.lora ?? '');
  const [loras, setLoras] = React.useState<Lora[]>([]);
  const [controlType, setControlType] = React.useState<'canny' | 'depth'>('canny');
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  // Advanced / deterministic settings.
  const [advOpen, setAdvOpen] = React.useState(false);
  const [internalNeg, setInternalNeg] = React.useState(p.negativeDefault ?? '');
  const negative = p.negative !== undefined ? p.negative : internalNeg;
  const setNegative = (v: string) => (p.onNegativeChange ? p.onNegativeChange(v) : setInternalNeg(v));
  const [seedLock, setSeedLock] = React.useState(false);
  const [seed, setSeed] = React.useState(0);
  const model = modelOf(useCase);
  const caps = MODEL_DEFAULTS[model];
  const [steps, setSteps] = React.useState<number>(caps.steps);   // best default for the model
  const [width, setWidth] = React.useState(p.fullBody ? 832 : 1024);
  const [height, setHeight] = React.useState(p.fullBody ? 1216 : 1024);
  const [plainBg, setPlainBg] = React.useState(!!p.plainBgDefault);
  const jobRef = React.useRef<string | null>(null);
  const cancelledRef = React.useRef(false);

  React.useEffect(() => { if (p.showLora) listLoras().then(setLoras).catch(() => {}); }, [p.showLora]);
  // Only seed the internal prompt when uncontrolled.
  React.useEffect(() => { if (p.prompt === undefined && p.initialPrompt !== undefined) setInternalPrompt(p.initialPrompt); }, [p.initialPrompt, p.prompt]);
  React.useEffect(() => { if (p.lora !== undefined) setLora(p.lora); }, [p.lora]);
  // When the model changes, reset steps to that model's best default.
  React.useEffect(() => { setSteps(MODEL_DEFAULTS[modelOf(useCase)].steps); }, [useCase]);

  const meta = USE_CASES.find(u => u.id === useCase);
  const needsRef = meta?.needsRefImage;
  const missingRef = needsRef && !p.refImage;
  const offline = p.online === false;
  const effectiveLora = p.lora ?? (p.showLora ? lora : undefined);
  const canRun = !busy && !offline && !missingRef && prompt.trim().length > 0;

  async function run() {
    setBusy(true); setStatus('Submitting…'); cancelledRef.current = false;
    setElapsed(0);
    tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    const expected = useCase === 'dataset-batch' ? (p.count ?? 8) : 1;
    p.onPending?.(expected);
    try {
      const positive = prompt + (plainBg ? PLAIN_BG : '') + (p.fullBody ? FULL_BODY : '');
      const wf = buildWorkflow(useCase, {
        prompt: positive, lora: effectiveLora || undefined, count: p.count, controlType,
        negative: caps.negatives ? (negative || undefined) : undefined, seed: seedLock ? seed : undefined,
        steps: steps || undefined, width, height,
      });
      const images = p.refImage ? [{ name: 'ref.png', image: p.refImage }] : undefined;
      const jobId = await submitWorkflow(wf, images);
      jobRef.current = jobId;
      const res = await pollJob(jobId, { onTick: s => setStatus(s.status) });
      const outs = res.output?.images ?? [];
      const saved: GenResult[] = [];
      for (const im of outs) saved.push(await saveAsset(imageSrc(im), { workflow: useCase, prompt, lora: effectiveLora }));
      await p.onResult(saved, { useCase, prompt, lora: effectiveLora || undefined });
      ui.notifyDone(saved.length);
      p.flash?.(`Generated ${saved.length} image${saved.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      if (cancelledRef.current) p.flash?.('Generation cancelled');
      else { ui.notifyError(); p.flash?.('Generation failed: ' + e.message); }
    } finally { setBusy(false); setStatus(null); jobRef.current = null; p.onPending?.(0); if (tickRef.current) clearInterval(tickRef.current); }
  }

  // Friendly status + rough countdown (cold start ≈ up to ~2 min).
  function statusLine(): string {
    if (!busy) return offline ? 'Offline — generation paused' : missingRef ? 'Needs a reference image' : (p.lora ? `LoRA: ${p.lora.replace('.safetensors', '')}` : 'Ready');
    const est = 120, left = Math.max(0, est - elapsed);
    const phase = status === 'IN_QUEUE' ? 'Warming up (cold start)' : status === 'IN_PROGRESS' ? 'Rendering' : 'Submitting';
    return `${phase} · ${elapsed}s${left > 0 ? ` · ~${left}s left` : ' · almost done'}`;
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
        <div className="ww-gen-style">{statusLine()}</div>
        {busy
          ? <button className="ww-gen-btn" onClick={cancel}>Cancel</button>
          : <button className={cx('ww-gen-btn', !canRun && 'is-offline')} onClick={run} disabled={!canRun}>{p.buttonLabel || '✦ Generate'}</button>}
      </div>

      <div className="ww-adv">
        <button className="ww-adv-head" onClick={() => setAdvOpen(o => !o)}>
          <span style={{ fontSize: 10 }}>{advOpen ? '▾' : '▸'}</span> Advanced settings · {model.toUpperCase()} {seedLock && <span className="ww-offline" style={{ color: 'var(--accent2)', background: 'color-mix(in oklab,var(--accent2) 16%,transparent)' }}>seed locked</span>}
        </button>
        {advOpen && (
          <div className="ww-adv-body">
            {caps.negatives && (
              <label className="ww-adv-full">Negative prompt
                <input value={negative} placeholder="things to avoid…" onChange={e => setNegative(e.target.value)} />
              </label>
            )}
            <label>Seed
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={seed} disabled={!seedLock} onChange={e => setSeed(+e.target.value)} style={{ flex: 1 }} />
                <button className="ww-filter" style={{ padding: '0 8px' }} title="Lock seed for reproducible results" onClick={() => setSeedLock(v => !v)}>{seedLock ? '🔒' : '🎲'}</button>
              </div>
            </label>
            <label>Steps<input type="number" value={steps} onChange={e => setSteps(+e.target.value)} /></label>
            <label>Width<input type="number" step={64} value={width} onChange={e => setWidth(+e.target.value)} /></label>
            <label>Height<input type="number" step={64} value={height} onChange={e => setHeight(+e.target.value)} /></label>
            <label className="ww-adv-toggle ww-adv-full">
              <input type="checkbox" checked={plainBg} onChange={e => setPlainBg(e.target.checked)} />
              <span><b>Plain background</b> — clean studio backdrop, recommended for character references</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
