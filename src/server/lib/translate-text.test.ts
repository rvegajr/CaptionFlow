import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translateLines } from './translate-text.js';

type FetchArgs = Parameters<typeof fetch>;
type FetchReturn = ReturnType<typeof fetch>;

describe('translateLines', () => {
  let fetchSpy: ReturnType<typeof vi.fn<FetchArgs, FetchReturn>>;

  beforeEach(() => {
    fetchSpy = vi.fn<FetchArgs, FetchReturn>();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses DeepL when only deeplKey is provided, one call per non-empty line', async () => {
    fetchSpy.mockImplementation(async (_input, init) => {
      const body = new URLSearchParams(String((init as { body?: unknown }).body));
      const text = body.get('text') ?? '';
      return new Response(JSON.stringify({ translations: [{ text: `ES:${text}` }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const out = await translateLines('hello\nworld', 'es', { deeplKey: 'k' });
    expect(out).toBe('ES:hello\nES:world');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://api-free.deepl.com/v2/translate');
    const headers = (init as { headers?: Record<string, string> }).headers ?? {};
    expect(headers['Authorization']).toBe('DeepL-Auth-Key k');
  });

  it('preserves empty lines (no fetch call for blanks)', async () => {
    fetchSpy.mockImplementation(async (_input, init) => {
      const body = new URLSearchParams(String((init as { body?: unknown }).body));
      const text = body.get('text') ?? '';
      return new Response(JSON.stringify({ translations: [{ text: `X:${text}` }] }), {
        status: 200,
      });
    });

    const out = await translateLines('a\n\nb', 'de', { deeplKey: 'k' });
    expect(out).toBe('X:a\n\nX:b');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('falls back to Google when only googleKey is provided (one batched call)', async () => {
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          data: {
            translations: [{ translatedText: 'hola' }, { translatedText: 'mundo' }],
          },
        }),
        { status: 200 },
      );
    });

    const out = await translateLines('hello\nworld', 'es', { googleKey: 'gk' });
    expect(out).toBe('hola\nmundo');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain('translation.googleapis.com');
    expect(String(url)).toContain('key=gk');
  });

  it('uses mock fallback when no keys are configured (and does not call fetch)', async () => {
    const out = await translateLines('hello\nworld', 'fr', {});
    expect(out).toBe('[MOCK_TRANSLATE_TO_fr] hello\nworld');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws on DeepL non-2xx', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(translateLines('x', 'es', { deeplKey: 'k' })).rejects.toThrow(/deepl 500/);
  });

  it('throws on Google non-2xx', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(translateLines('x', 'es', { googleKey: 'gk' })).rejects.toThrow(/google translate 500/);
  });
});
