import React from 'react';

// Undo/redo for the per-series editable content. Snapshots hold references to
// the (already immutable) state arrays, so each entry is cheap. Stacks are kept
// per series so undo never bleeds edits across series.
export interface ContentSnapshot {
  panels: any[];
  library: any[];
  characters: any[];
  bible: any;
  seasons: any[];
  arcs: any[];
}

const GROUP_MS = 500;  // changes closer together than this collapse into one undo step
const CAP = 100;       // max undo depth per series

type Stacks = { past: ContentSnapshot[]; future: ContentSnapshot[] };

function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function sameSnapshot(a: ContentSnapshot, b: ContentSnapshot) {
  return a.panels === b.panels && a.library === b.library && a.characters === b.characters
    && a.bible === b.bible && a.seasons === b.seasons && a.arcs === b.arcs;
}

export function useHistory(
  activeSeries: string,
  hydrated: boolean,
  snapshot: ContentSnapshot,
  restore: (snap: ContentSnapshot) => void,
) {
  const stacks = React.useRef<Record<string, Stacks>>({});
  const prev = React.useRef<ContentSnapshot>(snapshot);
  const prevSeries = React.useRef(activeSeries);
  const lastPush = React.useRef(0);
  const restoring = React.useRef(false);
  const snapRef = React.useRef(snapshot);
  snapRef.current = snapshot;

  const forSeries = (id: string): Stacks => (stacks.current[id] ??= { past: [], future: [] });

  // Record history on content change. Series switches and hydration loads just
  // re-baseline; only real edits (post-hydration, same series) push an entry.
  React.useEffect(() => {
    if (prevSeries.current !== activeSeries) {
      prevSeries.current = activeSeries;
      prev.current = snapshot;
      lastPush.current = 0;
      return;
    }
    if (restoring.current) { restoring.current = false; prev.current = snapshot; return; }
    if (!hydrated || sameSnapshot(prev.current, snapshot)) { prev.current = snapshot; return; }
    const now = performance.now();
    if (now - lastPush.current > GROUP_MS) {
      const s = forSeries(activeSeries);
      s.past.push(prev.current);
      if (s.past.length > CAP) s.past.shift();
      s.future = [];
    }
    lastPush.current = now;
    prev.current = snapshot;
  }, [snapshot, activeSeries, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = React.useCallback(() => {
    const s = forSeries(activeSeries);
    const snap = s.past.pop();
    if (!snap) return;
    s.future.push(snapRef.current);
    restoring.current = true;
    lastPush.current = 0;
    restore(snap);
  }, [activeSeries, restore]);

  const redo = React.useCallback(() => {
    const s = forSeries(activeSeries);
    const snap = s.future.pop();
    if (!snap) return;
    s.past.push(snapRef.current);
    restoring.current = true;
    lastPush.current = 0;
    restore(snap);
  }, [activeSeries, restore]);

  // Ctrl/Cmd+Z / Ctrl+Shift+Z / Ctrl+Y — but never inside text fields, where the
  // browser's own field-level undo should keep working.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return { undo, redo };
}
