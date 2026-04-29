import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { institution } from '../db/schema.js';
import type { Institution, InstitutionReader, InstitutionWriter } from '../services/institution-store.js';
import { mapInstitution } from './map-row.js';

export class PgInstitutionRepo implements InstitutionReader, InstitutionWriter {
  constructor(private readonly db: Db) {}

  async findByLti(iss: string, clientId: string, deploymentId: string): Promise<Institution | null> {
    const rows = await this.db
      .select()
      .from(institution)
      .where(
        and(
          eq(institution.ltiIss, iss),
          eq(institution.ltiClientId, clientId),
          eq(institution.ltiDeploymentId, deploymentId),
        ),
      );
    const r = rows[0];
    return r ? mapInstitution(r) : null;
  }

  async upsertByLti(
    input: Pick<
      Institution,
      'name' | 'ltiIss' | 'ltiClientId' | 'ltiDeploymentId' | 'licenseMaxViewsPerTerm'
    >,
  ): Promise<Institution> {
    const existing = await this.findByLti(input.ltiIss, input.ltiClientId, input.ltiDeploymentId);
    if (existing) {
      const [row] = await this.db
        .update(institution)
        .set({
          name: input.name,
          licenseMaxViewsPerTerm: input.licenseMaxViewsPerTerm,
        })
        .where(eq(institution.id, existing.id))
        .returning();
      if (!row) return existing;
      return mapInstitution(row);
    }
    const [row] = await this.db
      .insert(institution)
      .values({
        name: input.name,
        ltiIss: input.ltiIss,
        ltiClientId: input.ltiClientId,
        ltiDeploymentId: input.ltiDeploymentId,
        licenseMaxViewsPerTerm: input.licenseMaxViewsPerTerm,
      })
      .returning();
    if (!row) throw new Error('institution insert failed');
    return mapInstitution(row);
  }
}
