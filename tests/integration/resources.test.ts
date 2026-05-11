import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loginAs, multipartCaption, SAMPLE_VTT, startHarness, type IntegrationHarness } from './_helpers.js';

let h: IntegrationHarness;
let cookieA: string;
let cookieB: string;

beforeAll(async () => {
  h = await startHarness();
  cookieA = await loginAs(h, 'a@example.com');
  cookieB = await loginAs(h, 'b@example.com');
}, 180_000);

afterAll(async () => {
  await h.stop();
});

async function uploadCaptionAs(cookie: string): Promise<string> {
  const mp = multipartCaption({
    videoId: 'dQw4w9WgXcQ',
    languageCode: 'en',
    content: SAMPLE_VTT,
    filename: 't.vtt',
  });
  const res = await h.app.inject({
    method: 'POST',
    url: '/api/captions',
    headers: { cookie, 'content-type': mp.contentType },
    payload: mp.body,
  });
  return (JSON.parse(res.body) as { id: string }).id;
}

describe('resources API', () => {
  it('GET /api/resources requires auth', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/api/resources' });
    expect(res.statusCode).toBe(401);
  });

  it('POST extracts the 11-char video id from a full YouTube URL', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42' },
    });
    expect(res.statusCode).toBe(200);
    const r = JSON.parse(res.body) as { youtubeVideoId: string };
    expect(r.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('POST rejects an unparseable youtubeUrl', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'not a url' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH defaultCaptionId only succeeds for the owner', async () => {
    const create = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    });
    const r = JSON.parse(create.body) as { id: string };
    const capId = await uploadCaptionAs(cookieA);

    const okOwner = await h.app.inject({
      method: 'PATCH',
      url: `/api/resources/${r.id}`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { defaultCaptionId: capId },
    });
    expect(okOwner.statusCode).toBe(200);
    expect(JSON.parse(okOwner.body)).toMatchObject({ defaultCaptionId: capId });

    const forbidden = await h.app.inject({
      method: 'PATCH',
      url: `/api/resources/${r.id}`,
      headers: { cookie: cookieB, 'content-type': 'application/json' },
      payload: { defaultCaptionId: null },
    });
    expect(forbidden.statusCode).toBe(404);
  });

  it('PATCH rejects missing defaultCaptionId field', async () => {
    const create = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    });
    const r = JSON.parse(create.body) as { id: string };
    const res = await h.app.inject({
      method: 'PATCH',
      url: `/api/resources/${r.id}`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE only deletes the owner\u2019s resource', async () => {
    const create = await h.app.inject({
      method: 'POST',
      url: '/api/resources',
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    });
    const r = JSON.parse(create.body) as { id: string };

    const otherDelete = await h.app.inject({
      method: 'DELETE',
      url: `/api/resources/${r.id}`,
      headers: { cookie: cookieB },
    });
    expect(otherDelete.statusCode).toBe(204); // Returns 204 even if no row matched (no-op)

    const stillThere = await h.app.inject({
      method: 'GET',
      url: '/api/resources',
      headers: { cookie: cookieA },
    });
    const list = JSON.parse(stillThere.body) as { id: string }[];
    expect(list.some((x) => x.id === r.id)).toBe(true);

    const ownerDelete = await h.app.inject({
      method: 'DELETE',
      url: `/api/resources/${r.id}`,
      headers: { cookie: cookieA },
    });
    expect(ownerDelete.statusCode).toBe(204);

    const after = await h.app.inject({
      method: 'GET',
      url: '/api/resources',
      headers: { cookie: cookieA },
    });
    expect((JSON.parse(after.body) as { id: string }[]).some((x) => x.id === r.id)).toBe(false);
  });
});
