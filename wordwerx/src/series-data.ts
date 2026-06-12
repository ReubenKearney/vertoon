// Per-series content registry. The workbench used to hardcode the seed series
// "Echo's Location" by importing the seed globals directly inside components.
// This module resolves a series id to its content bundle so any series — the
// seed or a brand-new blank one — can drive the whole workbench.
import { CHARACTERS, PANELS, LIBRARY, EPISODE } from './data';
import { SERIES, SEASONS, ARCS, BIBLE, VISDEV } from './world';

export interface SeriesContent {
  characters: any[];
  seasons: any[];
  arcs: any[];
  bible: Record<string, any>;
  visdev: any[];
  panels: any[];
  library: any[];
  episode: any;
}

// The fully spec'd seed series. References the existing constants (still defined
// in data.ts / world.ts) rather than copying them.
export const ECHO_CONTENT: SeriesContent = {
  characters: CHARACTERS,
  seasons: SEASONS,
  arcs: ARCS,
  bible: BIBLE,
  visdev: VISDEV,
  panels: PANELS,
  library: LIBRARY,
  episode: EPISODE,
};

// An empty content bundle for a freshly created series. The episode is derived
// from the series' own metadata so Preview/Publish have a title to show. The
// Seasons board is seeded with one empty season + throughline so the grid reads
// as a startable scaffold rather than a blank void.
export function blankContent(series: any): SeriesContent {
  return {
    characters: [],
    seasons: [{
      id: 's1', series: series?.id || 'new', n: 1, title: 'New season',
      premise: '', episodes: [{ id: 'ep1', n: 1, title: 'Episode 1', status: 'Idea', beats: 0, panels: 0, log: '' }],
    }],
    arcs: [{ id: 'arc1', label: 'Main throughline', desc: 'What this thread is about.', hue: 200, beats: {} }],
    bible: {},
    visdev: [],
    panels: [],
    library: [],
    episode: {
      id: 'ep1',
      series: series?.title || 'Untitled series',
      title: 'Untitled episode',
      number: 'Episode 01',
      genre: series?.genre || '',
      logline: series?.tagline || '',
    },
  };
}

// Resolve a series id to its content. Only the seed `echo` has authored content;
// every other series starts blank.
export function getSeriesContent(id: string, series?: any): SeriesContent {
  if (id === 'echo') return ECHO_CONTENT;
  const s = series || SERIES.find((x: any) => x.id === id);
  return blankContent(s);
}
