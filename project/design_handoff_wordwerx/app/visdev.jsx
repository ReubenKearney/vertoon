// visdev.jsx — Visual Development workspace (Phase 3 — full build).
// Two tabs: Prototype board (subject list + variant inspector) and Model sheets.

const VIS_TABS = [
  { id: 'board', label: 'Prototype board', glyph: '▦' },
  { id: 'sheets', label: 'Model sheets', glyph: '◳' },
];

const STATE_META = {
  Locked:    { label: 'Locked',    color: 'var(--accent2)' },
  Candidate: { label: 'Candidate', color: '#f3b23c' },
  Explored:  { label: 'Explored',  color: 'var(--ink3)' },
  Rejected:  { label: 'Rejected',  color: '#ff7a6a' },
};

// ============================================================
//  ROOT
// ============================================================
function VisualDev({ tab, setTab, preselect, flash: flashProp }) {
  const [subjects, setSubjects] = React.useState(() =>
    (window.VISDEV || []).map(s => ({
      ...s,
      variants: s.variants.map(v => ({ ...v })),
      history: [...s.history],
    }))
  );
  const [selId, setSelId] = React.useState(preselect || null);
  const [localToast, setLocalToast] = React.useState(null);

  // honour deep-link from Characters tab
  React.useEffect(() => {
    if (preselect) setSelId(preselect);
  }, [preselect]);

  function flash(msg) {
    if (flashProp) { flashProp(msg); return; }
    setLocalToast(msg);
    clearTimeout(window.__vdT);
    window.__vdT = setTimeout(() => setLocalToast(null), 2600);
  }

  function lockVariant(subjId, v) {
    const name = (subjects.find(s => s.id === subjId) || {}).subject || subjId;
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjId) return s;
      const entry = { v, when: 'Locked just now', who: 'You' };
      const variants = s.variants.map(vr =>
        vr.v === v ? { ...vr, state: 'Locked' }
        : vr.state === 'Locked' ? { ...vr, state: 'Explored' }
        : vr
      );
      return { ...s, locked: v, variants, history: [entry, ...s.history] };
    }));
    flash(`${name} locked to ${v}`);
  }

  function setVariantState(subjId, v, state) {
    setSubjects(prev => prev.map(s =>
      s.id !== subjId ? s
      : { ...s, variants: s.variants.map(vr => vr.v === v ? { ...vr, state } : vr) }
    ));
  }

  function addExploration(subjId) {
    const subj = subjects.find(s => s.id === subjId);
    if (!subj) return;
    const newV = 'v' + (subj.variants.length + 1);
    setSubjects(prev => prev.map(s =>
      s.id !== subjId ? s
      : { ...s, variants: [...s.variants, { v: newV, scene: s.scene, hue: (s.hue + 14) % 360, state: 'Candidate', note: 'New exploration — add a brief.' }] }
    ));
    flash('New candidate added');
  }

  const sel = subjects.find(s => s.id === selId) || null;

  return (
    <div className="ww-vis">
      <div className="ww-subtabs">
        {VIS_TABS.map(t => (
          <button key={t.id} className={cx('ww-subtab', tab === t.id && 'is-on')} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 14 }}>{t.glyph}</span>{t.label}
            <span className="ww-subtab-c">{t.id === 'board' ? subjects.length : subjects.filter(s => s.locked && s.sheet).length}</span>
          </button>
        ))}
      </div>
      <div className="ww-vis-body">
        {tab === 'board' && (
          <ProtoBoard
            subjects={subjects}
            selId={selId} setSelId={setSelId} sel={sel}
            onLock={lockVariant} onSetState={setVariantState} onExplore={addExploration}
          />
        )}
        {tab === 'sheets' && <ModelSheets subjects={subjects} />}
      </div>
      {localToast && <div className="ww-toast">{localToast}</div>}
    </div>
  );
}

// ============================================================
//  PROTOTYPE BOARD — two-panel
// ============================================================
function ProtoBoard({ subjects, selId, setSelId, sel, onLock, onSetState, onExplore }) {
  return (
    <div className="ww-proto">
      {/* ── Left: subject sidebar ── */}
      <div className="ww-proto-subjects">
        <div className="ww-insp-sub" style={{ padding: '0 6px 10px' }}>Subjects · {subjects.length}</div>
        {subjects.map(s => (
          <button
            key={s.id}
            className={cx('ww-proto-subj', s.id === selId && 'is-sel')}
            onClick={() => setSelId(s.id === selId ? null : s.id)}
          >
            <div className="ww-proto-subj-th"><Scene kind={s.scene} /></div>
            <div className="ww-proto-subj-meta">
              <b>{s.subject}</b>
              <span>{s.kind}</span>
            </div>
            <div className={cx('ww-proto-lockdot', s.locked ? 'locked' : 'open')} />
          </button>
        ))}
      </div>

      {/* ── Right: inspector or empty state ── */}
      <div className="ww-proto-main">
        {sel ? (
          <VariantInspector
            subj={sel}
            onLock={onLock} onSetState={onSetState} onExplore={onExplore}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="ww-sheet-empty">
              <div className="ww-pv-kicker" style={{ marginBottom: 10 }}>Visual Dev · Echo's Location</div>
              <b>Select a subject</b>
              <p>Pick a character, location or prop from the sidebar to inspect its prototype variants and lock a canonical reference.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  VARIANT INSPECTOR — right panel
// ============================================================
function VariantInspector({ subj, onLock, onSetState, onExplore }) {
  const [prompt, setPrompt] = React.useState('');
  const bible = (window.BIBLE || {})[subj.id];
  const appearance = bible?.appearance || '';

  const lockedVariant = subj.variants.find(v => v.v === subj.locked);
  const candidates = subj.variants.filter(v => v.state === 'Candidate');

  return (
    <div>
      {/* ── Header ── */}
      <div className="ww-proto-brief">
        <div>
          <div className="ww-pv-kicker">Visual Dev · {subj.kind}</div>
          <h2>{subj.subject}</h2>
          <p>{subj.brief}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {subj.locked ? (
            <div className="ww-vd-lockbadge">
              <span className="ww-vd-lockdot" />
              {subj.locked} locked
            </div>
          ) : (
            <span className="ww-sheet-unlocktag">No lock · {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</span>
          )}
          <button className="ww-arc-add" onClick={() => onExplore(subj.id)}>＋ Explore</button>
        </div>
      </div>

      {/* ── Narrative brief ── */}
      {appearance && (
        <div className="ww-bp-appear" style={{ marginBottom: 22, marginTop: 0 }}>
          <div className="ww-bp-appear-head">
            <div className="ww-insp-sub" style={{ margin: 0 }}>Narrative brief</div>
            <span className="ww-bp-feeds">◎ from Characters</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink)', textWrap: 'pretty' }}>
            {appearance}
          </p>
        </div>
      )}

      {/* ── Generate bar ── */}
      <div className="ww-proto-genbar">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={`Describe a new ${subj.subject} exploration — lighting, palette, angle…`}
        />
        <span className="ww-proto-stylelock">Style key: <b>{subj.locked ? subj.locked + ' locked' : 'unlocked'}</b></span>
        <button className="ww-btn primary" style={{ padding: '9px 16px', fontSize: 12 }}
          onClick={() => { onExplore(subj.id); setPrompt(''); }}>
          Generate
        </button>
      </div>

      {/* ── Variants grid ── */}
      <div className="ww-insp-sub" style={{ marginBottom: 12 }}>
        Variants · {subj.variants.length}
      </div>
      <div className="ww-vargrid">
        {subj.variants.map(v => (
          <VariantCard
            key={v.v}
            variant={v}
            isLocked={subj.locked === v.v}
            subjId={subj.id}
            onLock={() => onLock(subj.id, v.v)}
            onSetState={onSetState}
          />
        ))}
        <button className="ww-vargen" onClick={() => onExplore(subj.id)}>
          <b>＋</b>
          <span>New exploration</span>
        </button>
      </div>

      {/* ── History ── */}
      {subj.history.length > 0 && (
        <div style={{ marginTop: 34 }}>
          <div className="ww-insp-sub" style={{ marginBottom: 10 }}>History · {subj.history.length}</div>
          <div className="ww-sheet-history">
            {subj.history.map((h, i) => (
              <div key={i} className={cx('ww-histrow', h.when.toLowerCase().includes('lock') && 'is-locked')}>
                <b>{h.v}</b>
                <span className="ww-hist-when">{h.when}</span>
                <span className="ww-hist-who">{h.who}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  VARIANT CARD
// ============================================================
function VariantCard({ variant, isLocked, subjId, onLock, onSetState }) {
  const meta = STATE_META[variant.state] || STATE_META.Explored;
  return (
    <div className={cx('ww-varcard', isLocked && 'is-locked')}>
      <div className="ww-varcard-art">
        <Scene kind={variant.scene} />
        <span className="ww-varcard-v">{variant.v}</span>
        {isLocked && <span className="ww-varcard-lock">● locked</span>}
        {!isLocked && variant.state === 'Candidate' && (
          <span className="ww-varcard-lock" style={{ background: 'rgba(243,178,60,.22)', color: '#f3b23c', boxShadow: 'none' }}>candidate</span>
        )}
      </div>
      <div className="ww-varcard-body">
        <div className="ww-varcard-state" style={{ color: meta.color }}>{variant.state}</div>
        <div className="ww-varcard-note">{variant.note}</div>
        <div className="ww-varcard-actions">
          {isLocked ? (
            <div className="ww-lockbtn is-locked">● Canonical</div>
          ) : (
            <button className="ww-lockbtn" onClick={onLock}>Lock canonical →</button>
          )}
          {!isLocked && variant.state !== 'Rejected' && (
            <button
              className="ww-varcard-dupe"
              title="Reject variant"
              onClick={() => onSetState(subjId, variant.v, 'Rejected')}
            >✕</button>
          )}
          {variant.state === 'Rejected' && (
            <button
              className="ww-varcard-dupe"
              title="Restore to candidate"
              onClick={() => onSetState(subjId, variant.v, 'Candidate')}
            >↩</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  MODEL SHEETS TAB
// ============================================================
function ModelSheets({ subjects }) {
  const locked = subjects.filter(s => s.locked && s.sheet);
  const pending = subjects.filter(s => !s.locked);

  return (
    <div className="ww-sheet">
      <div className="ww-sheet-top">
        <div>
          <div className="ww-pv-kicker">Visual Dev · Echo's Location</div>
          <h2>
            Model Sheets
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400, color: 'var(--ink2)', marginLeft: 10 }}>
              {locked.length} of {subjects.length}
            </span>
          </h2>
          <p>Canonical references — poses, expressions and palette — for every locked subject.</p>
        </div>
      </div>

      {locked.length === 0 ? (
        <div className="ww-sheet-empty">
          <b>No locked references yet</b>
          <p>Lock a variant in the Prototype board to generate a model sheet here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {locked.map((s, i) => <ModelSheetCard key={s.id} subject={s} last={i === locked.length - 1} />)}
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div className="ww-insp-sub" style={{ marginBottom: 14 }}>Awaiting lock · {pending.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(s => (
              <div key={s.id} className="ww-vd-pending-row">
                <div className="ww-vd-pending-th"><Scene kind={s.scene} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {s.kind} · {s.variants.length} exploration{s.variants.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="ww-sheet-unlocktag">No lock</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  MODEL SHEET CARD — one per locked subject
// ============================================================
function ModelSheetCard({ subject, last }) {
  const lockedVar = subject.variants.find(v => v.v === subject.locked);
  const hasExprs = subject.sheet.expressions && subject.sheet.expressions.length > 0;
  const poseCols = Math.min(subject.sheet.poses.length, 4);
  const exprCols = Math.min((subject.sheet.expressions || []).length, 4);

  return (
    <div style={{ paddingBottom: last ? 0 : 60, marginBottom: last ? 0 : 60, borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <div className="ww-sheet-top" style={{ marginBottom: 16 }}>
        <div>
          <h2>
            {subject.subject}
            <span className="ww-sheet-locktag" style={{ marginLeft: 10 }}>{subject.locked}</span>
          </h2>
          <p>{subject.brief}</p>
        </div>
        <button className="ww-btn ghost" style={{ flexShrink: 0, fontSize: 12 }}>Export reference ↗</button>
      </div>

      {/* Hero art */}
      <div className="ww-sheet-hero">
        <Scene kind={lockedVar?.scene || subject.scene} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(6,7,12,.75),transparent 52%)', zIndex: 2 }} />
        <div className="ww-sheet-hero-tag">
          {subject.kind} · Canonical · {subject.locked}
          {subject.history[0] && <span style={{ marginLeft: 10, opacity: .65 }}>· {subject.history[0].when}</span>}
        </div>
      </div>

      {/* Poses + Expressions / Notes */}
      <div className="ww-sheet-cols">
        <div className="ww-sheet-block">
          <div className="ww-insp-sub">Poses · {subject.sheet.poses.length}</div>
          <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${poseCols},1fr)` }}>
            {subject.sheet.poses.map((pose, i) => (
              <div key={i} className="ww-sheet-cell">
                <div className="ww-sheet-cell-art"><Scene kind={subject.scene} /></div>
                <span>{pose}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ww-sheet-block">
          {hasExprs ? (
            <>
              <div className="ww-insp-sub">Expressions · {subject.sheet.expressions.length}</div>
              <div className="ww-sheet-row" style={{ gridTemplateColumns: `repeat(${exprCols},1fr)` }}>
                {subject.sheet.expressions.map((expr, i) => (
                  <div key={i} className="ww-sheet-cell">
                    <div className="ww-sheet-cell-art"><Scene kind={subject.scene} /></div>
                    <span>{expr}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="ww-insp-sub">Notes</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.6 }}>
                {subject.kind === 'Location'
                  ? 'Location reference — no expression sheet. Poses cover the key camera angles and compositional beats across the season.'
                  : 'Prop reference — poses cover close-up, in-context, and photographed detail shots for visual continuity.'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Palette */}
      <div style={{ marginTop: 22 }}>
        <div className="ww-insp-sub" style={{ marginBottom: 12 }}>Palette · {subject.sheet.palette.length} swatches</div>
        <div className="ww-sheet-pal">
          {subject.sheet.palette.map((col, i) => (
            <div key={i} className="ww-sheet-pal-sw">
              <i style={{ background: col }} />
              <span style={{ textTransform: 'uppercase' }}>{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {subject.history.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div className="ww-insp-sub" style={{ marginBottom: 10 }}>Lock history</div>
          <div className="ww-sheet-history">
            {subject.history.map((h, i) => (
              <div key={i} className={cx('ww-histrow', i === 0 && 'is-locked')}>
                <b>{h.v}</b>
                <span className="ww-hist-when">{h.when}</span>
                <span className="ww-hist-who">{h.who}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { VisualDev });
