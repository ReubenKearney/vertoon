// compose.jsx — the editor. Canvas interaction model is Tweakable (filmstrip/board/cinema).

function useFxOps(panel, updatePanel) {
  return {
    onParam: (fxId, k, v) => updatePanel({ ...panel, fx: panel.fx.map(f => f.id === fxId ? { ...f, params: { ...f.params, [k]: v } } : f) }),
    onAdd: (type) => updatePanel({ ...panel, fx: [...panel.fx, window.mkFx(type)] }),
    onRemove: (fxId) => updatePanel({ ...panel, fx: panel.fx.filter(f => f.id !== fxId) }),
    onToggle: (fxId) => updatePanel({ ...panel, fx: panel.fx.map(f => f.id === fxId ? { ...f, on: !f.on } : f) }),
  };
}

// A single panel rendered as a phone-frame card (used by filmstrip + cinema)
function PanelCard({ panel, selected, onSelect, big }) {
  return (
    <div className={cx('ww-pcard', selected && 'is-sel', big && 'is-big')} onClick={onSelect}>
      <div className="ww-pcard-gutter">
        <span className="ww-pcard-n">{String(panel.n).padStart(2, '0')}</span>
        <span className="ww-pcard-beat">{panel.beat}</span>
        <span className="ww-pcard-dur">{panel.dur}</span>
      </div>
      <div className="ww-pcard-frame">
        <Scene kind={panel.scene} />
        <div className="ww-pcard-slug">{panel.slug}</div>
        {panel.dialogue
          ? <div className="ww-pcard-dlg"><b>{panel.speaker}</b>{panel.dialogue}</div>
          : panel.caption ? <div className="ww-pcard-cap">{panel.caption}</div> : null}
        <div className="ww-pcard-fx">
          {panel.fx.map(fx => <FxChip key={fx.id} type={fx.type} on={fx.on} small />)}
        </div>
      </div>
    </div>
  );
}

function Compose({ panels, setPanels, selId, setSelId, canvasModel, fxUI }) {
  const [selFx, setSelFx] = React.useState(null);
  const panel = panels.find(p => p.id === selId) || panels[0];
  const updatePanel = (np) => setPanels(panels.map(p => p.id === np.id ? np : p));
  const ops = useFxOps(panel, updatePanel);
  React.useEffect(() => { setSelFx(null); }, [selId]);

  function move(i, dir) {
    const j = i + dir; if (j < 0 || j >= panels.length) return;
    const next = panels.slice(); const [x] = next.splice(i, 1); next.splice(j, 0, x);
    setPanels(next.map((p, k) => ({ ...p, n: k + 1 })));
  }
  function addPanel() {
    const id = 'p' + Math.random().toString(36).slice(2, 6);
    const np = { id, n: panels.length + 1, slug: 'NEW PANEL', scene: 'tunnels', beat: 'Draft', dur: '3.0s', caption: 'Untitled beat.', layers: [{ name: 'Background', depth: 0.2 }], fx: [window.mkFx('reveal')] };
    setPanels([...panels, np]); setSelId(id);
  }

  const FxUI = { inspector: FxInspector, tracks: FxTracks, stage: FxStage }[fxUI] || FxInspector;

  return (
    <div className="ww-compose">
      {/* left: sequence rail */}
      <div className="ww-seqrail">
        <div className="ww-rail-head">Panels <span>{panels.length}</span></div>
        <div className="ww-seqlist">
          {panels.map((p, i) => (
            <div key={p.id} className={cx('ww-seqitem', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)}>
              <span className="ww-seq-n">{String(p.n).padStart(2, '0')}</span>
              <div className="ww-seq-mini"><Scene kind={p.scene} /></div>
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

      {/* center: canvas */}
      <div className={cx('ww-canvas', 'is-' + canvasModel)}>
        {canvasModel === 'filmstrip' && (
          <div className="ww-filmstrip">
            <div className="ww-readline"><span>read line</span></div>
            {panels.map(p => <PanelCard key={p.id} panel={p} selected={p.id === selId} onSelect={() => setSelId(p.id)} />)}
            <div className="ww-strip-end">End of episode · {panels.length} panels</div>
          </div>
        )}
        {canvasModel === 'board' && (
          <div className="ww-board">
            {panels.map((p, i) => (
              <div key={p.id} className={cx('ww-boardcard', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)}>
                <div className="ww-boardcard-art"><Scene kind={p.scene} />
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
            <div className="ww-cinema-stage"><PanelCard panel={panel} selected big onSelect={() => {}} /></div>
            <div className="ww-cinema-strip">
              {panels.map(p => (
                <button key={p.id} className={cx('ww-cinitem', p.id === selId && 'is-sel')} onClick={() => setSelId(p.id)}>
                  <Scene kind={p.scene} /><span>{String(p.n).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* right: inspector */}
      <div className="ww-inspector">
        <div className="ww-insp-head">
          <input className="ww-insp-slug" value={panel.slug} onChange={e => updatePanel({ ...panel, slug: e.target.value })} />
          <div className="ww-insp-tags"><span>{panel.beat}</span><span>{panel.dur}</span></div>
        </div>
        <div className="ww-insp-scroll">
          <div className="ww-insp-sub">Layers · {panel.layers.length}</div>
          <div className="ww-layers">
            {panel.layers.map((l, i) => (
              <div key={i} className="ww-layer">
                <span className="ww-layer-depth" style={{ opacity: 0.35 + l.depth * 0.65 }} />
                <span className="ww-layer-name">{l.name}</span>
                <span className="ww-layer-d">z{Math.round(l.depth * 100)}</span>
              </div>
            ))}
          </div>
          <FxUI panel={panel} selFx={selFx} setSelFx={setSelFx} {...ops} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Compose });
