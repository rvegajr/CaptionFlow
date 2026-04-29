import type { Result } from './result.js';
import { parseSrt } from './srt.js';
import { parseVtt } from './vtt.js';
import type { CaptionFormat, Cue } from './types.js';

export type { Cue, CaptionFormat, Result };

/** Sort cues by start time (required for binary search in sync engine). */
export function sortCuesByStart(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.startSec - b.startSec);
}

export function parseCaption(text: string, format: CaptionFormat): Result<Cue[], string> {
  const raw = format === 'srt' ? parseSrt(text) : parseVtt(text);
  if (!raw.ok) return raw;
  return { ok: true, value: sortCuesByStart(raw.value) };
}
