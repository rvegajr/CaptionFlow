import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from './app.js';
import { makeDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { loadConfig } from './config.js';
import { SystemClock } from './adapters/system-clock.js';
import { UuidIdGenerator } from './adapters/uuid-id-generator.js';
import { ResendMagicLinkSender } from './adapters/resend-magic-link-sender.js';
import { NoctusoftSendGridMagicLinkSender } from './adapters/noctusoft-magic-link-sender.js';
import { FakeMagicLinkSender } from './adapters/fake-magic-link-sender.js';
import type { MagicLinkSender } from './services/magic-link-sender.js';

const cfg = loadConfig(process.env);
const db = makeDb(cfg.databaseUrl);
await runMigrations(db);

// Adapter selection priority:
//   1. Noctusoft Communication Relay (preferred — single deploy key for all egress)
//   2. Resend (legacy direct integration)
//   3. Fake (dev-only — captures the link for local Playwright tests)
let magicLinks: MagicLinkSender;
let mailerName: string;
if (cfg.noctusoftApiKey && cfg.fromEmail) {
  magicLinks = new NoctusoftSendGridMagicLinkSender(
    cfg.noctusoftApiKey,
    cfg.fromEmail,
    cfg.noctusoftFromName,
  );
  mailerName = 'noctusoft-sendgrid';
} else if (cfg.resendApiKey && cfg.fromEmail) {
  magicLinks = new ResendMagicLinkSender(cfg.resendApiKey, cfg.fromEmail);
  mailerName = 'resend';
} else {
  magicLinks = new FakeMagicLinkSender();
  mailerName = 'fake';
}

const app = await buildApp({
  db,
  databaseUrl: cfg.databaseUrl,
  clock: new SystemClock(),
  ids: new UuidIdGenerator(),
  magicLinks,
  baseUrl: cfg.baseUrl,
  sessionSecret: cfg.sessionSecret,
  ltiEncryptionKey: cfg.ltiEncryptionKey,
  staticDir: existsSync(resolve(process.cwd(), 'dist/web'))
    ? resolve(process.cwd(), 'dist/web')
    : null,
  isProd: cfg.isProd,
  enableLti: process.env.DISABLE_LTI !== 'true',
  ...(cfg.deeplApiKey ? { deeplApiKey: cfg.deeplApiKey } : {}),
  ...(cfg.googleTranslateApiKey ? { googleTranslateApiKey: cfg.googleTranslateApiKey } : {}),
  ...(cfg.noctusoftApiKey ? { noctusoftRelayKey: cfg.noctusoftApiKey } : {}),
});

await app.listen({ host: '0.0.0.0', port: cfg.port });
app.log.info({ mailer: mailerName }, `listening on ${cfg.port}`);
