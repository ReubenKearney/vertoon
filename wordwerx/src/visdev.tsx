import React from 'react';
import { cx } from './ui';
import { VISDEV, BIBLE } from './world';
import { Scene } from './scenes';
import { GenerationPanel, type GenResult } from './components/GenerationPanel';
import { generate, imageSrc } from './services/runpod';
import { expressionEdit } from './workflows';
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

// Zoomable image (opens the global lightbox), with a Scene fallback.
function Thumb({ url, scene, style }: { url?: string; scene?: string; style?: React.CSSProperties }) {
  const ui = useUI();
  if (url) return <img className="ww-zoomable" src={assetUrl(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} onClick={e => { e.stopPropagation(); ui.openImage(url); }} />;
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
    patchSubject(subjId, s => ({ ...s, variants: s.variants.filter((vr: any) => vr.v !== v), locked: s.locked === v ? null : s.locked }));
    flash('Variant deleted');
  }
  function addVariant(subjId: string, imageUrl: string) {
    patchSubject(subjId, s => {
      const newV = 'v' + (s.variants.length + 1);
      updateLink?.('visdevVariant', `${subjId}:${newV}`, assetIdOf(imageUrl));
      return { ...s, variants: [...s.variants, { v: newV, scene: s.scene, hue: s.hue, state: 'Candidate', note: 'Generated candidate.', imageUrl }] };
    });
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
        plainBgDefault={isCharacter} negativeDefault={NEG_DEFAULT}
        online={online} flash={flash} buttonLabel="✦ Generate variant"
        onResult={(assets: GenResult[]) => assets.forEach(a => onVariant(subj.id, a.url))}
      />

      <div className="ww-insp-sub" style={{ marginBottom: 12, marginTop: 18 }}>Variants · {subj.variants.length}</div>
      <div className="ww-vargrid">
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

      <div className="ww-sheet-hero"><Thumb url={canonical} scene={subj.scene} /></div>

      <div className="ww-sheet-cols">
        <div className="ww-sheet-block">
          <div className="ww-sheet-blockhead">
            <div className="ww-insp-sub">Poses · {poses.length}</div>
            <button className={cx('ww-gen-btn', disabled && 'is-offline')} disabled={disabled} onClick={() => run('poses', poses)}>{busy === 'poses' ? 'Generating…' : '✦ Generate poses'}</button>
          </div>
          <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${Math.min(poses.length, 4)},1fr)` }}>
            {poses.map((pose, i) => <div key={i} className="ww-sheet-cell"><div className="ww-sheet-cell-art"><Thumb url={subj.sheetImgs?.poses?.[pose]} scene={subj.scene} /></div><span>{pose}</span></div>)}
          </div>
        </div>
        {exprs.length > 0 && (
          <div className="ww-sheet-block">
            <div className="ww-sheet-blockhead">
              <div className="ww-insp-sub">Expressions · {exprs.length}</div>
              <button className={cx('ww-gen-btn', disabled && 'is-offline')} disabled={disabled} onClick={() => run('expressions', exprs)}>{busy === 'expressions' ? 'Generating…' : '✦ Generate expressions'}</button>
            </div>
            <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${Math.min(exprs.length, 4)},1fr)` }}>
              {exprs.map((expr, i) => <div key={i} className="ww-sheet-cell"><div className="ww-sheet-cell-art"><Thumb url={subj.sheetImgs?.expressions?.[expr]} scene={subj.scene} /></div><span>{expr}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// New angles of a location from a base image. Uses Flux Kontext (instruction edit)
// which re-interprets the view, rather than ControlNet which locks composition.
function Locations({ online, flash, links, updateLink }: any) {
  const ui = useUI();
  const [ref, setRef] = React.useState<string | null>(null);
  const [angles, setAngles] = React.useState<string[]>(() => (Object.values(links?.locationAngles || {}).flat() as string[]));
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pickRef = (file: File) => { const r = new FileReader(); r.onloadend = () => setRef(r.result as string); r.readAsDataURL(file); };

  return (
    <div className="ww-sheet">
      <div className="ww-sheet-top">
        <div>
          <div className="ww-pv-kicker">Visual Dev · Locations</div>
          <h2>New perspectives</h2>
          <p>Load a location image, then describe a new camera angle (e.g. “from a high balcony looking down”). Uses instruction-editing to re-frame the same place.</p>
        </div>
        <button className="ww-filter" onClick={() => fileRef.current?.click()}>⤓ Load location image</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pickRef(f); e.currentTarget.value = ''; }} />
      </div>
      {ref ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ width: 200, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><img className="ww-zoomable" src={ref} alt="reference" style={{ width: '100%', display: 'block' }} onClick={() => ui.openImage(ref)} /></div>
          <div style={{ flex: 1 }}>
            <GenerationPanel
              workflows={['expression-edit']} refImage={ref} online={online} flash={flash}
              promptLabel="Describe the new angle, e.g. 'same street from a high balcony looking down'"
              buttonLabel="✦ Generate new angle"
              onResult={(assets: GenResult[]) => { const urls = assets.map(a => a.url); setAngles(a => [...urls, ...a]); updateLink?.('locationAngles', 'session', [...urls, ...angles]); }}
            />
          </div>
        </div>
      ) : <div className="ww-sheet-empty" style={{ marginBottom: 18 }}><b>Load a location image to begin</b><p>Then describe the new camera angle.</p></div>}
      {angles.length > 0 && (
        <>
          <div className="ww-insp-sub" style={{ marginBottom: 10 }}>Generated angles · {angles.length}</div>
          <div className="ww-gen-gallery">{angles.map((u, i) => <div key={i} style={{ borderRadius: 10, overflow: 'hidden' }}><Thumb url={u} /></div>)}</div>
        </>
      )}
    </div>
  );
}
