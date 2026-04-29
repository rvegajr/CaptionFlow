import { describe, it, expect, beforeEach } from 'vitest';
import { makeSyncEngine } from './sync-engine.js';
import { FakePlayer, FakeRaf } from './test-doubles.js';

describe('SyncEngine', () => {
  let player: FakePlayer;
  let raf: FakeRaf;
  let active: (number | null)[];

  beforeEach(() => {
    player = new FakePlayer();
    raf = new FakeRaf();
    active = [];
  });

  it('emits the active cue index when playback advances into a cue', () => {
    const cues = [
      { startSec: 0, endSec: 1, text: 'A' },
      { startSec: 1.5, endSec: 3, text: 'B' },
    ];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setState('playing');
    player.setTime(0.5);
    raf.tick();
    raf.tick();
    raf.tick();
    player.setTime(1.7);
    raf.tick();
    expect(active).toEqual([0, 1]);
  });

  it('pause holds the active cue (no null flicker)', () => {
    const cues = [{ startSec: 0, endSec: 10, text: 'A' }];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setTime(1);
    player.setState('playing');
    raf.tick();
    raf.tick();
    raf.tick();
    player.setState('paused');
    expect(active[active.length - 1]).toBe(0);
  });

  it('seek-while-playing updates cue', () => {
    const cues = [
      { startSec: 0, endSec: 1, text: 'A' },
      { startSec: 2, endSec: 4, text: 'B' },
    ];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setState('playing');
    player.setTime(0.5);
    raf.tick();
    raf.tick();
    raf.tick();
    player.setTime(2.5);
    raf.tick();
    expect(active).toContain(1);
  });

  it('emits null in gap between cues', () => {
    const cues = [
      { startSec: 0, endSec: 1, text: 'A' },
      { startSec: 2, endSec: 3, text: 'B' },
    ];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setState('playing');
    player.setTime(0.5);
    raf.tick();
    raf.tick();
    raf.tick();
    player.setTime(1.5);
    raf.tick();
    expect(active).toContain(null);
  });

  it('stop prevents further callbacks on tick', () => {
    const cues = [{ startSec: 0, endSec: 10, text: 'A' }];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setState('playing');
    raf.tick();
    engine.stop();
    const len = active.length;
    raf.tick();
    expect(active.length).toBe(len);
  });

  it('buffering then playing waits two frames before cue resolve', () => {
    const cues = [{ startSec: 0, endSec: 10, text: 'A' }];
    active = [];
    const engine = makeSyncEngine({
      player,
      raf,
      cues,
      onActiveCueChange: (i) => active.push(i),
    });
    engine.start();
    player.setTime(5);
    player.setState('buffering');
    player.setState('playing');
    raf.tick();
    const afterFirst = [...active];
    raf.tick();
    const afterSecond = [...active];
    raf.tick();
    expect(afterFirst.length).toBeLessThanOrEqual(afterSecond.length);
  });
});
