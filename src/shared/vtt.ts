import { err, ok, type Result } from './result.js';
import type { Cue } from './types.js';

const TIMING_RE =
  /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

function toSec(h: string, mn: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(mn) * 60 + Number(s) + Number(ms) / 1000;
}

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) return input.slice(1);
  return input;
}

/** Strip simple VTT inline tags like <v Name> or <c> */
function stripVttTags(line: string): string {
  return line.replace(/<[^>]+>/g, '').trim();
}

export function parseVtt(input: string): Result<Cue[], string> {
  const normalized = stripBom(input).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let i = 0;

  if (!lines[0]?.startsWith('WEBVTT')) {
    return err('missing WEBVTT header');
  }
  while (i < lines.length && (lines[i] ?? '').trim() !== '') {
    i++;
  }
  while (i < lines.length && (lines[i] ?? '').trim() === '') i++;

  const cues: Cue[] = [];

  while (i < lines.length) {
    while (i < lines.length && (lines[i] ?? '').trim() === '') i++;
    if (i >= lines.length) break;

    const line = lines[i] ?? '';
    if (line.includes('NOTE') || line.startsWith('STYLE') || line.startsWith('REGION')) {
      while (i < lines.length && (lines[i] ?? '').trim() !== '') i++;
      continue;
    }

    const timingLine = lines[i++];
    if (!timingLine) return err('missing timing');
    const m = timingLine.match(TIMING_RE);
    if (!m) {
      if (timingLine.includes('-->')) return err(`bad timing: ${timingLine}`);
      continue;
    }

    const startSec = toSec(m[1]!, m[2]!, m[3]!, m[4]!);
    const endSec = toSec(m[5]!, m[6]!, m[7]!, m[8]!);
    if (endSec < startSec) return err('end before start');

    const textLines: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      textLines.push(stripVttTags(lines[i]!));
      i++;
    }
    cues.push({ startSec, endSec, text: textLines.join('\n') });
  }

  return ok(cues);
}
