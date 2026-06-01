// effects.jsx — effects authoring surfaces. Three variants share one param editor.

function ParamControl({ pkey, def, value, onChange }) {
  if (def.type === 'range') {
    const step = def.step || 1;
    return (
      <label className="ww-pc">
        <span className="ww-pc-k">{pkey}</span>
        <span className="ww-pc-ctl">
          <input type="range" min={def.min} max={def.max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))} />
          <output>{value}{def.unit || ''}</output>
        </span>
      </label>
    );
  }
  // enum
  const seg = def.options.length <= 4 && def.options.every(o => o.length <= 9);
  if (seg) {
    return (
      <label className="ww-pc">
        <span className="ww-pc-k">{pkey}</span>
        <span className="ww-seg">
          {def.options.map(o => <button key={o} className={cx(o === value && 'is-on')} onClick={() => onChange(o)}>{o}</button>)}
        </span>
      </label>
    );
  }
  return (
    <label className="ww-pc">
      <span className="ww-pc-k">{pkey}</span>
      <select className="ww-sel" value={value} onChange={e => onChange(e.target.value)}>
        {def.options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function EffectEditor({ fx, onParam, onRemove, onToggle }) {
  const meta = window.EFFECT_TYPES[fx.type];
  return (
    <div className="ww-fxedit" style={{ '--fx': fxColor(fx.type), '--fxdim': fxColor(fx.type, 0.45, 0.1) }}>
      <div className="ww-fxedit-head">
        <span className="ww-fxedit-g">{meta.glyph}</span>
        <div className="ww-fxedit-t"><b>{meta.label}</b><span>{meta.blurb}</span></div>
        <button className={cx('ww-tog', fx.on && 'is-on')} onClick={onToggle} title="Toggle effect"><i /></button>
      </div>
      <div className="ww-fxedit-params">
        {Object.keys(meta.params).map(k => (
          <ParamControl key={k} pkey={k} def={meta.params[k]} value={fx.params[k]} onChange={v => onParam(k, v)} />
        ))}
      </div>
      <button className="ww-fxremove" onClick={onRemove}>Remove effect</button>
    </div>
  );
}

function AddEffectPalette({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="ww-addfx">
      <button className="ww-addfx-btn" onClick={() => setOpen(o => !o)}>＋ Add effect</button>
      {open && (
        <div className="ww-addfx-grid">
          {Object.keys(window.EFFECT_TYPES).map(t => {
            const m = window.EFFECT_TYPES[t];
            return (
              <button key={t} className="ww-addfx-item" style={{ '--fx': fxColor(t) }}
                onClick={() => { onAdd(t); setOpen(false); }}>
                <span className="ww-addfx-g">{m.glyph}</span><span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Variant A: INSPECTOR (stacked list) --------------------------------
function FxInspector({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }) {
  return (
    <div className="ww-insp-fx">
      <div className="ww-insp-sub">Effects · {panel.fx.length}</div>
      <div className="ww-fxlist">
        {panel.fx.map(fx => (
          <div key={fx.id}>
            <button className={cx('ww-fxrow', selFx === fx.id && 'is-open', !fx.on && 'is-off')}
              style={{ '--fx': fxColor(fx.type) }} onClick={() => setSelFx(selFx === fx.id ? null : fx.id)}>
              <span className="ww-fxrow-g">{window.EFFECT_TYPES[fx.type].glyph}</span>
              <span className="ww-fxrow-l">{window.EFFECT_TYPES[fx.type].label}</span>
              <span className="ww-fxrow-v">{firstParam(fx)}</span>
              <span className="ww-fxrow-x">{selFx === fx.id ? '▾' : '▸'}</span>
            </button>
            {selFx === fx.id && (
              <EffectEditor fx={fx} onParam={(k, v) => onParam(fx.id, k, v)} onRemove={() => onRemove(fx.id)} onToggle={() => onToggle(fx.id)} />
            )}
          </div>
        ))}
      </div>
      <AddEffectPalette onAdd={onAdd} />
    </div>
  );
}

// ---- Variant B: TRACKS (scroll-life timeline) ---------------------------
function FxTracks({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }) {
  // position each fx along the panel's scroll life (enter -> exit)
  function pos(fx) {
    const trig = fx.params.Trigger || (fx.type === 'transition' ? 'On exit' : 'On enter');
    if (trig === 'On exit' || fx.type === 'transition') return [70, 96];
    if (trig === 'On tap') return [38, 60];
    if (trig === 'Continuous' || fx.type === 'parallax') return [6, 96];
    if (fx.type === 'pacing') return [44, 70];
    return [8, 40];
  }
  const sel = panel.fx.find(f => f.id === selFx);
  return (
    <div className="ww-tracks">
      <div className="ww-insp-sub">Scroll timeline</div>
      <div className="ww-track-grid">
        <div className="ww-track-rail">
          <span>enter</span><span>read line</span><span>exit</span>
        </div>
        {panel.fx.map(fx => {
          const [a, b] = pos(fx);
          return (
            <div key={fx.id} className="ww-track">
              <span className="ww-track-name" style={{ color: fxColor(fx.type) }}>{window.EFFECT_TYPES[fx.type].glyph}</span>
              <div className="ww-track-lane">
                <button className={cx('ww-track-bar', selFx === fx.id && 'is-sel', !fx.on && 'is-off')}
                  style={{ left: a + '%', width: (b - a) + '%', '--fx': fxColor(fx.type) }}
                  onClick={() => setSelFx(fx.id)}>
                  {window.EFFECT_TYPES[fx.type].label}
                </button>
              </div>
            </div>
          );
        })}
        <div className="ww-track-readline" />
      </div>
      <AddEffectPalette onAdd={onAdd} />
      {sel && <EffectEditor fx={sel} onParam={(k, v) => onParam(sel.id, k, v)} onRemove={() => onRemove(sel.id)} onToggle={() => onToggle(sel.id)} />}
    </div>
  );
}

// ---- Variant C: STAGE (pucks on the panel) ------------------------------
function FxStage({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }) {
  const spots = { 0: [22, 24], 1: [74, 30], 2: [30, 70], 3: [78, 72], 4: [50, 50], 5: [50, 20], 6: [20, 50], 7: [80, 50] };
  const sel = panel.fx.find(f => f.id === selFx);
  return (
    <div className="ww-fxstage">
      <div className="ww-insp-sub">Stage handles</div>
      <div className="ww-fxstage-art">
        <Scene kind={panel.scene} />
        <div className="ww-fxstage-pucks">
          {panel.fx.map((fx, i) => {
            const [x, y] = spots[i] || [50, 50];
            return (
              <button key={fx.id} className={cx('ww-puck', selFx === fx.id && 'is-sel', !fx.on && 'is-off')}
                style={{ left: x + '%', top: y + '%', '--fx': fxColor(fx.type) }}
                onClick={() => setSelFx(fx.id)} title={window.EFFECT_TYPES[fx.type].label}>
                {window.EFFECT_TYPES[fx.type].glyph}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ww-puckrow">
        {panel.fx.map(fx => (
          <button key={fx.id} className={cx('ww-chip', selFx === fx.id && 'is-active')} style={{ '--fx': fxColor(fx.type) }} onClick={() => setSelFx(fx.id)}>
            <span className="ww-chip-g">{window.EFFECT_TYPES[fx.type].glyph}</span>
          </button>
        ))}
      </div>
      <AddEffectPalette onAdd={onAdd} />
      {sel && <EffectEditor fx={sel} onParam={(k, v) => onParam(sel.id, k, v)} onRemove={() => onRemove(sel.id)} onToggle={() => onToggle(sel.id)} />}
    </div>
  );
}

function firstParam(fx) {
  const k = Object.keys(fx.params)[0];
  const v = fx.params[k];
  const def = window.EFFECT_TYPES[fx.type].params[k];
  return v + (def && def.unit ? def.unit : '');
}

Object.assign(window, { ParamControl, EffectEditor, AddEffectPalette, FxInspector, FxTracks, FxStage });
