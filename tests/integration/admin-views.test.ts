import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { captionedResource, instructor, viewEvent } from '../../src/server/db/schema.js';
import { PgInstitutionRepo } from '../../src/server/repos/pg-institution-repo.js';
import {
  loginAs,
  multipartCaption,
  SAMPLE_VTT,
  startHarness,
  type IntegrationHarness,
} from './_helpers.js';

let h: IntegrationHarness;

beforeAll(async () => {
  h = await startHarness();
}, 180_000);

afterAll(async () => {
  await h.stop();
});

describe('admin views aggregation', () => {
  it('non-admin instructor receives 403', async () => {
    const cookie = await loginAs(h, 'plain@example.com');
    const res = await h.app.inject({
      method: 'GET',
      url: '/api/admin/views/2026-04',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin sees daily buckets sorted ascending', async () => {
    const cookie = await loginAs(h, 'admin@example.com');
    const me = await h.app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    const adminId = (JSON.parse(me.body) as { id: string }).id;

    const inst = await new PgInstitutionRepo(h.db).upsertByLti({
      name: 'Admin U',
      ltiIss: 'https://admin.test',
      ltiClientId: 'cid',
      ltiDeploymentId: 'did',
      licenseMaxViewsPerTerm: null,
    });

    await h.db
      .update(instructor)
      .set({ institutionId: inst.id, role: 'institution_admin' })
      .where(eq(instructor.id, adminId));

    // Seed a captioned_resource owned by admin so view_event FK is satisfied.
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

    const [resourceRow] = await h.db
      .insert(captionedResource)
      .values({
        instructorId: adminId,
        youtubeVideoId: 'dQw4w9WgXcQ',
        defaultCaptionId: captionId,
      })
      .returning();
    const resourceId = resourceRow!.id;

    // Insert view_events directly with explicit `occurredAt` so we don't depend on wall clock.
    await h.db.insert(viewEvent).values([
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-04-02T08:00:00Z') },
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-04-02T09:00:00Z') },
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-04-05T10:00:00Z') },
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-04-10T11:00:00Z') },
      // Outside the window: should not appear.
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-03-31T23:59:00Z') },
      { captionedResourceId: resourceId, institutionId: inst.id, occurredAt: new Date('2026-05-01T00:00:00Z') },
    ]);

    const res = await h.app.inject({
      method: 'GET',
      url: '/api/admin/views/2026-04',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      institutionId: string;
      yearMonth: string;
      days: { day: string; count: number }[];
    };
    expect(body.institutionId).toBe(inst.id);
    expect(body.yearMonth).toBe('2026-04');
    expect(body.days).toEqual([
      { day: '2026-04-02', count: 2 },
      { day: '2026-04-05', count: 1 },
      { day: '2026-04-10', count: 1 },
    ]);
  });

  it('returns empty days for a month with no events', async () => {
    const cookie = await loginAs(h, 'empty-admin@example.com');
    const me = await h.app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    const id = (JSON.parse(me.body) as { id: string }).id;
    const inst = await new PgInstitutionRepo(h.db).upsertByLti({
      name: 'Empty U',
      ltiIss: 'https://empty.test',
      ltiClientId: 'cid2',
      ltiDeploymentId: 'did2',
      licenseMaxViewsPerTerm: null,
    });
    await h.db
      .update(instructor)
      .set({ institutionId: inst.id, role: 'institution_admin' })
      .where(eq(instructor.id, id));

    const res = await h.app.inject({
      method: 'GET',
      url: '/api/admin/views/2026-07',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ days: [] });
  });
});
