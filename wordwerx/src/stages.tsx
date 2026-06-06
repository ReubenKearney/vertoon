import React from 'react';
import { cx } from './ui';
import { AssetThumb, StateDot } from './ui';
import { CHARACTERS, EPISODE } from './data';
import { Scene } from './scenes';
import { USE_CASES, txt2imgFlux, txt2imgSDXL, datasetBatch, type UseCase } from './workflows';
import { generate as runGenerate, imageSrc, listLoras, type Lora } from './services/runpod';

export function Library({ library, setLibrary, onUseAsset }: any) {
  const [filter, setFilter] = React.useState('All');
  const [prompt, setPrompt] = React.useState('Sulawesi access tunnel, wet concrete, single failing lamp, lethal night outside, dusk-to-indigo grade');
  const [busy, setBusy] = React.useState(false);
  const [useCase, setUseCase] = React.useState<UseCase>('txt2img-flux');
  const [lora, setLora] = React.useState('');
  const [loras, setLoras] = React.useState<Lora[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const kinds = ['All', 'Background', 'Character', 'Prop', 'FX plate'];
  const shown = library.filter((a: any) => filter === 'All' || a.kind === filter);

  React.useEffect(() => { listLoras().then(setLoras).catch(() => {}); }, []);

  function buildWorkflow() {
    const loraRef = lora ? { name: lora, strength: 0.9 } : undefined;
    if (useCase === 'txt2img-sdxl') return txt2imgSDXL({ positive: prompt, lora: loraRef });
    if (useCase === 'dataset-batch') return datasetBatch({ positive: prompt, count: 8, lora: loraRef });
    return txt2imgFlux({ positive: prompt, lora: loraRef });
  }

  async function generate() {
    setBusy(true); setStatus('Submitting…');
    const ph = { id: 'g' + Math.random().toString(36).slice(2, 6), kind: 'Background', scene: 'tunnels', name: 'Gen · ' + prompt.split(',')[0].slice(0, 22), source: 'AI', tags: ['new'], state: 'Queued' };
    setLibrary((l: any[]) => [ph, ...l]);
    try {
      const images = await runGenerate(buildWorkflow(), { onStatus: setStatus });
      const url = images[0] ? imageSrc(images[0]) : undefined;
      setLibrary((l: any[]) => l.map((a: any) => a.id === ph.id ? { ...a, state: 'Generated', imageUrl: url } : a));
    } catch (e: any) {
      setLibrary((l: any[]) => l.map((a: any) => a.id === ph.id ? { ...a, state: 'Rejected', error: e.message } : a));
    } finally { setBusy(false); setStatus(null); }
  }

  return (
    <div className="ww-library">
      <div className="ww-gen">
        <div className="ww-gen-head"><span className="ww-cop-orb" /> Generate art</div>
        <textarea className="ww-gen-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
        <div className="ww-gen-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select className="ww-filter" value={useCase} onChange={e => setUseCase(e.target.value as UseCase)} title="Workflow">
            {USE_CASES.filter(u => !u.needsRefImage).map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <select className="ww-filter" value={lora} onChange={e => setLora(e.target.value)} title="Character LoRA">
            <option value="">No LoRA</option>
            {loras.map(l => <option key={l.name} value={l.name}>{l.name.replace('.safetensors', '')}</option>)}
          </select>
          <div className="ww-gen-style">{status ? status : <>Style lock: <b>Echo dusk key</b></>}</div>
          <button className={cx('ww-gen-btn', busy && 'is-busy')} onClick={generate} disabled={busy}>{busy ? 'Generating…' : '✦ Generate'}</button>
        </div>
      </div>
      <div className="ww-lib-bar">
        <div className="ww-filters">{kinds.map(k => <button key={k} className={cx('ww-filter', filter === k && 'is-on')} onClick={() => setFilter(k)}>{k}</button>)}</div>
        <span className="ww-lib-count">{shown.length} assets</span>
      </div>
      <div className="ww-libgrid">
        {shown.map((a: any) => (
          <AssetThumb key={a.id} scene={a.scene} label={a.name} sub={a.kind} source={a.source} state={a.state} imageUrl={a.imageUrl} onClick={() => onUseAsset && onUseAsset(a)} />
        ))}
      </div>
      <div className="ww-cast">
        <div className="ww-insp-sub">Cast plates · {CHARACTERS.length}</div>
        <div className="ww-castrow">
          {CHARACTERS.map((c: any) => (
            <div key={c.id} className="ww-castcard">
              <div className="ww-castcard-art" style={{ background: `radial-gradient(80% 80% at 50% 30%, oklch(0.5 0.13 ${c.tint}), #0a0c12 80%)` }}>
                <span className="ww-castcard-mono">{c.name.split(' ')[0]}</span>
              </div>
              <div className="ww-castcard-meta"><b>{c.name}</b><span>{c.role}</span><StateDot state={c.state} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Story({ panels }: any) {
  const e = EPISODE;
  return (
    <div className="ww-story">
      <div className="ww-story-hero">
        <div className="ww-pv-kicker">{e.genre}</div>
        <h1>{e.series}</h1>
        <div className="ww-story-ep">{e.number} — "{e.title}"</div>
        <p className="ww-story-log">{e.logline}</p>
      </div>
      <div className="ww-story-cols">
        <div className="ww-story-beats">
          <div className="ww-insp-sub">Beat sheet · {panels.length} panels</div>
          <ol className="ww-beatlist">
            {panels.map((p: any) => (
              <li key={p.id} className="ww-beat">
                <span className="ww-beat-n">{String(p.n).padStart(2, '0')}</span>
                <div className="ww-beat-mini"><Scene kind={p.scene} /></div>
                <div className="ww-beat-meta"><b>{p.slug}</b><span>{p.beat}</span></div>
                <span className="ww-beat-fx">{p.fx.length} fx</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="ww-story-side">
          <div className="ww-insp-sub">Portrayal rules</div>
          <ul className="ww-rules">
            <li>Echo is <b>voice only</b> — no avatar, no omniscience.</li>
            <li>Explicit physical limits; at least one hesitation.</li>
            <li>Night lethality implied, never explained ("the blanket").</li>
            <li>POV: Neelai only for Episode 01.</li>
          </ul>
          <div className="ww-insp-sub" style={{ marginTop: 18 }}>Throughlines</div>
          <div className="ww-thru">
            <span style={{ '--h': '0deg' } as any}>Physics · the cases</span>
            <span style={{ '--h': '285deg' } as any}>Echo · personhood</span>
            <span style={{ '--h': '200deg' } as any}>Indu · kinship</span>
            <span style={{ '--h': '25deg' } as any}>Rajni · control</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Publish({ panels }: any) {
  const [pubbed, setPubbed] = React.useState(false);
  const [opt, setOpt] = React.useState(true);
  const fxCount = panels.reduce((n: number, p: any) => n + p.fx.length, 0);
  return (
    <div className="ww-publish">
      <div className="ww-pub-main">
        <div className="ww-pv-kicker">Publish</div>
        <h2>Ship "{EPISODE.title}"</h2>
        <p className="ww-pub-sub">Bundle the episode as a single self-contained web page — effects baked in, opens offline, share by link or file.</p>
        <div className="ww-pub-stats">
          <div><b>{panels.length}</b><span>panels</span></div>
          <div><b>{fxCount}</b><span>effects</span></div>
          <div><b>{opt ? '~0.4' : '2.1'}MB</b><span>first paint</span></div>
          <div><b>16:9 → 9:19</b><span>vertical</span></div>
        </div>
        <label className="ww-pub-opt"><input type="checkbox" checked={opt} onChange={e => setOpt(e.target.checked)} /><span><b>Lazy-load FX plates</b> — first paint under 400KB, effects stream in as the reader scrolls.</span></label>
        <div className="ww-pub-format">
          <div className="ww-pub-fmt is-on"><b>Self-contained web page</b><span>.html · one file</span><i>✓</i></div>
          <div className="ww-pub-fmt"><b>Embeddable widget</b><span>iframe snippet</span></div>
          <div className="ww-pub-fmt"><b>Static fallback</b><span>poster image</span></div>
        </div>
        <button className={cx('ww-pub-go', pubbed && 'is-done')} onClick={() => setPubbed(true)}>{pubbed ? '✓ Published' : 'Publish episode'}</button>
        {pubbed && (
          <div className="ww-pub-link">
            <code>vertoon.local/echos-location/ep-01</code>
            <button onClick={() => {}}>Copy link</button>
          </div>
        )}
      </div>
      <div className="ww-pub-aside">
        <div className="ww-pub-poster">
          <Scene kind="dusk_skyline" />
          <div className="ww-pub-poster-meta"><span>Episode 01</span><b>Wrong Place, Right Voice</b><i>Echo's Location</i></div>
        </div>
        <div className="ww-pub-share">
          <div className="ww-insp-sub">Auto share copy</div>
          <p>"The hour the city starts counting heads. A journalist, a lamplighter, and a voice with no face. Read it scrolling."</p>
        </div>
      </div>
    </div>
  );
}
