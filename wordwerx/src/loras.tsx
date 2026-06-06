import React from 'react';
import { cx } from './ui';
import { CHARACTERS } from './data';
import { listLoras, uploadLora, trainLora, generate, pollJob, type Lora } from './services/runpod';

// LoRA Manager — list, upload existing .safetensors, and train a new LoRA from
// a character's image set. Trained/uploaded LoRAs land on the network volume
// and become selectable everywhere generation happens.
export function LoraManager({ flash }: { flash?: (m: string) => void }) {
  const [loras, setLoras] = React.useState<Lora[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'library' | 'train'>('library');

  const refresh = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try { setLoras(await listLoras()); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  function note(m: string) { flash ? flash(m) : setErr(null); }

  async function onUpload(file: File) {
    try { const name = await uploadLora(file); note(`Uploaded ${name}`); refresh(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="ww-sheet" style={{ padding: 24 }}>
      <div className="ww-insp-sub" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <b style={{ color: 'var(--ink)' }}>LoRAs</b>
        <button className={cx('ww-filter', tab === 'library' && 'is-on')} onClick={() => setTab('library')}>Library</button>
        <button className={cx('ww-filter', tab === 'train' && 'is-on')} onClick={() => setTab('train')}>Train new</button>
        <span style={{ flex: 1 }} />
        <UploadButton onPick={onUpload} />
      </div>

      {err && <div className="ww-toast" style={{ position: 'static', margin: '12px 0', color: '#ff7a6a' }}>{err}</div>}

      {tab === 'library' && (
        <div style={{ marginTop: 16 }}>
          {loading ? <p>Loading LoRAs…</p> : loras.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No LoRAs on the volume yet. Upload a .safetensors or train one.</p>
          ) : (
            <div className="ww-libgrid">
              {loras.map(l => (
                <div key={l.name} className="ww-castcard">
                  <div className="ww-castcard-art" style={{ background: 'radial-gradient(80% 80% at 50% 30%, oklch(0.5 0.13 285), #0a0c12 80%)' }}>
                    <span className="ww-castcard-mono">{l.name.replace('.safetensors', '')}</span>
                  </div>
                  <div className="ww-castcard-meta"><b>{l.name}</b><span>{(l.size / 1e6).toFixed(1)} MB</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'train' && <TrainPanel onDone={(m) => { note(m); refresh(); setTab('library'); }} onError={setErr} />}
    </div>
  );
}

function UploadButton({ onPick }: { onPick: (f: File) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="ww-gen-btn" onClick={() => ref.current?.click()}>⤓ Upload .safetensors</button>
      <input ref={ref} type="file" accept=".safetensors" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
    </>
  );
}

function TrainPanel({ onDone, onError }: { onDone: (m: string) => void; onError: (m: string) => void }) {
  const [name, setName] = React.useState('');
  const [character, setCharacter] = React.useState(CHARACTERS[0]?.id || '');
  const [trigger, setTrigger] = React.useState('');
  const [steps, setSteps] = React.useState(1500);
  const [rank, setRank] = React.useState(32);
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function submit() {
    if (!name) return onError('Give the LoRA a name.');
    if (files.length < 5) return onError('Add at least ~5 training images (10–25 recommended).');
    setBusy(true); setStatus('Uploading dataset…');
    try {
      const { jobId, expectedLora } = await trainLora(
        { name, triggerWord: trigger || name, steps, rank },
        files,
      );
      setStatus('Training… this can take a while');
      // Reuse the generic poller via the generate service’s job endpoint.
      await pollJob(jobId, { onTick: s => setStatus(`Training: ${s.status}`), timeoutMs: 4 * 60 * 60 * 1000 });
      onDone(`Trained ${expectedLora}`);
    } catch (e: any) { onError(e.message); }
    finally { setBusy(false); setStatus(null); }
  }

  return (
    <div style={{ marginTop: 16, maxWidth: 640, display: 'grid', gap: 12 }}>
      <Field label="LoRA name"><input className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={name} onChange={e => setName(e.target.value)} placeholder="echo_v1" /></Field>
      <Field label="Character (for the roster link)">
        <select className="ww-gen-prompt" style={{ minHeight: 0, height: 36 }} value={character} onChange={e => setCharacter(e.target.value)}>
          {CHARACTERS.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Trigger word"><input className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={trigger} onChange={e => setTrigger(e.target.value)} placeholder={name || 'echo'} /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Steps"><input type="number" className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={steps} onChange={e => setSteps(+e.target.value)} /></Field>
        <Field label="Rank (dim)"><input type="number" className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={rank} onChange={e => setRank(+e.target.value)} /></Field>
      </div>
      <Field label={`Training images (${files.length})`}>
        <button className="ww-filter" onClick={() => fileRef.current?.click()}>+ Add images</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { setFiles(f => [...f, ...Array.from(e.target.files || [])]); e.currentTarget.value = ''; }} />
      </Field>
      {status && <p style={{ opacity: 0.8 }}>{status}</p>}
      <div><button className={cx('ww-gen-btn', busy && 'is-busy')} disabled={busy} onClick={submit}>{busy ? 'Training…' : '✦ Train LoRA'}</button></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 4, flex: 1 }}><span className="ww-insp-sub" style={{ fontSize: 12 }}>{label}</span>{children}</label>;
}

// Helper for callers that want to generate a dataset for a LoRA from a prompt.
export async function generateDataset(workflow: unknown, onStatus?: (s: string) => void) {
  return generate(workflow, { onStatus });
}
