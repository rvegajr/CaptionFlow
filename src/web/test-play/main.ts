import { parseCaption } from '@shared/cues.js';
import { parseYouTubeVideoId } from '@shared/youtube-id.js';
import { makeSyncEngine, type SyncEngine } from '../caption-surface/sync-engine.js';
import {
  BrowserRafScheduler,
  YtIframePlayerAdapter,
  type YtPlayerLike,
} from '../caption-surface/youtube-player.js';
import type { Cue } from '@shared/types.js';

const SAMPLE_VTT = `WEBVTT

00:00:00.000 --> 00:00:05.000
First cue (0–5s)

00:00:05.000 --> 00:00:12.000
Second cue (5–12s)
`;

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:05,000
First cue (0–5s)

2
00:00:05,000 --> 00:00:12,000
Second cue (5–12s)
`;

type YtApi = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayerLike;
};

const form = document.getElementById('form') as HTMLFormElement;
const youtubeInput = document.getElementById('youtube') as HTMLInputElement;
const formatSel = document.getElementById('format') as HTMLSelectElement;
const cuesTextarea = document.getElementById('cues-text') as HTMLTextAreaElement;
const msgEl = document.getElementById('msg') as HTMLParagraphElement;
const cueEl = document.getElementById('cue') as HTMLDivElement;
const hudEl = document.getElementById('hud') as HTMLPreElement;
const playerHost = document.getElementById('player') as HTMLDivElement;

let engine: SyncEngine | null = null;
let hudTimer: ReturnType<typeof setInterval> | null = null;
let adapterInst: InstanceType<typeof YtIframePlayerAdapter> | null = null;

let cues: Cue[] = [];
let lastIdx: number | null = null;
let hudLine = '';

function showError(text: string): void {
  msgEl.textContent = text;
}

function clearError(): void {
  msgEl.textContent = '';
}

function stopTest(): void {
  if (hudTimer != null) {
    clearInterval(hudTimer);
    hudTimer = null;
  }
  engine?.stop();
  engine = null;
  adapterInst = null;
  lastIdx = null;
  hudLine = '';
  hudEl.textContent = '';
  playerHost.innerHTML = '';
  cueEl.textContent = '—';
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.append(s);
  });
}

async function ensureYouTubeIframeApiReady(): Promise<void> {
  await loadScript('https://www.youtube.com/iframe_api');
  await new Promise<void>((resolve) => {
    const w = window as unknown as { YT?: YtApi; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) {
      resolve();
      return;
    }
    w.onYouTubeIframeAPIReady = () => resolve();
  });
}

async function bootPlayer(videoId: string): Promise<YtPlayerLike> {
  await ensureYouTubeIframeApiReady();
  const YT = (window as unknown as { YT?: YtApi }).YT;
  if (!YT?.Player) throw new Error('YouTube iframe API unavailable');

  return await new Promise<YtPlayerLike>((resolve, reject) => {
    new YT.Player(playerHost, {
      height: '360',
      width: '640',
      videoId,
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: (ev: { target: YtPlayerLike }) => resolve(ev.target),
        onError: (ev: { data: number }) => reject(new Error(`YouTube player error ${String(ev.data)}`)),
      },
    });
  });
}

function attachHud(adapter: InstanceType<typeof YtIframePlayerAdapter>): void {
  hudTimer = setInterval(() => {
    const t = adapter.getCurrentTime();
    const c = lastIdx !== null ? cues[lastIdx] : null;
    const inCue = Boolean(c && t >= c.startSec && t < c.endSec);
    const line = `t=${t.toFixed(3)}s state=${adapter.getState()} cueIdx=${String(lastIdx)} inCue=${String(inCue)}`;
    if (line !== hudLine) {
      hudLine = line;
      hudEl.textContent = line;
    }
  }, 250);
}

youtubeInput.placeholder = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function seedDefaults(): void {
  cuesTextarea.value = formatSel.value === 'srt' ? SAMPLE_SRT : SAMPLE_VTT;
}

formatSel.addEventListener('change', () => {
  const cur = cuesTextarea.value.trim();
  if (!cur || cur === SAMPLE_VTT.trim() || cur === SAMPLE_SRT.trim()) seedDefaults();
});

youtubeInput.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
seedDefaults();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  void run();
});

async function run(): Promise<void> {
  clearError();
  const rawUrl = youtubeInput.value.trim();
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) {
    showError('Could not parse a valid 11-character YouTube video ID from that input.');
    return;
  }

  const format = formatSel.value === 'srt' ? 'srt' : 'vtt';
  const text = cuesTextarea.value.replace(/\r\n/g, '\n');
  const parsed = parseCaption(text, format);
  if (!parsed.ok) {
    showError(parsed.error);
    return;
  }
  cues = parsed.value;

  stopTest();

  try {
    const ytTarget = await bootPlayer(videoId);
    adapterInst = new YtIframePlayerAdapter(ytTarget);
    const adapter = adapterInst;

    engine = makeSyncEngine({
      player: adapter,
      raf: new BrowserRafScheduler(),
      cues,
      onActiveCueChange: (idx) => {
        lastIdx = idx;
        const c = idx !== null ? cues[idx] : null;
        cueEl.textContent = c?.text ?? '';
      },
    });
    engine.start();
    attachHud(adapter);
  } catch (err) {
    showError(String(err));
    stopTest();
  }
}
