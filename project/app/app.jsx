// app.jsx — shell: WORDWERX navigator (series switcher + nested workspace nav),
// routing across the four UXs, co-pilot wiring, tweaks, mount.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "canvasModel": "filmstrip",
  "fxUI": "inspector",
  "accent": "#2563EB",
  "grain": true,
  "density": "regular"
} /*EDITMODE-END*/;

// the WORDWERX icon — two interlocking speech bubbles (brand mark)
function BrandMark() {
  return (
    <svg viewBox="0 0 512 512" aria-label="WORDWERX">
      <defs><clipPath id="wwmark"><rect x="0" y="0" width="512" height="256" /></clipPath></defs>
      <path d="M 138,282 L 142,282 L 322,166 L 242,282 L 374,282 A 42,42 0 0,1 416,324 L 416,410 A 42,42 0 0,1 374,452 L 138,452 A 42,42 0 0,1 96,410 L 96,324 A 42,42 0 0,1 138,282 Z" fill="#2563EB" />
      <path d="M 138,60 L 374,60 A 42,42 0 0,1 416,102 L 416,188 A 42,42 0 0,1 374,230 L 370,230 L 190,346 L 270,230 L 138,230 A 42,42 0 0,1 96,188 L 96,102 A 42,42 0 0,1 138,60 Z" fill="#3a4455" />
      <g clipPath="url(#wwmark)"><polygon points="142,282 242,282 322,166" fill="#2563EB" /></g>
    </svg>);

}

const NAV = [
{ id: 'series', label: 'Series', glyph: '◈', single: true },
{ id: 'narrative', label: 'Narrative', glyph: '✎', children: [
  { id: 'cast', label: 'Characters' }, { id: 'arcs', label: 'Seasons' }, { id: 'beats', label: 'Storyboard\n' }, { id: 'script', label: 'Script' }] },
{ id: 'visual', label: 'Visual Dev', glyph: '◎', children: [
  { id: 'board', label: 'Prototype board' }, { id: 'sheets', label: 'Model sheets' }] },
{ id: 'production', label: 'Production', glyph: '▦', children: [
  { id: 'story', label: 'Story' }, { id: 'library', label: 'Library' }, { id: 'compose', label: 'Compose' }, { id: 'preview', label: 'Preview' }, { id: 'publish', label: 'Publish' }] }];

const WS_LABEL = { series: 'Series', narrative: 'Narrative', visual: 'Visual Development', production: 'Production' };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [ws, setWs] = React.useState('series');
  const [subs, setSubs] = React.useState({ narrative: 'cast', visual: 'board', production: 'compose' });
  const [open, setOpen] = React.useState({ narrative: true, visual: true, production: true });
  const [series, setSeries] = React.useState(() => window.SERIES);
  const [activeSeries, setActiveSeries] = React.useState('echo');
  const [seriesMenu, setSeriesMenu] = React.useState(false);
  const [panels, setPanels] = React.useState(() => window.PANELS);
  const [library, setLibrary] = React.useState(() => window.LIBRARY);
  const [selId, setSelId] = React.useState(window.PANELS[5].id);
  const [copilot, setCopilot] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [visualSelId, setVisualSelId] = React.useState(null);

  const activeObj = series.find((s) => s.id === activeSeries) || series[0];
  const isEcho = activeSeries === 'echo';
  const setSub = (wsId, v) => setSubs((s) => ({ ...s, [wsId]: v }));

  function flash(msg) {setToast(msg);clearTimeout(window.__wwT);window.__wwT = setTimeout(() => setToast(null), 2600);}
  function nav(item) {setWs(item.id);if (item.children && !open[item.id]) setOpen((o) => ({ ...o, [item.id]: true }));}
  function openSeries(s) {setActiveSeries(s.id);if (s.id === 'echo') {setWs('narrative');}}

  function onApply(action) {
    if (action.kind === 'pacing') {
      setPanels((ps) => ps.map((p) => ['p9', 'p10'].includes(p.id) && !p.fx.some((f) => f.type === 'pacing') ?
      { ...p, fx: [...p.fx, window.mkFx('pacing', { params: { Mode: p.id === 'p9' ? 'Scroll-lock' : 'Hold beat', Length: 2.2 } })] } : p));
      flash('Pacing applied to the crisis sequence');
    } else if (action.kind === 'generate') {flash('Queued 8 character plates');setWs('production');setSub('production', 'library');} else
    if (action.kind === 'beat') flash('Beat inserted into the outline');else
    if (action.kind === 'lock') flash('Lantern Hub locked as canonical');else
    if (action.kind === 'scrim') flash('Caption scrim added in preview');else
    if (action.kind === 'opt') flash('Lazy-loading enabled');else
    flash('Done');
  }

  const accent = t.accent || '#2563EB';
  const rootStyle = {
    '--accent': accent,
    '--accent2': accent.toLowerCase() === '#16d6b4' ? '#7b61ff' : '#16d6b4',
    '--grain-op': t.grain ? 1 : 0
  };
  const dens = { compact: 0.86, regular: 1, comfy: 1.12 }[t.density] || 1;
  const copContext = ws === 'production' ? subs.production : ws;
  const showCop = copilot && ws !== 'series';

  return (
    <div className={cx('ww-app', 'dens-' + (t.density || 'regular'))} style={{ ...rootStyle, '--dens': dens }}>
      {/* ===== NAVIGATOR ===== */}
      <nav className="ww-nav2">
        <div className="ww-nav2-brand">
          <img className="ww-nav-logo-sm" src="app/brand/wordwerx-logo-dark.svg" alt="WORDWERX" onClick={() => setWs('series')} />
          <button className={cx('ww-nav-icon-btn', copilot && 'is-on')} title="Sherlock — your story co-pilot" onClick={() => setCopilot((c) => !c)}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Deerstalker crown */}
              <path d="M4 13 Q3.5 6 10 5.5 Q16.5 6 16 13" />
              {/* Brim band */}
              <path d="M3 13 L17 13" />
              {/* Back peak (left) */}
              <path d="M3.5 13 Q1.5 12.5 1 10.5 Q1.5 8.5 3.5 9.5" />
              {/* Front peak (right) */}
              <path d="M16.5 13 Q18.5 12.5 19 10.5 Q18.5 8.5 16.5 9.5" />
              {/* Ear-strap bow on top */}
              <path d="M8 5.5 Q10 3 12 5.5" />
            </svg>
          </button>
          <button className="ww-nav-icon-btn" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2 C7 3 6 5.5 6 8 L6 13 L4 14 L16 14 L14 13 L14 8 C14 5.5 13 3 10 2 Z" />
              <path d="M8.5 14 Q8.5 16.5 10 16.5 Q11.5 16.5 11.5 14" />
            </svg>
          </button>
        </div>

        <button className={cx('ww-series-switch', seriesMenu && 'is-open')} onClick={() => setSeriesMenu((m) => !m)}>
          <div className="ww-series-switch-cover"><Scene kind={activeObj.cover} /></div>
          <div className="ww-series-switch-meta"><b>{activeObj.title}</b><span>{activeObj.status}</span></div>
          <span className="ww-series-switch-chev">▾</span>
          {seriesMenu &&
          <div className="ww-series-menu" onClick={(e) => e.stopPropagation()}>
              {series.map((s) =>
            <button key={s.id} className={cx('ww-series-menu-item', s.id === activeSeries && 'is-on')}
            onClick={() => {setActiveSeries(s.id);setSeriesMenu(false);flash('Switched to ' + s.title);}}>
                  <div className="ww-series-menu-cover"><Scene kind={s.cover} /></div>
                  <b>{s.title}</b>
                  <i style={{ background: `oklch(0.7 0.16 ${s.hue})` }} />
                </button>
            )}
              <div className="ww-series-menu-foot">
                <button onClick={() => {setWs('series');setSeriesMenu(false);}}>Manage all series →</button>
              </div>
            </div>
          }
        </button>

        <div className="ww-nav2-scroll">
          {NAV.map((item) =>
          <div key={item.id}>
              <button className={cx('ww-nav2-ws', ws === item.id && 'is-active', item.children && open[item.id] && 'is-open')} onClick={() => nav(item)}>
                <span className="ww-nav2-ws-g">{item.glyph}</span>
                <span className="ww-nav2-ws-l">{item.label}</span>
                {item.children && <span className="ww-nav2-ws-chev" onClick={(e) => {e.stopPropagation();setOpen((o) => ({ ...o, [item.id]: !o[item.id] }));}}>▸</span>}
              </button>
              {item.children && open[item.id] &&
            <div className="ww-nav2-children">
                  {item.children.map((c) =>
              <button key={c.id} className={cx('ww-nav2-child', ws === item.id && subs[item.id] === c.id && 'is-on')}
              onClick={() => {setWs(item.id);setSub(item.id, c.id);}}>
                      {c.label}
                    </button>
              )}
                </div>
            }
            </div>
          )}
        </div>
      </nav>

      {/* ===== MAIN ===== */}
      <div className="ww-main">

        <div className={cx('ww-stagewrap', showCop && 'has-cop')}>
          <main className="ww-stage">
            {ws === 'series' && <Series series={series} setSeries={setSeries} activeId={activeSeries} setActive={setActiveSeries} onOpen={openSeries} flash={flash} />}
            {ws !== 'series' && !isEcho && <PlaceholderWS s={activeObj} onManage={() => setWs('series')} />}
            {ws === 'narrative' && isEcho && <Narrative panels={panels} setPanels={setPanels} episode={window.EPISODE} tab={subs.narrative} setTab={(v) => setSub('narrative', v)} onGoVisual={(id) => {setWs('visual');setSub('visual', 'board');setVisualSelId(id || null);}} />}
            {ws === 'visual' && isEcho && <VisualDev tab={subs.visual} setTab={(v) => setSub('visual', v)} preselect={visualSelId} flash={flash} />}
            {ws === 'production' && isEcho && (
            subs.production === 'story' ? <Story panels={panels} /> :
            subs.production === 'library' ? <Library library={library} setLibrary={setLibrary} onUseAsset={(a) => flash('“' + a.name + '” added to canvas')} /> :
            subs.production === 'compose' ? <Compose panels={panels} setPanels={setPanels} selId={selId} setSelId={setSelId} canvasModel={t.canvasModel} fxUI={t.fxUI} /> :
            subs.production === 'preview' ? <Preview panels={panels} /> :
            <Publish panels={panels} />)
            }
          </main>
          {showCop && <Copilot stage={copContext} open={copilot} onClose={() => setCopilot(false)} onApply={onApply} episode={window.EPISODE} />}
        </div>
      </div>

      {toast && <div className="ww-toast">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Canvas — editing model" />
        <TweakRadio label="Layout" value={t.canvasModel} options={['filmstrip', 'board', 'cinema']} onChange={(v) => {setTweak('canvasModel', v);setWs('production');setSub('production', 'compose');}} />
        <TweakSection label="Effects authoring UI" />
        <TweakRadio label="Inspector style" value={t.fxUI} options={['inspector', 'tracks', 'stage']} onChange={(v) => {setTweak('fxUI', v);setWs('production');setSub('production', 'compose');}} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={['#2563EB', '#7b61ff', '#16d6b4', '#f3b23c']} onChange={(v) => setTweak('accent', v)} />
        <TweakToggle label="Film grain" value={t.grain} onChange={(v) => setTweak('grain', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>);

}

// light placeholder for the sibling series (only Echo's Location is fully spec'd)
function PlaceholderWS({ s, onManage }) {
  return (
    <div className="ww-sheet">
      <div className="ww-sheet-empty" style={{ paddingTop: 80 }}>
        <div className="ww-pv-kicker" style={{ marginBottom: 12 }}>{s.genre}</div>
        <b>{s.title} is a placeholder series</b>
        <p>In this prototype the full narrative, visual-development and production data lives with
          <b style={{ color: 'var(--ink)' }}> Echo's Location</b>. Switch back to it from the series menu to explore the workbench in depth, or open the catalogue to configure {s.title}.</p>
        <button className="ww-btn ghost" onClick={onManage}>← Back to all series</button>
      </div>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);