import React from 'react';
import { getHealth } from './store';

// Tracks whether generation is currently possible. navigator.onLine is only a
// hint; the authoritative signal is whether the RunPod endpoint is reachable
// (companion server /api/health reports `endpoint`). This gates Generate ONLY —
// editing, preview, and publish must always work (they read the local store).
export interface OnlineState { online: boolean; reachable: boolean; endpoint: boolean }

export function useOnline(pollMs = 20000): OnlineState {
  const [state, setState] = React.useState<OnlineState>({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    reachable: true,
    endpoint: true,
  });

  React.useEffect(() => {
    let alive = true;
    async function ping() {
      try {
        const h = await getHealth();
        if (alive) setState({ online: navigator.onLine, reachable: true, endpoint: h.endpoint });
      } catch {
        if (alive) setState(s => ({ ...s, online: navigator.onLine, reachable: false }));
      }
    }
    ping();
    const id = setInterval(ping, pollMs);
    const on = () => setState(s => ({ ...s, online: true }));
    const off = () => setState(s => ({ ...s, online: false }));
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { alive = false; clearInterval(id); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [pollMs]);

  return state;
}

/** Can we generate right now? (browser online + server reachable). */
export function canGenerate(s: OnlineState): boolean { return s.online && s.reachable; }
