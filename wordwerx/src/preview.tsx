import { cx } from './ui';
import { FxChip } from './ui';
import { EPISODE } from './data';
import { Scene } from './scenes';
import { usePreviewEngine, hasFx, soundLabel, flashColor, tapPayload, mapEasing } from './preview-engine';

export function Preview({ panels }: any) {
  const { scroller, panelRefs, active, flashKey, auto, setAuto, progress, taps, setTaps, restart } = usePreviewEngine(panels);

  const cur = panels[active] || panels[0];

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
                style={{ '--rev-dur': (reveal ? reveal.params.Duration : 0.8) + 's', '--rev-dist': (reveal ? reveal.params.Distance : 0) + 'px', '--rev-ease': mapEasing(reveal ? reveal.params.Easing : 'ease-out') } as any}>
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
