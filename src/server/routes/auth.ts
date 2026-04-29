import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { magicLink } from '../db/schema.js';
import type { Clock } from '../services/clock.js';
import type { IdGenerator } from '../services/id-generator.js';
import type { InstructorReader, InstructorWriter } from '../services/instructor-store.js';
import type { MagicLinkSender } from '../services/magic-link-sender.js';
import { clearInstructorCookie, readInstructorId, setInstructorCookie } from '../lib/session.js';

interface Deps {
  db: Db;
  instructors: InstructorReader & InstructorWriter;
  magicLinks: MagicLinkSender;
  clock: Clock;
  ids: IdGenerator;
  baseUrl: string;
  isProd: boolean;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function registerAuthRoutes(app: FastifyInstance, deps: Deps): void {
  app.post('/auth/magic-link', async (req, reply) => {
    const body = req.body as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'valid email required' });
    }
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(deps.clock.now().getTime() + 15 * 60 * 1000);
    await deps.db.insert(magicLink).values({ email, tokenHash, expiresAt });
    const link = `${deps.baseUrl}/auth/callback?token=${encodeURIComponent(token)}`;
    await deps.magicLinks.send(email, link);
    return reply.send({ ok: true });
  });

  app.get('/auth/callback', async (req, reply) => {
    const q = req.query as { token?: string };
    const token = q.token;
    if (!token) return reply.code(400).send('missing token');
    const tokenHash = hashToken(token);
    const rows = await deps.db.select().from(magicLink).where(eq(magicLink.tokenHash, tokenHash));
    const row = rows[0];
    if (!row) return reply.code(400).send('invalid token');
    if (row.usedAt) return reply.code(400).send('token used');
    if (row.expiresAt < deps.clock.now()) return reply.code(400).send('expired');
    await deps.db.update(magicLink).set({ usedAt: deps.clock.now() }).where(eq(magicLink.id, row.id));
    let inst = await deps.instructors.findByEmail(row.email);
    if (!inst) inst = await deps.instructors.create(row.email);
    setInstructorCookie(reply, inst.id, { secure: deps.isProd });
    return reply.redirect(`${deps.baseUrl}/`);
  });

  app.post('/auth/logout', async (req, reply) => {
    clearInstructorCookie(reply, { secure: deps.isProd });
    return reply.send({ ok: true });
  });

  app.get('/api/me', async (req, reply) => {
    const id = readInstructorId(req);
    if (!id) return reply.code(401).send({ error: 'unauthorized' });
    const inst = await deps.instructors.getById(id);
    if (!inst) return reply.code(401).send({ error: 'unauthorized' });
    return reply.send(inst);
  });
}
