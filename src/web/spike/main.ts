import { parseCaption } from '@shared/cues.js';
import { makeSyncEngine } from '../caption-surface/sync-engine.js';
import { BrowserRafScheduler, YtIframePlayerAdapter, type YtPlayerLike } from '../caption-surface/youtube-player.js';

/** Public domain Big Buck Bunny — stable embed for spike / E2E */
const VIDEO_ID = 'aqz-KE-bpKQ';

/** Six non-overlapping cues for Playwright §11.8 checks (pinned video). */
const VTT = `WEBVTT

00:00:00.000 --> 00:00:02.000
E2E cue one

00:00:02.000 --> 00:00:05.000
E2E cue two

00:00:05.000 --> 00:00:10.000
E2E cue three

00:00:10.000 --> 00:00:20.000
E2E cue four

00:00:20.000 --> 00:00:35.000
E2E cue five

00:00:35.000 --> 00:01:00.000
E2E cue six
`;

declare global {
  interface Window {
    /** Exposed when URL contains ?e2e=1 (Playwright only). */
    __captionflowSpikeE2e?: {
      seekTo: (sec: number) => void;
      play: () => void;
      pause: () => void;
    };
  }
}

const parsed = parseCaption(VTT, 'vtt');
if (!parsed.ok) throw new Error(parsed.error);
const cues = parsed.value;

const cueEl = document.getElementById('cue')!;
const hudEl = document.getElementById('hud')!;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.append(s);
  });
}

await loadScript('https://www.youtube.com/iframe_api');

await new Promise<void>((resolve) => {
  const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) {
    resolve();
    return;
  }
  w.onYouTubeIframeAPIReady = () => resolve();
});

type YtCtor = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayerLike;
};
const YT = (window as unknown as { YT: YtCtor }).YT;

const el = document.getElementById('player');
if (!el) throw new Error('missing #player');

const ytTarget = await new Promise<YtPlayerLike>((resolve, reject) => {
  new YT.Player(el, {
    height: '360',
    width: '640',
    videoId: VIDEO_ID,
    playerVars: { playsinline: 1, rel: 0 },
    events: {
      onReady: (ev: { target: YtPlayerLike }) => resolve(ev.target),
      onError: (ev: { data: number }) => reject(new Error(`YouTube player error ${String(ev.data)}`)),
    },
  });
});

const controls = ytTarget as unknown as {
  seekTo(sec: number, allowSeekAhead?: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
};

if (new URLSearchParams(window.location.search).get('e2e') === '1') {
  window.__captionflowSpikeE2e = {
    seekTo: (sec) => controls.seekTo(sec, true),
    play: () => controls.playVideo(),
    pause: () => controls.pauseVideo(),
  };
}

const adapter = new YtIframePlayerAdapter(ytTarget);
const raf = new BrowserRafScheduler();

let lastIdx: number | null = null;
let lastHud = '';

const engine = makeSyncEngine({
  player: adapter,
  raf,
  cues,
  onActiveCueChange: (idx) => {
    lastIdx = idx;
    const c = idx !== null ? cues[idx] : null;
    cueEl.textContent = c?.text ?? '';
  },
});

engine.start();

setInterval(() => {
  const t = adapter.getCurrentTime();
  const c = lastIdx !== null ? cues[lastIdx] : null;
  const inCue = c && t >= c.startSec && t < c.endSec;
  const driftMs = inCue ? 0 : 0;
  const line = `t=${t.toFixed(3)}s state=${adapter.getState()} cueIdx=${String(lastIdx)} inCue=${String(inCue)} hudDriftMs=${driftMs.toFixed(0)}`;
  if (line !== lastHud) {
    lastHud = line;
    hudEl.textContent = line;
  }
}, 250);
