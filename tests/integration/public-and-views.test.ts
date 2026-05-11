import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { instructor, viewEvent } from '../../src/server/db/schema.js';
import { PgInstitutionRepo } from '../../src/server/repos/pg-institution-repo.js';
import {
  loginAs,
  multipartCaption,
  SAMPLE_VTT,
  startHarness,
  type IntegrationHarness,
} from './_helpers.js';

let h: IntegrationHarness;
let cookie: string;
let instructorId: string;
let institutionId: string;
let resourceId: string;

beforeAll(async () => {
  h = await startHarness();
  cookie = await loginAs(h, 'pub@example.com');

  const me = await h.app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie },
  });
  instructorId = (JSON.parse(me.body) as { id: string }).id;

  const inst = await new PgInstitutionRepo(h.db).upsertByLti({
    name: 'Test U',
    ltiIss: 'https://example.test',
    ltiClientId: 'client-x',
    ltiDeploymentId: 'dep-x',
    licenseMaxViewsPerTerm: null,
  });
  institutionId = inst.id;

  await h.db
    .update(instructor)
    .set({ institutionId: inst.id })
    .where(eq(instructor.id, instructorId));

  const mp = multipartCaption({
    videoId: 'dQw4w9WgXcQ',
    languageCode: 'en',
    content: SAMPLE_VTT,
    filename: 't.vtt',
  });
  const cap = await h.app.inject({
    method: 'POST',
    url: '/api/captions',
    headers: { cookie, 'content-type': mp.contentType },
    payload: mp.body,
  });
  const captionId = (JSON.parse(cap.body) as { id: string }).id;

  const resCreate = await h.app.inject({
    method: 'POST',
    url: '/api/resources',
    headers: { cookie, 'content-type': 'application/json' },
    payload: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  });
  resourceId = (JSON.parse(resCreate.body) as { id: string }).id;
  await h.app.inject({
    method: 'PATCH',
    url: `/api/resources/${resourceId}`,
    headers: { cookie, 'content-type': 'application/json' },
    payload: { defaultCaptionId: captionId },
  });
}, 240_000);

afterAll(async () => {
  await h.stop();
});

describe('public surface payload + view metering', () => {
  it('returns 404 for an unknown resource', async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: '/api/public/resources/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns the multi-track payload shape and logs a view_event tied to the institution', async () => {
    const before = await h.db.select().from(viewEvent).where(eq(viewEvent.institutionId, institutionId));
    const res = await h.app.inject({
      method: 'GET',
      url: `/api/public/resources/${resourceId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      resourceId: string;
      youtubeVideoId: string;
      defaultCaptionId: string;
      tracks: { id: string; languageCode: string; isMachineTranslated: boolean; cues: unknown[] }[];
    };
    expect(body.resourceId).toBe(resourceId);
    expect(body.youtubeVideoId).toBe('dQw4w9WgXcQ');
    expect(body.tracks.length).toBeGreaterThan(0);
    expect(body.tracks[0]!.cues.length).toBeGreaterThan(0);

    const after = await h.db.select().from(viewEvent).where(eq(viewEvent.institutionId, institutionId));
    expect(after.length).toBe(before.length + 1);
  });

  it('returns 400 when the resource has no default caption', async () => {
    const create = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    });
    const noDefault = (JSON.parse(create.body) as { id: string }).id;
    const res = await h.app.inject({
      method: 'GET',
      url: `/api/public/resources/${noDefault}`,
    });
    expect(res.statusCode).toBe(400);
  });
});
