import { eq, and } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { ltiPlatform } from '../db/schema.js';

export interface LtiPlatform {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksUrl: string;
  deploymentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLtiPlatformInput {
  name: string;
  issuerUrl: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksUrl: string;
  deploymentIds?: string[];
}

export interface UpdateLtiPlatformInput {
  name?: string;
  authEndpoint?: string;
  tokenEndpoint?: string;
  jwksUrl?: string;
  deploymentIds?: string[];
}

export class PgLtiPlatformRepo {
  constructor(private db: Db) {}

  async findAll(): Promise<LtiPlatform[]> {
    const rows = await this.db.select().from(ltiPlatform);
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<LtiPlatform | null> {
    const rows = await this.db.select().from(ltiPlatform).where(eq(ltiPlatform.id, id)).limit(1);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async findByIssuerAndClient(issuerUrl: string, clientId: string): Promise<LtiPlatform | null> {
    const rows = await this.db
      .select()
      .from(ltiPlatform)
      .where(and(eq(ltiPlatform.issuerUrl, issuerUrl), eq(ltiPlatform.clientId, clientId)))
      .limit(1);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async create(input: CreateLtiPlatformInput): Promise<LtiPlatform> {
    const rows = await this.db
      .insert(ltiPlatform)
      .values({
        name: input.name,
        issuerUrl: input.issuerUrl,
        clientId: input.clientId,
        authEndpoint: input.authEndpoint,
        tokenEndpoint: input.tokenEndpoint,
        jwksUrl: input.jwksUrl,
        deploymentIds: input.deploymentIds ?? [],
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error('Failed to create LTI platform');
    return mapRow(row);
  }

  async update(id: string, input: UpdateLtiPlatformInput): Promise<LtiPlatform | null> {
    const rows = await this.db
      .update(ltiPlatform)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.authEndpoint !== undefined ? { authEndpoint: input.authEndpoint } : {}),
        ...(input.tokenEndpoint !== undefined ? { tokenEndpoint: input.tokenEndpoint } : {}),
        ...(input.jwksUrl !== undefined ? { jwksUrl: input.jwksUrl } : {}),
        ...(input.deploymentIds !== undefined ? { deploymentIds: input.deploymentIds } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ltiPlatform.id, id))
      .returning();
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(ltiPlatform).where(eq(ltiPlatform.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

function mapRow(row: typeof ltiPlatform.$inferSelect): LtiPlatform {
  return {
    id: row.id,
    name: row.name,
    issuerUrl: row.issuerUrl,
    clientId: row.clientId,
    authEndpoint: row.authEndpoint,
    tokenEndpoint: row.tokenEndpoint,
    jwksUrl: row.jwksUrl,
    deploymentIds: row.deploymentIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
