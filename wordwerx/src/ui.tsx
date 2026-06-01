import React from 'react';
import { EFFECT_TYPES } from './data';
import { Scene } from './scenes';

export function cx(...a: (string | boolean | null | undefined)[]) {
  return a.filter(Boolean).join(' ');
}

export function fxColor(type: string, l = 0.7, c = 0.16) {
  const hue = (EFFECT_TYPES[type] || {}).hue || 280;
  return `oklch(${l} ${c} ${hue})`;
}

export function FxChip({ type, on = true, small, onClick, active }: any) {
  const meta = EFFECT_TYPES[type]; if (!meta) return null;
  return (
    <button className={cx('ww-chip', active && 'is-active', !on && 'is-off')} onClick={onClick}
      style={{ '--fx': fxColor(type), '--fxdim': fxColor(type, 0.5, 0.12) } as any}>
      <span className="ww-chip-g">{meta.glyph}</span>
      {!small && <span>{meta.label}</span>}
    </button>
  );
}

export function StateDot({ state }: { state: string }) {
  const map: Record<string, number> = { Generated: 150, Linked: 200, Draft: 60, Queued: 285 };
  const hue = map[state] != null ? map[state] : 280;
  return <span className="ww-state"><i style={{ background: `oklch(0.72 0.16 ${hue})` }} />{state}</span>;
}

export function AssetThumb({ scene, label, sub, source, state, onClick, selected, tall }: any) {
  return (
    <button className={cx('ww-thumb', selected && 'is-sel', tall && 'is-tall')} onClick={onClick}>
      <div className="ww-thumb-art"><Scene kind={scene} /></div>
      <div className="ww-thumb-meta">
        <div className="ww-thumb-top">
          {source && <span className={cx('ww-src', source === 'AI' && 'is-ai')}>{source === 'AI' ? '✦ AI' : source}</span>}
          {state && <StateDot state={state} />}
        </div>
        <div className="ww-thumb-label">{label}</div>
        {sub && <div className="ww-thumb-sub">{sub}</div>}
      </div>
    </button>
  );
}

export function PlaceholderTag({ children }: { children: React.ReactNode }) {
  return <div className="ww-ph">{children}</div>;
}
