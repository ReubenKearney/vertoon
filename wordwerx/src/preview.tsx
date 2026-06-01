import React from 'react';
import { cx } from './ui';
import { FxChip } from './ui';
import { EPISODE } from './data';
import { Scene } from './scenes';

function parallaxStrength(p: any) { const f = p.fx.find((x: any) => x.type === 'parallax' && x.on); return f ? (f.params.Strength / 100) * 1.45 : 0.55; }
function hasFx(p: any, t: string) { return p.fx.some((f: any) => f.type === t && f.on); }
function soundLabel(p: any) { const f = p.fx.find((x: any) => x.type === 'sound' && x.on); return f ? f.params.Source : ''; }
function flashColor(p: any) { const f = p.fx.find((x: any) => x.type === 'impact' && x.on); const c = f ? f.params.Flash : 'White'; return ({ White: '#fff', Red: 'oklch(0.7 0.2 25)', Black: '#000' } as any)[c] || '#fff'; }
function tapPayload(p: any) {
  const f = p.fx.find((x: any) => x.type === 'tap' && x.on); const a = f ? f.params.Action : '';
  if (p.scene === 'lantern_hub') return 'Logbook found';
  if (p.scene === 'logbook') return 'Branch: photograph / flee';
  return a;
}

export function Preview({ panels }: any) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const panelRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = React.useState(0);
  const [flashKey, setFlashKey] = React.useState(0);
  const [auto, setAuto] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [taps, setTaps] = React.useState<Record<string, boolean>>({});
  const lastActive = React.useRef(-1);

  React.useEffect(() => {
    let raf: number;
    const loop = () => {
      const c = scroller.current;
      if (c) {
        const vh = c.clientHeight, vc = vh / 2;
        let best = 0, bestD = 1e9;
        panels.forEach((p: any, i: number) => {
          const el = panelRefs.current[p.id]; if (!el) return;
          const top = el.offsetTop - c.scrollTop;
          const center = top + el.offsetHeight / 2;
          const pv = Math.max(-1.3, Math.min(1.3, (center - vc) / vh));
          const scene = el.querySelector('.ww-scene') as HTMLElement | null;
          if (scene) scene.style.setProperty('--p', String(-pv * (parallaxStrength(p))));
          if (center < vh * 0.9) el.classList.add('is-in'); else el.classList.remove('is-in');
          const d = Math.abs(center - vc);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best !== lastActive.current) {
          lastActive.current = best; setActive(best);
          if (hasFx(panels[best], 'impact')) setFlashKey(k => k + 1);
        }
        const max = c.scrollHeight - c.clientHeight;
        setProgress(max > 0 ? c.scrollTop / max : 0);
        if (auto && max > 0) { c.scrollTop = Math.min(max, c.scrollTop + 1.1); if (c.scrollTop >= max) setAuto(false); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [panels, auto]);

  const cur = panels[active] || panels[0];
  const restart = () => { if (scroller.current) scroller.current.scrollTop = 0; setAuto(true); };

  return (
    <div className="ww-preview">
      <div className="ww-preview-sidecopy">
        <div className="ww-pv-kicker">Read mode · live</div>
        <h2>{EPISODE.series}</h2>
        <div className="ww-pv-ep">{EPISODE.number} — {EPISODE.title}</div>
        <p className="ww-pv-now">Now reading</p>
        <div className="ww-pv-beat"><b>{String(cur.n).padStart(2, '0')}</b> {cur.slug}<span>{cur.beat}</span></div>
        <div className="ww-pv-active-fx">
          {cur.fx.filter((f: any) => f.on).map((f: any) => <FxChip key={f.id} type={f.type} small />)}
        </div>
        <div className="ww-pv-controls">
          <button className={cx('ww-pv-btn', auto && 'is-on')} onClick={() => setAuto(a => !a)}>{auto ? '⏸ Pause' : '▶ Auto-scroll'}</button>
          <button className="ww-pv-btn ghost" onClick={restart}>↺ Replay</button>
        </div>
        <div className="ww-pv-hint">Scroll inside the phone — or hit auto-scroll. Tap the glowing rings.</div>
      </div>

      <div className="ww-phone">
        <div className="ww-phone-notch" />
        <div className="ww-reader" ref={scroller}>
          {panels.map((p: any, i: number) => {
            const reveal = p.fx.find((f: any) => f.type === 'reveal' && f.on);
            const tap = p.fx.find((f: any) => f.type === 'tap' && f.on);
            const loop = p.fx.find((f: any) => f.type === 'loop' && f.on);
            const pace = p.fx.find((f: any) => f.type === 'pacing' && f.on);
            return (
              <section key={p.id} ref={(el: HTMLElement | null) => { panelRefs.current[p.id] = el; }}
                className="ww-rpanel" data-motion={reveal ? reveal.params.Motion : 'Fade'}
                style={{ '--rev-dur': (reveal ? reveal.params.Duration : 0.8) + 's', '--rev-dist': (reveal ? reveal.params.Distance : 0) + 'px' } as any}>
                <div className={cx('ww-rev-art', reveal && 'ww-rev')}><Scene kind={p.scene} loop={loop ? loop.params.Kind : null} /></div>
                <div className="ww-rpanel-grade" />
                {p.dialogue
                  ? <div className="ww-rev ww-rdlg"><span className="ww-rdlg-name">{p.speaker}</span>{p.dialogue}</div>
                  : p.caption ? <div className="ww-rev ww-rcap">{p.caption}</div> : null}
                {pace && <div className="ww-rev ww-rpace">{pace.params.Mode} · {pace.params.Length}s</div>}
                {tap && (
                  <button className={cx('ww-hotspot', taps[p.id] && 'is-done')} onClick={() => setTaps(t => ({ ...t, [p.id]: !t[p.id] }))}>
                    <span className="ww-hot-ring" />
                    {taps[p.id] ? <span className="ww-hot-reveal">{tapPayload(p)}</span> : <span className="ww-hot-label">tap</span>}
                  </button>
                )}
                {active === i && hasFx(p, 'sound') && (
                  <div className="ww-rsound"><span className="ww-eq"><i /><i /><i /></span>{soundLabel(p)}</div>
                )}
              </section>
            );
          })}
          <section className="ww-rpanel ww-rend"><div>"{EPISODE.title}"<span>End of Episode 01</span></div></section>
        </div>
        <div key={flashKey} className={cx('ww-flash', hasFx(cur, 'impact') && 'go')} style={{ '--flash': flashColor(cur) } as any} />
        <div className="ww-phone-rail"><div className="ww-phone-rail-fill" style={{ height: (progress * 100) + '%' }} /></div>
      </div>
    </div>
  );
}
