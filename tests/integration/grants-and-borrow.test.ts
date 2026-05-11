import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { captionGrant } from '../../src/server/db/schema.js';
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
let instructorBId: string;
let captionAId: string;

const VIDEO = 'dQw4w9WgXcQ';

beforeAll(async () => {
  h = await startHarness();
  cookieA = await loginAs(h, 'a@example.com');
  cookieB = await loginAs(h, 'b@example.com');

  const me = await h.app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieB } });
  instructorBId = (JSON.parse(me.body) as { id: string }).id;

  const mp = multipartCaption({
    videoId: VIDEO,
    languageCode: 'en',
    content: SAMPLE_VTT,
    filename: 't.vtt',
  });
  const cap = await h.app.inject({
    method: 'POST',
    url: '/api/captions',
    headers: { cookie: cookieA, 'content-type': mp.contentType },
    payload: mp.body,
  });
  captionAId = (JSON.parse(cap.body) as { id: string }).id;
}, 180_000);

afterAll(async () => {
  await h.stop();
});

describe('caption grants and borrow', () => {
  it('rejects share without granteeEmail', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionAId}/share`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when sharing a caption you do not own', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionAId}/share`,
      headers: { cookie: cookieB, 'content-type': 'application/json' },
      payload: { granteeEmail: 'a@example.com' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when grantee email is unknown', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionAId}/share`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { granteeEmail: 'nobody@example.com' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('A shares with B; calling share twice is idempotent (single grant row)', async () => {
    const first = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionAId}/share`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { granteeEmail: 'b@example.com' },
    });
    expect(first.statusCode).toBe(200);

    const second = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionAId}/share`,
      headers: { cookie: cookieA, 'content-type': 'application/json' },
      payload: { granteeEmail: 'b@example.com' },
    });
    expect(second.statusCode).toBe(200);

    const rows = await h.db
      .select()
      .from(captionGrant)
      .where(
        and(
          eq(captionGrant.ownerCaptionId, captionAId),
          eq(captionGrant.granteeInstructorId, instructorBId),
        ),
      );
    expect(rows.length).toBe(1);
  });

  it("B's borrow list includes A's caption for the same youtube id", async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: `/api/captions/borrow/${VIDEO}`,
      headers: { cookie: cookieB },
    });
    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.body) as { id: string }[];
    expect(list.some((c) => c.id === captionAId)).toBe(true);
  });

  it("A's own borrow list excludes A's caption (no self-grant exists)", async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: `/api/captions/borrow/${VIDEO}`,
      headers: { cookie: cookieA },
    });
    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.body) as { id: string }[];
    expect(list.some((c) => c.id === captionAId)).toBe(false);
  });

  it('borrow returns empty for an unrelated video id', async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: '/api/captions/borrow/aqz-KE-bpKQ',
      headers: { cookie: cookieB },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });
});
