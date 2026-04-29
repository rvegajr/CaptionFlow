export interface Cue {
  startSec: number;
  endSec: number;
  text: string;
}

export type CaptionFormat = 'srt' | 'vtt';
