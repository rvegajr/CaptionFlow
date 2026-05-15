import type { MagicLinkSender } from '../services/magic-link-sender.js';

/**
 * Sends magic-link emails through the Noctusoft Communication Relay
 * (SendGrid drop-in: api.sendgrid.noctusoft.com).
 *
 * The relay injects the upstream SendGrid API key, so we only need a
 * Noctusoft deploy key (nsins_dk_*) here. From-address must be on a
 * SendGrid-verified domain (see docs/NOCTUSOFT_RELAY.md).
 */
export class NoctusoftSendGridMagicLinkSender implements MagicLinkSender {
  constructor(
    private readonly relayApiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string = 'CaptionFlow',
    private readonly baseUrl: string = 'https://api.sendgrid.noctusoft.com',
  ) {}

  async send(email: string, link: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.relayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: this.fromEmail, name: this.fromName },
        subject: 'Sign in to CaptionFlow',
        content: [
          {
            type: 'text/plain',
            value: `Click the link below to sign in to CaptionFlow.\n\n${link}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`,
          },
          {
            type: 'text/html',
            value: htmlBody(link),
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`noctusoft sendgrid ${res.status}${detail ? `: ${detail}` : ''}`);
    }
  }
}

function htmlBody(link: string): string {
  const safe = String(link).replace(/[<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#0d1117;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#0d1117;margin:0 0 12px">Sign in to CaptionFlow</h2>
  <p>Click the button below to sign in. This link expires in 15 minutes.</p>
  <p style="margin:24px 0">
    <a href="${safe}" style="display:inline-block;padding:12px 20px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Sign in</a>
  </p>
  <p style="font-size:12px;color:#57606a">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all">${safe}</span></p>
  <hr style="border:none;border-top:1px solid #d0d7de;margin:24px 0">
  <p style="font-size:12px;color:#57606a">If you didn't request this email, you can ignore it.</p>
</body></html>`;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '';
  }
}
