import React from 'react';
import { cx } from './ui';
import { FxChip } from './ui';
import { PanelArt } from './panel-art';
import { effectiveTextObjects, TextObjectStatic, injectTextObjectCss } from './text-objects';
import { usePreviewEngine, hasFx, soundLabel, flashColor, tapPayload, mapEasing } from './preview-engine';

export function Preview({ panels, episode, links }: any) {
  const { scroller, panelRefs, active, flashKey, shakeKey, shakeAmp, auto, setAuto, progress, taps, setTaps, holdingId, restart } = usePreviewEngine(panels);
  const phoneRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(injectTextObjectCss, []);

  // Impact shake: a one-shot Web Animation on the phone frame (not the scroller, so
  // scrollTop/parallax are untouched). WAA survives the engine's per-frame re-renders,
  // and avoids setState-in-effect cascading renders.
  React.useEffect(() => {
    const el = phoneRef.current;
    if (!el || shakeKey === 0) return;
    const a = shakeAmp;
    el.animate([
      { transform: 'translate3d(0,0,0)' },
      { transform: `translate3d(${a * -5}px, ${a * 3}px, 0)`, offset: 0.1 },
      { transform: `translate3d(${a * 6}px, ${a * -4}px, 0)`, offset: 0.25 },
      { transform: `translate3d(${a * -5}px, ${a * 4}px, 0)`, offset: 0.4 },
      { transform: `translate3d(${a * 4}px, ${a * -3}px, 0)`, offset: 0.55 },
      { transform: `translate3d(${a * -3}px, ${a * 2}px, 0)`, offset: 0.7 },
      { transform: `translate3d(${a * 2}px, ${a * -1}px, 0)`, offset: 0.85 },
      { transform: 'translate3d(0,0,0)' },
    ], { duration: 420, easing: 'cubic-bezier(.36,.07,.19,.97)' });
  }, [shakeKey, shakeAmp]);

  const cur = panels[active] || panels[0];

  if (!cur) {
    return (
      <div className="ww-preview">
        <div className="ww-sheet-empty" style={{ margin: 'auto', maxWidth: 420 }}>
          <div className="ww-pv-kicker" style={{ marginBottom: 12 }}>Read mode</div>
          <b>Nothing to preview yet</b>
          <p>Add panels in Narrative → Storyboard or Production → Compose, then come back to read the episode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ww-preview">
      <div className="ww-preview-sidecopy">
        <div className="ww-pv-kicker">Read mode · live</div>
        <h2>{episode.series}</h2>
        <div className="ww-pv-ep">{episode.number} — {episode.title}</div>
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

      <div className="ww-phone" ref={phoneRef}>
        <div className="ww-phone-notch" />
        <div className="ww-reader" ref={scroller}>
          {panels.map((p: any, i: number) => {
            const reveal = p.fx.find((f: any) => f.type === 'reveal' && f.on);
            const tap = p.fx.find((f: any) => f.type === 'tap' && f.on);
            const loop = p.fx.find((f: any) => f.type === 'loop' && f.on);
            const pace = p.fx.find((f: any) => f.type === 'pacing' && f.on);
            const trans = p.fx.find((f: any) => f.type === 'transition' && f.on);
            return (
              <section key={p.id} ref={(el: HTMLElement | null) => { panelRefs.current[p.id] = el; }}
                className="ww-rpanel" data-motion={reveal ? reveal.params.Motion : 'Fade'}
                style={{ '--rev-dur': (reveal ? reveal.params.Duration : 0.8) + 's', '--rev-dist': (reveal ? reveal.params.Distance : 0) + 'px', '--rev-ease': mapEasing(reveal ? reveal.params.Easing : 'ease-out'),
                  // gutter: % of width so the authored 800px-space gap scales with the reader
                  marginBottom: p.gap ? ((p.gap / 800) * 100) + '%' : undefined } as any}>
                <div className={cx('ww-rev-art', reveal && 'ww-rev')}><PanelArt panel={p} links={links} loop={loop ? loop.params.Kind : null} loopDensity={loop ? loop.params.Density : 55} loopSpeed={loop ? loop.params.Speed : 1} /></div>
                <div className="ww-rpanel-grade" />
                <div className="ww-rev ww-tolayer">
                  {effectiveTextObjects(p).map((t: any) => <TextObjectStatic key={t.id} t={t} panel={p} />)}
                </div>
                {pace && <div className={cx('ww-rev ww-rpace', holdingId === p.id && 'is-holding')}>{pace.params.Mode} · {pace.params.Length}s</div>}
                {trans && <div className="ww-rtrans" data-trans={trans.params.Type} />}
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
          <section className="ww-rpanel ww-rend"><div>"{episode.title}"<span>End of Episode 01</span></div></section>
        </div>
        <div key={flashKey} className={cx('ww-flash', hasFx(cur, 'impact') && 'go')} style={{ '--flash': flashColor(cur) } as any} />
        <div className="ww-phone-rail"><div className="ww-phone-rail-fill" style={{ height: (progress * 100) + '%' }} /></div>
      </div>
    </div>
  );
}
