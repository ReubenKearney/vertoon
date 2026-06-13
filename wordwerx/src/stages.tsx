import React from 'react';
import { cx } from './ui';
import { AssetThumb, StateDot } from './ui';
import { Scene } from './scenes';
import { GenerationPanel, type GenResult } from './components/GenerationPanel';
import type { UseCase } from './workflows';
import { assetUrl } from './services/store';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildEpisodeHtml, downloadHtml, type PublishPanel } from './services/publish';
import { effectiveTextObjects, TextObjectStatic } from './text-objects';

export function Library({ library, setLibrary, onUseAsset, online, flash, characters }: any) {
  const cast = characters || [];
  const [filter, setFilter] = React.useState('All');
  const [pending, setPending] = React.useState(0);
  const kinds = ['All', 'Background', 'Character', 'Prop', 'FX plate'];
  const shown = library.filter((a: any) => filter === 'All' || a.kind === filter);

  function onResult(assets: GenResult[], ctx: { useCase: UseCase; prompt: string }) {
    const base = ctx.prompt.split(',')[0].slice(0, 22) || 'untitled';
    const rows = assets.map((a, i) => ({
      id: 'g' + a.id.slice(0, 8), kind: 'Background', scene: 'tunnels',
      name: 'Gen · ' + base + (assets.length > 1 ? ` ${i + 1}` : ''),
      source: 'AI', tags: ['new'], state: 'Generated', imageUrl: a.url,
    }));
    setLibrary((l: any[]) => [...rows, ...l]);
  }

  return (
    <div className="ww-library">
      <GenerationPanel
        workflows={['txt2img-flux', 'txt2img-sdxl', 'dataset-batch']}
        showLora online={online} flash={flash} onResult={onResult} onPending={setPending}
      />
      <div className="ww-lib-bar">
        <div className="ww-filters">{kinds.map(k => <button key={k} className={cx('ww-filter', filter === k && 'is-on')} onClick={() => setFilter(k)}>{k}</button>)}</div>
        <span className="ww-lib-count">{shown.length} assets</span>
      </div>
      <div className="ww-libgrid">
        {Array.from({ length: pending }).map((_, i) => (
          <div key={'sk' + i} className="ww-thumb"><div className="ww-thumb-art ww-skel"><span className="ww-skel-tag">generating…</span></div></div>
        ))}
        {shown.map((a: any) => (
          <AssetThumb key={a.id} scene={a.scene} label={a.name} sub={a.kind} source={a.source} state={a.state} imageUrl={a.imageUrl} onClick={() => onUseAsset && onUseAsset(a)} />
        ))}
      </div>
      <div className="ww-cast">
        <div className="ww-insp-sub">Cast plates · {cast.length}</div>
        <div className="ww-castrow">
          {cast.map((c: any) => (
            <div key={c.id} className="ww-castcard">
              <div className="ww-castcard-art" style={{ background: `radial-gradient(80% 80% at 50% 30%, oklch(0.5 0.13 ${c.tint}), #0a0c12 80%)` }}>
                <span className="ww-castcard-mono">{c.name.split(' ')[0]}</span>
              </div>
              <div className="ww-castcard-meta"><b>{c.name}</b><span>{c.role}</span><StateDot state={c.state} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Story({ panels, episode, canon = [], arcs = [] }: any) {
  const e = episode;
  return (
    <div className="ww-story">
      <div className="ww-story-hero">
        <div className="ww-pv-kicker">{e.genre}</div>
        <h1>{e.series}</h1>
        <div className="ww-story-ep">{e.number} — "{e.title}"</div>
        <p className="ww-story-log">{e.logline}</p>
      </div>
      <div className="ww-story-cols">
        <div className="ww-story-beats">
          <div className="ww-insp-sub">Beat sheet · {panels.length} panels</div>
          <ol className="ww-beatlist">
            {panels.map((p: any) => (
              <li key={p.id} className="ww-beat">
                <span className="ww-beat-n">{String(p.n).padStart(2, '0')}</span>
                <div className="ww-beat-mini"><Scene kind={p.scene} /></div>
                <div className="ww-beat-meta"><b>{p.slug}</b><span>{p.beat}</span></div>
                <span className="ww-beat-fx">{p.fx.length} fx</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="ww-story-side">
          <div className="ww-insp-sub">Portrayal rules</div>
          {canon.length ? (
            <ul className="ww-rules">{canon.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
          ) : <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55, margin: 0 }}>No canon rules yet — add them in the series configuration.</p>}
          <div className="ww-insp-sub" style={{ marginTop: 18 }}>Throughlines</div>
          {arcs.length ? (
            <div className="ww-thru">
              {arcs.map((a: any) => <span key={a.id} style={{ '--h': (a.hue ?? 200) + 'deg' } as any}>{a.label}</span>)}
            </div>
          ) : <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55, margin: 0 }}>No throughlines yet — add them on the Seasons board.</p>}
        </div>
      </div>
    </div>
  );
}

export function Publish({ panels, links, flash, episode }: any) {
  const story = (panels || []).filter((p: any) => p.scene !== 'parallax_demo');
  // Filename-safe slug from the episode/series title for the export.
  const slug = (episode?.series || episode?.title || 'episode').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-ep01';
  const panelImage: Record<string, string> = links?.panelImage || {};
  const layerImage: Record<string, string> = links?.layerImage || {};
  const [downscale, setDownscale] = React.useState(true);
  const [bakeMotion, setBakeMotion] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ bytes: number; withArt: number } | null>(null);
  const hasArt = (p: any) => panelImage[p.id] || (p.layers || []).some((_: any, i: number) => layerImage[`${p.id}:${i}`]);
  const assigned = story.filter(hasArt).length;

  async function exportComic() {
    setBusy(true);
    try {
      const fxOf = (p: any, type: string) => p.fx?.find((f: any) => f.type === type && f.on);
      const pp: PublishPanel[] = story.map((p: any, i: number) => {
        const reveal = fxOf(p, 'reveal'), par = fxOf(p, 'parallax'), trans = fxOf(p, 'transition');
        return {
          id: p.id, n: p.n, slug: p.slug, caption: p.caption, speaker: p.speaker, dialogue: p.dialogue, hue: (i * 41) % 360, gap: p.gap,
          layers: (p.layers || []).map((l: any) => ({ depth: l.depth ?? 0 })),
          reveal: reveal ? { motion: reveal.params.Motion, duration: reveal.params.Duration, distance: reveal.params.Distance, easing: reveal.params.Easing } : undefined,
          parallax: par ? { strength: par.params.Strength, axis: par.params.Axis, anchor: par.params.Anchor } : undefined,
          transition: trans ? { type: trans.params.Type } : undefined,
          // same renderer as Compose/Preview — one source of truth for lettering
          textHtml: effectiveTextObjects(p).map((t: any) => renderToStaticMarkup(<TextObjectStatic t={t} panel={p} />)).join('') || undefined,
        };
      });
      const { html, bytes, withArt } = await buildEpisodeHtml(pp, { title: episode.title, series: episode.series, panelImage, layerImage, downscale, bakeMotion });
      downloadHtml(html, `${slug}.html`);
      setResult({ bytes, withArt });
      flash?.(`Exported offline comic · ${(bytes / 1e6).toFixed(2)} MB`);
    } catch (e: any) { flash?.('Export failed: ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="ww-publish">
      <div className="ww-pub-main">
        <div className="ww-pv-kicker">Publish</div>
        <h2>Ship "{episode.title}"</h2>
        <p className="ww-pub-sub">Export the episode as a single self-contained <b>.html</b> — every assigned image is inlined and the scroll-reveal is baked in, so it opens offline with no external requests.</p>
        <div className="ww-pub-stats">
          <div><b>{story.length}</b><span>panels</span></div>
          <div><b>{assigned}</b><span>with art</span></div>
          <div><b>{result ? (result.bytes / 1e6).toFixed(2) + 'MB' : '—'}</b><span>export size</span></div>
          <div><b>9:19</b><span>vertical</span></div>
        </div>
        <label className="ww-pub-opt"><input type="checkbox" checked={downscale} onChange={e => setDownscale(e.target.checked)} /><span><b>Downscale images</b> — re-encode to ≤1080px JPEG to keep the file small.</span></label>
        <label className="ww-pub-opt"><input type="checkbox" checked={bakeMotion} onChange={e => setBakeMotion(e.target.checked)} /><span><b>Bake motion</b> — ship parallax, reveals and transitions in the file (respects readers' reduced-motion setting). Off = static scroll-reveal only.</span></label>
        <button className={cx('ww-pub-go', busy && 'is-done')} disabled={busy} onClick={exportComic}>{busy ? 'Exporting…' : '⤓ Export offline comic (.html)'}</button>
        {result && (
          <div className="ww-pub-link">
            <code>{slug}.html · {result.withArt}/{story.length} panels with art · {(result.bytes / 1e6).toFixed(2)} MB</code>
          </div>
        )}
        <p className="ww-pub-sub" style={{ marginTop: 22, fontSize: 12 }}>Assign generated images to panels in <b>Production → Compose</b> (panel inspector → “Panel art”). {assigned}/{story.length} panels currently have art.</p>
      </div>
      <div className="ww-pub-aside">
        <div className="ww-pub-poster">
          {assigned > 0 ? <img src={assetUrl(panelImage[story[0].id])} alt="" style={{ width: '100%', display: 'block' }} /> : <Scene kind="dusk_skyline" />}
          <div className="ww-pub-poster-meta"><span>Episode 01</span><b>{episode.title}</b><i>{episode.series}</i></div>
        </div>
        <div className="ww-pub-share">
          <div className="ww-insp-sub">Offline-ready</div>
          <p>Assign generated images to panels, then export. The .html bundles everything — open it on a plane, no server, no internet.</p>
        </div>
      </div>
    </div>
  );
}
