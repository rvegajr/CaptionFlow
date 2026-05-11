import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { resolve } from 'node:path';
import type { Db } from './db/client.js';
import type { Clock } from './services/clock.js';
import type { IdGenerator } from './services/id-generator.js';
import type { MagicLinkSender } from './services/magic-link-sender.js';
import { PgCaptionRepo } from './repos/pg-caption-repo.js';
import { PgInstructorRepo } from './repos/pg-instructor-repo.js';
import { PgResourceRepo } from './repos/pg-resource-repo.js';
import { PgInstitutionRepo } from './repos/pg-institution-repo.js';
import { PgViewRepo } from './repos/pg-view-repo.js';
import { PgGrantRepo } from './repos/pg-grant-repo.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCaptionRoutes } from './routes/captions.js';
import { registerResourceRoutes } from './routes/resources.js';
import { registerPublicRoutes } from './routes/public.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerGrantRoutes } from './routes/grants.js';
import { registerLti } from './lti/ltijs-setup.js';

export interface BuildAppOptions {
  db: Db;
  databaseUrl: string;
  clock: Clock;
  ids: IdGenerator;
  magicLinks: MagicLinkSender;
  baseUrl: string;
  sessionSecret: string;
  ltiEncryptionKey: string;
  staticDir: string | null;
  isProd: boolean;
  enableLti?: boolean;
  deeplApiKey?: string;
  googleTranslateApiKey?: string;
}

export async function buildApp(opts: BuildAppOptions) {
  const app = Fastify({ logger: true });
  await app.register(helmet, {
    contentSecurityPolicy: opts.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://www.youtube.com',
              'https://www.google.com',
              'https://www.gstatic.com',
            ],
            frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://www.youtube.com'],
          },
        }
      : false,
  });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie, { secret: opts.sessionSecret, hook: 'onRequest' });
  await app.register(multipart, { limits: { fileSize: 1_048_576 } });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    allowList: (req) => req.url === '/health' || req.url?.startsWith('/api/public'),
  });

  const captions = new PgCaptionRepo(opts.db);
  const instructors = new PgInstructorRepo(opts.db);
  const resources = new PgResourceRepo(opts.db);
  const institutions = new PgInstitutionRepo(opts.db);
  const views = new PgViewRepo(opts.db);
  const grants = new PgGrantRepo(opts.db);

  registerHealthRoutes(app, { db: opts.db });
  registerAuthRoutes(app, {
    db: opts.db,
    instructors,
    magicLinks: opts.magicLinks,
    clock: opts.clock,
    ids: opts.ids,
    baseUrl: opts.baseUrl,
    isProd: opts.isProd,
  });
  registerCaptionRoutes(app, {
    captions,
    ...(opts.deeplApiKey !== undefined ? { deeplKey: opts.deeplApiKey } : {}),
    ...(opts.googleTranslateApiKey !== undefined
      ? { googleTranslateKey: opts.googleTranslateApiKey }
      : {}),
  });
  registerResourceRoutes(app, { resources });
  registerPublicRoutes(app, { resources, captions, views, instructors });
  registerAdminRoutes(app, { views, instructors });
  registerGrantRoutes(app, { captions, instructors, grants });

  if (opts.enableLti !== false) {
    try {
      await registerLti(app, {
        databaseUrl: opts.databaseUrl,
        encryptionKey: opts.ltiEncryptionKey,
        baseUrl: opts.baseUrl,
        isProd: opts.isProd,
        institutions,
        instructors,
        resources,
        captions,
      });
    } catch (e) {
      app.log.warn({ err: e }, 'LTI registration skipped or failed');
    }
  }

  if (process.env.EXPOSE_LAST_MAGIC_LINK === '1') {
    // Test-only: expose the last magic-link captured by FakeMagicLinkSender so
    // Playwright can drive the login flow without polling a real mailbox.
    // Never enabled in production (gated by an explicit env var).
    app.get('/__test__/last-magic-link', async () => {
      const sender = opts.magicLinks as unknown as { lastLink?: string | null };
      return { link: sender.lastLink ?? null };
    });
  }

  if (opts.staticDir) {
    await app.register(staticPlugin, {
      root: resolve(opts.staticDir),
      prefix: '/',
    });
  }

  return app;
}
