import { describe, expect, it } from 'vitest';
import { parseVtt } from './vtt.js';

describe('parseVtt', () => {
  it('parses WEBVTT with one cue', () => {
    const input = `WEBVTT

00:00:01.000 --> 00:00:02.500
Hello
`;
    const r = parseVtt(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([{ startSec: 1, endSec: 2.5, text: 'Hello' }]);
  });

  it('strips inline tags', () => {
    const input = `WEBVTT

00:00:00.000 --> 00:00:01.000
<v Alice>Hi there</v>
`;
    const r = parseVtt(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]?.text).toBe('Hi there');
  });
});
