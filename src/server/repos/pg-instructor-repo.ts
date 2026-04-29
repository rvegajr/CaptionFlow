import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { instructor } from '../db/schema.js';
import type { Instructor, InstructorReader, InstructorWriter } from '../services/instructor-store.js';
import { mapInstructor } from './map-row.js';

export class PgInstructorRepo implements InstructorReader, InstructorWriter {
  constructor(private readonly db: Db) {}

  async getById(id: string): Promise<Instructor | null> {
    const rows = await this.db.select().from(instructor).where(eq(instructor.id, id));
    const r = rows[0];
    return r ? mapInstructor(r) : null;
  }

  async findByEmail(email: string): Promise<Instructor | null> {
    const rows = await this.db.select().from(instructor).where(eq(instructor.email, email));
    const r = rows[0];
    return r ? mapInstructor(r) : null;
  }

  async create(email: string, displayName?: string | null): Promise<Instructor> {
    const [row] = await this.db
      .insert(instructor)
      .values({ email, displayName: displayName ?? null })
      .returning();
    if (!row) throw new Error('instructor insert failed');
    return mapInstructor(row);
  }

  async setInstitutionAndLti(
    id: string,
    institutionId: string,
    ltiSub: string,
    displayName?: string | null,
  ): Promise<Instructor> {
    const patch: {
      institutionId: string;
      ltiSub: string;
      displayName?: string | null;
    } = { institutionId, ltiSub };
    if (displayName !== undefined) patch.displayName = displayName;
    const [row] = await this.db.update(instructor).set(patch).where(eq(instructor.id, id)).returning();
    if (!row) throw new Error('instructor not found');
    return mapInstructor(row);
  }
}
