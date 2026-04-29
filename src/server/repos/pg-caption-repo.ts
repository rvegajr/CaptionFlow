import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { caption, captionGrant } from '../db/schema.js';
import type {
  Caption,
  CaptionFormat,
  CaptionReader,
  CaptionSearcher,
  CaptionWriter,
  NewCaption,
} from '../services/caption-store.js';
import { mapCaption } from './map-row.js';

export class PgCaptionRepo implements CaptionReader, CaptionWriter, CaptionSearcher {
  constructor(private readonly db: Db) {}

  async getById(id: string): Promise<Caption | null> {
    const rows = await this.db.select().from(caption).where(eq(caption.id, id));
    const r = rows[0];
    return r ? mapCaption(r) : null;
  }

  async listByInstructor(instructorId: string): Promise<Caption[]> {
    const rows = await this.db.select().from(caption).where(eq(caption.instructorId, instructorId));
    return rows.map(mapCaption);
  }

  async findMachineTranslation(
    sourceCaptionId: string,
    languageCode: string,
  ): Promise<Caption | null> {
    const rows = await this.db
      .select()
      .from(caption)
      .where(
        and(
          eq(caption.sourceCaptionId, sourceCaptionId),
          eq(caption.languageCode, languageCode),
          eq(caption.isMachineTranslated, true),
        ),
      );
    const r = rows[0];
    return r ? mapCaption(r) : null;
  }

  async create(input: NewCaption): Promise<Caption> {
    const [row] = await this.db
      .insert(caption)
      .values({
        instructorId: input.instructorId,
        youtubeVideoId: input.youtubeVideoId,
        format: input.format,
        languageCode: input.languageCode,
        contentText: input.contentText,
        isMachineTranslated: input.isMachineTranslated ?? false,
        sourceCaptionId: input.sourceCaptionId ?? null,
        contentHash: input.contentHash ?? null,
      })
      .returning();
    if (!row) throw new Error('caption insert returned no rows');
    return mapCaption(row);
  }

  async replaceContent(id: string, contentText: string, format: CaptionFormat): Promise<Caption> {
    const [row] = await this.db
      .update(caption)
      .set({ contentText, format, updatedAt: new Date() })
      .where(eq(caption.id, id))
      .returning();
    if (!row) throw new Error(`caption ${id} not found`);
    return mapCaption(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(caption).where(eq(caption.id, id));
  }

  async listBorrowableForVideo(
    youtubeVideoId: string,
    granteeInstructorId: string,
  ): Promise<Caption[]> {
    const granteeRows = await this.db
      .select({ cap: caption })
      .from(captionGrant)
      .innerJoin(caption, eq(caption.id, captionGrant.ownerCaptionId))
      .where(
        and(
          eq(captionGrant.granteeInstructorId, granteeInstructorId),
          eq(caption.youtubeVideoId, youtubeVideoId),
          eq(caption.isMachineTranslated, false),
        ),
      );
    return granteeRows.map((x) => mapCaption(x.cap));
  }
}
