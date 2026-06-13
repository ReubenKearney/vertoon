import React from 'react';
import { cx } from './ui';
import { FxChip } from './ui';
import { mkFx } from './data';
import { Scene } from './scenes';
import { PanelArt } from './panel-art';
import { FxInspector, FxTracks, FxStage } from './effects';
import { parallaxOffset, mapEasing } from './preview-engine';
import { effectiveTextObjects, textOf, TextObjectStatic, TextObjectEditable, injectTextObjectCss, DEFAULT_TAIL, type TextObject } from './text-objects';
import { assetUrl, assetIdOf } from './services/store';
import { useUI } from './ui-context';

// Composite a panel from its layer images (back → front), falling back to a
// legacy single panel image, then the procedural Scene.
function PanelView({ panel, links, style, loop, loopDensity, loopSpeed }: any) {
  const ui = useUI();
  return <PanelArt panel={panel} links={links} style={style} loop={loop} loopDensity={loopDensity} loopSpeed={loopSpeed} onImageClick={(u: string) => ui.openImage(u)} />;
}

function useFxOps(panel: any, updatePanel: (p: any) => void) {
  return {
    onParam: (fxId: string, k: string, v: any) => updatePanel({ ...panel, fx: panel.fx.map((f: any) => f.id === fxId ? { ...f, params: { ...f.params, [k]: v } } : f) }),
    onAdd: (type: string) => updatePanel({ ...panel, fx: [...panel.fx, mkFx(type)] }),
    onRemove: (fxId: string) => updatePanel({ ...panel, fx: panel.fx.filter((f: any) => f.id !== fxId) }),
    onToggle: (fxId: string) => updatePanel({ ...panel, fx: panel.fx.map((f: any) => f.id === fxId ? { ...f, on: !f.on } : f) }),
    // Apply a curated preset: replace existing fx of the same types, keep the rest.
    onPreset: (preset: any) => {
      const types = new Set(preset.fx.map((f: any) => f.type));
      const kept = panel.fx.filter((f: any) => !types.has(f.type));
      const added = preset.fx.map((f: any) => { const fx = mkFx(f.type); Object.assign(fx.params, f.params); return fx; });
      updatePanel({ ...panel, ...(preset.panel || {}), fx: [...kept, ...added] });
    },
  };
}

// Map the scrub position pv onto the engine's exit fraction (--tx). The engine
// derives it from real geometry; here we assume the reader-typical panel height
// (~0.85 viewport) — keep in sync with preview-engine.ts.
function scrubExit(pv: number) { return Math.max(0, Math.min(1, 0.075 - pv)); }

function PanelCard({ panel, selected, onSelect, big, links, scrubPv, textCtl }: any) {
  // When scrubbing, the frame becomes a reader-faithful panel: same data-motion /
  // --rev vars / .ww-rtrans hooks the Preview reader uses, driven by pv instead
  // of real scroll.
  const scrubOn = scrubPv != null;
  const reveal = scrubOn && panel.fx.find((f: any) => f.type === 'reveal' && f.on);
  const trans = scrubOn && panel.fx.find((f: any) => f.type === 'transition' && f.on);
  const loop = scrubOn && panel.fx.find((f: any) => f.type === 'loop' && f.on);
  const { px, py } = scrubOn ? parallaxOffset(panel, scrubPv) : { px: 0, py: 0 };
  const isIn = !scrubOn || scrubPv < 0.4;
  const art = (
    <PanelView panel={panel} links={links}
      style={scrubOn ? ({ '--px': String(px), '--py': String(py) } as any) : undefined}
      loop={loop ? loop.params.Kind : null} loopDensity={loop ? loop.params.Density : 55} loopSpeed={loop ? loop.params.Speed : 1} />
  );
  return (
    <div className={cx('ww-pcard', selected && 'is-sel', big && 'is-big')} onClick={onSelect}>
      <div className="ww-pcard-gutter">
        <span className="ww-pcard-n">{String(panel.n).padStart(2, '0')}</span>
        <span className="ww-pcard-beat">{panel.beat}</span>
        <span className="ww-pcard-dur">{panel.dur}</span>
      </div>
      <div className={cx('ww-pcard-frame', scrubOn && 'ww-rpanel', scrubOn && isIn && 'is-in')}
        data-motion={reveal ? reveal.params.Motion : undefined}
        style={reveal ? ({ '--rev-dur': reveal.params.Duration + 's', '--rev-dist': reveal.params.Distance + 'px', '--rev-ease': mapEasing(reveal.params.Easing) } as any) : undefined}>
        {reveal ? <div className="ww-rev-art ww-rev">{art}</div> : art}
        <div className="ww-pcard-slug">{panel.slug}</div>
        <div className={cx('ww-tolayer', textCtl && 'is-edit', reveal && 'ww-rev')}>
          {effectiveTextObjects(panel).map((t: TextObject) => textCtl
            ? <TextObjectEditable key={t.id} t={t} panel={panel} selected={textCtl.selTo === t.id} onSelect={textCtl.setSelTo} onChange={textCtl.onChange} onText={textCtl.onText} />
            : <TextObjectStatic key={t.id} t={t} panel={panel} />)}
        </div>
        <div className="ww-pcard-fx">
          {panel.fx.map((fx: any) => <FxChip key={fx.id} type={fx.type} on={fx.on} small />)}
        </div>
        {trans && <div className="ww-rtrans" data-trans={trans.params.Type} style={{ '--tx': String(scrubExit(scrubPv)) } as any} />}
      </div>
    </div>
  );
}

// Scroll scrubber: drives the selected panel through its scroll life (enter →
// read line → exit) so reveal / parallax / transition play live in Compose.
function ScrubBar({ pv, setPv }: { pv: number | null; setPv: (v: number | null) => void }) {
  const [playing, setPlaying] = React.useState(false);
  const pvRef = React.useRef(pv ?? 1.3);
  if (pv != null) pvRef.current = pv;
  React.useEffect(() => {
    if (!playing) return;
    let raf = 0; let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const next = pvRef.current - dt * 0.6;
      if (next <= -1.3) { setPv(-1.3); setPlaying(false); return; }
      setPv(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = pv != null;
  const slider = active ? Math.round(((1.3 - pv) / 2.6) * 100) : 0;
  return (
    <div className={cx('ww-scrubbar', active && 'is-on')} onClick={e => e.stopPropagation()}>
      <button className="ww-scrub-play" title="Play the panel's scroll pass"
        onClick={() => { setPv(1.3); setPlaying(true); }}>{playing ? '◼' : '▶'}</button>
      <input type="range" min={0} max={100} value={slider}
        onPointerDown={() => setPlaying(false)}
        onChange={e => { setPlaying(false); setPv(1.3 - (+e.target.value / 100) * 2.6); }} />
      <span className="ww-scrub-label">{active ? (pv > 0.4 ? 'entering' : pv > -0.2 ? 'on read line' : 'exiting') : 'motion scrub'}</span>
      {active && <button className="ww-scrub-reset" title="Back to editing view" onClick={() => { setPlaying(false); setPv(null); }}>✕</button>}
    </div>
  );
}

// Move one entry of a list from index `from` to index `to`.
function reorderList<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function Compose({ panels, setPanels, selId, setSelId, canvasModel, fxUI, library, links, updateLink }: any) {
  const [selFx, setSelFx] = React.useState<string | null>(null);
  const [dragPanel, setDragPanel] = React.useState<number | null>(null);
  const [overPanel, setOverPanel] = React.useState<number | null>(null);
  const [dragLayer, setDragLayer] = React.useState<number | null>(null);
  const [overLayer, setOverLayer] = React.useState<number | null>(null);
  const [scrubPv, setScrubPv] = React.useState<number | null>(null);
  const [selTo, setSelTo] = React.useState<string | null>(null);
  const panel = panels.find((p: any) => p.id === selId) || panels[0];
  const artAssets = (library || []).filter((a: any) => a.imageUrl);
  const updatePanel = (np: any) => setPanels(panels.map((p: any) => p.id === np.id ? np : p));
  const ops = useFxOps(panel, updatePanel);
  React.useEffect(injectTextObjectCss, []);
  React.useEffect(() => { setSelFx(null); setScrubPv(null); setSelTo(null); }, [selId]);

  // ── on-canvas text objects ──
  // Editing a position materialises the effective set (defaults included) into
  // panel.textObjects; text on dialogue/caption objects writes back to the
  // panel fields, so the Script tab and the canvas can never diverge.
  const textObjects = panel ? effectiveTextObjects(panel) : [];
  function updateTextObject(id: string, patch: Partial<TextObject>) {
    updatePanel({ ...panel, textObjects: effectiveTextObjects(panel).map((t: TextObject) => t.id === id ? { ...t, ...patch } : t) });
  }
  function writeTextObjectText(t: TextObject, text: string) {
    if (t.kind === 'dialogue') updatePanel({ ...panel, dialogue: text });
    else if (t.kind === 'caption') updatePanel({ ...panel, caption: text });
    else updateTextObject(t.id, { text });
  }
  function addTextObject(kind: 'sfx' | 'bubble') {
    const id = 'to' + Math.random().toString(36).slice(2, 6);
    const t: TextObject = kind === 'sfx'
      ? { id, kind, x: 24, y: 14, w: 50, text: 'BOOM', size: 1, rot: -6, hue: 75 }
      : { id, kind, x: 12, y: 12, w: 52, text: 'New line…', delivery: 'Spoken', tail: { ...DEFAULT_TAIL } };
    updatePanel({ ...panel, textObjects: [...effectiveTextObjects(panel), t] });
    setSelTo(id);
  }
  function deleteTextObject(t: TextObject) {
    const rest = effectiveTextObjects(panel).filter((x: TextObject) => x.id !== t.id);
    if (t.kind === 'dialogue') updatePanel({ ...panel, dialogue: undefined, speaker: undefined, delivery: undefined, textObjects: rest });
    else if (t.kind === 'caption') updatePanel({ ...panel, caption: '', textObjects: rest });
    else updatePanel({ ...panel, textObjects: rest });
    if (selTo === t.id) setSelTo(null);
  }
  const textCtl = { selTo, setSelTo, onChange: updateTextObject, onText: writeTextObjectText };

  function reorderPanels(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= panels.length || to >= panels.length) return;
    setPanels(reorderList(panels, from, to).map((p: any, k: number) => ({ ...p, n: k + 1 })));
  }
  function move(i: number, dir: number) { reorderPanels(i, i + dir); }

  // Layer art links are keyed by index ({panelId}:{i}), so any layer permutation
  // or removal must rewrite the keys or art silently jumps between layers.
  function syncLayerLinks(p: any, urls: (string | undefined)[], prevCount: number) {
    for (let k = 0; k < Math.max(prevCount, urls.length); k++) {
      const next = k < urls.length ? urls[k] : undefined;
      if (links?.layerImage?.[`${p.id}:${k}`] !== next) updateLink?.('layerImage', `${p.id}:${k}`, next);
    }
  }
  function reorderLayers(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= panel.layers.length || to >= panel.layers.length) return;
    const urls = panel.layers.map((_: any, k: number) => links?.layerImage?.[`${panel.id}:${k}`]);
    syncLayerLinks(panel, reorderList(urls, from, to), panel.layers.length);
    updatePanel({ ...panel, layers: reorderList(panel.layers, from, to) });
  }
  function deleteLayer(i: number) {
    const urls = panel.layers.map((_: any, k: number) => links?.layerImage?.[`${panel.id}:${k}`]);
    urls.splice(i, 1);
    syncLayerLinks(panel, urls, panel.layers.length);
    updatePanel({ ...panel, layers: panel.layers.filter((_: any, k: number) => k !== i) });
  }
  function addPanel() {
    const id = 'p' + Math.random().toString(36).slice(2, 6);
    const np = { id, n: panels.length + 1, slug: 'NEW PANEL', scene: 'tunnels', beat: 'Draft', dur: '3.0s', caption: 'Untitled beat.', layers: [{ name: 'Background', depth: 0.2 }], fx: [mkFx('reveal')] };
    setPanels([...panels, np]); setSelId(id);
  }

  const FxUI = ({ inspector: FxInspector, tracks: FxTracks, stage: FxStage } as any)[fxUI] || FxInspector;

  // Empty state for a series with no panels yet (e.g. a brand-new series).
  if (!panel) {
    return (
      <div className="ww-compose">
        <div className="ww-seqrail">
          <div className="ww-rail-head">Panels <span>0</span></div>
          <div className="ww-seqlist" />
          <button className="ww-addpanel" onClick={addPanel}>＋ New panel</button>
        </div>
        <div className={cx('ww-canvas', 'is-' + canvasModel)}>
          <div className="ww-sheet-empty" style={{ margin: 'auto', maxWidth: 420 }}>
            <div className="ww-pv-kicker" style={{ marginBottom: 12 }}>Compose</div>
            <b>No panels yet</b>
            <p>Add your first panel to start composing the episode — or build the storyboard in Narrative → Storyboard.</p>
            <button className="ww-btn primary" style={{ marginTop: 8 }} onClick={addPanel}>＋ New panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ww-compose">
      <div className="ww-seqrail">
        <div className="ww-rail-head">Panels <span>{panels.length}</span></div>
        <div className="ww-seqlist">
          {panels.map((p: any, i: number) => (
            <div key={p.id}
              className={cx('ww-seqitem', p.id === selId && 'is-sel', dragPanel === i && 'is-dragging', overPanel === i && dragPanel !== null && dragPanel !== i && 'is-dragover')}
              onClick={() => setSelId(p.id)}
              draggable
              onDragStart={e => { setDragPanel(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={e => { if (dragPanel === null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverPanel(i); }}
              onDrop={e => { e.preventDefault(); if (dragPanel !== null) reorderPanels(dragPanel, i); setDragPanel(null); setOverPanel(null); }}
              onDragEnd={() => { setDragPanel(null); setOverPanel(null); }}>
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
            {panels.map((p: any) => (
              <React.Fragment key={p.id}>
                <PanelCard panel={p} selected={p.id === selId} onSelect={() => setSelId(p.id)} links={links} scrubPv={p.id === panel?.id ? scrubPv : null} textCtl={p.id === panel?.id && scrubPv == null ? textCtl : null} />
                {p.id === panel?.id && <ScrubBar pv={scrubPv} setPv={setScrubPv} />}
                {(p.gap || 0) > 0 && (
                  <div className={cx('ww-gapstrip', p.id === selId && 'is-sel')} style={{ height: p.gap }}>
                    {p.id === selId && <span>{p.gap}px gutter</span>}
                  </div>
                )}
              </React.Fragment>
            ))}
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
            <div className="ww-cinema-stage">
              <PanelCard panel={panel} selected big onSelect={() => {}} links={links} scrubPv={scrubPv} textCtl={scrubPv == null ? textCtl : null} />
              <ScrubBar pv={scrubPv} setPv={setScrubPv} />
            </div>
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
                <div key={i}
                  className={cx('ww-layer-art', dragLayer === i && 'is-dragging', overLayer === i && dragLayer !== null && dragLayer !== i && 'is-dragover')}
                  onDragOver={e => { if (dragLayer === null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverLayer(i); }}
                  onDrop={e => { e.preventDefault(); if (dragLayer !== null) reorderLayers(dragLayer, i); setDragLayer(null); setOverLayer(null); }}>
                  <span className="ww-layer-grip" title="Drag to reorder (back → front)" draggable
                    onDragStart={e => { setDragLayer(i); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragLayer(null); setOverLayer(null); }}>⋮⋮</span>
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
                    <button className="ww-layer-del" title="Remove layer" onClick={() => deleteLayer(i)}>✕</button>
                  </div>
                </div>
              );
            })}
            <button className="ww-filter" onClick={() => updatePanel({ ...panel, layers: [...panel.layers, { name: 'Layer ' + (panel.layers.length + 1), depth: 0.5 }] })}>＋ Add layer</button>
          </div>
          <div className="ww-insp-sub">Text · {textObjects.length} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>· drag bubbles on the panel · double-click to rewrite</span></div>
          <div className="ww-tolist">
            {textObjects.map((t: TextObject) => (
              <div key={t.id} className={cx('ww-toitem', selTo === t.id && 'is-sel')} onClick={() => setSelTo(t.id)}>
                <span className="ww-toitem-kind">{t.kind === 'sfx' ? 'SFX' : t.kind === 'caption' ? 'CAP' : t.kind === 'bubble' ? 'BLN' : 'DLG'}</span>
                <span className="ww-toitem-snippet">{textOf(t, panel).slice(0, 26) || '—'}</span>
                {(t.kind === 'dialogue' || t.kind === 'bubble') && (
                  <select className="ww-filter ww-toitem-delivery" value={(t.kind === 'dialogue' ? panel.delivery : t.delivery) || 'Spoken'}
                    onClick={e => e.stopPropagation()}
                    onChange={e => t.kind === 'dialogue' ? updatePanel({ ...panel, delivery: e.target.value }) : updateTextObject(t.id, { delivery: e.target.value })}>
                    {['Spoken', 'Shouted', 'Whispered', 'Thought', 'Voice-over', 'Off-screen', 'Sung'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {t.kind === 'sfx' && (
                  <span className="ww-toitem-sfxctl" onClick={e => e.stopPropagation()}>
                    <input type="range" min={0.5} max={2} step={0.1} value={t.size ?? 1} title="Size" onChange={e => updateTextObject(t.id, { size: +e.target.value })} />
                    <input type="range" min={-30} max={30} step={1} value={t.rot ?? 0} title="Rotation" onChange={e => updateTextObject(t.id, { rot: +e.target.value })} />
                  </span>
                )}
                <button className="ww-layer-del" title="Delete" onClick={e => { e.stopPropagation(); deleteTextObject(t); }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="ww-filter" style={{ flex: 1 }} onClick={() => addTextObject('bubble')}>＋ Balloon</button>
              <button className="ww-filter" style={{ flex: 1 }} onClick={() => addTextObject('sfx')}>＋ SFX</button>
            </div>
          </div>
          <div className="ww-insp-sub">Gutter <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>· whitespace after this panel — the webtoon pacing beat</span></div>
          <div className="ww-gutterctl">
            <input type="range" min={0} max={600} step={10} value={panel.gap || 0}
              onChange={e => updatePanel({ ...panel, gap: +e.target.value || undefined })} />
            <span className="ww-gutterctl-v">{panel.gap || 0}px</span>
            <div className="ww-gutterctl-presets">
              {[['None', 0], ['Beat', 40], ['Pause', 120], ['Dead air', 280]].map(([label, v]) => (
                <button key={label as string} className={cx('ww-filter', (panel.gap || 0) === v && 'is-on')}
                  onClick={() => updatePanel({ ...panel, gap: (v as number) || undefined })}>{label}</button>
              ))}
            </div>
          </div>
          <FxUI panel={panel} selFx={selFx} setSelFx={setSelFx} {...ops} />
        </div>
      </div>
    </div>
  );
}
