import React from 'react';
import { cx } from './ui';
import { SeriesCover } from './scenes';

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
      status: 'Outlining', hue: statusHue('Outlining'), cover: '', // cover is assigned later from the Production Library
      seasons: 1, episodes: 0, published: 0, panels: 0, progress: 0,
      updated: 'Just now',
    };
    setSeries((s: any[]) => [ns, ...s]);
    setCreating(false);
    flash('"' + ns.title + '" created' + (ns.genre ? ' · ' + ns.genre : ''));
    // Make the new (blank) series active and drop into its Narrative workspace.
    setActive(ns.id);
    onOpen(ns);
  }

  function deleteSeries(target: any) {
    if (series.length <= 1) { flash('Can’t delete the only series.'); return; }
    if (!window.confirm(`Delete “${target.title}”? This permanently removes the series and its setup.`)) return;
    setSeries((list: any[]) => list.filter((x: any) => x.id !== target.id));
    if (target.id === activeId) { const next = series.find((x: any) => x.id !== target.id); if (next) setActive(next.id); }
    setCfgId(null);
    flash('Deleted · ' + target.title);
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
              <SeriesCover cover={s.cover} />
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
      </div>

      {creating && <NewSeriesModal onClose={() => setCreating(false)} onCreate={createSeries} />}
      {cfg && <SeriesDrawer s={cfg} cast={cfg.id === activeId ? (characters || []) : []} onClose={() => setCfgId(null)} flash={flash}
        onDelete={deleteSeries}
        onSave={(patch: any) => setSeries((list: any[]) => list.map((x: any) => x.id === cfg.id ? { ...x, ...patch, updated: 'Just now' } : x))} />}
    </div>
  );
}

function NewSeriesModal({ onClose, onCreate }: any) {
  const [d, setD] = React.useState({ title: '', tagline: '', genre: '' });
  const set = (k: string, v: any) => setD(o => ({ ...o, [k]: v }));
  const submit = () => onCreate({ ...d });

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
          <div className="ww-field">
            <span className="ww-field-l">Genre</span>
            <input className="ww-input" value={d.genre} placeholder="e.g. Solarpunk mystery" onChange={e => set('genre', e.target.value)} />
          </div>
          <p className="ww-cfg-help" style={{ margin: '2px 0 0' }}>The cover plate is assigned later from the Production Library — new series start without one.</p>
        </div>
        <div className="ww-modal-foot">
          <button className="ww-btn ghost" onClick={onClose}>Cancel</button>
          <button className="ww-btn primary" disabled={!d.title.trim()} onClick={submit}>Create series</button>
        </div>
      </div>
    </div>
  );
}

function SeriesDrawer({ s, onClose, onSave, onDelete, flash, cast = [] }: any) {
  const [title, setTitle] = React.useState(s.title || '');
  const [genre, setGenre] = React.useState(s.genre || '');
  const [tagline, setTagline] = React.useState(s.tagline || '');
  return (
    <React.Fragment>
      <div className="ww-drawer-scrim" onClick={onClose} />
      <aside className="ww-drawer">
        <div className="ww-drawer-cover">
          <SeriesCover cover={s.cover} />
          <div className="ww-drawer-cover-grad" />
          <button className="ww-drawer-x" onClick={onClose}>✕</button>
          <div className="ww-drawer-title"><span>{genre || s.genre}</span><h2>{title || s.title}</h2></div>
        </div>
        <div className="ww-drawer-body">
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Identity</div>
            <div className="ww-cfg-meta">
              <div><span>Status</span><b>{s.status}</b></div>
              <div><span>Last edit</span><b>{s.updated}</b></div>
            </div>
          </div>
          <div className="ww-cfg-block">
            <div className="ww-field">
              <span className="ww-field-l">Title</span>
              <input className="ww-input" value={title} placeholder="Series title" onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="ww-field" style={{ marginTop: 12 }}>
              <span className="ww-field-l">Genre</span>
              <input className="ww-input" value={genre} placeholder="e.g. Solarpunk mystery" onChange={e => setGenre(e.target.value)} />
            </div>
            <div className="ww-field" style={{ marginTop: 12 }}>
              <span className="ww-field-l">Logline</span>
              <input className="ww-input" value={tagline} placeholder="The one line that makes someone tap in." onChange={e => setTagline(e.target.value)} />
            </div>
          </div>
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Cover plate</div>
            <p className="ww-cfg-help">Assigned from the Production Library — open <b>Production → Library</b> and choose “Set cover” on any plate.</p>
          </div>
          <div className="ww-cfg-block">
            <div className="ww-insp-sub">Cast roster · {cast.length || 'none yet'}</div>
            {cast.length ? (
              <div className="ww-cfg-cast">
                {cast.map((c: any) => <span key={c.id} className="ww-cfg-castchip"><i style={{ background: `oklch(0.6 0.15 ${c.tint})` }} />{c.name}</span>)}
              </div>
            ) : <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55, margin: 0 }}>No characters cast yet. Build the roster in the Narrative workspace.</p>}
          </div>
          <div className="ww-cfg-actions">
            <button className="ww-btn primary"
              onClick={() => {
                onSave?.({ title: title.trim() || s.title, genre: genre.trim(), tagline });
                flash('Saved · ' + (title.trim() || s.title));
                onClose();
              }}>Save configuration</button>
            <button className="ww-btn danger" onClick={() => onDelete?.(s)}>Delete series</button>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}
