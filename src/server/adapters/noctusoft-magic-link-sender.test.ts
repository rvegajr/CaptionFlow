import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NoctusoftSendGridMagicLinkSender } from './noctusoft-magic-link-sender.js';

type FetchArgs = Parameters<typeof fetch>;
type FetchReturn = ReturnType<typeof fetch>;

describe('NoctusoftSendGridMagicLinkSender', () => {
  let fetchSpy: ReturnType<typeof vi.fn<FetchArgs, FetchReturn>>;

  beforeEach(() => {
    fetchSpy = vi.fn<FetchArgs, FetchReturn>();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to the Noctusoft SendGrid relay with bearer auth and SendGrid v3 payload', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 202 }));

    const sender = new NoctusoftSendGridMagicLinkSender(
      'nsins_dk_test',
      'noreply@scholarmancy.com',
    );
    await sender.send('user@example.edu', 'https://captionflow.link/auth/verify?t=abc');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://api.sendgrid.noctusoft.com/v3/mail/send');

    const i = init as RequestInit;
    expect(i.method).toBe('POST');
    const headers = i.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer nsins_dk_test');
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(String(i.body)) as {
      personalizations: { to: { email: string }[] }[];
      from: { email: string; name: string };
      subject: string;
      content: { type: string; value: string }[];
    };
    expect(body.personalizations[0]!.to[0]!.email).toBe('user@example.edu');
    expect(body.from.email).toBe('noreply@scholarmancy.com');
    expect(body.from.name).toBe('CaptionFlow');
    expect(body.subject).toBe('Sign in to CaptionFlow');
    expect(body.content.find((c) => c.type === 'text/plain')?.value).toContain(
      'https://captionflow.link/auth/verify?t=abc',
    );
    expect(body.content.find((c) => c.type === 'text/html')?.value).toContain(
      'https://captionflow.link/auth/verify?t=abc',
    );
  });

  it('throws with status code on non-2xx responses', async () => {
    fetchSpy.mockResolvedValue(new Response('forbidden', { status: 403 }));

    const sender = new NoctusoftSendGridMagicLinkSender('bad-key', 'noreply@scholarmancy.com');

    await expect(sender.send('u@e.com', 'https://x')).rejects.toThrow(/noctusoft sendgrid 403/);
  });

  it('escapes HTML special characters in the link', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 202 }));

    const sender = new NoctusoftSendGridMagicLinkSender('k', 'noreply@scholarmancy.com');
    await sender.send('u@e.com', 'https://x?a=1&b="<script>"');

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { content: { type: string; value: string }[] };
    const html = body.content.find((c) => c.type === 'text/html')!.value;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&#60;script&#62;');
  });

  it('honors a custom relay base URL (for tests / staging)', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 202 }));

    const sender = new NoctusoftSendGridMagicLinkSender(
      'k',
      'noreply@scholarmancy.com',
      'CaptionFlow',
      'https://staging.relay.example',
    );
    await sender.send('u@e.com', 'https://x');

    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://staging.relay.example/v3/mail/send');
  });
});
