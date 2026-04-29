import { and, eq, gte, lt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { viewEvent } from '../db/schema.js';
import type { ViewReader, ViewWriter } from '../services/view-store.js';

export class PgViewRepo implements ViewWriter, ViewReader {
  constructor(private readonly db: Db) {}

  async logView(captionedResourceId: string, institutionId: string | null): Promise<void> {
    await this.db.insert(viewEvent).values({
      captionedResourceId,
      institutionId,
    });
  }

  /** yearMonth format YYYY-MM */
  async monthlyCountsByInstitution(
    institutionId: string,
    yearMonth: string,
  ): Promise<{ day: string; count: number }[]> {
    const [y, m] = yearMonth.split('-').map(Number);
    if (!y || !m) return [];
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const rows = await this.db
      .select()
      .from(viewEvent)
      .where(
        and(
          eq(viewEvent.institutionId, institutionId),
          gte(viewEvent.occurredAt, start),
          lt(viewEvent.occurredAt, end),
        ),
      );
    const map = new Map<string, number>();
    for (const r of rows) {
      const d = r.occurredAt.toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }
}
