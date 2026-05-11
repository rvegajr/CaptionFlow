import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startHarness, type IntegrationHarness } from './_helpers.js';

describe('production CSP and rate limiting', () => {
  let h: IntegrationHarness;

  beforeAll(async () => {
    h = await startHarness({ isProd: true });
  }, 180_000);

  afterAll(async () => {
    await h.stop();
  });

  it('serves a Content-Security-Policy that includes youtube.com in frame-src', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/api/me' });
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(String(csp)).toContain('frame-src');
    expect(String(csp)).toContain('https://www.youtube.com');
  });

  it('sets the cf_instructor cookie with HttpOnly, SameSite=Lax, and Secure in prod', async () => {
    const post = await h.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'csp@example.com' },
    });
    expect(post.statusCode).toBe(200);
    const link = h.magicLinks.lastLink!;
    const token = new URL(link).searchParams.get('token')!;
    const cb = await h.app.inject({
      method: 'GET',
      url: `/auth/callback?token=${encodeURIComponent(token)}`,
    });
    expect(cb.statusCode).toBe(302);
    const set = cb.headers['set-cookie'];
    const cookieHeader = Array.isArray(set) ? set.join('\n') : String(set);
    expect(cookieHeader).toMatch(/cf_instructor=/);
    expect(cookieHeader).toMatch(/HttpOnly/i);
    expect(cookieHeader).toMatch(/SameSite=Lax/i);
    expect(cookieHeader).toMatch(/Secure/i);
  });

  it('omits CSP when not in prod (sanity)', async () => {
    const dev = await startHarness({ isProd: false });
    try {
      const res = await dev.app.inject({ method: 'GET', url: '/api/me' });
      const csp = res.headers['content-security-policy'];
      expect(csp).toBeUndefined();
    } finally {
      await dev.stop();
    }
  });
});

describe('rate limiting', () => {
  let h: IntegrationHarness;

  beforeAll(async () => {
    h = await startHarness();
  }, 180_000);

  afterAll(async () => {
    await h.stop();
  });

  it('returns at least one 429 when /auth/magic-link is hammered above the limit', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 220; i++) {
      const res = await h.app.inject({
        method: 'POST',
        url: '/auth/magic-link',
        payload: { email: `rate${i}@example.com` },
      });
      codes.push(res.statusCode);
      if (res.statusCode === 429) break;
    }
    expect(codes).toContain(429);
  });
});
