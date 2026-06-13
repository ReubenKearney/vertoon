import React from 'react';

// ── On-canvas text objects ──────────────────────────────────────────────────
// A panel's text rendered as positioned webtoon lettering: speech bubbles,
// caption boxes and SFX type. `dialogue`/`caption` objects are PLACEMENT
// records only — their content always reads from panel.dialogue / panel.caption
// (the Script tab stays the writing surface, so the two can never diverge).
// Extra balloons ('bubble') and 'sfx' own their text.
//
// TextObjectStatic is hook-free on purpose: the Publish exporter renders the
// same component with renderToStaticMarkup, so Compose, Preview and the
// exported .html share one renderer and one stylesheet (TEXT_OBJECT_CSS).
// All metrics use cqw against the .ww-tolayer container, so lettering scales
// with the rendered panel width on every surface.

export interface TextObject {
  id: string;
  kind: 'dialogue' | 'caption' | 'bubble' | 'sfx';
  x: number; y: number; w: number;            // % of panel frame
  tail?: { dx: number; dy: number };          // dx: % of bubble width from center; dy sign picks edge
  text?: string; speaker?: string; delivery?: string;
  size?: number; rot?: number; hue?: number;  // sfx styling (size = multiplier)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const DEFAULT_TAIL = { dx: -12, dy: 12 };

// Resolve the panel's text objects, materialising default-positioned records
// for dialogue/caption fields that have no placement yet (legacy panels).
export function effectiveTextObjects(panel: any): TextObject[] {
  const stored: TextObject[] = panel.textObjects || [];
  const out: TextObject[] = [];
  const hasDlg = !!panel.dialogue, hasCap = !!panel.caption;
  for (const t of stored) {
    if (t.kind === 'dialogue' && !hasDlg) continue;
    if (t.kind === 'caption' && !hasCap) continue;
    out.push(t);
  }
  if (hasDlg && !stored.some(t => t.kind === 'dialogue')) {
    out.unshift({ id: 'to-dlg', kind: 'dialogue', x: 7, y: 66, w: 62, tail: DEFAULT_TAIL });
  }
  if (hasCap && !stored.some(t => t.kind === 'caption')) {
    out.unshift({ id: 'to-cap', kind: 'caption', x: 6, y: 80, w: 80 });
  }
  return out;
}

export function textOf(t: TextObject, panel: any): string {
  return t.kind === 'dialogue' ? (panel.dialogue || '') : t.kind === 'caption' ? (panel.caption || '') : (t.text || '');
}
function deliveryOf(t: TextObject, panel: any): string {
  return (t.kind === 'dialogue' ? panel.delivery : t.delivery) || 'Spoken';
}
const dcls = (d: string) => 'is-' + d.toLowerCase().replace(/[^a-z]/g, '');

// Hook-free renderer shared by Compose, Preview and the Publish export.
export function TextObjectStatic({ t, panel, children }: { t: TextObject; panel: any; children?: React.ReactNode }) {
  const text = textOf(t, panel);
  if (!text && !children) return null;
  const isBubble = t.kind === 'dialogue' || t.kind === 'bubble';
  const delivery = deliveryOf(t, panel);
  const dCls = dcls(delivery);
  const noTail = delivery === 'Voice-over' || delivery === 'Off-screen';
  const tail = t.tail || DEFAULT_TAIL;
  const tailTop = tail.dy < 0;
  const style: any = { left: t.x + '%', top: t.y + '%', width: t.w + '%' };
  if (t.kind === 'sfx') {
    style['--sfx-size'] = String(t.size ?? 1);
    style['--sfx-rot'] = (t.rot ?? 0) + 'deg';
    if (t.hue != null) style['--sfx-hue'] = String(t.hue);
  }
  const speaker = t.kind === 'dialogue' ? panel.speaker : t.speaker;
  return (
    <div className={`ww-to ww-to-${t.kind === 'bubble' ? 'dialogue' : t.kind} ${dCls}`} style={style} data-toid={t.id}>
      {isBubble && speaker ? <span className="ww-to-speaker">{speaker}</span> : null}
      <span className="ww-to-body">{children ?? text}</span>
      {isBubble && !noTail && (delivery === 'Thought'
        ? <span className={`ww-to-dots${tailTop ? ' is-top' : ''}`} style={{ left: `calc(50% + ${clamp(tail.dx, -42, 42)}%)` }}><i /><i /></span>
        : <span className={`ww-to-tail${tailTop ? ' is-top' : ''}`} style={{ left: `calc(50% + ${clamp(tail.dx, -42, 42)}%)`, transform: `translateX(-50%) skewX(${(-clamp(tail.dx, -42, 42) * 0.7).toFixed(1)}deg)` }} />)}
    </div>
  );
}

// One stylesheet, three surfaces: injected at runtime for the app, embedded in
// the Publish <style>. Literal colors only — no app CSS vars in here.
export const TEXT_OBJECT_CSS = `
.ww-tolayer{position:absolute;inset:0;container-type:inline-size;pointer-events:none;z-index:4;}
.ww-tolayer.is-edit .ww-to{pointer-events:auto;}
.ww-to{position:absolute;}
.ww-to-body{display:block;}
/* speech bubble (dialogue + extra balloons) */
.ww-to-dialogue .ww-to-body{background:#fdfdfa;color:#16171c;font-size:3.6cqw;line-height:1.42;text-align:center;
  padding:2.4cqw 3cqw;border-radius:4.2cqw;box-shadow:0 .3cqw 1.4cqw rgba(0,0,0,.35);overflow-wrap:break-word;}
.ww-to-speaker{position:absolute;bottom:100%;left:1cqw;margin-bottom:.8cqw;font-family:ui-monospace,monospace;font-weight:700;
  font-size:2cqw;letter-spacing:.16em;text-transform:uppercase;color:#16d6b4;text-shadow:0 1px .8cqw rgba(0,0,0,.9);white-space:nowrap;}
.ww-to-tail{position:absolute;bottom:-2.3cqw;width:3.6cqw;height:2.6cqw;background:#fdfdfa;clip-path:polygon(8% 0,92% 0,42% 100%);}
.ww-to-tail.is-top{bottom:auto;top:-2.3cqw;clip-path:polygon(42% 0,8% 100%,92% 100%);}
.ww-to-dots{position:absolute;bottom:-4.6cqw;transform:translateX(-50%);display:flex;flex-direction:column;gap:.7cqw;align-items:center;}
.ww-to-dots.is-top{bottom:auto;top:-4.6cqw;flex-direction:column-reverse;}
.ww-to-dots i{width:1.7cqw;height:1.7cqw;border-radius:50%;background:#fdfdfa;box-shadow:0 .2cqw .8cqw rgba(0,0,0,.3);}
.ww-to-dots i:last-child{width:1cqw;height:1cqw;}
/* delivery variants */
.ww-to-dialogue.is-shouted .ww-to-body{font-weight:800;text-transform:uppercase;letter-spacing:.04em;font-size:4.2cqw;border-radius:1cqw;
  clip-path:polygon(2% 14%,7% 2%,16% 10%,26% 0,34% 9%,46% 1%,56% 10%,67% 0,76% 9%,88% 2%,97% 12%,100% 30%,96% 44%,100% 60%,95% 74%,99% 88%,90% 99%,78% 93%,66% 100%,54% 92%,42% 100%,30% 93%,18% 99%,8% 92%,1% 84%,4% 68%,0 52%,4% 34%);padding:4cqw 5cqw;}
.ww-to-dialogue.is-whispered .ww-to-body{background:rgba(253,253,250,.88);color:#3c3e46;font-style:italic;font-size:3.2cqw;
  border:.3cqw dashed #71747f;box-shadow:none;}
.ww-to-dialogue.is-whispered .ww-to-tail{background:rgba(253,253,250,.88);}
.ww-to-dialogue.is-thought .ww-to-body{border-radius:50% 50% 50% 50% / 42% 42% 42% 42%;font-style:italic;color:#3a3c44;padding:3.4cqw 4cqw;}
.ww-to-dialogue.is-voiceover .ww-to-body,.ww-to-dialogue.is-offscreen .ww-to-body{background:rgba(14,16,22,.86);color:#f2f1ee;text-align:left;
  border-radius:.8cqw;border-left:.5cqw solid #16d6b4;padding:2.2cqw 2.8cqw;font-size:3.3cqw;}
.ww-to-dialogue.is-sung .ww-to-body{font-style:italic;border-radius:6cqw;}
.ww-to-dialogue.is-sung .ww-to-body::before{content:"♪ ";}
.ww-to-dialogue.is-sung .ww-to-body::after{content:" ♪";}
/* caption box */
.ww-to-caption .ww-to-body{background:rgba(8,10,15,.82);color:#f3f1ed;font-size:3.3cqw;line-height:1.5;padding:2.2cqw 2.8cqw;
  border-radius:.8cqw;text-wrap:pretty;}
/* sfx display type */
.ww-to-sfx .ww-to-body{font-family:Impact,'Arial Black',system-ui,sans-serif;font-weight:900;text-transform:uppercase;
  font-size:calc(9cqw * var(--sfx-size,1));line-height:1;letter-spacing:.02em;color:oklch(0.82 0.19 var(--sfx-hue,75));
  -webkit-text-stroke:calc(.5cqw * var(--sfx-size,1)) #0a0b10;paint-order:stroke fill;
  transform:rotate(var(--sfx-rot,0deg));transform-origin:center;text-shadow:0 .6cqw 1.6cqw rgba(0,0,0,.5);overflow-wrap:break-word;}
`;

export function injectTextObjectCss() {
  if (document.getElementById('ww-to-css')) return;
  const s = document.createElement('style');
  s.id = 'ww-to-css';
  s.textContent = TEXT_OBJECT_CSS;
  document.head.appendChild(s);
}

// ── Editable wrapper (Compose only) ─────────────────────────────────────────
// Pointer-drag to place, right-edge handle to resize, tail handle to aim the
// balloon tail, double-click to edit text in place.
export function TextObjectEditable({ t, panel, selected, onSelect, onChange, onText }: {
  t: TextObject; panel: any; selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<TextObject>) => void;
  onText: (t: TextObject, text: string) => void;
}) {
  React.useEffect(injectTextObjectCss, []);
  const ref = React.useRef<HTMLDivElement>(null);
  const [editing, setEditing] = React.useState(false);
  const drag = React.useRef<{ mode: 'move' | 'resize' | 'tail'; sx: number; sy: number; ox: number; oy: number; ow: number; odx: number; ody: number; fw: number; fh: number } | null>(null);

  const start = (e: React.PointerEvent, mode: 'move' | 'resize' | 'tail') => {
    if (editing) return;
    const layer = ref.current?.parentElement;
    if (!layer) return;
    const r = layer.getBoundingClientRect();
    const tail = t.tail || DEFAULT_TAIL;
    drag.current = { mode, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, ow: t.w, odx: tail.dx, ody: tail.dy, fw: r.width, fh: r.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation(); e.preventDefault();
    onSelect(t.id);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = ((e.clientX - d.sx) / d.fw) * 100;
    const dy = ((e.clientY - d.sy) / d.fh) * 100;
    if (d.mode === 'move') onChange(t.id, { x: clamp(d.ox + dx, -8, 92), y: clamp(d.oy + dy, -2, 94) });
    else if (d.mode === 'resize') onChange(t.id, { w: clamp(d.ow + dx, 12, 96) });
    else {
      // tail: horizontal slides along the edge (in % of bubble width), vertical past the midline flips edges
      const bw = (d.ow / 100) * d.fw;
      const ndx = clamp(d.odx + ((e.clientX - d.sx) / bw) * 100, -42, 42);
      const ndy = (e.clientY - d.sy) / d.fh * 100 + d.ody;
      onChange(t.id, { tail: { dx: ndx, dy: ndy < 0 ? -12 : 12 } });
    }
  };
  const end = () => { drag.current = null; };

  const commitText = (el: HTMLElement) => {
    setEditing(false);
    onText(t, (el.innerText || '').trim());
  };

  return (
    <div ref={ref} className={`ww-to-edit${selected ? ' is-to-sel' : ''}`}
      style={{ position: 'absolute', left: t.x + '%', top: t.y + '%', width: t.w + '%', pointerEvents: 'auto' }}
      onClick={e => { e.stopPropagation(); onSelect(t.id); }}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
      onPointerDown={e => start(e, 'move')} onPointerMove={move} onPointerUp={end}>
      <InnerStatic t={t} panel={panel} editing={editing} onCommit={commitText} />
      {selected && !editing && (
        <>
          <span className="ww-to-handle ww-to-handle-w" title="Resize" onPointerDown={e => start(e, 'resize')} onPointerMove={move} onPointerUp={end} />
          {(t.kind === 'dialogue' || t.kind === 'bubble') && deliveryOf(t, panel) !== 'Voice-over' && deliveryOf(t, panel) !== 'Off-screen' && (
            <span className="ww-to-handle ww-to-handle-tail" title="Aim tail" onPointerDown={e => start(e, 'tail')} onPointerMove={move} onPointerUp={end} />
          )}
        </>
      )}
    </div>
  );
}

// The static renderer re-positioned to fill its editable wrapper (the wrapper
// owns x/y/w; the inner object renders at 0,0 / 100% width).
function InnerStatic({ t, panel, editing, onCommit }: any) {
  const zero = { ...t, x: 0, y: 0, w: 100 };
  if (!editing) return <TextObjectStatic t={zero} panel={panel} />;
  return (
    <TextObjectStatic t={zero} panel={panel}>
      <span
        contentEditable suppressContentEditableWarning
        className="ww-to-editfield"
        ref={el => { if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); } }}
        onBlur={e => onCommit(e.currentTarget)}
        onKeyDown={e => { if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur(); e.stopPropagation(); }}
        onPointerDown={e => e.stopPropagation()}
      >{textOf(t, panel)}</span>
    </TextObjectStatic>
  );
}
