import type { FastifyInstance } from 'fastify';
import type { CaptionReader } from '../services/caption-store.js';
import type { GrantWriter } from '../services/grant-store.js';
import type { InstructorReader } from '../services/instructor-store.js';
import { readInstructorId } from '../lib/session.js';

interface Deps {
  captions: CaptionReader;
  instructors: InstructorReader;
  grants: GrantWriter;
}

export function registerGrantRoutes(app: FastifyInstance, deps: Deps): void {
  app.post('/api/captions/:id/share', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const body = req.body as { granteeEmail?: string };
    const email = body.granteeEmail?.trim().toLowerCase();
    if (!email) return reply.code(400).send({ error: 'granteeEmail required' });
    const cap = await deps.captions.getById(id);
    if (!cap || cap.instructorId !== instructorId) {
      return reply.code(404).send({ error: 'not found' });
    }
    const grantee = await deps.instructors.findByEmail(email);
    if (!grantee) return reply.code(404).send({ error: 'grantee instructor not found' });
    await deps.grants.grant(id, grantee.id);
    return reply.send({ ok: true });
  });
}
