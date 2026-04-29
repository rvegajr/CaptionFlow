import type { PlayerState, RafScheduler, YouTubePlayer } from './youtube-player.js';

export class FakePlayer implements YouTubePlayer {
  private t = 0;
  private s: PlayerState = 'idle';
  private subs = new Set<(s: PlayerState) => void>();

  getCurrentTime(): number {
    return this.t;
  }

  getState(): PlayerState {
    return this.s;
  }

  onStateChange(cb: (s: PlayerState) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  setTime(t: number): void {
    this.t = t;
  }

  setState(s: PlayerState): void {
    this.s = s;
    this.subs.forEach((cb) => cb(s));
  }
}

export class FakeRaf implements RafScheduler {
  private next = 1;
  private pending = new Map<number, (ts: number) => void>();
  private now = 0;

  schedule(cb: (ts: number) => void): number {
    const h = this.next++;
    this.pending.set(h, cb);
    return h;
  }

  cancel(h: number): void {
    this.pending.delete(h);
  }

  tick(deltaMs = 16): void {
    this.now += deltaMs;
    const cbs = [...this.pending.values()];
    this.pending.clear();
    cbs.forEach((cb) => cb(this.now));
  }
}
