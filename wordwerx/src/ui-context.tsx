import React from 'react';
import { assetUrl } from './services/store';

// Cross-cutting UI: notification badge (generation activity/errors) + a global
// image lightbox. Components call useUI() instead of prop-drilling.
export interface UIApi {
  notifyDone: (n?: number) => void;   // n images completed
  notifyError: () => void;            // a generation failed
  openImage: (urlOrId?: string) => void;
}

export const UIContext = React.createContext<UIApi>({ notifyDone: () => {}, notifyError: () => {}, openImage: () => {} });
export const useUI = () => React.useContext(UIContext);

export interface NotifState { count: number; error: boolean }

/** Provider wiring notification state + lightbox overlay. Render <Lightbox/> from the app shell. */
export function useUIProvider() {
  const [notif, setNotif] = React.useState<NotifState>({ count: 0, error: false });
  const [image, setImage] = React.useState<string | null>(null);

  const api = React.useMemo<UIApi>(() => ({
    notifyDone: (n = 1) => setNotif(s => ({ count: s.count + n, error: s.error })),
    notifyError: () => setNotif(s => ({ count: s.count, error: true })),
    openImage: (urlOrId?: string) => { const u = assetUrl(urlOrId); if (u) setImage(u); },
  }), []);

  const clearNotif = React.useCallback(() => setNotif({ count: 0, error: false }), []);
  const closeImage = React.useCallback(() => setImage(null), []);

  return { api, notif, clearNotif, image, closeImage };
}

export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url, onClose]);
  if (!url) return null;
  return (
    <div className="ww-lightbox" onClick={onClose}>
      <button className="ww-lightbox-x" onClick={onClose} aria-label="Close">✕</button>
      <img src={url} alt="" onClick={e => e.stopPropagation()} />
    </div>
  );
}
