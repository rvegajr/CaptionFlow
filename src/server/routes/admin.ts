import type { FastifyInstance } from 'fastify';
import type { ViewReader } from '../services/view-store.js';
import type { InstructorReader } from '../services/instructor-store.js';
import { readInstructorId } from '../lib/session.js';

interface Deps {
  views: ViewReader;
  instructors: InstructorReader;
}

export function registerAdminRoutes(app: FastifyInstance, deps: Deps): void {
  app.get('/api/admin/views/:yearMonth', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const inst = await deps.instructors.getById(instructorId);
    if (!inst || inst.role !== 'institution_admin' || !inst.institutionId) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    const { yearMonth } = req.params as { yearMonth: string };
    const rows = await deps.views.monthlyCountsByInstitution(inst.institutionId, yearMonth);
    return reply.send({
      institutionId: inst.institutionId,
      yearMonth,
      days: rows,
    });
  });
}
