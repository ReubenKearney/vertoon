import React from 'react';
import { assetUrl } from './services/store';

const SCENE_CSS = `
@keyframes ww-flicker { 0%,100%{opacity:.9} 45%{opacity:.55} 50%{opacity:1} 60%{opacity:.7} }
@keyframes ww-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes ww-rain { 0%{background-position:0 0} 100%{background-position:0 600px} }
@keyframes ww-drift { 0%{transform:translate(0,0)} 100%{transform:translate(-40px,30px)} }
@keyframes ww-wave { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }
@keyframes ww-aberr { 0%,100%{transform:translateX(-2px);opacity:.5} 50%{transform:translateX(3px);opacity:.85} }
@keyframes ww-pulsering { 0%{transform:scale(.8);opacity:.9} 70%{opacity:.15} 100%{transform:scale(1.9);opacity:0} }
.ww-grain{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.5;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.ww-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 38%, transparent 40%, rgba(0,0,0,.55) 100%);}
.ww-scene{position:absolute;inset:0;overflow:hidden;background:#06070c;}
.ww-scene > *{position:absolute;}
.ww-insects{position:absolute;inset:0;background-image:radial-gradient(circle, rgba(20,20,25,.9) 1.2px, transparent 1.4px);background-size:34px 30px;animation:ww-drift 3s linear infinite alternate;}
@keyframes ww-static{0%,100%{opacity:var(--lo,.2)}33%{opacity:calc(var(--lo,.2) * 1.4)}50%{opacity:calc(var(--lo,.2) * .35)}}
.ww-loop{position:absolute;inset:0;pointer-events:none;}
.ww-loop-flicker{background:radial-gradient(120% 90% at 50% 42%, rgba(255,200,120,.55), transparent 68%);mix-blend-mode:screen;animation:ww-flicker 4s infinite;}
.ww-loop-breathe{background:radial-gradient(100% 82% at 50% 50%, transparent 52%, rgba(0,0,0,.6));animation:ww-breathe 4s ease-in-out infinite;}
.ww-loop-static{mix-blend-mode:overlay;animation:ww-static .4s steps(3) infinite;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
`;

export function injectSceneCss() {
  if (document.getElementById('ww-scene-css')) return;
  const s = document.createElement('style');
  s.id = 'ww-scene-css';
  s.textContent = SCENE_CSS;
  document.head.appendChild(s);
}

function Skyline({ tone = '#0c1018', n = 9 }: any) {
  const bars = [];
  for (let i = 0; i < n; i++) {
    const h = 18 + ((i * 47) % 60); const w = 100 / n;
    bars.push(<div key={i} style={{ position: 'absolute', bottom: 0, left: i * w + '%', width: w + 0.6 + '%', height: h + '%', background: tone, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.4)' }}>
      {(i % 2 === 0) && <div style={{ position: 'absolute', top: '18%', left: '30%', width: '8%', height: '6%', background: 'rgba(255,210,140,.5)' }} />}
    </div>);
  }
  return <div style={{ position: 'absolute', inset: 0 }}>{bars}</div>;
}

function Lamp({ x, y, s = 1, hue = 40 }: any) {
  return <div style={{ position: 'absolute', left: x, top: y, width: 6 * s, height: 6 * s, borderRadius: '50%', background: `oklch(0.85 0.14 ${hue})`, boxShadow: `0 0 ${18 * s}px ${8 * s}px oklch(0.78 0.16 ${hue} / .55)`, animation: 'ww-flicker 4s infinite' }} />;
}

function DepthTag({ label, d, x, y, tone }: any) {
  return <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: tone, textShadow: '0 1px 6px #000', whiteSpace: 'nowrap' }}>
    <span style={{ width: 7, height: 7, borderRadius: 2, background: tone, boxShadow: `0 0 10px ${tone}` }} />
    {label}<span style={{ opacity: .55 }}>·d{d}</span>
  </div>;
}

export const SCENES: Record<string, () => React.ReactElement> = {
  parallax_demo: () => (<React.Fragment>
    <div data-d="0" style={{ inset: '-12%', background: 'radial-gradient(120% 95% at 50% 32%, #14193a, #070811 76%)' }} />
    <div data-d="0.3" style={{ inset: '-14%', backgroundImage: 'radial-gradient(circle, rgba(123,97,255,.40) 1.6px, transparent 2.2px)', backgroundSize: '52px 52px' }}>
      <DepthTag label="Far" d="0.3" x="9%" y="13%" tone="rgba(150,128,255,.9)" />
    </div>
    <div data-d="0.95" style={{ inset: 0 }}>
      {[['16%', '34%', 64], ['68%', '24%', 86], ['44%', '66%', 54], ['80%', '60%', 40]].map(([x, y, s], i) =>
        <div key={i} style={{ position: 'absolute', left: x as string, top: y as string, width: s as number, height: s as number, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, rgba(22,214,180,.55), rgba(22,214,180,.10) 70%, transparent)', boxShadow: '0 0 26px rgba(22,214,180,.25)' }} />)}
      <DepthTag label="Mid" d="0.95" x="9%" y="50%" tone="rgba(22,214,180,.95)" />
    </div>
    <div data-d="1.9" style={{ inset: 0 }}>
      <div style={{ position: 'absolute', left: '14%', top: '20%', width: 46, height: 168, borderRadius: 8, background: 'linear-gradient(180deg,#fff,#b9a8ff)', boxShadow: '0 14px 40px rgba(123,97,255,.5)' }} />
      <div style={{ position: 'absolute', right: '16%', top: '40%', width: 56, height: 196, borderRadius: 8, background: 'linear-gradient(180deg,#eafff9,#16d6b4)', boxShadow: '0 14px 40px rgba(22,214,180,.5)' }} />
      <div style={{ position: 'absolute', left: '48%', bottom: '14%', width: 38, height: 120, borderRadius: 8, background: 'linear-gradient(180deg,#fff,#9aa0ff)', boxShadow: '0 12px 34px rgba(123,97,255,.45)' }} />
      <DepthTag label="Near" d="1.9" x="9%" y="84%" tone="#ffffff" />
    </div>
    <div style={{ inset: '9% 11%', border: '1px dashed rgba(255,255,255,.20)', borderRadius: 10 }} />
    <div style={{ left: '50%', top: '50%', width: 1, height: 40, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,.28)' }} />
    <div style={{ left: '50%', top: '50%', width: 40, height: 1, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,.28)' }} />
    <div style={{ left: '50%', bottom: '11%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>fixed frame</div>
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  dusk_skyline: () => (<React.Fragment>
    <div data-d="0" style={{ inset: '-6%', background: 'linear-gradient(180deg,#1a2740 0%,#4a3a55 42%,#9a5a4e 70%,#caa07a 92%)' }} />
    <div data-d="0.1" style={{ right: '16%', top: '30%', width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle,#ffd9a0,#e98a55 60%,transparent 72%)', filter: 'blur(2px)' }} />
    <div data-d="0.25" style={{ inset: 0 }}><Skyline tone="#20283a" n={11} /></div>
    <div data-d="0.55" style={{ inset: 0 }}><Skyline tone="#0c1018" n={7} /><Lamp x="18%" y="64%" /><Lamp x="46%" y="60%" s={1.2} /><Lamp x="78%" y="66%" /></div>
    <div data-d="0.9" style={{ left: 0, right: 0, bottom: 0, height: '34%', background: 'linear-gradient(0deg,#06070c,transparent)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  street_phone: () => (<React.Fragment>
    <div data-d="0.2" style={{ inset: '-6%', background: 'linear-gradient(180deg,#161a2c 0%,#2a2236 55%,#3a2a30 100%)' }} />
    <div data-d="0.3" style={{ left: '-10%', right: '-10%', bottom: 0, height: '46%', background: 'linear-gradient(0deg,#0a0c14,#0a0c1400)', clipPath: 'polygon(0 100%,100% 100%,72% 0,28% 0)' }} />
    <div data-d="0.45" style={{ inset: 0 }}><Lamp x="22%" y="34%" s={1.3} /><Lamp x="70%" y="40%" s={1.1} /></div>
    <div data-d="0.7" style={{ left: '42%', bottom: '6%', width: 56, height: '52%', background: 'linear-gradient(180deg,#11131c,#05060a)', borderRadius: '40% 40% 12% 12%' }} />
    <div data-d="0.85" style={{ left: '37%', bottom: '34%', width: 26, height: 34, borderRadius: 4, background: 'rgba(150,210,255,.85)', boxShadow: '0 0 26px 10px rgba(120,190,255,.45)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  lanternwrights: () => (<React.Fragment>
    <div data-d="0.1" style={{ inset: '-6%', background: 'radial-gradient(80% 60% at 50% 80%, #5a3a2e, #1a1626 70%)' }} />
    <div data-d="0.5" style={{ inset: 0 }}>
      {[20, 38, 54, 70].map((x, i) => <div key={i} style={{ position: 'absolute', left: x + '%', bottom: '8%', width: 30, height: 34 + (i % 2) * 8 + '%', background: '#070a12', borderRadius: '30% 30% 8% 8%' }} />)}
    </div>
    <div data-d="0.7" style={{ inset: 0 }}><Lamp x="26%" y="40%" s={1.2} /><Lamp x="44%" y="36%" /><Lamp x="60%" y="42%" s={1.1} /><Lamp x="76%" y="38%" /></div>
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  night_lockdown: () => (<React.Fragment>
    <div data-d="0" style={{ inset: '-6%', background: 'linear-gradient(180deg,#070a16 0%,#0d1228 60%,#161033 100%)' }} />
    <div data-d="0.3" style={{ inset: 0 }}><Skyline tone="#0a0e1c" n={11} /></div>
    <div data-d="0.6" style={{ inset: 0 }}>{[14, 30, 46, 62, 78, 90].map((x, i) => <Lamp key={i} x={x + '%'} y={(56 + (i % 3) * 6) + '%'} s={1.1} hue={45} />)}</div>
    <div data-d="0.6" style={{ left: 0, right: 0, bottom: 0, height: '20%', background: 'repeating-linear-gradient(90deg,#0a0e1c 0 6%,#10162a 6% 8%)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  lantern_hub: () => (<React.Fragment>
    <div data-d="0.15" style={{ inset: '-6%', background: 'radial-gradient(90% 80% at 60% 30%, #20263a, #080a12 75%)' }} />
    <div data-d="0.5" style={{ left: '8%', bottom: '10%', width: '30%', height: '60%', background: 'linear-gradient(180deg,#141a28,#080b14)', borderRadius: 4, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.04)' }} />
    <div data-d="0.5" style={{ right: '10%', bottom: '14%', width: '24%', height: '48%', background: 'linear-gradient(180deg,#141a28,#080b14)', borderRadius: 4 }} />
    <div data-d="0.5" style={{ right: '12%', top: '20%', width: 40, height: 40, borderRadius: '50%', border: '3px solid #2a3550', animation: 'ww-breathe 4s infinite' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  logbook: () => (<React.Fragment>
    <div data-d="0.2" style={{ inset: '-6%', background: 'radial-gradient(70% 60% at 50% 40%, #2a2336, #0a0910 80%)' }} />
    <div data-d="0.6" style={{ left: '20%', top: '24%', width: '60%', height: '54%', background: 'linear-gradient(160deg,#e7ddc8,#bcae8e)', borderRadius: 3, boxShadow: '0 18px 50px rgba(0,0,0,.6)', transform: 'rotate(-3deg)' }}>
      <div style={{ position: 'absolute', inset: '12% 10%', display: 'flex', alignItems: 'flex-end', gap: 5 }}>
        {[20, 32, 30, 46, 52, 70, 88].map((h, i) => <div key={i} style={{ flex: 1, height: h + '%', background: 'oklch(0.55 0.16 28)' }} />)}
      </div>
    </div>
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  mosquito: () => (<React.Fragment>
    <div data-d="0.3" style={{ inset: '-6%', background: 'radial-gradient(60% 50% at 50% 55%, #3a2a2a, #0a0708 80%)' }} />
    <div data-d="0.3" style={{ left: '10%', right: '10%', bottom: '16%', height: '40%', background: 'linear-gradient(180deg,#6a4d44,#241814)', borderRadius: '50% 50% 18% 18%', filter: 'blur(1px)' }} />
    <div data-d="0.8" style={{ left: '52%', top: '46%', width: 7, height: 7, borderRadius: '50%', background: '#0a0a0a', boxShadow: '0 0 0 2px rgba(0,0,0,.6)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  tunnels: () => (<React.Fragment>
    <div data-d="0.1" style={{ inset: '-6%', background: 'radial-gradient(40% 40% at 50% 50%, #1c2740, #04060c 72%)' }} />
    {[0.18, 0.3, 0.45, 0.64, 0.85].map((s, i) => <div key={i} data-d={String(0.3 + i * 0.16)} style={{ left: '50%', top: '50%', width: s * 100 + '%', height: s * 100 + '%', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `2px solid rgba(120,150,220,${0.35 - i * 0.05})`, boxShadow: `0 0 30px rgba(80,110,200,${0.2 - i * 0.03}) inset` }} />)}
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  echo_call: () => (<React.Fragment>
    <div data-d="0" style={{ inset: '-6%', background: 'radial-gradient(60% 50% at 50% 50%, #120e22, #030308 80%)' }} />
    <div data-d="0.6" style={{ left: 0, right: 0, top: '44%', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {Array.from({ length: 28 }).map((_, i) => <div key={i} style={{ width: 4, height: 60, transformOrigin: 'center', borderRadius: 2, background: `oklch(0.7 0.18 ${280 + (i % 5) * 6})`, animation: `ww-wave ${0.7 + (i % 6) * 0.12}s ease-in-out ${i * 0.04}s infinite` }} />)}
    </div>
    <div data-d="0.9" style={{ inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(120,90,230,.06) 3px 4px)', animation: 'ww-aberr 2.4s infinite' }} />
    <div className="ww-vig" />
  </React.Fragment>),

  locked_hatch: () => (<React.Fragment>
    <div data-d="0.1" style={{ inset: '-6%', background: 'radial-gradient(60% 60% at 50% 45%, #161a24, #030407 80%)' }} />
    <div data-d="0.6" style={{ left: '50%', top: '48%', width: 150, height: 150, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle,#1a1f2c,#0a0d14)', boxShadow: 'inset 0 0 0 6px #0c0f18, inset 0 0 0 10px #232a3a, 0 20px 60px rgba(0,0,0,.6)' }}>
      {[0, 60, 120, 180, 240, 300].map(a => <div key={a} style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: '50%', background: '#39435c', transform: `rotate(${a}deg) translateY(-58px)` }} />)}
    </div>
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  rescue: () => (<React.Fragment>
    <div data-d="0.2" style={{ inset: '-6%', background: 'radial-gradient(50% 70% at 50% 50%, #1a1626, #050609 78%)' }} />
    <div data-d="0.2" style={{ left: '50%', top: '50%', width: '46%', height: '78%', transform: 'translate(-50%,-50%)', background: 'linear-gradient(180deg,#ffe3b0,#ff9d5a)', filter: 'blur(8px)', opacity: 0.9, borderRadius: 8 }} />
    <div data-d="0.55" style={{ left: '42%', bottom: '8%', width: 64, height: '64%', background: '#070a12', borderRadius: '36% 36% 10% 10%' }} />
    <div data-d="0.85" style={{ left: '30%', top: '40%', width: '40%', height: '30%', background: 'radial-gradient(circle, rgba(220,240,255,.5), transparent 70%)', filter: 'blur(3px)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),

  aftermath: () => (<React.Fragment>
    <div data-d="0.2" style={{ inset: '-6%', background: 'radial-gradient(70% 60% at 50% 60%, #14131e, #060608 82%)' }} />
    <div data-d="0.6" style={{ left: '34%', bottom: '8%', width: 50, height: '46%', background: '#0a0c14', borderRadius: '36% 36% 8% 8%' }} />
    <div data-d="0.6" style={{ left: '52%', bottom: '8%', width: 56, height: '52%', background: '#0c0f18', borderRadius: '36% 36% 8% 8%' }} />
    <div data-d="0.3" style={{ left: '50%', top: '20%', width: 4, height: '60%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg,rgba(255,210,150,.4),transparent)' }} />
    <div className="ww-vig" /><div className="ww-grain" />
  </React.Fragment>),
};

// A continuous ambient loop overlay. Density (0-100) drives intensity/coverage;
// Speed (×) drives animation rate (faster = shorter duration).
export function LoopOverlay({ kind, density = 55, speed = 1 }: any) {
  const d = density / 100;
  const dur = (base: number) => (base / Math.max(0.2, speed)) + 's';
  switch (kind) {
    case 'Insect swarm':
      return <div className="ww-insects" style={{ opacity: 0.35 + d * 0.65, backgroundSize: `${44 - d * 18}px ${40 - d * 16}px`, animationDuration: dur(3) }} />;
    case 'Rain':
      return <div className="ww-loop" style={{ opacity: 0.3 + d * 0.7, backgroundImage: 'repeating-linear-gradient(105deg, rgba(180,200,230,.18) 0 1px, transparent 1px 7px)', animation: `ww-rain ${dur(0.7)} linear infinite` }} />;
    case 'Dust drift':
      return <div className="ww-loop" style={{ opacity: 0.25 + d * 0.6, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.25) 1px, transparent 1.5px)', backgroundSize: '60px 60px', animation: `ww-drift ${dur(6)} linear infinite alternate` }} />;
    case 'Lamp flicker':
      return <div className="ww-loop ww-loop-flicker" style={{ opacity: 0.3 + d * 0.6, animationDuration: dur(4) }} />;
    case 'Breathing':
      return <div className="ww-loop ww-loop-breathe" style={{ opacity: 0.4 + d * 0.6, animationDuration: dur(4) }} />;
    case 'Static':
      return <div className="ww-loop ww-loop-static" style={{ '--lo': 0.15 + d * 0.5, animationDuration: dur(0.4) } as any} />;
    default:
      return null;
  }
}

// Wire every [data-d] descendant to the --px/--py parallax vars the preview
// engine (and the Compose scrubber) set on the .ww-scene root. Idempotent —
// safe to re-run when depths change.
export function applyDepthTransforms(root: HTMLElement) {
  root.querySelectorAll('[data-d]').forEach((el: any) => {
    const d = parseFloat(el.getAttribute('data-d')) || 0;
    el.style.setProperty('--d', String(d * 74));
    if (el.dataset.wwInit) return;
    el.style.willChange = 'transform';
    const base = el.style.transform && !el.style.transform.includes('var(') ? el.style.transform : '';
    el.style.transform = `translate3d(calc(var(--px,0) * var(--d,0) * 1px), calc(var(--py,0) * var(--d,0) * 1px), 0) ${base}`;
    el.dataset.wwInit = '1';
  });
}

export function Scene({ kind, py = 0, strength = 0, loop = null, loopDensity = 55, loopSpeed = 1, className = '', style = {} }: any) {
  React.useEffect(injectSceneCss, []);
  const ref = React.useRef<HTMLDivElement>(null);
  const Builder = SCENES[kind] || SCENES.dusk_skyline;
  React.useEffect(() => {
    const root = ref.current; if (!root) return;
    applyDepthTransforms(root);
    root.style.setProperty('--p', String(py * strength));
  }, [py, strength, Builder]);
  return (
    <div ref={ref} className={'ww-scene ' + className} style={style}>
      <Builder />
      {loop && <LoopOverlay kind={loop} density={loopDensity} speed={loopSpeed} />}
    </div>
  );
}

// A series cover plate: a built-in Scene (seeded covers), an image assigned from
// the Production Library, or a blank placeholder before a cover has been set.
export function SeriesCover({ cover, className = '', style = {} }: { cover?: string; className?: string; style?: React.CSSProperties }) {
  if (cover && SCENES[cover]) return <Scene kind={cover} className={className} style={style} />;
  const fill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  if (cover) return <img src={assetUrl(cover)} alt="" className={className} style={{ ...fill, objectFit: 'cover', display: 'block', ...style }} />;
  return (
    <div className={className} style={{ ...fill, display: 'grid', placeItems: 'center', background: 'radial-gradient(120% 95% at 50% 28%, #1b2030, #0a0c12 82%)', ...style }}>
      <span style={{ fontSize: 26, opacity: 0.22, lineHeight: 1 }}>▣</span>
    </div>
  );
}
