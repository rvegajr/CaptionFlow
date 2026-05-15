import { useEffect, useRef, useState } from 'react';
import type { Cue } from '@shared/types.js';
import { makeSyncEngine, type SyncEngine } from './sync-engine.js';
import { BrowserRafScheduler, YtIframePlayerAdapter, type YtPlayerLike } from './youtube-player.js';
import { CueDisplay } from './cue-display.js';

export const MACHINE_TRANSLATED_LABEL =
  'Machine-translated from source — not certified for accessibility compliance.';

type PubTrack = {
  id: string;
  languageCode: string;
  isMachineTranslated: boolean;
  sourceCaptionId: string | null;
  cues: Cue[];
};

type OwnerPlan = 'free' | 'pro' | 'institution';

type PubPayload = {
  resourceId: string;
  youtubeVideoId: string;
  defaultCaptionId: string;
  ownerPlan: OwnerPlan;
  tracks: PubTrack[];
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayerLike;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function PlayerHost({
  videoId,
  cues,
  onCue,
}: {
  videoId: string;
  cues: Cue[];
  onCue: (text: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SyncEngine | null>(null);
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let cancelled = false;

    const start = () => {
      if (cancelled || !window.YT?.Player) return;
      el.innerHTML = '';
      const player = new window.YT.Player(el, {
        videoId,
        playerVars: { playsinline: 1, rel: 0 },
      });
      const adapter = new YtIframePlayerAdapter(player as unknown as YtPlayerLike);
      const raf = new BrowserRafScheduler();
      const eng = makeSyncEngine({
        player: adapter,
        raf,
        cues,
        onActiveCueChange: (idx) => {
          const c = idx != null ? cues[idx] : null;
          onCueRef.current(c?.text ?? '');
        },
      });
      eng.start();
      engineRef.current = eng;
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
      el.innerHTML = '';
    };
  }, [videoId, cues]);

  return <div ref={elRef} className="surface__player-wrap" />;
}

export function CaptionSurface({ resourceId }: { resourceId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [payload, setPayload] = useState<PubPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cueText, setCueText] = useState('');

  useEffect(() => {
    void fetch(`/api/public/resources/${encodeURIComponent(resourceId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<PubPayload>;
      })
      .then((p) => {
        setPayload(p);
        setSelectedId(p.defaultCaptionId);
      })
      .catch((e) => setErr(String(e)));
  }, [resourceId]);

  const track =
    payload?.tracks.find((t) => t.id === selectedId) ??
    payload?.tracks.find((t) => t.id === payload.defaultCaptionId) ??
    payload?.tracks[0];

  const goFs = () => {
    void wrapRef.current?.requestFullscreen();
  };

  if (err) return <div className="surface error">{err}</div>;
  if (!payload || !track) return <div className="surface">Loading…</div>;

  return (
    <div className="surface" ref={wrapRef}>
      <PlayerHost
        key={track.id}
        videoId={payload.youtubeVideoId}
        cues={track.cues}
        onCue={setCueText}
      />
      <div className="track-bar">
        <label htmlFor="track">Caption track</label>
        <select
          id="track"
          value={selectedId ?? track.id}
          onChange={(e) => setSelectedId(e.currentTarget.value)}
        >
          {payload.tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.languageCode}
              {t.isMachineTranslated ? ' (machine-translated)' : ''}
            </option>
          ))}
        </select>
        {track.isMachineTranslated ? <span className="machine-label">{MACHINE_TRANSLATED_LABEL}</span> : null}
      </div>
      <CueDisplay text={cueText} />
      <div className="fullscreen-bar">
        <button type="button" className="button is-secondary" onClick={goFs}>
          Fullscreen (video + captions)
        </button>
      </div>
      {payload.ownerPlan === 'free' ? (
        <a className="surface__attribution" href="/" target="_blank" rel="noopener">
          Captioned with <strong>CaptionFlow</strong>
        </a>
      ) : null}
    </div>
  );
}
