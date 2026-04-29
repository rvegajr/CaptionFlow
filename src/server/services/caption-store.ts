export type CaptionFormat = 'srt' | 'vtt';

export interface Caption {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  format: CaptionFormat;
  languageCode: string;
  contentText: string;
  isMachineTranslated: boolean;
  sourceCaptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCaption {
  instructorId: string;
  youtubeVideoId: string;
  format: CaptionFormat;
  languageCode: string;
  contentText: string;
  isMachineTranslated?: boolean;
  sourceCaptionId?: string | null;
  contentHash?: string | null;
}

export interface CaptionReader {
  getById(id: string): Promise<Caption | null>;
  listByInstructor(instructorId: string): Promise<Caption[]>;
  findMachineTranslation(sourceCaptionId: string, languageCode: string): Promise<Caption | null>;
}

export interface CaptionWriter {
  create(input: NewCaption): Promise<Caption>;
  replaceContent(id: string, contentText: string, format: CaptionFormat): Promise<Caption>;
  delete(id: string): Promise<void>;
}

export interface CaptionSearcher {
  listBorrowableForVideo(youtubeVideoId: string, excludeInstructorId: string): Promise<Caption[]>;
}
