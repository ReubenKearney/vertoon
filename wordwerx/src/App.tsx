import React from 'react';
import { cx } from './ui';
import { mkFx } from './data';
import { SERIES } from './world';
import { getSeriesContent } from './series-data';
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
import { getBalance } from './services/runpod';
import { getState, patchState, setLink as apiSetLink, getCatalogue, putCatalogue, type StoreLinks } from './services/store';
import { useHistory, type ContentSnapshot } from './use-history';
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
  // Editable content is namespaced per series, lazily seeded from the registry
  // (Echo gets its full seed; every other series starts blank).
  const [panelsBySeries, setPanelsBySeries] = React.useState<Record<string, any[]>>(() => ({ echo: getSeriesContent('echo').panels }));
  const [libraryBySeries, setLibraryBySeries] = React.useState<Record<string, any[]>>(() => ({ echo: getSeriesContent('echo').library }));
  const [charactersBySeries, setCharactersBySeries] = React.useState<Record<string, any[]>>(() => ({ echo: getSeriesContent('echo').characters }));
  const [bibleBySeries, setBibleBySeries] = React.useState<Record<string, any>>(() => ({ echo: getSeriesContent('echo').bible }));
  const [seasonsBySeries, setSeasonsBySeries] = React.useState<Record<string, any[]>>(() => ({ echo: getSeriesContent('echo').seasons }));
  const [arcsBySeries, setArcsBySeries] = React.useState<Record<string, any[]>>(() => ({ echo: getSeriesContent('echo').arcs }));
  const [catalogueReady, setCatalogueReady] = React.useState(false);
  const [selId, setSelId] = React.useState<string | null>(() => getSeriesContent('echo').panels[5]?.id ?? null);
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

  // Resolve the active series' content + editable arrays (seeded from the registry).
  const activeObj = series.find(s => s.id === activeSeries) || series[0];
  const content = React.useMemo(() => getSeriesContent(activeSeries, activeObj), [activeSeries, activeObj]);
  const panels = panelsBySeries[activeSeries] ?? content.panels;
  const library = libraryBySeries[activeSeries] ?? content.library;
  const characters = charactersBySeries[activeSeries] ?? content.characters;
  const bible = bibleBySeries[activeSeries] ?? content.bible;
  const seasons = seasonsBySeries[activeSeries] ?? content.seasons;
  const arcs = arcsBySeries[activeSeries] ?? content.arcs;
  // Episode metadata follows the Seasons board: renaming the first episode there
  // names what Script / Story / Preview / Publish are shipping.
  const ep0Title = (seasons || [])[0]?.episodes?.[0]?.title;
  const episode = React.useMemo(
    () => (ep0Title ? { ...content.episode, title: ep0Title } : content.episode),
    [content, ep0Title],
  );

  // Series-scoped setters that accept a value or an updater fn, writing back to
  // the active series' slot (seeding from the registry on first edit).
  const setPanels = (u: any) => setPanelsBySeries(m => ({ ...m, [activeSeries]: typeof u === 'function' ? u(m[activeSeries] ?? content.panels) : u }));
  const setLibrary = (u: any) => setLibraryBySeries(m => ({ ...m, [activeSeries]: typeof u === 'function' ? u(m[activeSeries] ?? content.library) : u }));
  const setCharacters = (u: any) => setCharactersBySeries(m => ({ ...m, [activeSeries]: typeof u === 'function' ? u(m[activeSeries] ?? content.characters) : u }));
  const setSeasons = (u: any) => setSeasonsBySeries(m => ({ ...m, [activeSeries]: typeof u === 'function' ? u(m[activeSeries] ?? content.seasons) : u }));
  const setArcs = (u: any) => setArcsBySeries(m => ({ ...m, [activeSeries]: typeof u === 'function' ? u(m[activeSeries] ?? content.arcs) : u }));

  // Undo/redo over the per-series editable content (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y).
  // Restoring writes through the series-scoped maps, so the debounced autosave
  // below persists the restored state like any other edit.
  const historySnapshot = React.useMemo<ContentSnapshot>(
    () => ({ panels, library, characters, bible, seasons, arcs }),
    [panels, library, characters, bible, seasons, arcs],
  );
  const restoreSnapshot = React.useCallback((snap: ContentSnapshot) => {
    setPanelsBySeries(m => ({ ...m, [activeSeries]: snap.panels }));
    setLibraryBySeries(m => ({ ...m, [activeSeries]: snap.library }));
    setCharactersBySeries(m => ({ ...m, [activeSeries]: snap.characters }));
    setBibleBySeries(m => ({ ...m, [activeSeries]: snap.bible }));
    setSeasonsBySeries(m => ({ ...m, [activeSeries]: snap.seasons }));
    setArcsBySeries(m => ({ ...m, [activeSeries]: snap.arcs }));
  }, [activeSeries]);
  useHistory(activeSeries, hydrated, historySnapshot, restoreSnapshot);

  // Append a blank character to the active series' cast; returns it so the caller can select it.
  function addCharacter() {
    const c = { id: 'ch' + Math.random().toString(36).slice(2, 6), name: 'New character', role: 'Role · They', tint: Math.floor(Math.random() * 360), desc: '', state: 'Draft' };
    setCharacters((cs: any[]) => [...cs, c]);
    return c;
  }

  // Edit a character's identity fields (name / role / desc) in the active series.
  const updateCharacter = (id: string, patch: any) => setCharacters((cs: any[]) => cs.map((c: any) => c.id === id ? { ...c, ...patch } : c));

  // Edit one bible field (wants / flaw / voice / secret / arc) for a character in
  // the active series, seeding from the registry bible on first edit.
  const updateBible = (charId: string, field: string, value: any) =>
    setBibleBySeries(m => {
      const cur = m[activeSeries] ?? content.bible;
      return { ...m, [activeSeries]: { ...cur, [charId]: { ...(cur[charId] || {}), [field]: value } } };
    });

  // Load the persisted series catalogue on mount. null => first run: seed the
  // store from the built-in SERIES. On failure (offline) keep the in-memory seed
  // and don't persist, so we never clobber a real catalogue with the defaults.
  React.useEffect(() => {
    let cancelled = false;
    getCatalogue()
      .then(cat => {
        if (cancelled) return;
        if (cat && cat.length) setSeries(cat);
        else putCatalogue(SERIES).catch(() => {});
        setCatalogueReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Persist the catalogue whenever it changes (after the initial load), debounced,
  // so a newly created or reordered series survives a reload.
  React.useEffect(() => {
    if (!catalogueReady) return;
    const id = setTimeout(() => { putCatalogue(series).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [series, catalogueReady]);

  // Hydrate persisted state + links for the active series (re-runs on series switch).
  React.useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    getState(activeSeries)
      .then(({ links, state }) => {
        if (cancelled) return;
        setLinks(links);
        setAppearance(state.appearance || {});
        setVisdevExtra(state.visdevExtra || {});
        if (state.library && state.library.length) setLibraryBySeries(m => ({ ...m, [activeSeries]: state.library }));
        if (state.panels && state.panels.length) setPanelsBySeries(m => ({ ...m, [activeSeries]: state.panels }));
        if (state.characters && state.characters.length) setCharactersBySeries(m => ({ ...m, [activeSeries]: state.characters }));
        if (state.bible && Object.keys(state.bible).length) setBibleBySeries(m => ({ ...m, [activeSeries]: state.bible }));
        if (state.seasons && state.seasons.length) setSeasonsBySeries(m => ({ ...m, [activeSeries]: state.seasons }));
        if (state.arcs && state.arcs.length) setArcsBySeries(m => ({ ...m, [activeSeries]: state.arcs }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [activeSeries]);

  // Keep the Compose selection valid when the active series (and its panels) change.
  React.useEffect(() => {
    const ps = panelsBySeries[activeSeries] ?? content.panels;
    setSelId(prev => (ps.some((p: any) => p.id === prev) ? prev : (ps[5]?.id ?? ps[0]?.id ?? null)));
  }, [activeSeries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist a Visual Dev snapshot (variants + locks + image links) for offline reload.
  function persistVisdev(snapshot: any) {
    setVisdevExtra(snapshot);
    patchState(activeSeries, { state: { visdevExtra: snapshot } }).catch(() => {});
  }

  // Persist the active series' editable content (library + panels + cast + bible
  // + seasons/arcs) after hydration, debounced, so a reload restores everything
  // the user authored.
  React.useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => { patchState(activeSeries, { state: { library, panels, characters, bible, seasons, arcs } }).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [library, panels, characters, bible, seasons, arcs, hydrated, activeSeries]);

  // Persist + reflect a link change (character LoRA, canonical, portrait, …) for the active series.
  function updateLink(category: keyof StoreLinks, key: string, value: unknown) {
    setLinks(l => (l ? { ...l, [category]: { ...(l as any)[category], [key]: value } } : l));
    apiSetLink(activeSeries, category, key, value).catch(() => {});
  }
  // Persist + reflect a character's appearance text for the active series.
  function updateAppearance(charId: string, text: string) {
    setAppearance(a => {
      const next = { ...a, [charId]: text };
      patchState(activeSeries, { state: { appearance: next } }).catch(() => {});
      return next;
    });
  }

  const ui = useUIProvider();
  const [navOpen, setNavOpen] = React.useState(true);
  const [balance, setBalance] = React.useState<number | null>(null);
  React.useEffect(() => {
    const load = () => getBalance().then(b => setBalance(b.balance)).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const setSub = (wsId: string, v: string) => setSubs(s => ({ ...s, [wsId]: v }));

  function flash(msg: string) { setToast(msg); clearTimeout(__wwT); __wwT = setTimeout(() => setToast(null), 2600); }
  function nav(item: any) { setWs(item.id); if (item.children && !(open as any)[item.id]) setOpen(o => ({ ...o, [item.id]: true })); }
  // Opening any series now lands in Narrative (every workspace works for every series).
  function openSeries(s: any) { setActiveSeries(s.id); setWs('narrative'); setSub('narrative', 'cast'); }

  function onApply(action: any) {
    if (action.kind === 'pacing') {
      setPanels((ps: any[]) => ps.map((p: any) => ['p9', 'p10'].includes(p.id) && !p.fx.some((f: any) => f.type === 'pacing') ?
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
      <nav className="ww-nav2" style={navOpen ? undefined : { display: 'none' }}>
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
          {balance != null && (
            <span className={cx('ww-nav-credits', balance < 1 && 'is-low')} title={`RunPod credits remaining: $${balance.toFixed(2)}`}>${balance.toFixed(2)}</span>
          )}
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

        {/* role=button (not a real <button>) so the dropdown's <button> items
            aren't nested inside a button — invalid HTML + a hydration error. */}
        <div className={cx('ww-series-switch', seriesMenu && 'is-open')} role="button" tabIndex={0}
          onClick={() => setSeriesMenu(m => !m)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeriesMenu(m => !m); } }}>
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
        </div>

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
        <div className="ww-nav2-foot">
          <button className="ww-nav-collapse" title="Hide menu" onClick={() => setNavOpen(false)}>« Hide menu</button>
        </div>
      </nav>

      {/* MAIN */}
      <div className="ww-main">
        <div className={cx('ww-stagewrap', showCop && 'has-cop')}>
          <main className="ww-stage">
            {ws === 'series' && <Series series={series} setSeries={setSeries} activeId={activeSeries} setActive={setActiveSeries} onOpen={openSeries} characters={characters} flash={flash} />}
            {/* LoRA manager is cross-series — render it for any active series. */}
            {ws === 'visual' && (subs as any).visual === 'loras' && <LoraManager key={activeSeries} characters={characters} flash={flash} updateLink={updateLink} />}
            {ws === 'narrative' && <Narrative key={activeSeries} characters={characters} setCharacters={setCharacters} addCharacter={addCharacter} updateCharacter={updateCharacter} seasons={seasons} setSeasons={setSeasons} arcs={arcs} setArcs={setArcs} bible={bible} updateBible={updateBible} panels={panels} setPanels={setPanels} episode={episode} tab={(subs as any).narrative} setTab={(v: string) => setSub('narrative', v)} onGoVisual={(id: string) => { setWs('visual'); setSub('visual', 'board'); setVisualSelId(id || null); }} online={online} links={links} appearance={appearance} updateAppearance={updateAppearance} updateLink={updateLink} flash={flash} />}
            {ws === 'visual' && (subs as any).visual !== 'loras' && <VisualDev key={activeSeries} visdevSeed={content.visdev} bible={bible} characters={characters} tab={(subs as any).visual} setTab={(v: string) => setSub('visual', v)} preselect={visualSelId} flash={flash} online={online} links={links} appearance={appearance} updateLink={updateLink} visdevExtra={visdevExtra} persistVisdev={persistVisdev} hydrated={hydrated} />}
            {ws === 'production' && (
              (subs as any).production === 'story' ? <Story key={activeSeries} panels={panels} episode={episode} canon={(activeObj as any)?.canon || []} arcs={arcs} /> :
              (subs as any).production === 'library' ? <Library library={library} setLibrary={setLibrary} onUseAsset={(a: any) => flash('"' + a.name + '" added to canvas')} online={online} flash={flash} characters={characters} /> :
              (subs as any).production === 'compose' ? <Compose key={activeSeries} panels={panels} setPanels={setPanels} selId={selId} setSelId={setSelId} canvasModel={t.canvasModel} fxUI={t.fxUI} library={library} links={links} updateLink={updateLink} /> :
              (subs as any).production === 'preview' ? <Preview panels={panels} episode={episode} links={links} /> :
              <Publish panels={panels} library={library} links={links} episode={episode} characters={characters} updateLink={updateLink} flash={flash} />
            )}
          </main>
          {showCop && <Copilot stage={copContext} open={copilot} onClose={() => setCopilot(false)} onApply={onApply} episode={episode} seed={activeSeries === 'echo'} />}
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
