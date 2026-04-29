export type PlayerState = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended';

export interface YouTubePlayer {
  getCurrentTime(): number;
  getState(): PlayerState;
  onStateChange(cb: (s: PlayerState) => void): () => void;
}

export interface RafScheduler {
  schedule(cb: (timestampMs: number) => void): number;
  cancel(handle: number): void;
}

export class BrowserRafScheduler implements RafScheduler {
  schedule(cb: (timestampMs: number) => void): number {
    return requestAnimationFrame(cb);
  }

  cancel(handle: number): void {
    cancelAnimationFrame(handle);
  }
}

/** YT.PlayerState numeric codes from IFrame API */
function ytPlayerStateToOurState(data: number): PlayerState {
  switch (data) {
    case 1:
      return 'playing';
    case 2:
      return 'paused';
    case 3:
      return 'buffering';
    case 0:
      return 'ended';
    case -1:
    case 5:
    default:
      return 'idle';
  }
}

export interface YtPlayerLike {
  getCurrentTime(): number;
  getPlayerState(): number;
  addEventListener(event: 'onStateChange', handler: (e: { data: number }) => void): void;
}

export class YtIframePlayerAdapter implements YouTubePlayer {
  private state: PlayerState = 'idle';
  private subs = new Set<(s: PlayerState) => void>();

  constructor(private readonly player: YtPlayerLike) {
    this.state = ytPlayerStateToOurState(player.getPlayerState());
    player.addEventListener('onStateChange', (e: { data: number }) => {
      this.state = ytPlayerStateToOurState(e.data);
      this.subs.forEach((cb) => cb(this.state));
    });
  }

  getCurrentTime(): number {
    return this.player.getCurrentTime();
  }

  getState(): PlayerState {
    return this.state;
  }

  onStateChange(cb: (s: PlayerState) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
}
