import React from 'react';

// ── effect param helpers (shared with the view) ───────────────────────────
export function parallaxStrength(p: any) { const f = p.fx.find((x: any) => x.type === 'parallax' && x.on); return f ? (f.params.Strength / 100) * 1.45 : 0.55; }
export function hasFx(p: any, t: string) { return p.fx.some((f: any) => f.type === t && f.on); }
export function soundLabel(p: any) { const f = p.fx.find((x: any) => x.type === 'sound' && x.on); return f ? f.params.Source : ''; }
export function flashColor(p: any) { const f = p.fx.find((x: any) => x.type === 'impact' && x.on); const c = f ? f.params.Flash : 'White'; return ({ White: '#fff', Red: 'oklch(0.7 0.2 25)', Black: '#000' } as any)[c] || '#fff'; }
export function tapPayload(p: any) {
  const f = p.fx.find((x: any) => x.type === 'tap' && x.on); const a = f ? f.params.Action : '';
  if (p.scene === 'lantern_hub') return 'Logbook found';
  if (p.scene === 'logbook') return 'Branch: photograph / flee';
  return a;
}

// reveal easing: map the authored enum onto a CSS timing function
export function mapEasing(e: string) {
  if (e === 'spring') return 'cubic-bezier(.34,1.56,.64,1)';
  if (e === 'ease-in-out') return 'ease-in-out';
  if (e === 'linear') return 'linear';
  return 'ease-out';
}

// per-axis parallax offset for a panel, given the smoothed scroll position pv
function parallaxOffset(p: any, pv: number): { px: number; py: number } {
  const f = p.fx.find((x: any) => x.type === 'parallax' && x.on);
  const axis = f ? f.params.Axis : 'Vertical';
  const anchor = f ? f.params.Anchor : 'Center';
  const strength = parallaxStrength(p);
  const anchorBias = anchor === 'Top' ? -0.5 : anchor === 'Bottom' ? 0.5 : 0;
  const adj = pv - anchorBias;
  const base = -adj * strength;
  const py = axis === 'Horizontal' ? 0 : base;
  const px = (axis === 'Horizontal' || axis === 'Both') ? base * 0.6 : 0;
  return { px, py };
}

export function usePreviewEngine(panels: any[]) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const panelRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const [active, setActive] = React.useState(0);
  const [flashKey, setFlashKey] = React.useState(0);
  const [auto, setAuto] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [taps, setTaps] = React.useState<Record<string, boolean>>({});
  const lastActive = React.useRef(-1);
  const pvSmooth = React.useRef<Record<string, number>>({});

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
          const pvTarget = Math.max(-1.3, Math.min(1.3, (center - vc) / vh));
          // lerp toward the target so layers feel weighted, not snappy
          const prev = pvSmooth.current[p.id] ?? pvTarget;
          const pv = prev + (pvTarget - prev) * 0.12;
          pvSmooth.current[p.id] = pv;
          const scene = el.querySelector('.ww-scene') as HTMLElement | null;
          if (scene) {
            const { px, py } = parallaxOffset(p, pv);
            scene.style.setProperty('--px', String(px));
            scene.style.setProperty('--py', String(py));
          }
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

  const restart = () => { if (scroller.current) scroller.current.scrollTop = 0; setAuto(true); };

  return { scroller, panelRefs, active, flashKey, auto, setAuto, progress, taps, setTaps, restart };
}
