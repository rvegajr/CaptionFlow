import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { captionGrant } from '../db/schema.js';
import type { GrantReader, GrantWriter } from '../services/grant-store.js';

export class PgGrantRepo implements GrantWriter, GrantReader {
  constructor(private readonly db: Db) {}

  async grant(ownerCaptionId: string, granteeInstructorId: string): Promise<void> {
    await this.db
      .insert(captionGrant)
      .values({ ownerCaptionId, granteeInstructorId })
      .onConflictDoNothing({
        target: [captionGrant.ownerCaptionId, captionGrant.granteeInstructorId],
      });
  }

  async revoke(ownerCaptionId: string, granteeInstructorId: string): Promise<void> {
    await this.db
      .delete(captionGrant)
      .where(
        and(
          eq(captionGrant.ownerCaptionId, ownerCaptionId),
          eq(captionGrant.granteeInstructorId, granteeInstructorId),
        ),
      );
  }

  async hasGrant(ownerCaptionId: string, granteeInstructorId: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(captionGrant)
      .where(
        and(
          eq(captionGrant.ownerCaptionId, ownerCaptionId),
          eq(captionGrant.granteeInstructorId, granteeInstructorId),
        ),
      );
    return rows.length > 0;
  }
}
