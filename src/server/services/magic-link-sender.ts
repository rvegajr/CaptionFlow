export interface MagicLinkSender {
  send(email: string, link: string): Promise<void>;
}
