import React from 'react';
import { cx } from './ui';
import { Scene } from './scenes';

const GENRES = ['Sci-fi mystery', 'Folk-horror', 'Neon-noir', 'Cozy mystery', 'Solarpunk', 'Fantasy', 'Slice of life'];
const FORMATS = ['Vertical scroll · vertoon', 'Paged · landscape', 'Paged · portrait'];
const POVS = ['Single POV per episode', 'Rotating ensemble', 'First-person', 'Omniscient'];
const STARTER_PALS = [
  ['#1a2740', '#9a5a4e', '#16d6b4', '#caa07a'],
  ['#0d1f24', '#1c3a3f', '#5a7d6e', '#cbb894'],
  ['#120a1f', '#3a1145', '#ff2e88', '#34e0ff'],
  ['#1a1710', '#3a2f1a', '#e0b552', '#9ad1c4'],
];
const COVER_SCENES = ['dusk_skyline', 'tunnels', 'night_lockdown', 'lantern_hub', 'echo_call', 'rescue'];

function statusHue(s: string) {
  return ({ 'In production': 285, 'Drafting': 175, 'Visual dev': 330, 'Outlining': 60 } as any)[s] || 280;
}

export function Series({ series, setSeries, activeId, setActive, onOpen, characters, flash }: any) {
  const [cfgId, setCfgId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const cfg = series.find((s: any) => s.id === cfgId);

  function createSeries(data: any) {
    const id = 'sx' + Math.random().toString(36).slice(2, 6);
    const ns = {
      id, title: data.title || 'Untitled Series', genre: data.genre, tagline: data.tagline,
      status: 'Outlining', hue: statusHue('Outlining'), cover: data.cover, format: data.format,
      seasons: 1, episodes: 0, published: 0, panels: 0, progress: 0,
      palette: data.palette, styleKey: data.styleKey || 'Untitled key', pov: data.pov,
      updated: 'Just now', canon: data.canon.split('\n').map((s: string) => s.trim()).filter(Boolean),
    };
    setSeries((s: any[]) => [ns, ...s]);
    setCreating(false);
    flash('"' + ns.title + '" created · ' + ns.genre);
    // Make the new (blank) series active and drop into its Narrative workspace.
    setActive(ns.id);
    onOpen(ns);
  }

  return (
    <div className="ww-series">
      <div className="ww-series-head">
        <div>
          <div className="ww-pv-kicker">Workbench · all series</div>
          <h1>Your series</h1>
        </div>
        <button className="ww-tb-newbtn" onClick={() => setCreating(true)}>＋ New series</button>
      </div>
      <p className="ww-series-sub">{series.length} comics in this workbench · {series.filter((s: any) => s.status === 'In production').length} in production · {series.reduce((n: number, s: any) => n + s.published, 0)} episodes published.</p>

      <div className="ww-seriesgrid">
        {series.map((s: any) => (
          <div key={s.id} className={cx('ww-scard', s.id === activeId && 'is-active')} style={{ '--sh': `oklch(0.7 0.16 ${s.hue})` } as any}>
            <div className="ww-scard-cover">
              <Scene kind={s.cover} />
              <div className="ww-scard-grad" />
              <div className="ww-scard-badge"><i />{s.status}</div>
              {s.id === activeId && <div className="ww-scard-active-tag">● Active</div>}
              <div className="ww-scard-titles"><span>{s.genre}</span><h3>{s.title}</h3></div>
            </div>
            <div className="ww-scard-body">
              <div className="ww-scard-tag">{s.tagline}</div>
              <div className="ww-scard-stats">
                <div><b>{s.seasons}</b><span>Seasons</span></div>
                <div><b>{s.episodes}</b><span>Episodes</span></div>
                <div><b>{s.panels}</b><span>Panels</span></div>
                <div><b>{s.published}</b><span>Live</span></div>
              </div>
              <div className="ww-scard-prog">
                <div className="ww-scard-prog-bar"><i style={{ width: Math.max(4, s.progress * 100) + '%' }} /></div>
                <span>{Math.round(s.progress * 100)}%</span>
              </div>
              <div className="ww-scard-actions">
                <button className="ww-scard-open" onClick={() => { setActive(s.id); onOpen(s); flash(s.id === activeId ? 'Already open · ' + s.title : 'Now editing · ' + s.title); }}>
                  {s.id === activeId ? 'Continue →' : 'Open series'}
                </button>
                <button className="ww-scard-cfg" onClick={() => setCfgId(s.id)}>Configure</button>
              </div>
            </div>
          </div>
        ))}
        <button className="ww-scard-new" onClick={() => setCreating(true)}><b>＋</b><span>New series</span></button>
      </div>

      {creating && <NewSeriesModal onClose={() => setCreating(false)} onCreate={createSeries} />}
      {cfg && <SeriesDrawer s={cfg} cast={cfg.id === activeId ? (characters || []) : []} onClose={() => setCfgId(null)} flash={flash}
        onSave={(patch: any) => setSeries((list: any[]) => list.map((x: any) => x.id === cfg.id ? { ...x, ...patch, updated: 'Just now' } : x))} />}
    </div>
  );
}

function NewSeriesModal({ onClose, onCreate }: any) {
  const [d, setD] = React.useState({
    title: '', tagline: '', genre: GENRES[0], format: FORMATS[0], pov: POVS[0],
    cover: COVER_SCENES[0], palIdx: 0, styleKey: '', canon: 'No on-page violence; dread by absence.',
  });
  const set = (k: string, v: any) => setD(o => ({ ...o, [k]: v }));
  const submit = () => onCreate({ ...d, palette: STARTER_PALS[d.palIdx] });

  return (
    <div className="ww-modal" onClick={onClose}>
      <div className="ww-modal-card" onClick={e => e.stopPropagation()}>
        <div className="ww-modal-head">
          <div><div className="ww-pv-kicker">Create</div><h2>New series</h2></div>
          <button className="ww-icbtn" onClick={onClose}>✕</button>
        </div>
        <div className="ww-modal-body">
          <div className="ww-field">
            <span className="ww-field-l">Title</span>
            <input className="ww-input" autoFocus value={d.title} placeholder="e.g. Hollow Tide" onChange={e => set('title', e.target.value)} />
          </div>
          <div className="ww-field">
            <span className="ww-field-l">Logline <b>one sentence</b></span>
            <input className="ww-input" value={d.tagline} placeholder="The one line that makes someone tap in." onChange={e => set('tagline', e.target.value)} />
          </div>
          <div className="ww-field-row">
            <div className="ww-field">
              <span className="ww-field-l">Genre</span>
              <div className="ww-choicerow">
                {GENRES.slice(0, 5).map(g => <button key={g} className={cx('ww-choice', d.genre === g && 'is-on')} onClick={() => set('genre', g)}>{g}</button>)}
              </div>
            </div>
          </div>
          <div className="ww-field-row">
            <div className="ww-field">
              <span className="ww-field-l">Format</span>
              <select className="ww-input" value={d.format} onChange={e => set('format', e.target.value)}>{FORMATS.map(f => <option key={f}>{f}</option>)}</select>
            </div>
            <div className="ww-field">
              <span className="ww-field-l">Point of view</span>
              <select className="ww-input" value={d.pov} onChange={e => set('pov', e.target.value)}>{POVS.map(p => <option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="ww-field">
            <span className="ww-field-l">Style key <b>locks the generator</b></span>
            <input className="ww-input" value={d.styleKey} placeholder="e.g. Brine & lamp-black" onChange={e => set('styleKey', e.target.value)} />
            <div className="ww-palrow">
              {STARTER_PALS.map((p, i) => (
                <button key={i} className={cx('ww-palopt', d.palIdx === i && 'is-on')} onClick={() => set('palIdx', i)}>
                  {p.map((c, j) => <i key={j} style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>
          <div className="ww-field">
            <span className="ww-field-l">Cover plate</span>
            <div className="ww-choicerow">
              {COVER_SCENES.map(c => <button key={c} className={cx('ww-choice', d.cover === c && 'is-on')} onClick={() => set('cover', c)}>{c.replace('_', ' ')}</button>)}
            </div>
          </div>
          <div className="ww-field">
            <span className="ww-field-l">Canon rules <b>one per line · the lines the AI must never break</b></span>
            <textarea className="ww-input" rows={3} value={d.canon} onChange={e => set('canon', e.target.value)} />
          </div>
        </div>
        <div className="ww-modal-foot">
          <button className="ww-btn ghost" onClick={onClose}>Cancel</button>
          <button className="ww-btn primary" disabled={!d.title.trim()} onClick={submit}>Create series</button>
        </div>
      </div>
    </div>
  );
}

function SeriesDrawer({ s, onClose, onSave, flash, cast = [] }: any) {
  const [pal, setPal] = React.useState(s.palette);
  const [canon, setCanon] = React.useState((s.canon || []).join('\n'));
  const ROLES = ['Shadow', 'Midtone', 'Key light', 'Accent', 'Tint', 'Tone'];
  const setColor = (i: number, v: string) => setPal((p: string[]) => p.map((c, j) => j === i ? v : c));
  const removeColor = (i: number) => setPal((p: string[]) => p.filter((_: any, j: number) => j !== i));
  const addColor = () => setPal((p: string[]) => [...p, '#8892a0']);
  return (
    <React.Fragment>
      <div className="ww-drawer-scrim" onClick={onClose} />
      <aside className="ww-drawer">
        <div className="ww-drawer-cover">
          <Scene kind={s.cover} />
          <div className="ww-drawer-cover-grad" />
          <button className="ww-drawer-x" onClick={onClose}>✕</button>
          <div className="ww-drawer-title"><span>{s.genre}</span><h2>{s.title}</h2></div>
        </div>
        <div className="ww-drawer-body">
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Identity</div>
            <div className="ww-cfg-meta">
              <div><span>Status</span><b>{s.status}</b></div>
              <div><span>Format</span><b>{s.format}</b></div>
              <div><span>Point of view</span><b>{s.pov}</b></div>
              <div><span>Last edit</span><b>{s.updated}</b></div>
            </div>
          </div>
          <div className="ww-cfg-block">
            <div className="ww-cfg-stylehead">
              <div className="ww-insp-sub" style={{ margin: 0 }}>Style lock · {s.styleKey}</div>
              <span className="ww-cfg-lockbadge">◆ locked</span>
            </div>
            <p className="ww-cfg-help">Every plate the generator makes is pinned to this colour key, so the whole series stays on-model. Click a swatch to recolour it.</p>
            <div className="ww-cfg-pal">
              {pal.map((c: string, i: number) => (
                <label key={i} className="ww-cfg-sw">
                  <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} />
                  <i style={{ background: c }} />
                  <span>{ROLES[i] || 'Colour ' + (i + 1)}</span>
                  {pal.length > 2 && <button className="ww-cfg-sw-x" title="Remove" onClick={(e) => { e.preventDefault(); removeColor(i); }}>✕</button>}
                </label>
              ))}
              {pal.length < 6 && <button className="ww-cfg-sw-add" title="Add colour" onClick={addColor}>＋</button>}
            </div>
          </div>
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Canon rules · one per line · the AI will not break these</div>
            <textarea className="ww-input" rows={4} value={canon} placeholder="One rule per line…" onChange={e => setCanon(e.target.value)} />
          </div>
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Cast roster · {cast.length || 'none yet'}</div>
            {cast.length ? (
              <div className="ww-cfg-cast">
                {cast.map((c: any) => <span key={c.id} className="ww-cfg-castchip"><i style={{ background: `oklch(0.6 0.15 ${c.tint})` }} />{c.name}</span>)}
              </div>
            ) : <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55, margin: 0 }}>No characters cast yet. Build the roster in the Narrative workspace.</p>}
          </div>
          <button className="ww-btn primary" style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              onSave?.({ palette: pal, canon: canon.split('\n').map((c: string) => c.trim()).filter(Boolean) });
              flash('Saved · ' + s.title);
              onClose();
            }}>Save configuration</button>
        </div>
      </aside>
    </React.Fragment>
  );
}
