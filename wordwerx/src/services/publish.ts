// Builds a single self-contained .html comic that opens OFFLINE: every panel
// image is inlined as base64 and the scroll-reveal is baked in (no external
// requests). Panels without assigned art fall back to a tonal placeholder.
import { loadAssetDataUrl } from './store';

export interface PublishPanel { id: string; n: number; slug: string; caption?: string; speaker?: string; dialogue?: string; hue?: number; layers?: number }
export interface PublishOpts { title: string; series: string; panelImage: Record<string, string>; layerImage?: Record<string, string>; downscale?: boolean }

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

function section(p: PublishPanel, imgs: string[]): string {
  const art = imgs.length
    ? `<div class="art">${imgs.map(u => `<img src="${u}" alt="${esc(p.slug)}">`).join('')}</div>`
    : `<div class="art ph" style="--h:${p.hue ?? 250}"></div>`;
  const cap = p.dialogue
    ? `<div class="cap"><b>${esc(p.speaker || '')}</b> ${esc(p.dialogue)}</div>`
    : p.caption ? `<div class="cap">${esc(p.caption)}</div>` : '';
  return `<section class="panel">${art}${cap}</section>`;
}

export async function buildEpisodeHtml(panels: PublishPanel[], opts: PublishOpts): Promise<{ html: string; bytes: number; withArt: number }> {
  let withArt = 0;
  const secs: string[] = [];
  for (const p of panels) {
    // Composite the panel's layer images (back → front); else the legacy single image.
    let ids = Array.from({ length: p.layers ?? 0 }).map((_, i) => opts.layerImage?.[`${p.id}:${i}`]).filter(Boolean) as string[];
    if (!ids.length && opts.panelImage[p.id]) ids = [opts.panelImage[p.id]];
    const imgs: string[] = [];
    for (const aid of ids) {
      try { let u = await loadAssetDataUrl(aid); if (opts.downscale) u = await downscaleDataUrl(u); imgs.push(u); } catch { /* skip */ }
    }
    if (imgs.length) withArt++;
    secs.push(section(p, imgs));
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
.panel{position:relative;min-height:62vh;display:flex;align-items:flex-end;opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
.panel.in{opacity:1;transform:none}
.art{position:relative;width:100%;border-radius:2px;overflow:hidden}
.art img{width:100%;display:block}
.art img:not(:first-child){position:absolute;inset:0;height:100%;object-fit:contain}
.art.ph{aspect-ratio:1/1;background:radial-gradient(80% 80% at 50% 35%,oklch(.5 .13 var(--h)),#0a0c12 80%)}
.cap{position:absolute;left:0;right:0;bottom:0;padding:46px 22px 22px;font-size:15px;line-height:1.5;background:linear-gradient(0deg,rgba(6,7,12,.92),transparent)}
.cap b{color:#16d6b4;font-weight:700;margin-right:6px}
.end{padding:80px 28px;text-align:center;color:#5f6478;font:500 12px/1.6 ui-monospace,monospace}
</style></head>
<body><div class="reader">
<div class="cover"><div class="k">${esc(opts.series)}</div><h1>${esc(opts.title)}</h1><div class="s">${panels.length} panels · scroll to read</div></div>
${secs.join('\n')}
<div class="end">— fin —<br>made with WORDWERX</div>
</div>
<script>
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in')})},{threshold:.12});
document.querySelectorAll('.panel').forEach(function(s){io.observe(s)});
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
