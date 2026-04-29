import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { captionedResource } from '../db/schema.js';
import type {
  CaptionedResource,
  NewResource,
  ResourceReader,
  ResourceWriter,
} from '../services/resource-store.js';
import { mapResource } from './map-row.js';

export class PgResourceRepo implements ResourceReader, ResourceWriter {
  constructor(private readonly db: Db) {}

  async getById(id: string): Promise<CaptionedResource | null> {
    const rows = await this.db.select().from(captionedResource).where(eq(captionedResource.id, id));
    const r = rows[0];
    return r ? mapResource(r) : null;
  }

  async listByInstructor(instructorId: string): Promise<CaptionedResource[]> {
    const rows = await this.db
      .select()
      .from(captionedResource)
      .where(eq(captionedResource.instructorId, instructorId));
    return rows.map(mapResource);
  }

  async findByLtiResourceLink(ltiResourceLinkId: string): Promise<CaptionedResource | null> {
    const rows = await this.db
      .select()
      .from(captionedResource)
      .where(eq(captionedResource.ltiResourceLinkId, ltiResourceLinkId));
    const r = rows[0];
    return r ? mapResource(r) : null;
  }

  async create(input: NewResource): Promise<CaptionedResource> {
    const [row] = await this.db
      .insert(captionedResource)
      .values({
        instructorId: input.instructorId,
        youtubeVideoId: input.youtubeVideoId,
        defaultCaptionId: input.defaultCaptionId,
        ltiResourceLinkId: input.ltiResourceLinkId ?? null,
      })
      .returning();
    if (!row) throw new Error('resource insert failed');
    return mapResource(row);
  }

  async updateDefaultCaption(
    id: string,
    instructorId: string,
    defaultCaptionId: string | null,
  ): Promise<CaptionedResource> {
    const [row] = await this.db
      .update(captionedResource)
      .set({ defaultCaptionId, updatedAt: new Date() })
      .where(and(eq(captionedResource.id, id), eq(captionedResource.instructorId, instructorId)))
      .returning();
    if (!row) throw new Error('resource not found');
    return mapResource(row);
  }

  async delete(id: string, instructorId: string): Promise<void> {
    await this.db
      .delete(captionedResource)
      .where(and(eq(captionedResource.id, id), eq(captionedResource.instructorId, instructorId)));
  }
}
