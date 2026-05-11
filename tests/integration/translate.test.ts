import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  loginAs,
  multipartCaption,
  startHarness,
  type IntegrationHarness,
} from './_helpers.js';

let h: IntegrationHarness;
let cookie: string;
let captionId: string;

const SRC_VTT = `WEBVTT

00:00:00.000 --> 00:00:01.000
hello

00:00:01.000 --> 00:00:02.000
world
`;

const fetchSpy = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

beforeAll(async () => {
  // Stub fetch BEFORE the harness boots so the route picks it up at request time.
  globalThis.fetch = ((...args: Parameters<typeof fetch>) =>
    fetchSpy(...args)) as unknown as typeof fetch;
  fetchSpy.mockImplementation(async (_input, init) => {
    const body = new URLSearchParams(String((init as { body?: unknown }).body));
    const text = body.get('text') ?? '';
    // Preserve VTT structural lines (header + timestamps); translate only payload text.
    const isStructural = text === 'WEBVTT' || text.includes('-->') || /^\d+$/.test(text);
    const translated = isStructural ? text : `ES:${text}`;
    return new Response(JSON.stringify({ translations: [{ text: translated }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  h = await startHarness({ deeplApiKey: 'test-key' });
  cookie = await loginAs(h, 't@example.com');

  const mp = multipartCaption({
    videoId: 'dQw4w9WgXcQ',
    languageCode: 'en',
    content: SRC_VTT,
    filename: 't.vtt',
  });
  const cap = await h.app.inject({
    method: 'POST',
    url: '/api/captions',
    headers: { cookie, 'content-type': mp.contentType },
    payload: mp.body,
  });
  captionId = (JSON.parse(cap.body) as { id: string }).id;
}, 240_000);

afterAll(async () => {
  await h.stop();
  vi.restoreAllMocks();
});

describe('caption translation', () => {
  it('rejects a translate request without targetLang', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionId}/translate`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for a caption you do not own', async () => {
    const otherCookie = await loginAs(h, 'other@example.com');
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionId}/translate`,
      headers: { cookie: otherCookie, 'content-type': 'application/json' },
      payload: { targetLang: 'es' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('creates an MT caption with isMachineTranslated=true and sourceCaptionId set', async () => {
    fetchSpy.mockClear();
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionId}/translate`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { targetLang: 'es' },
    });
    expect(res.statusCode).toBe(200);
    const out = JSON.parse(res.body) as {
      id: string;
      isMachineTranslated: boolean;
      sourceCaptionId: string;
      languageCode: string;
      contentText: string;
    };
    expect(out.isMachineTranslated).toBe(true);
    expect(out.sourceCaptionId).toBe(captionId);
    expect(out.languageCode).toBe('es');
    expect(out.contentText).toContain('ES:hello');
    expect(out.contentText).toContain('ES:world');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('caches subsequent translations to the same target language (no second fetch)', async () => {
    fetchSpy.mockClear();
    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${captionId}/translate`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { targetLang: 'es' },
    });
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses to translate a machine-translated track', async () => {
    const list = await h.app.inject({
      method: 'GET',
      url: '/api/captions',
      headers: { cookie },
    });
    const captions = JSON.parse(list.body) as {
      id: string;
      isMachineTranslated: boolean;
    }[];
    const mt = captions.find((c) => c.isMachineTranslated);
    expect(mt).toBeDefined();

    const res = await h.app.inject({
      method: 'POST',
      url: `/api/captions/${mt!.id}/translate`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { targetLang: 'fr' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({
      error: expect.stringMatching(/machine-translated/),
    });
  });
});
