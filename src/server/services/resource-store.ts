export interface CaptionedResource {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  defaultCaptionId: string | null;
  ltiResourceLinkId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewResource {
  instructorId: string;
  youtubeVideoId: string;
  defaultCaptionId: string | null;
  ltiResourceLinkId?: string | null;
}

export interface ResourceReader {
  getById(id: string): Promise<CaptionedResource | null>;
  listByInstructor(instructorId: string): Promise<CaptionedResource[]>;
  findByLtiResourceLink(ltiResourceLinkId: string): Promise<CaptionedResource | null>;
}

export interface ResourceWriter {
  create(input: NewResource): Promise<CaptionedResource>;
  updateDefaultCaption(id: string, instructorId: string, defaultCaptionId: string | null): Promise<CaptionedResource>;
  delete(id: string, instructorId: string): Promise<void>;
}
