import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgInstitutionRepo } from '../../src/server/repos/pg-institution-repo.js';
import { PgInstructorRepo } from '../../src/server/repos/pg-instructor-repo.js';
import { PgResourceRepo } from '../../src/server/repos/pg-resource-repo.js';
import { PgCaptionRepo } from '../../src/server/repos/pg-caption-repo.js';
import { startHarness, type IntegrationHarness } from './_helpers.js';

let h: IntegrationHarness;
let baseUrl: string;

beforeAll(async () => {
  h = await startHarness({ enableLti: true });
  // ltijs is mounted via @fastify/express middleware; its responses don't always
  // round-trip cleanly through `app.inject()`. Use a real listener for HTTP probes.
  baseUrl = await h.app.listen({ port: 0, host: '127.0.0.1' });
}, 240_000);

afterAll(async () => {
  await h.stop();
});

describe('LTI 1.3 surface', () => {
  it('serves a JWKS at /.well-known/jwks in JWKS shape', async () => {
    // ltijs only emits keys for *registered* platforms. With no platforms registered
    // (production-like fresh boot), the shape is still { keys: [] } and the endpoint
    // is reachable. Per platform onboarding, keys appear automatically.
    const res = await fetch(`${baseUrl}/.well-known/jwks`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { keys?: { alg?: string; kty?: string }[] };
    expect(Array.isArray(body.keys)).toBe(true);
    for (const k of body.keys ?? []) {
      expect(k.kty).toBe('RSA');
    }
  });

  it('exposes the OIDC login route (does not return 404)', async () => {
    const res = await fetch(`${baseUrl}/lti/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: '',
    });
    expect(res.status).not.toBe(404);
  });

  it('exposes the launch route (does not return 404)', async () => {
    const res = await fetch(`${baseUrl}/lti/launch`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: '',
    });
    expect(res.status).not.toBe(404);
  });

  it('on a launch with the same resource_link.id twice, only one captioned_resource row exists (idempotency contract)', async () => {
    // Mirrors the body of `lti.onConnect` in src/server/lti/ltijs-setup.ts
    // (which we cannot drive end-to-end without the full OIDC dance):
    // upsert institution -> upsert instructor -> if (!findByLtiResourceLink) create.
    const institutions = new PgInstitutionRepo(h.db);
    const instructors = new PgInstructorRepo(h.db);
    const resources = new PgResourceRepo(h.db);
    const captions = new PgCaptionRepo(h.db);

    const linkId = 'link-' + Math.random().toString(36).slice(2);

    async function simulateLaunch(): Promise<string> {
      const inst = await institutions.upsertByLti({
        name: 'Sim U',
        ltiIss: 'https://sim.test',
        ltiClientId: 'sim-client',
        ltiDeploymentId: 'sim-deploy',
        licenseMaxViewsPerTerm: null,
      });
      let instr = await instructors.findByEmail('sim@example.com');
      if (!instr) instr = await instructors.create('sim@example.com', null);
      await instructors.setInstitutionAndLti(instr.id, inst.id, 'sub-1', null);
      let r = await resources.findByLtiResourceLink(linkId);
      if (!r) {
        const cap = await captions.create({
          instructorId: instr.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          format: 'vtt',
          languageCode: 'en',
          contentText: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nstub\n',
        });
        r = await resources.create({
          instructorId: instr.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          defaultCaptionId: cap.id,
          ltiResourceLinkId: linkId,
        });
      }
      return r.id;
    }

    const first = await simulateLaunch();
    const second = await simulateLaunch();
    expect(first).toBe(second);

    // Direct insert with the same linkId must violate the unique constraint on captioned_resource_lti_unique.
    const instr = await instructors.findByEmail('sim@example.com');
    await expect(
      resources.create({
        instructorId: instr!.id,
        youtubeVideoId: 'dQw4w9WgXcQ',
        defaultCaptionId: null,
        ltiResourceLinkId: linkId,
      }),
    ).rejects.toThrow();
  });
});
