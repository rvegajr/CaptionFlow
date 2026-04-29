import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from './app.js';
import { makeDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { loadConfig } from './config.js';
import { SystemClock } from './adapters/system-clock.js';
import { UuidIdGenerator } from './adapters/uuid-id-generator.js';
import { ResendMagicLinkSender } from './adapters/resend-magic-link-sender.js';
import { FakeMagicLinkSender } from './adapters/fake-magic-link-sender.js';

const cfg = loadConfig(process.env);
const db = makeDb(cfg.databaseUrl);
await runMigrations(db);

const magicLinks =
  cfg.resendApiKey && cfg.fromEmail
    ? new ResendMagicLinkSender(cfg.resendApiKey, cfg.fromEmail)
    : new FakeMagicLinkSender();

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
});

await app.listen({ host: '0.0.0.0', port: cfg.port });
app.log.info(`listening on ${cfg.port}`);
