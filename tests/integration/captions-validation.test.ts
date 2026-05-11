import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  loginAs,
  multipartCaption,
  SAMPLE_VTT,
  startHarness,
  type IntegrationHarness,
} from './_helpers.js';

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

async function uploadCaption(cookie: string, override: Partial<Parameters<typeof multipartCaption>[0]> = {}) {
  const mp = multipartCaption({
    videoId: 'dQw4w9WgXcQ',
    languageCode: 'en',
    content: SAMPLE_VTT,
    filename: 't.vtt',
    ...override,
  });
  return h.app.inject({
    method: 'POST',
    url: '/api/captions',
    headers: { cookie, 'content-type': mp.contentType },
    payload: mp.body,
  });
}

describe('captions API validation and ownership', () => {
  it('GET /api/captions returns 401 without auth', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/api/captions' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects oversize uploads (>1 MB) with 413', async () => {
    const big = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n' + 'x'.repeat(1_100_000) + '\n';
    const res = await uploadCaption(cookieA, { content: big });
    expect([400, 413]).toContain(res.statusCode);
  });

  it('rejects malformed VTT', async () => {
    const res = await uploadCaption(cookieA, { content: 'not webvtt at all' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects missing youtube_video_id', async () => {
    const res = await uploadCaption(cookieA, { videoId: undefined });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid YouTube id', async () => {
    const res = await uploadCaption(cookieA, { videoId: 'not-an-id-here' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({ error: expect.stringMatching(/youtube/i) });
  });

  it('happy path: upload + list + GET by id', async () => {
    const res = await uploadCaption(cookieA);
    expect(res.statusCode).toBe(200);
    const cap = JSON.parse(res.body) as { id: string };
    const list = await h.app.inject({
      method: 'GET',
      url: '/api/captions',
      headers: { cookie: cookieA },
    });
    expect(list.statusCode).toBe(200);
    expect((JSON.parse(list.body) as { id: string }[]).some((c) => c.id === cap.id)).toBe(true);

    const get = await h.app.inject({
      method: 'GET',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieA },
    });
    expect(get.statusCode).toBe(200);
  });

  it('GET /api/captions/:id returns 404 for another instructor', async () => {
    const created = await uploadCaption(cookieA);
    const cap = JSON.parse(created.body) as { id: string };
    const res = await h.app.inject({
      method: 'GET',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieB },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH another instructor\u2019s caption returns 404', async () => {
    const created = await uploadCaption(cookieA);
    const cap = JSON.parse(created.body) as { id: string };
    const mp = multipartCaption({ content: SAMPLE_VTT, filename: 't.vtt' });
    const res = await h.app.inject({
      method: 'PATCH',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieB, 'content-type': mp.contentType },
      payload: mp.body,
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE another instructor\u2019s caption returns 404, owner can delete', async () => {
    const created = await uploadCaption(cookieA);
    const cap = JSON.parse(created.body) as { id: string };

    const forbidden = await h.app.inject({
      method: 'DELETE',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieB },
    });
    expect(forbidden.statusCode).toBe(404);

    const ok = await h.app.inject({
      method: 'DELETE',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieA },
    });
    expect(ok.statusCode).toBe(204);
  });

  it('PATCH with malformed multipart content returns 400', async () => {
    const created = await uploadCaption(cookieA);
    const cap = JSON.parse(created.body) as { id: string };
    const mp = multipartCaption({ content: 'not webvtt at all', filename: 't.vtt' });
    const res = await h.app.inject({
      method: 'PATCH',
      url: `/api/captions/${cap.id}`,
      headers: { cookie: cookieA, 'content-type': mp.contentType },
      payload: mp.body,
    });
    expect(res.statusCode).toBe(400);
  });
});
