import type { MagicLinkSender } from '../services/magic-link-sender.js';

export class ResendMagicLinkSender implements MagicLinkSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  async send(email: string, link: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: email,
        subject: 'Sign in to CaptionFlow',
        text: `Click to sign in: ${link}`,
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}`);
  }
}
