import type { FastifyInstance } from 'fastify';
import { parseCaption } from '../../shared/cues.js';
import { parseYouTubeVideoId } from '../../shared/youtube-id.js';
import type { CaptionReader, CaptionSearcher, CaptionWriter } from '../services/caption-store.js';
import { readInstructorId } from '../lib/session.js';
import { sha256Hex } from '../lib/content-hash.js';
import { translateLines } from '../lib/translate-text.js';
import type { CaptionFormat } from '../services/caption-store.js';

interface Deps {
  captions: CaptionReader & CaptionWriter & CaptionSearcher;
  deeplKey?: string;
  googleTranslateKey?: string;
}

export function registerCaptionRoutes(app: FastifyInstance, deps: Deps): void {
  app.get('/api/captions', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    return deps.captions.listByInstructor(instructorId);
  });

  app.get('/api/captions/borrow/:youtubeVideoId', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { youtubeVideoId } = req.params as { youtubeVideoId: string };
    const list = await deps.captions.listBorrowableForVideo(youtubeVideoId, instructorId);
    return reply.send(list);
  });

  app.get('/api/captions/:id', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const c = await deps.captions.getById(id);
    if (!c || c.instructorId !== instructorId) return reply.code(404).send({ error: 'not found' });
    return reply.send(c);
  });

  app.post('/api/captions', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const mp = await req.file();
    if (!mp) return reply.code(400).send({ error: 'file required' });
    const buf = await mp.toBuffer();
    if (buf.length > 1_048_576) return reply.code(400).send({ error: 'file too large' });
    const text = buf.toString('utf-8');
    const fn = mp.filename.toLowerCase();
    const format: CaptionFormat = fn.endsWith('.srt') ? 'srt' : 'vtt';
    const fields = mp.fields as Record<string, { value?: string } | undefined>;
    const rawVid = fields.youtube_video_id?.value?.trim() ?? '';
    const youtubeVideoId = parseYouTubeVideoId(rawVid) ?? rawVid;
    const languageCode = fields.language_code?.value?.trim() ?? 'en';
    if (!rawVid) return reply.code(400).send({ error: 'youtube_video_id required' });
    if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId)) {
      return reply.code(400).send({ error: 'invalid youtube video id' });
    }
    const parsed = parseCaption(text, format);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const created = await deps.captions.create({
      instructorId,
      youtubeVideoId,
      format,
      languageCode,
      contentText: text,
      contentHash: sha256Hex(text),
    });
    return reply.send(created);
  });

  app.patch('/api/captions/:id', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const existing = await deps.captions.getById(id);
    if (!existing || existing.instructorId !== instructorId) {
      return reply.code(404).send({ error: 'not found' });
    }
    const mp = await req.file();
    if (mp) {
      const buf = await mp.toBuffer();
      const text = buf.toString('utf-8');
      const fn = mp.filename.toLowerCase();
      const format: CaptionFormat = fn.endsWith('.srt') ? 'srt' : 'vtt';
      const parsed = parseCaption(text, format);
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
      const updated = await deps.captions.replaceContent(id, text, format);
      return reply.send(updated);
    }
    const body = req.body as { contentText?: string; format?: CaptionFormat };
    if (!body.contentText || !body.format) return reply.code(400).send({ error: 'content required' });
    const parsed = parseCaption(body.contentText, body.format);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const updated = await deps.captions.replaceContent(id, body.contentText, body.format);
    return reply.send(updated);
  });

  app.delete('/api/captions/:id', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const existing = await deps.captions.getById(id);
    if (!existing || existing.instructorId !== instructorId) {
      return reply.code(404).send({ error: 'not found' });
    }
    await deps.captions.delete(id);
    return reply.code(204).send();
  });

  app.post('/api/captions/:id/translate', async (req, reply) => {
    const instructorId = readInstructorId(req);
    if (!instructorId) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const body = req.body as { targetLang?: string };
    const targetLang = body.targetLang?.trim();
    if (!targetLang) return reply.code(400).send({ error: 'targetLang required' });
    const source = await deps.captions.getById(id);
    if (!source || source.instructorId !== instructorId) {
      return reply.code(404).send({ error: 'not found' });
    }
    if (source.isMachineTranslated) {
      return reply.code(400).send({ error: 'cannot translate a machine-translated track' });
    }
    const cached = await deps.captions.findMachineTranslation(id, targetLang);
    if (cached) return reply.send(cached);
    const tlOpts: { deeplKey?: string; googleKey?: string } = {};
    if (deps.deeplKey) tlOpts.deeplKey = deps.deeplKey;
    if (deps.googleTranslateKey) tlOpts.googleKey = deps.googleTranslateKey;
    const translated = await translateLines(source.contentText, targetLang, tlOpts);
    const format = source.format;
    const parsed = parseCaption(translated, format);
    if (!parsed.ok) return reply.code(500).send({ error: 'translation parse failed' });
    const created = await deps.captions.create({
      instructorId,
      youtubeVideoId: source.youtubeVideoId,
      format,
      languageCode: targetLang,
      contentText: translated,
      isMachineTranslated: true,
      sourceCaptionId: id,
      contentHash: sha256Hex(translated),
    });
    return reply.send(created);
  });
}
