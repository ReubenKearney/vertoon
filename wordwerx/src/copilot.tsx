import React from 'react';
import { cx } from './ui';
import { COPILOT } from './data';
import { COPILOT_X } from './world';

function stageLabel(s: string) {
  return ({ story: 'Story', library: 'Library', compose: 'Compose', preview: 'Preview', publish: 'Publish', narrative: 'Narrative', visual: 'Visual Dev' } as any)[s] || s;
}

function stageHint(s: string) {
  return ({
    story: 'I can tighten loglines, check Echo\'s portrayal rules, or break beats into panels.',
    library: 'I can generate missing character plates or unify your colour grade.',
    compose: 'I can pace a sequence, suggest transitions, or wire up scroll effects.',
    preview: 'I can run a readability pass and flag contrast or pacing issues.',
    publish: 'I can optimise the bundle and write share copy.',
    narrative: 'I can audit a character\'s arc, find soft beats, or balance the tension curve.',
    visual: 'I can flag off-model assets, suggest what to lock next, or hold the style key.',
  } as any)[s] || '';
}

function pickAction(s: string) {
  return ({
    library: { label: 'Generate 8 plates', kind: 'generate' },
    compose: { label: 'Apply suggested pacing', kind: 'pacing' },
    story: { label: 'Insert beat', kind: 'beat' },
    preview: { label: 'Add caption scrim', kind: 'scrim' },
    publish: { label: 'Enable lazy-load', kind: 'opt' },
    narrative: { label: 'Insert beat', kind: 'beat' },
    visual: { label: 'Lock the Lantern Hub', kind: 'lock' },
  } as any)[s] || { label: 'Apply', kind: 'noop' };
}

function improvise(text: string, _stage: string) {
  const t = text.toLowerCase();
  if (t.includes('echo')) return 'Echo stays voice-only per your bible — no avatar, explicit physical limits, at least one hesitation. I\'d keep her line in panel 9 and let the silence in panel 10 do the work.';
  if (t.includes('pac') || t.includes('slow') || t.includes('fast')) return 'The crisis (panels 7–10) is your fastest stretch. A Hold beat before the hatch and a Scroll-lock on the call will give the rescue more weight.';
  if (t.includes('colou') || t.includes('color') || t.includes('grade')) return 'Your dusk key is a warm amber over cool indigo. Panels 5–8 drift warm; I can pull them back toward the indigo shadow to keep the night feeling lethal.';
  if (t.includes('sound') || t.includes('audio') || t.includes('sfx')) return 'I\'d layer a continuous tunnel hum under panel 8, then drop everything to near-silence for the locked hatch — the mosquito whine becomes the only thing the reader hears.';
  return 'Noted. Based on the episode beats, I\'d keep the cold open conversational and let the first real motion effect land on the lockdown (panel 4) so the city "closing" is felt, not told.';
}

// The canned Q&A + improvised replies are authored around the seed series
// ("Echo's Location"). For any other series we scope them off and fall back to a
// generic, honest reply rather than confidently citing Echo's beats and palette.
function genericReply(_text: string, stage: string) {
  return `I'm tuned to "Echo's Location" right now, so I'll hold off on specifics for this series. Tell me what you're going for on ${stageLabel(stage).toLowerCase()} and I'll think it through with you — per-series co-pilot tuning is on the way.`;
}

export function Copilot({ stage, open, onClose, onApply, episode, seed = true }: any) {
  const seeds = seed ? (COPILOT[stage] || COPILOT_X[stage] || []) : [];
  const [log, setLog] = React.useState([
    { who: 'ai', text: `I'm watching the ${stageLabel(stage)} stage. Ask me anything about "${episode.title}", or try a suggestion.` },
  ]);
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLog([{ who: 'ai', text: `Now on the ${stageLabel(stage)} stage. ${stageHint(stage)}` }]);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [log, busy]);

  function ask(text: string, cannedAnswer?: string) {
    if (!text.trim()) return;
    setLog(l => [...l, { who: 'me', text }]); setDraft(''); setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setLog(l => [...l, { who: 'ai', text: cannedAnswer || (seed ? improvise(text, stage) : genericReply(text, stage)), action: cannedAnswer ? pickAction(stage) : null } as any]);
    }, 850);
  }

  if (!open) return null;
  return (
    <aside className="ww-copilot">
      <header className="ww-cop-head">
        <div className="ww-cop-title"><span className="ww-cop-orb" /> Sherlock <span className="ww-cop-stage">{stageLabel(stage)}</span></div>
        <button className="ww-icbtn" onClick={onClose}>✕</button>
      </header>
      <div className="ww-cop-body" ref={bodyRef}>
        {log.map((m: any, i) => (
          <div key={i} className={cx('ww-msg', m.who === 'me' ? 'is-me' : 'is-ai')}>
            <div className="ww-bubble">{m.text}</div>
            {m.action && <button className="ww-apply" onClick={() => onApply && onApply(m.action)}>{m.action.label}</button>}
          </div>
        ))}
        {busy && <div className="ww-msg is-ai"><div className="ww-bubble ww-typing"><i /><i /><i /></div></div>}
      </div>
      <div className="ww-cop-sugg">
        {seeds.map((s: any, i: number) => <button key={i} className="ww-sugg" onClick={() => ask(s.q, s.a)}>{s.q}</button>)}
      </div>
      <form className="ww-cop-input" onSubmit={e => { e.preventDefault(); ask(draft); }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Ask about ${stageLabel(stage).toLowerCase()}…`} />
        <button type="submit" disabled={!draft.trim()}>↑</button>
      </form>
    </aside>
  );
}
