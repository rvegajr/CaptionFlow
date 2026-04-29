import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseSrt } from './srt.js';
import type { Cue } from './types.js';

function renderSrt(cues: Cue[]): string {
  let out = '';
  cues.forEach((c, idx) => {
    const si = formatTs(c.startSec);
    const ei = formatTs(c.endSec);
    out += `${idx + 1}\n${si} --> ${ei}\n${c.text.replace(/\n/g, '\n')}\n\n`;
  });
  return out;
}

function formatTs(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  const pad = (n: number, w: number) => String(n).padStart(w, '0');
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

function sortAndDedup(cues: Cue[]): Cue[] {
  const sorted = [...cues].sort((a, b) => a.startSec - b.startSec);
  return sorted.filter((c, i) => i === 0 || c.startSec >= sorted[i - 1]!.endSec);
}

describe('parseSrt', () => {
  it('parses a single cue', () => {
    const input = `1
00:00:01,000 --> 00:00:02,500
Hello, world.
`;
    const result = parseSrt(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ startSec: 1.0, endSec: 2.5, text: 'Hello, world.' }]);
  });

  it('parses multiple cues', () => {
    const input = `1
00:00:00,000 --> 00:00:01,000
A

2
00:00:02,000 --> 00:00:03,000
B
`;
    const r = parseSrt(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
  });

  it('handles CRLF', () => {
    const input = '1\r\n00:00:01,000 --> 00:00:02,000\r\nHi\r\n';
    const r = parseSrt(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.text).toBe('Hi');
  });

  it('strips BOM', () => {
    const input = '\uFEFF1\n00:00:01,000 --> 00:00:02,000\nx\n';
    const r = parseSrt(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.text).toBe('x');
  });

  it('rejects end before start', () => {
    const r = parseSrt('1\n00:00:02,000 --> 00:00:01,000\nx\n');
    expect(r.ok).toBe(false);
  });

  it('property: parse(render(cues)) round-trip for non-overlapping sorted cues', () => {
    const arbCue = fc
      .tuple(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0.05, max: 5, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => !s.includes('\n\n') && !s.includes('\r')),
      )
      .map(([start, dur, text]) => ({
        startSec: Math.round(start * 1000) / 1000,
        endSec: Math.round((start + dur) * 1000) / 1000,
        text,
      }));

    fc.assert(
      fc.property(fc.array(arbCue, { minLength: 1, maxLength: 12 }), (raw) => {
        const cues = sortAndDedup(raw);
        if (cues.length === 0) return true;
        const text = renderSrt(cues);
        const parsed = parseSrt(text);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return false;
        expect(parsed.value.length).toBe(cues.length);
        for (let i = 0; i < cues.length; i++) {
          expect(parsed.value[i]!.startSec).toBeCloseTo(cues[i]!.startSec, 2);
          expect(parsed.value[i]!.endSec).toBeCloseTo(cues[i]!.endSec, 2);
          expect(parsed.value[i]!.text).toBe(cues[i]!.text);
        }
        return true;
      }),
      { numRuns: 50 },
    );
  });
});
