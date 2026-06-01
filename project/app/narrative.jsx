// narrative.jsx — Narrative workspace: character bible, arc board, beat sheet, script.

const NARR_TABS = [
{ id: 'cast', label: 'Characters', glyph: '☺' },
{ id: 'arcs', label: 'Seasons', glyph: '⤳' },
{ id: 'beats', label: 'Storyboard', glyph: '≡' },
{ id: 'script', label: 'Script', glyph: '¶' }];


function charAvatar(tint) {return { background: `radial-gradient(78% 78% at 50% 28%, oklch(0.55 0.14 ${tint}), #0a0c12 78%)` };}
function storyPanels(panels) {return panels.filter((p) => p.scene !== 'parallax_demo');}

function Narrative({ panels, setPanels, episode, tab, setTab, onGoVisual }) {
  const counts = {
    cast: window.CHARACTERS.length, arcs: window.ARCS.length,
    beats: storyPanels(panels).length, script: storyPanels(panels).length
  };
  return (
    <div className="ww-narr">
      <div className="ww-subtabs">
        {NARR_TABS.map((t) =>
        <button key={t.id} className={cx('ww-subtab', tab === t.id && 'is-on')} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 14 }}>{t.glyph}</span>{t.label}
            <span className="ww-subtab-c">{counts[t.id]}</span>
          </button>
        )}
      </div>
      <div className="ww-narr-body">
        {tab === 'cast' && <Bible onGoVisual={onGoVisual} />}
        {tab === 'arcs' && <ArcBoard />}
        {tab === 'beats' && <BeatSheet panels={panels} setPanels={setPanels} episode={episode} />}
        {tab === 'script' && <ScriptEditor panels={panels} setPanels={setPanels} episode={episode} />}
      </div>
    </div>);

}

// ---------- Characters / bible ----------
function Bible({ onGoVisual }) {
  const chars = window.CHARACTERS;
  const [selId, setSelId] = React.useState(chars[0].id);
  const [appe, setAppe] = React.useState({});
  const c = chars.find((x) => x.id === selId);
  const b = window.BIBLE[selId] || {};
  const appearance = appe[selId] != null ? appe[selId] : b.appearance || '';
  const relOf = (id) => chars.find((x) => x.id === id);

  return (
    <div className="ww-bible">
      <div className="ww-bible-roster">
        <div className="ww-insp-sub" style={{ padding: '0 6px 8px' }}>Roster · {chars.length}</div>
        {chars.map((x) =>
        <button key={x.id} className={cx('ww-rostercard', x.id === selId && 'is-sel')} onClick={() => setSelId(x.id)}>
            <div className="ww-roster-av" style={charAvatar(x.tint)}><span>{x.name[0]}</span></div>
            <div className="ww-roster-meta"><b>{x.name}</b><span>{x.role}</span></div>
            <StateDot state={x.state} />
          </button>
        )}
      </div>

      <div className="ww-bible-profile">
        <div className="ww-bp-hero">
          <div className="ww-bp-av" style={charAvatar(c.tint)}><span>{c.name[0]}</span></div>
          <div className="ww-bp-h">
            <h1>{c.name}</h1>
            <div className="ww-bp-role" data-comment-anchor="3949c935fd-div-64-13">{c.role}</div>
            <div className="ww-bp-desc">{c.desc}</div>
          </div>
        </div>

        <div className="ww-bp-appear">
          <div className="ww-bp-appear-head">
            <div className="ww-insp-sub" style={{ margin: 0 }}>Appearance</div>
            <span className="ww-bp-feeds">◎ feeds Visual Dev</span>
          </div>
          <textarea className="ww-bp-appear-field" rows={3} value={appearance}
            placeholder="Describe them physically — age, build, distinguishing features, wardrobe, palette cues…"
            onChange={(e) => setAppe((a) => ({ ...a, [selId]: e.target.value }))} />
          <button className="ww-bp-appear-link" onClick={() => onGoVisual && onGoVisual(selId)}>{`Develop ${c.name.split(' ')[0]}’s look in Visual Dev →`}</button>
        </div>

        <div className="ww-bp-grid">
          <div className="ww-bp-cell"><div className="ww-insp-sub">Wants</div><p>{b.wants}</p></div>
          <div className="ww-bp-cell"><div className="ww-insp-sub">Flaw</div><p>{b.flaw}</p></div>
          <div className="ww-bp-cell"><div className="ww-insp-sub">Voice</div><p>{b.voice}</p></div>
          <div className="ww-bp-cell"><div className="ww-insp-sub">Secret</div><p>{b.secret}</p></div>
        </div>

        <div className="ww-insp-sub">Season arc</div>
        <div className="ww-bp-arc">
          <div className="ww-bp-arc-track">
            <span>{(b.arc || '').split('→')[0]}</span><i />
            <span style={{ color: 'var(--accent)' }}>{(b.arc || '').split('→').slice(-1)[0]}</span>
          </div>
        </div>

        {b.rels && b.rels.length > 0 &&
        <React.Fragment>
            <div className="ww-insp-sub">Relationships</div>
            <div className="ww-bp-rels">
              {b.rels.map(([to, label], i) => {
              const r = relOf(to);if (!r) return null;
              return (
                <button key={i} className="ww-bp-rel" onClick={() => setSelId(to)}>
                    <div className="ww-bp-rel-av" style={charAvatar(r.tint)}>{r.name[0]}</div>
                    <div><b>{r.name}</b><span>{c.name.split(' ')[0]} {label} {r.name.split(' ')[0]}</span></div>
                    <span className="ww-bp-rel-arrow">→</span>
                  </button>);

            })}
            </div>
          </React.Fragment>
        }
      </div>
    </div>);

}

// ---------- Arc board (editable: add episodes / throughlines, edit cells) ----------
function ArcBoard() {
  const season = window.SEASONS.find((s) => s.id === 's1');
  const [eps, setEps] = React.useState(() => season.episodes.map((e) => ({ id: e.id, n: e.n, title: e.title })));
  const [arcs, setArcs] = React.useState(() => window.ARCS.map((a) => ({ id: a.id, label: a.label, desc: a.desc, hue: a.hue, beats: { ...a.beats } })));
  const [edit, setEdit] = React.useState(null);
  const isEd = (kind, arcId, epId) => edit && edit.kind === kind && edit.arcId === arcId && edit.epId === epId;
  const cols = { gridTemplateColumns: `200px repeat(${eps.length}, minmax(134px, 1fr))` };

  const setCell = (arcId, epId, v) => setArcs((as) => as.map((a) => a.id === arcId ? { ...a, beats: { ...a.beats, [epId]: v } } : a));
  const setArcField = (arcId, k, v) => setArcs((as) => as.map((a) => a.id === arcId ? { ...a, [k]: v } : a));
  const setEpTitle = (epId, v) => setEps((es) => es.map((e) => e.id === epId ? { ...e, title: v } : e));
  function addEpisode() { setEps((es) => [...es, { id: 'epx' + Math.random().toString(36).slice(2, 5), n: es.length + 1, title: 'New episode' }]); }
  function addArc() {
    const hues = [200, 285, 150, 25, 320, 95, 60];
    setArcs((as) => [...as, { id: 'arcx' + Math.random().toString(36).slice(2, 5), label: 'New throughline', desc: 'What this thread is about.', hue: hues[as.length % hues.length], beats: {} }]);
  }
  const commit = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEdit(null); } if (e.key === 'Escape') setEdit(null); };

  return (
    <div className="ww-arcboard">
      <div className="ww-pv-kicker">Season 1 · Counting Heads</div>
      <p className="ww-arcboard-intro"><b>Click any cell, throughline label, or episode title to edit it.</b> Read down a column for one episode, across a row for one arc — use the buttons to extend the season.</p>
      <div className="ww-arc-toolbar">
        <button className="ww-arc-add" onClick={addEpisode}>＋ Episode</button>
        <button className="ww-arc-add" onClick={addArc}>＋ Throughline</button>
      </div>
      <div className="ww-arcgrid">
        <div className="ww-arcgrid-head" style={cols}>
          <div>Throughline</div>
          {eps.map((e) =>
          <div key={e.id} className="ww-arc-ephead" onClick={() => !isEd('ep', undefined, e.id) && setEdit({ kind: 'ep', epId: e.id })}>
              Ep {String(e.n).padStart(2, '0')}
              {isEd('ep', undefined, e.id) ?
            <input autoFocus className="ww-arc-edit strong" value={e.title} onChange={(ev) => setEpTitle(e.id, ev.target.value)} onBlur={() => setEdit(null)} onKeyDown={commit} /> :
            <b>{e.title}</b>}
            </div>
          )}
        </div>
        {arcs.map((a) =>
        <div key={a.id} className="ww-arcrow" style={{ ...cols, '--h': a.hue + 'deg' }}>
            <div className="ww-arc-label">
              {isEd('label', a.id) ?
            <input autoFocus className="ww-arc-edit strong" value={a.label} onChange={(e) => setArcField(a.id, 'label', e.target.value)} onBlur={() => setEdit(null)} onKeyDown={commit} /> :
            <b onClick={() => setEdit({ kind: 'label', arcId: a.id })}>{a.label}</b>}
              {isEd('desc', a.id) ?
            <textarea autoFocus className="ww-arc-edit" rows={3} value={a.desc} onChange={(e) => setArcField(a.id, 'desc', e.target.value)} onBlur={() => setEdit(null)} onKeyDown={commit} /> :
            <span onClick={() => setEdit({ kind: 'desc', arcId: a.id })}>{a.desc}</span>}
            </div>
            {eps.map((e) => {
            const txt = a.beats[e.id];
            const empty = !txt || txt === '—';
            const ed = isEd('cell', a.id, e.id);
            return (
              <div key={e.id} className={cx('ww-arc-cell', empty && !ed && 'is-empty')} style={{ '--h': a.hue + 'deg' }}
              onClick={() => !ed && setEdit({ kind: 'cell', arcId: a.id, epId: e.id })}>
                  {ed ?
                <textarea autoFocus className="ww-arc-edit" rows={3} placeholder="Beat…" value={txt === '—' ? '' : txt || ''} onChange={(ev) => setCell(a.id, e.id, ev.target.value)} onBlur={() => setEdit(null)} onKeyDown={commit} /> :
                empty ? '＋' : txt}
                </div>);

          })}
          </div>
        )}
      </div>
    </div>);

}

// ---------- Beat sheet ----------
const TENSION = { Establishing: 2, 'Cold open': 3, Worldbuild: 3, Turn: 5, Inciting: 5, Discovery: 6, Escalation: 8, Crisis: 9, Lifeline: 7, Silence: 5, Rescue: 8, Resolution: 3 };
function actOf(i, total) {return i < Math.ceil(total * 0.3) ? 0 : i < Math.ceil(total * 0.72) ? 1 : 2;}
const ACTS = ['Act I · Setup', 'Act II · Confrontation', 'Act III · Resolution'];

function BeatSheet({ panels, setPanels, episode }) {
  const beats = storyPanels(panels);
  const [sel, setSel] = React.useState(beats[0] && beats[0].id);
  const grouped = [[], [], []];
  beats.forEach((b, i) => grouped[actOf(i, beats.length)].push(b));
  const fxTotal = beats.reduce((n, b) => n + b.fx.filter((f) => f.on).length, 0);

  function rebuild(story) {const demo = panels.filter((p) => p.scene === 'parallax_demo');setPanels([...demo, ...story.map((p, i) => ({ ...p, n: i + 1 }))]);}
  function mkPanel() {return { id: 'p' + Math.random().toString(36).slice(2, 6), n: 0, slug: 'NEW PANEL', scene: 'tunnels', beat: 'Draft', dur: '3.0s', caption: 'Untitled beat.', layers: [{ name: 'Background', depth: 0.2 }], fx: [window.mkFx('reveal')] };}
  function move(id, dir) {const s = beats.slice();const i = s.findIndex((p) => p.id === id);const j = i + dir;if (j < 0 || j >= s.length) return;[s[i], s[j]] = [s[j], s[i]];rebuild(s);}
  function insertAfter(id) {const s = beats.slice();const i = s.findIndex((p) => p.id === id);const np = mkPanel();s.splice(i + 1, 0, np);rebuild(s);setSel(np.id);}
  function del(id) {const s = beats.slice();const i = s.findIndex((p) => p.id === id);s.splice(i, 1);rebuild(s);if (sel === id) setSel((s[i] || s[i - 1] || {}).id);}
  function append() {const s = beats.slice();const np = mkPanel();s.push(np);rebuild(s);setSel(np.id);}

  // tension polyline
  const pts = beats.map((b, i) => {
    const x = beats.length > 1 ? i / (beats.length - 1) * 100 : 50;
    const t = TENSION[b.beat] != null ? TENSION[b.beat] : 5;
    const y = 92 - t / 9 * 84;
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');

  return (
    <div className="ww-beats">
      <div className="ww-beats-main">
        <div className="ww-beats-head">
          <h2>Ep 01 — {episode.title}</h2>
          <span>{beats.length} beats · {episode.genre}</span>
        </div>
        {grouped.map((g, ai) => g.length > 0 &&
        <div key={ai} className="ww-act">
            <div className="ww-act-h"><b>{ACTS[ai]}</b><i /></div>
            {g.map((b) =>
          <div key={b.id} className={cx('ww-beatcard', b.id === sel && 'is-sel')} onClick={() => setSel(b.id)}>
                <div className="ww-beatcard-n">{String(b.n).padStart(2, '0')}</div>
                <div className="ww-beatcard-mini"><Scene kind={b.scene} /></div>
                <div className="ww-beatcard-body">
                  <b>{b.slug}</b>
                  <p>{b.dialogue ? <em>{b.speaker}: {b.dialogue}</em> : b.caption}</p>
                </div>
                <div className="ww-beatcard-side">
                  <span className="ww-beatcard-tag">{b.beat}</span>
                  <span className="ww-beatcard-tag">{b.dur}</span>
                  <div className="ww-beatcard-ops">
                    <button title="Move up" onClick={(e) => {e.stopPropagation();move(b.id, -1);}}>▴</button>
                    <button title="Move down" onClick={(e) => {e.stopPropagation();move(b.id, 1);}}>▾</button>
                    <button title="Insert panel after" onClick={(e) => {e.stopPropagation();insertAfter(b.id);}}>＋</button>
                    <button className="del" title="Delete panel" onClick={(e) => {e.stopPropagation();del(b.id);}}>✕</button>
                  </div>
                </div>
              </div>
          )}
          </div>
        )}
        <button className="ww-addbeat" onClick={append}>＋ Add panel at end</button>
      </div>

      <div className="ww-beats-side">
        <div className="ww-tension">
          <div className="ww-insp-sub">Tension curve</div>
          <div className="ww-tension-chart">
            <div className="ww-tension-grid"><i /><i /><i /><i /></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 8, width: 'calc(100% - 16px)', height: 'calc(100% - 16px)' }}>
              <path d={path + ' L100 100 L0 100 Z'} fill="url(#tg)" opacity="0.25" />
              <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.4" fill={beats[i].id === sel ? 'var(--accent2)' : 'var(--accent)'} vectorEffect="non-scaling-stroke" />)}
              <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="transparent" /></linearGradient></defs>
            </svg>
          </div>
        </div>
        <div className="ww-insp-sub">At a glance</div>
        <div className="ww-beats-stats">
          <div className="ww-beats-stat"><span>Beats</span><b>{beats.length}</b></div>
          <div className="ww-beats-stat"><span>Peak</span><b>Crisis · Ep 08</b></div>
          <div className="ww-beats-stat"><span>Effects wired</span><b>{fxTotal}</b></div>
          <div className="ww-beats-stat"><span>Dialogue beats</span><b>{beats.filter((b) => b.dialogue).length}</b></div>
          <div className="ww-beats-stat"><span>Runtime</span><b>~{beats.reduce((n, b) => n + (parseFloat(b.dur) || 0), 0).toFixed(0)}s</b></div>
        </div>
      </div>
    </div>);

}

// ---------- Script editor ----------
const SCRIPT_SCENES = ['dusk_skyline','street_phone','lanternwrights','night_lockdown','lantern_hub','logbook','mosquito','tunnels','echo_call','locked_hatch','rescue','aftermath'];
const SCRIPT_BEATS  = ['Establishing','Cold open','Worldbuild','Turn','Inciting','Discovery','Escalation','Crisis','Lifeline','Silence','Rescue','Resolution','Draft'];

function ScriptEditor({ panels, setPanels, episode }) {
  const beats = storyPanels(panels);
  const upd = (id, patch) => setPanels(panels.map((p) => p.id === id ? { ...p, ...patch } : p));
  const SPEAKERS = [...window.CHARACTERS.map((c) => c.name.toUpperCase()), 'NARRATOR'];
  const DELIVERY = ['Spoken', 'Shouted', 'Whispered', 'Thought', 'Voice-over', 'Off-screen', 'Sung'];

  function mkPanel() {
    return { id: 'p' + Math.random().toString(36).slice(2, 6), n: 0, slug: 'NEW PANEL', scene: 'tunnels', beat: 'Draft', dur: '3.0s', caption: '', layers: [{ name: 'Background', depth: 0.2 }], fx: [window.mkFx('reveal')] };
  }
  function rebuild(story) {
    const demo = panels.filter((p) => p.scene === 'parallax_demo');
    setPanels([...demo, ...story.map((p, i) => ({ ...p, n: i + 1 }))]);
  }
  function insertAfter(id) {
    const s = beats.slice();
    const i = s.findIndex((p) => p.id === id);
    const np = mkPanel();
    s.splice(i + 1, 0, np);
    rebuild(s);
  }
  function del(id) { rebuild(beats.filter((p) => p.id !== id)); }
  function append() { rebuild([...beats, mkPanel()]); }

  return (
    <div className="ww-script">
      <div className="ww-script-head">
        <div className="ww-pv-kicker">Panel-by-panel script</div>
        <h2>{episode.series} — Ep 01</h2>
        <span>"{episode.title}" · {beats.length} panels</span>
      </div>
      {beats.map((p) => {
        const pace = p.fx.find((f) => f.type === 'pacing' && f.on);
        return (
          <div key={p.id} className="ww-spanel">
            <div className="ww-spanel-bar">
              <span className="ww-spanel-n">{String(p.n).padStart(2, '0')}</span>
              <input className="ww-spanel-slug" value={p.slug} onChange={(e) => upd(p.id, { slug: e.target.value })} />
              <select className="ww-spanel-sel" value={p.beat} onChange={(e) => upd(p.id, { beat: e.target.value })}>
                {SCRIPT_BEATS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <select className="ww-spanel-sel ww-spanel-scene" value={p.scene} onChange={(e) => upd(p.id, { scene: e.target.value })}>
                {SCRIPT_SCENES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <span className="ww-spanel-dur">{p.dur}</span>
              <div className="ww-spanel-ops">
                <button title="Insert panel after" onClick={() => insertAfter(p.id)}>＋</button>
                <button className="del" title="Delete panel" onClick={() => del(p.id)}>✕</button>
              </div>
            </div>
            <div className="ww-spanel-body">
              <div className="ww-spanel-mini">
                <Scene kind={p.scene} />
                <div className="ww-pcard-fx">{p.fx.filter((f) => f.on).map((f) => <FxChip key={f.id} type={f.type} on small />)}</div>
              </div>
              <div className="ww-spanel-fields">
                <div className="ww-sfield">
                  <label>Narration</label>
                  <textarea className="ww-sfield-narr" rows={2} value={p.caption || ''} placeholder="Caption / narration over this panel…" onChange={(e) => upd(p.id, { caption: e.target.value })} />
                </div>
                {p.dialogue != null &&
                <div className="ww-sfield">
                    <div className="ww-dlg-controls">
                      <select className="ww-dlg-speaker" value={p.speaker || ''} onChange={(e) => upd(p.id, { speaker: e.target.value })}>
                        <option value="" disabled>Speaker…</option>
                        {SPEAKERS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="ww-dlg-delivery" value={p.delivery || 'Spoken'} onChange={(e) => upd(p.id, { delivery: e.target.value })}>
                        {DELIVERY.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <textarea className={cx('ww-sfield-dlg', 'is-' + (p.delivery || 'Spoken').toLowerCase().replace(/[^a-z]/g, ''))} rows={2} value={p.dialogue || ''} placeholder="Dialogue…" onChange={(e) => upd(p.id, { dialogue: e.target.value })} />
                  </div>
                }
                <div className="ww-spanel-pacing">
                  {pace ? <span className="ww-pace-pill">⏸ {pace.params.Mode} · {pace.params.Length}s</span> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>no pacing hold</span>}
                  {!p.dialogue && <button className="ww-varcard-dupe" onClick={() => upd(p.id, { dialogue: '', speaker: 'NEELAI', delivery: 'Spoken' })}>＋ Add dialogue</button>}
                  {p.dialogue != null && <button className="ww-varcard-dupe" style={{ color: 'var(--ink3)' }} onClick={() => upd(p.id, { dialogue: undefined, speaker: undefined, delivery: undefined })}>✕ Remove dialogue</button>}
                </div>
              </div>
            </div>
          </div>);
      })}
      <button className="ww-addbeat" onClick={append}>＋ Add panel at end</button>
    </div>);
}

Object.assign(window, { Narrative });