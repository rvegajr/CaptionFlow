import type { FastifyInstance } from 'fastify';
import type { ViewReader } from '../services/view-store.js';
import type { InstructorReader } from '../services/instructor-store.js';
import type { PgLtiPlatformRepo } from '../repos/pg-lti-platform-repo.js';
import { readInstructorId } from '../lib/session.js';

interface Deps {
  views: ViewReader;
  instructors: InstructorReader;
  ltiPlatforms?: PgLtiPlatformRepo;
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

  // LTI Platform Management (admin-only)
  if (deps.ltiPlatforms) {
    app.get('/api/admin/lti/platforms', async (req, reply) => {
      const instructorId = readInstructorId(req);
      if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
      const inst = await deps.instructors.getById(instructorId);
      if (!inst || inst.role !== 'institution_admin') {
        return reply.code(403).send({ error: 'forbidden' });
      }
      const platforms = await deps.ltiPlatforms!.findAll();
      return reply.send({ platforms });
    });

    app.post('/api/admin/lti/platforms', async (req, reply) => {
      const instructorId = readInstructorId(req);
      if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
      const inst = await deps.instructors.getById(instructorId);
      if (!inst || inst.role !== 'institution_admin') {
        return reply.code(403).send({ error: 'forbidden' });
      }
      const body = req.body as {
        name: string;
        issuerUrl: string;
        clientId: string;
        authEndpoint: string;
        tokenEndpoint: string;
        jwksUrl: string;
        deploymentIds?: string[];
      };
      const platform = await deps.ltiPlatforms!.create(body);
      return reply.send({ platform });
    });

    app.put('/api/admin/lti/platforms/:id', async (req, reply) => {
      const instructorId = readInstructorId(req);
      if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
      const inst = await deps.instructors.getById(instructorId);
      if (!inst || inst.role !== 'institution_admin') {
        return reply.code(403).send({ error: 'forbidden' });
      }
      const { id } = req.params as { id: string };
      const body = req.body as {
        name?: string;
        authEndpoint?: string;
        tokenEndpoint?: string;
        jwksUrl?: string;
        deploymentIds?: string[];
      };
      const platform = await deps.ltiPlatforms!.update(id, body);
      if (!platform) return reply.code(404).send({ error: 'platform not found' });
      return reply.send({ platform });
    });

    app.delete('/api/admin/lti/platforms/:id', async (req, reply) => {
      const instructorId = readInstructorId(req);
      if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
      const inst = await deps.instructors.getById(instructorId);
      if (!inst || inst.role !== 'institution_admin') {
        return reply.code(403).send({ error: 'forbidden' });
      }
      const { id } = req.params as { id: string };
      const deleted = await deps.ltiPlatforms!.delete(id);
      if (!deleted) return reply.code(404).send({ error: 'platform not found' });
      return reply.send({ success: true });
    });
  }
}
