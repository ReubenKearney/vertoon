import React from 'react';
import { Scene, LoopOverlay, injectSceneCss, applyDepthTransforms } from './scenes';
import { assetUrl } from './services/store';

// Resolve a panel's real art: its layer images (back → front, keyed by index in
// links.layerImage), else the legacy single panel image, else nothing.
export function layerArt(panel: any, links: any): { depth: number; url: string }[] {
  const entries = (panel.layers || [])
    .map((l: any, i: number) => ({ depth: l.depth ?? 0, url: links?.layerImage?.[`${panel.id}:${i}`] }))
    .filter((e: any) => e.url);
  if (entries.length) return entries;
  const legacy = links?.panelImage?.[panel.id];
  return legacy ? [{ depth: 0, url: legacy }] : [];
}

// A panel's art as a parallax-ready .ww-scene: each layer image sits in a
// [data-d] wrapper, so the preview engine / Compose scrubber can drive depth
// drift through the same --px/--py vars the procedural scenes use. The engine
// assumes exactly one .ww-scene per panel — this root is it.
export function PanelArt({ panel, links, loop = null, loopDensity = 55, loopSpeed = 1, style, onImageClick }: any) {
  React.useEffect(injectSceneCss, []);
  const ref = React.useRef<HTMLDivElement>(null);
  const entries = layerArt(panel, links);
  const sig = entries.map(e => e.depth + ':' + e.url).join('|');
  React.useEffect(() => { if (ref.current) applyDepthTransforms(ref.current); }, [sig]);
  if (!entries.length) {
    return <Scene kind={panel.scene} loop={loop} loopDensity={loopDensity} loopSpeed={loopSpeed} style={style} />;
  }
  return (
    <div ref={ref} className="ww-scene" style={style}>
      {entries.map((e, i) => (
        // negative inset scaled by depth gives the layer bleed room, so the
        // parallax drift never exposes the frame edge
        <div key={i} data-d={e.depth} style={{ inset: `${-(4 + e.depth * 6)}%` }}>
          <img
            src={assetUrl(e.url)} alt="" draggable={false}
            className={onImageClick ? 'ww-zoomable' : undefined}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            onClick={onImageClick ? (ev: React.MouseEvent) => { ev.stopPropagation(); onImageClick(e.url); } : undefined}
          />
        </div>
      ))}
      {loop && <LoopOverlay kind={loop} density={loopDensity} speed={loopSpeed} />}
    </div>
  );
}
