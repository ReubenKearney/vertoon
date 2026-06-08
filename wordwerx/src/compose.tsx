import React from 'react';
import { cx } from './ui';
import { FxChip } from './ui';
import { mkFx } from './data';
import { Scene } from './scenes';
import { FxInspector, FxTracks, FxStage } from './effects';
import { assetUrl, assetIdOf } from './services/store';
import { useUI } from './ui-context';

// Composite a panel from its layer images (back → front), falling back to a
// legacy single panel image, then the procedural Scene.
function PanelView({ panel, links }: { panel: any; links: any }) {
  const ui = useUI();
  const layerUrls = (panel.layers || []).map((_: any, i: number) => links?.layerImage?.[`${panel.id}:${i}`]).filter(Boolean);
  const legacy = links?.panelImage?.[panel.id];
  const urls: string[] = layerUrls.length ? layerUrls : (legacy ? [legacy] : []);
  if (!urls.length) return <Scene kind={panel.scene} />;
  return <>{urls.map((u, i) => (
    <img key={i} className="ww-zoomable" src={assetUrl(u)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onClick={e => { e.stopPropagation(); ui.openImage(u); }} />
  ))}</>;
}

function useFxOps(panel: any, updatePanel: (p: any) => void) {
  return {
    onParam: (fxId: string, k: string, v: any) => updatePanel({ ...panel, fx: panel.fx.map((f: any) => f.id === fxId ? { ...f, params: { ...f.params, [k]: v } } : f) }),
    onAdd: (type: string) => updatePanel({ ...panel, fx: [...panel.fx, mkFx(type)] }),
    onRemove: (fxId: string) => updatePanel({ ...panel, fx: panel.fx.filter((f: any) => f.id !== fxId) }),
    onToggle: (fxId: string) => updatePanel({ ...panel, fx: panel.fx.map((f: any) => f.id === fxId ? { ...f, on: !f.on } : f) }),
  };
}

function PanelCard({ panel, selected, onSelect, big, links }: any) {
  return (
    <div className={cx('ww-pcard', selected && 'is-sel', big && 'is-big')} onClick={onSelect}>
      <div className="ww-pcard-gutter">
        <span className="ww-pcard-n">{String(panel.n).padStart(2, '0')}</span>
        <span className="ww-pcard-beat">{panel.beat}</span>
        <span className="ww-pcard-dur">{panel.dur}</span>
      </div>
      <div className="ww-pcard-frame">
        <PanelView panel={panel} links={links} />
        <div className="ww-pcard-slug">{panel.slug}</div>
        {panel.dialogue
          ? <div className="ww-pcard-dlg"><b>{panel.speaker}</b>{panel.dialogue}</div>
          : panel.caption ? <div className="ww-pcard-cap">{panel.caption}</div> : null}
        <div className="ww-pcard-fx">
          {panel.fx.map((fx: any) => <FxChip key={fx.id} type={fx.type} on={fx.on} small />)}
        </div>
      </div>
    </div>
  );
}

export function Compose({ panels, setPanels, selId, setSelId, canvasModel, fxUI, library, links, updateLink }: any) {
  const [selFx, setSelFx] = React.useState<string | null>(null);
  const panel = panels.find((p: any) => p.id === selId) || panels[0];
  const artAssets = (library || []).filter((a: any) => a.imageUrl);
  const updatePanel = (np: any) => setPanels(panels.map((p: any) => p.id === np.id ? np : p));
  const ops = useFxOps(panel, updatePanel);
  React.useEffect(() => { setSelFx(null); }, [selId]);

  function move(i: number, dir: number) {
    const j = i + dir; if (j < 0 || j >= panels.length) return;
    const next = panels.slice(); const [x] = next.splice(i, 1); next.splice(j, 0, x);
    setPanels(next.map((p: any, k: number) => ({ ...p, n: k + 1 })));
  }
  function addPanel() {
    const id = 'p' + Math.random().toString(36).slice(2, 6);
    const np = { id, n: panels.length + 1, slug: 'NEW PANEL', scene: 'tunnels', beat: 'Draft', dur: '3.0s', caption: 'Untitled beat.', layers: [{ name: 'Background', depth: 0.2 }], fx: [mkFx('reveal')] };
    setPanels([...panels, np]); setSelId(id);
  }

  const FxUI = ({ inspector: FxInspector, tracks: FxTracks, stage: FxStage } as any)[fxUI] || FxInspector;

  return (
    <div className="ww-compose">
      <div className="ww-seqrail">
        <div className="ww-rail-head">Panels <span>{panels.length}</span></div>
        <div className="ww-seqlist">
          {panels.map((p: any, i: number) => (
            <div key={p.id} className={cx('ww-seqitem', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)}>
              <span className="ww-seq-n">{String(p.n).padStart(2, '0')}</span>
              <div className="ww-seq-mini" style={{ position: 'relative' }}><PanelView panel={p} links={links} /></div>
              <div className="ww-seq-meta"><b>{p.slug}</b><span>{p.fx.length} fx · {p.beat}</span></div>
              <div className="ww-seq-move">
                <button onClick={e => { e.stopPropagation(); move(i, -1); }}>▴</button>
                <button onClick={e => { e.stopPropagation(); move(i, 1); }}>▾</button>
              </div>
            </div>
          ))}
        </div>
        <button className="ww-addpanel" onClick={addPanel}>＋ New panel</button>
      </div>

      <div className={cx('ww-canvas', 'is-' + canvasModel)}>
        {canvasModel === 'filmstrip' && (
          <div className="ww-filmstrip">
            <div className="ww-readline"><span>read line</span></div>
            {panels.map((p: any) => <PanelCard key={p.id} panel={p} selected={p.id === selId} onSelect={() => setSelId(p.id)} links={links} />)}
            <div className="ww-strip-end">End of episode · {panels.length} panels</div>
          </div>
        )}
        {canvasModel === 'board' && (
          <div className="ww-board">
            {panels.map((p: any) => (
              <div key={p.id} className={cx('ww-boardcard', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)}>
                <div className="ww-boardcard-art"><PanelView panel={p} links={links} />
                  <span className="ww-boardcard-n">{String(p.n).padStart(2, '0')}</span>
                  <span className="ww-boardcard-fx">{p.fx.length} fx</span>
                </div>
                <div className="ww-boardcard-meta"><b>{p.slug}</b><span>{p.beat} · {p.dur}</span></div>
              </div>
            ))}
            <button className="ww-boardadd" onClick={addPanel}>＋</button>
          </div>
        )}
        {canvasModel === 'cinema' && (
          <div className="ww-cinema">
            <div className="ww-cinema-stage"><PanelCard panel={panel} selected big onSelect={() => {}} links={links} /></div>
            <div className="ww-cinema-strip">
              {panels.map((p: any) => (
                <button key={p.id} className={cx('ww-cinitem', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)} style={{ position: 'relative' }}>
                  <PanelView panel={p} links={links} /><span>{String(p.n).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ww-inspector">
        <div className="ww-insp-head">
          <input className="ww-insp-slug" value={panel.slug} onChange={e => updatePanel({ ...panel, slug: e.target.value })} />
          <div className="ww-insp-tags"><span>{panel.beat}</span><span>{panel.dur}</span></div>
        </div>
        <div className="ww-insp-scroll">
          <div className="ww-insp-sub">Layers · {panel.layers.length} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>· assign generated art per layer (back → front)</span></div>
          <div className="ww-layers">
            {panel.layers.map((l: any, i: number) => {
              const key = `${panel.id}:${i}`;
              const url = links?.layerImage?.[key];
              return (
                <div key={i} className="ww-layer-art">
                  <div className="ww-vd-pending-th" style={{ width: 54, height: 40, flexShrink: 0 }}>{url ? <img src={assetUrl(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Scene kind={panel.scene} />}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
                    <input className="ww-layer-nameinput" value={l.name} onChange={e => updatePanel({ ...panel, layers: panel.layers.map((x: any, k: number) => k === i ? { ...x, name: e.target.value } : x) })} />
                    <select className="ww-filter" value={url ? assetUrl(url) : ''} onChange={e => updateLink?.('layerImage', key, e.target.value ? assetIdOf(e.target.value) : undefined)}>
                      <option value="">{artAssets.length ? 'Assign art…' : 'No generated art yet'}</option>
                      {artAssets.map((a: any) => <option key={a.id} value={a.imageUrl}>{a.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                    <span className="ww-layer-d">z{Math.round(l.depth * 100)}</span>
                    <button className="ww-layer-del" title="Remove layer" onClick={() => updatePanel({ ...panel, layers: panel.layers.filter((_: any, k: number) => k !== i) })}>✕</button>
                  </div>
                </div>
              );
            })}
            <button className="ww-filter" onClick={() => updatePanel({ ...panel, layers: [...panel.layers, { name: 'Layer ' + (panel.layers.length + 1), depth: 0.5 }] })}>＋ Add layer</button>
          </div>
          <FxUI panel={panel} selFx={selFx} setSelFx={setSelFx} {...ops} />
        </div>
      </div>
    </div>
  );
}
