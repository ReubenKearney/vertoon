import React from 'react';
import { cx } from './ui';
import { PANELS, LIBRARY, EPISODE, mkFx } from './data';
import { SERIES } from './world';
import { Scene } from './scenes';
import { Copilot } from './copilot';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle } from './tweaks-panel';
import { Compose } from './compose';
import { Preview } from './preview';
import { Library, Story, Publish } from './stages';
import { Series } from './series';
import { Narrative } from './narrative';
import { VisualDev } from './visdev';
import { LoraManager } from './loras';
import { useOnline, canGenerate } from './services/online';
import { getState, patchState, setLink as apiSetLink, type StoreLinks } from './services/store';
import { UIContext, useUIProvider, Lightbox } from './ui-context';

const TWEAK_DEFAULTS = {
  canvasModel: 'filmstrip',
  fxUI: 'inspector',
  accent: '#2563EB',
  grain: true,
  density: 'regular',
};


const NAV = [
  { id: 'series', label: 'Series', glyph: '◈', single: true, children: null },
  { id: 'narrative', label: 'Narrative', glyph: '✎', single: false, children: [
    { id: 'cast', label: 'Characters' }, { id: 'arcs', label: 'Seasons' }, { id: 'beats', label: 'Storyboard' }, { id: 'script', label: 'Script' },
  ]},
  { id: 'visual', label: 'Visual Dev', glyph: '◎', single: false, children: [
    { id: 'board', label: 'Prototype board' }, { id: 'sheets', label: 'Model sheets' }, { id: 'locations', label: 'Locations' }, { id: 'loras', label: 'LoRAs' },
  ]},
  { id: 'production', label: 'Production', glyph: '▦', single: false, children: [
    { id: 'story', label: 'Story' }, { id: 'library', label: 'Library' }, { id: 'compose', label: 'Compose' }, { id: 'preview', label: 'Preview' }, { id: 'publish', label: 'Publish' },
  ]},
];

let __wwT: ReturnType<typeof setTimeout> | undefined;

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [ws, setWs] = React.useState('series');
  const [subs, setSubs] = React.useState({ narrative: 'cast', visual: 'board', production: 'compose' });
  const [open, setOpen] = React.useState({ narrative: true, visual: true, production: true });
  const [series, setSeries] = React.useState(() => SERIES);
  const [activeSeries, setActiveSeries] = React.useState('echo');
  const [seriesMenu, setSeriesMenu] = React.useState(false);
  const [panels, setPanels] = React.useState(() => PANELS);
  const [library, setLibrary] = React.useState(() => LIBRARY);
  const [selId, setSelId] = React.useState(PANELS[5].id);
  const [copilot, setCopilot] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [visualSelId, setVisualSelId] = React.useState<string | null>(null);
  // Offline-first: generation gated by reachability; everything else always works.
  const onlineState = useOnline();
  const online = canGenerate(onlineState);
  const [links, setLinks] = React.useState<StoreLinks | null>(null);
  const [appearance, setAppearance] = React.useState<Record<string, string>>({});
  const [visdevExtra, setVisdevExtra] = React.useState<any>({});
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate persisted state + links from the local store on load.
  React.useEffect(() => {
    getState()
      .then(({ links, state }) => {
        setLinks(links);
        setAppearance(state.appearance || {});
        setVisdevExtra(state.visdevExtra || {});
        if (state.library && state.library.length) setLibrary(state.library);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Persist a Visual Dev snapshot (variants + locks + image links) for offline reload.
  function persistVisdev(snapshot: any) {
    setVisdevExtra(snapshot);
    patchState({ state: { visdevExtra: snapshot } }).catch(() => {});
  }

  // Persist the library (seed + generated) after hydration, debounced.
  React.useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => { patchState({ state: { library } }).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [library, hydrated]);

  // Persist + reflect a link change (character LoRA, canonical, portrait, …).
  function updateLink(category: keyof StoreLinks, key: string, value: unknown) {
    setLinks(l => (l ? { ...l, [category]: { ...(l as any)[category], [key]: value } } : l));
    apiSetLink(category, key, value).catch(() => {});
  }
  // Persist + reflect a character's appearance text.
  function updateAppearance(charId: string, text: string) {
    setAppearance(a => {
      const next = { ...a, [charId]: text };
      patchState({ state: { appearance: next } }).catch(() => {});
      return next;
    });
  }

  const ui = useUIProvider();
  const [navOpen, setNavOpen] = React.useState(true);

  const activeObj = series.find(s => s.id === activeSeries) || series[0];
  const isEcho = activeSeries === 'echo';
  const setSub = (wsId: string, v: string) => setSubs(s => ({ ...s, [wsId]: v }));

  function flash(msg: string) { setToast(msg); clearTimeout(__wwT); __wwT = setTimeout(() => setToast(null), 2600); }
  function nav(item: any) { setWs(item.id); if (item.children && !(open as any)[item.id]) setOpen(o => ({ ...o, [item.id]: true })); }
  function openSeries(s: any) { setActiveSeries(s.id); if (s.id === 'echo') setWs('narrative'); }

  function onApply(action: any) {
    if (action.kind === 'pacing') {
      setPanels(ps => ps.map(p => ['p9', 'p10'].includes(p.id) && !p.fx.some((f: any) => f.type === 'pacing') ?
        { ...p, fx: [...p.fx, mkFx('pacing', { params: { Mode: p.id === 'p9' ? 'Scroll-lock' : 'Hold beat', Length: 2.2 } })] } : p));
      flash('Pacing applied to the crisis sequence');
    } else if (action.kind === 'generate') { flash('Queued 8 character plates'); setWs('production'); setSub('production', 'library'); }
    else if (action.kind === 'beat') flash('Beat inserted into the outline');
    else if (action.kind === 'lock') flash('Lantern Hub locked as canonical');
    else if (action.kind === 'scrim') flash('Caption scrim added in preview');
    else if (action.kind === 'opt') flash('Lazy-loading enabled');
    else flash('Done');
  }

  const accent = t.accent || '#2563EB';
  const rootStyle: React.CSSProperties = {
    '--accent': accent,
    '--accent2': accent.toLowerCase() === '#16d6b4' ? '#7b61ff' : '#16d6b4',
    '--grain-op': t.grain ? 1 : 0,
  } as any;
  const dens = ({ compact: 0.86, regular: 1, comfy: 1.12 } as any)[t.density] || 1;
  const copContext = ws === 'production' ? (subs as any).production : ws;
  const showCop = copilot && ws !== 'series';

  return (
    <UIContext.Provider value={ui.api}>
    <div className={cx('ww-app', 'dens-' + (t.density || 'regular'), !navOpen && 'nav-collapsed')} style={{ ...rootStyle, '--dens': dens } as any}>
      {!navOpen && <button className="ww-nav-reopen" title="Show menu" onClick={() => setNavOpen(true)}>☰</button>}
      {/* NAVIGATOR */}
      <nav className="ww-nav2">
        <button className="ww-nav-collapse" title="Hide menu" onClick={() => setNavOpen(false)}>«</button>
        <div className="ww-nav2-brand">
          <img className="ww-nav-logo-sm" src="/src/assets/brand/wordwerx-logo-dark.svg" alt="WORDWERX" onClick={() => setWs('series')} style={{ cursor: 'pointer' }} />
          <button className={cx('ww-nav-icon-btn', copilot && 'is-on')} title="Sherlock — your story co-pilot" onClick={() => setCopilot(c => !c)}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 13 Q3.5 6 10 5.5 Q16.5 6 16 13" />
              <path d="M3 13 L17 13" />
              <path d="M3.5 13 Q1.5 12.5 1 10.5 Q1.5 8.5 3.5 9.5" />
              <path d="M16.5 13 Q18.5 12.5 19 10.5 Q18.5 8.5 16.5 9.5" />
              <path d="M8 5.5 Q10 3 12 5.5" />
            </svg>
          </button>
          <button className="ww-nav-icon-btn" title="Notifications — click to clear" onClick={ui.clearNotif}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2 C7 3 6 5.5 6 8 L6 13 L4 14 L16 14 L14 13 L14 8 C14 5.5 13 3 10 2 Z" />
              <path d="M8.5 14 Q8.5 16.5 10 16.5 Q11.5 16.5 11.5 14" />
            </svg>
            {(ui.notif.count > 0 || ui.notif.error) && (
              <span className={cx('ww-nav-badge', ui.notif.error && 'is-error')}>{ui.notif.error ? '!' : ui.notif.count}</span>
            )}
          </button>
        </div>

        <button className={cx('ww-series-switch', seriesMenu && 'is-open')} onClick={() => setSeriesMenu(m => !m)}>
          <div className="ww-series-switch-cover"><Scene kind={(activeObj as any).cover} /></div>
          <div className="ww-series-switch-meta"><b>{(activeObj as any).title}</b><span>{(activeObj as any).status}</span></div>
          <span className="ww-series-switch-chev">▾</span>
          {seriesMenu && (
            <div className="ww-series-menu" onClick={e => e.stopPropagation()}>
              {series.map(s => (
                <button key={s.id} className={cx('ww-series-menu-item', s.id === activeSeries && 'is-on')}
                  onClick={() => { setActiveSeries(s.id); setSeriesMenu(false); flash('Switched to ' + s.title); }}>
                  <div className="ww-series-menu-cover"><Scene kind={(s as any).cover} /></div>
                  <b>{s.title}</b>
                  <i style={{ background: `oklch(0.7 0.16 ${(s as any).hue})` }} />
                </button>
              ))}
              <div className="ww-series-menu-foot">
                <button onClick={() => { setWs('series'); setSeriesMenu(false); }}>Manage all series →</button>
              </div>
            </div>
          )}
        </button>

        <div className="ww-nav2-scroll">
          {NAV.map(item => (
            <div key={item.id}>
              <button className={cx('ww-nav2-ws', ws === item.id && 'is-active', item.children && (open as any)[item.id] && 'is-open')} onClick={() => nav(item)}>
                <span className="ww-nav2-ws-g">{item.glyph}</span>
                <span className="ww-nav2-ws-l">{item.label}</span>
                {item.children && <span className="ww-nav2-ws-chev" onClick={e => { e.stopPropagation(); setOpen(o => ({ ...o, [item.id]: !(o as any)[item.id] })); }}>▸</span>}
              </button>
              {item.children && (open as any)[item.id] && (
                <div className="ww-nav2-children">
                  {item.children.map(c => (
                    <button key={c.id} className={cx('ww-nav2-child', ws === item.id && (subs as any)[item.id] === c.id && 'is-on')}
                      onClick={() => { setWs(item.id); setSub(item.id, c.id); }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* MAIN */}
      <div className="ww-main">
        <div className={cx('ww-stagewrap', showCop && 'has-cop')}>
          <main className="ww-stage">
            {ws === 'series' && <Series series={series} setSeries={setSeries} activeId={activeSeries} setActive={setActiveSeries} onOpen={openSeries} flash={flash} />}
            {/* LoRA manager is cross-series — render it for any active series. */}
            {ws === 'visual' && (subs as any).visual === 'loras' && <LoraManager flash={flash} updateLink={updateLink} />}
            {ws !== 'series' && !isEcho && !(ws === 'visual' && (subs as any).visual === 'loras') && <PlaceholderWS s={activeObj} onManage={() => setWs('series')} />}
            {ws === 'narrative' && isEcho && <Narrative panels={panels} setPanels={setPanels} episode={EPISODE} tab={(subs as any).narrative} setTab={(v: string) => setSub('narrative', v)} onGoVisual={(id: string) => { setWs('visual'); setSub('visual', 'board'); setVisualSelId(id || null); }} online={online} links={links} appearance={appearance} updateAppearance={updateAppearance} updateLink={updateLink} flash={flash} />}
            {ws === 'visual' && isEcho && (subs as any).visual !== 'loras' && <VisualDev tab={(subs as any).visual} setTab={(v: string) => setSub('visual', v)} preselect={visualSelId} flash={flash} online={online} links={links} appearance={appearance} updateLink={updateLink} visdevExtra={visdevExtra} persistVisdev={persistVisdev} hydrated={hydrated} />}
            {ws === 'production' && isEcho && (
              (subs as any).production === 'story' ? <Story panels={panels} /> :
              (subs as any).production === 'library' ? <Library library={library} setLibrary={setLibrary} onUseAsset={(a: any) => flash('"' + a.name + '" added to canvas')} online={online} flash={flash} /> :
              (subs as any).production === 'compose' ? <Compose panels={panels} setPanels={setPanels} selId={selId} setSelId={setSelId} canvasModel={t.canvasModel} fxUI={t.fxUI} /> :
              (subs as any).production === 'preview' ? <Preview panels={panels} /> :
              <Publish panels={panels} library={library} links={links} updateLink={updateLink} flash={flash} />
            )}
          </main>
          {showCop && <Copilot stage={copContext} open={copilot} onClose={() => setCopilot(false)} onApply={onApply} episode={EPISODE} />}
        </div>
      </div>

      {toast && <div className="ww-toast">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Canvas — editing model" />
        <TweakRadio label="Layout" value={t.canvasModel} options={['filmstrip', 'board', 'cinema']} onChange={(v: string) => { setTweak('canvasModel', v); setWs('production'); setSub('production', 'compose'); }} />
        <TweakSection label="Effects authoring UI" />
        <TweakRadio label="Inspector style" value={t.fxUI} options={['inspector', 'tracks', 'stage']} onChange={(v: string) => { setTweak('fxUI', v); setWs('production'); setSub('production', 'compose'); }} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={['#2563EB', '#7b61ff', '#16d6b4', '#f3b23c']} onChange={(v: string) => setTweak('accent', v)} />
        <TweakToggle label="Film grain" value={t.grain} onChange={(v: boolean) => setTweak('grain', v)} />
        <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v: string) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
    <Lightbox url={ui.image} onClose={ui.closeImage} />
    </UIContext.Provider>
  );
}

function PlaceholderWS({ s, onManage }: any) {
  return (
    <div className="ww-sheet">
      <div className="ww-sheet-empty" style={{ paddingTop: 80 }}>
        <div className="ww-pv-kicker" style={{ marginBottom: 12 }}>{s.genre}</div>
        <b>{s.title} is a placeholder series</b>
        <p>In this prototype the full narrative, visual-development and production data lives with
          <b style={{ color: 'var(--ink)' }}> Echo's Location</b>. Switch back to it from the series menu to explore the workbench in depth, or open the catalogue to configure {s.title}.</p>
        <button className="ww-btn ghost" onClick={onManage}>← Back to all series</button>
      </div>
    </div>
  );
}
