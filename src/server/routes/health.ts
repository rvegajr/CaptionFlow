import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';

export function registerHealthRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get('/health', async (_req, reply) => {
    try {
      await deps.db.execute(sql`select 1`);
      return reply.send({ status: 'ok', db: 'ok' });
    } catch {
      return reply.code(503).send({ status: 'error', db: 'down' });
    }
  });
}
