import React from 'react';
import { cx } from './ui';
import { seriesLore } from './lore.generated';
import { listLore, createLore, updateLore, deleteLore, type LoreEntity } from './services/lore';

// Lore view — the world repository surface. The source of truth is the markdown
// files under lore/<series>/, validated and bundled by the companion server.
// This view reads them live via /api/lore and writes back through create/update/
// delete (the server rewrites the .md files and regenerates the bundle). When the
// server is unreachable it falls back to the static lore.generated.ts bundle,
// read-only — mirroring the app's offline-first stance for generation.

const STATUS_HUE: Record<string, number> = { draft: 40, review: 210, locked: 150 };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', review: 'In review', locked: 'Locked' };
const TYPE_GLYPH: Record<string, string> = { character: '☺', city: '⌖', org: '⬡', location: '⌘', tech: '⚙', food: '✦', story: '¶', glossary: '𝐀' };
const TYPES = ['character', 'city', 'org', 'location', 'tech', 'food', 'story', 'glossary'] as const; // schema-backed types the editor offers

function statusColor(status?: string) { return `oklch(0.7 0.15 ${STATUS_HUE[status || 'draft'] ?? 40})`; }
function glyphFor(type?: string) { return TYPE_GLYPH[type || ''] || '◇'; }
function kebab(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function splitLines(s: string) { return s.split('\n').map(x => x.trim()).filter(Boolean); }
function numIf(s: string): string | number { const t = s.trim(); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t; }

// Avatar gradient. Lore no longer carries a palette (that lives on the visual
// plane), so derive a stable hue from the entity id — each entity keeps a
// distinct, consistent colour without storing one.
function avStyle(e?: { id?: string; type?: string }): React.CSSProperties {
  const seed = (e?.id || e?.type || '').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { background: `radial-gradient(80% 80% at 50% 30%, oklch(0.55 0.13 ${seed % 360}), #0a0c12 82%)` };
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span className="ww-sheet-unlocktag" style={{ color: statusColor(status), borderColor: statusColor(status) }}>
      ● {STATUS_LABEL[status || 'draft'] || status}
    </span>
  );
}

// Minimal inline markdown for the prose body — bold (**…**) and italic (*…*).
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<b key={`${keyBase}-${i++}`}>{m[1]}</b>);
    else out.push(<em key={`${keyBase}-${i++}`}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Prose({ body }: { body?: string }) {
  if (!body) return null;
  const paras = body.split(/\n\n+/);
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.62, color: 'var(--ink2, #c7cbd6)' }}>
      {paras.map((p, i) => <p key={i} style={{ margin: '0 0 12px' }}>{inline(p, 'p' + i)}</p>)}
    </div>
  );
}

function CityStats({ e }: { e: any }) {
  const rows: [string, any][] = [
    ['Location', e.location], ['Power', e.power], ['Threat', e.threat],
    ['Population', typeof e.population === 'number' ? e.population.toLocaleString() : e.population],
    ['Banner', e.banner ? [e.banner.primary, e.banner.secondary].filter(Boolean).join(' · ') : undefined],
  ];
  const present = rows.filter(([, v]) => v != null && v !== '');
  if (!present.length) return null;
  return (
    <div className="ww-bp-grid">
      {present.map(([k, v]) => (
        <div key={k} className="ww-bp-cell"><div className="ww-insp-sub">{k}</div><div style={{ fontSize: 13 }}>{v}</div></div>
      ))}
    </div>
  );
}

// --- Editor ------------------------------------------------------------------
interface Draft {
  id: string; type: string; name: string; status: string; version: string;
  aka: string; role: string; portrayal: string;
  location: string; power: string; threat: string; population: string;
  bannerPrimary: string; bannerSecondary: string;
  relationships: { to: string; as: string }[]; open_questions: string; body: string;
}

function blankDraft(): Draft {
  return {
    id: '', type: 'character', name: '', status: 'draft', version: '', aka: '',
    role: '', portrayal: '', location: '', power: '', threat: '', population: '',
    bannerPrimary: '', bannerSecondary: '', relationships: [], open_questions: '', body: '',
  };
}
function draftOf(e: any): Draft {
  return {
    id: e.id, type: e.type, name: e.name || '', status: e.status || 'draft',
    version: e.version != null ? String(e.version) : '', aka: (e.aka || []).join(', '),
    role: e.role || '', portrayal: (e.portrayal || []).join('\n'),
    location: e.location || '', power: e.power || '', threat: e.threat || '',
    population: e.population != null ? String(e.population) : '',
    bannerPrimary: e.banner?.primary || '', bannerSecondary: e.banner?.secondary || '',
    relationships: (e.relationships || []).map((r: any) => ({ ...r })),
    open_questions: (e.open_questions || []).join('\n'), body: e.body || '',
  };
}
// Build the validated frontmatter object the API expects (type-specific fields
// only — the schema is strict()).
function payloadOf(d: Draft): LoreEntity {
  const data: any = {
    id: kebab(d.id), type: d.type, name: d.name.trim(), status: d.status,
    aka: d.aka.split(',').map(s => s.trim()).filter(Boolean),
    relationships: d.relationships.filter(r => r.to && r.as.trim()).map(r => ({ to: r.to, as: r.as.trim() })),
    open_questions: splitLines(d.open_questions),
  };
  if (d.version.trim()) data.version = numIf(d.version);
  if (d.type === 'character') {
    if (d.role.trim()) data.role = d.role.trim();
    data.portrayal = splitLines(d.portrayal);
  } else if (d.type === 'city') {
    if (d.location.trim()) data.location = d.location.trim();
    if (d.power.trim()) data.power = d.power.trim();
    if (d.threat.trim()) data.threat = d.threat.trim();
    if (d.population.trim()) { const n = Number(d.population); if (Number.isFinite(n)) data.population = n; }
    const banner: any = {};
    if (d.bannerPrimary.trim()) banner.primary = d.bannerPrimary.trim();
    if (d.bannerSecondary.trim()) banner.secondary = d.bannerSecondary.trim();
    if (banner.primary || banner.secondary) data.banner = banner;
  }
  return data;
}

const inputStyle: React.CSSProperties = { width: '100%' };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div className="ww-insp-sub">{label}</div>{children}</div>;
}

function LoreEditor({ mode, initial, others, onSave, onCancel, busy, error }: {
  mode: 'new' | 'edit'; initial: Draft; others: any[];
  onSave: (d: Draft) => void; onCancel: () => void; busy: boolean; error: string | null;
}) {
  const [d, setD] = React.useState<Draft>(initial);
  const [idTouched, setIdTouched] = React.useState(mode === 'edit');
  const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));

  // Auto-derive a kebab id from the name until the author edits the id directly.
  function onName(name: string) { set(idTouched ? { name } : { name, id: kebab(name) }); }

  const setRel = (i: number, patch: Partial<{ to: string; as: string }>) =>
    set({ relationships: d.relationships.map((r, j) => j === i ? { ...r, ...patch } : r) });
  const addRel = () => set({ relationships: [...d.relationships, { to: others[0]?.id || '', as: '' }] });
  const rmRel = (i: number) => set({ relationships: d.relationships.filter((_, j) => j !== i) });

  const canSave = d.name.trim() && kebab(d.id);

  return (
    <div className="ww-bible-profile" style={{ overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <b style={{ fontSize: 18, color: 'var(--ink)' }}>{mode === 'new' ? 'New lore entity' : `Edit ${initial.name}`}</b>
        <span style={{ flex: 1 }} />
        <button className="ww-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="ww-btn primary" onClick={() => onSave(d)} disabled={busy || !canSave}>{busy ? 'Saving…' : 'Save'}</button>
      </div>

      {error && <div className="ww-toast" style={{ position: 'static', margin: '0 0 12px', color: '#ff7a6a' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Type">
          <select className="ww-bp-edit" style={inputStyle} value={d.type} onChange={e => set({ type: e.target.value })}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="ww-bp-edit" style={inputStyle} value={d.status} onChange={e => set({ status: e.target.value })}>
            {['draft', 'review', 'locked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Name">
          <input className="ww-bp-edit" style={inputStyle} value={d.name} placeholder="Display name" onChange={e => onName(e.target.value)} />
        </Field>
        <Field label="Id (join key — kebab-case)">
          <input className="ww-bp-edit" style={inputStyle} value={d.id} placeholder="the-locus"
            onChange={e => { setIdTouched(true); set({ id: e.target.value }); }} />
        </Field>
        <Field label="aka (comma-separated)">
          <input className="ww-bp-edit" style={inputStyle} value={d.aka} placeholder="alternate spellings" onChange={e => set({ aka: e.target.value })} />
        </Field>
        <Field label="Version (optional)">
          <input className="ww-bp-edit" style={inputStyle} value={d.version} placeholder="1.6" onChange={e => set({ version: e.target.value })} />
        </Field>
      </div>

      {d.type === 'character' && (
        <>
          <Field label="Role"><input className="ww-bp-edit" style={inputStyle} value={d.role} placeholder="Role · protagonist" onChange={e => set({ role: e.target.value })} /></Field>
          <Field label="Canon portrayal (one rule per line)">
            <textarea className="ww-bp-edit" style={inputStyle} rows={4} value={d.portrayal} placeholder={'Voice only — no avatar.\nShow one hesitation per appearance.'} onChange={e => set({ portrayal: e.target.value })} />
          </Field>
        </>
      )}

      {d.type === 'city' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Location"><input className="ww-bp-edit" style={inputStyle} value={d.location} onChange={e => set({ location: e.target.value })} /></Field>
          <Field label="Power"><input className="ww-bp-edit" style={inputStyle} value={d.power} onChange={e => set({ power: e.target.value })} /></Field>
          <Field label="Threat"><input className="ww-bp-edit" style={inputStyle} value={d.threat} onChange={e => set({ threat: e.target.value })} /></Field>
          <Field label="Population"><input className="ww-bp-edit" style={inputStyle} value={d.population} placeholder="175000000" onChange={e => set({ population: e.target.value })} /></Field>
          <Field label="Banner · primary"><input className="ww-bp-edit" style={inputStyle} value={d.bannerPrimary} onChange={e => set({ bannerPrimary: e.target.value })} /></Field>
          <Field label="Banner · secondary"><input className="ww-bp-edit" style={inputStyle} value={d.bannerSecondary} onChange={e => set({ bannerSecondary: e.target.value })} /></Field>
        </div>
      )}

      <Field label="Relationships">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.relationships.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="ww-bp-edit" style={{ flex: 1 }} value={r.as} placeholder="as (e.g. guided-by)" onChange={e => setRel(i, { as: e.target.value })} />
              <span style={{ color: 'var(--ink3)' }}>→</span>
              <select className="ww-bp-edit" style={{ flex: 1 }} value={r.to} onChange={e => setRel(i, { to: e.target.value })}>
                <option value="" disabled>target…</option>
                {others.map(o => <option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}
              </select>
              <button className="ww-arc-add" onClick={() => rmRel(i)} title="Remove">✕</button>
            </div>
          ))}
          <button className="ww-arc-add" style={{ alignSelf: 'flex-start' }} onClick={addRel} disabled={!others.length}>＋ Relationship</button>
        </div>
      </Field>

      <Field label="Canon (prose — markdown **bold** / *italic* supported)">
        <textarea className="ww-bp-edit" style={inputStyle} rows={8} value={d.body} placeholder="The human read for this entity…" onChange={e => set({ body: e.target.value })} />
      </Field>

      <Field label="Open canon questions (one per line)">
        <textarea className="ww-bp-edit" style={inputStyle} rows={3} value={d.open_questions} placeholder="Unresolved questions to track…" onChange={e => set({ open_questions: e.target.value })} />
      </Field>
    </div>
  );
}

// --- Main view ---------------------------------------------------------------
export function LoreView({ seriesId, flash }: { seriesId: string; online?: boolean; flash?: (m: string) => void }) {
  const [entities, setEntities] = React.useState<any[]>([]);
  const [live, setLive] = React.useState(false); // came from the server (=> editable)
  const [loading, setLoading] = React.useState(true);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<null | { mode: 'new' | 'edit'; originalId?: string }>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Load live from the server; fall back to the static bundle (read-only) offline.
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLore(seriesId);
      setEntities(list); setLive(true);
    } catch {
      setEntities(seriesLore(seriesId) || []); setLive(false);
    } finally { setLoading(false); }
  }, [seriesId]);

  React.useEffect(() => { setEditing(null); reload(); }, [reload]);
  React.useEffect(() => {
    if (!entities.some(x => x.id === selId)) setSelId(entities[0]?.id ?? null);
  }, [entities, selId]);

  const note = (m: string) => (flash ? flash(m) : undefined);

  async function save(d: Draft) {
    setBusy(true); setErr(null);
    try {
      const payload = payloadOf(d);
      const list = editing?.mode === 'edit'
        ? await updateLore(seriesId, editing.originalId!, payload, d.body)
        : await createLore(seriesId, payload, d.body);
      setEntities(list); setLive(true); setSelId(payload.id); setEditing(null);
      note(`Saved “${payload.name}”`);
    } catch (e: any) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function remove(e: any) {
    if (!window.confirm(`Delete lore entity “${e.name}” (${e.id})? This removes lore/${seriesId}/…/${e.id}.md.`)) return;
    setBusy(true); setErr(null);
    try { setEntities(await deleteLore(seriesId, e.id)); note(`Deleted “${e.name}”`); }
    catch (e2: any) { setErr(e2.message || String(e2)); note('Delete blocked — see error'); }
    finally { setBusy(false); }
  }

  const sid = (entities.some(x => x.id === selId) ? selId : entities[0]?.id) as string | undefined;
  const e = entities.find(x => x.id === sid) as any;
  const nameOf = (id: string) => entities.find(x => x.id === id)?.name || id;
  const others = entities.filter(x => x.id !== (editing?.originalId ?? '__none__'));

  return (
    <div className="ww-bible">
      <div className="ww-bible-roster">
        <div className="ww-insp-sub" style={{ padding: '0 6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Entities · {entities.length}</span>
          {!live && !loading && <span title="Server unreachable — read-only from the bundled snapshot" style={{ color: 'var(--ink3)', fontSize: 11 }}>· offline</span>}
        </div>
        {entities.map((x: any) => (
          <button key={x.id} className={cx('ww-rostercard', x.id === sid && !editing && 'is-sel')} onClick={() => { setEditing(null); setSelId(x.id); }}>
            <div className="ww-roster-av" style={avStyle(x)}><span>{glyphFor(x.type)}</span></div>
            <div className="ww-roster-meta"><b>{x.name}</b><span>{x.role || x.location || x.type}</span></div>
            <span title={STATUS_LABEL[x.status] || x.status} style={{ width: 8, height: 8, borderRadius: 8, flex: '0 0 auto', background: statusColor(x.status) }} />
          </button>
        ))}
        {live && (
          <button className="ww-btn ghost" style={{ width: '100%', marginTop: 6 }} disabled={busy}
            onClick={() => { setErr(null); setEditing({ mode: 'new' }); }}>＋ New entity</button>
        )}
        {!live && !loading && (
          <div style={{ fontSize: 11, color: 'var(--ink3)', padding: '8px 6px', lineHeight: 1.5 }}>
            Start the companion server (<code>npm run dev:all</code>) to create, edit, or delete lore.
          </div>
        )}
      </div>

      {editing ? (
        <LoreEditor
          mode={editing.mode}
          initial={editing.mode === 'edit' && e ? draftOf(e) : blankDraft()}
          others={others}
          onSave={save} onCancel={() => { setEditing(null); setErr(null); }}
          busy={busy} error={err}
        />
      ) : !e ? (
        <div className="ww-bible-profile">
          <div className="ww-sheet-empty" style={{ margin: 'auto', maxWidth: 460 }}>
            <div className="ww-pv-kicker" style={{ marginBottom: 12 }}>Lore</div>
            <b>{loading ? 'Loading lore…' : 'No lore for this series yet'}</b>
            {!loading && <p>Lore lives as markdown files under <code>lore/{seriesId}/</code>. {live ? 'Create the first entity to get started.' : 'Add files there and run npm run lore:gen.'}</p>}
            {!loading && live && <button className="ww-btn primary" style={{ marginTop: 8 }} onClick={() => setEditing({ mode: 'new' })}>＋ New entity</button>}
          </div>
        </div>
      ) : (
        <div className="ww-bible-profile">
          <div className="ww-bp-hero">
            <div className="ww-bp-av" style={avStyle(e)}><span style={{ fontSize: 30 }}>{glyphFor(e.type)}</span></div>
            <div className="ww-bp-h">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 22, color: 'var(--ink)' }}>{e.name}</b>
                <StatusPill status={e.status} />
                {e.version != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)' }}>v{e.version}</span>}
                <span style={{ flex: 1 }} />
                {live && <button className="ww-btn ghost" disabled={busy} onClick={() => { setErr(null); setEditing({ mode: 'edit', originalId: e.id }); }}>Edit</button>}
                {live && <button className="ww-btn ghost" disabled={busy} style={{ color: '#ff7a6a' }} onClick={() => remove(e)}>Delete</button>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 2 }}>
                <span style={{ textTransform: 'capitalize' }}>{e.type}</span>{e.role ? ` · ${e.role}` : ''}
              </div>
              {e.aka && e.aka.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>aka {e.aka.join(', ')}</div>}
            </div>
          </div>

          {err && !editing && <div className="ww-toast" style={{ position: 'static', margin: '0 0 12px', color: '#ff7a6a' }}>{err}</div>}

          {e.type === 'character' && e.portrayal && e.portrayal.length > 0 && (
            <>
              <div className="ww-insp-sub">Canon portrayal</div>
              <ul className="ww-rules">{e.portrayal.map((r: string, i: number) => <li key={i}>{inline(r, 'pr' + i)}</li>)}</ul>
            </>
          )}

          {e.type === 'city' && <CityStats e={e} />}

          {e.relationships && e.relationships.length > 0 && (
            <>
              <div className="ww-insp-sub">Relationships</div>
              <div className="ww-bp-rels">
                {e.relationships.map((r: any, i: number) => {
                  const exists = entities.some(x => x.id === r.to);
                  return (
                    <button key={i} className="ww-bp-rel" disabled={!exists} onClick={() => exists && setSelId(r.to)}>
                      <div className="ww-bp-rel-av" style={avStyle(entities.find(x => x.id === r.to))}>{glyphFor(entities.find(x => x.id === r.to)?.type)}</div>
                      <div><b>{nameOf(r.to)}</b><span>{e.name} — {r.as} →</span></div>
                      <span className="ww-bp-rel-arrow">→</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {e.body && (<><div className="ww-insp-sub">Canon</div><Prose body={e.body} /></>)}

          {e.open_questions && e.open_questions.length > 0 && (
            <>
              <div className="ww-insp-sub" style={{ color: 'oklch(0.72 0.16 60)' }}>Open canon questions</div>
              <ul className="ww-rules" style={{ borderLeft: '2px solid oklch(0.72 0.16 60 / 0.5)', paddingLeft: 14 }}>
                {e.open_questions.map((q: string, i: number) => <li key={i} style={{ color: 'var(--ink2)' }}>{q}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
