import React from 'react';
import { cx, fxColor } from './ui';
import { EFFECT_TYPES, mkFx } from './data';
import { Scene } from './scenes';

export function ParamControl({ pkey, def, value, onChange }: any) {
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
  const seg = def.options.length <= 4 && def.options.every((o: string) => o.length <= 9);
  if (seg) {
    return (
      <label className="ww-pc">
        <span className="ww-pc-k">{pkey}</span>
        <span className="ww-seg">
          {def.options.map((o: string) => <button key={o} className={cx(o === value && 'is-on')} onClick={() => onChange(o)}>{o}</button>)}
        </span>
      </label>
    );
  }
  return (
    <label className="ww-pc">
      <span className="ww-pc-k">{pkey}</span>
      <select className="ww-sel" value={value} onChange={e => onChange(e.target.value)}>
        {def.options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function EffectEditor({ fx, onParam, onRemove, onToggle }: any) {
  const meta = EFFECT_TYPES[fx.type];
  return (
    <div className="ww-fxedit" style={{ '--fx': fxColor(fx.type), '--fxdim': fxColor(fx.type, 0.45, 0.1) } as any}>
      <div className="ww-fxedit-head">
        <span className="ww-fxedit-g">{meta.glyph}</span>
        <div className="ww-fxedit-t"><b>{meta.label}</b><span>{meta.blurb}</span></div>
        <button className={cx('ww-tog', fx.on && 'is-on')} onClick={onToggle} title="Toggle effect"><i /></button>
      </div>
      <div className="ww-fxedit-params">
        {Object.keys(meta.params).map(k => (
          <ParamControl key={k} pkey={k} def={meta.params[k]} value={fx.params[k]} onChange={(v: any) => onParam(k, v)} />
        ))}
      </div>
      <button className="ww-fxremove" onClick={onRemove}>Remove effect</button>
    </div>
  );
}

export function AddEffectPalette({ onAdd }: any) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="ww-addfx">
      <button className="ww-addfx-btn" onClick={() => setOpen(o => !o)}>＋ Add effect</button>
      {open && (
        <div className="ww-addfx-grid">
          {Object.keys(EFFECT_TYPES).map(t => {
            const m = EFFECT_TYPES[t];
            return (
              <button key={t} className="ww-addfx-item" style={{ '--fx': fxColor(t) } as any}
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

export function FxInspector({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }: any) {
  return (
    <div className="ww-insp-fx">
      <div className="ww-insp-sub">Effects · {panel.fx.length}</div>
      <div className="ww-fxlist">
        {panel.fx.map((fx: any) => (
          <div key={fx.id}>
            <button className={cx('ww-fxrow', selFx === fx.id && 'is-open', !fx.on && 'is-off')}
              style={{ '--fx': fxColor(fx.type) } as any} onClick={() => setSelFx(selFx === fx.id ? null : fx.id)}>
              <span className="ww-fxrow-g">{EFFECT_TYPES[fx.type].glyph}</span>
              <span className="ww-fxrow-l">{EFFECT_TYPES[fx.type].label}</span>
              <span className="ww-fxrow-v">{firstParam(fx)}</span>
              <span className="ww-fxrow-x">{selFx === fx.id ? '▾' : '▸'}</span>
            </button>
            {selFx === fx.id && (
              <EffectEditor fx={fx} onParam={(k: string, v: any) => onParam(fx.id, k, v)} onRemove={() => onRemove(fx.id)} onToggle={() => onToggle(fx.id)} />
            )}
          </div>
        ))}
      </div>
      <AddEffectPalette onAdd={onAdd} />
    </div>
  );
}

export function FxTracks({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }: any) {
  function pos(fx: any) {
    const trig = fx.params.Trigger || (fx.type === 'transition' ? 'On exit' : 'On enter');
    if (trig === 'On exit' || fx.type === 'transition') return [70, 96];
    if (trig === 'On tap') return [38, 60];
    if (trig === 'Continuous' || fx.type === 'parallax') return [6, 96];
    if (fx.type === 'pacing') return [44, 70];
    return [8, 40];
  }
  const sel = panel.fx.find((f: any) => f.id === selFx);
  return (
    <div className="ww-tracks">
      <div className="ww-insp-sub">Scroll timeline</div>
      <div className="ww-track-grid">
        <div className="ww-track-rail"><span>enter</span><span>read line</span><span>exit</span></div>
        {panel.fx.map((fx: any) => {
          const [a, b] = pos(fx);
          return (
            <div key={fx.id} className="ww-track">
              <span className="ww-track-name" style={{ color: fxColor(fx.type) }}>{EFFECT_TYPES[fx.type].glyph}</span>
              <div className="ww-track-lane">
                <button className={cx('ww-track-bar', selFx === fx.id && 'is-sel', !fx.on && 'is-off')}
                  style={{ left: a + '%', width: (b - a) + '%', '--fx': fxColor(fx.type) } as any}
                  onClick={() => setSelFx(fx.id)}>
                  {EFFECT_TYPES[fx.type].label}
                </button>
              </div>
            </div>
          );
        })}
        <div className="ww-track-readline" />
      </div>
      <AddEffectPalette onAdd={onAdd} />
      {sel && <EffectEditor fx={sel} onParam={(k: string, v: any) => onParam(sel.id, k, v)} onRemove={() => onRemove(sel.id)} onToggle={() => onToggle(sel.id)} />}
    </div>
  );
}

export function FxStage({ panel, selFx, setSelFx, onParam, onAdd, onRemove, onToggle }: any) {
  const spots: Record<number, [number, number]> = { 0: [22, 24], 1: [74, 30], 2: [30, 70], 3: [78, 72], 4: [50, 50], 5: [50, 20], 6: [20, 50], 7: [80, 50] };
  const sel = panel.fx.find((f: any) => f.id === selFx);
  return (
    <div className="ww-fxstage">
      <div className="ww-insp-sub">Stage handles</div>
      <div className="ww-fxstage-art">
        <Scene kind={panel.scene} />
        <div className="ww-fxstage-pucks">
          {panel.fx.map((fx: any, i: number) => {
            const [x, y] = spots[i] || [50, 50];
            return (
              <button key={fx.id} className={cx('ww-puck', selFx === fx.id && 'is-sel', !fx.on && 'is-off')}
                style={{ left: x + '%', top: y + '%', '--fx': fxColor(fx.type) } as any}
                onClick={() => setSelFx(fx.id)} title={EFFECT_TYPES[fx.type].label}>
                {EFFECT_TYPES[fx.type].glyph}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ww-puckrow">
        {panel.fx.map((fx: any) => (
          <button key={fx.id} className={cx('ww-chip', selFx === fx.id && 'is-active')} style={{ '--fx': fxColor(fx.type) } as any} onClick={() => setSelFx(fx.id)}>
            <span className="ww-chip-g">{EFFECT_TYPES[fx.type].glyph}</span>
          </button>
        ))}
      </div>
      <AddEffectPalette onAdd={onAdd} />
      {sel && <EffectEditor fx={sel} onParam={(k: string, v: any) => onParam(sel.id, k, v)} onRemove={() => onRemove(sel.id)} onToggle={() => onToggle(sel.id)} />}
    </div>
  );
}

function firstParam(fx: any) {
  const k = Object.keys(fx.params)[0];
  const v = fx.params[k];
  const def = EFFECT_TYPES[fx.type].params[k];
  return v + (def && def.unit ? def.unit : '');
}

export { mkFx };
