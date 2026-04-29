import type { FastifyInstance } from 'fastify';
import { parseYouTubeVideoId } from '../../shared/youtube-id.js';
import type { ResourceReader, ResourceWriter } from '../services/resource-store.js';
import { readInstructorId } from '../lib/session.js';

interface Deps {
  resources: ResourceReader & ResourceWriter;
}

export function registerResourceRoutes(app: FastifyInstance, deps: Deps): void {
  app.get('/api/resources', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    return deps.resources.listByInstructor(instructorId);
  });

  app.post('/api/resources', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const body = req.body as { youtubeUrl?: string; defaultCaptionId?: string | null };
    const vid = body.youtubeUrl ? parseYouTubeVideoId(body.youtubeUrl) : null;
    if (!vid) return reply.code(400).send({ error: 'youtubeUrl or video id required' });
    const created = await deps.resources.create({
      instructorId,
      youtubeVideoId: vid,
      defaultCaptionId: body.defaultCaptionId ?? null,
    });
    return reply.send(created);
  });

  app.patch('/api/resources/:id', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const body = req.body as { defaultCaptionId?: string | null };
    if (body.defaultCaptionId === undefined) {
      return reply.code(400).send({ error: 'defaultCaptionId required' });
    }
    try {
      const updated = await deps.resources.updateDefaultCaption(id, instructorId, body.defaultCaptionId);
      return reply.send(updated);
    } catch {
      return reply.code(404).send({ error: 'not found' });
    }
  });

  app.delete('/api/resources/:id', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    await deps.resources.delete(id, instructorId);
    return reply.code(204).send();
  });
}
