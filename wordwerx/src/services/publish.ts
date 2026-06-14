// Builds a single self-contained .html comic that opens OFFLINE: every panel
// image is inlined as base64 and the scroll-reveal is baked in (no external
// requests). Panels without assigned art fall back to a tonal placeholder.
import { loadAssetDataUrl } from './store';
import { TEXT_OBJECT_CSS } from '../text-objects';
import { mapEasing } from '../preview-engine';

export interface PublishPanel {
  id: string; n: number; slug: string;
  caption?: string; speaker?: string; dialogue?: string; hue?: number; gap?: number; textHtml?: string;
  layers?: { depth: number }[];
  reveal?: { motion: string; duration: number; distance: number; easing: string };
  parallax?: { strength: number; axis: string; anchor: string };
  transition?: { type: string };
}
export interface PublishOpts { title: string; series: string; panelImage: Record<string, string>; layerImage?: Record<string, string>; downscale?: boolean; bakeMotion?: boolean }

function downscaleDataUrl(dataUrl: string, maxEdge = 1080): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      if (scale >= 1) return resolve(dataUrl);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function esc(s = ''): string { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

function section(p: PublishPanel, imgs: { u: string; depth: number }[], motion: boolean): string {
  // text objects render INSIDE the fixed-aspect art frame so % positions match
  // Compose and Preview exactly; legacy .cap is the fallback for old exports
  const text = p.textHtml ? `<div class="ww-tolayer">${p.textHtml}</div>` : '';
  // layer images sit in [data-d] wrappers (same overscan as PanelArt) so the
  // baked parallax loop can drift them without exposing the frame edge
  const layerHtml = imgs.map(({ u, depth }) => motion && depth
    ? `<div data-d style="--d:${(depth * 74).toFixed(1)};inset:${(-(4 + depth * 6)).toFixed(1)}%"><img src="${u}" alt="${esc(p.slug)}"></div>`
    : `<img src="${u}" alt="${esc(p.slug)}">`).join('');
  const trans = motion && p.transition && p.transition.type !== 'Hard cut'
    ? `<div class="ww-rtrans" data-trans="${esc(p.transition.type)}"></div>` : '';
  const art = imgs.length
    ? `<div class="art">${layerHtml}${text}${trans}</div>`
    : `<div class="art ph" style="--h:${p.hue ?? 250}">${text}${trans}</div>`;
  const cap = p.textHtml ? '' : p.dialogue
    ? `<div class="cap"><b>${esc(p.speaker || '')}</b> ${esc(p.dialogue)}</div>`
    : p.caption ? `<div class="cap">${esc(p.caption)}</div>` : '';
  // gutter: % of width so the authored 800px-space gap scales with the reader column
  const style: string[] = [];
  if (p.gap) style.push(`margin-bottom:${((p.gap / 800) * 100).toFixed(2)}%`);
  if (motion && p.reveal) style.push(`--rd:${p.reveal.duration}s`, `--rv:${p.reveal.distance}px`, `--re:${mapEasing(p.reveal.easing)}`);
  const attrs = [
    style.length ? ` style="${style.join(';')}"` : '',
    motion && p.reveal ? ` data-motion="${esc(p.reveal.motion)}"` : '',
    // parallax params for the scroll loop; strength mirrors parallaxStrength()
    // in preview-engine.ts (keep in sync)
    motion ? ` data-pstr="${(p.parallax ? (p.parallax.strength / 100) * 1.45 : 0.55).toFixed(3)}"` : '',
    motion && p.parallax && p.parallax.axis !== 'Vertical' ? ` data-pax="${esc(p.parallax.axis)}"` : '',
    motion && p.parallax && p.parallax.anchor !== 'Center' ? ` data-pan="${esc(p.parallax.anchor)}"` : '',
  ].join('');
  return `<section class="panel"${attrs}>${art}${cap}</section>`;
}

export async function buildEpisodeHtml(panels: PublishPanel[], opts: PublishOpts): Promise<{ html: string; bytes: number; withArt: number }> {
  let withArt = 0;
  const motion = opts.bakeMotion !== false;
  const secs: string[] = [];
  for (const p of panels) {
    // Composite the panel's layer images (back → front); else the legacy single image.
    let ids = (p.layers || []).map((l, i) => ({ depth: l.depth ?? 0, aid: opts.layerImage?.[`${p.id}:${i}`] })).filter(x => x.aid) as { depth: number; aid: string }[];
    if (!ids.length && opts.panelImage[p.id]) ids = [{ depth: 0, aid: opts.panelImage[p.id] }];
    const imgs: { u: string; depth: number }[] = [];
    for (const { aid, depth } of ids) {
      try { let u = await loadAssetDataUrl(aid); if (opts.downscale) u = await downscaleDataUrl(u); imgs.push({ u, depth }); } catch { /* skip */ }
    }
    if (imgs.length) withArt++;
    secs.push(section(p, imgs, motion));
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.series)} — ${esc(opts.title)}</title>
<style>
*{margin:0;box-sizing:border-box}
body{background:#06070c;color:#ecedf2;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.reader{max-width:560px;margin:0 auto}
.cover{padding:90px 28px 60px;text-align:center}
.cover .k{font:600 11px/1 ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#16d6b4}
.cover h1{font-size:30px;margin:14px 0 6px}
.cover .s{color:#9aa0b4;font-size:13px}
.panel{position:relative;min-height:62vh;display:flex;align-items:flex-end;opacity:0;transform:translateY(var(--rv,28px));
  transition:opacity var(--rd,.7s) var(--re,ease),transform var(--rd,.7s) var(--re,ease),filter var(--rd,.7s) var(--re,ease)}
.panel[data-motion="Fade"]{transform:none}
.panel[data-motion="Slide left"]{transform:translateX(var(--rv,28px))}
.panel[data-motion="Scale in"]{transform:scale(.86)}
.panel[data-motion="Blur in"]{transform:none;filter:blur(10px)}
.panel.in{opacity:1;transform:none;filter:none}
.art{position:relative;width:100%;aspect-ratio:800/1280;border-radius:2px;overflow:hidden;background:#06070c}
.art img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
.art [data-d]{position:absolute;will-change:transform;
  transform:translate3d(calc(var(--px,0)*var(--d,0)*1px),calc(var(--py,0)*var(--d,0)*1px),0)}
.art.ph{background:radial-gradient(80% 80% at 50% 35%,oklch(.5 .13 var(--h)),#0a0c12 80%)}
.ww-rtrans{position:absolute;inset:0;pointer-events:none;z-index:9;opacity:0}
.ww-rtrans[data-trans="Cross dissolve"]{background:#04050a;opacity:var(--tx,0)}
.ww-rtrans[data-trans="Wipe down"]{background:#04050a;opacity:1;clip-path:inset(0 0 calc((1 - var(--tx,0)) * 100%) 0)}
.ww-rtrans[data-trans="Iris"]{opacity:var(--tx,0);background:radial-gradient(circle at 50% 50%, transparent calc((1 - var(--tx,0)) * 70%), #04050a calc((1 - var(--tx,0)) * 70% + 2%))}
.ww-rtrans[data-trans="Whip pan"]{background:#04050a;opacity:calc(var(--tx,0) * (1 - var(--tx,0)) * 4);transform:translateX(calc(var(--tx,0) * -38%));filter:blur(6px)}
.cap{position:absolute;left:0;right:0;bottom:0;padding:46px 22px 22px;font-size:15px;line-height:1.5;background:linear-gradient(0deg,rgba(6,7,12,.92),transparent)}
.cap b{color:#16d6b4;font-weight:700;margin-right:6px}
.end{padding:80px 28px;text-align:center;color:#5f6478;font:500 12px/1.6 ui-monospace,monospace}
${TEXT_OBJECT_CSS}
</style></head>
<body><div class="reader">
<div class="cover"><div class="k">${esc(opts.series)}</div><h1>${esc(opts.title)}</h1><div class="s">${panels.length} panels · scroll to read</div></div>
${secs.join('\n')}
<div class="end">— fin —<br>made with WORDWERX</div>
</div>
<script>
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.12});
document.querySelectorAll('.panel').forEach(function(s){io.observe(s)});
${motion ? `// baked motion: parallax + transition scrub — keep in sync with preview-engine.ts
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)(function(){
var secs=[].slice.call(document.querySelectorAll('.panel')),sm={};
function loop(){
  var vh=innerHeight,vc=vh/2;
  for(var i=0;i<secs.length;i++){
    var el=secs[i],r=el.getBoundingClientRect();
    if(r.bottom<-vh||r.top>2*vh)continue; // only animate near-viewport panels
    var center=r.top+r.height/2;
    var pvT=Math.max(-1.3,Math.min(1.3,(center-vc)/vh));
    var prev=sm[i]==null?pvT:sm[i];
    var pv=prev+(pvT-prev)*0.12;sm[i]=pv;
    var st=parseFloat(el.dataset.pstr||'0'),ax=el.dataset.pax||'Vertical',an=el.dataset.pan||'Center';
    var bias=an==='Top'?-0.5:an==='Bottom'?0.5:0;
    var adj=pv-bias,base=-adj*st;
    el.style.setProperty('--py',String(ax==='Horizontal'?0:base));
    el.style.setProperty('--px',String(ax==='Horizontal'||ax==='Both'?base*0.6:0));
    el.style.setProperty('--tx',String(Math.max(0,Math.min(1,(vh-r.bottom)/vh))));
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();` : ''}
</script>
</body></html>`;
  return { html, bytes: new Blob([html]).size, withArt };
}

/** Trigger a browser download of the html string. */
export function downloadHtml(html: string, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
