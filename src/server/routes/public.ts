import type { FastifyInstance } from 'fastify';
import { parseCaption } from '../../shared/cues.js';
import type { CaptionReader } from '../services/caption-store.js';
import type { InstructorReader } from '../services/instructor-store.js';
import type { ResourceReader } from '../services/resource-store.js';
import type { ViewWriter } from '../services/view-store.js';

interface Deps {
  resources: ResourceReader;
  captions: CaptionReader;
  views: ViewWriter;
  instructors: InstructorReader;
}

export function registerPublicRoutes(app: FastifyInstance, deps: Deps): void {
  app.get('/api/public/resources/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const res = await deps.resources.getById(id);
    if (!res) return reply.code(404).send({ error: 'not found' });
    if (!res.defaultCaptionId) {
      return reply.code(400).send({ error: 'no default caption' });
    }
    const instructor = await deps.instructors.getById(res.instructorId);
    const institutionId = instructor?.institutionId ?? null;

    const all = await deps.captions.listByInstructor(res.instructorId);
    const forVideo = all.filter((c) => c.youtubeVideoId === res.youtubeVideoId);
    const tracks: {
      id: string;
      languageCode: string;
      isMachineTranslated: boolean;
      sourceCaptionId: string | null;
      cues: import('../../shared/types.js').Cue[];
    }[] = [];
    for (const cap of forVideo) {
      const cues = parseCaption(cap.contentText, cap.format);
      if (!cues.ok) continue;
      tracks.push({
        id: cap.id,
        languageCode: cap.languageCode,
        isMachineTranslated: cap.isMachineTranslated,
        sourceCaptionId: cap.sourceCaptionId,
        cues: cues.value,
      });
    }
    await deps.views.logView(res.id, institutionId);
    return reply.send({
      resourceId: res.id,
      youtubeVideoId: res.youtubeVideoId,
      defaultCaptionId: res.defaultCaptionId,
      tracks,
    });
  });
}
