import React from 'react';
import { cx } from './ui';
import { listLoras, uploadLora, trainLora, generate, pollJob, imageSrc, type Lora } from './services/runpod';
import { txt2imgSDXL, txt2imgFlux } from './workflows';
import { putItem, deleteItem, allItems, putMeta, getMeta, type TrainItem } from './services/trainset';

// LoRA Manager — list, upload existing .safetensors, and train a new LoRA from
// a character's image set. Trained/uploaded LoRAs land on the network volume
// and become selectable everywhere generation happens.
type SeriesLora = { loraName: string; triggerWord?: string; strength?: number };
export function LoraManager({ flash, updateLink, characters, seriesLora, updateSeriesLora, seriesId }: { flash?: (m: string) => void; updateLink?: (cat: any, key: string, value: unknown) => void; characters?: any[]; seriesLora?: SeriesLora; updateSeriesLora?: (v: SeriesLora | null) => void; seriesId?: string }) {
  const [loras, setLoras] = React.useState<Lora[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'library' | 'train'>('train');

  const refresh = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try { setLoras(await listLoras()); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  function note(m: string) { flash ? flash(m) : setErr(null); }

  async function onUpload(file: File) {
    try { const name = await uploadLora(file); note(`Uploaded ${name}`); refresh(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="ww-sheet">
      <div className="ww-sheet-top">
        <div>
          <div className="ww-pv-kicker">Visual Dev · LoRAs</div>
          <h2>
            Style &amp; character models
            {seriesLora?.loraName && <span className="ww-sheet-unlocktag" style={{ marginLeft: 10 }} title="Applied under every character LoRA in this series">◆ {seriesLora.loraName.replace('.safetensors', '')}</span>}
          </h2>
          <p>Train a series-style or character LoRA, or upload an existing .safetensors. Trained LoRAs land on the network volume and become selectable everywhere generation happens.</p>
        </div>
        <UploadButton onPick={onUpload} />
      </div>

      <div className="ww-filters" style={{ marginBottom: 18 }}>
        <button className={cx('ww-filter', tab === 'train' && 'is-on')} onClick={() => setTab('train')}>Train new</button>
        <button className={cx('ww-filter', tab === 'library' && 'is-on')} onClick={() => setTab('library')}>Library</button>
      </div>

      {err && <div className="ww-toast" style={{ position: 'static', margin: '0 0 16px', color: '#ff7a6a' }}>{err}</div>}

      {tab === 'library' && (
        loading ? <p style={{ opacity: 0.7 }}>Loading LoRAs…</p> : loras.length === 0 ? (
          <div className="ww-sheet-empty"><b>No LoRAs yet</b><p>Upload a .safetensors or train one — they land on the network volume and become selectable everywhere generation happens.</p></div>
        ) : (
          <div className="ww-libgrid">
            {loras.map(l => {
              const isSeries = seriesLora?.loraName === l.name;
              return (
                <div key={l.name} className={cx('ww-loracard', isSeries && 'is-series')}>
                  <div className="ww-loracard-art" style={{ background: 'radial-gradient(80% 80% at 50% 30%, oklch(0.5 0.13 285), #0a0c12 80%)' }}>
                    {isSeries && <span className="ww-varcard-lock">◆ series style</span>}
                  </div>
                  <div className="ww-loracard-meta">
                    <b title={l.name}>{l.name.replace('.safetensors', '')}</b>
                    <span>{(l.size / 1e6).toFixed(1)} MB · .safetensors</span>
                  </div>
                  {updateSeriesLora && (
                    <button className={cx('ww-filter', isSeries && 'is-on')} style={{ margin: 'auto 12px 12px' }}
                      title={isSeries ? 'Stop using this as the series style LoRA' : 'Apply this LoRA under every character LoRA in this series'}
                      onClick={() => isSeries ? updateSeriesLora(null) : updateSeriesLora({ loraName: l.name, triggerWord: l.name.replace('.safetensors', ''), strength: 0.65 })}>
                      {isSeries ? '◆ Unset series style' : '◇ Set as series style'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'train' && <TrainPanel characters={characters} updateLink={updateLink} seriesLora={seriesLora} updateSeriesLora={updateSeriesLora} seriesId={seriesId ?? 'default'} onDone={(m) => { note(m); refresh(); setTab('library'); }} onError={setErr} />}
    </div>
  );
}

function UploadButton({ onPick }: { onPick: (f: File) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="ww-gen-btn" onClick={() => ref.current?.click()}>⤓ Upload .safetensors</button>
      <input ref={ref} type="file" accept=".safetensors" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
    </>
  );
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

// ── Series-style training-set builder ────────────────────────────────────────
// A style LoRA learns whatever is CONSTANT across its dataset, so the house-style
// prompt is fixed and the SCENE + LIGHTING vary per row (day/night, in/out,
// architecture/figure/prop). No plain backgrounds — variety is the whole point.
type SceneRow = { id: string; on: boolean; scene: string; place: 'Ext' | 'Int' | '—'; light: string; count: number };

// The constant the LoRA learns: look only — no lighting, no scene, no panel/gutter
// words (those would teach the LoRA to draw multi-panel comic pages).
const HOUSE_STYLE_DEFAULT = 'semi-realistic premium webtoon illustration, believable anatomy and natural proportions, naturalistic facial rendering, realistic spatial depth, crisp hand-inked line art, dense fine-line etching, delicate cross-hatching, intricate ornamental detail, botanical Art Nouveau ornamentation, ornate filigree, elegant flowing linework, solarpunk visual language, handcrafted organic infrastructure, refined fantasy utility design, practical ornate craftsmanship, realistic material textures, stained-glass colour diffusion, warm earth tones, moss-green accents, brass and recycled-metal highlights, iridescent bioplastic sheen, soft atmospheric perspective, layered depth, high detail without visual clutter, clean sharp outlines balanced with painterly shading, realistic but stylised graphic-novel finish';

// The "no X" terms belong here, not in the positive prompt (where the model still draws X).
const SDXL_NEG = 'neon cyberpunk lighting, pitch-black void shadows, flat anime cel shading, comic panel borders, multiple panels, gutters, speech bubbles, text, watermark, lowres, bad anatomy, extra limbs, blurry';

// One small library of lighting clauses (the per-row "Time & light" values) — not
// N full style prompts. 1 house style × these × the scene rows = full coverage.
const LIGHT_PRESETS = [
  'early dawn, low warm directional sun, long soft shadows',
  'midday sun through canopy and glass, dappled light, solar-glow glaze',
  'golden-hour sunlight, warm rim light, glowing air',
  'soft overcast daylight, diffuse even light, muted warmth',
  'dusk, cool blue-violet ambient with warm lamp accents',
  'night, moonlight with warm bioluminescent and lamp glow',
  'interior, sunlight through stained glass, coloured light pools',
  'interior, low ambient of engineered bio-tech and algae-battery glow',
];

// Scenes drawn from the series world (Dharti): its five megacities and their
// signature architecture, the Locus, and the wick-lamp tech. Setting/subject
// only — the look lives in the house style above; lighting varies per row.
const STARTER_ROWS: SceneRow[] = [
  // Sulawesi — the only fully-on-land megacity, kept safe by the resin wick-lamp network (Arc 1)
  { id: 'r1', on: true, scene: 'Sulawesi street at night lined with resin-fuelled downward-flame wick lamps casting pools of light on the ground, no insects, wide establishing shot, no people', place: 'Ext', light: 'night, moonlight with warm bioluminescent and lamp glow', count: 6 },
  { id: 'r2', on: true, scene: 'a Guild lamplighter on nightly rounds, single robed figure tending a street wick-lamp, mid-shot', place: 'Ext', light: 'night, moonlight with warm bioluminescent and lamp glow', count: 5 },
  { id: 'r3', on: true, scene: 'dense fully-on-land geothermal megacity by day, low-rise lamp-lined rooftops and venting steam, establishing shot', place: 'Ext', light: 'midday sun through canopy and glass, dappled light, solar-glow glaze', count: 5 },
  // Bandarpur — shoal megacity on Adam's Bridge: rings, tidal-throat gateworks, underwater hull (Arc 2)
  { id: 'r4', on: true, scene: 'Bandarpur tidal-throat gateworks, heavy turbine galleries and a navigation aperture over a deep sea channel, architecture only', place: 'Ext', light: 'soft overcast daylight, diffuse even light, muted warmth', count: 5 },
  { id: 'r5', on: true, scene: 'a circular harbour borough seen from above, inhabited breakwater ring around a calm inner-lagoon market commons, wide establishing shot', place: 'Ext', light: 'golden-hour sunlight, warm rim light, glowing air', count: 5 },
  { id: 'r6', on: true, scene: 'underwater hull district interior, habitable blocks around a glowing light well with a continuous waterline glazing band, lone figure in wide shot', place: 'Int', light: 'interior, low ambient of engineered bio-tech and algae-battery glow', count: 5 },
  { id: 'r7', on: true, scene: 'stepped arcology mega tower rising over the shoal city, ring vestibules and sealed transfer lobbies, establishing shot', place: 'Ext', light: 'dusk, cool blue-violet ambient with warm lamp accents', count: 4 },
  // Mara — highland city in the cliffs of Mt Kenya, lit by the Crown Lantern (Arc 4)
  { id: 'r8', on: true, scene: 'Mara highland city embedded into the cliff faces of Mt Kenya, dwellings stepped into the mountainside, establishing shot', place: 'Ext', light: 'golden-hour sunlight, warm rim light, glowing air', count: 5 },
  { id: 'r9', on: true, scene: 'the Crown Lantern summit megastructure capping the mountain as the citywide light source, dramatic wide establishing shot', place: 'Ext', light: 'dusk, cool blue-violet ambient with warm lamp accents', count: 5 },
  { id: 'r10', on: true, scene: 'a district lightwell interior, sealed guided-light gallery with diffusion surfaces washing even daylight into a courtyard, architecture only', place: 'Int', light: 'interior, sunlight through stained glass, coloured light pools', count: 5 },
  // Xingu — city raised above the Amazon canopy on a single megaflora organism (Arc 3)
  { id: 'r11', on: true, scene: 'Xingu megaflora city raised above the Amazon canopy, giant orange ginkgo hub trees with engineered bio-ceramic platforms and ring transit loops, establishing shot', place: 'Ext', light: 'midday sun through canopy and glass, dappled light, solar-glow glaze', count: 6 },
  { id: 'r12', on: true, scene: 'the central Mother Tree towering through the canopy with hub station terraces built onto its trunk, wide shot', place: 'Ext', light: 'soft overcast daylight, diffuse even light, muted warmth', count: 4 },
  { id: 'r13', on: true, scene: 'industrial-biophilic platform interior among the branches, tensile structures and modular decks, lone figure', place: 'Int', light: 'interior, low ambient of engineered bio-tech and algae-battery glow', count: 4 },
  // Songhai — Gambia River delta civilisation: river commons, polder hydraulics, night-sealed trenches (Arc 4 climax)
  { id: 'r14', on: true, scene: 'Songhai river commons, the Gambia treated as a public promenade and marketplace with terraced trench districts along the banks, establishing shot', place: 'Ext', light: 'golden-hour sunlight, warm rim light, glowing air', count: 5 },
  { id: 'r15', on: true, scene: 'Songhai polder hydraulics, levees sluices and weirs routing flowing water through algae cultivation channels, architecture only, flowing water never still', place: 'Ext', light: 'midday sun through canopy and glass, dappled light, solar-glow glaze', count: 5 },
  { id: 'r16', on: true, scene: 'a trench district sealing for night, retractable covers and layered meshes closing over a terraced street, small group of people', place: 'Ext', light: 'dusk, cool blue-violet ambient with warm lamp accents', count: 4 },
  // The Locus and signature props/textures
  { id: 'r17', on: true, scene: "The Locus — Echo's disguised shipping-container sanctuary among ordinary freight containers in a logistics yard, concealed power, cooling and comms vents, mid-shot", place: 'Ext', light: 'dusk, cool blue-violet ambient with warm lamp accents', count: 5 },
  { id: 'r18', on: true, scene: 'resin wick-lamp prop study, ceramic censer head with a downward flame and brass fittings, machinery and prop detail', place: '—', light: 'neutral workshop light', count: 5 },
  { id: 'r19', on: true, scene: 'material and texture study — woven embroidered Dharti textiles, brass lamp fittings, bio-ceramic composite, filigree', place: '—', light: 'soft overcast daylight, diffuse even light, muted warmth', count: 4 },
];

const PLACES: SceneRow['place'][] = ['Ext', 'Int', '—'];
const nextPlace = (p: SceneRow['place']) => PLACES[(PLACES.indexOf(p) + 1) % PLACES.length];
const newRowId = (rs: SceneRow[]) => 'c' + (rs.reduce((m, r) => Math.max(m, parseInt(r.id.replace(/\D/g, '')) || 0), 0) + 1);

function SeriesSetBuilder({ seriesId, genModel, setGenModel, setFiles, onError }: { seriesId: string; genModel: 'sdxl' | 'flux'; setGenModel: (m: 'sdxl' | 'flux') => void; setFiles: React.Dispatch<React.SetStateAction<File[]>>; onError: (m: string) => void }) {
  const [houseStyle, setHouseStyle] = React.useState(HOUSE_STYLE_DEFAULT);
  const [rows, setRows] = React.useState<SceneRow[]>(STARTER_ROWS);
  const [items, setItems] = React.useState<TrainItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [lightIdx, setLightIdx] = React.useState<number | null>(null);
  const activeThumbRef = React.useRef<HTMLImageElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // ── Persistence (IndexedDB), scoped per series ──────────────────────────────
  React.useEffect(() => {
    let alive = true; setLoaded(false);
    (async () => {
      try {
        const meta = await getMeta(seriesId);
        if (alive && meta) { if (meta.houseStyle) setHouseStyle(meta.houseStyle); if (Array.isArray(meta.rows) && meta.rows.length) setRows(meta.rows as SceneRow[]); }
        const its = await allItems(seriesId);
        if (alive) setItems(its);
      } catch { /* fresh start if IDB unavailable */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, [seriesId]);

  React.useEffect(() => {
    if (!loaded) return; // don't clobber persisted meta with defaults before load
    const t = setTimeout(() => { putMeta(seriesId, { houseStyle, rows }).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [houseStyle, rows, loaded, seriesId]);

  // Kept images are the training set — keep TrainPanel's `files` in sync.
  React.useEffect(() => {
    setFiles(items.filter(i => i.keep).map(i => new File([i.blob], i.id + '.png', { type: i.blob.type || 'image/png' })));
  }, [items, setFiles]);

  // Object URLs for display, reconciled as items are added/removed.
  const urlsRef = React.useRef<Record<string, string>>({});
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    let changed = false; const ids = new Set(items.map(i => i.id));
    for (const it of items) if (!urlsRef.current[it.id]) { urlsRef.current[it.id] = URL.createObjectURL(it.blob); changed = true; }
    for (const id of Object.keys(urlsRef.current)) if (!ids.has(id)) { URL.revokeObjectURL(urlsRef.current[id]); delete urlsRef.current[id]; changed = true; }
    if (changed) force();
  }, [items]);
  React.useEffect(() => () => { for (const u of Object.values(urlsRef.current)) URL.revokeObjectURL(u); }, []);
  const urls = urlsRef.current;

  const go = (delta: number) => setLightIdx(i => (i == null ? i : (i + delta + items.length) % items.length));
  // Keep the open index valid as images are added/removed (close if none left).
  React.useEffect(() => { setLightIdx(i => (i == null ? i : items.length === 0 ? null : Math.min(i, items.length - 1))); }, [items.length]);
  React.useEffect(() => { if (lightIdx != null) activeThumbRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [lightIdx]);
  React.useEffect(() => {
    if (lightIdx == null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightIdx(null);
      else if (e.key === 'ArrowRight') setLightIdx(i => (i == null ? i : (i + 1) % items.length));
      else if (e.key === 'ArrowLeft') setLightIdx(i => (i == null ? i : (i - 1 + items.length) % items.length));
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [lightIdx, items.length]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedCount = rows.filter(r => r.on).length;
  const allSelected = rows.length > 0 && rows.every(r => r.on);
  const keptCount = items.filter(i => i.keep).length;
  const countByRow = React.useMemo(() => { const m: Record<string, number> = {}; for (const it of items) if (it.rowId) m[it.rowId] = (m[it.rowId] || 0) + 1; return m; }, [items]);

  function updateRow(id: string, patch: Partial<SceneRow>) { setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r)); }
  function removeRow(id: string) { setRows(rs => rs.filter(r => r.id !== id)); }
  function addRow() { setRows(rs => [...rs, { id: newRowId(rs), on: true, scene: '', place: 'Ext', light: LIGHT_PRESETS[2], count: 4 }]); }
  function dupRow(src: SceneRow) { setRows(rs => { const i = rs.findIndex(r => r.id === src.id); const next = [...rs]; next.splice(i + 1, 0, { ...src, id: newRowId(rs) }); return next; }); }
  function toggleSelectAll() { setRows(rs => { const all = rs.every(r => r.on); return rs.map(r => ({ ...r, on: !all })); }); }

  function toggleKeep(id: string, keep: boolean) {
    setItems(prev => { const next = prev.map(it => it.id === id ? { ...it, keep } : it); const ch = next.find(it => it.id === id); if (ch) putItem(ch).catch(() => {}); return next; });
  }
  function removeItem(id: string) { setItems(prev => prev.filter(it => it.id !== id)); deleteItem(id).catch(() => {}); }

  // Generate `count` images for EACH selected row, all of that row's subject.
  async function generateSelected() {
    const sel = rows.filter(r => r.on);
    if (!sel.length) return onError('Select at least one scene row to generate.');
    if (!houseStyle.trim()) return onError('Add a house-style prompt first.');
    setBusy(true);
    try {
      let idx = items.reduce((m, i) => Math.max(m, i.createdIndex), -1) + 1;
      const totalToMake = sel.reduce((s, r) => s + r.count, 0);
      let done = 0;
      for (const row of sel) {
        const place = row.place === 'Int' ? 'interior' : row.place === 'Ext' ? 'exterior' : '';
        for (let i = 0; i < row.count; i++) {
          done++;
          setStatus(`Generating ${done}/${totalToMake} — ${row.scene.slice(0, 42)}…`);
          const positive = [row.scene, place, row.light, houseStyle].map(s => s.trim()).filter(Boolean).join(', ');
          const seed = 1000 + idx;
          const wf = genModel === 'flux' ? txt2imgFlux({ positive, seed }) : txt2imgSDXL({ positive, seed, negative: SDXL_NEG });
          const imgs = await generate(wf, {});
          if (imgs[0]) {
            const blob = await (await fetch(imageSrc(imgs[0]))).blob();
            const item: TrainItem = { id: `${seriesId}-${idx}-${seed}`, seriesId, blob, rowId: row.id, rowLabel: row.scene.slice(0, 46), prompt: positive, keep: true, source: 'gen', createdIndex: idx };
            await putItem(item).catch(() => {});
            setItems(prev => [...prev, item]);
          }
          idx++;
        }
      }
    } catch (e: any) { onError('Generation failed: ' + e.message); }
    finally { setBusy(false); setStatus(null); }
  }

  async function addManual(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files || []); e.currentTarget.value = '';
    if (!fs.length) return;
    let idx = items.reduce((m, i) => Math.max(m, i.createdIndex), -1) + 1;
    for (const f of fs) {
      const item: TrainItem = { id: `${seriesId}-m-${idx}`, seriesId, blob: f, rowLabel: 'added', keep: true, source: 'manual', createdIndex: idx };
      await putItem(item).catch(() => {});
      setItems(prev => [...prev, item]);
      idx++;
    }
  }

  const num: React.CSSProperties = { width: 50, height: 28, borderRadius: 7, background: 'var(--bg3)', color: 'var(--ink)', border: 'none', boxShadow: 'inset 0 0 0 1px var(--line)', padding: '0 6px' };
  const navBtn: React.CSSProperties = { fontSize: 32, lineHeight: 1, width: 46, height: 46, borderRadius: 23, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', flex: '0 0 auto' };

  return (
    <div style={{ marginTop: 4, display: 'grid', gap: 10 }}>
      <label style={{ display: 'grid', gap: 4 }}>
        <span className="ww-insp-sub" style={{ fontSize: 12 }}>◆ House style — applied to every image</span>
        <textarea className="ww-gen-prompt" style={{ minHeight: 92 }} value={houseStyle} onChange={e => setHouseStyle(e.target.value)} />
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>The constant the LoRA learns. Describe the look only — no lighting, scene, or panel/gutter words. Lighting varies per row below.</span>
      </label>

      <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg3)' }}>
          <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = selectedCount > 0 && !allSelected; }} onChange={toggleSelectAll} title="Select all rows" />
          <span style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Scenes — tick the rows to generate</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{selectedCount} selected</span>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'grid', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--line)', opacity: r.on ? 1 : 0.55 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={r.on} onChange={e => updateRow(r.id, { on: e.target.checked })} style={{ marginTop: 7 }} />
                <textarea className="ww-gen-prompt" style={{ minHeight: 0, height: 42, flex: 1, fontSize: 12, resize: 'vertical', lineHeight: 1.35 }} value={r.scene} onChange={e => updateRow(r.id, { scene: e.target.value })} placeholder="scene & subject — the setting/subject only (no style words)" />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingLeft: 24 }}>
                <button className="ww-filter" title="Interior / Exterior / not applicable" style={{ height: 28, padding: '0 8px' }} onClick={() => updateRow(r.id, { place: nextPlace(r.place) })}>{r.place === '—' ? '— n/a' : r.place}</button>
                <input className="ww-gen-prompt" list="ww-lights" style={{ minHeight: 0, height: 28, fontSize: 12, flex: '1 1 260px' }} value={r.light} onChange={e => updateRow(r.id, { light: e.target.value })} placeholder="time & light" />
                <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', gap: 5, alignItems: 'center' }}>Count<input type="number" min={1} max={30} value={r.count} onChange={e => updateRow(r.id, { count: Math.max(1, +e.target.value) })} style={num} /></label>
                <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{countByRow[r.id] || 0} imgs</span>
                <button className="ww-filter" title="Duplicate row" style={{ height: 28, padding: '0 8px' }} onClick={() => dupRow(r)}>⧉</button>
                <button className="ww-filter" title="Remove row" style={{ height: 28, padding: '0 8px' }} onClick={() => removeRow(r.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="ww-lights">{LIGHT_PRESETS.map(l => <option key={l} value={l} />)}</datalist>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={cx('ww-gen-btn', busy && 'is-busy')} disabled={busy || selectedCount === 0} onClick={generateSelected}>{busy ? 'Generating…' : '▶ Generate Selected'}</button>
        <select className="ww-filter" value={genModel} onChange={e => setGenModel(e.target.value as any)}><option value="flux">Flux (recommended)</option><option value="sdxl">SDXL (fast)</option></select>
        <button className="ww-filter" onClick={addRow}>+ Add row</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--ink2)' }}>{keptCount} kept / {items.length} images</span>
      </div>
      {status && <p style={{ opacity: 0.8, margin: 0 }}>{status}</p>}

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="ww-insp-sub" style={{ fontSize: 12 }}>Training set — {keptCount} kept{items.length > keptCount ? ` · ${items.length - keptCount} rejected` : ''}</span>
          <span style={{ flex: 1 }} />
          <button className="ww-filter" onClick={() => fileRef.current?.click()}>+ Add images</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addManual} />
        </div>
        {items.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: 0 }}>No images yet — tick scene rows and Generate Selected. Click an image to enlarge; untick to reject it from training.</p>
        ) : (
          <div className="ww-libgrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {items.map((it, i) => (
              <div key={it.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', outline: it.keep ? '2px solid #6ad08f' : '2px solid transparent', opacity: it.keep ? 1 : 0.4 }}>
                <img src={urls[it.id]} alt="" onClick={() => urls[it.id] && setLightIdx(i)} style={{ width: '100%', display: 'block', cursor: 'zoom-in', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                <input type="checkbox" checked={it.keep} onChange={e => toggleKeep(it.id, e.target.checked)} title={it.keep ? 'Kept — untick to reject' : 'Rejected — tick to keep'} style={{ position: 'absolute', top: 6, left: 6, width: 18, height: 18, cursor: 'pointer' }} />
                <button title="Delete image" onClick={() => removeItem(it.id)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer', lineHeight: 1, fontSize: 13 }}>×</button>
                {it.rowLabel && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 9, background: 'rgba(0,0,0,.6)', color: '#fff', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.rowLabel}</span>}
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: 'var(--ink3)', margin: 0 }}>Images persist across refreshes. No face close-ups by design (identity is the character LoRA's job).</p>
      </div>

      {lightIdx != null && items.length > 0 && (() => {
        const idx = Math.min(lightIdx, items.length - 1);
        const cur = items[idx];
        return (
          <div onClick={() => setLightIdx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', color: '#fff' }}>
              <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {items.length}</span>
              <span style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>{cur.rowLabel}</span>
              <span style={{ flex: 1 }} />
              <button className={cx('ww-filter', cur.keep && 'is-on')} onClick={() => toggleKeep(cur.id, !cur.keep)} style={{ height: 30 }} title="Include / exclude from training">{cur.keep ? '✓ Kept' : '✗ Rejected'}</button>
              <button className="ww-filter" onClick={() => removeItem(cur.id)} style={{ height: 30 }} title="Delete this image">Delete</button>
              <button className="ww-filter" onClick={() => setLightIdx(null)} style={{ height: 30 }}>Close ✕</button>
            </div>
            <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 0, padding: '0 8px' }}>
              <button onClick={() => go(-1)} aria-label="Previous" style={navBtn}>‹</button>
              <img src={urls[cur.id]} alt="" style={{ maxWidth: '78vw', maxHeight: '72vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,.6)', opacity: cur.keep ? 1 : 0.5 }} />
              <button onClick={() => go(1)} aria-label="Next" style={navBtn}>›</button>
            </div>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto', background: 'rgba(0,0,0,.35)' }}>
              {items.map((it, i) => (
                <img key={it.id} ref={i === idx ? activeThumbRef : undefined} src={urls[it.id]} alt="" onClick={() => setLightIdx(i)}
                  style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', flex: '0 0 auto', outline: i === idx ? '2px solid #6ad08f' : '2px solid transparent', opacity: it.keep ? (i === idx ? 1 : 0.65) : 0.3 }} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function TrainPanel({ onDone, onError, updateLink, characters, seriesLora, updateSeriesLora, seriesId }: { onDone: (m: string) => void; onError: (m: string) => void; updateLink?: (cat: any, key: string, value: unknown) => void; characters?: any[]; seriesLora?: SeriesLora; updateSeriesLora?: (v: SeriesLora | null) => void; seriesId: string }) {
  const cast = characters || [];
  // Scope: a character/asset LoRA (linked to the roster) or the whole-series style LoRA.
  const [scope, setScope] = React.useState<'character' | 'series'>('character');
  const [name, setName] = React.useState('');
  const [character, setCharacter] = React.useState(cast[0]?.id || '');
  const [trigger, setTrigger] = React.useState('');
  const [steps, setSteps] = React.useState(1500);
  const [rank, setRank] = React.useState(32);
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  // Quick training-set generator.
  const [genPrompt, setGenPrompt] = React.useState('');
  const [genCount, setGenCount] = React.useState(12);
  const [genModel, setGenModel] = React.useState<'sdxl' | 'flux'>('flux');
  const [genBusy, setGenBusy] = React.useState(false);
  const PLAIN = ', isolated subject on a plain neutral light-grey studio background, full body, even lighting';

  // Switching scope swaps which builder owns `files`; clear so sets don't bleed across.
  // (Series scope: SeriesSetBuilder repopulates `files` from its persisted, kept images.)
  React.useEffect(() => { setFiles([]); }, [scope]);

  // Generate a varied set of images of one subject, on a clean background, ready to train on.
  async function generateSet() {
    if (!genPrompt.trim()) return onError('Describe the subject to generate a training set.');
    setGenBusy(true);
    try {
      // Training a CHARACTER: bake the series style into the dataset so the character
      // LoRA carries the house look. Defining the SERIES style: no LoRA (it doesn't exist yet).
      const styleRef = (scope === 'character' && seriesLora?.loraName)
        ? [{ name: seriesLora.loraName, strength: seriesLora.strength ?? 0.65 }] : undefined;
      const styleTrig = (scope === 'character' && seriesLora?.triggerWord) ? seriesLora.triggerWord + ', ' : '';
      const made: File[] = [];
      for (let i = 0; i < genCount; i++) {
        setStatus(`Generating training image ${i + 1}/${genCount}…`);
        const positive = styleTrig + genPrompt + PLAIN + (i % 2 ? ', three-quarter view' : i % 3 ? ', side view' : ', front view');
        const wf = genModel === 'flux' ? txt2imgFlux({ positive, seed: 1000 + i, loras: styleRef }) : txt2imgSDXL({ positive, seed: 1000 + i, negative: 'lowres, bad anatomy, busy background', loras: styleRef });
        const imgs = await generate(wf, {});
        if (imgs[0]) made.push(await dataUrlToFile(imageSrc(imgs[0]), `gen_${i + 1}.png`));
      }
      setFiles(f => [...f, ...made]);
      setStatus(null);
    } catch (e: any) { onError('Set generation failed: ' + e.message); }
    finally { setGenBusy(false); setStatus(null); }
  }

  async function submit() {
    if (!name) return onError('Give the LoRA a name.');
    if (files.length < 5) return onError('Add at least ~5 training images (10–25 recommended).');
    setBusy(true); setStatus('Uploading dataset…');
    try {
      const { jobId } = await trainLora({ name, triggerWord: trigger || name, steps, rank }, files);
      setStatus('Training… this can take a while');
      // The training job writes a .safetensors (no image), so the worker reports
      // "no outputs" / FAILED even on success — verify by the LoRA appearing.
      try { await pollJob(jobId, { onTick: s => setStatus(`Training: ${s.status}`), timeoutMs: 4 * 60 * 60 * 1000 }); }
      catch { /* expected for training jobs — fall through to volume check */ }
      // FluxTrainer names the output "<name>_rank<N>_bf16.safetensors"; prefer the final (non -step) file.
      const produced = (await listLoras()).map(l => l.name)
        .filter(n => n.startsWith(name) && !/-step\d+\.safetensors$/.test(n))
        .sort();
      const finalName = produced[produced.length - 1];
      if (!finalName) throw new Error('Training finished but no LoRA was produced — check the dataset.');
      if (scope === 'series') updateSeriesLora?.({ loraName: finalName, triggerWord: trigger || name, strength: 0.65 });
      else if (character) updateLink?.('characterLora', character, { loraName: finalName, triggerWord: trigger || name });
      onDone(`Trained ${finalName}${scope === 'series' ? ' · set as series style' : ''}`);
    } catch (e: any) { onError(e.message); }
    finally { setBusy(false); setStatus(null); }
  }

  return (
    <div style={{ marginTop: 16, maxWidth: 640, display: 'grid', gap: 12 }}>
      <Field label="Train for">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={cx('ww-filter', scope === 'character' && 'is-on')} onClick={() => setScope('character')}>A character / asset</button>
          <button className={cx('ww-filter', scope === 'series' && 'is-on')} onClick={() => setScope('series')}>The whole series (style)</button>
        </div>
      </Field>
      {scope === 'series' && (
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: 0, lineHeight: 1.5 }}>
          A <b>series style LoRA</b> captures the broad house look (lighting, linework, palette, costume) — <i>not</i> specific faces. Train it on varied scenes/subjects in the target style; it’s then applied under every character LoRA. {seriesLora?.loraName && <>Current: <b>{seriesLora.loraName.replace('.safetensors', '')}</b> — training replaces it.</>}
        </p>
      )}
      <Field label="LoRA name"><input className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={name} onChange={e => setName(e.target.value)} placeholder={scope === 'series' ? 'my_series_style_v1' : 'my_character_v1'} /></Field>
      {scope === 'character' && (
        <Field label="Character (for the roster link)">
          {cast.length ? (
            <select className="ww-gen-prompt" style={{ minHeight: 0, height: 36 }} value={character} onChange={e => setCharacter(e.target.value)}>
              {cast.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: 0 }}>No characters in this series yet — add one in Narrative to link a trained LoRA.</p>}
        </Field>
      )}
      <Field label="Trigger word"><input className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={trigger} onChange={e => setTrigger(e.target.value)} placeholder={name || 'trigger word'} /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Steps"><input type="number" className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={steps} onChange={e => setSteps(+e.target.value)} /></Field>
        <Field label="Rank (dim)"><input type="number" className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={rank} onChange={e => setRank(+e.target.value)} /></Field>
      </div>
      {scope === 'character' ? (
      <div className="ww-adv" style={{ marginTop: 4 }}>
        <div className="ww-adv-head" style={{ cursor: 'default' }}>✦ Generate a training set</div>
        <div style={{ padding: '0 11px 12px', display: 'grid', gap: 8 }}>
          <input className="ww-gen-prompt" style={{ minHeight: 0, height: 34 }} value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="Subject to generate, e.g. 'a young Mara journalist, lamp-lit, scarf'" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: 'var(--ink3)', display: 'flex', gap: 6, alignItems: 'center' }}>Count
              <input type="number" min={4} max={30} value={genCount} onChange={e => setGenCount(+e.target.value)} style={{ width: 56, height: 30, borderRadius: 7, background: 'var(--bg3)', color: 'var(--ink)', border: 'none', boxShadow: 'inset 0 0 0 1px var(--line)', padding: '0 6px' }} />
            </label>
            <select className="ww-filter" value={genModel} onChange={e => setGenModel(e.target.value as any)}><option value="flux">Flux (recommended)</option><option value="sdxl">SDXL (fast)</option></select>
            <button className={cx('ww-gen-btn', genBusy && 'is-busy')} disabled={genBusy} onClick={generateSet}>{genBusy ? 'Generating…' : `✦ Generate ${genCount} images`}</button>
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>on a clean background, ready to train</span>
          </div>
        </div>
      </div>
      ) : (
        <SeriesSetBuilder seriesId={seriesId} genModel={genModel} setGenModel={setGenModel} setFiles={setFiles} onError={onError} />
      )}
      {scope === 'character' && (
        <>
          <Field label={`Training images (${files.length})`}>
            <button className="ww-filter" onClick={() => fileRef.current?.click()}>+ Add images</button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { setFiles(f => [...f, ...Array.from(e.target.files || [])]); e.currentTarget.value = ''; }} />
          </Field>
          {files.length > 0 && (
            <div className="ww-gen-gallery">
              {files.slice(0, 24).map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: '100%', borderRadius: 6, display: 'block' }} />)}
            </div>
          )}
        </>
      )}
      {status && <p style={{ opacity: 0.8 }}>{status}</p>}
      <div><button className={cx('ww-gen-btn', busy && 'is-busy')} disabled={busy} onClick={submit}>{busy ? 'Training…' : '✦ Train LoRA'}</button></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 4, flex: 1 }}><span className="ww-insp-sub" style={{ fontSize: 12 }}>{label}</span>{children}</label>;
}

// Helper for callers that want to generate a dataset for a LoRA from a prompt.
export async function generateDataset(workflow: unknown, onStatus?: (s: string) => void) {
  return generate(workflow, { onStatus });
}
