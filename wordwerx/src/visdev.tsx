import React from 'react';
import { cx } from './ui';
import { VISDEV, BIBLE } from './world';
import { Scene } from './scenes';
import { GenerationPanel, type GenResult } from './components/GenerationPanel';
import { generate, imageSrc } from './services/runpod';
import { expressionEdit, img2imgFlux } from './workflows';
import { assetUrl, assetIdOf, loadAssetDataUrl, saveAsset } from './services/store';
import { useUI } from './ui-context';

const VIS_TABS = [
  { id: 'board', label: 'Prototype board', glyph: '▦' },
  { id: 'sheets', label: 'Model sheets', glyph: '◳' },
  { id: 'locations', label: 'Locations', glyph: '⊞' },
];

const STATE_META: Record<string, { color: string }> = {
  Locked: { color: 'var(--accent2)' }, Candidate: { color: '#f3b23c' },
  Explored: { color: 'var(--ink3)' }, Rejected: { color: '#ff7a6a' },
};
const NEG_DEFAULT = 'lowres, bad anatomy, extra limbs, watermark, text, busy background';

let __vdT: ReturnType<typeof setTimeout> | undefined;

// Image thumbnail. By default click opens the global lightbox; pass onSelect to
// instead preview it elsewhere (e.g. the model-sheet hero).
function Thumb({ url, scene, style, onSelect }: { url?: string; scene?: string; style?: React.CSSProperties; onSelect?: (url: string) => void }) {
  const ui = useUI();
  if (url) return <img className="ww-zoomable" src={assetUrl(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} onClick={e => { e.stopPropagation(); onSelect ? onSelect(url) : ui.openImage(url); }} />;
  return <Scene kind={scene || 'tunnels'} />;
}

export function VisualDev({ tab, setTab, preselect, flash: flashProp, online, links, appearance, updateLink, visdevExtra, persistVisdev, hydrated }: any) {
  const [subjects, setSubjects] = React.useState(() =>
    (VISDEV || []).map((s: any) => ({ ...s, variants: s.variants.map((v: any) => ({ ...v })), history: [...s.history], sheetImgs: { poses: {}, expressions: {} } }))
  );
  const [selId, setSelId] = React.useState<string | null>(preselect || (VISDEV?.[0]?.id ?? null));
  const [localToast, setLocalToast] = React.useState<string | null>(null);
  const didHydrate = React.useRef(false);

  React.useEffect(() => { if (preselect) setSelId(preselect); }, [preselect]);
  React.useEffect(() => {
    if (didHydrate.current) return;
    if (hydrated) { if (visdevExtra?.subjects) setSubjects(visdevExtra.subjects); didHydrate.current = true; }
  }, [hydrated, visdevExtra]);
  React.useEffect(() => {
    if (!didHydrate.current) return;
    const id = setTimeout(() => persistVisdev?.({ subjects }), 700);
    return () => clearTimeout(id);
  }, [subjects]);

  function flash(msg: string) {
    if (flashProp) { flashProp(msg); return; }
    setLocalToast(msg); clearTimeout(__vdT); __vdT = setTimeout(() => setLocalToast(null), 2600);
  }

  const patchSubject = (subjId: string, fn: (s: any) => any) => setSubjects((prev: any[]) => prev.map((s: any) => s.id === subjId ? fn(s) : s));
  const isCharacter = (s: any) => s?.kind?.toLowerCase().includes('character');

  function lockVariant(subjId: string, v: string) {
    const subj = subjects.find((s: any) => s.id === subjId);
    const lockedImg = subj?.variants.find((vr: any) => vr.v === v)?.imageUrl;
    patchSubject(subjId, s => ({
      ...s, locked: v,
      variants: s.variants.map((vr: any) => vr.v === v ? { ...vr, state: 'Locked' } : vr.state === 'Locked' ? { ...vr, state: 'Explored' } : vr),
      history: [{ v, when: 'Locked just now', who: 'You' }, ...s.history],
    }));
    updateLink?.('visdevCanonical', subjId, { v, assetId: assetIdOf(lockedImg) });
    if (isCharacter(subj) && lockedImg) updateLink?.('characterPortrait', subjId, assetIdOf(lockedImg)); // feeds Narrative hero
    flash(`${subj?.subject || subjId} locked to ${v}`);
  }
  const setVariantState = (subjId: string, v: string, state: string) =>
    patchSubject(subjId, s => ({ ...s, variants: s.variants.map((vr: any) => vr.v === v ? { ...vr, state } : vr) }));
  function deleteVariant(subjId: string, v: string) {
    const subj = subjects.find((s: any) => s.id === subjId);
    if (subj?.locked === v && !window.confirm(`“${v}” is the locked canonical image for ${subj.subject}. Deleting it will unlock the subject and break its model sheet. Delete anyway?`)) return;
    patchSubject(subjId, s => ({ ...s, variants: s.variants.filter((vr: any) => vr.v !== v), locked: s.locked === v ? null : s.locked }));
    flash('Variant deleted');
  }
  function addVariant(subjId: string, imageUrl: string) {
    const subj = subjects.find((s: any) => s.id === subjId);
    const newV = 'v' + ((subj?.variants.length || 0) + 1);
    updateLink?.('visdevVariant', `${subjId}:${newV}`, assetIdOf(imageUrl)); // outside the updater (no setState-in-render)
    patchSubject(subjId, s => ({ ...s, variants: [...s.variants, { v: newV, scene: s.scene, hue: s.hue, state: 'Candidate', note: 'Generated candidate.', imageUrl }] }));
  }

  // Generate a model-sheet row (poses or expressions) from the locked canonical, incrementally.
  async function genSheet(subjId: string, kind: 'poses' | 'expressions', labels: string[]) {
    const subj = subjects.find((s: any) => s.id === subjId);
    const canonical = subj?.variants.find((v: any) => v.v === subj.locked)?.imageUrl;
    if (!canonical) { flash('Lock a generated variant first — the sheet edits the canonical image.'); return; }
    try {
      const ref = await loadAssetDataUrl(canonical);
      for (const label of labels) {
        flash(`Generating ${kind === 'poses' ? 'pose' : 'expression'} "${label}"…`);
        const instruction = kind === 'poses'
          ? `${subj.subject}, ${label} view, full body, same character, plain background`
          : `${subj.subject}, ${label} facial expression, same character`;
        const imgs = await generate(expressionEdit({ refImageName: 'ref.png', instruction }), { images: [{ name: 'ref.png', image: ref }] });
        if (imgs[0]) {
          const saved = await saveAsset(imageSrc(imgs[0]), { workflow: 'sheet', subject: subjId, kind, label });
          patchSubject(subjId, s => ({ ...s, sheetImgs: { ...s.sheetImgs, [kind]: { ...s.sheetImgs?.[kind], [label]: saved.url } } }));
        }
      }
      flash(`${kind === 'poses' ? 'Poses' : 'Expressions'} generated for ${subj.subject}`);
    } catch (e: any) { flash('Sheet generation failed: ' + e.message); }
  }

  const sel = subjects.find((s: any) => s.id === selId) || null;

  return (
    <div className="ww-vis">
      <div className="ww-subtabs">
        {VIS_TABS.map(t => (
          <button key={t.id} className={cx('ww-subtab', tab === t.id && 'is-on')} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 14 }}>{t.glyph}</span>{t.label}
            {t.id === 'board' && <span className="ww-subtab-c">{subjects.length}</span>}
            {t.id === 'sheets' && <span className="ww-subtab-c">{subjects.filter((s: any) => s.locked).length}</span>}
          </button>
        ))}
      </div>
      <div className="ww-vis-body">
        {tab === 'locations'
          ? <Locations online={online} flash={flash} links={links} updateLink={updateLink} />
          : (
            <div className="ww-proto">
              <SubjectSidebar subjects={subjects} selId={selId} setSelId={setSelId} />
              <div className="ww-proto-main">
                {!sel ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div className="ww-sheet-empty"><b>Select a subject</b><p>Pick a character, location or prop from the sidebar.</p></div>
                  </div>
                ) : tab === 'board'
                  ? <VariantInspector subj={sel} online={online} charLora={links?.characterLora?.[sel.id]?.loraName}
                      appearance={appearance} flash={flash} onLock={lockVariant} onSetState={setVariantState}
                      onDelete={deleteVariant} onVariant={addVariant} isCharacter={isCharacter(sel)} />
                  : <ModelSheet subj={sel} online={online} onGenSheet={genSheet} />}
              </div>
            </div>
          )}
      </div>
      {localToast && <div className="ww-toast">{localToast}</div>}
    </div>
  );
}

function SubjectSidebar({ subjects, selId, setSelId }: any) {
  return (
    <div className="ww-proto-subjects">
      <div className="ww-insp-sub" style={{ padding: '0 6px 10px' }}>Subjects · {subjects.length}</div>
      {subjects.map((s: any) => (
        <button key={s.id} className={cx('ww-proto-subj', s.id === selId && 'is-sel')} onClick={() => setSelId(s.id)}>
          <div className="ww-proto-subj-th"><Thumb url={s.variants.find((v: any) => v.v === s.locked)?.imageUrl} scene={s.scene} /></div>
          <div className="ww-proto-subj-meta"><b>{s.subject}</b><span>{s.kind}</span></div>
          <div className={cx('ww-proto-lockdot', s.locked ? 'locked' : 'open')} />
        </button>
      ))}
    </div>
  );
}

function VariantInspector({ subj, online, charLora, appearance, flash, onLock, onSetState, onDelete, onVariant, isCharacter }: any) {
  const [pending, setPending] = React.useState(0);
  const appear = (appearance && appearance[subj.id]) || (BIBLE || {})[subj.id]?.appearance || '';
  return (
    <div>
      <div className="ww-proto-brief">
        <div>
          <div className="ww-pv-kicker">Visual Dev · {subj.kind}</div>
          <h2>{subj.subject}</h2>
          <p>{subj.brief}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {subj.locked ? <div className="ww-vd-lockbadge"><span className="ww-vd-lockdot" />{subj.locked} locked</div> : <span className="ww-sheet-unlocktag">No lock</span>}
          {charLora && <span className="ww-sheet-unlocktag">LoRA · {charLora.replace('.safetensors', '')}</span>}
        </div>
      </div>

      {appear && (
        <div className="ww-bp-appear" style={{ marginBottom: 18, marginTop: 0 }}>
          <div className="ww-bp-appear-head"><div className="ww-insp-sub" style={{ margin: 0 }}>Narrative brief</div><span className="ww-bp-feeds">◎ from Characters</span></div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink)' }}>{appear}</p>
        </div>
      )}

      <GenerationPanel
        workflows={['txt2img-flux', 'txt2img-sdxl']}
        initialPrompt={appear ? `${appear} — ${subj.brief}` : subj.brief}
        lora={isCharacter ? charLora : undefined}
        plainBgDefault={isCharacter} fullBody={isCharacter} negativeDefault={NEG_DEFAULT}
        online={online} flash={flash} buttonLabel="✦ Generate variant"
        onPending={setPending}
        onResult={(assets: GenResult[]) => assets.forEach(a => onVariant(subj.id, a.url))}
      />

      <div className="ww-insp-sub" style={{ marginBottom: 12, marginTop: 18 }}>Variants · {subj.variants.length}</div>
      <div className="ww-vargrid">
        {Array.from({ length: pending }).map((_, i) => (
          <div key={'sk' + i} className="ww-varcard"><div className="ww-varcard-art ww-skel"><span className="ww-skel-tag">generating…</span></div><div className="ww-varcard-body"><div className="ww-varcard-state">Queued</div></div></div>
        ))}
        {subj.variants.map((v: any) => {
          const meta = STATE_META[v.state] || STATE_META.Explored;
          const locked = subj.locked === v.v;
          return (
            <div key={v.v} className={cx('ww-varcard', locked && 'is-locked')}>
              <div className="ww-varcard-art">
                <Thumb url={v.imageUrl} scene={v.scene} />
                <span className="ww-varcard-v">{v.v}</span>
                {locked && <span className="ww-varcard-lock">● locked</span>}
              </div>
              <div className="ww-varcard-body">
                <div className="ww-varcard-state" style={{ color: meta.color }}>{v.state}</div>
                <div className="ww-varcard-note">{v.note}</div>
                <div className="ww-varcard-actions">
                  {locked ? <div className="ww-lockbtn is-locked">● Canonical</div> : <button className="ww-lockbtn" onClick={() => onLock(subj.id, v.v)}>Lock canonical →</button>}
                  {!locked && v.state !== 'Rejected' && <button className="ww-varcard-dupe" title="Reject" onClick={() => onSetState(subj.id, v.v, 'Rejected')}>✕</button>}
                  <button className="ww-varcard-dupe" title="Delete variant" style={{ color: '#ff7a6a' }} onClick={() => onDelete(subj.id, v.v)}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelSheet({ subj, online, onGenSheet }: any) {
  const canonical = subj.variants.find((v: any) => v.v === subj.locked)?.imageUrl;
  const poses: string[] = subj.sheet?.poses || ['Front', '3/4', 'Profile'];
  const exprs: string[] = subj.sheet?.expressions || [];
  const [busy, setBusy] = React.useState<string | null>(null);
  const disabled = !canonical || online === false || !!busy;
  // Inline preview: clicking a pose/expression shows it big here (not a popup).
  const [preview, setPreview] = React.useState<{ url?: string; label: string }>({ label: 'Canonical' });
  const heroUrl = preview.url || canonical;
  const cell = (label: string, url?: string) => (
    <div className="ww-sheet-cell" key={label}>
      <div className={cx('ww-sheet-cell-art', preview.url === url && url && 'is-sel')}>
        <Thumb url={url} scene={subj.scene} onSelect={u => setPreview({ url: u, label })} />
      </div><span>{label}</span>
    </div>
  );

  async function run(kind: 'poses' | 'expressions', labels: string[]) {
    setBusy(kind); try { await onGenSheet(subj.id, kind, labels); } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="ww-sheet-top" style={{ marginBottom: 16 }}>
        <div>
          <div className="ww-pv-kicker">Model sheet · {subj.kind}</div>
          <h2>{subj.subject}{subj.locked ? <span className="ww-sheet-locktag" style={{ marginLeft: 10 }}>{subj.locked}</span> : <span className="ww-sheet-unlocktag" style={{ marginLeft: 10 }}>not locked</span>}</h2>
          <p>{subj.brief}</p>
        </div>
      </div>
      {!canonical && <div className="ww-sheet-empty" style={{ marginBottom: 18 }}><b>No canonical image yet</b><p>Generate a variant on the Prototype board and lock it — the sheet is built by editing that canonical image.</p></div>}

      <div className="ww-sheet-hero">
        <Thumb url={heroUrl} scene={subj.scene} />
        <div className="ww-sheet-hero-tag">{subj.subject}{preview.label ? ` · ${preview.label}` : ''}</div>
      </div>

      <div className="ww-sheet-cols">
        <div className="ww-sheet-block">
          <div className="ww-sheet-blockhead">
            <div className="ww-insp-sub">Poses · {poses.length}</div>
            <button className={cx('ww-gen-btn', disabled && 'is-offline')} disabled={disabled} onClick={() => run('poses', poses)}>{busy === 'poses' ? 'Generating…' : '✦ Generate poses'}</button>
          </div>
          <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${Math.min(poses.length, 4)},1fr)` }}>
            {poses.map(pose => cell(pose, subj.sheetImgs?.poses?.[pose]))}
          </div>
        </div>
        {exprs.length > 0 && (
          <div className="ww-sheet-block">
            <div className="ww-sheet-blockhead">
              <div className="ww-insp-sub">Expressions · {exprs.length}</div>
              <button className={cx('ww-gen-btn', disabled && 'is-offline')} disabled={disabled} onClick={() => run('expressions', exprs)}>{busy === 'expressions' ? 'Generating…' : '✦ Generate expressions'}</button>
            </div>
            <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${Math.min(exprs.length, 4)},1fr)` }}>
              {exprs.map(expr => cell(expr, subj.sheetImgs?.expressions?.[expr]))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// New angles of a location from a base image, via Flux img2img at an adjustable
// variation strength. Low strength keeps it close to the source; higher strength
// lets the camera angle actually shift (at some cost to exact consistency).
function Locations({ online, flash, updateLink }: any) {
  const ui = useUI();
  const [ref, setRef] = React.useState<string | null>(null);
  const [prompt, setPrompt] = React.useState('');
  const [strength, setStrength] = React.useState(0.65);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState(0);
  const [angles, setAngles] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pickRef = (file: File) => { const r = new FileReader(); r.onloadend = () => setRef(r.result as string); r.readAsDataURL(file); };

  async function generateAngle() {
    if (!ref) return flash('Load a location image first.');
    if (!prompt.trim()) return flash('Describe the new angle.');
    setBusy(true); setPending(1);
    try {
      const imgs = await generate(img2imgFlux({ refImageName: 'ref.png', positive: `${prompt}, same location, consistent architecture and lighting`, denoise: strength }), { images: [{ name: 'ref.png', image: ref }] });
      if (imgs[0]) {
        const saved = await saveAsset(imageSrc(imgs[0]), { workflow: 'reangle', prompt, strength });
        setAngles(a => [saved.url, ...a]);
        updateLink?.('locationAngles', 'session', [saved.url, ...angles]);
        ui.notifyDone(1); flash('New angle generated');
      }
    } catch (e: any) { ui.notifyError(); flash('Failed: ' + e.message); }
    finally { setBusy(false); setPending(0); }
  }

  return (
    <div className="ww-sheet">
      <div className="ww-sheet-top">
        <div>
          <div className="ww-pv-kicker">Visual Dev · Locations</div>
          <h2>New perspectives</h2>
          <p>Load a location image, describe a new camera angle, and set how far to deviate. Lower = closer to the source; higher = a bigger angle change.</p>
        </div>
        <button className="ww-filter" onClick={() => fileRef.current?.click()}>⤓ Load location image</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pickRef(f); e.currentTarget.value = ''; }} />
      </div>
      {ref ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ width: 200, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><img className="ww-zoomable" src={ref} alt="reference" style={{ width: '100%', display: 'block' }} onClick={() => ui.openImage(ref)} /></div>
          <div style={{ flex: 1 }} className="ww-gen">
            <div className="ww-gen-head"><span className="ww-cop-orb" /> New angle {online === false && <span className="ww-offline">offline</span>}</div>
            <textarea className="ww-gen-prompt" rows={2} value={prompt} placeholder="e.g. 'the same street seen from a high balcony looking down'" onChange={e => setPrompt(e.target.value)} />
            <div className="ww-gen-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--ink2)', flex: 1, minWidth: 200 }}>
                Variation
                <input type="range" min={0.35} max={0.85} step={0.05} value={strength} onChange={e => setStrength(+e.target.value)} style={{ flex: 1 }} />
                <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{Math.round(strength * 100)}%</b>
              </label>
              <button className={cx('ww-gen-btn', (busy || online === false || !prompt.trim()) && 'is-offline')} disabled={busy || online === false || !prompt.trim()} onClick={generateAngle}>{busy ? 'Generating…' : '✦ Generate angle'}</button>
            </div>
          </div>
        </div>
      ) : <div className="ww-sheet-empty" style={{ marginBottom: 18 }}><b>Load a location image to begin</b><p>Then describe the new camera angle.</p></div>}
      {(angles.length > 0 || pending > 0) && (
        <>
          <div className="ww-insp-sub" style={{ marginBottom: 10 }}>Generated angles · {angles.length}</div>
          <div className="ww-gen-gallery">
            {Array.from({ length: pending }).map((_, i) => <div key={'sk' + i} className="ww-thumb-art ww-skel" style={{ borderRadius: 10, aspectRatio: '1.5' }}><span className="ww-skel-tag">generating…</span></div>)}
            {angles.map((u, i) => <div key={i} style={{ borderRadius: 10, overflow: 'hidden' }}><Thumb url={u} /></div>)}
          </div>
        </>
      )}
    </div>
  );
}
