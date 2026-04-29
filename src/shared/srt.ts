import { err, ok, type Result } from './result.js';
import type { Cue } from './types.js';

const TIMING_RE =
  /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/;

function toSec(h: string, mn: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(mn) * 60 + Number(s) + Number(ms) / 1000;
}

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) return input.slice(1);
  return input;
}

export function parseSrt(input: string): Result<Cue[], string> {
  const normalized = stripBom(input).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const cues: Cue[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i]?.trim() === '') i++;
    if (i >= lines.length) break;

    const maybeIndex = lines[i]?.trim() ?? '';
    if (/^\d+$/.test(maybeIndex)) {
      i++;
    }

    const timingLine = lines[i++];
    if (!timingLine) return err('missing timing');
    const m = timingLine.match(TIMING_RE);
    if (!m) return err(`bad timing: ${timingLine}`);

    const startSec = toSec(m[1]!, m[2]!, m[3]!, m[4]!);
    const endSec = toSec(m[5]!, m[6]!, m[7]!, m[8]!);
    if (endSec < startSec) return err('end before start');

    const textLines: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      textLines.push(lines[i]!);
      i++;
    }
    cues.push({ startSec, endSec, text: textLines.join('\n') });
  }

  return ok(cues);
}
