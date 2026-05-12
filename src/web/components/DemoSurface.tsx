import { useEffect, useRef, useState } from 'react';
import type { Cue } from '@shared/types.js';
import { makeSyncEngine, type SyncEngine } from '../caption-surface/sync-engine.js';
import { BrowserRafScheduler, YtIframePlayerAdapter, type YtPlayerLike } from '../caption-surface/youtube-player.js';

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayerLike;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface DemoSurfaceProps {
  videoId: string;
  cues: Cue[];
  posterUrl?: string;
}

export function DemoSurface({ videoId, cues, posterUrl }: DemoSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerElRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SyncEngine | null>(null);
  const [cueText, setCueText] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const playerEl = playerElRef.current;
    if (!playerEl) return;

    let cancelled = false;

    const start = () => {
      if (cancelled || !window.YT?.Player) return;
      playerEl.innerHTML = '';
      
      const player = new window.YT.Player(playerEl, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
        },
      });

      const adapter = new YtIframePlayerAdapter(player as unknown as YtPlayerLike);
      const raf = new BrowserRafScheduler();
      const eng = makeSyncEngine({
        player: adapter,
        raf,
        cues,
        onActiveCueChange: (idx) => {
          const c = idx != null ? cues[idx] : null;
          setCueText(c?.text ?? '');
        },
      });
      eng.start();
      engineRef.current = eng;
      setIsReady(true);
    };

    if (window.YT?.Player) {
      start();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        start();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.append(s);
      }
    }

    return () => {
      cancelled = true;
      engineRef.current?.stop();
      engineRef.current = null;
      if (playerEl) playerEl.innerHTML = '';
    };
  }, [videoId, cues, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="lp__demo" ref={containerRef}>
        <div className="lp__demo-titlebar">
          <span className="lp__demo-dot" />
          <span className="lp__demo-dot" />
          <span className="lp__demo-dot" />
          <span className="lp__demo-url">captionflow.link/demo</span>
        </div>
        <div className="lp__demo-video lp__demo-video--static">
          {posterUrl && <img src={posterUrl} alt="Video preview" className="lp__demo-poster" />}
          <div className="lp__demo-fallback">
            <a href="/test-play/" className="lp__demo-fallback-link">
              Try the interactive demo →
            </a>
          </div>
        </div>
        <div className="lp__demo-caption">
          <div className="lp__demo-caption-line">
            <span>Captions synced perfectly with embedded YouTube videos.</span>
          </div>
          <div className="lp__demo-caption-meta">
            <span className="lp__demo-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Instructor-authored
            </span>
            <span>Synced ±250 ms · WCAG 2.1 AA</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp__demo" ref={containerRef}>
      <div className="lp__demo-titlebar">
        <span className="lp__demo-dot" />
        <span className="lp__demo-dot" />
        <span className="lp__demo-dot" />
        <span className="lp__demo-url">captionflow.link/demo</span>
      </div>
      <div className="lp__demo-video">
        <div ref={playerElRef} className="lp__demo-player" />
      </div>
      <div className="lp__demo-caption">
        <div className="lp__demo-caption-line">
          <span>{cueText || 'Captions appear here as the video plays...'}</span>
        </div>
        {isReady && (
          <div className="lp__demo-caption-meta">
            <span className="lp__demo-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Live demo
            </span>
            <span>Real sync engine · {cues.length} cues</span>
          </div>
        )}
      </div>
    </div>
  );
}
