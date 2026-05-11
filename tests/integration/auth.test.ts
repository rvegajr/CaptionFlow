import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startHarness, type IntegrationHarness } from './_helpers.js';

let h: IntegrationHarness;

beforeAll(async () => {
  h = await startHarness();
}, 120_000);

afterAll(async () => {
  await h.stop();
});

describe('auth lifecycle', () => {
  it('returns 401 on /api/me without cookie', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 on missing token', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/auth/callback' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('missing token');
  });

  it('returns 400 on invalid (unknown) token', async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: '/auth/callback?token=not-a-real-token',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('invalid token');
  });

  it('rejects an expired token after 15 minutes', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'expired@example.com' },
    });
    const link = h.magicLinks.lastLink!;
    const token = new URL(link).searchParams.get('token')!;

    h.clock.advance(16 * 60 * 1000);

    const res = await h.app.inject({
      method: 'GET',
      url: `/auth/callback?token=${encodeURIComponent(token)}`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('expired');
  });

  it('rejects an already-used token on the second use', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'reuse@example.com' },
    });
    const link = h.magicLinks.lastLink!;
    const token = new URL(link).searchParams.get('token')!;

    const first = await h.app.inject({
      method: 'GET',
      url: `/auth/callback?token=${encodeURIComponent(token)}`,
    });
    expect(first.statusCode).toBe(302);

    const second = await h.app.inject({
      method: 'GET',
      url: `/auth/callback?token=${encodeURIComponent(token)}`,
    });
    expect(second.statusCode).toBe(400);
    expect(second.body).toContain('token used');
  });

  it('rejects an invalid email payload', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('successful flow gives /api/me an instructor and logout clears the cookie', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/auth/magic-link',
      payload: { email: 'happy@example.com' },
    });
    const token = new URL(h.magicLinks.lastLink!).searchParams.get('token')!;
    const cb = await h.app.inject({
      method: 'GET',
      url: `/auth/callback?token=${encodeURIComponent(token)}`,
    });
    expect(cb.statusCode).toBe(302);
    const cookie = cb.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookie) ? cookie.join('; ') : String(cookie);

    const me = await h.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieHeader },
    });
    expect(me.statusCode).toBe(200);
    const inst = JSON.parse(me.body) as { email: string };
    expect(inst.email).toBe('happy@example.com');

    const logout = await h.app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookieHeader },
    });
    expect(logout.statusCode).toBe(200);
    const set = logout.headers['set-cookie'];
    const setHeader = Array.isArray(set) ? set.join('\n') : String(set);
    expect(setHeader).toMatch(/cf_instructor=;/);
  });
});
