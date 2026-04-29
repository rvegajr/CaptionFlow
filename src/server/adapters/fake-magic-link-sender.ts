import type { MagicLinkSender } from '../services/magic-link-sender.js';

export class FakeMagicLinkSender implements MagicLinkSender {
  public lastEmail: string | null = null;
  public lastLink: string | null = null;

  async send(email: string, link: string): Promise<void> {
    this.lastEmail = email;
    this.lastLink = link;
  }
}
