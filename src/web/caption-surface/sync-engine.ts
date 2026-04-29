import type { Cue } from '@shared/types.js';
import type { PlayerState, RafScheduler, YouTubePlayer } from './youtube-player.js';

export interface SyncEngineDeps {
  player: YouTubePlayer;
  raf: RafScheduler;
  cues: readonly Cue[];
  onActiveCueChange: (cueIndex: number | null) => void;
}

export interface SyncEngine {
  start(): void;
  stop(): void;
}

export function makeSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const { player, raf, cues, onActiveCueChange } = deps;
  let activeIndex: number | null = null;
  let rafHandle: number | null = null;
  let unsub: (() => void) | null = null;
  let stableFramesSinceBuffering = Number.POSITIVE_INFINITY;

  const findCueIndex = (t: number): number | null => {
    let lo = 0;
    let hi = cues.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = cues[mid]!;
      if (t < c.startSec) hi = mid - 1;
      else if (t >= c.endSec) lo = mid + 1;
      else return mid;
    }
    return null;
  };

  const tick = (): void => {
    if (player.getState() !== 'playing') {
      rafHandle = null;
      return;
    }
    if (stableFramesSinceBuffering < 2) {
      stableFramesSinceBuffering++;
      rafHandle = raf.schedule(tick);
      return;
    }
    const idx = findCueIndex(player.getCurrentTime());
    if (idx !== activeIndex) {
      activeIndex = idx;
      onActiveCueChange(idx);
    }
    rafHandle = raf.schedule(tick);
  };

  const onState = (s: PlayerState): void => {
    if (s === 'playing') {
      stableFramesSinceBuffering = 0;
      if (rafHandle === null) rafHandle = raf.schedule(tick);
    } else if (s === 'buffering') {
      stableFramesSinceBuffering = 0;
    } else {
      const idx = findCueIndex(player.getCurrentTime());
      if (idx !== activeIndex) {
        activeIndex = idx;
        onActiveCueChange(idx);
      }
      if (rafHandle !== null) {
        raf.cancel(rafHandle);
        rafHandle = null;
      }
    }
  };

  return {
    start(): void {
      unsub = player.onStateChange(onState);
      onState(player.getState());
    },
    stop(): void {
      unsub?.();
      if (rafHandle !== null) {
        raf.cancel(rafHandle);
        rafHandle = null;
      }
    },
  };
}
