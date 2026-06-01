// stages.jsx — Library (assets), Story (bible), Publish (export).

// ---------- LIBRARY ----------
function Library({ library, setLibrary, onUseAsset }) {
  const [filter, setFilter] = React.useState('All');
  const [prompt, setPrompt] = React.useState('Sulawesi access tunnel, wet concrete, single failing lamp, lethal night outside, dusk-to-indigo grade');
  const [busy, setBusy] = React.useState(false);
  const kinds = ['All', 'Background', 'Character', 'Prop', 'FX plate'];
  const shown = library.filter(a => filter === 'All' || a.kind === filter);

  function generate() {
    setBusy(true);
    const ids = [0, 1, 2].map(i => ({ id: 'g' + Math.random().toString(36).slice(2, 6), kind: 'Background', scene: ['tunnels', 'lantern_hub', 'night_lockdown'][i], name: 'Gen · ' + prompt.split(',')[0].slice(0, 22), source: 'AI', tags: ['new'], state: 'Queued' }));
    setLibrary(l => [...ids, ...l]);
    ids.forEach((g, i) => setTimeout(() => {
      setLibrary(l => l.map(a => a.id === g.id ? { ...a, state: 'Generated' } : a));
      if (i === 2) setBusy(false);
    }, 700 + i * 700));
  }

  return (
    <div className="ww-library">
      <div className="ww-gen">
        <div className="ww-gen-head"><span className="ww-cop-orb" /> Generate art</div>
        <textarea className="ww-gen-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
        <div className="ww-gen-row">
          <div className="ww-gen-style">Style lock: <b>Echo dusk key</b> · indigo shadow / amber lamp</div>
          <button className={cx('ww-gen-btn', busy && 'is-busy')} onClick={generate} disabled={busy}>{busy ? 'Generating…' : '✦ Generate 3'}</button>
        </div>
      </div>
      <div className="ww-lib-bar">
        <div className="ww-filters">{kinds.map(k => <button key={k} className={cx('ww-filter', filter === k && 'is-on')} onClick={() => setFilter(k)}>{k}</button>)}</div>
        <span className="ww-lib-count">{shown.length} assets</span>
      </div>
      <div className="ww-libgrid">
        {shown.map(a => (
          <AssetThumb key={a.id} scene={a.scene} label={a.name} sub={a.kind} source={a.source} state={a.state} onClick={() => onUseAsset && onUseAsset(a)} />
        ))}
      </div>
      <div className="ww-cast">
        <div className="ww-insp-sub">Cast plates · {window.CHARACTERS.length}</div>
        <div className="ww-castrow">
          {window.CHARACTERS.map(c => (
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

// ---------- STORY ----------
function Story({ panels }) {
  const e = window.EPISODE;
  return (
    <div className="ww-story">
      <div className="ww-story-hero">
        <div className="ww-pv-kicker">{e.genre}</div>
        <h1>{e.series}</h1>
        <div className="ww-story-ep">{e.number} — “{e.title}”</div>
        <p className="ww-story-log">{e.logline}</p>
      </div>
      <div className="ww-story-cols">
        <div className="ww-story-beats">
          <div className="ww-insp-sub">Beat sheet · {panels.length} panels</div>
          <ol className="ww-beatlist">
            {panels.map(p => (
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
            <li>Night lethality implied, never explained (“the blanket”).</li>
            <li>POV: Neelai only for Episode 01.</li>
          </ul>
          <div className="ww-insp-sub" style={{ marginTop: 18 }}>Throughlines</div>
          <div className="ww-thru">
            <span style={{ '--h': '0deg' }}>Physics · the cases</span>
            <span style={{ '--h': '285deg' }}>Echo · personhood</span>
            <span style={{ '--h': '200deg' }}>Indu · kinship</span>
            <span style={{ '--h': '25deg' }}>Rajni · control</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- PUBLISH ----------
function Publish({ panels }) {
  const [pubbed, setPubbed] = React.useState(false);
  const [opt, setOpt] = React.useState(true);
  const fxCount = panels.reduce((n, p) => n + p.fx.length, 0);
  return (
    <div className="ww-publish">
      <div className="ww-pub-main">
        <div className="ww-pv-kicker">Publish</div>
        <h2>Ship “{window.EPISODE.title}”</h2>
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
          <p>“The hour the city starts counting heads. A journalist, a lamplighter, and a voice with no face. Read it scrolling.”</p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Library, Story, Publish });
